/**
 * Estado compartido de la app: pestaña activa y lo que el usuario eligió en cada una.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buscar, type Caso, type Datos, proyectar, type Resultado } from './datos';

export const PESTANAS = [
  { id: 'documento', nombre: 'Documento' },
  { id: 'chunks', nombre: 'Chunks' },
  { id: 'vectores', nombre: 'Vectores' },
  { id: 'espacio', nombre: 'Espacio' },
  { id: 'buscar', nombre: 'Buscar' },
  { id: 'metodos', nombre: 'Métodos' },
] as const;
export type Pestana = (typeof PESTANAS)[number]['id'];

export type Pregunta = { texto: string; vector: number[]; caso?: Caso };

function usarEstado(datos: Datos) {
  const inicial = (window.location.hash.slice(1) as Pestana) || 'documento';
  const [pestana, setPestana] = useState<Pestana>(PESTANAS.some((p) => p.id === inicial) ? inicial : 'documento');
  const [pagina, setPagina] = useState(18);
  const [tam, setTam] = useState(100);
  const [solape, setSolape] = useState(25);
  const [chunkA, setChunkA] = useState(319);
  const [chunkB, setChunkB] = useState(351);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [filtro, setFiltro] = useState('');
  const [colorPor, setColorPor] = useState<'tema' | 'pagina'>('tema');
  const [pregunta, setPregunta] = useState<Pregunta>({ texto: datos.casos[1].pregunta, vector: datos.casos[1].vector, caso: datos.casos[1] });
  const [k, setK] = useState(5);
  const [casoMetodos, setCasoMetodos] = useState(1);
  const [animacion, setAnimacion] = useState(0); // se incrementa para relanzar animaciones

  useEffect(() => {
    history.replaceState(null, '', `#${pestana}`);
  }, [pestana]);
  // Enlaces directos: si cambia el # de la dirección, cambia la pestaña.
  useEffect(() => {
    const cambio = () => {
      const h = window.location.hash.slice(1) as Pestana;
      if (PESTANAS.some((p) => p.id === h)) setPestana(h);
    };
    window.addEventListener('hashchange', cambio);
    return () => window.removeEventListener('hashchange', cambio);
  }, []);

  const resultados: Resultado[] = useMemo(() => buscar(datos, pregunta.vector), [datos, pregunta]);
  const posPregunta = useMemo(() => proyectar(datos, pregunta.vector), [datos, pregunta]);

  return {
    datos,
    pestana, setPestana,
    pagina, setPagina,
    tam, setTam,
    solape, setSolape,
    chunkA, setChunkA,
    chunkB, setChunkB,
    seleccion, setSeleccion,
    filtro, setFiltro,
    colorPor, setColorPor,
    pregunta, setPregunta: (p: Pregunta) => { setPregunta(p); setAnimacion((a) => a + 1); },
    resultados, posPregunta,
    k, setK,
    casoMetodos, setCasoMetodos: (i: number) => { setCasoMetodos(i); setAnimacion((a) => a + 1); },
    animacion, relanzar: () => setAnimacion((a) => a + 1),
  };
}

export type Estado = ReturnType<typeof usarEstado>;
const Ctx = createContext<Estado | null>(null);

export function ProveedorEstado({ datos, children }: { datos: Datos; children: ReactNode }) {
  const e = usarEstado(datos);
  return <Ctx.Provider value={e}>{children}</Ctx.Provider>;
}

export function useEstado() {
  const e = useContext(Ctx);
  if (!e) throw new Error('useEstado fuera del proveedor');
  return e;
}

// Colores de los 8 temas (claros sobre fondo oscuro, distinguibles entre sí).
export const COLORES_TEMA = ['#ff7ad9', '#7ef0ff', '#a996ff', '#ffd23f', '#6ee7a8', '#ff9f6b', '#5b9bff', '#c7b8ff'];
