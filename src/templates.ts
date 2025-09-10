import { NoteNode } from './types';

export function renderGeneratedNote(templateTitle: string, content: string, original: NoteNode, mainTag?: string, resumo?: string, pontos?: string[], extras?: any) {
  const safeTitle = templateTitle.trim();
  const tagLine = mainTag ? `- ${mainTag}\n` : '';
  const resumoBlock = resumo ? `## Resumo Conciso\n\n${resumo}\n\n` : '';
  const pontosBlock = (pontos && pontos.length > 0) ? `## Pontos-chave\n\n${pontos.map(p => `- ${p}`).join('\n')}\n\n` : '';

  const exemplos = (extras?.exemplos_praticos || []).map((e: string) => `- ${e}`).join('\n');
  const exemplosBlock = exemplos ? `## Exemplos Práticos\n\n${exemplos}\n\n` : '';

  const exercicios = (extras?.exercicios_praticos || []).map((e: string) => `- ${e}`).join('\n');
  const exerciciosBlock = exercicios ? `## Exercícios Práticos\n\n${exercicios}\n\n` : '';

  const questoes = (extras?.questoes_fixacao || []).map((q: string) => `- ${q}`).join('\n');
  const questoesBlock = questoes ? `## Questões de Fixação\n\n${questoes}\n\n` : '';

  const flashcardsArr = (extras?.flashcards || []);
  let flashcardsBlock = '';
  if (flashcardsArr && flashcardsArr.length > 0) {
    const rows = flashcardsArr.map((f: any) => `| ${escapePipe(String(f.pergunta || ''))} | ${escapePipe(String(f.resposta || ''))} |`).join('\n');
    flashcardsBlock = `## Flashcards\n\n| Pergunta | Resposta |\n|---|---|\n${rows}\n\n`;
  }

  function escapePipe(s: string) { return s.replace(/\|/g, '\\|'); }

  const recursos = (extras?.recursos || []).map((r: any) => `- [${r.titulo}](${r.url})`).join('\n');
  const recursosBlock = recursos ? `## Recursos\n\n${recursos}\n\n` : '';

  const metaBlock = (extras?.dificuldade || extras?.estimativa_tempo_minutos) ? `---\n\n**Dificuldade:** ${extras?.dificuldade || '---'}\n\n**Tempo estimado:** ${extras?.estimativa_tempo_minutos || '---'} minutos\n\n` : '';

  return `---\ntags:\n- ia-gerado\n${tagLine}---\n\n# ${safeTitle}\n\n> [!info] Nota gerada por IA\n> Este conteúdo foi gerado automaticamente pelo Knowledge Weaver com base na nota [[${original.title}]].\n\n${resumoBlock}${pontosBlock}## Explicação\n\n${content}\n\n${exemplosBlock}${exerciciosBlock}${questoesBlock}${flashcardsBlock}${recursosBlock}${metaBlock}---\n\nFonte: [[${original.title}]]\n`;
}
