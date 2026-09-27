import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoModelo = { cargando: boolean; progreso: number; error: string | null; listo: boolean };

/** Vectoriza textos en un worker con el mismo modelo de los episodios. */
export function useEmbedder() {
  const worker = useRef<Worker | null>(null);
  const pendiente = useRef<((v: number[]) => void) | null>(null);
  const [estado, setEstado] = useState<EstadoModelo>({ cargando: false, progreso: 0, error: null, listo: false });

  useEffect(() => {
    const w = new Worker(new URL('./embedder.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.tipo === 'progreso' && m.p.status === 'progress' && typeof m.p.progress === 'number' && m.p.file?.endsWith('.onnx')) {
        setEstado((s) => ({ ...s, progreso: Math.round(m.p.progress) }));
      } else if (m.tipo === 'vector') {
        setEstado({ cargando: false, progreso: 100, error: null, listo: true });
        pendiente.current?.(m.vector);
        pendiente.current = null;
      } else if (m.tipo === 'error') {
        setEstado((s) => ({ ...s, cargando: false, error: m.mensaje }));
      }
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  const vectorizar = useCallback(
    (texto: string) =>
      new Promise<number[]>((resolve) => {
        pendiente.current = resolve;
        setEstado((s) => ({ ...s, cargando: true, error: null }));
        worker.current?.postMessage({ texto });
      }),
    [],
  );

  return { estado, vectorizar };
}
