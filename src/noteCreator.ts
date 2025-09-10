import { App, TFile, Notice } from 'obsidian';
import { NoteNode, GeminiResponse, KnowledgeWeaverSettings } from './types';
import { renderGeneratedNote } from './templates';
import { sanitizeFilename, ensureFolderPath } from './utils';
import { logDebug } from './logger';

export async function createNotesFromGemini(app: App, settings: KnowledgeWeaverSettings, original: NoteNode, resp: GeminiResponse): Promise<number> {
  const folder = ensureFolderPath(settings.destinationFolder);

  // ensure folder exists (vault.createFolder throws if exists)
  try {
    await app.vault.createFolder(folder);
  logDebug(`Ensured folder exists: ${folder}`);
  } catch (e) {
    // ignore if already exists
  logDebug(`Folder create likely exists: ${String(e)}`);
  }

  let created = 0;
  for (const topic of resp.topicos_correlacionados || []) {
    const filename = `IA - ${sanitizeFilename(topic.titulo_sugerido)}.md`;
    const path = `${folder}/${filename}`;
    const mainTag = (original.tags && original.tags[0]) || '';
    const content = renderGeneratedNote(topic.titulo_sugerido, topic.conteudo_explicativo, original, mainTag);

    // check if file exists
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      // skip existing
      logDebug(`Skipping existing file: ${path}`);
      continue;
    }

    try {
      await app.vault.create(path, content);
      logDebug(`Created file: ${path}`);
    } catch (e) {
      logDebug(`Error creating file ${path}: ${String(e)}`);
      throw e;
    }
    created += 1;
  }

  new Notice(`Knowledge Weaver: ${created} notas criadas.`);
  return created;
}
