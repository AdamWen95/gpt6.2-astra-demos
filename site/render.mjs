const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => entities[char]);

function renderGame(game) {
  const href = `./${game.id}/index.html`;
  const searchText = [game.title, game.subtitle, game.description, game.category, ...game.tags].join(' ').toLowerCase();
  return `<article class="game-card ${game.accent}" data-game-card data-search="${escapeHtml(searchText)}">
    <a class="game-preview" href="${href}" aria-label="开始游玩${escapeHtml(game.title)}">
      <img src="${game.previewData}" alt="${escapeHtml(game.title)}的游戏画面" width="640" height="360" loading="lazy">
    </a>
    <div class="game-detail">
      <p class="game-category">${escapeHtml(game.category)}</p>
      <h3>${escapeHtml(game.title)}</h3>
      <p class="game-subtitle">${escapeHtml(game.subtitle)}</p>
      <p>${escapeHtml(game.description)}</p>
      <p class="game-controls">${escapeHtml(game.controls)}</p>
      <p class="game-technology">${escapeHtml(game.technology)}</p>
      <div class="game-actions">
        <a class="button" href="${href}">开始游玩</a>
        <a class="button secondary" href="${href}" download="${game.id}.html">下载 HTML</a>
      </div>
    </div>
  </article>`;
}

export function renderCollection(catalog, { template, css, script }) {
  const entries = catalog.games.length
    ? `<div class="game-list">${catalog.games.map(renderGame).join('\n')}</div>
      <p id="search-empty" class="empty" hidden>没有找到匹配的游戏。请试试其他关键词。</p>`
    : '<p class="empty">暂无已发布的游戏。</p>';

  const content = {
    TITLE: escapeHtml(catalog.title),
    DESCRIPTION: escapeHtml(catalog.description),
    COUNT: String(catalog.games.length),
    ENTRIES: entries,
    STYLE: css,
    SCRIPT: catalog.games.length ? script.replace(/<\/script/gi, '<\\/script') : '',
  };

  return template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(content, key)) throw new Error(`Unknown collection template marker: ${key}`);
    return content[key];
  });
}
