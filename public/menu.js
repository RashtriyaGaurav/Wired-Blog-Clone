document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('menu-btn');
    var menu = document.getElementById('mobile-menu');
    var iconOpen = document.getElementById('icon-open');
    var iconClose = document.getElementById('icon-close');

    if (!btn || !menu) return;

    function setMenu(open) {
        menu.style.display = open ? 'block' : 'none';
        iconOpen.style.display = open ? 'none' : 'block';
        iconClose.style.display = open ? 'block' : 'none';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function () {
        setMenu(menu.style.display === 'none' || menu.style.display === '');
    });

    menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth >= 768) setMenu(false);
    });
});