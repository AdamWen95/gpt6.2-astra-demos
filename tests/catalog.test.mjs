import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { validateCatalog } from '../scripts/catalog.mjs';
import { renderCollection } from '../site/render.mjs';

const catalog = { title: '测试合集', description: '合集说明', games: [] };
const game = {
  id: 'test-entry',
  title: '测试 & 入口',
  subtitle: 'Test entry',
  description: '测试说明',
  category: '分类',
  tags: ['标签'],
  controls: '操作说明',
  technology: 'HTML',
  singleFile: 'release/test-entry.html',
  preview: 'preview.png',
  accent: 'mint',
};
const template = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const assets = { template, css: '', script: 'document.title;' };

test('an empty catalog renders an empty library with no game links', () => {
  const html = renderCollection(validateCatalog(catalog), assets);
  assert.match(html, /0 个作品/);
  assert.match(html, /暂无已发布的游戏/);
  assert.match(html, /id="search-control" hidden/);
  assert.doesNotMatch(html, /data-game-card|download=|document\.title/);
});

test('a populated catalog renders escaped text and site-relative links', () => {
  const games = [{ ...game, previewData: 'data:image/png;base64,AA==' }];
  const html = renderCollection(validateCatalog({ ...catalog, games }), assets);
  assert.match(html, /1 个作品/);
  assert.match(html, /测试 &amp; 入口/);
  assert.match(html, /href="\.\/test-entry\/index\.html" download="test-entry\.html"/);
  assert.match(html, /document\.title/);
});

test('repeated IDs and invalid asset paths are rejected', () => {
  assert.throws(() => validateCatalog({ ...catalog, games: [game, game] }), /duplicate/);
  for (const singleFile of ['../output.html', '/output.html', 'C:/output.html', 'release//index.html']) {
    assert.throws(() => validateCatalog({ ...catalog, games: [{ ...game, singleFile }] }), /Unsafe singleFile/);
  }
});
