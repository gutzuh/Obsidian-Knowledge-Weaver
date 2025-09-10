import { NoteNode } from './types';

export function renderGeneratedNote(templateTitle: string, content: string, original: NoteNode, mainTag?: string) {
  const safeTitle = templateTitle.trim();
  const tagLine = mainTag ? `- ${mainTag}\n` : '';

  return `---\ntags:\n- ia-gerado\n${tagLine}---\n\n# ${safeTitle}\n\n> [!info] Nota gerada por IA\n> Este conteúdo foi gerado automaticamente pelo Knowledge Weaver com base na nota [[${original.title}]].\n\n${content}\n\n## Para Aprofundar\n\n-   (Links ou outras informações podem ser adicionados aqui no futuro)\n`;
}
