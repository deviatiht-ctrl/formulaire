// ============================================================
// MOBILE-NAV.JS — Menu hamburger pou paj ki itilize .nav-2026
// Bezwen: <button class="nav-toggle" id="navToggle"> +
//         <ul class="nav-links" id="navLinks">
// ============================================================
window.initMobileNav = function() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (!navToggle || !navLinks || navToggle.dataset.navReady) return;
    navToggle.dataset.navReady = 'true';
    navToggle.type = 'button';
    navToggle.setAttribute('aria-controls', navLinks.id);
    let previousOverflow = document.body.style.overflow;
    let open = false;
    let overlay = document.getElementById('mobileMenuOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobileMenuOverlay';
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
    }
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.4);z-index:999;';
    overlay.setAttribute('aria-hidden', 'true');
    const mobile = () => getComputedStyle(navToggle).display !== 'none';
    const setOpen = value => {
        if (value && !open) previousOverflow = document.body.style.overflow;
        if (!value && open) document.body.style.overflow = previousOverflow;
        open = value;
        navToggle.classList.toggle('active', open);
        navLinks.classList.toggle('active', open);
        overlay.classList.toggle('active', open);
        overlay.hidden = !open;
        navLinks.inert = mobile() && !open;
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        if (open) document.body.style.overflow = 'hidden';
    };
    window.closeMenu = () => setOpen(false);
    navToggle.addEventListener('click', e => {
        e.stopPropagation();
        setOpen(!open);
    });
    navLinks.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('click', e => {
        if (open && !navLinks.contains(e.target) && !navToggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', e => {
        if (!open) return;
        if (e.key === 'Escape') { setOpen(false); navToggle.focus(); }
        if (e.key === 'Tab') {
            const items = [navToggle, ...navLinks.querySelectorAll('a[href], button:not([disabled])')].filter(el => el.getClientRects().length);
            const index = items.indexOf(document.activeElement);
            e.preventDefault();
            items[(index + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
        }
    });
    window.addEventListener('resize', () => {
        if (!mobile()) setOpen(false);
        else navLinks.inert = !open;
    });
    setOpen(false);
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initMobileNav);
else window.initMobileNav();
