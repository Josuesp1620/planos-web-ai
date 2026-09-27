/**
 * Texturas dibujadas en canvas con el texto real: hojas del documento y tarjetas de chunks.
 * Se cachean por clave para no redibujar en cada fotograma.
 */
import * as THREE from 'three';
import { type Corte, palabrasDe } from './datos';

const cache = new Map<string, THREE.CanvasTexture>();

export const COLORES_CHUNK = ['#7ef0ff', '#ff7ad9', '#a996ff', '#6ee7a8'];

function envolver(ctx: CanvasRenderingContext2D, palabras: string[], ancho: number) {
  const lineas: { palabras: { texto: string; i: number; x: number }[] }[] = [];
  let actual: { texto: string; i: number; x: number }[] = [];
  let x = 0;
  const espacio = ctx.measureText(' ').width;
  palabras.forEach((p, i) => {
    const w = ctx.measureText(p).width;
    if (x + w > ancho && actual.length) {
      lineas.push({ palabras: actual });
      actual = [];
      x = 0;
    }
    actual.push({ texto: p, i, x });
    x += w + espacio;
  });
  if (actual.length) lineas.push({ palabras: actual });
  return lineas;
}

function textura(clave: string, ancho: number, alto: number, dibujar: (ctx: CanvasRenderingContext2D) => void) {
  const previa = cache.get(clave);
  if (previa) return previa;
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d')!;
  dibujar(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (cache.size > 220) cache.delete(cache.keys().next().value!);
  cache.set(clave, t);
  return t;
}

/**
 * Hoja del documento con su texto real. Con `cortes`, pinta cada chunk de un color y el
 * solapamiento en dorado (vista de chunking).
 */
export function texturaHoja(n: number, texto: string, alta: boolean, cortes?: Corte[], clave = '') {
  const W = alta ? 1240 : 420;
  const H = Math.round(W * 1.414);
  return textura(`hoja-${n}-${alta}-${clave}`, W, H, (ctx) => {
    const m = W * 0.08;
    ctx.fillStyle = '#eef1f6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1b2440';
    ctx.font = `600 ${W * 0.018}px "IBM Plex Mono", monospace`;
    ctx.fillText('CÓDIGO DE PROTECCIÓN Y DEFENSA DEL CONSUMIDOR', m, m * 0.8);
    ctx.textAlign = 'right';
    ctx.fillText(String(n), W - m, m * 0.8);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8cfdc';
    ctx.fillRect(m, m, W - 2 * m, Math.max(1, W * 0.0015));
    const palabras = palabrasDe(texto);
    // Tamaño de letra que hace caber la página completa.
    let fs = W * 0.03;
    let lineas: ReturnType<typeof envolver> = [];
    for (; fs > W * 0.012; fs *= 0.94) {
      ctx.font = `400 ${fs}px "IBM Plex Sans", sans-serif`;
      lineas = envolver(ctx, palabras, W - 2 * m);
      if (m * 1.4 + lineas.length * fs * 1.45 < H - m) break;
    }
    const alto = fs * 1.45;
    lineas.forEach((l, li) => {
      const y = m * 1.4 + li * alto;
      l.palabras.forEach((p) => {
        if (cortes) {
          const dentro = cortes.map((c, ci) => (p.i >= c.inicio && p.i < c.fin ? ci : -1)).filter((ci) => ci >= 0);
          if (dentro.length) {
            const w = ctx.measureText(p.texto + ' ').width;
            ctx.fillStyle = dentro.length > 1 ? 'rgba(255,210,63,.55)' : `${COLORES_CHUNK[dentro[0] % COLORES_CHUNK.length]}44`;
            ctx.fillRect(m + p.x - 2, y - fs * 0.95, w + 1, alto * 0.95);
          }
        }
        ctx.fillStyle = '#1b2440';
        ctx.fillText(p.texto, m + p.x, y);
      });
    });
  });
}

/** Tarjeta de un chunk: número, rango de palabras y su texto. */
export function texturaTarjeta(clave: string, titulo: string, texto: string, color: string) {
  const W = 1024;
  const H = 220;
  return textura(`tarjeta-${clave}`, W, H, (ctx) => {
    ctx.fillStyle = '#0d1226';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 10, H);
    ctx.font = '600 30px "IBM Plex Mono", monospace';
    ctx.fillText(titulo, 36, 50);
    ctx.fillStyle = '#d8def0';
    ctx.font = '400 26px "IBM Plex Sans", sans-serif';
    const lineas = envolver(ctx, palabrasDe(texto), W - 72).slice(0, 4);
    lineas.forEach((l, i) => {
      const t = l.palabras.map((p) => p.texto).join(' ') + (i === 3 ? '…' : '');
      ctx.fillText(t, 36, 96 + i * 34);
    });
  });
}

export function limpiarCache(prefijo: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefijo)) cache.delete(k);
}
