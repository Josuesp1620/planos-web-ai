/**
 * Datos reales exportados por scripts/exportar_datos.py (mismo pipeline de los episodios):
 * Ley de Protección al Consumidor (Perú), 524 chunks, MiniLM multilingüe de 384 dimensiones.
 */
export const DIM = 384;

export type Chunk = { id: number; pagina: number; texto: string; xyz: [number, number, number] };
export type Puestos = { vectores: number; palabras: number; hibrida: number; reranker: number | null };
export type Caso = {
  episodio: string;
  pregunta: string;
  correcta: number;
  respuesta: string;
  vector: number[];
  puestos: Puestos;
  top_reranker: number[];
};
export type Pca = { media: number[]; comps: number[][]; escala: number };
export type Pagina = { n: number; texto: string };
export type Tema = { id: number; palabras: string[]; chunks: number; paginas: number[] };
export type Datos = {
  paginasTexto: Pagina[];
  temas: Tema[];
  grupo: number[];
  chunks: Chunk[];
  vectores: Float32Array;
  pca: Pca;
  casos: Caso[];
  modelo: string;
  reranker: string;
  notaReranker: string;
  paginas: number;
};
export type Resultado = { id: number; score: number };

export async function cargarDatos(): Promise<Datos> {
  const [chunks, buf, pca, casos, paginasTexto, temas] = await Promise.all([
    fetch('/data/chunks.json').then((r) => r.json()),
    fetch('/data/vectores.bin').then((r) => r.arrayBuffer()),
    fetch('/data/pca.json').then((r) => r.json()),
    fetch('/data/casos.json').then((r) => r.json()),
    fetch('/data/paginas.json').then((r) => r.json()),
    fetch('/data/temas.json').then((r) => r.json()),
  ]);
  return {
    paginasTexto,
    temas: temas.temas,
    grupo: temas.grupo,
    chunks,
    vectores: new Float32Array(buf),
    pca,
    casos: casos.casos,
    modelo: casos.modelo,
    reranker: casos.reranker,
    notaReranker: casos.nota_reranker,
    paginas: paginasTexto.length,
  };
}

/** Similitud coseno de la pregunta con los 524 chunks (los vectores ya están normalizados). */
export function buscar(d: Datos, q: ArrayLike<number>): Resultado[] {
  const n = d.chunks.length;
  const out: Resultado[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const base = i * DIM;
    for (let j = 0; j < DIM; j++) s += d.vectores[base + j] * q[j];
    out[i] = { id: i, score: s };
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Ubica un vector en el mismo espacio 3D (PCA) que los chunks. */
export function proyectar(d: Datos, q: ArrayLike<number>): [number, number, number] {
  const r = d.pca.comps.map((c) => {
    let s = 0;
    for (let j = 0; j < DIM; j++) s += (q[j] - d.pca.media[j]) * c[j];
    return s / d.pca.escala;
  });
  return [r[0], r[1], r[2]];
}

export function vectorDe(d: Datos, id: number): Float32Array {
  return d.vectores.subarray(id * DIM, (id + 1) * DIM);
}

/** Palabras que comparten dos chunks seguidos (el solapamiento de 25 palabras). */
export function solapamiento(a: string, b: string): number {
  const pa = a.split(/\s+/);
  const pb = b.split(/\s+/);
  for (let k = Math.min(pa.length, pb.length); k > 0; k--) {
    if (pa.slice(-k).join(' ') === pb.slice(0, k).join(' ')) return k;
  }
  return 0;
}

/** Similitud coseno entre dos chunks (vectores normalizados). */
export function coseno(d: Datos, a: number, b: number): number {
  const va = vectorDe(d, a);
  const vb = vectorDe(d, b);
  let s = 0;
  for (let j = 0; j < DIM; j++) s += va[j] * vb[j];
  return s;
}

export type Corte = { inicio: number; fin: number }; // índices de palabra [inicio, fin)

/**
 * Chunking igual al del pipeline: por página, ventanas de `tam` palabras que avanzan `tam - solape`.
 * Devuelve los cortes de una página (en palabras).
 */
export function cortar(palabras: number, tam: number, solape: number): Corte[] {
  const paso = Math.max(1, tam - solape);
  const out: Corte[] = [];
  for (let i = 0; i < palabras; i += paso) out.push({ inicio: i, fin: Math.min(palabras, i + tam) });
  return out;
}

export function palabrasDe(texto: string): string[] {
  return texto.split(/\s+/).filter(Boolean);
}

/** Total de chunks del documento con un tamaño y un solapamiento dados. */
export function totalChunks(d: Datos, tam: number, solape: number): number {
  return d.paginasTexto.reduce((n, p) => n + cortar(palabrasDe(p.texto).length, tam, solape).length, 0);
}
