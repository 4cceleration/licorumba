/* LICORRUMBA — navegación de la presentación y modo lectura */
(function () {
  const deck = document.getElementById('deck');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const dotsBox = document.getElementById('dots');
  const bar = document.getElementById('progress-bar');
  const cur = document.getElementById('cur');
  const tot = document.getElementById('tot');
  const btnRead = document.getElementById('btn-read');
  const btnFull = document.getElementById('btn-full');

  let index = 0;
  let reading = false;

  tot.textContent = slides.length;

  /* --- puntos de navegación --- */
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.className = 'dot';
    d.type = 'button';
    d.setAttribute('aria-label', (i + 1) + '. ' + (s.dataset.title || 'Diapositiva'));
    d.title = s.dataset.title || '';
    d.addEventListener('click', () => goTo(i));
    dotsBox.appendChild(d);
  });
  const dots = Array.from(dotsBox.children);

  function scroller() {
    return reading ? document.scrollingElement : deck;
  }

  function goTo(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const target = slides[index];
    if (reading) {
      window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
    } else {
      deck.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    }
    paint();
  }

  function paint() {
    cur.textContent = index + 1;
    dots.forEach((d, i) => d.classList.toggle('on', i === index));
  }

  function progress() {
    const el = scroller();
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
    bar.style.width = pct + '%';
  }

  /* --- detectar diapositiva visible (el root cambia según el modo) --- */
  let observer = null;
  function setupObserver() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = slides.indexOf(e.target);
            if (i > -1) { index = i; paint(); }
          }
        });
      },
      { root: reading ? null : deck, threshold: reading ? 0.2 : 0.5 }
    );
    slides.forEach((s) => observer.observe(s));
  }

  deck.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('scroll', progress, { passive: true });

  /* --- teclado --- */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault(); goTo(index + 1); break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); goTo(index - 1); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(slides.length - 1); break;
      case 'l':
      case 'L':
        toggleReading(); break;
      case 'f':
      case 'F':
        toggleFull(); break;
    }
  });

  /* --- modo lectura --- */
  function toggleReading() {
    reading = !reading;
    document.body.classList.toggle('reading', reading);
    btnRead.setAttribute('aria-pressed', String(reading));
    btnRead.textContent = reading ? 'MODO PRESENTACIÓN' : 'MODO LECTURA';
    setupObserver();
    // mantener la posición en la diapositiva actual al cambiar de modo
    requestAnimationFrame(() => {
      const target = slides[index];
      if (reading) {
        deck.scrollTop = 0;
        window.scrollTo({ top: Math.max(0, target.offsetTop - 70), behavior: 'auto' });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
        deck.scrollTop = target.offsetTop;
      }
      progress();
    });
    try { localStorage.setItem('licorrumba-reading', reading ? '1' : '0'); } catch (err) {}
  }

  btnRead.addEventListener('click', toggleReading);

  /* --- pantalla completa --- */
  function toggleFull() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  }
  btnFull.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', () => {
    btnFull.textContent = document.fullscreenElement ? 'SALIR' : 'PRESENTAR';
  });

  /* --- arranque --- */
  try {
    if (localStorage.getItem('licorrumba-reading') === '1') toggleReading();
  } catch (err) {}

  setupObserver();
  paint();
  progress();
})();
