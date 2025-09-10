import { App, TFile, Notice } from 'obsidian';
import { NoteNode, GeminiResponse, KnowledgeWeaverSettings } from './types';
import { renderGeneratedNote } from './templates';
import { sanitizeFilename, ensureFolderPath } from './utils';
import { logDebug } from './logger';

export async function createNotesFromGemini(app: App, settings: KnowledgeWeaverSettings, original: NoteNode, resp: any, dryRun = false): Promise<number> {
  const folder = ensureFolderPath(settings.destinationFolder || '');

  // ensure folder exists (vault.createFolder throws if exists)
  if (folder && folder.length > 0) {
    try {
      await app.vault.createFolder(folder);
      logDebug(`Ensured folder exists: ${folder}`);
    } catch (e: any) {
      // ignore if already exists
      logDebug(`Folder create likely exists or error: ${String(e)}`);
    }
  } else {
    logDebug('No destinationFolder set; using vault root for generated notes');
  }

  // Defensive extraction: accept several possible shapes/keys for topics
  // If the resp doesn't have the expected fields, try to recover JSON embedded in the raw API response
  function tryRecoverFromRaw(respObj: any): any | null {
    try {
      // candidates -> content.parts[*].text
      const cand = respObj?.candidates && respObj.candidates[0];
      let text: string | undefined;
      if (cand) {
        if (typeof cand.content === 'string') text = cand.content;
        else if (cand.content && Array.isArray(cand.content.parts)) {
          text = cand.content.parts.map((p: any) => (typeof p === 'string' ? p : p.text || '')).join('\n');
        } else if (cand.output && Array.isArray(cand.output) && cand.output[0] && cand.output[0].content) {
          const out = cand.output[0];
          if (Array.isArray(out.content)) text = out.content.map((p: any) => p.text || '').join('\n');
          else if (typeof out.content === 'string') text = out.content;
        }
      }
      // other shapes
      if (!text && respObj?.choices && Array.isArray(respObj.choices) && respObj.choices[0]) {
        text = respObj.choices[0].message?.content || respObj.choices[0].text;
      }
      if (!text && typeof respObj === 'string') text = respObj;
      if (!text) text = JSON.stringify(respObj || '').slice(0, 5000);

      // strip fences
      text = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

      // try direct parse
      try { return JSON.parse(text); } catch (e) { }
      // try to find first {...}
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try { return JSON.parse(m[0]); } catch (e) { return null; }
      }
      return null;
    } catch (e) {
      logDebug('Recovery parse failed: ' + String(e));
      return null;
    }
  }

  // allow rawTopics to come from recovered parsing if necessary
  const rawTopics = resp?.topicos_correlacionados
    || resp?.topicos
    || resp?.topics
    || resp?.topicosCorrelacionados
    || resp?.topicos_relacionados
    || resp?.related_topics
    || [];

  // If no topics, attempt to recover embedded JSON from raw response
  if ((!rawTopics || (Array.isArray(rawTopics) && rawTopics.length === 0)) && resp) {
    const recovered = tryRecoverFromRaw(resp);
    if (recovered && (recovered.topicos_correlacionados || recovered.topicos || recovered.topics)) {
      logDebug('Recovered parsed response from raw API data');
      resp = recovered;
    }
  }

  let topicsArray: any[] = [];
  if (typeof rawTopics === 'string') {
    try { topicsArray = JSON.parse(rawTopics); } catch (e) { topicsArray = []; }
  } else if (Array.isArray(rawTopics)) {
    topicsArray = rawTopics;
  }

  // normalize each topic to expected fields but preserve any extra fields the model returned
  const topics = topicsArray.map((t: any) => {
    const normalized = {
      titulo_sugerido: t?.titulo_sugerido || t?.titulo || t?.title || t?.tituloSugerido || t?.suggested_title || '',
      conteudo_explicativo: t?.conteudo_explicativo || t?.conteudo || t?.content || t?.description || t?.body || ''
    };
    return Object.assign({}, t || {}, normalized) as any;
  }).filter((t: any) => t.titulo_sugerido && t.titulo_sugerido.trim().length > 0) as any[];

  if (!topics || topics.length === 0) {
    logDebug('No topics extracted from Gemini response. Resp excerpt: ' + JSON.stringify(resp).slice(0, 1000));
  }

  let created = 0;
  const createdPaths: string[] = [];
  for (const topic of topics) {
    const safeTitle = topic.titulo_sugerido || 'sem-titulo';
    const filename = `IA - ${sanitizeFilename(safeTitle)}.md`;
    const path = folder ? `${folder}/${filename}` : filename;
    const mainTag = (original.tags && original.tags[0]) || '';
  // pass resumo and pontos-chave if available at top level
  const resumo = resp?.resumo_conciso || '';
  const pontos = resp?.pontos_chave || [];
    const extras = {
      exemplos_praticos: topic.exemplos_praticos || topic.exemplos || [],
      exercicios_praticos: topic.exercicios_praticos || [],
      questoes_fixacao: topic.questoes_fixacao || [],
      flashcards: topic.flashcards || [],
      recursos: topic.recursos || [],
      dificuldade: topic.dificuldade || '',
      estimativa_tempo_minutos: topic.estimativa_tempo_minutos || null
    };

    const content = renderGeneratedNote(safeTitle, topic.conteudo_explicativo || '', original, mainTag, resumo, pontos, extras);

    // check if file exists
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      // skip existing
      logDebug(`Skipping existing file: ${path}`);
      continue;
    }

    try {
      if (dryRun) {
        logDebug(`Dry-run: would create file: ${path}`);
        createdPaths.push(path);
      } else {
        await app.vault.create(path, content);
        logDebug(`Created file: ${path}`);
        createdPaths.push(path);
      }
      created += 1;
    } catch (e: any) {
      logDebug(`Error creating file ${path}: ${String(e)}`);
      // continue to next topic instead of aborting everything
      continue;
    }
  }

  // If we created files (and not a dry-run), append a links section to the original note
  try {
    if (!dryRun && createdPaths.length > 0) {
      const originalFile = app.vault.getAbstractFileByPath(original.path);
      if (originalFile && originalFile instanceof TFile) {
        try {
          const origText = await app.vault.read(originalFile);
          const links = createdPaths.map(p => `- [[${p.replace(/\.md$/i, '')}]]`).join('\n');
          const marker = '\n\n## Notas geradas pela IA\n\n';
          // avoid duplicating the section if it already exists
          if (!origText.includes('## Notas geradas pela IA')) {
            const newText = origText + marker + links + '\n';
            await app.vault.modify(originalFile, newText);
            logDebug(`Appended links to original note: ${original.path}`);
          } else {
            logDebug('Original note already contains generated notes section; skipping append.');
          }
        } catch (e: any) {
          logDebug('Failed to append links to original note: ' + String(e));
        }
      } else {
        logDebug('Original file not found in vault, cannot append links: ' + original.path);
      }
    }
  } catch (e: any) {
    logDebug('Error in post-create linking: ' + String(e));
  }

  new Notice(`Knowledge Weaver: ${created} notas criadas.`);
  return created;
}
