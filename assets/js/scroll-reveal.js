// Scroll reveal: ajoute .aos-animate sou eleman [data-aos] le yo antre nan ekran an.
// De mekanis pou plis sekirite: IntersectionObserver + tchek pozisyon sou scroll/resize.
// Sipo eleman ki ajoute dinamikman (innerHTML) gras ak MutationObserver.
(function () {
    // Makou senyal: CSS la kache [data-aos] SELMAN si script sa a chaje.
    // Konsa, si fichye a pa chaje oswa gen ere, kontni an rete vizib.
    document.documentElement.classList.add('aos-ready');

    var io = ('IntersectionObserver' in window)
        ? new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('aos-animate');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '40px' })
        : null;

    function inView(el) {
        var r = el.getBoundingClientRect();
        return r.bottom > -40 && r.top < (window.innerHeight || document.documentElement.clientHeight) + 40;
    }

    function reveal() {
        document.querySelectorAll('[data-aos]:not(.aos-animate)').forEach(function (el) {
            if (inView(el)) el.classList.add('aos-animate');
        });
    }

    // MutationObserver: swiv eleman dinamik yo epi fè tchek pozisyon an
    var timer = null;
    function schedule() {
        if (timer) return;
        timer = setTimeout(function () {
            timer = null;
            document.querySelectorAll('[data-aos]:not(.aos-animate)').forEach(function (el) {
                if (io) io.observe(el);
            });
            reveal();
        }, 50);
    }

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    document.addEventListener('DOMContentLoaded', schedule);
    schedule();
})();
