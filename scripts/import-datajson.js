#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function exists(p) { try { await fs.access(p); return true } catch { return false } }

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: import-datajson.js <source-data.json> [dest-plugin-folder]');
    process.exit(2);
  }

  const src = path.resolve(args[0]);
  const destPlugin = path.resolve(args[1] || '/home/isqne/Documents/MindLess/.obsidian/plugins/knowledge-weaver');
  const destData = path.join(destPlugin, 'data.json');

  if (!await exists(src)) {
    console.error('Source file not found:', src);
    process.exit(3);
  }

  const raw = await fs.readFile(src, 'utf8');
  const parsed = JSON.parse(raw);

  // Map relevant fields from the example data.json to KnowledgeWeaverSettings
  const mapped = {};
  if (parsed.googleApiKey) mapped.apiKey = parsed.googleApiKey;
  if (parsed.defaultModelKey) {
    // defaultModelKey format like 'gemini-1.5-flash-latest|google'
    const first = String(parsed.defaultModelKey).split('|')[0];
    if (first) mapped.model = first;
  }
  if (parsed.defaultSaveFolder) mapped.destinationFolder = parsed.defaultSaveFolder;

  // merge with existing plugin data if present
  let existing = {};
  if (await exists(destData)) {
    try { existing = JSON.parse(await fs.readFile(destData, 'utf8')); } catch (e) { existing = {}; }
  }

  const result = Object.assign({}, existing, mapped);
  await fs.writeFile(destData, JSON.stringify(result, null, 2), 'utf8');

  console.log('Imported settings to', destData);
  console.log('Mapped keys:', Object.keys(mapped));
}

main().catch(err => { console.error(err); process.exit(1); });
