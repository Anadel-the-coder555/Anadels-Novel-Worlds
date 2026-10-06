(() => {
  const cards = [...document.querySelectorAll('.card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const search = document.getElementById('search');
  let realm = 'all';
  function update() {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    cards.forEach(card => {
      card.hidden = !(realm === 'all' || card.dataset.realm === realm) || !card.textContent.toLowerCase().includes(query);
      if (!card.hidden) count++;
    });
    document.getElementById('count').textContent = `${count} ${count === 1 ? 'world' : 'worlds'} to explore`;
    document.getElementById('empty').hidden = count !== 0;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    realm = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    update();
  }));
  search.addEventListener('input', update);
  update();
})();
