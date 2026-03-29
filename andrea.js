/**
 * Andrea López — Portfolio
 * andrea.js — Script principal
 *
 * Módulos:
 *  01. Inicialización (scroll, loader, partículas)
 *  02. Cursor personalizado y estela dorada
 *  03. Tema claro/oscuro
 *  04. Navegación (hamburguesa, navbar scroll, scroll suave)
 *  05. Galería (filtros, masonry, lazy loading)
 *  06. Carrusel de fotos (lightbox Netflix)
 *  07. Carrusel de vídeos
 *  08. Sonido (intro, ambiente con reverb)
 *  09. Cookie banner y privacidad
 *  10. Formulario con EmailJS
 *  11. Cloudinary (upload de fotos)
 *  12. Panel de administración
 *      12a. Pestañas y submenús
 *      12b. Control de secciones
 *      12c. Galería admin (drag & drop)
 *      12d. Vídeos admin
 *      12e. Servicios
 *      12f. Testimonios
 *      12g. Proceso
 *      12h. Textos
 *      12i. Contacto y configuración
 *  13. Mejoras de UX (slideshow, WhatsApp popup, reveal)
 *  14. SEO y analytics
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
// IMPORTANTE: habilita "Inicio de sesión anónimo" en Firebase Console
// Authentication → Sign-in method → Anónimo → Activar

// ── FIREBASE CONFIG SYNC ──────────────────────────────────────────────────────
async function saveConfigToFirebase(key, value){
  try{
    await db.collection('config').doc('site').set({ [key]: value }, { merge: true });
  } catch(e){ console.warn('Error guardando config en Firebase:', e); }
}

async function loadConfigFromFirebase(){
  try{
    const doc = await db.collection('config').doc('site').get();
    if(!doc.exists) return;
    const d = doc.data();
    if(d.textos)     { localStorage.setItem('alr_textos',     JSON.stringify(d.textos));     applyTextos(Object.assign({}, TEXTOS_DEFAULT, d.textos)); }
    if(d.contacto)   { localStorage.setItem('alr_contacto',   JSON.stringify(d.contacto));   applyContacto(d.contacto); applyWatermark(); }
    if(d.sections)   { localStorage.setItem('alr_sections',   JSON.stringify(d.sections));   refreshSectionsCSS(); updateNavLinks(d.sections); }
    if(d.hero)       { localStorage.setItem('alr_hero',       JSON.stringify(d.hero));       applyHeroMedia(d.hero); }
    if(d.proceso)    { localStorage.setItem('alr_proceso',    JSON.stringify(d.proceso));    renderProceso(d.proceso); }
    if(d.servicios)  { localStorage.setItem('alr_servicios',  JSON.stringify(d.servicios));  renderServicios(d.servicios); }
    if(d.testimonios){ localStorage.setItem('alr_testimonios',JSON.stringify(d.testimonios));renderTestimonios(d.testimonios); }
    if(d.multimedia) { localStorage.setItem('alr_multimedia', JSON.stringify(d.multimedia)); applyMultimedia(); }
  } catch(e){ console.warn('Error cargando config desde Firebase:', e); }
}

// ── UTILIDAD: escapar HTML para prevenir XSS ──────────────────────────────────
function esc(s){
  if(!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── SHA-256 (Web Crypto API) ──────────────────────────────────────────────────
async function sha256(text){
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── SWITCH CONFIG (sub-paneles dentro de tabs) ────────────────────────────────
function switchConfig(id, btn){
  const el = document.getElementById(id);
  if(!el) return;
  const parent = el.parentElement;
  Array.from(parent.children).forEach(child => {
    if(child !== el && child.id) child.style.display = 'none';
  });
  el.style.display = '';
  const sidebar = btn.closest('div');
  if(sidebar) sidebar.querySelectorAll('.sec-menu-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if(id === 'cfg-textos')        loadTextosForm();
  if(id === 'cfg-contacto')      loadContactoForm();
  if(id === 'cfg-avanzado')      loadAvanzadoForm();
  if(id === 'tool-titulos')      loadMultimediaForm();
  if(id === 'tool-galeria')      { renderAdminGallery(); setTimeout(initDragDrop, 50); }
  if(id === 'tool-videos-admin') loadVideoAdmin();
  if(id === 'tool-carpetas')     loadFoldersAdmin();
}

// ── MODAL PERSONALIZADO
function showModal({ icon='⚠', title, msg, btns }){
  const m = document.getElementById('custom-modal');
  document.getElementById('modal-icon').textContent  = icon;
  document.getElementById('modal-title').textContent = title || '';
  document.getElementById('modal-msg').textContent   = msg   || '';
  const btnsEl = document.getElementById('modal-btns');
  btnsEl.innerHTML = '';
  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'custom-modal-btn ' + (b.cls || '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => { closeModal(); b.action && b.action(); });
    btnsEl.appendChild(btn);
  });
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('open'));
}
function closeModal(){
  const m = document.getElementById('custom-modal');
  m.classList.remove('open');
  setTimeout(() => m.style.display = 'none', 260);
}
// Cerrar con clic en fondo
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('custom-modal')?.addEventListener('click', e => {
    if(e.target.id === 'custom-modal') closeModal();
  });
});

// Reemplaza confirm() nativo
function showConfirm(msg, onOk, { title='¿Estás segura?', icon='🗑', okLabel='Eliminar', okCls='danger' } = {}){
  showModal({ icon, title, msg, btns:[
    { label:'Cancelar', cls:'' },
    { label:okLabel, cls:okCls, action:onOk },
  ]});
}

// Reemplaza alert() nativo
function showAlert(msg, { title='Aviso', icon='ℹ' } = {}){
  showModal({ icon, title, msg, btns:[
    { label:'Entendido', cls:'primary' },
  ]});
}

// ── LOADER ──────────────────────────────────────────────────────────────────
// Partículas de polvo en el loader
(function initLoaderParticles(){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _initLoader);
  } else {
    _initLoader();
  }

  function _initLoader(){
    const canvas = document.getElementById('loaderCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize(){
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({length: 120}, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.5 + 0.3,
      vx:    (Math.random() - .5) * .3,
      vy:    -(Math.random() * .4 + .1),
      alpha: Math.random() * .45 + .08,
    }));

    let running = true;
    function draw(){
      if(!running) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,184,154,${p.alpha})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if(p.y < -5)  { p.y = H + 5; p.x = Math.random() * W; }
        if(p.x < -5)    p.x = W + 5;
        if(p.x > W + 5) p.x = -5;
      });
      requestAnimationFrame(draw);
    }
    draw();
    window._stopLoaderParticles = () => { running = false; };

    // Contador de porcentaje
    const pct = document.getElementById('loaderPct');
    if(pct){
      const start = Date.now();
      const duration = 2200, delay = 1200;
      let animationFrame;
      function tickPct(){
        const elapsed = Date.now() - start - delay;
        if(elapsed < 0){ 
          animationFrame = requestAnimationFrame(tickPct); 
          return; 
        }
        const t = Math.min(elapsed / duration, 1);
        pct.textContent = Math.floor((1 - Math.pow(1-t,3)) * 100) + '%';
        if(t < 1) {
          animationFrame = requestAnimationFrame(tickPct);
        } else {
          pct.textContent = '100%';
          // ✅ ACTIVAR BOTÓN cuando llega al 100%
          activateEnterBtn();
        }
      }
      requestAnimationFrame(tickPct);
    }

    // Botón Entrar - CORREGIDO
    const enterBtn = document.getElementById('loaderEnterBtn');
    if(enterBtn){
      // Ocultar inicialmente (CSS ya lo hace, pero por seguridad)
      enterBtn.style.opacity = '0';
      enterBtn.style.pointerEvents = 'none';
      
      // Event listener UNA SOLA VEZ
      enterBtn.addEventListener('click', () => {
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
            if(soundBtn) soundBtn.style.opacity = '1';
            if(ambientGain){
              ambientGain.gain.cancelScheduledValues(actx.currentTime);
              ambientGain.gain.setValueAtTime(0, actx.currentTime);
              ambientGain.gain.linearRampToValueAtTime(0.4, actx.currentTime + 3);
            }
          }, 800);
        } catch(e){ 
          console.warn('audio error', e); 
        }
      });
    }

    // ✅ FUNCIÓN para activar botón cuando esté listo
    window.activateEnterBtn = function(){
      if(enterBtn){
        enterBtn.style.opacity = '1';
        enterBtn.style.pointerEvents = 'auto';
        // Opcional: añadir clase para efectos CSS
        enterBtn.classList.add('ready');
      }
    };
  }
})();

function hideLoader(){
  const l = document.getElementById('loader');
  if(l){ 
    l.classList.add('hidden'); 
    setTimeout(() => l.remove(), 1100); 
  }
  if(window._stopLoaderParticles) window._stopLoaderParticles();
}

// Timeout de emergencia
setTimeout(hideLoader, 8000);

// Fallback silencioso
Promise.all([
  document.fonts.load('300 1rem "Cormorant Garamond"'),
  document.fonts.load('200 1rem "Outfit"'),
  new Promise(r => window.addEventListener('load', r))
]).catch(() => setTimeout(hideLoader, 500));

// ── TEMA CLARO / OSCURO
const themeBtn = document.getElementById('themeBtn');
const savedTheme = localStorage.getItem('alr_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.addEventListener('click', () => {
  const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('alr_theme', t);
});

// ── CURSOR ───────────────────────────────────────────────────────────────────
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursorRing');
const label  = document.getElementById('cursorLabel');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

// ── ESTELA DORADA ─────────────────────────────────────────────────────────────
const trailCanvas = document.getElementById('trail-canvas');
const tc = trailCanvas.getContext('2d');
const trail = [];
const MAX_TRAIL = 28;
let isDark = false;

function resizeCanvas(){
  trailCanvas.width  = window.innerWidth;
  trailCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

document.addEventListener('mousemove', e => {
  trail.push({ x: e.clientX, y: e.clientY, life: 1 });
  if(trail.length > MAX_TRAIL) trail.shift();
});

function drawTrail(){
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
  // Fade gradual
  for(let i = 0; i < trail.length; i++) trail[i].life -= 0.02;
  requestAnimationFrame(drawTrail);
}
drawTrail();

(function anim(){
  rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
  ring.style.left   = rx + 'px'; ring.style.top   = ry + 'px';
  label.style.left  = rx + 'px'; label.style.top  = ry + 'px';
  requestAnimationFrame(anim);
})();

function setCursorHover(on){ cursor.classList.toggle('hover', on); ring.classList.toggle('hover', on); }
function setCursorView(text){
  if(text){ cursor.classList.add('view'); ring.classList.add('view'); label.textContent = text; label.classList.add('show'); }
  else    { cursor.classList.remove('view'); ring.classList.remove('view'); label.classList.remove('show'); }
}

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => setCursorHover(true));
  el.addEventListener('mouseleave', () => setCursorHover(false));
});
document.querySelectorAll('.gallery-item').forEach(el => {
  el.addEventListener('mouseenter', () => setCursorView('Ver'));
  el.addEventListener('mouseleave', () => setCursorView(null));
});
document.querySelectorAll('.video-card').forEach(el => {
  el.addEventListener('mouseenter', () => setCursorView('Play'));
  el.addEventListener('mouseleave', () => setCursorView(null));
});
// Secciones con fondo oscuro: cursor siempre blanco
const darkSections = document.querySelectorAll('#hero, #galeria, #contacto, #loader');
darkSections.forEach(s => {
  s.addEventListener('mouseenter', () => { cursor.classList.add('on-dark'); ring.classList.add('on-dark'); });
  s.addEventListener('mouseleave', () => { cursor.classList.remove('on-dark'); ring.classList.remove('on-dark'); });
});
// Hero siempre oscuro al cargar (empieza ahí)
cursor.classList.add('on-dark'); ring.classList.add('on-dark');

// ── HAMBURGUESA MÓVIL ────────────────────────────────────────────────────────
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});
document.querySelectorAll('.mobile-link').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

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
// Cada sección aparece con un ligero zoom-out al entrar en viewport
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    // Solo revelar si la sección está visible (no oculta por admin)
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

// Links de nav con scroll suave y offset para la navbar
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if(id === '#') return;
    const target = document.querySelector(id);
    if(!target) return;
    e.preventDefault();
    const offset = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  });
});

// ── MULTIMEDIA — TÍTULOS Y DESCRIPCIONES ─────────────────────────────────────
function filtrarMultimedia(q){
  const term = q.toLowerCase().trim();
  document.querySelectorAll('#admin-fotos-list > div, #admin-videos-list > div').forEach(row => {
    // Solo busca en los inputs de título y descripción, no en el nombre del archivo
    const titulo = row.querySelector('.foto-titulo, .vid-titulo')?.value.toLowerCase() || '';
    const desc   = row.querySelector('.foto-desc,  .vid-desc')?.value.toLowerCase()   || '';
    row.style.display = (!term || titulo.includes(term) || desc.includes(term)) ? '' : 'none';
  });
}

function loadMultimediaForm(){
  // Fotos
  const fotosList = document.getElementById('admin-fotos-list');
  fotosList.innerHTML = '';
  document.querySelectorAll('.gallery-item[data-index]').forEach((item, i) => {
    const img = item.querySelector('img');
    const src = img ? img.src.split('/').pop() : '—';
    const titulo = item.dataset.titulo || '';
    const desc   = item.dataset.desc   || '';
    fotosList.innerHTML += `
      <div style="background:rgba(245,242,237,.03);border:1px solid rgba(245,242,237,.08);padding:14px;border-radius:2px;">
        <p style="font-size:.55rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(200,184,154,.5);margin-bottom:10px;">${src}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="admin-label">Título</label><input type="text" class="admin-input foto-titulo" data-idx="${i}" value="${titulo}" placeholder="Título de la foto"></div>
          <div><label class="admin-label">Descripción</label><input type="text" class="admin-input foto-desc" data-idx="${i}" value="${desc}" placeholder="Descripción breve"></div>
        </div>
      </div>`;
  });

  // Vídeos
  const videosList = document.getElementById('admin-videos-list');
  videosList.innerHTML = '';
  document.querySelectorAll('.video-card[data-src]').forEach((card, i) => {
    const src    = card.dataset.src.split('/').pop();
    const titulo = card.dataset.title || '';
    const desc   = card.dataset.desc  || '';
    videosList.innerHTML += `
      <div style="background:rgba(245,242,237,.03);border:1px solid rgba(245,242,237,.08);padding:14px;border-radius:2px;">
        <p style="font-size:.55rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(200,184,154,.5);margin-bottom:10px;">${src}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="admin-label">Título</label><input type="text" class="admin-input vid-titulo" data-idx="${i}" value="${titulo}" placeholder="Título del vídeo"></div>
          <div><label class="admin-label">Descripción</label><input type="text" class="admin-input vid-desc" data-idx="${i}" value="${desc}" placeholder="Descripción breve"></div>
        </div>
      </div>`;
  });
}

function saveMultimedia(){
  // Guardar en los data-attributes y en localStorage
  const fotos  = document.querySelectorAll('.gallery-item[data-index]');
  const videos = document.querySelectorAll('.video-card[data-src]');
  const data   = { fotos: [], videos: [] };

  document.querySelectorAll('.foto-titulo').forEach(input => {
    const i = +input.dataset.idx;
    if(fotos[i]){
      fotos[i].dataset.titulo = input.value;
      // Actualizar el label del overlay
      const lbl = fotos[i].querySelector('.gallery-item-label');
      if(lbl) lbl.textContent = input.value;
    }
  });
  document.querySelectorAll('.foto-desc').forEach(input => {
    const i = +input.dataset.idx;
    if(fotos[i]) fotos[i].dataset.desc = input.value;
    data.fotos[i] = data.fotos[i] || {};
    data.fotos[i].titulo = document.querySelector(`.foto-titulo[data-idx="${i}"]`)?.value || '';
    data.fotos[i].desc   = input.value;
  });
  document.querySelectorAll('.vid-titulo').forEach(input => {
    const i = +input.dataset.idx;
    if(videos[i]){
      videos[i].dataset.title = input.value;
      const h3 = videos[i].querySelector('.video-title');
      if(h3) h3.textContent = input.value;
    }
    data.videos[i] = data.videos[i] || {};
    data.videos[i].titulo = input.value;
  });
  document.querySelectorAll('.vid-desc').forEach(input => {
    const i = +input.dataset.idx;
    if(videos[i]){
      videos[i].dataset.desc = input.value;
      const p = videos[i].querySelector('.video-desc');
      if(p) p.textContent = input.value;
    }
    data.videos[i] = data.videos[i] || {};
    data.videos[i].desc = input.value;
  });

  localStorage.setItem('alr_multimedia', JSON.stringify(data));
  saveConfigToFirebase('multimedia', data);
  const msg = document.getElementById('multimedia-msg');
  msg.textContent = 'Guardado ✓'; msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2500);
}

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
};

function loadTextos(){
  try{ return Object.assign({}, TEXTOS_DEFAULT, JSON.parse(localStorage.getItem('alr_textos')||'{}')); }
  catch(e){ return {...TEXTOS_DEFAULT}; }
}
function loadTextosForm(){
  const t = loadTextos();
  document.getElementById('txt-tagline').value        = t.tagline;
  document.getElementById('txt-eyebrow').value        = t.eyebrow;
  document.getElementById('txt-sobre1').value         = t.sobre1;
  document.getElementById('txt-sobre2').value         = t.sobre2;
  document.getElementById('txt-disponibilidad').value = t.disponibilidad;
}
function saveTextos(){
  const t = {
    tagline:        document.getElementById('txt-tagline').value.trim(),
    eyebrow:        document.getElementById('txt-eyebrow').value.trim(),
    sobre1:         document.getElementById('txt-sobre1').value.trim(),
    sobre2:         document.getElementById('txt-sobre2').value.trim(),
    disponibilidad: document.getElementById('txt-disponibilidad').value.trim(),
  };
  localStorage.setItem('alr_textos', JSON.stringify(t));
  saveConfigToFirebase('textos', t);
  applyTextos(t);
  // Feedback visual en el botón
  try {
    const btn = document.querySelector('button[onclick*="saveTextos"]');
    if(btn){ btn.textContent = 'Guardado ✓'; setTimeout(() => btn.textContent = 'Guardar cambios ✓', 2000); }
  } catch(e){}
}
function resetTextos(){
  localStorage.removeItem('alr_textos');
  saveConfigToFirebase('textos', TEXTOS_DEFAULT);
  loadTextosForm();
  applyTextos(TEXTOS_DEFAULT);
}
function applyTextos(t){
  // Hero tagline
  const tl = document.querySelector('.hero-tagline');
  if(tl) tl.innerHTML = t.tagline.replace(/\n/g,'<br>');
  // Hero eyebrow
  const ey = document.querySelector('.hero-eyebrow');
  if(ey) ey.textContent = t.eyebrow;
  // Sobre mí
  const sb = document.querySelectorAll('.sobre-body');
  if(sb[0]) sb[0].textContent = t.sobre1;
  if(sb[1]) sb[1].textContent = t.sobre2;
  // Disponibilidad en contacto
  document.querySelectorAll('.contacto-info-item span').forEach(s => {
    if(s.textContent.includes('Disponible')) s.textContent = t.disponibilidad;
  });
}
// Aplicar al cargar
applyTextos(loadTextos());
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
      emailItem.innerHTML = `<div class="info-dot"></div><a href="mailto:${d.email}">${d.email}</a>`;
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
// Contraseña personalizada
const savedPass = localStorage.getItem('alr_pass');
if(savedPass) window._adminPass = savedPass;


let activeFilter = 'all';
function applyFilter(filter){
  activeFilter = filter;
  document.querySelectorAll('.gallery-filter button').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  document.querySelectorAll('.gallery-item').forEach(item => {
    const match = filter === 'all' || item.dataset.cat === filter;
    item.style.opacity   = match ? '1' : '0.15';
    item.style.transform = match ? '' : 'scale(0.96)';
    item.style.transition = 'opacity .4s, transform .4s';
    item.style.pointerEvents = match ? '' : 'none';
  });
}
document.querySelectorAll('.gallery-filter button').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

// ── CARRUSEL FOTOS ────────────────────────────────────────────────────────────
let lightboxItems = [];
let lightboxIndex = 0;
let isAnimating   = false;

function buildLightboxItems(){
  // Solo incluir items visibles según el filtro activo
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
    // Overlay título + descripción
    const titulo = item.dataset.titulo || item.querySelector('.gallery-item-label')?.textContent || '';
    const desc   = item.dataset.desc   || '';
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

// Click listeners para gallery-item se asignan dinámicamente en renderPublicGallery()

// ── CARRUSEL VÍDEOS ───────────────────────────────────────────────────────────
let vlbItems    = [];
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
// Inicializar EmailJS (ella debe crear cuenta en emailjs.com y poner su Public Key)
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

  btn.textContent = 'Enviando...';
  btn.style.opacity = '.6';

  if(EMAILJS_KEY){
    console.log('Enviando con:', EMAILJS_SERVICE, EMAILJS_TEMPLATE, EMAILJS_KEY, params);
    emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, params)
      .then(() => {
        btn.textContent = 'Mensaje enviado ✓';
        btn.style.borderColor = 'var(--warm)'; btn.style.color = 'var(--warm)'; btn.style.opacity = '1';
        setTimeout(() => {
          btn.innerHTML = 'Enviar mensaje <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
          btn.style.borderColor = ''; btn.style.color = ''; form.reset();
        }, 3000);
      })
      .catch(() => {
        btn.textContent = 'Error al enviar. Inténtalo de nuevo.';
        btn.style.color = '#c87a6a'; btn.style.opacity = '1';
        setTimeout(() => {
          btn.innerHTML = 'Enviar mensaje <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
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
  // Envolver cada carácter en un span (respetando los <br> y <em>)
  function wrapChars(node){
    if(node.nodeType === 3){
      // Nodo de texto
      const frag = document.createDocumentFragment();
      node.textContent.split('').forEach(ch => {
        const span = document.createElement('span');
        span.className = 'tw-char';
        span.textContent = ch === ' ' ? '\u00a0' : ch;
        frag.appendChild(span);
      });
      node.replaceWith(frag);
    } else if(node.nodeType === 1 && node.tagName !== 'BR'){
      Array.from(node.childNodes).forEach(wrapChars);
    }
  }
  Array.from(heroName.childNodes).forEach(wrapChars);

  // Animar con delay escalonado
  const chars = heroName.querySelectorAll('.tw-char');
  chars.forEach((ch, i) => {
    setTimeout(() => ch.classList.add('show'), 800 + i * 45);
  });
}
// Arrancar después del loader
setTimeout(initTypewriter, 2900);

// ── SONIDO ────────────────────────────────────────────────────────────────────
const soundBtn = document.getElementById('soundBtn');
let ambientCtx  = null;
let ambientGain = null;
let soundOn     = false;
let introPlayed = false;

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
    // Sub boom
    nota(40,  now,        0.5,  0.28);
    // Acorde Do-Mi-Sol
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
  // Si es el primer clic sobre el botón, el intro ya se disparó en unlockAndPlayIntro
  // Solo necesitamos alternar el ambiente
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
initCookieBanner();

// ── VISTA PREVIA ───────────────────────────────────────────────────────────────
function previewMode(){
  closeAdmin();
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(200,184,154,.15);border:1px solid rgba(200,184,154,.3);color:#c8b89a;font-family:Outfit,sans-serif;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;padding:10px 24px;z-index:9999;backdrop-filter:blur(8px);';
  msg.textContent = 'Modo vista previa · Escribe "andrea" para volver al panel';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 5000);
}

// ── EXPORTAR / IMPORTAR CONFIG ─────────────────────────────────────────────────
function exportConfig(){
  const cfg = {
    textos:     JSON.parse(localStorage.getItem('alr_textos')     || '{}'),
    contacto:   JSON.parse(localStorage.getItem('alr_contacto')   || '{}'),
    multimedia: JSON.parse(localStorage.getItem('alr_multimedia') || '{}'),
    // fotos se exportan desde Firestore (no localStorage)
    timestamp:  new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(cfg, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `andrea-portfolio-backup-${Date.now()}.json`;
  a.click();
  localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));
}
function importConfig(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try{
      const cfg = JSON.parse(ev.target.result);
      if(cfg.textos)     { localStorage.setItem('alr_textos',     JSON.stringify(cfg.textos));     applyTextos(loadTextos());   saveConfigToFirebase('textos',     cfg.textos);     }
      if(cfg.contacto)   { localStorage.setItem('alr_contacto',   JSON.stringify(cfg.contacto));   applyContacto(cfg.contacto); saveConfigToFirebase('contacto',   cfg.contacto);   }
      if(cfg.multimedia) { localStorage.setItem('alr_multimedia', JSON.stringify(cfg.multimedia)); applyMultimedia();           saveConfigToFirebase('multimedia', cfg.multimedia); }
      // Fotos ahora viven en Firestore, no en localStorage
      const msg = document.getElementById('stats-msg');
      msg.textContent = 'Configuración importada correctamente ✓';
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 3000);
      loadStats();
    } catch(err){
      showAlert('El archivo no es válido o está corrupto.', { title:'Error al importar', icon:'✗' });
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── GESTIÓN VÍDEOS ADMIN ─────────────────────────────────────────────────
async function loadVideoAdmin(){
  const list = document.getElementById('admin-video-list');
  if(!list) return;
  list.innerHTML = '';

  try {
    const snapshot = await db.collection('videos').orderBy('created').get();
    snapshot.forEach(doc => {
      const v = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-video-row';
      div.style.cssText = 'background:rgba(245,242,237,.03);border:1px solid rgba(245,242,237,.08);padding:14px;border-radius:2px;display:flex;align-items:center;justify-content:space-between;gap:16px;transition:opacity .2s,border-color .2s;';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;">
          <div>
            <p style="font-size:.55rem;letter-spacing:.22em;text-transform:uppercase;color:#c8b89a;">${esc((v.src||'').split('/').pop())}</p>
            <p style="font-size:.78rem;color:#f0ece4;font-weight:200;margin-top:4px;">${esc(v.titulo) || '—'}</p>
            <p style="font-size:.65rem;color:#7a7068;margin-top:2px;">${esc(v.desc) || '—'}</p>
          </div>
        </div>
        <button onclick="removeVideo('${doc.id}')" style="background:rgba(180,60,40,.5);border:none;color:#fff;padding:6px 14px;font-family:Outfit,sans-serif;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;flex-shrink:0;">Eliminar</button>
      `;
      list.appendChild(div);
    });
  } catch(e) {
    console.error('Error cargando vídeos admin:', e);
  }
}

async function addVideoAdmin(){
  const src    = pendingVideoUrl || document.getElementById('vid-src')?.value.trim();
  const titulo = document.getElementById('vid-new-titulo').value.trim();
  const desc   = document.getElementById('vid-new-desc').value.trim();
  const cat    = document.getElementById('vid-cat').value.trim() || 'Dron';
  const subcat = document.getElementById('vid-subcat').value.trim();
  if(!src){ showAlert('Sube un vídeo primero.', { title:'Vídeo requerido', icon:'🎬' }); return; }

  try {
    await db.collection('videos').add({
      src,
      titulo,
      desc,
      cat: cat + (subcat ? ' · ' + subcat : ''),
      created: Date.now()
    });

    showAlert('Vídeo añadido correctamente.', { title:'¡Hecho!', icon:'🎬' });

    // Limpiar
    pendingVideoUrl = null;
    ['vid-src','vid-new-titulo','vid-new-desc','vid-cat','vid-subcat'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
    const st = document.getElementById('vid-upload-status');
    if(st) st.style.display = 'none';
    const pr = document.getElementById('vid-cloudinary-preview');
    if(pr) pr.style.display = 'none';

    loadVideoAdmin();
    renderPublicVideos();
  } catch(e) {
    showAlert('Error al añadir el vídeo.', { title:'Error', icon:'✗' });
    console.error(e);
  }
}

function removeVideo(docId){
  showConfirm('Este vídeo se eliminará de forma permanente.', async () => {
    try {
      await db.collection('videos').doc(docId).delete();
      loadVideoAdmin();
      renderPublicVideos();
    } catch(e) {
      showAlert('Error al eliminar el vídeo.', { title:'Error', icon:'✗' });
      console.error(e);
    }
  }, { title:'Eliminar vídeo', icon:'🎬' });
}

// ── VÍDEOS PÚBLICOS ─────────────────────────────────────────────────────────
async function renderPublicVideos(){
  const grid = document.querySelector('.video-grid');
  if(!grid) return;
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:.72rem;color:#7a7068;font-weight:200;padding:40px 0;">Cargando vídeos…</p>';

  try {
    const snapshot = await db.collection('videos').orderBy('created').get();
    grid.innerHTML = '';

    snapshot.forEach((doc, i) => {
      const v = doc.data();
      const card = document.createElement('div');
      card.className = 'video-card reveal' + (i === 1 ? ' reveal-delay-1' : i === 2 ? ' reveal-delay-2' : '');
      card.dataset.src   = v.src;
      card.dataset.title = v.titulo || '';
      card.dataset.desc  = v.desc || '';
      card.innerHTML = `
        <div class="video-thumb" style="background:#111;">
          <video muted loop playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.8;"
            onmouseenter="this.play()" onmouseleave="this.pause()" ontouchstart="this.play()" ontouchend="this.pause()">
            <source src="${esc(v.src)}" type="video/mp4">
          </video>
          <div class="play-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
        </div>
        <div class="video-info">
          <span class="video-category">${esc(v.cat) || 'Dron'}</span>
          <h3 class="video-title">${esc(v.titulo) || esc((v.src||'').split('/').pop())}</h3>
          <p class="video-desc">${esc(v.desc)}</p>
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

    // Observar reveals
    if(typeof revealObs !== 'undefined'){
      grid.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
    }
  } catch(e) {
    console.error('Error cargando vídeos públicos:', e);
  }
}

// ── DRAG & DROP GALERÍA ADMIN ──────────────────────────────────────────────────
function initDragDrop(){
  const grid = document.getElementById('adminGallery');
  if(!grid) return;
  let dragged = null;

  grid.addEventListener('dragstart', e => {
    dragged = e.target.closest('.admin-photo');
    if(dragged) dragged.classList.add('dragging');
  });
  grid.addEventListener('dragend', () => {
    if(dragged) dragged.classList.remove('dragging');
    grid.querySelectorAll('.admin-photo').forEach(p => p.classList.remove('drag-over'));
    dragged = null;
    syncGalleryOrder();
    localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));
  });
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const over = e.target.closest('.admin-photo');
    if(over && over !== dragged){
      grid.querySelectorAll('.admin-photo').forEach(p => p.classList.remove('drag-over'));
      over.classList.add('drag-over');
    }
  });
  grid.addEventListener('drop', e => {
    e.preventDefault();
    const over = e.target.closest('.admin-photo');
    if(over && dragged && over !== dragged){
      const items = [...grid.querySelectorAll('.admin-photo')];
      const iDrag = items.indexOf(dragged);
      const iOver = items.indexOf(over);
      if(iDrag < iOver) over.after(dragged);
      else over.before(dragged);
    }
  });
}

async function syncGalleryOrder(){
  // Re-render desde Firestore (el orden se mantiene por created)
  await renderAdminGallery();
  await renderPublicGallery();
}


// ── TOGGLE SECCIÓN VISIBLE ────────────────────────────────────────────────────
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

// Comprobar si una sección está oculta (boolean o string)
function isSectionHidden(stored, id){
  return stored[id] === false || stored[id] === 'false';
}

// Regenerar el CSS dinámico de secciones ocultas
function refreshSectionsCSS(){
  const old = document.getElementById('_sections-hide');
  if(old) old.remove();
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  const ids = ['sobre','galeria','videos','servicios','proceso','testimonios','contacto'];
  let css = '';
  ids.forEach(id => {
    if(isSectionHidden(stored, id)){
      css += `#${id}{display:none!important}`;
      // Solo nav desktop y footer — NO mobile-menu
      css += `nav .nav-links a[href="#${id}"],#footer-nav a[href="#${id}"]{display:none!important}`;
      // Mobile-menu: colapsar sin romper transiciones CSS
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

function toggleSection(id, visible){
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  stored[id] = Boolean(visible);
  localStorage.setItem('alr_sections', JSON.stringify(stored));
  saveConfigToFirebase('sections', stored);
  refreshSectionsCSS();
  updateNavLinks(stored);
}

function updateNavLinks(stored){
  // Nav desktop
  document.querySelectorAll('nav .nav-links a').forEach(a => {
    const id = (a.getAttribute('href')||'').replace('#','');
    if(!SECTIONS_CONFIG.find(s => s.id === id)) return;
    a.style.display = isSectionHidden(stored, id) ? 'none' : '';
  });
  // Footer nav
  document.querySelectorAll('#footer-nav a').forEach(a => {
    const id = (a.getAttribute('href')||'').replace('#','');
    if(!SECTIONS_CONFIG.find(s => s.id === id)) return;
    a.style.display = isSectionHidden(stored, id) ? 'none' : '';
  });
  // Menú móvil — usar visibility para no romper las transiciones CSS
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

// Contenido de cada sección en el submenú
const SECTION_CONTENT = {
  hero: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:20px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Fondo del Hero</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
      <div><label class="admin-label">Tipo de fondo</label><select id="hero-type" class="admin-input"><option value="video">Vídeo</option><option value="image">Imagen</option></select></div>
      <div><label class="admin-label">URL / ruta</label><input id="hero-src" type="text" class="admin-input" placeholder="videos/hero.mp4"></div>
    </div>
    <p style="font-size:.55rem;color:rgba(245,242,237,.25);margin-bottom:16px;">Vídeo local: videos/nombre.mp4 · Imagen: sube a Cloudinary o usa ruta local</p>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;">
      <button onclick="saveHeroConfig()" class="admin-btn">Guardar ✓</button>
      <button onclick="document.getElementById('heroFileInput').click()" class="admin-btn" style="border-color:rgba(245,242,237,.1);color:#7a7068;">Subir imagen</button>
      <input id="heroFileInput" type="file" accept="image/*,video/mp4" style="display:none;" onchange="uploadHeroFile(this.files[0])">
    </div>
    <p id="hero-msg" style="font-size:.72rem;color:#c8b89a;margin-top:14px;display:none;"></p>`,

  sobre: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:20px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Textos — Sobre mí</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
      <div><label class="admin-label">Párrafo 1</label><textarea id="txt-sobre1" class="admin-input" rows="5"></textarea></div>
      <div><label class="admin-label">Párrafo 2</label><textarea id="txt-sobre2" class="admin-input" rows="5"></textarea></div>
    </div>
    <button onclick="saveTextos()" class="admin-btn" style="margin-bottom:28px;">Guardar textos ✓</button>
    <hr class="admin-divider">
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Carrusel de fotos</p>
    <div class="drop-zone" onclick="document.getElementById('sobreFileInput').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="handleSobreDrop(event)" style="margin-bottom:16px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" stroke-width="1" style="opacity:.4;display:block;margin:0 auto 10px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <p style="font-size:.72rem;font-weight:200;color:#7a7068;">Arrastra fotos aquí o haz clic</p>
      <input id="sobreFileInput" type="file" accept="image/*" style="display:none;" onchange="uploadSobrePhoto(this.files[0])">
    </div>
    <p id="sobre-upload-status" style="font-size:.72rem;color:#c8b89a;margin-bottom:12px;display:none;"></p>
    <div id="admin-sobre-photos" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;"></div>`,

  galeria: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Fotos de la galería</p>
    <div class="drop-zone" onclick="document.getElementById('fileInput2').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="handleDrop(event)" style="margin-bottom:20px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" stroke-width="1" style="opacity:.4;display:block;margin:0 auto 10px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <p style="font-size:.72rem;font-weight:200;color:#7a7068;">Arrastra fotos aquí o haz clic</p>
      <input id="fileInput2" type="file" accept="image/*" multiple style="display:none;" onchange="handleFiles(this.files)">
    </div>
    <div id="newPhotoFields" style="display:none;margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:flex-end;">
        <div><label class="admin-label">Título</label><input id="newTitulo" type="text" class="admin-input" placeholder="Ej: Atardecer"></div>
        <div><label class="admin-label">Categoría</label><select id="newCat" class="admin-input"><option value="fotografia">Fotografía</option><option value="dron">Dron</option><option value="retrato">Retrato</option></select></div>
        <div><label class="admin-label">Carpeta</label><select id="newFolder" class="admin-input"><option value="">Sin carpeta</option></select></div>
        <button onclick="addPhoto()" class="admin-btn">Añadir ✓</button>
      </div>
      <img id="previewImg" style="max-height:120px;object-fit:contain;margin-top:10px;display:block;">
    </div>
    <div class="admin-grid" id="adminGallery"></div>
    <p id="noPhotosMsg" style="font-size:.78rem;font-weight:200;color:#7a7068;text-align:center;padding:36px 0;display:none;">Aún no hay fotos.</p>`,

  videos: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Subir vídeo</p>
    <div class="drop-zone" onclick="document.getElementById('vidFileInput').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="handleVideoDrop(event)" style="margin-bottom:14px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" stroke-width="1" style="opacity:.4;display:block;margin:0 auto 12px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
      <p style="font-size:.75rem;font-weight:200;color:#7a7068;line-height:1.7;">Arrastra tu vídeo aquí o haz clic<br><span style="font-size:.62rem;color:rgba(122,112,104,.5);">MP4 · Se sube a Cloudinary automáticamente</span></p>
      <input id="vidFileInput" type="file" accept="video/mp4,video/webm,video/quicktime" style="display:none;" onchange="handleVideoFile(this.files[0])">
    </div>
    <p id="vid-upload-status" style="font-size:.72rem;color:#c8b89a;margin-bottom:10px;display:none;"></p>
    <img id="vid-cloudinary-preview" style="max-height:90px;border-radius:2px;margin-bottom:14px;display:none;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div><label class="admin-label">Título</label><input id="vid-new-titulo" type="text" class="admin-input" placeholder="Título"></div>
      <div><label class="admin-label">Descripción</label><input id="vid-new-desc" type="text" class="admin-input" placeholder="Descripción breve"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;margin-bottom:20px;">
      <div><label class="admin-label">Categoría</label><input id="vid-cat" type="text" class="admin-input" placeholder="Dron · Cinematográfico"></div>
      <div><label class="admin-label">Subcategoría</label><input id="vid-subcat" type="text" class="admin-input" placeholder="Costa, Ciudad..."></div>
      <div style="display:flex;align-items:flex-end;"><button onclick="addVideoAdmin()" class="admin-btn">Añadir ✓</button></div>
    </div>
    <div id="admin-video-list" style="display:flex;flex-direction:column;gap:8px;"></div>`,

  servicios: () => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Servicios</p>
      <button onclick="addServicio()" class="admin-btn">+ Añadir</button>
    </div>
    <div id="admin-servicios-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;"></div>
    <hr class="admin-divider">
    <button onclick="saveServicios()" class="admin-btn">Guardar cambios ✓</button>
    <p id="servicios-msg" style="font-size:.72rem;color:#c8b89a;margin-top:12px;display:none;"></p>`,

  proceso: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Pasos del proceso</p>
    <div id="proceso-steps-admin" style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;"></div>
    <hr class="admin-divider">
    <button onclick="saveProcesoSteps()" class="admin-btn">Guardar cambios ✓</button>
    <p id="proceso-msg" style="font-size:.72rem;color:#c8b89a;margin-top:12px;display:none;"></p>`,

  testimonios: () => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Testimonios</p>
      <button onclick="addTestimonio()" class="admin-btn">+ Añadir</button>
    </div>
    <div id="admin-testimonios-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;"></div>
    <hr class="admin-divider">
    <button onclick="saveTestimonios()" class="admin-btn">Guardar cambios ✓</button>
    <p id="testimonios-msg" style="font-size:.72rem;color:#c8b89a;margin-top:12px;display:none;"></p>`,

  contacto: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Sección de contacto</p>
    <p style="font-size:.72rem;color:#7a7068;margin-bottom:16px;">La sección de contacto es obligatoria. Para editar sus textos ve a Configuración → Textos. Para el email de recepción ve a Configuración → Contacto.</p>
    <a onclick="document.querySelector('[onclick*=tab-config]').click();setTimeout(()=>document.querySelector('[onclick*=cfg-contacto]').click(),100);" class="admin-btn" style="display:inline-block;">Ir a Configuración →</a>`,
};

function renderSectionsMenu(activeId){
  const sidebar = document.getElementById('sec-sidebar');
  const content = document.getElementById('sec-content');
  if(!sidebar || !content) return;

  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  const firstId = activeId || SECTIONS_CONFIG[0].id;

  // Generar menú lateral
  sidebar.innerHTML = '';
  SECTIONS_CONFIG.forEach(cfg => {
    const visible = stored[cfg.id] !== false;
    const btn = document.createElement('div');
    btn.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    btn.innerHTML = `
      <button class="sec-menu-btn ${cfg.id === firstId ? 'active':''}" onclick="renderSectionContent('${cfg.id}')">
        ${cfg.icon} ${cfg.label}
      </button>
      <label style="display:flex;align-items:center;gap:6px;padding-left:12px;font-size:.48rem;letter-spacing:.12em;text-transform:uppercase;color:${visible?'rgba(200,184,154,.4)':'rgba(122,112,104,.5)'};">
        <input type="checkbox" ${visible?'checked':''} ${cfg.required?'disabled':''}
          onchange="toggleSection('${cfg.id}',this.checked);renderSectionsMenu('${cfg.id}');"
          style="accent-color:var(--warm);width:12px;height:12px;">
        ${visible?'Visible':'Oculta'}
      </label>`;
    sidebar.appendChild(btn);
  });

  renderSectionContent(firstId);
}

function renderSectionContent(id){
  const content = document.getElementById('sec-content');
  if(!content) return;

  // Actualizar activo en sidebar
  document.querySelectorAll('#sec-sidebar .sec-menu-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim().includes(SECTIONS_CONFIG.find(s=>s.id===id)?.label));
  });

  // Renderizar contenido
  const fn = SECTION_CONTENT[id];
  content.innerHTML = fn ? fn() : '';

  // Triggers post-render
  if(id === 'galeria')     { renderAdminGallery(); setTimeout(initDragDrop,50); setTimeout(()=>populateFolderSelector('newFolder'),100); }
  if(id === 'videos')      loadVideoAdmin();
  if(id === 'servicios')   loadServiciosAdmin();
  if(id === 'testimonios') loadTestimoniosAdmin();
  if(id === 'proceso')     loadProcesoAdmin();
  if(id === 'sobre')       { loadTextosForm(); renderAdminSobrePhotos(); }
  if(id === 'hero')        loadHeroForm();
  if(id === 'galeria')     { const fi=document.getElementById('fileInput2'); if(fi) fi.addEventListener('change',e=>handleFiles(e.target.files)); }
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

    // Fallback: si no hay fotos, usar la imagen por defecto
    if(!photos.length) photos.push({ src:'fotos/retrato.jpeg', fallback:true });

    _sobreCount = photos.length;
    _sobreIdx = 0;

    track.innerHTML = '';
    photos.forEach(p => {
      const slide = document.createElement('div');
      slide.className = 'sobre-carousel-slide';
      slide.innerHTML = `<img src="${esc(p.src)}" alt="Andrea López">`;
      track.appendChild(slide);
    });

    // Dots
    if(dots){
      dots.innerHTML = '';
      photos.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'sobre-dot' + (i===0?' active':'');
        d.addEventListener('click', () => goSobre(i));
        dots.appendChild(d);
      });
    }

    // Single mode (hide buttons/dots)
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

// Navigation
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sobrePrev')?.addEventListener('click', () => goSobre(_sobreIdx - 1));
  document.getElementById('sobreNext')?.addEventListener('click', () => goSobre(_sobreIdx + 1));

  // Swipe support
  let sx = 0;
  const car = document.getElementById('sobreCarousel');
  if(car){
    car.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive:true});
    car.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if(Math.abs(dx) > 40) dx < 0 ? goSobre(_sobreIdx+1) : goSobre(_sobreIdx-1);
    });
  }
});

// ── SOBRE PHOTOS ADMIN (Firestore CRUD) ─────────────────────────────────────
function handleSobreDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  if(e.dataTransfer.files.length) uploadSobrePhoto(e.dataTransfer.files[0]);
}

function uploadSobrePhoto(file){
  if(!file) return;
  const status = document.getElementById('sobre-upload-status');
  if(status){ status.textContent = 'Subiendo… 0%'; status.style.display = 'block'; }

  uploadToCloudinary(file, pct => {
    if(status) status.textContent = `Subiendo… ${pct}%`;
  }).then(async url => {
    await db.collection('sobre_photos').add({ src: url, created: Date.now() });
    if(status){ status.textContent = '✓ Foto añadida'; setTimeout(()=> status.style.display='none', 2000); }
    renderAdminSobrePhotos();
    renderSobreCarousel();
  }).catch(() => {
    if(status) status.textContent = 'Error al subir';
  });
}

async function renderAdminSobrePhotos(){
  const grid = document.getElementById('admin-sobre-photos');
  if(!grid) return;
  grid.innerHTML = '';
  try {
    const snap = await db.collection('sobre_photos').orderBy('created').get();
    snap.forEach(doc => {
      const p = doc.data();
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;aspect-ratio:4/5;overflow:hidden;border:1px solid rgba(245,242,237,.08);border-radius:2px;';
      div.innerHTML = `
        <img src="${esc(p.src)}" style="width:100%;height:100%;object-fit:cover;">
        <button onclick="deleteSobrePhoto('${doc.id}')" style="position:absolute;top:4px;right:4px;background:rgba(180,60,40,.7);border:none;color:#fff;width:20px;height:20px;font-size:.55rem;cursor:pointer;border-radius:2px;">✕</button>`;
      grid.appendChild(div);
    });
  } catch(e){ console.warn('Error cargando sobre photos admin:', e); }
}

function deleteSobrePhoto(docId){
  showConfirm('Esta foto se eliminará del carrusel.', async () => {
    try {
      await db.collection('sobre_photos').doc(docId).delete();
      renderAdminSobrePhotos();
      renderSobreCarousel();
    } catch(e){ showAlert('Error al eliminar.', {title:'Error',icon:'✗'}); }
  }, { title:'Eliminar foto', icon:'🗑' });
}

// ── HERO ADMIN ───────────────────────────────────────────────────────────────
function loadHeroForm(){
  const cfg = JSON.parse(localStorage.getItem('alr_hero')||'{}');
  const typeEl = document.getElementById('hero-type');
  const srcEl  = document.getElementById('hero-src');
  if(typeEl) typeEl.value = cfg.type || 'video';
  if(srcEl)  srcEl.value  = cfg.src  || 'videos/hero-prueba.mp4';
}

function saveHeroConfig(){
  const type = document.getElementById('hero-type')?.value || 'video';
  const src  = document.getElementById('hero-src')?.value.trim() || '';
  if(!src){ showAlert('Indica la URL del vídeo o imagen.', {title:'Falta URL', icon:'📎'}); return; }
  const cfg = { type, src };
  localStorage.setItem('alr_hero', JSON.stringify(cfg));
  applyHeroMedia(cfg);
  saveConfigToFirebase('hero', cfg);
  const msg = document.getElementById('hero-msg');
  if(msg){ msg.textContent='Guardado ✓'; msg.style.display='block'; setTimeout(()=>msg.style.display='none',2500); }
}

function uploadHeroFile(file){
  if(!file) return;
  const msg = document.getElementById('hero-msg');
  if(msg){ msg.textContent='Subiendo…'; msg.style.display='block'; }
  uploadToCloudinary(file, pct => {
    if(msg) msg.textContent = `Subiendo… ${pct}%`;
  }).then(url => {
    const srcEl = document.getElementById('hero-src');
    if(srcEl) srcEl.value = url;
    // Auto-detect type
    const typeEl = document.getElementById('hero-type');
    if(typeEl) typeEl.value = file.type.startsWith('video') ? 'video' : 'image';
    if(msg){ msg.textContent='✓ Subido. Pulsa Guardar.'; setTimeout(()=>msg.style.display='none',3000); }
  }).catch(() => {
    if(msg) msg.textContent = 'Error al subir';
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

// ── PROCESO — EDICIÓN DE PASOS ────────────────────────────────────────────
const PROCESO_DEFAULT = [
  {num:'01', titulo:'Me escribes',  desc:'Cuéntame tu proyecto, la fecha y lo que tienes en mente. Te respondo en menos de 24h.'},
  {num:'02', titulo:'Hablamos',     desc:'Una llamada o reunión rápida para entender exactamente lo que necesitas y preparar todo.'},
  {num:'03', titulo:'La sesión',    desc:'Me encargo de todo. Tú solo tienes que disfrutar. Yo capturo cada momento importante.'},
  {num:'04', titulo:'La entrega',   desc:'Galería privada en 48h con todas las fotos editadas. Vídeo en 7 días. Sin letra pequeña.'},
];

function loadProceso(){ try{ return JSON.parse(localStorage.getItem('alr_proceso')) || PROCESO_DEFAULT; } catch(e){ return PROCESO_DEFAULT; } }

function loadProcesoAdmin(){
  const list = document.getElementById('proceso-steps-admin');
  if(!list) return;
  const data = loadProceso();
  list.innerHTML = '';
  data.forEach((s,i) => {
    const row = document.createElement('div');
    row.style.cssText = 'background:rgba(245,242,237,.03);border:1px solid rgba(245,242,237,.08);padding:14px;border-radius:2px;';
    row.innerHTML = `
      <div style="display:grid;grid-template-columns:60px 1fr 1fr auto;gap:10px;align-items:center;">
        <div><label class="admin-label">Nº</label><input type="text" class="admin-input paso-num" data-i="${i}" value="${s.num}"></div>
        <div><label class="admin-label">Título</label><input type="text" class="admin-input paso-titulo" data-i="${i}" value="${s.titulo}"></div>
        <div><label class="admin-label">Descripción</label><input type="text" class="admin-input paso-desc" data-i="${i}" value="${s.desc}"></div>
        <button onclick="deletePaso(${i})" style="background:rgba(180,60,40,.4);border:none;color:#fff;padding:8px 12px;font-size:.6rem;cursor:pointer;margin-top:16px;">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

function saveProcesoSteps(){
  const data = loadProceso();
  document.querySelectorAll('.paso-num'  ).forEach(el => { data[+el.dataset.i].num    = el.value; });
  document.querySelectorAll('.paso-titulo').forEach(el => { data[+el.dataset.i].titulo = el.value; });
  document.querySelectorAll('.paso-desc' ).forEach(el => { data[+el.dataset.i].desc   = el.value; });
  localStorage.setItem('alr_proceso', JSON.stringify(data));
  saveConfigToFirebase('proceso', data);
  renderProceso(data);
  const msg = document.getElementById('proceso-msg');
  if(msg){ msg.textContent='Guardado ✓'; msg.style.display='block'; setTimeout(()=>msg.style.display='none',2500); }
}

function deletePaso(i){
  const data = loadProceso(); data.splice(i,1);
  localStorage.setItem('alr_proceso', JSON.stringify(data));
  saveConfigToFirebase('proceso', data);
  loadProcesoAdmin(); renderProceso(data);
}

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

function renderSectionsControl(){ renderSectionsMenu(); } // alias para compatibilidad

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

function loadServiciosAdmin(){
  const list = document.getElementById('admin-servicios-list');
  const data = loadServicios();
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  const toggle = document.getElementById('toggle-servicios');
  if(toggle) toggle.checked = stored['servicios'] !== false;

  list.innerHTML = '';
  data.forEach((s, i) => {
    const visible = s.visible !== false;
    const row = document.createElement('div');
    row.style.cssText = `background:rgba(245,242,237,.03);border:1px solid rgba(245,242,237,.08);padding:16px;border-radius:2px;opacity:${visible?1:.5};`;
    row.innerHTML = `
      <div style="display:grid;grid-template-columns:60px 1fr 1fr 100px 36px auto;gap:10px;align-items:center;">
        <div><label class="admin-label">Icono</label><input type="text" class="admin-input srv-icono" data-i="${i}" value="${s.icono}" style="font-size:1.2rem;text-align:center;"></div>
        <div><label class="admin-label">Nombre</label><input type="text" class="admin-input srv-nombre" data-i="${i}" value="${s.nombre}"></div>
        <div><label class="admin-label">Descripción</label><input type="text" class="admin-input srv-desc" data-i="${i}" value="${s.desc}"></div>
        <div><label class="admin-label">Precio</label><input type="text" class="admin-input srv-precio" data-i="${i}" value="${s.precio}"></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:16px;">
          <label class="admin-label" style="margin:0;" title="Visible en la web">👁</label>
          <input type="checkbox" class="srv-visible" data-i="${i}" ${visible?'checked':''} style="accent-color:var(--warm);">
        </div>
        <button onclick="deleteServicio(${i})" style="background:rgba(180,60,40,.4);border:none;color:#fff;padding:8px 12px;font-size:.6rem;letter-spacing:.1em;cursor:pointer;margin-top:16px;">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

function addServicio(){
  const data = loadServicios();
  data.push({icono:'📸', nombre:'Nuevo servicio', desc:'Descripción del servicio.', precio:'0 €'});
  localStorage.setItem('alr_servicios', JSON.stringify(data));
  saveConfigToFirebase('servicios', data);
  loadServiciosAdmin();
  renderServicios(data);
}

function deleteServicio(i){
  const data = loadServicios();
  data.splice(i, 1);
  localStorage.setItem('alr_servicios', JSON.stringify(data));
  saveConfigToFirebase('servicios', data);
  loadServiciosAdmin();
  renderServicios(data);
}

function saveServicios(){
  const data = loadServicios();
  document.querySelectorAll('.srv-nombre' ).forEach(el => { data[+el.dataset.i].nombre  = el.value; });
  document.querySelectorAll('.srv-icono'  ).forEach(el => { data[+el.dataset.i].icono   = el.value; });
  document.querySelectorAll('.srv-desc'   ).forEach(el => { data[+el.dataset.i].desc    = el.value; });
  document.querySelectorAll('.srv-precio' ).forEach(el => { data[+el.dataset.i].precio  = el.value; });
  document.querySelectorAll('.srv-visible').forEach(el => { data[+el.dataset.i].visible = el.checked; });
  localStorage.setItem('alr_servicios', JSON.stringify(data));
  saveConfigToFirebase('servicios', data);
  renderServicios(data);
  const msg = document.getElementById('servicios-msg');
  msg.textContent = 'Guardado ✓'; msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2500);
  localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));
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
      <div class="servicio-icono">${s.icono}</div>
      <h3 class="servicio-nombre">${s.nombre}</h3>
      <p class="servicio-desc">${s.desc}</p>
      <div class="servicio-precio"><span class="servicio-desde">Desde</span>${s.precio}</div>`;
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

function loadTestimoniosAdmin(){
  const list = document.getElementById('admin-testimonios-list');
  const data = loadTestimonios();
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  const toggle = document.getElementById('toggle-testimonios');
  if(toggle) toggle.checked = stored['testimonios'] !== false;

  list.innerHTML = '';
  data.forEach((t, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'background:rgba(245,242,237,.03);border:1px solid rgba(245,242,237,.08);padding:16px;border-radius:2px;';
    row.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 160px 200px auto;gap:10px;align-items:start;">
        <div><label class="admin-label">Testimonio</label><textarea class="admin-input tsm-texto" data-i="${i}" rows="3">${t.texto}</textarea></div>
        <div><label class="admin-label">Nombre / Empresa</label><input type="text" class="admin-input tsm-autor" data-i="${i}" value="${t.autor}"></div>
        <div><label class="admin-label">Proyecto / Fecha</label><input type="text" class="admin-input tsm-proyecto" data-i="${i}" value="${t.proyecto}"></div>
        <button onclick="deleteTestimonio(${i})" style="background:rgba(180,60,40,.4);border:none;color:#fff;padding:8px 12px;font-size:.6rem;letter-spacing:.1em;cursor:pointer;margin-top:16px;">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

function addTestimonio(){
  const data = loadTestimonios();
  data.push({texto:'Escribe aquí el testimonio del cliente.', autor:'Nombre del cliente', proyecto:'Tipo de proyecto · Año'});
  localStorage.setItem('alr_testimonios', JSON.stringify(data));
  saveConfigToFirebase('testimonios', data);
  loadTestimoniosAdmin();
  renderTestimonios(data);
}

function deleteTestimonio(i){
  const data = loadTestimonios();
  data.splice(i, 1);
  localStorage.setItem('alr_testimonios', JSON.stringify(data));
  saveConfigToFirebase('testimonios', data);
  loadTestimoniosAdmin();
  renderTestimonios(data);
}

function saveTestimonios(){
  const data = loadTestimonios();
  document.querySelectorAll('.tsm-texto'   ).forEach(el => { data[+el.dataset.i].texto    = el.value; });
  document.querySelectorAll('.tsm-autor'   ).forEach(el => { data[+el.dataset.i].autor    = el.value; });
  document.querySelectorAll('.tsm-proyecto').forEach(el => { data[+el.dataset.i].proyecto = el.value; });
  localStorage.setItem('alr_testimonios', JSON.stringify(data));
  saveConfigToFirebase('testimonios', data);
  renderTestimonios(data);
  const msg = document.getElementById('testimonios-msg');
  msg.textContent = 'Guardado ✓'; msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2500);
  localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));
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
      <p class="testimonio-texto">${t.texto}</p>
      <p class="testimonio-autor">${t.autor}</p>
      <span class="testimonio-proyecto">${t.proyecto}</span>`;
    grid.appendChild(d);
  });
  setTimeout(() => observeNewElements(document.querySelector('.testimonios-grid')), 50);
}

// Aplicar testimonios guardados al cargar
(function(){ const d = loadTestimonios(); if(localStorage.getItem('alr_testimonios')) renderTestimonios(d); })();

// ── ADMIN FINAL (SIMPLIFICADO) ───────────────────────────────────────────────
const ADMIN_HASH = '074c1cbd817a1e4a5754d93409a9a6fb340f457fd933d4602114149c311adea6';
const adminSeq = 'andrea';
let adminBuffer = '';
let _tapCount = 0, _tapTimer = null;

function openAdmin(){
  document.body.setAttribute('data-admin', 'true');

  const overlay = document.getElementById('admin-overlay');

  // Forzar reflow para animación suave
  overlay.style.display = 'flex';
  overlay.offsetHeight;

  document.getElementById('admin-login').style.display = 'block';
  document.getElementById('admin-panel').style.display = 'none';

  document.getElementById('admin-pass').value = '';
  document.getElementById('admin-error').style.display = 'none';

  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    document.getElementById('admin-pass').focus();
  }, 150);
}
function askAdminPass(){ openAdmin(); }

function closeAdmin() {
  auth.signOut().catch(() => {});
  const overlay = document.getElementById('admin-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => {
    document.body.removeAttribute('data-admin');
    overlay.style.opacity = '';
    document.body.style.overflow = '';
  }, 300);
}

async function checkPass(){
  const input = document.getElementById('admin-pass').value;
  const stored = localStorage.getItem('alr_pass');
  const inputHash = await sha256(input);

  let ok = false;
  if(stored){
    // Compatibilidad: acepta tanto hash SHA-256 como texto plano (legado)
    ok = (inputHash === stored) || (input === stored);
    // Auto-migrar contraseña de texto plano a hash
    if(ok && input === stored) localStorage.setItem('alr_pass', inputHash);
  } else {
    ok = inputHash === ADMIN_HASH;
  }
  if(ok){
    // Iniciar sesión anónima en Firebase para que las Security Rules permitan escribir
    auth.signInAnonymously().catch(e => console.warn('Firebase auth:', e));
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadStats();
    setTimeout(() => {
      const activeTab = document.querySelector('.admin-tab.active');
      if(activeTab) moveTabIndicator(activeTab);
    }, 60);
    // Auto-borrado silencioso + cargar selector de carpetas
    setTimeout(async () => {
      const deleted = await autoDeleteExpiredPhotos();
      if(deleted > 0){ renderPublicGallery(); renderAdminGallery(); }
      populateFolderSelector('newFolder');
    }, 400);
  } else {
    document.getElementById('admin-error').style.display = 'block';
    document.getElementById('admin-pass').value = '';
    document.getElementById('admin-pass').focus();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.nav-logo');

  if(!logo) return;

  function handleTap() {
    _tapCount++;
    clearTimeout(_tapTimer);

    _tapTimer = setTimeout(() => {
      if(_tapCount >= 3) askAdminPass();
      _tapCount = 0;
    }, 400);
  }

  // 👉 Móvil
  logo.addEventListener('touchend', handleTap);

  // 👉 PC
  logo.addEventListener('click', handleTap);
});

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

// ── INDICADOR Y TABS ─────────────────────────────────────
function moveTabIndicator(el) {
  const indicator = document.querySelector('.admin-tabs-indicator');
  if(!indicator) return;
  const parent = el.parentElement;
  const rect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  indicator.style.width = rect.width + 'px';
  indicator.style.transform = `translateX(${rect.left - parentRect.left}px)`;
}

function switchTab(id, el) {
  const contents = document.querySelectorAll('.admin-tab-content');
  const buttons = document.querySelectorAll('.admin-tab');

  contents.forEach(tab => {
    tab.classList.toggle('active', tab.id === id); // ✔
  });

  buttons.forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');

  moveTabIndicator(el);
  playTabSound();

  // Cargar contenido dinámico del tab
  if(id === 'tab-secciones') renderSectionsMenu();
  if(id === 'tab-config')    { loadTextosForm(); loadContactoForm(); }
  if(id === 'tab-tools')     loadMultimediaForm();
  if(id === 'tab-stats')     loadStats();
}

// Inicializar indicador al abrir el panel
document.addEventListener('DOMContentLoaded', () => {
  const active = document.querySelector('.admin-tab.active');
  if(active) moveTabIndicator(active);
});

// Sonido sutil al cambiar tab
function playTabSound() {
  const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
  audio.volume = 0.15;
  audio.play();
}

// ── CLOUDINARY ────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD  = 'dnof8srry';
const CLOUDINARY_PRESET = 'andrea_portfolio';

function uploadToCloudinary(file, onProgress){
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('folder', 'andrea-portfolio');

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`);

    xhr.upload.onprogress = e => {
      if(e.lengthComputable && onProgress){
        onProgress(Math.round(e.loaded / e.total * 100));
      }
    };

    xhr.onload = () => {
      if(xhr.status === 200){
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url); // ✅ SIEMPRE HTTPS
      } else {
        reject(new Error('Error al subir'));
      }
    };

    xhr.onerror = () => reject(new Error('Error de red'));
    xhr.send(fd);
  });
}

// ── ESTADO ──────────────────────────────────────────────────────────────────────────────
let pendingFile    = null;
let pendingFileUrl = null;
let pendingVideoUrl = null;

// ── SUBIDA Y GESTIÓN DE VÍDEOS ────────────────────────────────────────────────
function handleVideoDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  if(e.dataTransfer.files.length) handleVideoFile(e.dataTransfer.files[0]);
}

function handleVideoFile(file){
  if(!file) return;
  const status  = document.getElementById('vid-upload-status');
  const preview = document.getElementById('vid-cloudinary-preview');
  if(status){ status.textContent='Subiendo… 0%'; status.style.display='block'; }
  if(preview) preview.style.display='none';
  pendingVideoUrl = null;

  uploadToCloudinary(file, pct => {
    if(status) status.textContent = `Subiendo… ${pct}%`;
  }).then(url => {
    pendingVideoUrl = url;
    if(status){ status.textContent='✓ Vídeo listo. Añade los datos y pulsa Añadir ✓'; status.style.color='#c8b89a'; }
    // Thumbnail automático de Cloudinary
    if(preview){
      const thumb = url
        .replace('/video/upload/', '/video/upload/w_480,h_270,c_fill,so_0/')
        .replace(/\.[^.]+$/, '.jpg');
      preview.src = thumb;
      preview.style.display = 'block';
    }
  }).catch(() => {
    if(status){ status.textContent='Error al subir. Inténtalo de nuevo.'; status.style.color='#c87a6a'; }
    pendingVideoUrl = null;
  });
}

// ── DRAG & DROP HANDLER ───────────────────────────────────────────────────────
function handleDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  const files = e.dataTransfer.files;
  if(files.length) handleFiles(files);
}

// ── SUBIDA Y PREVIEW ──────────────────────────────────────────────────────────
function handleFiles(files){
  if(!files.length) return;

  const file = files[0];
  pendingFile = file;
  pendingFileUrl = null;

  const previewImg = document.getElementById('previewImg');
  const localUrl = URL.createObjectURL(file);

  if(previewImg) previewImg.src = localUrl;

  document.getElementById('newPhotoFields').style.display = 'block';

  const status = document.getElementById('upload-status') || document.createElement('p');
  status.id = 'upload-status';
  status.style.cssText = 'font-size:.72rem;color:#c8b89a;margin-top:10px;';
  status.textContent = 'Subiendo… 0%';
  document.getElementById('newPhotoFields').appendChild(status);

  uploadToCloudinary(file, pct => {
    status.textContent = `Subiendo… ${pct}%`;
  })
  .then(url => {
    pendingFileUrl = url;
    status.textContent = '✓ Lista para añadir';
    if(previewImg) previewImg.src = url;
  })
  .catch(() => {
    status.textContent = 'Error al subir';
    pendingFile = null;
  });
}

// ── GUARDAR FOTO ──────────────────────────────────────────────────────────────
async function addPhoto(){
  if(!pendingFileUrl){
    showAlert('La imagen aún se está subiendo. Espera un momento.', { title:'Espera', icon:'⏳' });
    return;
  }

  try {
    await db.collection("photos").add({
      src: pendingFileUrl,
      titulo: document.getElementById('newTitulo')?.value || '',
      cat: document.getElementById('newCat')?.value || 'fotografia',
      created: Date.now()
    });

    showAlert('Foto añadida correctamente.', { title:'¡Hecho!', icon:'🔥' });

    // Limpiar formulario
    pendingFile = null;
    pendingFileUrl = null;
    const preview = document.getElementById('previewImg');
    if(preview) preview.src = '';
    const titulo = document.getElementById('newTitulo');
    if(titulo) titulo.value = '';
    const status = document.getElementById('upload-status');
    if(status) status.remove();
    document.getElementById('newPhotoFields').style.display = 'none';

    renderAdminGallery();
    renderPublicGallery();
  } catch(e) {
    showAlert('Error al guardar la foto.', { title:'Error', icon:'✗' });
    console.error(e);
  }
}

// ── ADMIN GALLERY ───────────────────────────────────────────────────────────────────
async function renderAdminGallery(){
  const grid = document.getElementById('adminGallery');
  const noMsg = document.getElementById('noPhotosMsg');
  if(!grid) return;

  grid.innerHTML = '';

  try {
    const [snapshot, folders] = await Promise.all([
      db.collection('photos').orderBy('created','desc').get(),
      loadFolders()
    ]);

    if(snapshot.empty){
      if(noMsg) noMsg.style.display = 'block';
      return;
    }
    if(noMsg) noMsg.style.display = 'none';

    // Opciones de carpetas para el select
    const folderOpts = `<option value="">Sin carpeta</option>` +
      folders.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');

    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-photo';
      div.draggable = true;
      div.style.cssText = 'position:relative;overflow:hidden;border:1px solid rgba(245,242,237,.08);border-radius:2px;';
      div.innerHTML = `
        <div style="position:relative;aspect-ratio:1;">
          <img src="${esc(p.src)}" alt="${esc(p.titulo)}" style="width:100%;height:100%;object-fit:cover;">
          <div style="position:absolute;bottom:0;left:0;right:0;padding:8px;background:linear-gradient(transparent,rgba(0,0,0,.75));">
            <p style="font-size:.58rem;color:#f0ece4;font-weight:200;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.titulo) || 'Sin título'}</p>
            <p style="font-size:.48rem;color:rgba(200,184,154,.5);text-transform:uppercase;letter-spacing:.12em;">${esc(p.cat)}</p>
          </div>
          <button onclick="deletePhoto('${doc.id}')" style="position:absolute;top:6px;right:6px;background:rgba(180,60,40,.7);border:none;color:#fff;width:24px;height:24px;font-size:.6rem;cursor:pointer;border-radius:2px;">✕</button>
        </div>
        <div style="padding:6px 8px 8px;background:rgba(0,0,0,.25);display:flex;flex-direction:column;gap:5px;">
          <select
            onchange="assignPhotoToFolder('${doc.id}',this.value)"
            style="width:100%;background:rgba(245,242,237,.06);border:none;border-bottom:1px solid rgba(245,242,237,.12);color:#f0ece4;font-family:'Outfit',sans-serif;font-size:.55rem;font-weight:200;padding:4px 0;outline:none;">
            ${folderOpts}
          </select>
          <label style="display:flex;align-items:center;gap:5px;font-size:.48rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(200,184,154,.4);cursor:pointer;">
            <input type="checkbox" ${p.isPermanent?'checked':''} style="accent-color:var(--warm);width:11px;height:11px;"
              onchange="setPhotoPermanent('${doc.id}',this.checked)">
            Permanente
          </label>
        </div>`;

      // Marcar la carpeta actual en el select
      const sel = div.querySelector('select');
      if(sel && p.folderId) sel.value = p.folderId;

      grid.appendChild(div);
    });
  } catch(e) {
    console.error('Error cargando galería admin:', e);
  }
}

async function assignPhotoToFolder(photoId, folderId){
  try {
    await db.collection('photos').doc(photoId).update({ folderId: folderId || null });
    invalidateFoldersCache();
    renderPublicGallery();
    // Actualizar filtros públicos por si la carpeta es pública
    loadPublicFolderFilters();
  } catch(e){
    showAlert('Error al asignar carpeta.', { title:'Error', icon:'✗' });
    console.error(e);
  }
}

async function setPhotoPermanent(photoId, isPermanent){
  try {
    await db.collection('photos').doc(photoId).update({ isPermanent });
  } catch(e){
    console.error('Error actualizando permanente:', e);
  }
}

// ── BORRAR ────────────────────────────────────────────────────────────────────
function deletePhoto(docId){
  showConfirm('Esta foto se eliminará de forma permanente.', async () => {
    try {
      await db.collection("photos").doc(docId).delete();
      renderAdminGallery();
      renderPublicGallery();
    } catch(e) {
      showAlert('Error al eliminar la foto.', { title:'Error', icon:'✗' });
      console.error(e);
    }
  }, { title:'Eliminar foto', icon:'🗑' });
}

// ── GALERÍA PÚBLICA ───────────────────────────────────────────────────────────
async function renderPublicGallery(){
  const grid = document.getElementById('galleryGrid');
  if(!grid) return;
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:.72rem;color:#7a7068;font-weight:200;padding:40px 0;">Cargando galería…</p>';

  try {
    const snapshot = await db.collection("photos")
                             .orderBy("created", "desc")
                             .get();
    grid.innerHTML = '';

    snapshot.forEach((doc, i) => {
      const p = doc.data();
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.dataset.cat    = p.cat || 'fotografia';
      div.dataset.index  = i;
      div.dataset.titulo = p.titulo || '';
      div.dataset.desc   = '';

      div.innerHTML = `
        <img src="${esc(p.src)}" alt="${esc(p.titulo)}">
        <div class="gallery-item-overlay"><span class="gallery-item-label">${esc(p.titulo)}</span></div>
      `;

      // Click para abrir lightbox
      div.addEventListener('click', () => {
        buildLightboxItems();
        const idx = lightboxItems.indexOf(div);
        if(idx >= 0) openLightbox(idx);
      });
      div.addEventListener('mouseenter', () => setCursorView('Ver'));
      div.addEventListener('mouseleave', () => setCursorView(null));

      grid.appendChild(div);
    });

    // Re-aplicar filtro activo
    if(typeof activeFilter !== 'undefined') applyFilter(activeFilter);
  } catch(e) {
    console.error('Error cargando galería pública:', e);
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────────────
renderAdminGallery();
renderPublicGallery();
renderPublicVideos();
loadConfigFromFirebase();

// ──────────────────────────────────────────────────────────────────────────────
// MÓDULO: CARPETAS, GALERÍA AVANZADA, VISTA ÁLBUM, ZIP, AUTO-BORRADO
// ──────────────────────────────────────────────────────────────────────────────

// ── CARPETAS ─────────────────────────────────────────────────────────────────────
let _foldersCache = null;

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

async function createFolder(){
  const input = document.getElementById('new-folder-name');
  const name  = input?.value.trim();
  if(!name){ showAlert('Pon un nombre a la carpeta.', {title:'Nombre requerido', icon:'📁'}); return; }
  try{
    await db.collection('folders').add({ name, token: genToken(), isPublic: false, allowDownload: false, created: Date.now() });
    invalidateFoldersCache();
    if(input) input.value = '';
    await loadFoldersAdmin();
    await loadPublicFolderFilters();
  } catch(e){
    console.error('Error creando carpeta:', e);
    showAlert('Error al crear la carpeta. Asegúrate de estar conectado y haber iniciado sesión en el panel.', {title:'Error', icon:'✗'});
  }
}

async function deleteFolder(id){
  showConfirm('Las fotos de esta carpeta no se eliminarán, solo se desasignarán.', async () => {
    const snap = await db.collection('photos').where('folderId','==',id).get();
    const batch = db.batch();
    snap.forEach(doc => batch.update(doc.ref, { folderId: null }));
    await batch.commit();
    await db.collection('folders').doc(id).delete();
    invalidateFoldersCache();
    await loadFoldersAdmin();
    await loadPublicFolderFilters();
  }, { title:'Eliminar carpeta', icon:'📁' });
}

async function renameFolder(id, newName){
  if(!newName.trim()) return;
  await db.collection('folders').doc(id).update({ name: newName.trim() }).catch(()=>{});
  invalidateFoldersCache();
  await loadPublicFolderFilters();
}

async function toggleFolderPublic(id, isPublic){
  await db.collection('folders').doc(id).update({ isPublic });
  invalidateFoldersCache();
  await loadPublicFolderFilters();
}

async function toggleFolderDownload(id, allowDownload){
  await db.collection('folders').doc(id).update({ allowDownload });
  invalidateFoldersCache();
}

async function loadFoldersAdmin(){
  const list = document.getElementById('tool-carpetas-list');
  if(!list) return;
  const folders = await loadFolders();

  // Contar fotos por carpeta
  const snap = await db.collection('photos').get();
  const counts = {};
  snap.forEach(doc => { const fid = doc.data().folderId; if(fid) counts[fid] = (counts[fid]||0)+1; });

  list.innerHTML = '';

  if(!folders.length){
    list.innerHTML = '<p style="font-size:.75rem;color:#7a7068;text-align:center;padding:20px 0;">¡Crea tu primera carpeta!</p>';
    return;
  }

  folders.forEach(f => {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
          <input type="text" value="${esc(f.name)}" class="admin-input" style="flex:1;max-width:180px;"
            onblur="renameFolder('${f.id}',this.value)">
          <span style="font-size:.55rem;color:#7a7068;letter-spacing:.1em;white-space:nowrap;">${counts[f.id]||0} fotos</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <label class="folder-toggle">
            <input type="checkbox" ${f.isPublic?'checked':''}
              onchange="toggleFolderPublic('${f.id}',this.checked)">
            Pública
          </label>
          <label class="folder-toggle">
            <input type="checkbox" ${f.allowDownload?'checked':''}
              onchange="toggleFolderDownload('${f.id}',this.checked)">
            Descarga
          </label>
          <button class="admin-btn" onclick="showFolderQRFromBtn(this)" data-id="${f.id}" data-token="${f.token}" style="font-size:.52rem;padding:6px 12px;" title="${esc(f.name)}">QR</button>
          <button onclick="deleteFolder('${f.id}')" style="background:rgba(180,60,40,.4);border:none;color:#fff;padding:6px 12px;font-size:.55rem;cursor:pointer;">✕</button>
        </div>
      </div>`;
    list.appendChild(row);
  });
}

// Llamado desde onclick del botón QR en carpetas (usa title como nombre para evitar problemas de encoding)
function showFolderQRFromBtn(btn){
  showFolderQR(btn.dataset.id, btn.title, btn.dataset.token);
}

function showFolderQR(id, name, token){
  const url    = `${location.origin}?album=${token}`;
  const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1a1714&margin=10`;
  const m = document.getElementById('folder-qr-modal');
  if(!m) return;
  document.getElementById('qr-folder-name').textContent = name;
  document.getElementById('qr-img').src = qrSrc;
  document.getElementById('qr-url').value = url;
  const dl = document.getElementById('qr-download-link');
  if(dl) dl.href = qrSrc;
  // Mostrar modal (el estilo inline opacity:0 tiene que sobreescribirse)
  m.style.display = 'flex';
  m.style.opacity = '1';
}

function closeFolderQR(){
  const m = document.getElementById('folder-qr-modal');
  if(!m) return;
  m.classList.remove('open');
  m.style.opacity = '0';
  setTimeout(() => { m.style.display = 'none'; m.style.opacity = ''; }, 280);
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('folder-qr-modal')?.addEventListener('click', e => {
    if(e.target.id === 'folder-qr-modal') closeFolderQR();
  });
});

function copyQrUrl(){
  const val = document.getElementById('qr-url')?.value;
  if(!val) return;
  navigator.clipboard.writeText(val).then(() => {
    const btn = document.getElementById('qr-copy-btn');
    if(btn){ btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = 'Copiar', 2000); }
  }).catch(() => showAlert('No se pudo copiar. Copia manualmente el enlace.', {title:'Copiar', icon:'🔗'}));
}

async function loadPublicFolderFilters(){
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
}

async function populateFolderSelector(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const folders = await loadFolders();
  // Limpiar options (excepto "Sin carpeta")
  while(sel.options.length > 1) sel.remove(1);
  folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    sel.appendChild(opt);
  });
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
        if(p.cat !== activeFilter) return false;
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
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:.75rem;color:#7a7068;font-weight:200;padding:40px 0;">No hay fotos en esta categoría.</p>';
    updateGalleryFooter(0, 0);
    return;
  }

  slice.forEach((p, i) => {
    const div = document.createElement('div');
    div.className      = 'gallery-item';
    div.dataset.cat    = p.cat || 'fotografia';
    div.dataset.folder = p.folderId || '';
    div.dataset.index  = i;
    div.dataset.titulo = p.titulo || '';
    div.innerHTML = `
      <img src="${esc(p.src)}" alt="${esc(p.titulo||'')}">
      <div class="gallery-item-overlay"><span class="gallery-item-label">${esc(p.titulo||'')}</span></div>`;
    div.addEventListener('click', () => {
      buildLightboxItems();
      const idx = lightboxItems.indexOf(div);
      if(idx >= 0) openLightbox(idx);
    });
    div.addEventListener('mouseenter', () => setCursorView('Ver'));
    div.addEventListener('mouseleave', () => setCursorView(null));
    grid.appendChild(div);
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
  if(counter) counter.textContent = `${showing} de ${total} fotos`;
  if(btn)     btn.style.display   = showing < total ? 'inline-block' : 'none';
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

// Sobreescribir renderPublicGallery para usar el nuevo sistema de caché
async function renderPublicGallery(){
  const grid = document.getElementById('galleryGrid');
  if(!grid) return;
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:.72rem;color:#7a7068;font-weight:200;padding:40px 0;">Cargando galería…</p>';
  try {
    const snap = await db.collection('photos').orderBy('created','desc').get();
    _allGalleryPhotos = [];
    snap.forEach(doc => _allGalleryPhotos.push({ id: doc.id, ...doc.data() }));
    _galleryPage = 0;
    await loadPublicFolderFilters();
    renderGalleryPage();
  } catch(e){ console.error('Error galería:', e); }
}

// Actualizar applyFilter para que funcione con carpetas
const _origApplyFilter = applyFilter;
function applyFilter(filter){
  activeFilter = filter;
  document.querySelectorAll('.gallery-filter button').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  _galleryPage = 0;
  renderGalleryPage();
}

// ── VISTA ÁLBUM CLIENTE ──────────────────────────────────────────────────────────────
let _albumPhotos = [];
let _albumFolder = null;

async function checkAlbumMode(){
  const token = new URLSearchParams(location.search).get('album');
  if(!token) return;
  await openAlbumView(token);
}

async function openAlbumView(token){
  const view = document.getElementById('album-view');
  if(!view) return;

  // Buscar carpeta por token
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

  // Cargar fotos de la carpeta
  const photosSnap = await db.collection('photos').where('folderId','==',_albumFolder.id).orderBy('created','desc').get();
  _albumPhotos = [];
  photosSnap.forEach(doc => _albumPhotos.push({ id: doc.id, ...doc.data() }));

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
      ? `<a href="${esc(p.src.replace('/upload/', '/upload/fl_attachment/'))}" download class="album-photo-dl" onclick="event.stopPropagation()" title="Descargar">⬇</a>`
      : '';
    div.innerHTML = `
      <img src="${esc(p.src)}" alt="${esc(p.titulo||'')}">
      <div class="gallery-item-overlay">
        <span class="gallery-item-label">${esc(p.titulo||'')}</span>
        ${dlHtml}
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

// ── AUTO-BORRADO DE FOTOS ANTIGUAS ───────────────────────────────────────────────
function loadAvanzadoForm(){
  const cfg  = JSON.parse(localStorage.getItem('alr_config_extra')||'{}');
  const input = document.getElementById('txt-autodelete');
  if(input) input.value = cfg.autoDeleteDays !== undefined ? cfg.autoDeleteDays : 365;
}

function saveAvanzado(){
  const days = parseInt(document.getElementById('txt-autodelete')?.value || '365');
  const cfg  = JSON.parse(localStorage.getItem('alr_config_extra')||'{}');
  cfg.autoDeleteDays = isNaN(days) ? 365 : days;
  localStorage.setItem('alr_config_extra', JSON.stringify(cfg));
  saveConfigToFirebase('configExtra', cfg);
  const msg = document.getElementById('avanzado-msg');
  if(msg){ msg.textContent = 'Guardado ✓'; msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500); }
}

async function autoDeleteExpiredPhotos(){
  try{
    const cfg  = JSON.parse(localStorage.getItem('alr_config_extra')||'{}');
    const days = cfg.autoDeleteDays !== undefined ? parseInt(cfg.autoDeleteDays) : 365;
    if(!days || days <= 0) return 0;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const snap   = await db.collection('photos').where('created','<',cutoff).get();
    let deleted  = 0;
    const batch  = db.batch();
    snap.forEach(doc => {
      if(!doc.data().isPermanent){ batch.delete(doc.ref); deleted++; }
    });
    if(deleted > 0) await batch.commit();
    return deleted;
  } catch(e){ console.warn('Auto-borrado error:', e); return 0; }
}

async function manualCleanExpired(){
  const msg = document.getElementById('avanzado-msg');
  if(msg){ msg.textContent = 'Limpiando…'; msg.style.display = 'block'; }
  const deleted = await autoDeleteExpiredPhotos();
  if(deleted > 0){
    renderPublicGallery();
    renderAdminGallery();
  }
  if(msg){
    msg.textContent = deleted > 0 ? `✓ ${deleted} foto${deleted>1?'s':''} eliminada${deleted>1?'s':''}` : 'No hay fotos a eliminar';
    setTimeout(() => msg.style.display = 'none', 3000);
  }
}

// Actualizar addPhoto para guardar folderId (reemplaza la función original por hoisting)
async function addPhoto(){
  const folderId = document.getElementById('newFolder')?.value || null;
  // Temporalmente parchear db.collection para inyectar folderId
  const _orig = db.collection.bind(db);
  const _addFn = window._pendingAddPhoto;
  // Delegar al original pero añadir folderId al documento
  if(!pendingFileUrl){ showAlert('La imagen aún se está subiendo. Espera un momento.', { title:'Espera', icon:'⏳' }); return; }
  try {
    await db.collection('photos').add({
      src:      pendingFileUrl,
      titulo:   document.getElementById('newTitulo')?.value || '',
      cat:      document.getElementById('newCat')?.value || 'fotografia',
      folderId: folderId || null,
      isPermanent: false,
      created:  Date.now()
    });
    showAlert('Foto añadida correctamente.', { title:'¡Hecho!', icon:'🔥' });
    pendingFile = null;
    pendingFileUrl = null;
    const preview = document.getElementById('previewImg');
    if(preview) preview.src = '';
    const titulo = document.getElementById('newTitulo');
    if(titulo) titulo.value = '';
    const folderSel = document.getElementById('newFolder');
    if(folderSel) folderSel.value = '';
    const status = document.getElementById('upload-status');
    if(status) status.remove();
    document.getElementById('newPhotoFields').style.display = 'none';
    renderAdminGallery();
    renderPublicGallery();
  } catch(e) {
    showAlert('Error al guardar la foto.', { title:'Error', icon:'✗' });
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
        // Comprobar actualizaciones al volver a la pestaña
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

// Redefinir loadStats con visitas incluidas
async function loadStats(){
  const guardado = localStorage.getItem('alr_ultimo_cambio') || '—';
  const visitas  = localStorage.getItem('alr_visitas') || '1';
  const wrap = document.getElementById('admin-stats-wrap');
  if(!wrap) return;

  // Contar fotos y vídeos desde Firestore
  let fotos = 0, videos = 0;
  try {
    const [fSnap, vSnap] = await Promise.all([
      db.collection('photos').get(),
      db.collection('videos').get()
    ]);
    fotos = fSnap.size;
    videos = vSnap.size;
  } catch(e) { console.warn('Error contando:', e); }

  wrap.innerHTML = `
    <div class="admin-stat"><div class="admin-stat-num">${fotos}</div><div class="admin-stat-label">Fotos</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${videos}</div><div class="admin-stat-label">Vídeos</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${visitas}</div><div class="admin-stat-label">Visitas*</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="font-size:.9rem;">${guardado}</div><div class="admin-stat-label">Último cambio</div></div>
    <div style="grid-column:span 3;font-size:.52rem;color:#7a7068;letter-spacing:.15em;text-transform:uppercase;padding-top:4px;">* Solo cuenta visitas en este navegador</div>
  `;
  // Animar números
  setTimeout(() => {
    document.querySelectorAll('.admin-stat-num').forEach(el => {
      const val = parseInt(el.textContent);
      if(!isNaN(val) && val > 0 && el.textContent.length < 6) animateNumber(el, val, 900);
    });
  }, 80);
}

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

// [renderServicios ya incluye observeNewElements]
// [renderTestimonios ya incluye observeNewElements]
document.querySelectorAll('#proceso .proceso-step').forEach(el => revealObs.observe(el));

// Siempre empezar con filtro "all" al cargar
localStorage.removeItem('alr_filter');
applyFilter('all');

// ── VALIDACIÓN FORMULARIO EN TIEMPO REAL ─────────────────────────────────────
(function(){
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
})();

// ── LAZY LOADING IMÁGENES ─────────────────────────────────────────────────────
(function(){
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
})();

// ── SONIDO AMBIENTE MEJORADO CON REVERB ──────────────────────────────────────
function initAmbient(){
  try{
    const ctx = ambientCtx;
    const master = ctx.createGain();
    master.gain.value = 0;
    ambientGain = master;

    // Reverb sintético
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

// ── CONTACTO — LOAD Y SAVE ────────────────────────────────────────────────────
function loadContactoForm(){
  const d = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const get = id => document.getElementById(id);
  if(get('txt-email-recepcion')) get('txt-email-recepcion').value = d.emailRecepcion || 'diegomdz19@hotmail.com';
  //if(get('txt-instagram'))  get('txt-instagram').value  = d.instagram || 'andrealopz___'; viejo
  if(get('txt-instagram')) get('txt-instagram').value = d.instagram || '';  
  if(get('txt-email'))      get('txt-email').value      = d.email     || '';
  if(get('txt-telefono'))   get('txt-telefono').value   = d.telefono  || '';
  if(get('txt-whatsapp'))   get('txt-whatsapp').value   = d.whatsapp  || '';
  if(get('txt-zona'))       get('txt-zona').value       = d.zona      || 'Disponible para proyectos · España';
  if(get('txt-watermark'))  get('txt-watermark').value  = d.watermark || '© Andrea López';
  if(get('txt-newpass'))    get('txt-newpass').value    = '';
  if(get('txt-newpass2'))   get('txt-newpass2').value   = '';
}

function saveContacto(){
  const get = id => document.getElementById(id);
  const np  = get('txt-newpass')?.value  || '';
  const np2 = get('txt-newpass2')?.value || '';
  const msg = get('contacto-msg');
  if(np && np !== np2){
    if(msg){ msg.textContent='Las contraseñas no coinciden.'; msg.style.color='#c87a6a'; msg.style.display='block'; }
    return;
  }
  const d = {
    emailRecepcion: get('txt-email-recepcion')?.value.trim() || 'diegomdz19@hotmail.com',
    instagram:      get('txt-instagram')?.value.trim()  || 'andrealopz___',
    email:          get('txt-email')?.value.trim()      || '',
    telefono:       get('txt-telefono')?.value.trim()   || '',
    whatsapp:       get('txt-whatsapp')?.value.trim()   || '',
    zona:           get('txt-zona')?.value.trim()       || 'Disponible para proyectos · España',
    watermark:      get('txt-watermark')?.value.trim()  || '© Andrea López',
  };
  localStorage.setItem('alr_contacto', JSON.stringify(d));
  localStorage.setItem('alr_email_destino', d.emailRecepcion);
  if(np) sha256(np).then(h => localStorage.setItem('alr_pass', h));
  saveConfigToFirebase('contacto', d);
  applyContacto(d);
  applyWatermark();
  localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));
  if(msg){ msg.textContent='Guardado correctamente ✓'; msg.style.color='#c8b89a'; msg.style.display='block'; setTimeout(()=>msg.style.display='none',3000); }
} 

// ── SONIDO OBTURADOR ─────────────────────────────────────────────────────────
// ── SONIDO OBTURADOR — ARCHIVO WAV REAL ─────────────────────────────────────
const _shutterB64 = 'data:audio/mp3;base64,SUQzBAAAAAABblRFTkMAAAAYAAADWk9PTSBIYW5keSBSZWNvcmRlciBIMQBURFJDAAAADAAAAzIwMTMtMDMtMjUAVFhYWAAAAGQAAANjb2RpbmdfaGlzdG9yeQBBPVBDTSxGPTQ0MTAwLFc9MjQsTT1zdGVyZW8sVD1aT09NIEhhbmR5IFJlY29yZGVyIEgxDQpBPVBDTSxGPTQ0MTAwLFc9MzIsTT1zdGVyZW8NCgBUWFhYAAAAGwAAA3RpbWVfcmVmZXJlbmNlADMwNDMzNDEwMDAAVFNTRQAAAA8AAANMYXZmNjAuMTYuMTAwAAAAAAAAAAAAAAD/83AAAAAAAAAAAAAAAAAAAAAAAABJbmZvAAAADwAAAB8AAA1dABUVFR0dHSUlJSwsLDQ0NDQ8PDxERERMTExTU1NTW1tbY2Nja2trc3Nze3t7e4KCgoqKipKSkpqampqioqKqqqqxsbG5ubnBwcHBycnJ0dHR2NjY4ODg4Ojo6PDw8Pj4+P///wAAAABMYXZjNjAuMzEAAAAAAAAAAAAAAAAkA2kAAAAAAAANXX7VZ8wAAAAAAP/zQGQABYxVDgAYAyIE+AYsAAiEABhNP/mEM9ysIOBu7gCYQAEIiaAAAAAAIBmfh8P+CBzKAh1g+BFDgiD/ggCF7DFYf+D4WOQ/y4WOfg4c8h/qOYgVUU3OJi57/yAhP9BgmuqBQt/d//NCRBIEiIcaAKKUAAtZXjABSygAvZv7KMmHOpL/ygMhoEOk+LfFkRAHrdBUPc9//+83AXTe/kYCkEBFZREKAAciIKKW/ogz6N//cT+W1RbRR95McgAMxRQ+oeQWjoZrssh54I6E252p//NAZBQGSH0qoMKgAAnpAlQBhRgAmQXvXl/ij/xpXEDa9BU87pcXC5d9f3Zypnuv6636zqii6PFIZ/BLw8OI3bUaArn+v6Z/ar8hUjJQXfpemIClf/KJ//o60///g7R4SRuOf7/dzDr/80JkDQcNH1IAwSgAh+kCmAGBOABjit9oX5EPCw+KAFhB/ydDD88fCKPR0T/56WSlDDirmEY+//me/9WNMLwvn//z5haNy3+/+YlW/kxxlHAsLh3yhmp5H/cUsrb/+ikXD9/tFSOgAdv/80BkCQaEW1Ev4ogAB6Be0l/CEAIvzCUpQg5QiKgcuc5SlEfaitUKRxEeoEoKvJOwaCjAa9WsS/bgZ0sltES1jYfz8CAAbgDny/hnlBVKwMNLB0NBD/pZ//////1cqrV0+vQQKHQ6CP/zQmQJBjSLNACiiAAIQF59lUIYAD32r6O+eRhi3YKdgAAFgjgkAFAq8Sxwi4hCawCDXsrcOcpiZ2Wr+lNIIV/B3gH6f+owUKQd9e0F4VqF29DV+X3WAp/drHU237dF//l6nvuqP9LH/v/zQGQKBskpTADAnAAGwAKMKYAQANee/WqvljhspD+2fyZAmMsPhP/18y55EXl4jkyJIbf/9t9/PNNYmUHxoMEjOtkP+fWwBdtL4jcNVoIm3/UN3r/6T1z//+0HlQM/7lECB/9vaUzC//NCZAsGZO1qKcAIAAcwUvZZgRgCdEqoRxDDiPQRZGILAAgcIG6dXO1UCmAimFFcV/2znbVnMx3EBcI/y4HH///2+ADkYAA9PjIJGcCBsZBECFHg+0N/7qsgdoAACFhmh2dm+wb0gkAA//NAZA8HKHOdj8KMAQeo2vpZjRACAe0H/8ToSUQmmz5pvVYjpIMgQHASUGbsNhXB0B/y/a3SDAEdMVW/rD36dsAMLQxWGKgAAAUXEi4bjfrS1GVPf5zpVvV/5znB0YAJdbJHGgoABPT/80JkCgW8P4l+6QwBBbBe8kHUEAMbFG39y469R903TdlNIFArg2DhE+ALCggNgWz2v1f/K7P/2dn4/tgAAomAyAEnVf1GxipJJN1mJgnS0rwKuYeHf62gNEA1lZD/ZR42O7I1oot3MJH/80BkGQXYPaGMpowBBihG2wFSAAFHkQ60yxAwguraMupWPDqBhUZdii+m8C8p4AAAPIDYCOJBS+tJJM2OoFMCSUJYNXiId4h/7td3dJYwoGAAAEXjlQDNOe1doN9o8sfagmKsFZmQkv/zQmQkCkCjkX/GGAEGMBcSWYwQAonP1j94NT7T0QjkFo0/fPnCM9/vPn1//r/HJoCczLEjvy4fBCWKxKIj39wQMhjbDXbAQAQCgAAAC3jny1U44ZKOyhz5X1BVAEgkEkQBLtQQ/Sj4uf/zQGQNB+DvfyjBFAAF+Hb64YMQABceEg/vWMFRFHLxo0OlM61tFQ7cSZ1+k4dDilF19S7tXFhmaxRn9P9kKNc10ES7reVpmYeZWJvFAAAmHl2qJzdRKtinZSt0AD3UaHZ0sjciTwDL//NCZAkF/B2LfuGIAQYgPub5wxAA6uaklYdpYCH3oNi4BC0bDLhrw5TNIiKNJ7Rp9yK/e44cU7r62aMnW3ErdwBABB1fUxC16QuSSRxbFwD//sFjNb7XlvZbISsAp7lh/9FZ+1NXP0+W//NAZBQF3ImBfqGIAAZ4aucRQxAA6OWUXZiOhqaer7Kazw8zSn/4UuvTULCXW6jVPZkRDgAGACXAHCgZ3CBadxBBaMquMbv//mHUbaXOZyoRuJBMWAAZm/+F0J7uSQjnGEuxQqOFFhH/80JkHghwu4MuwwgBBdgO6vGDAACBlas4x39DYxwYgFdUHrq4UNMRpS2//UiRBHHhcBM8LDYxTU9hmZCZBXAUThAYAAM4h8gxQEfv1NLUW8pSAAggwggAWKeb7hXsVIfjU7+xwLhV/iX/80BkFwbY9TgpwpwACTlacBGFKACJALQoAV/844IhHLFf/8iKhqwpPMLj3//5I2pY2PIeWQgQEhfwFXyBfqxv6t+jm/5WKgl/5BYSEhcCp//qIBNgi/9T7UXAAf/////////2KQVWAf/zQmQOAVgC/gPgAAEGoAWoNcAAAP/Yj//9sy5CJqMsagu7SXsWbQuhpb9qVQSgF92n/+//e3k0tF5P3fh1jGtaugqdS1G88ZAFtAA///////0r0p+v+Rt7FA/gAAf/////9y6LNVH1zf/zQGQ8A3ACzgksAAAEWAHEHgDGAPymNanEciR3iZLvJPd0W1Fk2XbmAZ2nco82ptSertoTpAvfngtVgAAo1AAf/////7/Z/QLZ6dHjmf7Vip7AA///7//XTYj1+fWcsRcTpVWljHar//NCZGICyATYCxwAAAd4AZQAAAAANSVqqvAA/////Wyzxuj0+/YPl+6oDp9W9LIfuRY+M6dPq10MYBBRqar3pD1j/HVqKXDrHg0ii5TaAACKIIIOMQGaSRLPWPXuAxwsuXxxjnBSQmQA//NARIECpAL4rwQiAQaQCag0OAAA0OORE3Cphvjk9PPBbC4iPT5fN004LQSgkRkG/8wLjMmnErJo4xlj0HoJl/0zeg2zFE3E7LiyXQWJ///X/+Qy4dN0B4GblAvnwGyN4eH+Y+jBMP//80JkpALEBNYKo4AAB9gBmAtAAAB8omM/YNEPqchBUgv/JkV6//7UZ0b//871fjv/5cgQOGL7/vHeHbaDAACsn74O0/yGWVRhx1ow55q01az1cLEHHxH6tcoqE97Ax9bsGGciuN9Lu4P/80BkwgxpKTzJxrQACuHCgCmFKAAkb7x/47HIqmS7z5rLrNsfP1vywIUtGxdqs08Y+Lfwc////9ROEOSW7x/eVV/vTuwrrdv/6J/7BmEAACua20FQKHDByIBkP2oJBCCkStnYRm+LAP/zQmSGDHz7YMrDPAAJ6NrWWYIQAAwkDqPeqpX1vXK/8MJTCBOOUOEwfAPYGosYTACIFFiCbU+glHB+LjVJJVr5PDggXBpSRIhPOqpjhe7lx68/M/9/fNwWKMNGHfzX/////mjzjbeNZf/zQGROCc0DTgDDIAALwIKYy4YwAGH/LJIBWdTz/zH1MScMx1pQrT8CJz4pmwRa5BEMqHLBISFnMctb2wzv6tppPq/CNVgqqX+xhSDCmYKQZ1jHFCgICJLYMAkIg7Ex4Ff5U7V6sRP4//NCZCMEeE0+AOGMAAd4bnABwwgAa2OHdv9YYUTIKUmZnCh09KuBV0OiJ+GxKCoKuPa8qgEJEE0E1bnmoYGDRyMmv5qyhgYIEHBMy7mRZnFG////xQF91tkq+gABhIaqFU1oZlhXFWcV//NAZDUEKEzoABgDIAhYBem+EIYAFtQv1t/qr/9Yp2f4sK3gD8AB////1L////ZZT//WAQeYB///6Uf/G/lFR+5f/uZvKJpUHAE//N0f6Onp/rr6K/gSp+I11zK0WpUlIywBo////0P/80JkRQH8AuoPBAAABUABsFQIRpiZZjVOpJbP1/eUsK/tTYAAALQAC////////5b2Jzqj3rHCeWtz1lXdDO/Z89ks7+p7sCo7OuHYdrAUkAh6VcY5wAAoHCskbhPNldMoYE4JxVn9Quz/80BkdAMMBM4FKCIABVABpBQYxpjFepv///8WFxHWKi3S5ILCwEAFAFAwHs9v/7P//i5MQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqv/zQmSZAlAC8q8EIgEHMAGQCghEJKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqv/zQGS9BMwolmYkAzADYAFeWABGAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
let _shutterBuf = null;

function playShutter(){
  try{
    const ctx = getAudioCtx();
    if(!_shutterBuf){
      fetch(_shutterB64).then(r=>r.arrayBuffer()).then(ab=>ctx.decodeAudioData(ab,buf=>{_shutterBuf=buf;_doShutter(ctx,buf)}));
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
  requestAnimationFrame(()=>{ flash.style.transition='opacity .12s'; flash.style.opacity='0'; });
  setTimeout(()=>flash.remove(), 200);
}

// Sonido hover sobre imágenes (foco confirmado)
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

// Integrar obturador directamente — sin _orig

// ── FOTOS POR HORA DEL DÍA ────────────────────────────────────────────────────
(function(){ try {
  const h = new Date().getHours();
  // 6-10: mañana → dron (luz limpia, aérea)
  // 10-15: mediodía → fotografia (luz dura, producto/detalles)
  // 15-20: tarde/hora dorada → retrato (luz cálida)
  // 20-6: noche → dron (luces artificiales)
  const hourMap = [
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

  // Mostrar label de hora en el hero
  const hero = document.querySelector('.hero-right');
  if(hero){
    const tag = document.createElement('p');
    tag.style.cssText = 'font-size:.52rem;letter-spacing:.28em;text-transform:uppercase;color:rgba(200,184,154,.4);font-weight:200;margin-top:16px;opacity:0;animation:fadeUp .6s 1.4s forwards;';
    tag.textContent = label;
    hero.appendChild(tag);
  }

  // No aplicar filtro automático — siempre empieza en "todos"
  } catch(e){ console.warn('hour filter error:', e); }
})();

// ── FRASE INSPIRACIONAL BAJO LA GALERÍA ────────────────────────────────────
(function(){ try {
  const frases = [
    '"Cada encuadre es una decisión."',
    '"La luz no espera — el fotógrafo sí."',
    '"Ver es fácil. Mirar es un arte."',
    '"El instante antes del instante."',
    '"La mejor foto es la que aún no has hecho."',
  ];
  // Una frase distinta cada día
  const frase = frases[new Date().getDate() % frases.length];
  const galeria = document.getElementById('galeria');
  if(!galeria) return;

  // Insertar al final de la sección galería, antes del cierre
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
// Aparece en el hero como dato técnico contextual — cambia cada día
(function(){ try {
  const datos = [
    { exp:'f/1.4', vel:'1/500s', mm:'85mm', iso:'ISO 200' },
    { exp:'f/2.8', vel:'1/320s', mm:'50mm', iso:'ISO 400' },
    { exp:'f/8',   vel:'1/60s',  mm:'24mm', iso:'ISO 100' },
    { exp:'f/1.8', vel:'1/1000s',mm:'35mm', iso:'ISO 640' },
    { exp:'f/4',   vel:'1/250s', mm:'70mm', iso:'ISO 800' },
  ];
  const d = datos[new Date().getDate() % datos.length];

  // Insertar en el hero junto a los controles
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
  tag.title = 'Parámetros de la sesión del día — cambia cada 24h';
  document.querySelector('#hero') && document.querySelector('#hero').appendChild(tag);
  } catch(e){ console.warn('dato f error:', e); }
})();

// ── CURSOR CON ESTADOS CONTEXTUALES ──────────────────────────────────────────
(function(){
  let focusTimer = null;
  let isOverImage = false;

  // Sonido de foco al detenerse 1.2s sobre imagen
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
document.addEventListener('DOMContentLoaded', () => {
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
});

// ── FOOTER WHATSAPP E INSTAGRAM ───────────────────────────────────────────────
(function(){
  const d = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const fw = document.getElementById('footer-whatsapp');
  const fwh = document.getElementById('footer-whatsapp-handle'); // span donde se mostrará el número

  if (fw && d.whatsapp) {
    const cleanNumber = d.whatsapp.replace(/\D/g,''); // solo dígitos
    fw.href = `https://wa.me/${cleanNumber}`;         // link funcional

  // Formatear número legible (ej: +34 612 345 678)
  let formattedNumber = d.whatsapp;
  if (cleanNumber.length >= 9) {
    const country = cleanNumber.slice(0, cleanNumber.length - 9);
    const part1 = cleanNumber.slice(-9, -6);
    const part2 = cleanNumber.slice(-6, -3);
    const part3 = cleanNumber.slice(-3);
    formattedNumber = `+${country} ${part1} ${part2} ${part3}`;
  }

  if (fwh) fwh.textContent = formattedNumber; // mostrar número en el footer
}
  const fi = document.getElementById('footer-instagram');
  const fih = document.getElementById('footer-instagram-handle');
  if(fi && d.instagram){ fi.href = `https://instagram.com/${d.instagram}`; }
  if(fih && d.instagram){ fih.textContent = `${d.instagram}`; }
})();

// ── MODO OSCURO POR DEFECTO DEL SISTEMA ──────────────────────────────────────
(function(){
  // Solo aplicar si el usuario NO ha guardado preferencia explícita
  if(!localStorage.getItem('alr_theme')){
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(prefersDark){
      document.documentElement.setAttribute('data-theme','dark');
      localStorage.setItem('alr_theme','dark');
    }
  }
  // Escuchar cambios del sistema en tiempo real
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if(!localStorage.getItem('alr_theme_manual')){
      const t = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
    }
  });
})();
// Marcar como manual cuando el usuario cambia el tema
document.getElementById('themeBtn').addEventListener('click', () => {
  localStorage.setItem('alr_theme_manual','1');
}, {once: true});



// ── FIX LAZY LOADING EN LIGHTBOX ─────────────────────────────────────────────
// Cuando se abre el lightbox, forzar carga de imágenes lazy del carrusel
// [lazy loading integrado en buildTrack]

// [modo oscuro ya aplicado arriba]

// ── MARCA DE AGUA CONFIGURABLE ────────────────────────────────────────────────
(function(){
  const stored = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const marca = stored.marcaAgua || '© Andrea López';
  const wm = document.getElementById('lightboxWatermark');
  if(wm) wm.textContent = marca;
})();

// Añadir campo marca de agua en saveContacto
// [applyWatermark integrado en saveContacto]

// ── WHATSAPP POPUP ────────────────────────────────────────────────────────
function closeWaPopup(){
  const popup = document.getElementById('whatsappPopup');
  if(popup) popup.classList.remove('show');
  sessionStorage.setItem('wa_popup_shown', '1');
}

// ── TRANSICIÓN SECCIONES MÁS PRONUNCIADA ─────────────────────────────────────
// Reemplazar el observer de secciones por uno con efecto más pronunciado
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
    const eased = 1 - Math.pow(1 - t, 3); // ease out cubic
    el.textContent = Math.round(initial + (target - initial) * eased);
    if(t < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

// Patch loadStats para animar números
// [animateNumber integrado en loadStats]

// ── SLIDESHOW ─────────────────────────────────────────────────────────────────
let slideshowActive = false;
let slideshowTimer  = null;
const SLIDESHOW_INTERVAL = 4500;

function startSlideshow(){
  slideshowActive = true;
  const btn  = document.getElementById('slideshowBtn');
  const prog = document.getElementById('slideshowProgress');
  if(btn){ btn.textContent = '⏸ Pausar'; btn.classList.add('playing'); }
  // Animar barra de progreso
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

document.getElementById('slideshowBtn')?.addEventListener('click', () => {
  slideshowActive ? stopSlideshow() : startSlideshow();
});

// Parar slideshow al cerrar
// [stopSlideshow integrado en closeLightbox]

// Parar slideshow al navegar manualmente
// [stopSlideshow integrado en lightboxPrev/Next]

// ══════════════════════════════════════════════════════════════════════════════
// FIREBASE SYNC — Sincronización global entre dispositivos
// Añadir al final de andrea.js
// ══════════════════════════════════════════════════════════════════════════════

const CONFIG_DOC = db.collection('config').doc('site');

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

    // Textos
    if(data.textos){
      localStorage.setItem('alr_textos', JSON.stringify(data.textos));
      applyTextos(data.textos);
    }
    // Contacto
    if(data.contacto){
      localStorage.setItem('alr_contacto', JSON.stringify(data.contacto));
      applyContacto(data.contacto);
      applyWatermark();
      // WhatsApp
      const waBtn = document.getElementById('whatsappBtn');
      if(waBtn && data.contacto.whatsapp)
        waBtn.href = `https://wa.me/${data.contacto.whatsapp.replace(/\D/g,'')}?text=Hola%20Andrea%2C%20me%20gustar%C3%ADa%20hablar%20sobre%20un%20proyecto`;
      const fw = document.getElementById('footer-whatsapp');
      if(fw && data.contacto.whatsapp)
        fw.href = `https://wa.me/${data.contacto.whatsapp.replace(/\D/g,'')}`;
    }
    // Secciones
    if(data.sections){
      localStorage.setItem('alr_sections', JSON.stringify(data.sections));
      refreshSectionsCSS();
      applySectionVisibility();
    }
    // Servicios
    if(data.servicios){
      localStorage.setItem('alr_servicios', JSON.stringify(data.servicios));
      renderServicios(data.servicios);
    }
    // Testimonios
    if(data.testimonios){
      localStorage.setItem('alr_testimonios', JSON.stringify(data.testimonios));
      renderTestimonios(data.testimonios);
    }
    // Proceso
    if(data.proceso){
      localStorage.setItem('alr_proceso', JSON.stringify(data.proceso));
      renderProceso(data.proceso);
    }
    // Contraseña admin
    if(data.adminPass){
      localStorage.setItem('alr_pass', data.adminPass);
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
});

// ── PARCHEAR FUNCIONES DE GUARDADO PARA QUE TAMBIÉN SUBAN A FIREBASE ─────────

// saveTextos
const _origSaveTextos = saveTextos;
saveTextos = function(){
  _origSaveTextos.apply(this, arguments);
  const t = {
    tagline:        document.getElementById('txt-tagline')?.value.trim() || '',
    eyebrow:        document.getElementById('txt-eyebrow')?.value.trim() || '',
    sobre1:         document.getElementById('txt-sobre1')?.value.trim() || '',
    sobre2:         document.getElementById('txt-sobre2')?.value.trim() || '',
    disponibilidad: document.getElementById('txt-disponibilidad')?.value.trim() || '',
  };
  saveConfigToFirebase('textos', t);
};

// saveServicios
const _origSaveServicios = saveServicios;
saveServicios = function(){
  _origSaveServicios.apply(this, arguments);
  const data = loadServicios();
  saveConfigToFirebase('servicios', data);
};

// saveTestimonios
const _origSaveTestimonios = saveTestimonios;
saveTestimonios = function(){
  _origSaveTestimonios.apply(this, arguments);
  const data = loadTestimonios();
  saveConfigToFirebase('testimonios', data);
};

// saveProcesoSteps
const _origSaveProcesoSteps = saveProcesoSteps;
saveProcesoSteps = function(){
  _origSaveProcesoSteps.apply(this, arguments);
  const data = loadProceso();
  saveConfigToFirebase('proceso', data);
};

// toggleSection — sincronizar secciones al cambiar visibilidad
const _origToggleSection = toggleSection;
toggleSection = function(id, visible){
  _origToggleSection(id, visible);
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  saveConfigToFirebase('sections', stored);
};

// ── saveContacto REPARADO Y CON FIREBASE ─────────────────────────────────────
saveContacto = function(){
  const get = id => document.getElementById(id);
  const np  = get('txt-newpass')?.value  || '';
  const np2 = get('txt-newpass2')?.value || '';
  const msg = get('contacto-msg');

  if(np && np !== np2){
    if(msg){ msg.textContent='Las contraseñas no coinciden.'; msg.style.color='#c87a6a'; msg.style.display='block'; }
    return;
  }

  const d = {
    emailRecepcion: get('txt-email-recepcion')?.value.trim() || 'diegomdz19@hotmail.com',
    instagram:      get('txt-instagram')?.value.trim()  || 'andrealopz___',
    email:          get('txt-email')?.value.trim()      || '',
    telefono:       get('txt-telefono')?.value.trim()   || '',
    whatsapp:       get('txt-whatsapp')?.value.trim()   || '',
    zona:           get('txt-zona')?.value.trim()       || 'Disponible para proyectos · España',
    watermark:      get('txt-watermark')?.value.trim()  || '© Andrea López',
  };

  localStorage.setItem('alr_contacto', JSON.stringify(d));
  localStorage.setItem('alr_email_destino', d.emailRecepcion);
  console.log('✅ Email destino actualizado:', d.emailRecepcion);

  // Contraseña — guardar en localStorage y Firebase
  if(np){
    localStorage.setItem('alr_pass', np);
    saveConfigToFirebase('adminPass', np);
  }

  // Actualizar WhatsApp en tiempo real
  const waBtn = document.getElementById('whatsappBtn');
  if(waBtn && d.whatsapp)
    waBtn.href = `https://wa.me/${d.whatsapp.replace(/\D/g,'')}?text=Hola%20Andrea%2C%20me%20gustar%C3%ADa%20hablar%20sobre%20un%20proyecto`;
  const fw = document.getElementById('footer-whatsapp');
  if(fw && d.whatsapp)
    fw.href = `https://wa.me/${d.whatsapp.replace(/\D/g,'')}`;

  applyContacto(d);
  applyWatermark();
  localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));

  // Subir a Firebase
  saveConfigToFirebase('contacto', d);

  if(msg){
    msg.textContent = 'Guardado correctamente ✓';
    msg.style.color = '#c8b89a';
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
  }
};

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