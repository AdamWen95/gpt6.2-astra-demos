const search = document.querySelector('#game-search');
const cards = document.querySelectorAll('[data-game-card]');
const count = document.querySelector('#game-count');
const empty = document.querySelector('#search-empty');

document.querySelector('#search-control').hidden = false;
search.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    card.hidden = !card.dataset.search.includes(query);
    if (!card.hidden) visible += 1;
  }
  count.textContent = `${visible} 个作品`;
  empty.hidden = visible > 0;
});
