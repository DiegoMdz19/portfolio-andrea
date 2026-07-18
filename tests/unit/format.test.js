import { describe, it, expect } from 'vitest';
import { esc, fixPath, isSectionHidden, formatWhatsAppNumber, formatShutterSpeed, formatAperture } from '../../src/lib/format.js';

describe('esc', () => {
  it('escapa etiquetas HTML para prevenir XSS', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapa el símbolo & sin doble-escapar entidades', () => {
    expect(esc('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('devuelve cadena vacía para valores falsy', () => {
    expect(esc('')).toBe('');
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(esc('Boda en Segovia · 2024')).toBe('Boda en Segovia · 2024');
  });
});

describe('fixPath', () => {
  it('antepone / a rutas relativas', () => {
    expect(fixPath('fotos/retrato.jpeg')).toBe('/fotos/retrato.jpeg');
  });

  it('deja intactas las URLs absolutas', () => {
    expect(fixPath('https://res.cloudinary.com/x/y.jpg')).toBe('https://res.cloudinary.com/x/y.jpg');
  });

  it('deja intactas las rutas que ya empiezan con /', () => {
    expect(fixPath('/videos/hero.mp4')).toBe('/videos/hero.mp4');
  });

  it('deja intactos los data URIs', () => {
    expect(fixPath('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('devuelve cadena vacía si no hay ruta', () => {
    expect(fixPath('')).toBe('');
    expect(fixPath(null)).toBe('');
  });
});

describe('isSectionHidden', () => {
  it('detecta oculto cuando el valor es boolean false', () => {
    expect(isSectionHidden({ galeria: false }, 'galeria')).toBe(true);
  });

  it('detecta oculto cuando el valor es el string "false" (dato legado)', () => {
    expect(isSectionHidden({ galeria: 'false' }, 'galeria')).toBe(true);
  });

  it('trata la ausencia de la clave como visible', () => {
    expect(isSectionHidden({}, 'galeria')).toBe(false);
  });

  it('trata true como visible', () => {
    expect(isSectionHidden({ galeria: true }, 'galeria')).toBe(false);
  });
});

describe('formatWhatsAppNumber', () => {
  it('formatea un número español con prefijo de país', () => {
    expect(formatWhatsAppNumber('34612345678')).toBe('+34 612 345 678');
  });

  it('limpia caracteres no numéricos antes de formatear', () => {
    expect(formatWhatsAppNumber('+34 612-345-678')).toBe('+34 612 345 678');
  });

  it('devuelve el valor original si tiene menos de 9 dígitos', () => {
    expect(formatWhatsAppNumber('12345')).toBe('12345');
  });

  it('devuelve el valor original si está vacío', () => {
    expect(formatWhatsAppNumber('')).toBe('');
    expect(formatWhatsAppNumber(null)).toBe(null);
  });
});

describe('formatShutterSpeed', () => {
  it('formatea velocidades rápidas (<1s) como fracción', () => {
    expect(formatShutterSpeed(0.002)).toBe('1/500s');
  });

  it('formatea velocidades lentas (>=1s) en segundos', () => {
    expect(formatShutterSpeed(2)).toBe('2s');
  });

  it('devuelve null para valores ausentes o inválidos', () => {
    expect(formatShutterSpeed(null)).toBeNull();
    expect(formatShutterSpeed(undefined)).toBeNull();
    expect(formatShutterSpeed('')).toBeNull();
    expect(formatShutterSpeed(0)).toBeNull();
    expect(formatShutterSpeed(-1)).toBeNull();
  });
});

describe('formatAperture', () => {
  it('antepone f/ al número', () => {
    expect(formatAperture(1.8)).toBe('f/1.8');
  });

  it('devuelve null para valores ausentes', () => {
    expect(formatAperture(null)).toBeNull();
    expect(formatAperture(undefined)).toBeNull();
  });
});
