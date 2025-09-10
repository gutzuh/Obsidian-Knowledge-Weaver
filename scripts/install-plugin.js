#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function copyFile(src, dest) {
  await fs.copyFile(src, dest);
  console.log(`copied ${src} -> ${dest}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: install-plugin.js <obsidian-plugins-folder> [plugin-folder-name]');
    process.exit(2);
  }

  const pluginsRoot = path.resolve(args[0]);
  const explicitName = args[1];

  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');
  const pkgPath = path.join(projectRoot, 'package.json');
  const manifestPath = path.join(projectRoot, 'manifest.json');

  if (!await exists(pluginsRoot)) {
    console.log(`Creating plugins root: ${pluginsRoot}`);
    await fs.mkdir(pluginsRoot, { recursive: true });
  }

  if (!await exists(distDir)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(3);
  }

  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
  const pluginFolderName = explicitName || pkg.name || 'knowledge-weaver';
  const dest = path.join(pluginsRoot, pluginFolderName);

  // remove existing dest
  try {
    await fs.rm(dest, { recursive: true, force: true });
  } catch (e) {}

  await fs.mkdir(dest, { recursive: true });

  // Remove existing JS files in the destination to ensure a single-bundle install
  const existingFiles = await fs.readdir(dest);
  for (const f of existingFiles) {
    if (f.endsWith('.js') || f.endsWith('.map') || f.endsWith('.js.map')) {
      await fs.rm(path.join(dest, f), { force: true });
    }
  }

  // Copy only the single bundle (dist/main.js) and its sourcemap if present
  const bundleMain = path.join(distDir, 'main.js');
  if (!await exists(bundleMain)) {
    console.error('Bundle dist/main.js not found. Run `npm run bundle` first.');
    process.exit(4);
  }
  await copyFile(bundleMain, path.join(dest, 'main.js'));
  const bundleMap = path.join(distDir, 'main.js.map');
  if (await exists(bundleMap)) await copyFile(bundleMap, path.join(dest, 'main.js.map'));

  // copy styles if present
  const styleSrc = path.join(projectRoot, 'styles.css');
  if (await exists(styleSrc)) await copyFile(styleSrc, path.join(dest, 'styles.css'));

  // copy README
  const readme = path.join(projectRoot, 'README.md');
  if (await exists(readme)) await copyFile(readme, path.join(dest, 'README.md'));

  // copy and adapt manifest
  if (await exists(manifestPath)) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    // ensure main points to main.js
    manifest.main = 'main.js';
    await fs.writeFile(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log('manifest written to plugin folder');
  } else if (await exists(path.join(projectRoot, 'package.json'))) {
    // fallback: create manifest from package.json
    const manifest = {
      id: pkg.name || 'knowledge-weaver',
      name: pkg.name || 'Knowledge Weaver',
      version: pkg.version || '0.0.0',
      minAppVersion: '0.12.0',
      description: pkg.description || '',
      author: pkg.author || '',
      isDesktopOnly: false,
      main: 'main.js'
    };
    await fs.writeFile(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log('manifest created from package.json');
  }

  console.log('Plugin installed to', dest);
}

main().catch(err => { console.error(err); process.exit(1); });
