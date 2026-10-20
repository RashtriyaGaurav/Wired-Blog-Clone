const btn = document.getElementById('likeBtn');

const BTN_LIKED =
  'flex items-center gap-2 px-3.5 py-1.5 border rounded-full transition cursor-pointer font-semibold text-sm border-red-200 bg-red-50 text-red-600 shadow-sm';
const BTN_UNLIKED =
  'flex items-center gap-2 px-3.5 py-1.5 border rounded-full transition cursor-pointer font-semibold text-sm border-zinc-300 text-zinc-700 hover:border-zinc-950 bg-white';
const ICON_LIKED = 'w-5 h-5 fill-red-500 text-red-500 stroke-red-500';
const ICON_UNLIKED = 'w-5 h-5 stroke-zinc-700 fill-none';

if (btn) {
  const icon = document.getElementById('likeIcon');
  const countEl = document.getElementById('likeCount');
  let busy = false;

  function render(liked, count) {
    btn.className = liked ? BTN_LIKED : BTN_UNLIKED;
    icon.setAttribute('class', liked ? ICON_LIKED : ICON_UNLIKED);
    countEl.textContent = count;
  }

  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;

    const wasLiked = btn.classList.contains('bg-red-50');
    const oldCount = parseInt(countEl.textContent, 10) || 0;

    // 1) Turant UI update
    render(!wasLiked, oldCount + (wasLiked ? -1 : 1));

    try {
      const res = await fetch('/post/' + btn.dataset.slug + '/like', { method: 'POST' });

      if (res.redirected || res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Request failed: ' + res.status);

      // 2) Server ka asli count sync kar lo
      const data = await res.json();
      render(data.liked, data.likeCount);
    } catch (err) {
      console.error('Like toggle error:', err);
      render(wasLiked, oldCount); // fail hua to revert
    } finally {
      busy = false;
    }
  });
}