/**
 * Lógica pura (sin DOM) extraída de public/site.js y public/admin.js para
 * poder probarla con Vitest. public/*.js son scripts clásicos cargados
 * directamente por el navegador (no pasan por el bundler de Vite), así que
 * viven fuera del grafo de módulos — estas son reimplementaciones fieles
 * usadas solo como referencia probada. Si cambias la lógica equivalente en
 * public/site.js o public/admin.js, replica el cambio aquí.
 */

export function esc(s){
  if(!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function fixPath(p){
  if(!p) return '';
  if(p.startsWith('http') || p.startsWith('/') || p.startsWith('data:')) return p;
  return '/' + p;
}

export function isSectionHidden(stored, id){
  return stored[id] === false || stored[id] === 'false';
}

// Formatea un número de WhatsApp en dígitos a "+<país> <9 dígitos en grupos de 3>".
// Replica la lógica usada en applyContacto/footer-whatsapp de public/site.js.
export function formatWhatsAppNumber(raw){
  if(!raw) return raw;
  const clean = String(raw).replace(/\D/g, '');
  if(clean.length < 9) return raw;
  const country = clean.slice(0, clean.length - 9);
  const part1 = clean.slice(-9, -6);
  const part2 = clean.slice(-6, -3);
  const part3 = clean.slice(-3);
  return `+${country} ${part1} ${part2} ${part3}`;
}

// Replica el formateo de velocidad de obturación de uploadToCloudinary en admin.js:
// EXIF.ExposureTime es un número decimal de segundos; los valores < 1s se muestran
// como fracción "1/N s", el resto como "N s".
export function formatShutterSpeed(exposureTime){
  if(exposureTime === null || exposureTime === undefined || exposureTime === '') return null;
  const t = Number(exposureTime);
  if(Number.isNaN(t) || t <= 0) return null;
  return t < 1 ? `1/${Math.round(1 / t)}s` : `${t}s`;
}

export function formatAperture(fNumber){
  if(fNumber === null || fNumber === undefined || fNumber === '') return null;
  return `f/${fNumber}`;
}
