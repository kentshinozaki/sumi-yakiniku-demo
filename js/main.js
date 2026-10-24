// SUMI 炭 — small, dependency-free interactions
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Navigation turns dark after you scroll a little
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // 2. Mobile full-screen menu
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // 3. Hero video: two copies take turns with a crossfade, so the smoke only ever rises.
  //    It always plays by itself, silently. Paused only while it's off-screen.
  const reel = document.querySelectorAll('.hero__video');
  if (reel.length === 2) {
    const FADE = 1.4; // seconds, matches the CSS transition
    let current = reel[0], next = reel[1];

    // Browsers only allow autoplay for muted, inline videos, so make sure of both
    reel.forEach((v) => { v.muted = true; v.defaultMuted = true; v.playsInline = true; v.removeAttribute('controls'); });

    // If the browser blocks autoplay (e.g. iPhone Low Power Mode), try again on the
    // visitor's first touch, click, scroll or key press
    const retryEvents = ['touchstart', 'pointerdown', 'scroll', 'keydown'];
    const retry = () => { current.play().then(() => retryEvents.forEach((e) => window.removeEventListener(e, retry))).catch(() => {}); };
    const play = (v) => v.play().catch(() => retryEvents.forEach((e) => window.addEventListener(e, retry, { passive: true })));

    const swap = () => {
      next.currentTime = 0;
      play(next);
      next.classList.add('is-active');
      current.classList.remove('is-active');
      [current, next] = [next, current];
    };
    reel.forEach((v) => v.addEventListener('timeupdate', () => {
      if (v === current && v.duration && v.currentTime >= v.duration - FADE - 0.2) swap();
    }));
    // Let the faded-out copy finish quietly, then stop it
    reel.forEach((v) => v.addEventListener('ended', () => { if (v !== current) v.pause(); }));

    play(current);
    new IntersectionObserver(([entry]) => {
      entry.isIntersecting ? play(current) : reel.forEach((v) => v.pause());
    }).observe(reel[0].parentElement);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) play(current); });
  }

  // 4. Fade / slide elements in as they enter the screen
  const revealEls = document.querySelectorAll('.reveal, .reveal-img');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // 5. Gentle parallax on a few large images
  const parallaxEls = [...document.querySelectorAll('.parallax')];
  // 6. Experience section: swap the background photo as each step scrolls past
  const story = document.querySelector('.story');
  const steps = [...document.querySelectorAll('.story__step')];
  const frames = [...document.querySelectorAll('.story__frame')];
  const storyNo = document.getElementById('storyNo');
  const progress = document.querySelector('.story__progress');
  let current = -1;

  const update = () => {
    const vh = window.innerHeight;
    if (!reduceMotion) {
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed || 0.08);
        el.firstElementChild.style.transform = `translate3d(0, ${(-offset - r.height * 0.07).toFixed(1)}px, 0)`;
      });
    }
    if (story) {
      let active = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.55) active = i; });
      if (active !== current) {
        current = active;
        frames.forEach((f, i) => f.classList.toggle('is-active', i === active));
        steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
        storyNo.textContent = String(active + 1).padStart(2, '0');
      }
      const r = story.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      progress.style.setProperty('--p', p.toFixed(3));
    }
  };
  let ticking = false;
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  // 7. Demo pop-up: honest messages instead of fake bookings or dead links
  const dialog = document.getElementById('demoDialog');
  const messages = {
    reserve: ['Reservations, coming soon.', 'This is a concept website, so no booking system is connected and no reservation has been made. For the real restaurant, this button would open their online booking page (for example TableCheck or OMAKASE) or their phone number.'],
    'full-menu': ['The full menu.', 'In the finished website, this would open the restaurant’s complete menu, with dishes, prices and allergen information supplied and checked by the restaurant.'],
    directions: ['Directions.', 'Once the restaurant’s real address is supplied, this button will open Google Maps with walking directions from the station.'],
    instagram: ['Instagram.', 'This will link to the restaurant’s official Instagram account once it exists.'],
  };
  document.querySelectorAll('[data-demo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [title, text] = messages[btn.dataset.demo];
      dialog.querySelector('#demoTitle').textContent = title;
      dialog.querySelector('#demoText').textContent = text;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else alert(title + '\n\n' + text);
    });
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // 8. If a photo ever fails to load, hide the broken icon and show a dark tone instead
  document.querySelectorAll('img').forEach((img) => {
    const fail = () => img.classList.add('is-broken');
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
    img.addEventListener('error', fail);
  });
})();
