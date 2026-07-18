/**
 * Andrea López — Portfolio
 * site.js — Script público (se carga siempre)
 *
 * El código del panel de administración vive en admin.js y se carga
 * bajo demanda (loadAdminModule()) solo cuando alguien intenta entrar
 * al panel — así los visitantes normales nunca lo descargan ni lo parsean.
 */

// ── FIREBASE INIT ─────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA6celobu3_BpyrlvXbH4X-7kwAsGYlDGw",
  authDomain: "andrea-portfolio-a0817.firebaseapp.com",
  projectId: "andrea-portfolio-a0817",
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
const CONFIG_DOC = db.collection('config').doc('site');

// ── GLOBAL STATE & CONSTANTS ──────────────────────────────────────────────
let _foldersCache   = null;
let introPlayed     = false;
let soundOn         = false;
let activeFilter    = 'all';
let lightboxItems   = [];
let vlbItems        = [];

// ── CONTROL DE SECCIONES ─────────────────────────────────────────────────────
const SECTIONS_CONFIG = [
  { id:'hero',        label:'Hero',         icon:'🎬', required:true  },
  { id:'sobre',       label:'Sobre mí',     icon:'👤', required:false },
  { id:'galeria',     label:'Galería',      icon:'🖼', required:false },
  { id:'videos',      label:'Vídeos',       icon:'🎥', required:false },
  { id:'servicios',   label:'Servicios',    icon:'💼', required:false },
  { id:'proceso',     label:'Proceso',      icon:'⚡', required:false },
  { id:'testimonios', label:'Testimonios',  icon:'💬', required:false },
  { id:'contacto',    label:'Contacto',     icon:'✉',  required:true  },
];

function isSectionHidden(stored, id){
  return stored[id] === false || stored[id] === 'false';
}

function refreshSectionsCSS(){
  const old = document.getElementById('_sections-hide');
  if(old) old.remove();
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  const ids = ['sobre','galeria','videos','servicios','proceso','testimonios','contacto'];
  let css = '';
  ids.forEach(id => {
    if(isSectionHidden(stored, id)){
      css += `#${id}{display:none!important}`;
      css += `nav .nav-links a[href="#${id}"],#footer-nav a[href="#${id}"]{display:none!important}`;
      css += `.mobile-menu a[href="#${id}"]{visibility:hidden!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;min-height:0!important;}`;
    }
  });
  if(css){
    const st = document.createElement('style');
    st.id = '_sections-hide';
    st.textContent = css;
    document.head.appendChild(st);
  }
}

function updateNavLinks(stored){
  document.querySelectorAll('nav .nav-links a').forEach(a => {
    const id = (a.getAttribute('href')||'').replace('#','');
    if(!SECTIONS_CONFIG.find(s => s.id === id)) return;
    a.style.display = isSectionHidden(stored, id) ? 'none' : '';
  });
  document.querySelectorAll('#footer-nav a').forEach(a => {
    const id = (a.getAttribute('href')||'').replace('#','');
    if(!SECTIONS_CONFIG.find(s => s.id === id)) return;
    a.style.display = isSectionHidden(stored, id) ? 'none' : '';
  });
  document.querySelectorAll('.mobile-menu a.mobile-link').forEach(a => {
    const id = (a.getAttribute('href')||'').replace('#','');
    if(!SECTIONS_CONFIG.find(s => s.id === id)) return;
    a.style.visibility = isSectionHidden(stored, id) ? 'hidden' : '';
    a.style.height     = isSectionHidden(stored, id) ? '0'      : '';
    a.style.margin     = isSectionHidden(stored, id) ? '0'      : '';
    a.style.overflow   = isSectionHidden(stored, id) ? 'hidden' : '';
  });
}

function applySectionVisibility(){
  refreshSectionsCSS();
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  updateNavLinks(stored);
  const ts = document.getElementById('toggle-servicios');
  const tt = document.getElementById('toggle-testimonios');
  if(ts) ts.checked = !isSectionHidden(stored,'servicios');
  if(tt) tt.checked = !isSectionHidden(stored,'testimonios');
}

// ── MAGNETIC UI ──
function initMagneticElements(){
  if(window.innerWidth < 768) return;
  document.querySelectorAll('.btn-submit, .loader-enter, .hero-cta, #lightboxExifBtn, .whatsapp-btn').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px) scale(1.05)`;
      if(el.classList.contains('hero-cta')) el.style.gap = '22px';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
      if(el.classList.contains('hero-cta')) el.style.gap = '';
    });
  });
}

// ── ASTRO TRANSITIONS RE-INIT ──
document.addEventListener('astro:page-load', () => {
  // Re-capturar elementos globales que cambian con la página
  initGlobalElements();

  // Aplicar visibilidad de secciones
  if(typeof applySectionVisibility === 'function') applySectionVisibility();

  // Reinicializar TODO lo necesario tras navegación
  loadConfigFromFirebase();
  initMagneticElements();
  renderPublicGallery();
  renderPublicVideos();
  if(typeof initTrackMouse === "function") initTrackMouse();

  // Re-activar observadores de revelado para nuevos elementos
  document.querySelectorAll('.reveal').forEach(el => {
    if(typeof revealObs !== 'undefined') revealObs.observe(el);
  });

  if(window.lenis && typeof window.lenis.scrollTo === 'function') {
      window.lenis.scrollTo(0, { immediate: true });
  }

  // Vincular eventos de navegación y UI
  bindUIEvents();
  initAdminTriggers();

    // Inicializar lógica del loader
    const loader = document.getElementById("loader");
    if(loader) {
        const canvas = document.getElementById("loaderCanvas");
        if(canvas && typeof initLoaderParticles === "function") initLoaderParticles(canvas);
        if(typeof initLoaderLogic === "function") initLoaderLogic();
    } else {
        document.body.style.overflow = "";
    }

  // Re-observar todo (reveals, secciones, lazy loading)
  setTimeout(() => {
    if(typeof revealObs !== 'undefined'){
      document.querySelectorAll('.reveal').forEach(el => {
        revealObs.unobserve(el);
        revealObs.observe(el);
      });
    }
    if(typeof sectionObsStrong !== 'undefined'){
      document.querySelectorAll('#sobre, #galeria, #videos, #servicios, #proceso, #testimonios, #contacto').forEach(sec => {
        sectionObsStrong.unobserve(sec);
        sectionObsStrong.observe(sec);
      });
    }
    // Forzar evento de scroll para elementos visibles en pantalla
    window.dispatchEvent(new Event('scroll'));
  }, 200);

  // Reiniciar estado de vídeos y otros elementos dinámicos
  initVideoObserver();
  initLazyLoading();

  // Reiniciar porcentaje si el loader vuelve a salir
  const pctText = document.getElementById('loaderPct');
  if(pctText) pctText.textContent = '0%';
});

let _tapCount = 0;
let _tapTimer = null;

function initAdminTriggers(){
  const logo = document.querySelector('.nav-logo');
  if(logo){
    let lastHandledAt = 0;
    const handleAction = (e) => {
      const now = Date.now();
      if(now - lastHandledAt < 150) return; // Debounce
      lastHandledAt = now;

      if(e) e.preventDefault(); // Siempre prevenimos para controlar nosotros

      _tapCount++;
      clearTimeout(_tapTimer);

      if(_tapCount >= 3) {
        askAdminPass();
        _tapCount = 0;
      } else {
        _tapTimer = setTimeout(() => {
          if(_tapCount === 1) {
            const href = logo.getAttribute('href');
            if(href && href !== '#') window.location.href = href;
          }
          _tapCount = 0;
        }, 400);
      }
    };

    logo.onclick = handleAction;
    logo.ontouchend = handleAction;
  }
}

function initGlobalElements(){
  // Estas variables ahora se actualizan en cada carga de página
  cursor = document.getElementById('cursor');
  ring   = document.getElementById('cursorRing');
  label  = document.getElementById('cursorLabel');
  trailCanvas = document.getElementById('trail-canvas');
  if(trailCanvas){ tc = trailCanvas.getContext('2d'); resizeCanvas(); }
}

function bindUIEvents(){
  const themeBtn = document.getElementById('themeBtn');
  if(themeBtn){
    themeBtn.onclick = () => {
      const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('alr_theme', t);
    };
  }

  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if(hamburger && mobileMenu){
    hamburger.onclick = () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    };

    document.querySelectorAll('.mobile-link').forEach(a => {
      a.onclick = () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      };
    });
  }

  // Cursor events
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => setCursorHover(true));
    el.addEventListener('mouseleave', () => setCursorHover(false));
  });
  document.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('mouseenter', () => setCursorView(window.t('lightbox.view') || 'Ver'));
    el.addEventListener('mouseleave', () => setCursorView(null));
  });
  document.querySelectorAll('.video-card').forEach(el => {
    el.addEventListener('mouseenter', () => setCursorView('Play'));
    el.addEventListener('mouseleave', () => setCursorView(null));
  });

  // Dark sections cursor
  const darkSections = document.querySelectorAll('#hero, #galeria, #contacto, #loader');
  darkSections.forEach(s => {
    s.onmouseenter = () => { if(cursor) cursor.classList.add('on-dark'); if(ring) ring.classList.add('on-dark'); };
    s.onmouseleave = () => { if(cursor) cursor.classList.remove('on-dark'); if(ring) ring.classList.remove('on-dark'); };
  });

  // Smooth scroll links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.onclick = e => {
      const id = a.getAttribute('href');
      if(id === '#') return;
      const target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    };
  });

  // ── NUEVAS INICIALIZACIONES (RE-BIND EN CADA CARGA) ──
  initFormValidation();
  initLazyLoading();
  initGalleryItemMove();
  initTestimoniosCarousel();
  initVideoObserver();

  // Sobre Carousel Navigation
  const sPrev = document.getElementById('sobrePrev');
  const sNext = document.getElementById('sobreNext');
  if(sPrev) sPrev.onclick = () => goSobre(_sobreIdx - 1);
  if(sNext) sNext.onclick = () => goSobre(_sobreIdx + 1);

  // Swipe support sobre
  let sx = 0;
  const car = document.getElementById('sobreCarousel');
  if(car){
    car.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive:true});
    car.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if(Math.abs(dx) > 40) dx < 0 ? goSobre(_sobreIdx+1) : goSobre(_sobreIdx-1);
    });
  }

  // Folder QR Modal Close (el panel admin puede no estar cargado todavía)
  const qrModal = document.getElementById('folder-qr-modal');
  if(qrModal) {
    qrModal.onclick = e => { if(e.target.id === 'folder-qr-modal' && typeof closeFolderQR === 'function') closeFolderQR(); };
  }

  // Custom Modal Close (el panel admin puede no estar cargado todavía)
  const customModal = document.getElementById('custom-modal');
  if(customModal) {
    customModal.onclick = e => { if(e.target.id === 'custom-modal' && typeof closeModal === 'function') closeModal(); };
  }

  // Slideshow Btn
  const ssBtn = document.getElementById('slideshowBtn');
  if(ssBtn) {
    ssBtn.onclick = () => { slideshowActive ? stopSlideshow() : startSlideshow(); };
  }

  // Admin tab indicator initial position
  const activeTab = document.querySelector('.admin-tab.active');
  if(activeTab) moveTabIndicator(activeTab);
}

// ── UTILIDAD: escapar HTML para prevenir XSS ──────────────────────────────────
function esc(s){
  if(!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fixPath(p){
  if(!p) return '';
  if(p.startsWith('http') || p.startsWith('/') || p.startsWith('data:')) return p;
  return '/' + p;
}

// Redimensiona/optimiza una imagen al vuelo — Cloudinary (legado) o Bunny Optimizer.
// Si Bunny Optimizer no está activado en la Pull Zone, los parámetros se ignoran
// sin más y se sirve la imagen original (no rompe nada).
function optimizeImageUrl(src, width, quality){
  if(!src) return src;
  if(src.includes('cloudinary.com') && src.includes('/upload/')){
    return src.replace('/upload/', `/upload/w_${width},f_auto,q_${quality || 'auto'}/`);
  }
  if(src.includes('.b-cdn.net')){
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}width=${width}&quality=${quality || 85}`;
  }
  return src;
}

// ── INDICADOR DE TABS (posición inicial, se usa también antes de iniciar sesión) ──
function moveTabIndicator(el) {
  const indicator = document.querySelector('.admin-tabs-indicator');
  if(!indicator) return;
  const parent = el.parentElement;
  const rect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  indicator.style.width = rect.width + 'px';
  indicator.style.transform = `translateX(${rect.left - parentRect.left}px)`;
}

// ── LOADER ──────────────────────────────────────────────────────────────────
function initLoaderParticles(canvas){
  // Limpiar timers de anteriores visitas (ViewTransitions)
  if(window._stopLoaderParticles) window._stopLoaderParticles();
  if(window._loaderPctAnim) cancelAnimationFrame(window._loaderPctAnim);
  if(window._loaderEmergencyId) clearTimeout(window._loaderEmergencyId);

  const ctx = canvas.getContext('2d');
  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Limpiar resize al salir de la página
  document.addEventListener('astro:before-preparation', () => {
     window.removeEventListener('resize', resize);
  }, { once: true });

  const particles = Array.from({length: 120}, () => ({
    x:     Math.random() * window.innerWidth,
    y:     Math.random() * window.innerHeight,
    r:     Math.random() * 1.5 + 0.3,
    vx:    (Math.random() - .5) * .3,
    vy:    -(Math.random() * .4 + .1),
    alpha: Math.random() * .45 + .08,
  }));

  let running = true;
  window._stopLoaderParticles = () => { running = false; };

  function draw(){
    if(!running) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0) p.x = W; if(p.x > W) p.x = 0;
      if(p.y < 0) p.y = H; if(p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 184, 154, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function initLoaderLogic(){
  // Contador de porcentaje
  const pct = document.getElementById('loaderPct');
  if(pct){
    const start = Date.now();
    const duration = 2200, delay = 1200;
    function tickPct(){
      const elapsed = Date.now() - start - delay;
      if(elapsed < 0){
        window._loaderPctAnim = requestAnimationFrame(tickPct);
        return;
      }
      const t = Math.min(elapsed / duration, 1);
      const val = Math.floor((1 - Math.pow(1-t,3)) * 100);
      pct.textContent = val + '%';
      const bar = document.querySelector('.loader-bar');
      if(bar) bar.style.width = val + '%';

      if(t < 1) {
        window._loaderPctAnim = requestAnimationFrame(tickPct);
      } else {
        pct.textContent = '100%';
        activateEnterBtn();
      }
    }
    window._loaderPctAnim = requestAnimationFrame(tickPct);
  }

  // Activar botón cuando esté listo
  function activateEnterBtn(){
    const enterBtn = document.getElementById('loaderEnterBtn');
    if(enterBtn){
      enterBtn.style.opacity = '1';
      enterBtn.style.pointerEvents = 'auto';
      enterBtn.classList.add('ready');
    }
  }

  // Botón Entrar
  const enterBtn = document.getElementById('loaderEnterBtn');
  if(enterBtn){
    enterBtn.style.opacity = '0';
    enterBtn.style.pointerEvents = 'none';

    enterBtn.onclick = () => {
      hideLoader();
      try {
        const actx = getAudioCtx();
        if(!introPlayed){
          introPlayed = true;
          playIntroSound(actx);
        }
        setTimeout(() => {
          soundOn = true;
          const on  = document.getElementById('soundIconOn');
          const off = document.getElementById('soundIconOff');
          if(on)  on.style.display  = 'block';
          if(off) off.style.display = 'none';
          const soundBtn = document.getElementById('soundBtn');
          if(soundBtn) soundBtn.style.opacity = '1';
          if(typeof ambientGain !== 'undefined' && ambientGain){
            ambientGain.gain.cancelScheduledValues(actx.currentTime);
            ambientGain.gain.setValueAtTime(0, actx.currentTime);
            ambientGain.gain.linearRampToValueAtTime(0.4, actx.currentTime + 3);
          }
        }, 800);
      } catch(e){
        console.warn('audio error', e);
      }
    };
  }

  // Fallback de emergencia
  window._loaderEmergencyId = setTimeout(hideLoader, 8000);
  Promise.all([
    document.fonts.load('300 1rem "Cormorant Garamond"'),
    document.fonts.load('200 1rem "Outfit"')
  ]).catch(() => setTimeout(hideLoader, 500));
}

function hideLoader(){
  const l = document.getElementById('loader');
  if(l){
    l.classList.add('hidden');
    setTimeout(() => l.remove(), 1100);
  }
  if(window._stopLoaderParticles) window._stopLoaderParticles();
}

// Inicialización de tema (sin listeners globales atascados)
const savedTheme = localStorage.getItem('alr_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// ── CURSOR ───────────────────────────────────────────────────────────────────
let cursor = null;
let ring   = null;
let label  = null;
let mx = window.innerWidth/2, my = window.innerHeight/2, rx = window.innerWidth/2, ry = window.innerHeight/2;

let trailCanvas = null;
let tc = null;
const trail = [];
const MAX_TRAIL = 28;
let animFrameId = null;
let trailFrameId = null;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  if(cursor){
    cursor.style.setProperty('--cx', mx + 'px');
    cursor.style.setProperty('--cy', my + 'px');
  }
  trail.push({ x: e.clientX, y: e.clientY, life: 1 });
  if(trail.length > MAX_TRAIL) trail.shift();
});

function initTrackMouse(){
  trailCanvas = document.getElementById('trail-canvas');
  if(trailCanvas){
    tc = trailCanvas.getContext('2d');
    resizeCanvas();
    if(trailFrameId) cancelAnimationFrame(trailFrameId);
    drawTrail();
  }
}

function resizeCanvas(){
  if(trailCanvas){
    trailCanvas.width  = window.innerWidth;
    trailCanvas.height = window.innerHeight;
  }
}
window.addEventListener('resize', resizeCanvas);

function drawTrail(){
  if(tc && trailCanvas){
    tc.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    for(let i = 1; i < trail.length; i++){
      const p  = trail[i - 1];
      const c  = trail[i];
      const t  = i / trail.length;
      tc.beginPath();
      tc.moveTo(p.x, p.y);
      tc.lineTo(c.x, c.y);
      tc.strokeStyle = `rgba(200,184,154,${t * 0.18})`;
      tc.lineWidth   = t * 2.5;
      tc.lineCap     = 'round';
      tc.stroke();
    }
  }
  for(let i = 0; i < trail.length; i++) trail[i].life -= 0.02;
  trailFrameId = requestAnimationFrame(drawTrail);
}

function anim(){
  rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
  if(ring)  { ring.style.setProperty('--cx', rx + 'px'); ring.style.setProperty('--cy', ry + 'px'); }
  if(label) { label.style.setProperty('--cx', rx + 'px'); label.style.setProperty('--cy', ry + 'px'); }
  animFrameId = requestAnimationFrame(anim);
}

function setCursorHover(on){
  if(cursor) cursor.classList.toggle('hover', on);
  if(ring) ring.classList.toggle('hover', on);
}
function setCursorView(text){
  if(text){
    if(cursor) cursor.classList.add('view');
    if(ring) ring.classList.add('view');
    if(label){ label.textContent = text; label.classList.add('show'); }
  } else {
    if(cursor) cursor.classList.remove('view');
    if(ring) ring.classList.remove('view');
    if(label) label.classList.remove('show');
  }
}

// ── NAVBAR SCROLL ─────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
});

// ── NAV LINK ACTIVO SEGÚN SECCIÓN VISIBLE ─────────────────────────────────────
(function(){
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const mobileLinks = document.querySelectorAll('.mobile-menu a[href^="#"]');

  function setActive(id){
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    mobileLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting) setActive(e.target.id);
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(sec => obs.observe(sec));
})();

// ── REVEAL ON SCROLL ─────────────────────────────────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ── SCROLL SUAVE ENTRE SECCIONES ─────────────────────────────────────────────
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
    const id = e.target.id;
    if(isSectionHidden(stored, id)) return;
    if(e.isIntersecting){
      e.target.style.opacity   = '1';
      e.target.style.transform = 'translateY(0) scale(1)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('#sobre, #galeria, #videos, #contacto').forEach(sec => {
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  if(isSectionHidden(stored, sec.id)) return;
  sec.style.opacity   = '0';
  sec.style.transform = 'translateY(40px) scale(0.99)';
  sec.style.transition = 'opacity .9s cubic-bezier(.25,.46,.45,.94), transform .9s cubic-bezier(.25,.46,.45,.94)';
  sectionObs.observe(sec);
});

// Aplicar títulos guardados al cargar la página
function applyMultimedia(){
  try{
    const data = JSON.parse(localStorage.getItem('alr_multimedia') || '{}');
    const fotos  = document.querySelectorAll('.gallery-item[data-index]');
    const videos = document.querySelectorAll('.video-card[data-src]');
    (data.fotos || []).forEach((d, i) => {
      if(!fotos[i] || !d) return;
      if(d.titulo){ fotos[i].dataset.titulo = d.titulo; const lbl = fotos[i].querySelector('.gallery-item-label'); if(lbl) lbl.textContent = d.titulo; }
      if(d.desc)   fotos[i].dataset.desc = d.desc;
    });
    (data.videos || []).forEach((d, i) => {
      if(!videos[i] || !d) return;
      if(d.titulo){ videos[i].dataset.title = d.titulo; const h3 = videos[i].querySelector('.video-title'); if(h3) h3.textContent = d.titulo; }
      if(d.desc)  { videos[i].dataset.desc  = d.desc;   const p  = videos[i].querySelector('.video-desc');  if(p)  p.textContent  = d.desc;   }
    });
  } catch(e){}
}
applyMultimedia();

// ── PERSONALIZACIÓN — TEXTOS ──────────────────────────────────────────────────
const TEXTOS_DEFAULT = {
  tagline:        'Capturo lo que el ojo no alcanza a ver solo.\nDesde el suelo hasta el cielo, cada encuadre es una decisión.',
  eyebrow:        'Fotografía · Vídeo · Dron',
  sobre1:         'Soy Andrea López, fotógrafa y piloto de dron con pasión por encontrar ángulos que transformen lo cotidiano en algo extraordinario. Mi trabajo abarca desde bodas y eventos hasta paisajes aéreos y vídeos cinematográficos.',
  sobre2:         'Cada proyecto es una conversación entre la cámara y el mundo. Me llevo la historia de las personas, los lugares y los instantes que de otra forma pasarían desapercibidos.',
  disponibilidad: 'Disponible para proyectos · España',
  tagline_en:        'I capture what the eye alone cannot reach.\nFrom the ground to the sky, every frame is a decision.',
  eyebrow_en:        'Photography · Video · Drone',
  sobre1_en:         'I am Andrea López, a photographer and drone pilot with a passion for finding angles that transform the everyday into something extraordinary. My work ranges from weddings and events to aerial landscapes and cinematic videos.',
  sobre2_en:         'Each project is a conversation between the camera and the world. I take with me the story of the people, the places, and the moments that would otherwise pass unnoticed.',
  disponibilidad_en: 'Available for projects · Spain',
};

function loadTextos(){
  try{ return Object.assign({}, TEXTOS_DEFAULT, JSON.parse(localStorage.getItem('alr_textos')||'{}')); }
  catch(e){ return {...TEXTOS_DEFAULT}; }
}

function applyTextos(t){
  const lang = document.documentElement.lang || 'es';
  const tagline        = lang === 'en' ? (t.tagline_en        || TEXTOS_DEFAULT.tagline_en)        : t.tagline;
  const eyebrow         = lang === 'en' ? (t.eyebrow_en        || TEXTOS_DEFAULT.eyebrow_en)        : t.eyebrow;
  const disponibilidad = lang === 'en' ? (t.disponibilidad_en || TEXTOS_DEFAULT.disponibilidad_en) : t.disponibilidad;
  const sobre1          = lang === 'en' ? (t.sobre1_en         || TEXTOS_DEFAULT.sobre1_en)         : t.sobre1;
  const sobre2          = lang === 'en' ? (t.sobre2_en         || TEXTOS_DEFAULT.sobre2_en)         : t.sobre2;

  // Hero tagline
  const tl = document.querySelector('.hero-tagline');
  if(tl && tagline) tl.innerHTML = esc(tagline).replace(/\n/g,'<br>');
  // Hero eyebrow
  const ey = document.querySelector('.hero-eyebrow');
  if(ey && eyebrow) ey.textContent = eyebrow;

  // Párrafos "Sobre mí"
  const sobreEls = document.querySelectorAll('.sobre-body');
  if(sobreEls[0] && sobre1) sobreEls[0].textContent = sobre1;
  if(sobreEls[1] && sobre2) sobreEls[1].textContent = sobre2;

  // Disponibilidad en contacto
  document.querySelectorAll('.contacto-info-item span').forEach(s => {
    if(s.textContent.includes('Disponible') || s.textContent.includes('Available')) {
      if(disponibilidad) s.textContent = disponibilidad;
    }
  });
}

function applyContacto(d){
  // Links de instagram
  document.querySelectorAll('a[href*="instagram"]').forEach(a => {
    a.href = `https://instagram.com/${d.instagram}`;
    if(a.textContent.includes('@') || a.textContent.includes('andrea'))
      a.childNodes.forEach(n => { if(n.nodeType === 3) n.textContent = d.instagram; });
  });
  // Disponibilidad
  document.querySelectorAll('.contacto-info-item span').forEach(s => {
    if(s.textContent.includes('Disponible')) s.textContent = d.zona;
  });
  // Email/teléfono — añadir si existen
  const infoList = document.querySelector('.contacto-info');
  if(infoList && d.email){
    let emailItem = infoList.querySelector('[data-type="email"]');
    if(!emailItem){
      emailItem = document.createElement('div');
      emailItem.className = 'contacto-info-item';
      emailItem.dataset.type = 'email';
      emailItem.innerHTML = `<div class="info-dot"></div><a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`;
      infoList.appendChild(emailItem);
    } else {
      emailItem.querySelector('a').href = `mailto:${d.email}`;
      emailItem.querySelector('a').textContent = d.email;
    }
  }
  // Footer social handles
  const fw  = document.getElementById('footer-whatsapp');
  const fwh = document.getElementById('footer-whatsapp-handle');
  const fi  = document.getElementById('footer-instagram');
  const fih = document.getElementById('footer-instagram-handle');
  if(fw && d.whatsapp){
    const clean = d.whatsapp.replace(/\D/g,'');
    fw.href = `https://wa.me/${clean}`;
    if(fwh && clean.length >= 9) fwh.textContent = `+${clean.slice(0,-9)} ${clean.slice(-9,-6)} ${clean.slice(-6,-3)} ${clean.slice(-3)}`;
  }
  if(fi  && d.instagram){ fi.href = `https://instagram.com/${d.instagram}`; }
  if(fih && d.instagram){ fih.textContent = d.instagram; }
  // WhatsApp popup
  const waPopupLink = document.getElementById('whatsappPopupLink');
  if(waPopupLink && d.whatsapp){
    const clean = d.whatsapp.replace(/\D/g,'');
    waPopupLink.href = `https://wa.me/${clean}?text=Hola%20Andrea%2C%20me%20gustar%C3%ADa%20hablar%20sobre%20un%20proyecto`;
  }
}
// Aplicar al cargar
const savedContacto = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
if(Object.keys(savedContacto).length) applyContacto(savedContacto);

// ── CARRUSEL FOTOS ────────────────────────────────────────────────────────────
let lightboxIndex = 0;
let isAnimating   = false;

function buildLightboxItems(){
  lightboxItems = Array.from(document.querySelectorAll('.gallery-item')).filter(item => {
    if(activeFilter === 'all') return true;
    return item.dataset.cat === activeFilter;
  });
}

function buildTrack(){
  const track = document.getElementById('lightboxTrack');
  track.innerHTML = '';
  lightboxItems.forEach((item) => {
    const slide = document.createElement('div');
    slide.className = 'lightbox-slide';
    slide.style.position = 'relative';
    const img = item.querySelector('img');
    if(img){ const si = document.createElement('img'); si.src = img.src; si.alt = img.alt||''; slide.appendChild(si); }
    const titulo = item.dataset.titulo || item.querySelector('.gallery-item-label')?.textContent || '';
    const desc   = item.dataset.desc   || '';
    const exif   = item.dataset.exif   || '';
    if(titulo || desc){
      const info = document.createElement('div');
      info.className = 'slide-info';
      info.innerHTML = `${titulo ? `<p class="slide-titulo">${titulo}</p>` : ''}${desc ? `<p class="slide-desc">${desc}</p>` : ''}`;
      slide.appendChild(info);
    }
    track.appendChild(slide);
  });
  // Precargar imágenes lazy del lightbox
  document.querySelectorAll('#lightboxTrack img[data-src]').forEach(img => {
    img.src = img.dataset.src; img.removeAttribute('data-src'); img.classList.add('loaded');
  });
  document.querySelectorAll('.gallery-item img[data-src]').forEach(img => {
    img.src = img.dataset.src; img.removeAttribute('data-src'); img.classList.add('loaded');
  });
}

function goToSlide(idx, instant){
  lightboxIndex = ((idx % lightboxItems.length) + lightboxItems.length) % lightboxItems.length;
  const track = document.getElementById('lightboxTrack');
  track.style.transition = instant ? 'none' : 'transform .55s cubic-bezier(.86,0,.07,1)';
  track.style.transform  = `translateX(${-lightboxIndex * 100}vw)`;
  track.querySelectorAll('.lightbox-slide').forEach((s, i) => {
    s.classList.remove('active','prev','next');
    if(i === lightboxIndex) s.classList.add('active');
    else if(i === (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length) s.classList.add('prev');
    else if(i === (lightboxIndex + 1) % lightboxItems.length) s.classList.add('next');
  });
  document.getElementById('lightboxCounter').textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
  document.querySelectorAll('.lightbox-thumb').forEach((t,i) => {
    t.classList.toggle('active', i === lightboxIndex);
    if(i === lightboxIndex) t.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  });
}

function buildThumbStrip(){
  const strip = document.getElementById('thumbStrip');
  strip.innerHTML = '';
  lightboxItems.forEach((item, i) => {
    const img = item.querySelector('img');
    if(!img) return;
    const t = document.createElement('img');
    t.src = img.src; t.className = 'lightbox-thumb';
    if(i === lightboxIndex) t.classList.add('active');
    t.addEventListener('click', () => goToSlide(i));
    strip.appendChild(t);
  });
}

function openLightbox(idx){
  playShutter();
  buildLightboxItems(); buildTrack(); buildThumbStrip(); goToSlide(idx, true);
  const lb = document.getElementById('lightbox');
  lb.style.display = 'flex'; requestAnimationFrame(() => lb.style.opacity = '1');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(){
  stopSlideshow();
  const lb = document.getElementById('lightbox');
  lb.style.opacity = '0'; setTimeout(() => { lb.style.display = 'none'; }, 400);
  document.body.style.overflow = '';
}

function lightboxPrev(){ stopSlideshow(); if(isAnimating) return; isAnimating=true; goToSlide(lightboxIndex-1); setTimeout(()=>isAnimating=false,580); }
function lightboxNext(){ if(!slideshowActive) stopSlideshow(); if(isAnimating) return; isAnimating=true; goToSlide(lightboxIndex+1); setTimeout(()=>isAnimating=false,580); }

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev').addEventListener('click', lightboxPrev);
document.getElementById('lightboxNext').addEventListener('click', lightboxNext);
document.getElementById('lightbox').addEventListener('click', e => { if(e.target === e.currentTarget) closeLightbox(); });

// ── CARRUSEL VÍDEOS ───────────────────────────────────────────────────────────
let vlbIndex    = 0;
let vlbAnimating = false;

function buildVlbItems(){
  vlbItems = Array.from(document.querySelectorAll('.video-card[data-src]'));
}

function buildVlbTrack(){
  const track = document.getElementById('vlbTrack');
  track.innerHTML = '';
  vlbItems.forEach((card) => {
    const slide = document.createElement('div');
    slide.className = 'lightbox-slide';
    slide.style.position = 'relative';
    const vid = document.createElement('video');
    vid.src = card.dataset.src; vid.controls = true; vid.playsinline = true;
    vid.style.cssText = 'max-width:82vw;max-height:76vh;outline:none;border-radius:2px;';
    slide.appendChild(vid);
    const titulo = card.dataset.title || '';
    const desc   = card.dataset.desc  || '';
    if(titulo || desc){
      const info = document.createElement('div');
      info.className = 'slide-info';
      info.innerHTML = `${titulo ? `<p class="slide-titulo">${titulo}</p>` : ''}${desc ? `<p class="slide-desc">${desc}</p>` : ''}`;
      slide.appendChild(info);
    }
    track.appendChild(slide);
  });
}

function goToVlbSlide(idx, instant){
  document.querySelectorAll('#vlbTrack video').forEach(v => { v.pause(); v.currentTime = 0; });
  vlbIndex = ((idx % vlbItems.length) + vlbItems.length) % vlbItems.length;
  const track = document.getElementById('vlbTrack');
  track.style.transition = instant ? 'none' : 'transform .55s cubic-bezier(.86,0,.07,1)';
  track.style.transform  = `translateX(${-vlbIndex * 100}vw)`;
  track.querySelectorAll('.lightbox-slide').forEach((s, i) => {
    s.classList.remove('active','prev','next');
    if(i === vlbIndex) s.classList.add('active');
    else if(i === (vlbIndex - 1 + vlbItems.length) % vlbItems.length) s.classList.add('prev');
    else if(i === (vlbIndex + 1) % vlbItems.length) s.classList.add('next');
  });
  document.getElementById('vlbCounter').textContent = `${vlbIndex + 1} / ${vlbItems.length}`;
  document.querySelectorAll('.vlb-thumb').forEach((t,i) => {
    t.classList.toggle('active', i === vlbIndex);
    if(i === vlbIndex) t.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  });
}

function buildVlbThumbStrip(){
  const strip = document.getElementById('vlbThumbStrip');
  strip.innerHTML = '';
  vlbItems.forEach((card, i) => {
    const t = document.createElement('div');
    t.className = 'lightbox-thumb vlb-thumb';
    t.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#1a1816;';
    t.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(200,184,154,.6)"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    if(i === vlbIndex) t.classList.add('active');
    t.addEventListener('click', () => goToVlbSlide(i));
    strip.appendChild(t);
  });
}

function openVlb(idx){
  buildVlbItems(); buildVlbTrack(); buildVlbThumbStrip(); goToVlbSlide(idx, true);
  const lb = document.getElementById('video-lightbox');
  lb.style.display = 'flex'; requestAnimationFrame(() => lb.style.opacity = '1');
  document.body.style.overflow = 'hidden';
}

function closeVlb(){
  document.querySelectorAll('#vlbTrack video').forEach(v => { v.pause(); v.currentTime = 0; });
  const lb = document.getElementById('video-lightbox');
  lb.style.opacity = '0'; setTimeout(() => { lb.style.display = 'none'; }, 400);
  document.body.style.overflow = '';
}

function vlbPrev(){ if(vlbAnimating) return; vlbAnimating=true; goToVlbSlide(vlbIndex-1); setTimeout(()=>vlbAnimating=false,580); }
function vlbNext(){ if(vlbAnimating) return; vlbAnimating=true; goToVlbSlide(vlbIndex+1); setTimeout(()=>vlbAnimating=false,580); }

document.getElementById('vlbClose').addEventListener('click', closeVlb);
document.getElementById('vlbPrev').addEventListener('click', vlbPrev);
document.getElementById('vlbNext').addEventListener('click', vlbNext);
document.getElementById('video-lightbox').addEventListener('click', e => { if(e.target === e.currentTarget) closeVlb(); });

// Click listeners para video-card se asignan dinámicamente en renderPublicVideos()

// Teclado
let touchStartX = 0;
document.addEventListener('keydown', e => {
  const lbOpen  = document.getElementById('lightbox').style.display === 'flex';
  const vlbOpen = document.getElementById('video-lightbox').style.display === 'flex';
  if(e.key === 'ArrowLeft') { if(lbOpen) lightboxPrev(); if(vlbOpen) vlbPrev(); }
  if(e.key === 'ArrowRight'){ if(lbOpen) lightboxNext(); if(vlbOpen) vlbNext(); }
  if(e.key === 'Escape')    { if(lbOpen) closeLightbox(); if(vlbOpen) closeVlb(); }
});

// Swipe fotos
document.getElementById('lightbox').addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; },{passive:true});
document.getElementById('lightbox').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx) > 50){ dx < 0 ? lightboxNext() : lightboxPrev(); }
});
// Swipe vídeos
document.getElementById('video-lightbox').addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; },{passive:true});
document.getElementById('video-lightbox').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx) > 50){ dx < 0 ? vlbNext() : vlbPrev(); }
});

// ── EMAILJS — FORMULARIO FUNCIONAL ────────────────────────────────────────────
const EMAILJS_SERVICE  = localStorage.getItem('alr_ejs_service')  || 'service_obw8dnq';
const EMAILJS_TEMPLATE = localStorage.getItem('alr_ejs_template') || 'template_ucs9imo';
const EMAILJS_KEY      = localStorage.getItem('alr_ejs_key')      || 'kw6JxksT6NfNFy4d8';
const EMAIL_DESTINO    = localStorage.getItem('alr_email_destino') || 'diegomdz19@hotmail.com';

if(EMAILJS_KEY) emailjs.init({ publicKey: EMAILJS_KEY });

function handleSubmit(e){
  e.preventDefault();
  const form = e.target;
  // Honeypot anti-spam: si el campo _honey tiene contenido, es un bot
  if(form._honey && form._honey.value) return;
  const btn  = form.querySelector('.btn-submit');
  const campos = form.querySelectorAll('input,textarea');
  const params = { to_email: EMAIL_DESTINO };
  campos.forEach(c => { if(c.name) params[c.name] = c.value; });
  // Alinear nombres con la plantilla de EmailJS
  params.name    = params.from_name || '';
  params.email   = params.reply_to  || '';
  params.title   = params.proyecto  || 'Contacto web';

  btn.textContent = btn.dataset.tSending || 'Enviando...';
  btn.style.opacity = '.6';

  if(EMAILJS_KEY){
    emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, params)
      .then(() => {
        btn.textContent = btn.dataset.tSuccess || 'Mensaje enviado ✓';
        btn.style.borderColor = 'var(--warm)'; btn.style.color = 'var(--warm)'; btn.style.opacity = '1';
        setTimeout(() => {
          btn.innerHTML = `${btn.dataset.tDefault || 'Enviar mensaje'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
          btn.style.borderColor = ''; btn.style.color = ''; form.reset();
        }, 3000);
      })
      .catch(() => {
        btn.textContent = btn.dataset.tError || 'Error al enviar. Inténtalo de nuevo.';
        btn.style.color = '#c87a6a'; btn.style.opacity = '1';
        setTimeout(() => {
          btn.innerHTML = `${btn.dataset.tDefault || 'Enviar mensaje'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
          btn.style.color = '';
        }, 3000);
      });
  } else {
    // Sin EmailJS configurado — simulación
    setTimeout(() => {
      btn.textContent = 'Mensaje enviado ✓';
      btn.style.borderColor = 'var(--warm)'; btn.style.color = 'var(--warm)'; btn.style.opacity = '1';
      setTimeout(() => {
        btn.innerHTML = 'Enviar mensaje <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
        btn.style.borderColor = ''; btn.style.color = ''; form.reset();
      }, 3000);
    }, 800);
  }
}

// ── TYPEWRITER HERO ────────────────────────────────────────────────────────────
function initTypewriter(){
  const heroName = document.querySelector('.hero-name');
  if(!heroName) return;
  function wrapChars(node){
    if(node.nodeType === 3){
      const frag = document.createDocumentFragment();
      node.textContent.split('').forEach(ch => {
        const span = document.createElement('span');
        span.className = 'tw-char';
        span.textContent = ch === ' ' ? ' ' : ch;
        frag.appendChild(span);
      });
      node.replaceWith(frag);
    } else if(node.nodeType === 1 && node.tagName !== 'BR'){
      Array.from(node.childNodes).forEach(wrapChars);
    }
  }
  Array.from(heroName.childNodes).forEach(wrapChars);

  const chars = heroName.querySelectorAll('.tw-char');
  chars.forEach((ch, i) => {
    setTimeout(() => ch.classList.add('show'), 800 + i * 45);
  });
}
setTimeout(initTypewriter, 2900);

// ── SONIDO ────────────────────────────────────────────────────────────────────
const soundBtn = document.getElementById('soundBtn');
let ambientCtx  = null;
let ambientGain = null;

function getAudioCtx(){
  if(!ambientCtx){
    ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
    initAmbient();
  }
  if(ambientCtx.state === 'suspended') ambientCtx.resume();
  return ambientCtx;
}

// Acorde cinematográfico tipo Netflix
function playIntroSound(ctx){
  try{
    const now = ctx.currentTime;
    function nota(freq, t, dur, vol){
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.1);
    }
    nota(40,  now,        0.5,  0.28);
    nota(130, now + 0.04, 2.0,  0.13);
    nota(164, now + 0.07, 2.2,  0.10);
    nota(196, now + 0.10, 2.4,  0.08);
    nota(260, now + 0.13, 1.8,  0.06);
    nota(392, now + 0.16, 1.4,  0.04);
  } catch(e){ console.warn('intro error', e); }
}

function toggleSound(){
  const ctx = getAudioCtx();
  soundOn = !soundOn;
  document.getElementById('soundIconOn').style.display  = soundOn ? 'block' : 'none';
  document.getElementById('soundIconOff').style.display = soundOn ? 'none'  : 'block';
  soundBtn.style.opacity = soundOn ? '1' : '.6';
  if(soundOn){
    ambientGain.gain.cancelScheduledValues(ctx.currentTime);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 2);
  } else {
    ambientGain.gain.cancelScheduledValues(ctx.currentTime);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  }
}

soundBtn.addEventListener('click', e => {
  e.stopPropagation();
  if(!ambientCtx){ getAudioCtx(); introPlayed = true; }
  toggleSound();
});

// ── COOKIE BANNER ──────────────────────────────────────────────────────────────
function initCookieBanner(){
  if(localStorage.getItem('alr_cookies')) return;
  setTimeout(() => document.getElementById('cookie-banner').classList.add('show'), 2000);
}
function acceptCookies(){
  localStorage.setItem('alr_cookies','all');
  document.getElementById('cookie-banner').classList.remove('show');
  if(typeof gtag !== 'undefined') gtag('consent','update',{analytics_storage:'granted'});
}
function rejectCookies(){
  localStorage.setItem('alr_cookies','essential');
  document.getElementById('cookie-banner').classList.remove('show');
}
function openPrivacy(e){
  e.preventDefault();
  document.getElementById('privacy-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePrivacy(){
  document.getElementById('privacy-modal').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('privacy-modal').addEventListener('click', e => {
  if(e.target === e.currentTarget) closePrivacy();
});

// ── VÍDEOS PÚBLICOS ─────────────────────────────────────────────────────────
async function renderPublicVideos(){
  const grid = document.querySelector('.video-grid');
  if(!grid) return;
  const loadingT = grid.parentElement.dataset.tLoading || 'Cargando vídeos…';
  grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;font-size:.72rem;color:#7a7068;font-weight:200;padding:40px 0;">${loadingT}</p>`;

  try {
    const snapshot = await db.collection('videos').orderBy('created').get();
    grid.innerHTML = '';

    const lang = document.documentElement.lang || 'es';
    snapshot.forEach((doc, i) => {
      const v = doc.data();
      const title = (lang === 'en' && v.titulo_en) ? v.titulo_en : (v.titulo || esc((v.src||'').split('/').pop()));
      const desc  = (lang === 'en' && v.desc_en) ? v.desc_en : (v.desc || '');

      const card = document.createElement('div');
      card.className = 'video-card reveal' + (i === 1 ? ' reveal-delay-1' : i === 2 ? ' reveal-delay-2' : '');
      card.dataset.src   = v.src;
      card.dataset.title = title;
      card.dataset.desc  = desc;
      card.innerHTML = `
        <div class="video-thumb" style="background:#000;">
          <video muted loop playsinline preload="auto" class="video-auto-preview"
            poster="${v.src.includes('cloudinary.com') ? v.src.replace('/upload/', '/upload/so_0,f_jpg,q_auto/') : fixPath(v.src.replace(/\.[^.]+$/, '.jpg'))}"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.8;"
            onmouseenter="this.play()" onmouseleave="this.pause()">
            <source src="${fixPath(v.src)}#t=0.001" type="video/mp4">
          </video>
          <div class="play-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
        </div>
        <div class="video-info">
          <h3 class="video-title">${esc(title)}</h3>
          <p class="video-desc">${esc(desc)}</p>
        </div>`;

      card.addEventListener('click', () => {
        buildVlbItems();
        const idx = vlbItems.indexOf(card);
        if(idx >= 0) openVlb(idx);
      });
      card.addEventListener('mouseenter', () => setCursorView('Play'));
      card.addEventListener('mouseleave', () => setCursorView(null));

      grid.appendChild(card);
    });

    if(typeof revealObs !== 'undefined'){
      grid.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
    }
    initVideoObserver();
  } catch(e) {
    console.error('Error cargando vídeos públicos:', e);
  }
}

// ── SOBRE CARRUSEL ─────────────────────────────────────────────────────────
let _sobreIdx = 0;
let _sobreCount = 1;
const SOBRE_SLIDE_W = 82; // % width of each slide

async function renderSobreCarousel(){
  const track = document.getElementById('sobreTrack');
  const dots  = document.getElementById('sobreDots');
  const wrap  = document.getElementById('sobreCarousel');
  if(!track) return;

  try {
    const snap = await db.collection('sobre_photos').orderBy('created').get();
    const photos = [];
    snap.forEach(doc => photos.push({ id:doc.id, ...doc.data() }));

    if(!photos.length) photos.push({ src:'/fotos/retrato.jpeg', fallback:true });

    _sobreCount = photos.length;
    _sobreIdx = 0;

    track.innerHTML = '';
    photos.forEach(p => {
      const slide = document.createElement('div');
      slide.className = 'sobre-carousel-slide';
      slide.innerHTML = `<img src="${fixPath(p.src)}" alt="Andrea López">`;
      track.appendChild(slide);
    });

    if(dots){
      dots.innerHTML = '';
      photos.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'sobre-dot' + (i===0?' active':'');
        d.addEventListener('click', () => goSobre(i));
        dots.appendChild(d);
      });
    }

    if(wrap) wrap.classList.toggle('single', photos.length <= 1);

    goSobre(0, true);
  } catch(e){
    console.warn('Error cargando sobre carousel:', e);
  }
}

function goSobre(idx, instant){
  _sobreIdx = ((idx % _sobreCount) + _sobreCount) % _sobreCount;
  const track = document.getElementById('sobreTrack');
  if(!track) return;
  const offset = -(_sobreIdx * SOBRE_SLIDE_W) + (100 - SOBRE_SLIDE_W) / 2;
  track.style.transition = instant ? 'none' : '';
  track.style.transform = `translateX(${offset}%)`;

  track.querySelectorAll('.sobre-carousel-slide').forEach((s,i) => {
    s.classList.toggle('active', i === _sobreIdx);
  });
  document.querySelectorAll('.sobre-dot').forEach((d,i) => {
    d.classList.toggle('active', i === _sobreIdx);
  });
}

function applyHeroMedia(cfg){
  if(!cfg || !cfg.src) return;
  const wrap = document.querySelector('.hero-video-wrap');
  if(!wrap) return;

  if(cfg.type === 'image'){
    wrap.innerHTML = `<img src="${esc(cfg.src)}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    wrap.innerHTML = `<video autoplay muted loop playsinline><source src="${esc(cfg.src)}" type="video/mp4"></video>`;
  }
}

// Aplicar hero guardado al cargar
(function(){
  const cfg = JSON.parse(localStorage.getItem('alr_hero')||'{}');
  if(cfg.src) applyHeroMedia(cfg);
})();

// Init: cargar carrusel sobre desde Firestore
renderSobreCarousel();

// ── PROCESO ────────────────────────────────────────────────────────────────
const PROCESO_DEFAULT = [
  {num:'01', titulo:'Me escribes',  desc:'Cuéntame tu proyecto, la fecha y lo que tienes en mente. Te respondo en menos de 24h.'},
  {num:'02', titulo:'Hablamos',     desc:'Una llamada o reunión rápida para entender exactamente lo que necesitas y preparar todo.'},
  {num:'03', titulo:'La sesión',    desc:'Me encargo de todo. Tú solo tienes que disfrutar. Yo capturo cada momento importante.'},
  {num:'04', titulo:'La entrega',   desc:'Galería privada en 48h con todas las fotos editadas. Vídeo en 7 días. Sin letra pequeña.'},
];

function loadProceso(){ try{ return JSON.parse(localStorage.getItem('alr_proceso')) || PROCESO_DEFAULT; } catch(e){ return PROCESO_DEFAULT; } }

function renderProceso(data){
  const steps = document.querySelector('.proceso-steps');
  if(!steps) return;
  steps.innerHTML = '';
  data.forEach((s,i) => {
    const delays = ['','reveal reveal-delay-1','reveal reveal-delay-2','reveal reveal-delay-2'];
    const d = document.createElement('div');
    d.className = `proceso-step reveal ${delays[i]||''}`;
    d.innerHTML = `<div class="proceso-num">${s.num}</div><h3 class="proceso-titulo">${s.titulo}</h3><p class="proceso-desc">${s.desc}</p>`;
    steps.appendChild(d);
  });
  observeNewElements(steps);
}
// Aplicar proceso guardado al cargar
(function(){ const d=loadProceso(); if(localStorage.getItem('alr_proceso')) renderProceso(d); })();

// Aplicar visibilidad cuando el DOM esté listo
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', applySectionVisibility);
} else {
  applySectionVisibility();
}
// También en load por si acaso en móvil
window.addEventListener('load', applySectionVisibility);

// ── SERVICIOS ─────────────────────────────────────────────────────────────────
const _SVG = {
  camara:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="28" height="28"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  dron:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="28" height="28"><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="7" y2="7"/><line x1="17" y1="7" x2="21" y2="3"/><line x1="7" y1="17" x2="3" y2="21"/><line x1="17" y1="17" x2="21" y2="21"/><path d="M5 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M19 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M5 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M19 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/></svg>',
  video:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="28" height="28"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20"/><path d="M2 7h5"/><path d="M2 12h5"/><path d="M2 17h5"/><path d="M17 2v20"/><path d="M17 7h5"/><path d="M17 12h5"/><path d="M17 17h5"/></svg>',
  boda:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="28" height="28"><circle cx="12" cy="12" r="5"/><path d="M12 7V3"/><path d="M7.05 9.95 4.22 7.22"/><path d="M5 12H1"/><path d="M7.05 14.05 4.22 16.78"/><path d="M12 17v4"/><path d="M16.95 14.05l2.83 2.73"/><path d="M19 12h4"/><path d="M16.95 9.95l2.83-2.73"/></svg>',
  casa:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="28" height="28"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  custom:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="28" height="28"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
};

const SERVICIOS_DEFAULT = [
  {icono:_SVG.camara,  nombre:'Fotografía',        desc:'Sesiones de fotografía profesional para bodas, eventos, retratos y producto. Entrega en 48h con edición incluida.',       precio:'150 €'},
  {icono:_SVG.dron,    nombre:'Vídeo con Dron',    desc:'Grabación aérea cinematográfica en 4K. Paisajes, eventos, inmobiliaria y publicidad. Certificación AESA.',              precio:'250 €'},
  {icono:_SVG.video,   nombre:'Vídeo Corporativo', desc:'Producción audiovisual completa para marcas, empresas y redes sociales. Guión, grabación y edición profesional.',       precio:'400 €'},
  {icono:_SVG.boda,    nombre:'Bodas & Eventos',   desc:'Cobertura completa del día con foto y vídeo. Álbum digital, highlights de 3 min y galería privada incluidos.',          precio:'800 €'},
  {icono:_SVG.casa,    nombre:'Inmobiliaria',      desc:'Fotografía y vídeo aéreo para inmuebles. Tour virtual, fotos interiores y exteriores con dron incluido.',              precio:'180 €'},
  {icono:_SVG.custom,  nombre:'Pack Personalizado',desc:'¿Tienes algo en mente que no encaja aquí? Cuéntame tu proyecto y creamos juntos el pack perfecto para ti.',           precio:'Consultar'},
];

function loadServicios(){
  try{ return JSON.parse(localStorage.getItem('alr_servicios')) || SERVICIOS_DEFAULT; }
  catch(e){ return SERVICIOS_DEFAULT; }
}

function renderServicios(data){
  const grid = document.querySelector('.servicios-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const delays = ['','reveal-delay-1','reveal-delay-2'];
  let visibleIdx = 0;
  data.forEach((s) => {
    if(s.visible === false) return; // Ocultar individualmente
    const d = document.createElement('div');
    d.className = `servicio-card reveal ${delays[visibleIdx%3]}`;
    d.innerHTML = `
      <div class="servicio-icono">${esc(s.icono)}</div>
      <h3 class="servicio-nombre">${esc(s.nombre)}</h3>
      <p class="servicio-desc">${esc(s.desc)}</p>
      <div class="servicio-precio"><span class="servicio-desde">Desde</span>${esc(s.precio)}</div>`;
    grid.appendChild(d);
    visibleIdx++;
  });
  setTimeout(() => observeNewElements(document.querySelector('.servicios-grid')), 50);
}

// Aplicar servicios guardados al cargar
(function(){ const d = loadServicios(); if(localStorage.getItem('alr_servicios')) renderServicios(d); })();

// ── TESTIMONIOS ───────────────────────────────────────────────────────────────
const TESTIMONIOS_DEFAULT = [
  {texto:'Andrea captó exactamente lo que queríamos. Las fotos de nuestra boda son simplemente mágicas, cada imagen cuenta una historia.', autor:'Laura & Marcos',           proyecto:'Boda en Segovia · 2024'},
  {texto:'El vídeo con dron de nuestra finca superó todas las expectativas. Profesionalidad y creatividad en cada plano.',                  autor:'Hotel Rural Las Encinas', proyecto:'Vídeo corporativo · 2024'},
  {texto:'Trabajar con Andrea fue una experiencia increíble. Sabe exactamente cómo hacerte sentir cómoda delante de la cámara.',           autor:'Sofía Martínez',          proyecto:'Sesión retrato · 2025'},
];

function loadTestimonios(){
  try{ return JSON.parse(localStorage.getItem('alr_testimonios')) || TESTIMONIOS_DEFAULT; }
  catch(e){ return TESTIMONIOS_DEFAULT; }
}

function renderTestimonios(data){
  const grid = document.querySelector('.testimonios-grid');
  if(!grid) return;
  grid.innerHTML = '';
  data.forEach((t, i) => {
    const delays = ['','reveal-delay-1','reveal-delay-2'];
    const d = document.createElement('div');
    d.className = `testimonio-card reveal ${delays[i%3]}`;
    d.innerHTML = `
      <span class="testimonio-comilla">"</span>
      <p class="testimonio-texto">${esc(t.texto)}</p>
      <p class="testimonio-autor">${esc(t.autor)}</p>
      <span class="testimonio-proyecto">${esc(t.proyecto)}</span>`;
    grid.appendChild(d);
  });
  setTimeout(() => observeNewElements(document.querySelector('.testimonios-grid')), 50);
}

function initTestimoniosCarousel(){
  const d = loadTestimonios();
  if(localStorage.getItem('alr_testimonios')) renderTestimonios(d);
}
// Aplicar testimonios guardados al cargar inicial
initTestimoniosCarousel();

// ── DISPARADOR DEL PANEL DE ADMINISTRACIÓN ───────────────────────────────────
// El código del panel (admin.js) se carga bajo demanda, solo cuando alguien
// intenta acceder de verdad — así los visitantes normales no lo descargan.
const adminSeq = 'andrea';
let adminBuffer = '';

let _adminScriptPromise = null;
function loadAdminModule(){
  if(_adminScriptPromise) return _adminScriptPromise;
  _adminScriptPromise = Promise.all([
    new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/admin.js?v=2026-2';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }),
    new Promise((resolve, reject) => {
      if(window.EXIF){ resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exif-js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }),
    new Promise((resolve, reject) => {
      if(window.tus){ resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }),
  ]);
  return _adminScriptPromise;
}

function openAdmin(){
  document.body.setAttribute('data-admin', 'true');

  const overlay = document.getElementById('admin-overlay');

  overlay.style.display = 'flex';
  overlay.offsetHeight;

  document.getElementById('admin-login').style.display = 'block';
  document.getElementById('admin-panel').style.display = 'none';

  document.getElementById('admin-pass').value = '';
  document.getElementById('admin-error').style.display = 'none';

  document.body.style.overflow = 'hidden';
  if(window.lenis) window.lenis.stop();

  setTimeout(() => {
    document.getElementById('admin-pass').focus();
  }, 150);

  // Precargar el panel en segundo plano mientras la admin escribe la contraseña
  loadAdminModule().catch(() => {});
}
function askAdminPass(){ openAdmin(); }

function closeAdmin() {
  auth.signOut().catch(() => {});
  const overlay = document.getElementById('admin-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => {
    document.body.removeAttribute('data-admin');
    overlay.style.opacity = '';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if(window.lenis) window.lenis.start();
  }, 300);
}

// Placeholder: se sustituye por la versión real en cuanto admin.js termina de cargar.
async function checkPass(){
  const btn = document.querySelector('#admin-login button.admin-btn');
  if(btn) btn.disabled = true;
  try {
    await loadAdminModule();
    // window.checkPass ya es la función real definida por admin.js.
    await window.checkPass();
  } catch(e) {
    console.error('Error cargando el panel de administración:', e);
    document.getElementById('admin-error').style.display = 'block';
  } finally {
    if(btn) btn.disabled = false;
  }
}

document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if(e.key === 'Escape') {
    if(document.getElementById('lightbox')?.classList.contains('open')) closeLightbox();
    else closeAdmin();
    return;
  }

  adminBuffer += e.key.toLowerCase();
  if(adminBuffer.length > adminSeq.length) adminBuffer = adminBuffer.slice(-adminSeq.length);
  if(adminBuffer === adminSeq) {
    adminBuffer = '';
    askAdminPass();
    return;
  }

  if (!'andrea'.includes(e.key.toLowerCase())) {
    setTimeout(() => adminBuffer = '', 2000);
  }
});

// ── ESTADO DE SUBIDA (lo usa admin.js) ────────────────────────────────────────
let pendingFile    = null;
let pendingFileUrl = null;
let pendingExif    = null;
let pendingVideoUrl = null;

// ── CARPETAS (lectura pública + caché compartida con admin.js) ───────────────
function genToken(){
  if(crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function loadFolders(){
  if(_foldersCache) return _foldersCache;
  const snap = await db.collection('folders').orderBy('created').get();
  _foldersCache = [];
  snap.forEach(doc => _foldersCache.push({ id: doc.id, ...doc.data() }));
  return _foldersCache;
}
function invalidateFoldersCache(){ _foldersCache = null; }

let _loadingFolderFilters = false;
async function loadPublicFolderFilters(){
  if(_loadingFolderFilters) return; // Evita llamadas concurrentes que duplican los filtros
  _loadingFolderFilters = true;
  try {
    const filterList = document.getElementById('galleryFilter');
    if(!filterList) return;
    filterList.querySelectorAll('[data-is-folder]').forEach(li => li.remove());
    const folders = await loadFolders();
    folders.filter(f => f.isPublic).forEach(f => {
      const li  = document.createElement('li');
      li.dataset.isFolder = '1';
      const btn = document.createElement('button');
      btn.dataset.filter = `folder:${f.id}`;
      btn.textContent    = f.name;
      btn.addEventListener('click', () => applyFilter(`folder:${f.id}`));
      li.appendChild(btn);
      filterList.appendChild(li);
    });
  } finally {
    _loadingFolderFilters = false;
  }
}

// ── GALERÍA CON LOAD-MORE + SEARCH + FILTROS DE CARPETA ────────────────────────────
let _allGalleryPhotos  = [];
let _galleryPage       = 0;
let _gallerySearch     = '';
const GALLERY_PAGE_SIZE = 15;

function getFilteredPhotos(){
  return _allGalleryPhotos.filter(p => {
    if(activeFilter !== 'all'){
      if(activeFilter.startsWith('folder:')){
        if(p.folderId !== activeFilter.replace('folder:','')) return false;
      } else {
        return false; // Old cat filter ignores unmatched
      }
    }
    if(_gallerySearch){
      const q = _gallerySearch.toLowerCase();
      if(!(p.titulo||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderGalleryPage(){
  const grid = document.getElementById('galleryGrid');
  if(!grid) return;
  const filtered = getFilteredPhotos();
  const total    = filtered.length;
  const showing  = Math.min((_galleryPage + 1) * GALLERY_PAGE_SIZE, total);
  const slice    = filtered.slice(0, showing);

  grid.innerHTML = '';
  if(!slice.length){
    const emptyT = grid.dataset.tEmpty || 'No hay fotos en esta carpeta.';
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;font-size:.75rem;color:#7a7068;font-weight:200;padding:40px 0;">${emptyT}</p>`;

    updateGalleryFooter(0, 0);
    return;
  }

  const lang = document.documentElement.lang || 'es';
  slice.forEach((p, i) => {
    const title = (lang === 'en' && p.titulo_en) ? p.titulo_en : (p.titulo || '');
    const div = document.createElement('div');
    div.className      = 'gallery-item reveal';
    div.dataset.folder = p.folderId || '';
    div.dataset.index  = i;
    div.dataset.titulo = title;

    // Blur-up Placeholder: versión minúscula y borrosa
    if(p.src && p.src.includes('cloudinary.com')){
      const blurSrc = p.src.replace('/upload/', '/upload/e_blur:2000,w_40,f_auto,q_auto:low/');
      div.style.backgroundImage = `url(${blurSrc})`;
    } else if(p.src && p.src.includes('.b-cdn.net')){
      div.style.backgroundImage = `url(${optimizeImageUrl(p.src, 40, 30)})`;
    }

    const optSrc = optimizeImageUrl(p.src, 1000);

    div.innerHTML = `
      <img src="${esc(optSrc)}" alt="${esc(title)}" loading="lazy" class="gl-image" onload="this.classList.add('loaded')" onerror="this.classList.add('error')">
      <div class="gallery-item-overlay"><span class="gallery-item-label">${esc(title)}</span></div>`;

    const img = div.querySelector('img');
    if(img && img.complete) img.classList.add('loaded');

    div.addEventListener('click', () => {
      buildLightboxItems();
      const idx = lightboxItems.indexOf(div);
      if(idx >= 0) openLightbox(idx);
    });
    div.addEventListener('mouseenter', () => setCursorView('Ver'));
    div.addEventListener('mouseleave', () => setCursorView(null));
    grid.appendChild(div);
    if(typeof revealObs !== 'undefined') revealObs.observe(div);
  });

  updateGalleryFooter(showing, total);
  grid.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
}

function updateGalleryFooter(showing, total){
  const footer  = document.getElementById('galleryFooter');
  const counter = document.getElementById('galleryCounter');
  const btn     = document.getElementById('galleryLoadMore');
  if(!footer) return;
  if(!total){ footer.style.display = 'none'; return; }
  footer.style.display = 'flex';
  if(counter) {
    const pattern = counter.dataset.tShowing || (window.t ? window.t('galeria.showing') : '{showing} de {total} fotos');
    counter.textContent = pattern.replace('{showing}', showing).replace('{total}', total);
  }
  if(btn) btn.style.display = showing < total ? 'inline-block' : 'none';
}

function loadMorePhotos(){
  _galleryPage++;
  renderGalleryPage();
}

function onGallerySearch(val){
  _gallerySearch = val.trim().toLowerCase();
  _galleryPage   = 0;
  renderGalleryPage();
}

async function renderPublicGallery(){
  const grid = document.getElementById('galleryGrid');
  if(!grid) return;
  const loadingT = grid.dataset.tLoading || 'Cargando galería…';
  grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;font-size:.72rem;color:#7a7068;font-weight:200;padding:40px 0;">${loadingT}</p>`;

  try {
    const snap = await db.collection('photos').orderBy('created','desc').get();
    _allGalleryPhotos = [];
    snap.forEach(doc => _allGalleryPhotos.push({ id: doc.id, ...doc.data() }));
    _galleryPage = 0;
    await loadPublicFolderFilters();
    renderGalleryPage();
  } catch(e){ console.error('Error galería:', e); }
}

function applyFilter(filter){
  activeFilter = filter;
  document.querySelectorAll('.gallery-filter button').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  _galleryPage = 0;
  if(filter.startsWith('folder:')){
    renderPublicGallery();
  } else {
    renderGalleryPage();
  }
}

// ── VISTA ÁLBUM CLIENTE ──────────────────────────────────────────────────────────────
let _albumPhotos = [];
let _albumFolder = null;

function getClientId() {
  let id = localStorage.getItem('alr_clientId');
  if(!id) {
    id = genToken();
    localStorage.setItem('alr_clientId', id);
  }
  return id;
}

async function toggleFavorite(photoId, btn) {
  if(!photoId) return;
  const clientId = getClientId();
  const isActive = btn.classList.contains('active');

  btn.classList.toggle('active');
  const svg = btn.querySelector('svg');
  if(isActive) {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
  } else {
    svg.setAttribute('fill', '#c87a6a');
    svg.setAttribute('stroke', '#c87a6a');
  }

  try {
    const ref = db.collection('photos').doc(photoId);
    if(isActive) {
      await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(clientId) });
    } else {
      await ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(clientId) });
    }
  } catch(e) {
    console.error('Error toggle fav:', e);
    btn.classList.toggle('active');
    svg.setAttribute('fill', isActive ? '#c87a6a' : 'none');
    svg.setAttribute('stroke', isActive ? '#c87a6a' : 'currentColor');
  }
}

async function checkAlbumMode(){
  const token = new URLSearchParams(location.search).get('album');
  if(!token) return;
  await openAlbumView(token);
}

async function openAlbumView(token){
  const view = document.getElementById('album-view');
  if(!view) return;

  const snap = await db.collection('folders').where('token','==',token).limit(1).get();
  if(snap.empty){
    document.getElementById('album-title-text').textContent = 'Acceso no válido';
    return;
  }
  _albumFolder = { id: snap.docs[0].id, ...snap.docs[0].data() };
  document.getElementById('album-title-text').textContent = _albumFolder.name;
  document.title = _albumFolder.name + ' — Andrea López';

  const dlBtn = document.getElementById('albumDownloadBtn');
  if(dlBtn) dlBtn.style.display = _albumFolder.allowDownload ? 'inline-flex' : 'none';

  try {
    const photosSnap = await db.collection('photos').where('folderId','==',_albumFolder.id).get();
    _albumPhotos = [];
    photosSnap.forEach(doc => _albumPhotos.push({ id: doc.id, ...doc.data() }));
    _albumPhotos.sort((a, b) => (b.created || 0) - (a.created || 0));
  } catch(err) {
    console.error('Error cargando fotos del álbum:', err);
    _albumPhotos = [];
  }

  const grid  = document.getElementById('album-grid');
  const empty = document.getElementById('album-empty');
  grid.innerHTML = '';

  if(!_albumPhotos.length){
    if(empty) empty.style.display = 'block';
    return;
  }
  if(empty) empty.style.display = 'none';

  _albumPhotos.forEach(p => {
    const div = document.createElement('div');
    div.className = 'gallery-item album-item';
    const dlHtml = _albumFolder.allowDownload
      ? `<a href="${esc(p.src.replace('/upload/', '/upload/fl_attachment/'))}" download class="album-photo-dl" onclick="event.stopPropagation()" title="Descargar" style="text-decoration:none; color:#f0ece4; font-size:1.1rem; background:rgba(0,0,0,.5); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">⬇</a>`
      : '';
    const clientId = getClientId();
    const isLiked = Array.isArray(p.likes) && p.likes.includes(clientId);
    const likeHtml = `<button class="album-photo-like ${isLiked ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${p.id}', this)" title="Marcar Favorito" style="background:rgba(0,0,0,.5); border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#f0ece4; backdrop-filter:blur(4px); transition:transform 0.2s;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="${isLiked ? '#c87a6a' : 'currentColor'}" fill="${isLiked ? '#c87a6a' : 'none'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>`;
    const optSrc = optimizeImageUrl(p.src, 800);
    div.innerHTML = `
      <picture>
        <source srcset="${fixPath(optSrc)}" type="image/webp">
        <img src="${fixPath(p.src)}" alt="${esc(p.titulo||'')}" loading="lazy" class="gl-image" onload="this.classList.add('loaded')" onerror="this.classList.add('error')">
      </picture>
      <div class="gallery-item-overlay" style="display:flex; justify-content:space-between; align-items:flex-end;">
        <span class="gallery-item-label">${esc(p.titulo||'')}</span>
        <div style="display:flex; gap:8px;">
          ${likeHtml}
          ${dlHtml}
        </div>
      </div>`;
    grid.appendChild(div);
  });
}

function closeAlbumView(){
  document.documentElement.removeAttribute('data-album-mode');
  history.pushState({}, '', location.pathname);
  document.title = 'Andrea López — Fotografía & Vídeo con Dron';
}

async function downloadAlbumZip(){
  if(!_albumPhotos.length || !_albumFolder) return;
  const progress = document.getElementById('album-zip-progress');
  const fill     = document.getElementById('albumZipFill');
  const text     = document.getElementById('albumZipText');
  const btn      = document.getElementById('albumDownloadBtn');
  if(progress) progress.style.display = 'flex';
  if(btn)      btn.disabled = true;
  try {
    const zip    = new JSZip();
    const folder = zip.folder(_albumFolder.name);
    for(let i = 0; i < _albumPhotos.length; i++){
      const p = _albumPhotos[i];
      if(text) text.textContent = `Descargando ${i+1} de ${_albumPhotos.length}…`;
      if(fill) fill.style.width = `${Math.round(i / _albumPhotos.length * 80)}%`;
      const resp = await fetch(p.src);
      const blob = await resp.blob();
      const ext  = (p.src.split('.').pop().split('?')[0] || 'jpg').toLowerCase();
      const name = (p.titulo || `foto_${i+1}`).replace(/[^à-ža-z0-9 _-]/gi,'_') + '.' + ext;
      folder.file(name, blob);
    }
    if(text) text.textContent = 'Generando ZIP…';
    if(fill) fill.style.width = '90%';
    const content = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:3 } });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${_albumFolder.name}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    if(fill) fill.style.width = '100%';
    if(text) text.textContent = '✓ Descargado';
    setTimeout(() => { if(progress) progress.style.display = 'none'; if(fill) fill.style.width = '0%'; if(btn) btn.disabled = false; }, 2200);
  } catch(e){
    if(text) text.textContent = 'Error al generar ZIP';
    if(btn)  btn.disabled = false;
    console.error(e);
  }
}

// Inicializar modo álbum si procede
checkAlbumMode();

// Cargar filtros públicos de carpetas al inicio
loadPublicFolderFilters();

// ── SERVICE WORKER ─────────────────────────────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        document.addEventListener('visibilitychange', () => {
          if(document.visibilityState === 'visible') reg.update();
        });
      })
      .catch(e => console.warn('SW no registrado:', e));
  });
}

// ── CONTADOR DE VISITAS ────────────────────────────────────────────────────────
try {
  const v = parseInt(localStorage.getItem('alr_visitas') || '0') + 1;
  localStorage.setItem('alr_visitas', v);
} catch(e){}

// Añadir proceso, servicios y testimonios al observer de scroll
document.querySelectorAll('#servicios, #testimonios, #proceso').forEach(sec => {
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  if(isSectionHidden(stored, sec.id)) return;
  sec.style.opacity    = '0';
  sec.style.transform  = 'translateY(40px) scale(0.99)';
  sec.style.transition = 'opacity .9s cubic-bezier(.25,.46,.45,.94), transform .9s cubic-bezier(.25,.46,.45,.94)';
  if(typeof sectionObs !== 'undefined') sectionObs.observe(sec);
});

// ── FIX REVEAL EN ELEMENTOS DINÁMICOS ────────────────────────────────────────
function observeNewElements(container){
  if(!container) return;
  container.querySelectorAll('.reveal').forEach(el => {
    const rect = el.getBoundingClientRect();
    if(rect.top < window.innerHeight * 0.95) el.classList.add('visible');
    else revealObs.observe(el);
  });
}

document.querySelectorAll('#proceso .proceso-step').forEach(el => revealObs.observe(el));

// Siempre empezar con filtro "all" al cargar
localStorage.removeItem('alr_filter');
applyFilter('all');

// ── VALIDACIÓN FORMULARIO EN TIEMPO REAL ─────────────────────────────────────
function initFormValidation(){
  const form = document.querySelector('.contacto-form');
  if(!form) return;
  function showError(inp, msg){
    inp.classList.add('error'); inp.classList.remove('valid');
    let e = inp.parentElement.querySelector('.form-error-msg');
    if(!e){ e = document.createElement('span'); e.className='form-error-msg'; inp.parentElement.appendChild(e); }
    e.textContent = msg; e.classList.add('show');
  }
  function showValid(inp){ inp.classList.remove('error'); inp.classList.add('valid'); const e=inp.parentElement.querySelector('.form-error-msg'); if(e) e.classList.remove('show'); }
  function clear(inp){ inp.classList.remove('error','valid'); const e=inp.parentElement.querySelector('.form-error-msg'); if(e) e.classList.remove('show'); }
  form.querySelectorAll('input, textarea').forEach(inp => {
    inp.addEventListener('blur', () => {
      if(inp.required && !inp.value.trim()){ showError(inp,'Campo requerido'); return; }
      if(inp.type==='email' && inp.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value)){ showError(inp,'Email no válido'); return; }
      if(inp.value.trim()) showValid(inp);
    });
    inp.addEventListener('input', () => { if(inp.value.trim()) clear(inp); });
  });
}

// ── LAZY LOADING IMÁGENES ─────────────────────────────────────────────────────
function initLazyLoading(){
  const lazyObs = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const img = entry.target;
      const src = img.dataset.src;
      if(src){ img.src = src; img.removeAttribute('data-src'); img.addEventListener('load', () => img.classList.add('loaded'),{once:true}); }
      obs.unobserve(img);
    });
  }, {rootMargin:'200px'});
  document.querySelectorAll('.gallery-item img').forEach(img => {
    if(img.complete && img.naturalWidth){ img.classList.add('loaded'); return; }
    const src = img.getAttribute('src');
    if(src && !img.dataset.src){ img.dataset.src=src; img.removeAttribute('src'); lazyObs.observe(img); }
  });
}

// ── VIDEO AUTO-PLAY OBSERVER ────────────────────────────────────────────────
function initVideoObserver(){
  const videos = document.querySelectorAll('video.video-auto-preview');
  if(!videos.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const v = entry.target;
      if(entry.isIntersecting){
        v.play().catch(()=>{});
        v.style.opacity = '1';
      } else {
        v.pause();
        v.style.opacity = '0.8';
      }
    });
  }, { threshold: 0.5 });

  videos.forEach(v => obs.observe(v));
}

// ── SONIDO AMBIENTE MEJORADO CON REVERB ──────────────────────────────────────
function initAmbient(){
  try{
    const ctx = ambientCtx;
    const master = ctx.createGain();
    master.gain.value = 0;
    ambientGain = master;

    const convolver = ctx.createConvolver();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const d = buf.getChannelData(ch);
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.8);
    }
    convolver.buffer = buf;

    const dry = ctx.createGain(); dry.gain.value = 0.35;
    const wet = ctx.createGain(); wet.gain.value = 0.65;
    convolver.connect(wet);
    dry.connect(master); wet.connect(master);
    master.connect(ctx.destination);

    [55, 82.4, 110, 138.6, 165, 220, 275].forEach((f,i) => {
      const osc=ctx.createOscillator(), g=ctx.createGain();
      const lfo=ctx.createOscillator(), lg=ctx.createGain();
      osc.type = i<4?'sine':'triangle';
      osc.frequency.value = f + i*0.09;
      g.gain.value = Math.max(0.001, 0.068 - i*0.009);
      lfo.type='sine'; lfo.frequency.value = 0.05+i*0.03; lg.gain.value=0.35;
      lfo.connect(lg); lg.connect(osc.frequency);
      osc.connect(g); g.connect(dry); g.connect(convolver);
      osc.start(); lfo.start();
    });
  } catch(e){ console.warn('ambient error',e); }
}

// ── MARCA DE AGUA ─────────────────────────────────────────────────────────────
function applyWatermark(){
  const d = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const marca = d.watermark || d.marcaAgua || '© Andrea López';
  const wm = document.getElementById('lightboxWatermark');
  if(wm) wm.textContent = marca;
}
applyWatermark();

// ── SONIDO OBTURADOR ─────────────────────────────────────────────────────────
let _shutterBuf = null;

function playShutter(){
  try{
    const ctx = getAudioCtx();
    if(!_shutterBuf){
      fetch('/sonidos/shutter.wav').then(r=>r.arrayBuffer()).then(ab=>ctx.decodeAudioData(ab,buf=>{_shutterBuf=buf;_doShutter(ctx,buf)}));
    } else {
      _doShutter(ctx, _shutterBuf);
    }
  } catch(e){}
}

function _doShutter(ctx, buf){
  const src = ctx.createBufferSource();
  const g   = ctx.createGain(); g.gain.value = 0.75;
  src.buffer = buf;
  src.connect(g); g.connect(ctx.destination);
  src.start();
  // Flash blanco sutil
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.1;z-index:99990;pointer-events:none;';
  document.body.appendChild(flash);
  requestAnimationFrame(() => {
    flash.style.transition = 'opacity .15s';
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 200);
  });
}

function playFocusBeep(){
  try{
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 2800;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } catch(e){}
}

// ── FOTOS POR HORA DEL DÍA ────────────────────────────────────────────────────
(function(){ try {
  const h = new Date().getHours();
  const lang = document.documentElement.lang || 'es';
  const hourMap = (lang === 'en') ? [
    [6,  10, 'drone',       'Morning light · Aerial clarity'],
    [10, 15, 'photography', 'Midday light · Detail and precision'],
    [15, 20, 'portrait',    'Golden hour · The best light of the day'],
    [20, 24, 'drone',       'Artificial light · The city at night'],
    [0,  6,  'drone',       'Midnight · Silence and long exposure'],
  ] : [
    [6,  10, 'dron',       'Luz de mañana · Claridad aérea'],
    [10, 15, 'fotografia', 'Luz de mediodía · Detalle y precisión'],
    [15, 20, 'retrato',    'Hora dorada · La mejor luz del día'],
    [20, 24, 'dron',       'Luz artificial · La ciudad de noche'],
    [0,  6,  'dron',       'Madrugada · Silencio y larga exposición'],
  ];

  let activeCat = null, label = null;
  for(const [from, to, cat, lbl] of hourMap){
    if(h >= from && h < to){ activeCat = cat; label = lbl; break; }
  }

  if(!activeCat) return;

  const hero = document.querySelector('.hero-right');
  if(hero){
    const tag = document.createElement('p');
    tag.style.cssText = 'font-size:.52rem;letter-spacing:.28em;text-transform:uppercase;color:rgba(200,184,154,.4);font-weight:200;margin-top:16px;opacity:0;animation:fadeUp .6s 1.4s forwards;';
    tag.textContent = label;
    hero.appendChild(tag);
  }
  } catch(e){ console.warn('hour filter error:', e); }
})();

// ── FRASE INSPIRACIONAL BAJO LA GALERÍA ────────────────────────────────────
(function(){ try {
  const lang = document.documentElement.lang || 'es';
  const frases = (lang === 'en') ? [
    '"Every frame is a decision."',
    '"The light doesn\'t wait — the photographer does."',
    '"Seeing is easy. Looking is an art."',
    '"The moment before the moment."',
    '"The best photo is the one you haven\'t taken yet."',
  ] : [
    '"Cada encuadre es una decisión."',
    '"La luz no espera — el fotógrafo sí."',
    '"Ver es fácil. Mirar es un arte."',
    '"El instante antes del instante."',
    '"La mejor foto es la que aún no has hecho."',
  ];
  const frase = frases[new Date().getDate() % frases.length];
  const galeria = document.getElementById('galeria');
  if(!galeria) return;

  const el = document.createElement('div');
  el.style.cssText = [
    'text-align:center',
    'padding:48px 24px 16px',
    'font-family:"Cormorant Garamond",serif',
    'font-size:1.15rem',
    'font-style:italic',
    'font-weight:300',
    'color:rgba(200,184,154,.4)',
    'letter-spacing:.06em',
    'line-height:1.8',
    'opacity:0',
    'transform:translateY(12px)',
    'transition:opacity 1.4s, transform 1.4s',
  ].join(';');
  el.textContent = frase;
  galeria.appendChild(el);

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, {threshold:0.2});
  obs.observe(el);
  } catch(e){ console.warn('frase error:', e); }
})();

// ── DATO TÉCNICO f/ EN HERO ──────────────────────────────────────────────────
(function(){ try {
  const datos = [
    { exp:'f/1.4', vel:'1/500s', mm:'85mm', iso:'ISO 200' },
    { exp:'f/2.8', vel:'1/320s', mm:'50mm', iso:'ISO 400' },
    { exp:'f/8',   vel:'1/60s',  mm:'24mm', iso:'ISO 100' },
    { exp:'f/1.8', vel:'1/1000s',mm:'35mm', iso:'ISO 640' },
    { exp:'f/4',   vel:'1/250s', mm:'70mm', iso:'ISO 800' },
  ];
  const lang = document.documentElement.lang || 'es';
  const d = datos[new Date().getDate() % datos.length];

  const heroScroll = document.querySelector('.hero-scroll');
  if(!heroScroll) return;

  const tag = document.createElement('div');
  tag.style.cssText = [
    'position:absolute',
    'bottom:40px',
    'left:64px',
    'font-family:"Outfit",sans-serif',
    'font-size:.48rem',
    'font-weight:200',
    'letter-spacing:.22em',
    'text-transform:uppercase',
    'color:rgba(200,184,154,.35)',
    'opacity:0',
    'animation:fadeIn 1s 2s forwards',
    'display:flex',
    'gap:16px',
    'align-items:center',
    'z-index: 5',
  ].join(';');
  tag.innerHTML = `
    <span style="color:rgba(200,184,154,.5)">${d.exp}</span>
    <span style="width:1px;height:10px;background:rgba(200,184,154,.2);display:inline-block;"></span>
    <span>${d.vel}</span>
    <span style="width:1px;height:10px;background:rgba(200,184,154,.2);display:inline-block;"></span>
    <span>${d.mm}</span>
    <span style="width:1px;height:10px;background:rgba(200,184,154,.2);display:inline-block;"></span>
    <span>${d.iso}</span>
  `;
  tag.title = (lang === 'en') ? 'Daily session parameters — changes every 24h' : 'Parámetros de la sesión del día — cambia cada 24h';
  document.querySelector('#hero') && document.querySelector('#hero').appendChild(tag);
  } catch(e){ console.warn('dato f error:', e); }
})();

// ── CURSOR CON ESTADOS CONTEXTUALES ──────────────────────────────────────────
(function(){
  let focusTimer = null;
  let isOverImage = false;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      isOverImage = true;
      focusTimer = setTimeout(() => {
        if(isOverImage) playFocusBeep();
      }, 1200);
    });
    item.addEventListener('mouseleave', () => {
      isOverImage = false;
      clearTimeout(focusTimer);
    });
  });
})();
function initGalleryItemMove(){
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('mousemove', e => {
      const rect = item.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      const img = item.querySelector('img');
      if(img) img.style.transform = `scale(1.08) translate(${x * 12}px, ${y * 12}px)`;
    });
    item.addEventListener('mouseleave', e => {
      const img = item.querySelector('img');
      if(img) img.style.transform = '';
    });
  });
}

function updateExifDisplay(item){
  const panel = document.getElementById('lightboxExifPanel');
  if(!panel) return;
  const p = _allGalleryPhotos.find(ph => ph.id === item.id) || {};
  const exif = item.dataset.exif ? JSON.parse(item.dataset.exif) : (p.exif || null);

  if(!exif || (!exif.iso && !exif.camara)){
    panel.innerHTML = '<p style="font-size:.5rem;opacity:.5;text-align:center;">Sin datos técnicos</p>';
    return;
  }

  panel.innerHTML = `
    <div class="exif-item"><span class="exif-label">Cámara</span><span class="exif-val">${esc(exif.camara || '-')}</span></div>
    <div class="exif-item"><span class="exif-label">Lente</span><span class="exif-val">${esc(exif.lente || '-')}</span></div>
    <div class="exif-item"><span class="exif-label">Apertura</span><span class="exif-val">${esc(exif.apertura || '-')}</span></div>
    <div class="exif-item"><span class="exif-label">Velocidad</span><span class="exif-val">${esc(exif.velocidad || '-')}</span></div>
    <div class="exif-item"><span class="exif-label">ISO</span><span class="exif-val">${esc(exif.iso || '-')}</span></div>
  `;
}

function toggleExifPanel(){
  const p = document.getElementById('lightboxExifPanel');
  if(p) p.classList.toggle('show');
}

// ── FOOTER WHATSAPP E INSTAGRAM ───────────────────────────────────────────────
(function(){
  const d = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const fw = document.getElementById('footer-whatsapp');
  const fwh = document.getElementById('footer-whatsapp-handle');

  if (fw && d.whatsapp) {
    const cleanNumber = d.whatsapp.replace(/\D/g,'');
    fw.href = `https://wa.me/${cleanNumber}`;

  let formattedNumber = d.whatsapp;
  if (cleanNumber.length >= 9) {
    const country = cleanNumber.slice(0, cleanNumber.length - 9);
    const part1 = cleanNumber.slice(-9, -6);
    const part2 = cleanNumber.slice(-6, -3);
    const part3 = cleanNumber.slice(-3);
    formattedNumber = `+${country} ${part1} ${part2} ${part3}`;
  }

  if (fwh) fwh.textContent = formattedNumber;
}
  const fi = document.getElementById('footer-instagram');
  const fih = document.getElementById('footer-instagram-handle');
  if(fi && d.instagram){ fi.href = `https://instagram.com/${d.instagram}`; }
  if(fih && d.instagram){ fih.textContent = `${d.instagram}`; }
})();

// ── MODO OSCURO POR DEFECTO DEL SISTEMA ──────────────────────────────────────
(function(){
  if(!localStorage.getItem('alr_theme')){
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(prefersDark){
      document.documentElement.setAttribute('data-theme','dark');
      localStorage.setItem('alr_theme','dark');
    }
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if(!localStorage.getItem('alr_theme_manual')){
      const t = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
    }
  });
})();
document.getElementById('themeBtn').addEventListener('click', () => {
  localStorage.setItem('alr_theme_manual','1');
}, {once: true});

// ── MARCA DE AGUA CONFIGURABLE ────────────────────────────────────────────────
(function(){
  const stored = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const marca = stored.marcaAgua || '© Andrea López';
  const wm = document.getElementById('lightboxWatermark');
  if(wm) wm.textContent = marca;
})();

// ── WHATSAPP POPUP ────────────────────────────────────────────────────────
function closeWaPopup(){
  const popup = document.getElementById('whatsappPopup');
  if(popup) popup.classList.remove('show');
  sessionStorage.setItem('wa_popup_shown', '1');
}

// ── TRANSICIÓN SECCIONES MÁS PRONUNCIADA ─────────────────────────────────────
const sectionObsStrong = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
    if(isSectionHidden(stored, e.target.id)) return;
    if(e.isIntersecting){
      e.target.classList.remove('section-reveal-init');
      e.target.classList.add('section-reveal-done');
    }
  });
}, { threshold: 0.06 });

document.querySelectorAll('#sobre, #galeria, #videos, #servicios, #proceso, #testimonios, #contacto').forEach(sec => {
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  if(isSectionHidden(stored, sec.id)) return;
  sec.classList.add('section-reveal-init');
  sec.style.transition = 'opacity 1.1s cubic-bezier(.25,.46,.45,.94), transform 1.1s cubic-bezier(.25,.46,.45,.94)';
  sectionObsStrong.observe(sec);
});

// ── ANIMACIÓN ESTADÍSTICAS ────────────────────────────────────────────────────
function animateNumber(el, target, duration){
  const start = Date.now();
  const initial = parseInt(el.textContent) || 0;
  function tick(){
    const elapsed = Date.now() - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(initial + (target - initial) * eased);
    if(t < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

// ── SLIDESHOW ─────────────────────────────────────────────────────────────────
let slideshowActive = false;
let slideshowTimer  = null;
const SLIDESHOW_INTERVAL = 4500;

function startSlideshow(){
  slideshowActive = true;
  const btn  = document.getElementById('slideshowBtn');
  const prog = document.getElementById('slideshowProgress');
  if(btn){ btn.textContent = '⏸ Pausar'; btn.classList.add('playing'); }
  function runProgress(){
    if(!slideshowActive) return;
    if(prog){ prog.style.transition = 'none'; prog.style.width = '0%'; }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if(prog){ prog.style.transition = `width ${SLIDESHOW_INTERVAL}ms linear`; prog.style.width = '100%'; }
      });
    });
    slideshowTimer = setTimeout(() => {
      if(!slideshowActive) return;
      lightboxNext();
      runProgress();
    }, SLIDESHOW_INTERVAL);
  }
  runProgress();
}

function stopSlideshow(){
  slideshowActive = false;
  clearTimeout(slideshowTimer);
  const btn  = document.getElementById('slideshowBtn');
  const prog = document.getElementById('slideshowProgress');
  if(btn){ btn.textContent = '▶ Slideshow'; btn.classList.remove('playing'); }
  if(prog){ prog.style.transition = 'none'; prog.style.width = '0%'; }
}

// ── GUARDAR TODA LA CONFIG EN FIREBASE ───────────────────────────────────────
async function saveConfigToFirebase(key, value){
  try {
    await CONFIG_DOC.set({ [key]: value }, { merge: true });
    console.log('Firebase sync:', key);
  } catch(e){
    console.warn('Firebase sync error:', e);
  }
}

// ── CARGAR TODA LA CONFIG DESDE FIREBASE AL ARRANCAR ─────────────────────────
async function loadConfigFromFirebase(){
  try {
    const doc = await CONFIG_DOC.get();
    if(!doc.exists) return;
    const data = doc.data();

    if(data.textos){
      localStorage.setItem('alr_textos', JSON.stringify(data.textos));
      applyTextos(data.textos);
    }
    if(data.contacto){
      localStorage.setItem('alr_contacto', JSON.stringify(data.contacto));
      applyContacto(data.contacto);
      applyWatermark();
      const waBtn = document.getElementById('whatsappBtn');
      if(waBtn && data.contacto.whatsapp)
        waBtn.href = `https://wa.me/${data.contacto.whatsapp.replace(/\D/g,'')}?text=Hola%20Andrea%2C%20me%20gustar%C3%ADa%20hablar%20sobre%20un%20proyecto`;
      const fw = document.getElementById('footer-whatsapp');
      if(fw && data.contacto.whatsapp)
        fw.href = `https://wa.me/${data.contacto.whatsapp.replace(/\D/g,'')}`;
    }
    if(data.sections){
      localStorage.setItem('alr_sections', JSON.stringify(data.sections));
      refreshSectionsCSS();
      applySectionVisibility();
    }
    if(data.servicios){
      localStorage.setItem('alr_servicios', JSON.stringify(data.servicios));
      renderServicios(data.servicios);
    }
    if(data.testimonios){
      localStorage.setItem('alr_testimonios', JSON.stringify(data.testimonios));
      renderTestimonios(data.testimonios);
    }
    if(data.proceso){
      localStorage.setItem('alr_proceso', JSON.stringify(data.proceso));
      renderProceso(data.proceso);
    }
    if(data.configExtra){
      localStorage.setItem('alr_config_extra', JSON.stringify(data.configExtra));
    }
    console.log('Config cargada desde Firebase');
  } catch(e){
    console.warn('Error cargando config Firebase:', e);
  }
}

// ── ESCUCHAR CAMBIOS EN TIEMPO REAL (otros dispositivos) ──────────────────────
CONFIG_DOC.onSnapshot(doc => {
  if(!doc.exists) return;
  const data = doc.data();

  if(data.textos){
    localStorage.setItem('alr_textos', JSON.stringify(data.textos));
    applyTextos(data.textos);
  }
  if(data.contacto){
    localStorage.setItem('alr_contacto', JSON.stringify(data.contacto));
    applyContacto(data.contacto);
    applyWatermark();
  }
  if(data.sections){
    localStorage.setItem('alr_sections', JSON.stringify(data.sections));
    refreshSectionsCSS();
    applySectionVisibility();
  }
  if(data.servicios){
    localStorage.setItem('alr_servicios', JSON.stringify(data.servicios));
    renderServicios(data.servicios);
  }
  if(data.testimonios){
    localStorage.setItem('alr_testimonios', JSON.stringify(data.testimonios));
    renderTestimonios(data.testimonios);
  }
  if(data.proceso){
    localStorage.setItem('alr_proceso', JSON.stringify(data.proceso));
    renderProceso(data.proceso);
  }
  if(data.configExtra){
    localStorage.setItem('alr_config_extra', JSON.stringify(data.configExtra));
  }
});

// ── ARRANCAR: esperar Firebase + barra antes de mostrar "Entrar" ──────────────
let _firebaseReady = false;
let _barReady = false;

function _checkReadyToEnter(){
  if(_firebaseReady && _barReady){
    const btn = document.getElementById('loaderEnterBtn');
    if(btn){
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.animation = 'fadeUp .5s forwards';
    }
  }
}

// Firebase listo cuando responde la config
loadConfigFromFirebase().then(() => {
  _firebaseReady = true;
  _checkReadyToEnter();
}).catch(() => {
  _firebaseReady = true; // si falla Firebase, no bloquear al usuario
  _checkReadyToEnter();
});

// Barra lista cuando termina la animación (1.2s delay + 2.2s duración = 3.4s)
setTimeout(() => {
  _barReady = true;
  _checkReadyToEnter();
}, 3600);
