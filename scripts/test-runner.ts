import fs from 'fs';
import path from 'path';

// Lightweight runner to test prompt building and JSON parsing logic outside Obsidian.
const sample = `## APT 3.0: Um novo sistema de gerenciamento de pacotes\n\nO sistema de gerenciamento de pacotes do Debian recebe sua maior atualização...`;

function buildPrompt(content: string) {
  return `System: Você é um especialista em análise de conteúdo e síntese de conhecimento...\n\nTexto para Análise:\n"""\n${content}\n"""`;
}

const p = buildPrompt(sample);
console.log('--- Prompt ---');
console.log(p.slice(0, 500));

// Test JSON parsing resilience
const fakeResponse = JSON.stringify({ resumo_conciso: 'Resumo', pontos_chave: ['a','b'], topicos_correlacionados: [{ titulo_sugerido: 'T1', conteudo_explicativo: 'Exp' }] });
try {
  const parsed = JSON.parse(fakeResponse);
  console.log('Parsed OK:', parsed.topicos_correlacionados.length);
} catch (e) {
  console.error('Parse failed', e);
}
