export const debugLogs: string[] = [];

function ts() {
  return new Date().toISOString();
}

export function logDebug(msg: string) {
  const line = `[KnowledgeWeaver] ${ts()} - ${msg}`;
  debugLogs.push(line);
  // always print to console for Obsidian developer console
  // avoid logging secrets; caller should mask sensitive values
  // eslint-disable-next-line no-console
  console.log(line);
}

export function getDebugLogs() {
  return debugLogs.slice();
}

export async function saveDebugLogsToFile(destPath: string) {
  try {
    // try to use Node fs if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    await fs.promises.mkdir(require('path').dirname(destPath), { recursive: true });
    await fs.promises.writeFile(destPath, debugLogs.join('\n'), 'utf8');
    return destPath;
  } catch (e) {
    logDebug('Unable to save logs to file: ' + String(e));
    throw e;
  }
}
