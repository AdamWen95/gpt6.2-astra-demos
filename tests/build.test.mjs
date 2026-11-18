import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const source = new URL('../', import.meta.url);

async function isolatedBuild(t) {
  const temp = await realpath(tmpdir());
  const root = await mkdtemp(path.join(temp, 'astra-demos-test-'));
  t.after(async () => {
    const resolved = await realpath(root);
    if (path.dirname(resolved) !== temp || !path.basename(resolved).startsWith('astra-demos-test-')) {
      throw new Error(`Unsafe test cleanup path: ${resolved}`);
    }
    await rm(resolved, { recursive: true });
  });

  await Promise.all(['package.json', 'scripts', 'site'].map(name =>
    cp(new URL(name, source), path.join(root, name), { recursive: true }),
  ));
  await writeFile(path.join(root, 'demos.json'), JSON.stringify({ title: '合集', description: '测试构建', games: [] }));
  return root;
}

function build(root, ...options) {
  return spawnSync(process.execPath, ['scripts/build.mjs', ...options], { cwd: root, encoding: 'utf8', timeout: 15000 });
}

test('zero games build a static homepage and a valid manifest', async t => {
  const root = await isolatedBuild(t);
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  const html = await readFile(path.join(root, 'dist/index.html'));
  const manifest = JSON.parse(await readFile(path.join(root, 'dist/manifest.json'), 'utf8'));
  assert.match(html.toString(), /暂无已发布的游戏/);
  assert.equal(manifest.project, 'gpt6.2-astra-demos');
  assert.deepEqual(manifest.files, [{
    path: 'index.html', bytes: html.length, sha256: createHash('sha256').update(html).digest('hex'),
  }]);

  const single = build(root, '--single');
  assert.equal(single.status, 0, single.stderr);
  assert.deepEqual(await readFile(path.join(root, 'dist/index.html')), html);
});

test('a workspace builds to the collection and a failed build preserves the prior output', async t => {
  assert.ok(process.env.npm_execpath, 'Run the workspace integration test through npm test.');
  const root = await isolatedBuild(t);
  const id = 'test-entry';
  const workspace = path.join(root, 'games', id);
  await mkdir(workspace, { recursive: true });
  await writeFile(path.join(workspace, 'package.json'), JSON.stringify({
    name: id, version: '1.0.0', scripts: { 'build:single': 'node build.cjs' },
  }));
  const buildFile = path.join(workspace, 'build.cjs');
  const fixture = '<!doctype html><title>Test entry</title>';
  await writeFile(buildFile, `require('node:fs').writeFileSync('game.html', ${JSON.stringify(fixture)});`);
  await writeFile(path.join(workspace, 'preview.png'), Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTQYAAAAASUVORK5CYII=', 'base64',
  ));
  await writeFile(path.join(root, 'demos.json'), JSON.stringify({
    title: '合集', description: '测试构建', games: [{
      id, title: '测试入口', subtitle: 'Test entry', description: '测试说明', category: '测试分类', tags: [],
      controls: '测试操作', technology: 'HTML', singleFile: 'game.html', preview: 'preview.png', accent: 'mint',
    }],
  }));

  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  const home = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(home, /\.\/test-entry\/index\.html/);
  const entry = path.join(root, 'dist', id, 'index.html');
  assert.equal(await readFile(entry, 'utf8'), fixture);

  await writeFile(buildFile, 'process.exitCode = 1;');
  const failed = build(root);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Game build failed: test-entry/);
  assert.equal(await readFile(path.join(root, 'dist/index.html'), 'utf8'), home);
  assert.equal(await readFile(entry, 'utf8'), fixture);
});
