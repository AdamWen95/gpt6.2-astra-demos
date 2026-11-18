import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkedFile, loadCatalog } from './catalog.mjs';
import { createArchive } from './package.mjs';
import { renderCollection } from '../site/render.mjs';

const digest = content => createHash('sha256').update(content).digest('hex');
const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2];
if (mode !== undefined && !['--single', '--package'].includes(mode)) throw new Error('Unknown build mode.');

async function publishDirectory(stage, destination, previous, verifyOwnership) {
  let existing;
  try {
    existing = await lstat(destination);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (existing) {
    if (!existing.isDirectory() || !await verifyOwnership(destination)) {
      throw new Error(`Refusing to replace an unmanaged output: ${destination}`);
    }
    await rename(destination, previous);
  }

  try {
    await rename(stage, destination);
  } catch (publishError) {
    if (existing) {
      try {
        await rename(previous, destination);
      } catch (restoreError) {
        throw new AggregateError([publishError, restoreError], `Could not restore ${destination}. Previous output is kept at ${previous}.`);
      }
    }
    throw publishError;
  }
}

async function buildGame(game) {
  if (!process.env.npm_execpath) throw new Error('Use npm run build to build game workspaces.');
  console.log(`Building ${game.id}…`);
  const command = [process.env.npm_execpath, 'run', 'build:single', '--workspace', game.id];
  const result = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(`Game build failed: ${game.id}`, { cause: result.error });
  }

  const directory = path.join(root, 'games', game.id);
  const html = await readFile(await checkedFile(directory, game.singleFile));
  if (!/^<!doctype html>/i.test(html.toString('utf8', 0, 15))) {
    throw new Error(`Game ${game.id} did not produce an HTML document.`);
  }
  return html;
}

async function buildCollection(catalog, stage, pkg) {
  await mkdir(stage);
  const files = [];
  const games = [];
  for (const game of catalog.games) {
    const html = await buildGame(game);
    const preview = await readFile(await checkedFile(path.join(root, 'games', game.id), game.preview));
    const relative = `${game.id}/index.html`;
    await mkdir(path.join(stage, game.id));
    await writeFile(path.join(stage, relative), html);
    files.push({ path: relative, bytes: html.length, sha256: digest(html) });
    games.push({ ...game, previewData: `data:image/png;base64,${preview.toString('base64')}` });
  }

  const [template, css, script] = await Promise.all(
    ['index.html', 'style.css', 'main.js'].map(name => readFile(path.join(root, 'site', name), 'utf8')),
  );
  const homepage = renderCollection({ ...catalog, games }, { template, css, script });
  await writeFile(path.join(stage, 'index.html'), homepage);
  files.unshift({ path: 'index.html', bytes: Buffer.byteLength(homepage), sha256: digest(homepage) });

  const manifest = { project: pkg.name, version: pkg.version, builtAt: new Date().toISOString(), files };
  await writeFile(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

const work = path.join(root, '.qa');
await mkdir(work, { recursive: true });
if (await realpath(work) !== work) throw new Error('Build staging directory must be local to the project.');
const lockPath = path.join(work, 'collection-build.lock');
const lock = await open(lockPath, 'wx').catch(error => {
  if (error.code === 'EEXIST') throw new Error('A collection build is already in progress. Check the build process before removing the local lock.');
  throw error;
});

let transaction;
let preserveTransaction = false;
try {
  const catalog = await loadCatalog(root);
  if (mode === '--single') {
    for (const game of catalog.games) await buildGame(game);
    console.log(`Standalone HTML builds: ${catalog.games.length}`);
  } else {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    transaction = await mkdtemp(path.join(work, 'collection-build-'));
    const stage = path.join(transaction, 'site');
    const manifest = await buildCollection(catalog, stage, pkg);
    let archive;
    if (mode === '--package') {
      archive = await createArchive(stage, path.join(transaction, 'archive'), manifest);
    }

    await publishDirectory(stage, path.join(root, 'dist'), path.join(transaction, 'previous-site'), async destination => {
      const existing = JSON.parse(await readFile(path.join(destination, 'manifest.json'), 'utf8'));
      return existing.project === pkg.name;
    });
    console.log(`Collection built: dist/index.html (${catalog.games.length} games)`);

    if (archive) {
      const release = path.join(root, 'release');
      await mkdir(release, { recursive: true });
      if (await realpath(release) !== release) throw new Error('Release directory must be local to the project.');
      await publishDirectory(archive.directory, path.join(release, archive.stem), path.join(transaction, 'previous-archive'), async destination => {
        const files = await readdir(destination);
        return files.length === 2 && files.includes(archive.filename) && files.includes(`${archive.filename}.sha256`);
      });
      console.log(`Release: release/${archive.stem}/${archive.filename}`);
      console.log(`SHA-256: ${archive.sha256}`);
    }
  }
} catch (error) {
  preserveTransaction = error instanceof AggregateError;
  throw error;
} finally {
  try {
    if (transaction && !preserveTransaction) {
      const resolved = await realpath(transaction);
      if (resolved !== transaction || path.dirname(resolved) !== work || !path.basename(resolved).startsWith('collection-build-')) {
        throw new Error(`Unsafe build cleanup path: ${resolved}`);
      }
      await rm(resolved, { recursive: true });
    }
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
