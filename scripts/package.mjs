import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function createArchive(site, directory, manifest) {
  const stem = `${manifest.project}-${manifest.version}`;
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(stem)) throw new Error('Invalid release name.');

  await mkdir(directory);
  const filename = `${stem}.tar.gz`;
  const archive = path.join(directory, filename);
  const paths = manifest.files.map(file => file.path);
  const result = spawnSync('tar', ['-czf', archive, '-C', site, ...paths, 'manifest.json'], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Collection packaging failed.', { cause: result.error });

  const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(`${archive}.sha256`, `${sha256}  ${filename}\n`);
  return { directory, stem, filename, sha256 };
}
