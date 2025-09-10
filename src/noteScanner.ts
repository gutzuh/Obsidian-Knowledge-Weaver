import { App } from 'obsidian';
import { NoteNode } from './types';

export async function scanVault(app: App): Promise<NoteNode[]> {
  const files = app.vault.getMarkdownFiles();
  const nodes: NoteNode[] = [];

  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    const front = cache?.frontmatter as any | undefined;
    const tagsField = front?.tags;
    let tags: string[] = [];
    if (Array.isArray(tagsField)) {
      tags = tagsField.map((t: any) => String(t));
    } else if (typeof tagsField === 'string') {
      tags = tagsField.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
    }

    if (tags.length === 0) {
      continue; // skip uncategorized
    }

    const title = file.basename || file.path;

    nodes.push({
      path: file.path,
      title,
      tags,
      status: 'not_analyzed'
    });
  }

  return nodes;
}
