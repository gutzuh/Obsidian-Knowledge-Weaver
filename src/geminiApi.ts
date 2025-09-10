import { KnowledgeWeaverSettings, GeminiResponse } from './types';

/**
 * Call the Gemini / Generative API with a robust adapter.
 * This function is defensive about response shapes and will try several
 * common locations where model text can be returned.
 */
export async function callGeminiApi(settings: KnowledgeWeaverSettings, prompt: string): Promise<GeminiResponse> {
  let endpoint = settings.apiEndpointTemplate.replace('{model}', settings.model);

  // A conservative request shape that many Gemini wrappers accept; keep small and predictable.
  const body = {
    input: prompt,
    max_output_tokens: 800
  } as any;

  // Determine auth method: Google API key (starts with 'AIza') -> use X-goog-api-key for generativelanguage API
  // If apiKey looks like an OAuth access token (starts with 'ya29.' or 'Bearer '), use Authorization header.
  const apiKey = settings.apiKey?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!apiKey) {
    throw new Error('No API key provided in plugin settings. Please set your Google API key or OAuth access token in plugin settings.');
  }

  const isApiKey = apiKey.startsWith('AIza');
  const isBearer = apiKey.toLowerCase().startsWith('bearer ') || apiKey.startsWith('ya29.') || apiKey.startsWith('ya29_');
  const isGenLang = endpoint.includes('generativelanguage.googleapis.com');

  if (isGenLang && isApiKey) {
    // Google Generative Language expects X-goog-api-key header for API keys
    headers['X-goog-api-key'] = apiKey;
  } else if (isApiKey) {
    // Fallback: append API key as query parameter
    const sep = endpoint.includes('?') ? '&' : '?';
    endpoint = `${endpoint}${sep}key=${encodeURIComponent(apiKey)}`;
  }

  if (isBearer) {
    const token = apiKey.toLowerCase().startsWith('bearer ') ? apiKey.slice(7).trim() : apiKey;
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!isApiKey) {
    // If it's not a Google API key and not a bearer token, assume it's a raw OAuth token
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // For Generative Language API use the `contents` payload shape
  const finalBody = (isGenLang)
    ? { contents: [{ parts: [{ text: prompt }] }] }
    : body;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(finalBody)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Extract textual output from several generative shapes
  let candidateText: string | undefined;

  // Generative Language API: data.candidates[0].output[0].content[*].text or candidates[0].content
  if (data.candidates && Array.isArray(data.candidates) && data.candidates[0]) {
    const cand = data.candidates[0];
    if (typeof cand.content === 'string') candidateText = cand.content;
    else if (Array.isArray(cand.output) && cand.output[0]) {
      const out = cand.output[0];
      // output[0].content may be array of { text }
      if (Array.isArray(out.content)) {
        candidateText = out.content.map((p: any) => p.text || JSON.stringify(p)).join('\n');
      } else if (typeof out.content === 'string') candidateText = out.content;
    }
  }

  // Older/other shapes
  if (!candidateText && data.output && Array.isArray(data.output) && data.output[0]) {
    const out = data.output[0];
    if (out.content) candidateText = typeof out.content === 'string' ? out.content : JSON.stringify(out.content);
  }

  if (!candidateText && data.choices && Array.isArray(data.choices) && data.choices[0]) {
    candidateText = data.choices[0].message?.content || data.choices[0].text || undefined;
  }

  if (!candidateText && typeof data === 'string') candidateText = data;
  if (!candidateText) candidateText = JSON.stringify(data);

  // The assistant should respond with strict JSON matching the plugin schema. Try to parse the candidate text.
  try {
    const parsed = typeof candidateText === 'string' ? JSON.parse(candidateText) : candidateText;
    return parsed as GeminiResponse;
  } catch (err) {
    // If parsing fails, include the raw response in the error for debugging
    throw new Error('Unable to parse Gemini response as JSON. Raw response excerpt: ' + candidateText.slice(0, 1000));
  }
}

export async function callGeminiRaw(settings: KnowledgeWeaverSettings, prompt: string): Promise<{ status: number; rawText: string; json?: any }> {
  let endpoint = settings.apiEndpointTemplate.replace('{model}', settings.model);
  const body = { input: prompt, max_output_tokens: 800 } as any;
  const apiKey = settings.apiKey?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!apiKey) throw new Error('No API key provided in plugin settings.');
  const isApiKey = apiKey.startsWith('AIza');
  const isBearer = apiKey.toLowerCase().startsWith('bearer ') || apiKey.startsWith('ya29.') || apiKey.startsWith('ya29_');
  const isGenLang = endpoint.includes('generativelanguage.googleapis.com');
  if (isGenLang && isApiKey) headers['X-goog-api-key'] = apiKey;
  else if (isApiKey) endpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
  if (isBearer) {
    const token = apiKey.toLowerCase().startsWith('bearer ') ? apiKey.slice(7).trim() : apiKey;
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!isApiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const finalBody = (isGenLang) ? { contents: [{ parts: [{ text: prompt }] }] } : body;

  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(finalBody) });
  const status = res.status;
  const text = await res.text();
  let json: any = undefined;
  try { json = JSON.parse(text); } catch (e) { /* ignore */ }
  return { status, rawText: text, json };
}
