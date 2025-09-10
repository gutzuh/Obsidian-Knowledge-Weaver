export function sanitizeFilename(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, '-').trim();
}

export function ensureFolderPath(folder: string) {
  return folder.replace(/^\//, '').replace(/\/$/, '');
}
