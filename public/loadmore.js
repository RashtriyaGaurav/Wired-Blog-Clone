const btn = document.getElementById('loadMoreBtn');
const grid = document.getElementById('postGrid');

if (btn && grid) {
  let nextPage = parseInt(btn.dataset.nextPage, 10);
  const totalPages = parseInt(btn.dataset.totalPages, 10);
  const category = btn.dataset.category;
  let loading = false;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (loading) return;
    loading = true;

    const label = btn.textContent;
    btn.textContent = 'Loading...';

    try {
      let url = '/?partial=1&page=' + nextPage;
      if (category) url += '&category=' + encodeURIComponent(category);

      const res = await fetch(url);
      if (!res.ok) throw new Error('Request failed: ' + res.status);

      const html = await res.text();
      grid.insertAdjacentHTML('beforeend', html);

      nextPage += 1;
      if (nextPage > totalPages) {
        btn.parentElement.remove(); // no more posts
      } else {
        btn.href = '/?page=' + nextPage + (category ? '&category=' + encodeURIComponent(category) : '');
        btn.textContent = label;
      }
    } catch (err) {
      console.error('Load more error:', err);
      btn.textContent = 'Something went wrong. Try again';
    } finally {
      loading = false;
    }
  });
}