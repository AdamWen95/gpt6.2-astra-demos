import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const requiredText = ['title', 'subtitle', 'description', 'category', 'controls', 'technology'];
const accents = ['mint', 'lilac', 'peach'];
const gameId = /^[a-z][a-z0-9-]{1,60}$/;

export function validateCatalog(value) {
  if (typeof value?.title !== 'string' || !value.title.trim() || typeof value.description !== 'string') {
    throw new Error('Invalid collection title or description.');
  }
  if (!Array.isArray(value.games) || value.games.length > 64) {
    throw new Error('Catalog must contain 0–64 games.');
  }

  const ids = new Set();
  for (const game of value.games) {
    if (typeof game?.id !== 'string' || !gameId.test(game.id) || ids.has(game.id)) {
      throw new Error('Invalid or duplicate game id.');
    }
    ids.add(game.id);

    for (const field of requiredText) {
      if (typeof game[field] !== 'string' || !game[field].trim() || game[field].length > 1000) {
        throw new Error(`Invalid ${field} for ${game.id}.`);
      }
    }
    if (!Array.isArray(game.tags) || game.tags.length > 6 || game.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40)) {
      throw new Error(`Invalid tags for ${game.id}.`);
    }

    for (const [field, suffix] of Object.entries({ singleFile: '.html', preview: '.png' })) {
      const name = game[field];
      if (typeof name !== 'string' || !/^[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').some(part => !part || part === '..' || part === '.')) {
        throw new Error(`Unsafe ${field} for ${game.id}.`);
      }
      if (!name.endsWith(suffix)) throw new Error(`Unsupported ${field} format for ${game.id}.`);
    }
    if (!accents.includes(game.accent)) throw new Error(`Unsupported accent for ${game.id}.`);
  }
  return value;
}

export async function checkedFile(directory, relative) {
  const parent = await realpath(directory);
  const resolved = await realpath(path.resolve(parent, relative));
  if (!resolved.startsWith(parent + path.sep) || !(await stat(resolved)).isFile()) {
    throw new Error(`Invalid asset inside ${directory}: ${relative}`);
  }
  return resolved;
}

export async function loadCatalog(root) {
  const catalog = validateCatalog(JSON.parse(await readFile(path.join(root, 'demos.json'), 'utf8')));
  for (const game of catalog.games) {
    const directory = path.join(root, 'games', game.id);
    if (await realpath(directory) !== directory) throw new Error(`Unexpected workspace location: ${game.id}`);
    const packagePath = await checkedFile(directory, 'package.json');
    const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
    if (pkg.name !== game.id || typeof pkg.scripts?.['build:single'] !== 'string' || !pkg.scripts['build:single'].trim()) {
      throw new Error(`Workspace ${game.id} must declare its own build:single script.`);
    }
    await checkedFile(directory, game.preview);
  }
  return catalog;
}
