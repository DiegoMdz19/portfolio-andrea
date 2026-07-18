/**
 * Andrea López — Portfolio
 * admin.js — Panel de administración (se carga bajo demanda)
 *
 * Este archivo lo inyecta site.js (loadAdminModule) solo cuando alguien
 * abre el overlay de login del panel admin — nunca se descarga para
 * visitantes normales. Depende de globals ya definidos por site.js:
 * db, auth, CONFIG_DOC, esc, fixPath, applyContacto, applyTextos,
 * applyHeroMedia, applyWatermark, renderProceso, renderServicios,
 * renderTestimonios, renderPublicGallery, renderPublicVideos,
 * loadPublicFolderFilters, loadFolders, invalidateFoldersCache,
 * observeNewElements, saveConfigToFirebase, loadConfigFromFirebase,
 * pendingFile/pendingFileUrl/pendingExif/pendingVideoUrl, genToken, moveTabIndicator,
 * TEXTOS_DEFAULT, loadTextos, PROCESO_DEFAULT, loadProceso,
 * SERVICIOS_DEFAULT, loadServicios, TESTIMONIOS_DEFAULT, loadTestimonios,
 * SECTIONS_CONFIG, isSectionHidden, refreshSectionsCSS, updateNavLinks.
 */

// ── LOGIN REAL (sobrescribe el placeholder de site.js) ───────────────────────
async function checkPass(){
  const input = document.getElementById('admin-pass').value;

  try {
    await auth.signInWithEmailAndPassword('admin@andrealopezfoto.es', input);

    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadStats();
    renderAdminGallery();
    setTimeout(() => {
      const activeTab = document.querySelector('.admin-tab.active');
      if(activeTab) moveTabIndicator(activeTab);
    }, 60);
    setTimeout(async () => {
      const deleted = await autoDeleteExpiredPhotos();
      if(deleted > 0){ renderPublicGallery(); renderAdminGallery(); }
      populateFolderSelector('newFolder');
    }, 400);
  } catch(e) {
    document.getElementById('admin-error').style.display = 'block';
    document.getElementById('admin-pass').value = '';
    document.getElementById('admin-pass').focus();
    console.warn('Firebase login error:', e);
  }
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

function showConfirm(msg, onOk, { title='¿Estás segura?', icon='🗑', okLabel='Eliminar', okCls='danger' } = {}){
  showModal({ icon, title, msg, btns:[
    { label:'Cancelar', cls:'' },
    { label:okLabel, cls:okCls, action:onOk },
  ]});
}

function showAlert(msg, { title='Aviso', icon='ℹ' } = {}){
  showModal({ icon, title, msg, btns:[
    { label:'Entendido', cls:'primary' },
  ]});
}

function showToast(text, options = {}){
  const msg = document.createElement('div');
  msg.className = 'custom-alert';
  msg.innerHTML = `<span>${options.icon || '✨'}</span> ${text}`;
  document.body.appendChild(msg);
  setTimeout(() => msg.classList.add('show'), 10);
  setTimeout(() => {
    msg.classList.remove('show');
    setTimeout(() => msg.remove(), 500);
  }, options.timeout || 3000);
}

// ── MULTIMEDIA — TÍTULOS Y DESCRIPCIONES ─────────────────────────────────────
function filtrarMultimedia(q){
  const term = q.toLowerCase().trim();
  document.querySelectorAll('#admin-fotos-list > div, #admin-videos-list > div').forEach(row => {
    const titulo = row.querySelector('.foto-titulo, .vid-titulo')?.value.toLowerCase() || '';
    const desc   = row.querySelector('.foto-desc,  .vid-desc')?.value.toLowerCase()   || '';
    row.style.display = (!term || titulo.includes(term) || desc.includes(term)) ? '' : 'none';
  });
}

function loadMultimediaForm(){
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
  const fotos  = document.querySelectorAll('.gallery-item[data-index]');
  const videos = document.querySelectorAll('.video-card[data-src]');
  const data   = { fotos: [], videos: [] };

  document.querySelectorAll('.foto-titulo').forEach(input => {
    const i = +input.dataset.idx;
    if(fotos[i]){
      fotos[i].dataset.titulo = input.value;
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

// ── TEXTOS (formulario admin) ─────────────────────────────────────────────────
function loadTextosForm(){
  const t = loadTextos();
  document.getElementById('txt-tagline').value        = t.tagline;
  document.getElementById('txt-eyebrow').value        = t.eyebrow;
  document.getElementById('txt-sobre1').value         = t.sobre1;
  document.getElementById('txt-sobre2').value         = t.sobre2;
  document.getElementById('txt-disponibilidad').value = t.disponibilidad;
  if(document.getElementById('txt-tagline-en'))        document.getElementById('txt-tagline-en').value        = t.tagline_en;
  if(document.getElementById('txt-eyebrow-en'))        document.getElementById('txt-eyebrow-en').value        = t.eyebrow_en;
  if(document.getElementById('txt-sobre1-en'))         document.getElementById('txt-sobre1-en').value         = t.sobre1_en;
  if(document.getElementById('txt-sobre2-en'))          document.getElementById('txt-sobre2-en').value         = t.sobre2_en;
  if(document.getElementById('txt-disponibilidad-en')) document.getElementById('txt-disponibilidad-en').value = t.disponibilidad_en;
}
function saveTextos(){
  const get = id => document.getElementById(id);
  const t = {
    tagline:        get('txt-tagline').value.trim(),
    eyebrow:        get('txt-eyebrow').value.trim(),
    sobre1:         get('txt-sobre1').value.trim(),
    sobre2:         get('txt-sobre2').value.trim(),
    disponibilidad: get('txt-disponibilidad').value.trim(),
    tagline_en:        get('txt-tagline-en')?.value.trim()        || TEXTOS_DEFAULT.tagline_en,
    eyebrow_en:        get('txt-eyebrow-en')?.value.trim()        || TEXTOS_DEFAULT.eyebrow_en,
    sobre1_en:         get('txt-sobre1-en')?.value.trim()         || TEXTOS_DEFAULT.sobre1_en,
    sobre2_en:         get('txt-sobre2-en')?.value.trim()         || TEXTOS_DEFAULT.sobre2_en,
    disponibilidad_en: get('txt-disponibilidad-en')?.value.trim() || TEXTOS_DEFAULT.disponibilidad_en,
  };
  localStorage.setItem('alr_textos', JSON.stringify(t));
  saveConfigToFirebase('textos', t);
  applyTextos(t);
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

// ── CONTACTO — LOAD Y SAVE ────────────────────────────────────────────────────
function loadContactoForm(){
  const d = JSON.parse(localStorage.getItem('alr_contacto')||'{}');
  const get = id => document.getElementById(id);
  if(get('txt-email-recepcion')) get('txt-email-recepcion').value = d.emailRecepcion || 'diegomdz19@hotmail.com';
  if(get('txt-instagram')) get('txt-instagram').value = d.instagram || '';
  if(get('txt-email'))      get('txt-email').value      = d.email     || '';
  if(get('txt-telefono'))   get('txt-telefono').value   = d.telefono  || '';
  if(get('txt-whatsapp'))   get('txt-whatsapp').value   = d.whatsapp  || '';
  if(get('txt-zona'))       get('txt-zona').value       = d.zona      || 'Disponible para proyectos · España';
  if(get('txt-watermark'))  get('txt-watermark').value  = d.watermark || '© Andrea López';
  if(get('txt-currentpass')) get('txt-currentpass').value = '';
  if(get('txt-newpass'))    get('txt-newpass').value    = '';
  if(get('txt-newpass2'))   get('txt-newpass2').value   = '';
}

// ── saveContacto (con cambio de contraseña vía Firebase Auth) ────────────────
async function saveContacto(){
  const get = id => document.getElementById(id);
  const curPass = get('txt-currentpass')?.value || '';
  const np  = get('txt-newpass')?.value  || '';
  const np2 = get('txt-newpass2')?.value || '';
  const msg = get('contacto-msg');

  const showMsg = (text, ok) => {
    if(!msg) return;
    msg.textContent = text;
    msg.style.color = ok ? '#c8b89a' : '#c87a6a';
    msg.style.display = 'block';
    if(ok) setTimeout(() => msg.style.display = 'none', 3000);
  };

  if(np && np !== np2){
    showMsg('Las contraseñas no coinciden.', false);
    return;
  }

  if(np){
    if(!curPass){
      showMsg('Introduce tu contraseña actual para cambiarla.', false);
      return;
    }
    try {
      const user = auth.currentUser;
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, curPass);
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(np);
    } catch(e) {
      console.warn('Error al cambiar la contraseña:', e);
      showMsg('No se pudo cambiar la contraseña. Verifica la contraseña actual.', false);
      return;
    }
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

  if(get('txt-currentpass')) get('txt-currentpass').value = '';
  if(get('txt-newpass'))     get('txt-newpass').value     = '';
  if(get('txt-newpass2'))    get('txt-newpass2').value    = '';

  const waBtn = document.getElementById('whatsappBtn');
  if(waBtn && d.whatsapp)
    waBtn.href = `https://wa.me/${d.whatsapp.replace(/\D/g,'')}?text=Hola%20Andrea%2C%20me%20gustar%C3%ADa%20hablar%20sobre%20un%20proyecto`;
  const fw = document.getElementById('footer-whatsapp');
  if(fw && d.whatsapp)
    fw.href = `https://wa.me/${d.whatsapp.replace(/\D/g,'')}`;

  applyContacto(d);
  applyWatermark();
  localStorage.setItem('alr_ultimo_cambio', new Date().toLocaleDateString('es-ES'));

  saveConfigToFirebase('contacto', d);

  showMsg('Guardado correctamente ✓', true);
}

// ── EXPORTAR / IMPORTAR CONFIG ────────────────────────────────────────────────
function exportConfig(){
  const cfg = {
    textos: JSON.parse(localStorage.getItem('alr_textos') || '{}'),
    contacto: JSON.parse(localStorage.getItem('alr_contacto') || '{}'),
    multimedia: JSON.parse(localStorage.getItem('alr_multimedia') || '{}'),
    timestamp: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(cfg, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `andrea-portfolio-backup-${Date.now()}.json`;
  a.click();
}

function importConfig(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const cfg = JSON.parse(ev.target.result);
      if(cfg.textos) { localStorage.setItem('alr_textos', JSON.stringify(cfg.textos)); applyTextos(loadTextos()); saveConfigToFirebase('textos', cfg.textos); }
      if(cfg.contacto) { localStorage.setItem('alr_contacto', JSON.stringify(cfg.contacto)); applyContacto(cfg.contacto); saveConfigToFirebase('contacto', cfg.contacto); }
      if(cfg.multimedia) { localStorage.setItem('alr_multimedia', JSON.stringify(cfg.multimedia)); applyMultimedia(); saveConfigToFirebase('multimedia', cfg.multimedia); }
      showToast('Configuración importada ✓', { icon:'✅' });
    } catch(err) {
      showToast('Error al importar.', { icon:'✗' });
    }
  };
  reader.readAsText(file);
}

// ── VÍDEOS ADMIN ───────────────────────────────────────────────────────────
async function loadVideoAdmin(){
  const list = document.getElementById('admin-video-list');
  if(!list) return;
  list.innerHTML = '';

  try {
    const snapshot = await db.collection('videos').orderBy('created').get();
    snapshot.forEach(doc => {
      const v = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-photo-card';
      div.style.cssText = 'padding:16px; gap:12px;';
      div.innerHTML = `
        <div style="flex:1;">
          <p style="font-size:.55rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(200,184,154,.45);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
            <span>${esc((v.src||'').split('/').pop())}</span>
            <span style="color:var(--warm);opacity:.6;">VÍDEO</span>
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="apc-field">
              <label>Título (ES)</label>
              <div class="apc-input-wrap">
                <input type="text" value="${esc(v.titulo)||''}" onchange="updateVideoField('${doc.id}','titulo',this.value)" placeholder="Sin título">
                <button onclick="autoTranslateVideo('${doc.id}',this)" class="apc-translate-btn" title="Traducir al Inglés">✨</button>
              </div>
            </div>
            <div class="apc-field">
              <label>Título (EN)</label>
              <input type="text" value="${esc(v.titulo_en)||''}" onchange="updateVideoField('${doc.id}','titulo_en',this.value)" placeholder="Untitled">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="apc-field">
              <label>Descripción (ES)</label>
              <input type="text" value="${esc(v.desc)||''}" onchange="updateVideoField('${doc.id}','desc',this.value)" placeholder="Sin descripción">
            </div>
            <div class="apc-field">
              <label>Descripción (EN)</label>
              <input type="text" value="${esc(v.desc_en)||''}" onchange="updateVideoField('${doc.id}','desc_en',this.value)" placeholder="No description">
            </div>
          </div>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:flex-end;">
          <button onclick="removeVideo('${doc.id}')" class="admin-btn" style="border-color:rgba(180,60,40,.3);color:rgba(200,100,80,.8);font-size:.55rem;padding:7px 16px;">Eliminar Vídeo</button>
        </div>
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
  if(!src){ showToast('Sube un vídeo primero.', { title:'Vídeo requerido', icon:'🎬' }); return; }

  try {
    await db.collection('videos').add({
      src,
      titulo,
      desc,
      created: Date.now()
    });

    showToast('Vídeo añadido correctamente.', { title:'¡Hecho!', icon:'🎬' });

    pendingVideoUrl = null;
    ['vid-src','vid-new-titulo','vid-new-desc'].forEach(id => {
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
    showToast('Error al añadir el vídeo.', { title:'Error', icon:'✗' });
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
      showToast('Error al eliminar el vídeo.', { title:'Error', icon:'✗' });
      console.error(e);
    }
  }, { title:'Eliminar vídeo', icon:'🎬' });
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
  await renderAdminGallery();
  await renderPublicGallery();
}

// ── TOGGLE SECCIÓN VISIBLE ────────────────────────────────────────────────────
function toggleSection(id, visible){
  const stored = JSON.parse(localStorage.getItem('alr_sections')||'{}');
  stored[id] = Boolean(visible);
  localStorage.setItem('alr_sections', JSON.stringify(stored));
  saveConfigToFirebase('sections', stored);
  refreshSectionsCSS();
  updateNavLinks(stored);
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
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Textos — Sobre mí</p>
    <p style="font-size:.72rem;color:#7a7068;margin-bottom:16px;">Para editar los párrafos ve a Configuración → Textos.</p>
    <a onclick="document.querySelector('[onclick*=tab-config]').click();setTimeout(()=>document.querySelector('[onclick*=cfg-textos]').click(),100);" class="admin-btn" style="display:inline-block;margin-bottom:28px;">Ir a Configuración →</a>
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
    <p style="font-size:.72rem;color:#7a7068;margin-bottom:16px;">Para añadir o gestionar fotos ve a Herramientas → Galería.</p>
    <a onclick="document.querySelector('[onclick*=tab-tools]').click();setTimeout(()=>document.querySelector('[onclick*=tool-galeria]').click(),100);" class="admin-btn" style="display:inline-block;">Ir a Herramientas →</a>`,

  videos: () => `
    <p style="font-size:.6rem;letter-spacing:.32em;text-transform:uppercase;color:var(--warm);margin-bottom:16px;display:flex;align-items:center;gap:14px;"><span style="display:block;width:22px;height:1px;background:var(--warm);"></span>Vídeos</p>
    <p style="font-size:.72rem;color:#7a7068;margin-bottom:16px;">Para añadir o gestionar vídeos ve a Herramientas → Vídeos.</p>
    <a onclick="document.querySelector('[onclick*=tab-tools]').click();setTimeout(()=>document.querySelector('[onclick*=tool-videos-admin]').click(),100);" class="admin-btn" style="display:inline-block;">Ir a Herramientas →</a>`,

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

  document.querySelectorAll('#sec-sidebar .sec-menu-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim().includes(SECTIONS_CONFIG.find(s=>s.id===id)?.label));
  });

  const fn = SECTION_CONTENT[id];
  content.innerHTML = fn ? fn() : '';

  if(id === 'servicios')   loadServiciosAdmin();
  if(id === 'testimonios') loadTestimoniosAdmin();
  if(id === 'proceso')     loadProcesoAdmin();
  if(id === 'sobre')       { loadTextosForm(); renderAdminSobrePhotos(); }
  if(id === 'hero')        loadHeroForm();
}

function renderSectionsControl(){ renderSectionsMenu(); } // alias para compatibilidad

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

  uploadToBunnyPhoto(file, pct => {
    if(status) status.textContent = `Subiendo… ${pct}%`;
  }).then(async res => {
    const url = res.url;
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
        <img src="${fixPath(p.src)}" style="width:100%;height:100%;object-fit:cover;">
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
    } catch(e){ showToast('Error al eliminar.', {title:'Error',icon:'✗'}); }
  }, { title:'Eliminar foto', icon:'🗑' });
}

// ── HERO ADMIN ───────────────────────────────────────────────────────────────
function loadHeroForm(){
  const cfg = JSON.parse(localStorage.getItem('alr_hero')||'{}');
  const typeEl = document.getElementById('hero-type');
  const srcEl  = document.getElementById('hero-src');
  if(typeEl) typeEl.value = cfg.type || 'video';
  if(srcEl)  srcEl.value  = cfg.src  || '/videos/hero-prueba.mp4';
}

function saveHeroConfig(){
  const type = document.getElementById('hero-type')?.value || 'video';
  const src  = document.getElementById('hero-src')?.value.trim() || '';
  if(!src){ showToast('Indica la URL del vídeo o imagen.', {title:'Falta URL', icon:'📎'}); return; }
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
  uploadToBunny(file, pct => {
    if(msg) msg.textContent = `Subiendo… ${pct}%`;
  }).then(res => {
    const url = res.url;
    const srcEl = document.getElementById('hero-src');
    if(srcEl) srcEl.value = url;
    const typeEl = document.getElementById('hero-type');
    if(typeEl) typeEl.value = file.type.startsWith('video') ? 'video' : 'image';
    if(msg){ msg.textContent='✓ Subido. Pulsa Guardar.'; setTimeout(()=>msg.style.display='none',3000); }
  }).catch(() => {
    if(msg) msg.textContent = 'Error al subir';
  });
}

// ── PROCESO — EDICIÓN DE PASOS ────────────────────────────────────────────
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

// ── SERVICIOS ADMIN ───────────────────────────────────────────────────────────
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

// ── TESTIMONIOS ADMIN ─────────────────────────────────────────────────────────
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

// ── INDICADOR Y TABS DEL PANEL ────────────────────────────────────────────────
function switchTab(id, el) {
  const contents = document.querySelectorAll('.admin-tab-content');
  const buttons = document.querySelectorAll('.admin-tab');

  contents.forEach(tab => {
    tab.classList.toggle('active', tab.id === id);
  });

  buttons.forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');

  moveTabIndicator(el);
  playTabSound();

  if(id === 'tab-secciones') renderSectionsMenu();
  if(id === 'tab-config')    { loadTextosForm(); loadContactoForm(); }
  if(id === 'tab-tools')     loadMultimediaForm();
  if(id === 'tab-stats')     loadStats();
}

function playTabSound() {
  const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
  audio.volume = 0.15;
  audio.play();
}

// ── BUNNY.NET ─────────────────────────────────────────────────────────────────
// Fotos: URL prefirmada S3 → el navegador sube directo a Bunny Storage, sin
// pasar por ningún servidor nuestro (sin límite de tamaño).
// Vídeo: firma TUS de Bunny Stream → subida directa y reanudable a Bunny Stream.
// Ambas rutas exigen un ID token de Firebase Auth válido de la cuenta admin
// (verificado en /api/_lib/verifyAdmin.js), así que solo la admin autenticada
// puede generar credenciales de subida.

async function getAdminIdToken(){
  const user = auth.currentUser;
  if(!user) throw new Error('No has iniciado sesión.');
  return user.getIdToken();
}

async function extractExif(file){
  if(!file.type.startsWith('image/') || typeof EXIF === 'undefined') return null;
  try {
    return await new Promise(res => {
      EXIF.getData(file, function() {
        const all = EXIF.getAllTags(this);
        res({
          camara: all.Make ? `${all.Make} ${all.Model||''}` : null,
          lente: all.LensModel || all.LensInfo || null,
          iso: all.ISOSpeedRatings || null,
          apertura: all.FNumber ? `f/${all.FNumber}` : null,
          velocidad: all.ExposureTime ? (all.ExposureTime < 1 ? `1/${Math.round(1/all.ExposureTime)}s` : `${all.ExposureTime}s`) : null
        });
      });
    });
  } catch(e) { console.warn('EXIF error:', e); return null; }
}

async function uploadToBunnyPhoto(file, onProgress){
  const [token, exifData] = await Promise.all([getAdminIdToken(), extractExif(file)]);

  const signRes = await fetch('/api/bunny-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ filename: file.name, contentType: file.type, kind: 'photo' }),
  });
  if(!signRes.ok) throw new Error('No se pudo obtener la URL de subida.');
  const { uploadUrl, publicUrl } = await signRes.json();

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = e => {
      if(e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Error al subir'));
    xhr.onerror = () => reject(new Error('Error de red'));
    xhr.send(file);
  });

  return { url: publicUrl, exif: exifData };
}

async function uploadToBunnyVideo(file, onProgress){
  const token = await getAdminIdToken();

  const signRes = await fetch('/api/bunny-video-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: file.name }),
  });
  if(!signRes.ok) throw new Error('No se pudo iniciar la subida del vídeo.');
  const { videoId, libraryId, authorizationSignature, expirationTime, tusEndpoint, playbackUrl, thumbnailUrl } = await signRes.json();

  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: tusEndpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: authorizationSignature,
        AuthorizationExpire: String(expirationTime),
        VideoId: videoId,
        LibraryId: String(libraryId),
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress: (bytesUploaded, bytesTotal) => {
        if(onProgress) onProgress(Math.round(bytesUploaded / bytesTotal * 100));
      },
      onError: reject,
      onSuccess: resolve,
    });
    upload.start();
  });

  return { url: playbackUrl, thumbnail: thumbnailUrl, exif: null };
}

function uploadToBunny(file, onProgress){
  return file.type.startsWith('video/') ? uploadToBunnyVideo(file, onProgress) : uploadToBunnyPhoto(file, onProgress);
}

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

  uploadToBunnyVideo(file, pct => {
    if(status) status.textContent = `Subiendo… ${pct}%`;
  }).then(res => {
    pendingVideoUrl = res.url;
    if(status){ status.textContent='✓ Vídeo listo. Añade los datos y pulsa Añadir ✓'; status.style.color='#c8b89a'; }
    if(preview && res.thumbnail){
      preview.src = res.thumbnail;
      preview.style.display = 'block';
    }
  }).catch((e) => {
    console.error('Error subiendo vídeo:', e);
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

  const [file, ...rest] = Array.from(files);
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

  uploadToBunnyPhoto(file, pct => {
    status.textContent = `Subiendo… ${pct}%`;
  })
  .then(res => {
    pendingFileUrl = res.url;
    pendingExif    = res.exif;
    status.textContent = '✓ Lista para añadir';
    if(previewImg) previewImg.src = res.url;
  })
  .catch(() => {
    status.textContent = 'Error al subir';
    pendingFile = null;
  });

  // El resto de la selección múltiple se sube en segundo plano: la foto
  // principal sigue el flujo normal (título manual + botón "Añadir").
  if(rest.length) uploadExtraPhotos(rest);
}

async function uploadExtraPhotos(files){
  const folderId = document.getElementById('newFolder')?.value || null;
  showToast(`Subiendo ${files.length} foto(s) adicionales en segundo plano…`, { title:'Subiendo', icon:'⏳' });
  let ok = 0;
  for(const file of files){
    try {
      const res = await uploadToBunnyPhoto(file, () => {});
      await db.collection('photos').add({
        src:         res.url,
        titulo:      file.name.replace(/\.[^.]+$/, ''),
        folderId:    folderId || null,
        isPermanent: false,
        exif:        res.exif || null,
        created:     Date.now()
      });
      ok++;
    } catch(e) {
      console.error('Error subiendo foto adicional:', file.name, e);
    }
  }
  if(ok){
    showToast(`${ok} foto(s) adicionales añadidas.`, { title:'¡Hecho!', icon:'🔥' });
    renderAdminGallery();
    renderPublicGallery();
    loadPublicFolderFilters();
  }
}

// ── GUARDAR FOTO (con soporte de carpetas) ──────────────────────────────
async function addPhoto(){
  if(!pendingFileUrl){
    showToast('La imagen aún se está subiendo. Espera un momento.', { title:'Espera', icon:'⏳' });
    return;
  }
  const folderId = document.getElementById('newFolder')?.value || null;
  try {
    await db.collection('photos').add({
      src:         pendingFileUrl,
      titulo:      document.getElementById('newTitulo')?.value || '',
      folderId:    folderId || null,
      isPermanent: false,
      exif:        pendingExif || null,
      created:     Date.now()
    });
    showToast('Foto añadida correctamente.', { title:'¡Hecho!', icon:'🔥' });
    pendingFile    = null;
    pendingFileUrl = null;
    const preview   = document.getElementById('previewImg');  if(preview) preview.src = '';
    const titulo    = document.getElementById('newTitulo');    if(titulo) titulo.value = '';
    const folderSel = document.getElementById('newFolder');    if(folderSel) folderSel.value = '';
    const status    = document.getElementById('upload-status'); if(status) status.remove();
    document.getElementById('newPhotoFields').style.display = 'none';
    renderAdminGallery();
    renderPublicGallery();
    loadPublicFolderFilters();
  } catch(e) {
    showToast('Error al guardar la foto.', { title:'Error', icon:'✗' });
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

    const folderOpts = `<option value="">Sin carpeta</option>` +
      folders.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');

    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-photo-card';
      div.draggable = true;
      div.innerHTML = `
        <div class="apc-image" style="background:#000;">
          <img src="${esc(p.src.includes('cloudinary.com') ? p.src.replace('/upload/','/upload/w_400,q_auto,f_auto/') : p.src)}" alt="${esc(p.titulo)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
          <div class="apc-actions">
            <button onclick="deletePhoto('${doc.id}')" class="apc-del" title="Eliminar">✕</button>
            <div class="apc-likes">❤️ ${p.likes?.length || 0}</div>
          </div>
        </div>
        <div class="apc-content">
          <div class="apc-field">
            <label>Título (ES)</label>
            <div class="apc-input-wrap">
              <input type="text" class="apc-title-es" value="${esc(p.titulo) || ''}" onchange="updatePhotoTitle('${doc.id}', this.value, 'es')" placeholder="Sin título">
              <button onclick="autoTranslateTitle('${doc.id}', this)" class="apc-translate-btn" title="Traducir al Inglés">✨</button>
            </div>
          </div>
          <div class="apc-field">
            <label>Título (EN)</label>
            <input type="text" class="apc-title-en" value="${esc(p.titulo_en) || ''}" onchange="updatePhotoTitle('${doc.id}', this.value, 'en')" placeholder="Untitled">
          </div>
          <div class="apc-field">
            <label>Descripción (ES)</label>
            <input type="text" class="apc-desc-es" value="${esc(p.desc) || ''}" onchange="updatePhotoDesc('${doc.id}', this.value, 'es')" placeholder="Por ejemplo: Sesión en el bosque">
          </div>
          <div class="apc-field">
            <label>Descripción (EN)</label>
            <input type="text" class="apc-desc-en" value="${esc(p.desc_en) || ''}" onchange="updatePhotoDesc('${doc.id}', this.value, 'en')" placeholder="Por ejemplo: Forest session">
          </div>
          <div class="apc-field">
            <label>Carpeta</label>
            <select onchange="assignPhotoToFolder('${doc.id}',this.value)">
              ${folderOpts}
            </select>
          </div>
          <div class="apc-exif-toggle" onclick="this.nextElementSibling.classList.toggle('show')">
            <span>⚙️ Datos Técnicos (EXIF)</span>
          </div>
          <div class="apc-exif-fields">
            <input type="text" value="${esc(p.exif?.camara) || ''}" placeholder="Cámara" onchange="updatePhotoExif('${doc.id}', 'camara', this.value)">
            <input type="text" value="${esc(p.exif?.lente) || ''}" placeholder="Lente" onchange="updatePhotoExif('${doc.id}', 'lente', this.value)">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;">
              <input type="text" value="${esc(p.exif?.iso) || ''}" placeholder="ISO" onchange="updatePhotoExif('${doc.id}', 'iso', this.value)">
              <input type="text" value="${esc(p.exif?.apertura) || ''}" placeholder="f/..." onchange="updatePhotoExif('${doc.id}', 'apertura', this.value)">
              <input type="text" value="${esc(p.exif?.velocidad) || ''}" placeholder="Vel..." onchange="updatePhotoExif('${doc.id}', 'velocidad', this.value)">
            </div>
          </div>
          <div class="apc-footer">
            <label class="apc-check">
              <input type="checkbox" ${p.isPermanent?'checked':''} onchange="setPhotoPermanent('${doc.id}',this.checked)">
              <span>Permanente</span>
            </label>
          </div>
        </div>`;

      const sel = div.querySelector('select');
      if(sel && p.folderId) sel.value = p.folderId;
      grid.appendChild(div);
    });
  } catch(e) {
    console.error('Error cargando galería admin:', e);
  }
}

async function assignPhotoToFolder(photoId, folderId){
  if(!photoId) return;
  try {
    await db.collection('photos').doc(photoId).update({ folderId: folderId || null });
    invalidateFoldersCache();
    _allGalleryPhotos = [];
    renderPublicGallery();
    loadPublicFolderFilters();
    showToast('Carpeta actualizada', { title:'Info', icon:'📁', timeout: 1000 });
  } catch(e){
    console.error('Error asignando carpeta:', e);
    showToast('Error al asignar carpeta.', { title:'Error', icon:'✗' });
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
      showToast('Error al eliminar la foto.', { title:'Error', icon:'✗' });
      console.error(e);
    }
  }, { title:'Eliminar foto', icon:'🗑' });
}

// ── CARPETAS (gestión admin) ───────────────────────────────────────────────
async function createFolder(){
  const input = document.getElementById('new-folder-name');
  const name  = input?.value.trim();
  if(!name){ showToast('Pon un nombre a la carpeta.', {title:'Nombre requerido', icon:'📁'}); return; }
  try{
    await db.collection('folders').add({ name, token: genToken(), isPublic: false, allowDownload: false, created: Date.now() });
    invalidateFoldersCache();
    if(input) input.value = '';
    await loadFoldersAdmin();
    await loadPublicFolderFilters();
  } catch(e){
    console.error('Error creando carpeta:', e);
    showToast('Error al crear la carpeta. Asegúrate de estar conectado y haber iniciado sesión en el panel.', {title:'Error', icon:'✗'});
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
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
          <input type="text" value="${esc(f.name)}" class="admin-input" style="flex:1;max-width:200px;font-weight:400;color:var(--warm);"
            onblur="renameFolder('${f.id}',this.value)">
          <span style="font-size:.58rem;color:#7a7068;letter-spacing:.05em;background:rgba(245,242,237,.05);padding:3px 8px;border-radius:10px;white-space:nowrap;">${counts[f.id]||0} fotos</span>
        </div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="display:flex;gap:12px;">
            <label class="apc-check">
              <input type="checkbox" ${f.isPublic?'checked':''} onchange="toggleFolderPublic('${f.id}',this.checked)">
              <span>Pública</span>
            </label>
            <label class="apc-check">
              <input type="checkbox" ${f.allowDownload?'checked':''} onchange="toggleFolderDownload('${f.id}',this.checked)">
              <span>Descarga</span>
            </label>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="admin-btn" onclick="showFolderQRFromBtn(this)" data-id="${f.id}" data-token="${f.token}" style="font-size:.55rem;padding:7px 14px;" title="${esc(f.name)}">QR</button>
            <button onclick="deleteFolder('${f.id}')" class="admin-btn" style="border-color:rgba(180,60,40,.3);color:rgba(200,100,80,.8);font-size:.55rem;padding:7px 12px;">✕</button>
          </div>
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
  m.style.display = 'flex';
  m.style.opacity = '1';
  cursor?.classList.remove('hover','view');
  ring?.classList.remove('hover','view');
  label?.classList.remove('show');
}

function closeFolderQR(){
  const m = document.getElementById('folder-qr-modal');
  if(!m) return;
  m.classList.remove('open');
  m.style.opacity = '0';
  setTimeout(() => { m.style.display = 'none'; m.style.opacity = ''; }, 280);
}

function copyQrUrl(){
  const val = document.getElementById('qr-url')?.value;
  if(!val) return;
  navigator.clipboard.writeText(val).then(() => {
    const btn = document.getElementById('qr-copy-btn');
    if(btn){ btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = 'Copiar', 2000); }
  }).catch(() => showToast('No se pudo copiar. Copia manualmente el enlace.', {title:'Copiar', icon:'🔗'}));
}

async function populateFolderSelector(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const folders = await loadFolders();
  while(sel.options.length > 1) sel.remove(1);
  folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    sel.appendChild(opt);
  });
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

// ── CONTADOR / ESTADÍSTICAS DEL PANEL ─────────────────────────────────────────
async function loadStats(){
  const guardado = localStorage.getItem('alr_ultimo_cambio') || '—';
  const visitas  = localStorage.getItem('alr_visitas') || '1';
  const wrap = document.getElementById('admin-stats-wrap');
  if(!wrap) return;

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
  setTimeout(() => {
    document.querySelectorAll('.admin-stat-num').forEach(el => {
      const val = parseInt(el.textContent);
      if(!isNaN(val) && val > 0 && el.textContent.length < 6) animateNumber(el, val, 900);
    });
  }, 80);
}

// ── TRADUCCIÓN AUTOMÁTICA ─────────────────────────────────────────────────────
async function autoTranslateTitle(photoId, btn){
  const card = btn.closest('.admin-photo-card');
  const esInput = card.querySelector('.apc-title-es') || card.querySelector('input[placeholder="Sin título"]');
  const enInput = card.querySelector('.apc-title-en') || card.querySelector('input[placeholder="Untitled"]');
  const esDesc = card.querySelector('.apc-desc-es') || card.querySelector('.foto-desc');
  const enDesc = card.querySelector('.apc-desc-en');

  const textTitle = esInput ? esInput.value : '';
  const textDesc  = esDesc ? esDesc.value : '';

  if(!textTitle && !textDesc) return;

  btn.classList.add('loading');
  const oldTxt = btn.textContent;
  btn.textContent = '...';

  try {
    if(textTitle && enInput){
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textTitle)}&langpair=es|en`);
      const data = await res.json();
      const translated = data.responseData.translatedText;
      if(translated){
        enInput.value = translated;
        await updatePhotoTitle(photoId, translated, 'en');
      }
    }

    if(textDesc){
      const resD = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textDesc)}&langpair=es|en`);
      const dataD = await resD.json();
      const translatedD = dataD.responseData.translatedText;
      if(translatedD){
          if(enDesc) enDesc.value = translatedD;
          await updatePhotoDesc(photoId, translatedD, 'en');
      }
    }

    showToast('Traducción aplicada ✨', { icon:'✅', timeout: 1500 });
  } catch(e){
    console.error('Error traduciendo:', e);
    showToast('Error al traducir', { title:'Error', icon:'✗' });
  } finally {
    btn.classList.remove('loading');
    btn.textContent = oldTxt;
  }
}

async function updatePhotoDesc(photoId, val, lang){
  const field = lang === 'en' ? 'desc_en' : 'desc';
  try {
    await db.collection('photos').doc(photoId).update({ [field]: val });
  } catch(e){ console.error(e); }
}

async function updatePhotoTitle(photoId, val, lang){
  const field = lang === 'en' ? 'titulo_en' : 'titulo';
  try {
    await db.collection('photos').doc(photoId).update({ [field]: val });
  } catch(e){
    console.error('Error actualizando título:', e);
  }
}

async function autoTranslateVideo(videoId, btn){
  const card = btn.closest('.admin-photo-card');
  const esInput = card.querySelector('input[onchange*="\'titulo\'"]');
  const enInput = card.querySelector('input[onchange*="\'titulo_en\'"]');
  const esDesc  = card.querySelector('input[onchange*="\'desc\'"]');
  const enDesc  = card.querySelector('input[onchange*="\'desc_en\'"]');

  const textTitle = esInput ? esInput.value : '';
  const textDesc  = esDesc  ? esDesc.value  : '';

  if(!textTitle && !textDesc) return;

  btn.style.opacity = '0.5';
  btn.textContent = '...';

  try {
    const updates = {};

    if(textTitle){
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textTitle)}&langpair=es|en`);
      const data = await res.json();
      if(data.responseData.translatedText){
        enInput.value = data.responseData.translatedText;
        updates.titulo_en = data.responseData.translatedText;
      }
    }

    if(textDesc){
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textDesc)}&langpair=es|en`);
      const data = await res.json();
      if(data.responseData.translatedText){
        enDesc.value = data.responseData.translatedText;
        updates.desc_en = data.responseData.translatedText;
      }
    }

    if(Object.keys(updates).length > 0){
      await db.collection('videos').doc(videoId).update(updates);
      showToast('Traducción de vídeo lista ✨', { icon:'✅', timeout: 1500 });
    }
  } catch(e){
    console.error(e);
    showToast('Error al traducir vídeo', { title:'Error', icon:'✗' });
  } finally {
    btn.style.opacity = '1';
    btn.textContent = '✨';
  }
}

async function updateVideoField(videoId, field, val){
  try {
    await db.collection('videos').doc(videoId).update({ [field]: val });
  } catch(e){ console.error(e); }
}

async function updatePhotoExif(photoId, field, val){
  try {
    await db.collection('photos').doc(photoId).update({ [`exif.${field}`]: val });
  } catch(e){ console.error(e); }
}
