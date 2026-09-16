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
  const hud = document.querySelector('.hud');

  function measureHud() {
    document.documentElement.style.setProperty('--hud-height', hud.offsetHeight + 'px');
  }
  measureHud();
  new ResizeObserver(measureHud).observe(hud);

  function readingTop(target) {
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY - hud.offsetHeight - 16);
  }

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
      window.scrollTo({ top: readingTop(target), behavior: 'smooth' });
    } else {
      deck.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    }
    paint();
  }

  function paint() {
    cur.textContent = index + 1;
    dots.forEach((d, i) => d.classList.toggle('on', i === index));
    recordar();
  }

  /* --- recordar la diapositiva entre recargas --- */
  function recordar() {
    try { localStorage.setItem('licorrumba-slide', String(index)); } catch (err) {}
  }

  function restaurar() {
    let guardada = 0;
    try { guardada = parseInt(localStorage.getItem('licorrumba-slide') || '0', 10); } catch (err) {}
    if (!(guardada > 0) || guardada >= slides.length) return;
    index = guardada;
    const target = slides[index];
    if (reading) {
      window.scrollTo({ top: readingTop(target), behavior: 'instant' });
    } else {
      deck.scrollTop = target.offsetTop;
    }
    paint();
    progress();
  }

  function progress() {
    const el = scroller();
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
    bar.style.width = pct + '%';
  }

  /* --- detectar también diapositivas más altas que la pantalla --- */
  let scrollFrame = null;
  function trackPosition() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const top = reading ? hud.getBoundingClientRect().bottom : deck.getBoundingClientRect().top;
      const height = reading ? window.innerHeight - top : deck.clientHeight;
      const probe = top + Math.min(160, height * .3);
      let visible = 0;
      for (let i = 0; i < slides.length; i++) {
        if (slides[i].getBoundingClientRect().top > probe) break;
        visible = i;
      }
      if (visible !== index) { index = visible; paint(); }
      progress();
    });
  }

  deck.addEventListener('scroll', trackPosition, { passive: true });
  window.addEventListener('scroll', trackPosition, { passive: true });
  window.addEventListener('resize', trackPosition, { passive: true });

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
      case '?':
        toggleHelp(); break;
      case 'Escape':
        if (!legend.hidden) toggleHelp(); break;
    }
  });

  /* --- modo lectura --- */
  function toggleReading() {
    const target = slides[index];
    reading = !reading;
    document.body.classList.toggle('reading', reading);
    btnRead.setAttribute('aria-pressed', String(reading));
    btnRead.textContent = reading ? 'MODO PRESENTACIÓN' : 'MODO LECTURA';
    measureHud();
    // mantener la posición en la diapositiva actual al cambiar de modo
    requestAnimationFrame(() => {
      if (reading) {
        deck.scrollTop = 0;
        window.scrollTo({ top: readingTop(target), behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
        deck.scrollTop = target.offsetTop;
      }
      progress();
    });
    try { localStorage.setItem('licorrumba-reading', reading ? '1' : '0'); } catch (err) {}
  }

  btnRead.addEventListener('click', toggleReading);

  /* --- panel de quién presenta --- */
  const btnHelp = document.getElementById('btn-help');
  const legend = document.getElementById('legend');
  function toggleHelp() {
    const abierto = !legend.hidden;
    legend.hidden = abierto;
    btnHelp.setAttribute('aria-pressed', String(!abierto));
  }
  btnHelp.addEventListener('click', function (e) { e.stopPropagation(); toggleHelp(); });
  document.addEventListener('click', function (e) {
    if (!legend.hidden && !legend.contains(e.target) && e.target !== btnHelp) toggleHelp();
  });

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

  // el navegador restaura su propio scroll: lo desactivamos para mandar nosotros
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  restaurar();
  requestAnimationFrame(restaurar);
  paint();
  progress();
})();
