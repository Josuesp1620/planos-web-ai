import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Escenario } from './escenas/Escenario';
import { cargarDatos, type Datos } from './lib/datos';
import { PESTANAS, ProveedorEstado, useEstado } from './lib/estado';
import { PanelBuscar, PanelChunks, PanelDocumento, PanelEspacio, PanelMetodos, PanelVectores } from './paneles/Paneles';

// Leyenda corta de cada escena: qué significa cada color.
const LEYENDA: Record<string, { color: string; texto: string }[]> = {
  documento: [{ color: '#e9ebf0', texto: 'hoja con su texto real · clic para traerla al frente' }],
  chunks: [
    { color: '#5ee0f0', texto: 'cada color es un chunk' },
    { color: '#f7c948', texto: 'palabras que comparten dos chunks' },
  ],
  vectores: [
    { color: '#5ee0f0', texto: 'número positivo' },
    { color: '#f47ab8', texto: 'número negativo' },
    { color: '#f7c948', texto: 'A × B suma similitud' },
  ],
  espacio: [{ color: '#e9ebf0', texto: 'cada punto es un chunk · el color es su tema' }],
  buscar: [
    { color: '#ffffff', texto: 'tu pregunta' },
    { color: '#5ee0f0', texto: 'lo que recibe el modelo' },
    { color: '#f7c948', texto: 'respuesta correcta' },
  ],
  metodos: [
    { color: '#f7c948', texto: 'la respuesta entra al top 5' },
    { color: '#f47ab8', texto: 'queda fuera' },
  ],
};

// Destino del clic en el avatar y el nombre. Si se publica el portafolio (joucode-dev), cambiar aquí.
const PERFIL = 'https://github.com/Josuesp1620';
// Código de esta web.
const REPO = 'https://github.com/Josuesp1620/planos-web-ai';

/** Autores, como en los banners: avatar + usuario de GitHub | logo + API SERVICE SAC. */
function Autores() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2">
        <a href={PERFIL} target="_blank" rel="noreferrer" className="group flex items-center gap-2" title="Ver perfil de Josue Salazar">
          <img src="/marca/josuesp1620.jpg" alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full ring-1 ring-white/15 transition group-hover:ring-white/40" />
          <span className="hidden text-sm font-semibold text-tinta group-hover:underline lg:inline">Josuesp1620</span>
        </a>
        <a href="https://github.com/Josuesp1620" target="_blank" rel="noreferrer" aria-label="GitHub de Josue Salazar" title="GitHub" className="rounded p-1 text-tenue transition hover:text-tinta focus-visible:outline-2 focus-visible:outline-tinta">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <a href="https://www.linkedin.com/in/joucode" target="_blank" rel="noreferrer" aria-label="LinkedIn de Josue Salazar" title="LinkedIn" className="rounded p-1 text-tenue transition hover:text-tinta focus-visible:outline-2 focus-visible:outline-tinta">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden><path d="M0 1.15C0 .52.52 0 1.16 0h13.68C15.48 0 16 .52 16 1.15v13.7c0 .63-.52 1.15-1.16 1.15H1.16C.52 16 0 15.48 0 14.85V1.15zm4.94 12.24V6.18H2.54v7.21h2.4zm-1.2-8.2c.84 0 1.36-.55 1.36-1.25-.01-.71-.52-1.25-1.34-1.25-.82 0-1.36.54-1.36 1.25 0 .7.52 1.25 1.33 1.25h.01zm4.9 8.2V9.36c0-.21.02-.43.08-.58.17-.43.57-.88 1.23-.88.87 0 1.21.66 1.21 1.63v3.86h2.4V9.25c0-2.22-1.18-3.25-2.76-3.25-1.29 0-1.86.71-2.18 1.21v.03h-.02l.02-.03V6.18h-2.4c.03.68 0 7.21 0 7.21h2.4z"/></svg>
        </a>
      </div>
      <a href={REPO} target="_blank" rel="noreferrer" aria-label="Código de esta web en GitHub" title="Código de esta web en GitHub" className="hidden items-center gap-1.5 md:flex rounded-md border border-borde px-1.5 py-1 font-mono text-[11px] text-tenue transition hover:border-tinta/40 hover:text-tinta focus-visible:outline-2 focus-visible:outline-tinta">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4" /></svg>
        <span className="hidden 2xl:inline">Código</span>
      </a>
      <span className="h-6 w-px bg-borde" aria-hidden />
      <a href="https://apiservicesac.com" target="_blank" rel="noreferrer" className="group flex items-center gap-2" title="API SERVICE SAC">
        <img src="/marca/api-service-sac.png" alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
        <span className="hidden text-sm font-bold text-[#4b8dff] group-hover:underline lg:inline">API SERVICE SAC</span>
      </a>
    </div>
  );
}

function Interfaz() {
  const e = useEstado();
  const { pestana, setPestana, datos } = e;

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).tagName === 'INPUT') return;
      if (pestana === 'documento' && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
        e.setPagina(Math.max(1, Math.min(datos.paginas, e.pagina + (ev.key === 'ArrowRight' ? 1 : -1))));
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [pestana, e, datos.paginas]);

  return (
    <div className="flex h-full flex-col">
      <header className="relative z-10 flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-borde bg-fondo px-4 md:px-6">
        <div className="flex items-baseline gap-3 py-3">
          <span className="font-titulo text-xl font-extrabold tracking-wide">PLANOS</span>
          <span className="hidden text-xs text-tenue sm:inline">RAG por dentro, con una ley real de 86 páginas</span>
        </div>
        <nav className="barra-fina -mb-px flex flex-1 gap-1 overflow-x-auto md:justify-center" aria-label="Secciones">
          {PESTANAS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPestana(p.id)}
              className={`shrink-0 border-b-2 px-3 py-3.5 text-sm transition focus-visible:outline-2 focus-visible:outline-tinta ${
                pestana === p.id ? 'border-tinta font-semibold text-tinta' : 'border-transparent text-tenue hover:text-tinta'
              }`}
            >
              <span className="mr-1.5 font-mono text-[11px] text-tenue">{i + 1}</span>
              {p.nombre}
            </button>
          ))}
        </nav>
        <Autores />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[46vh] flex-1">
          <Escenario />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-x-4 gap-y-1.5 md:left-6">
            {LEYENDA[pestana].map((l) => (
              <span key={l.texto} className="flex items-center gap-2 rounded-full bg-fondo/80 px-3 py-1 text-xs text-tinta/80">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                {l.texto}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-tenue/80 md:left-6">Arrastra para girar · rueda para acercar</div>
          <div className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-tenue/80 md:right-6">Josue Salazar · API SERVICE SAC</div>
        </div>
        <aside className="barra-fina relative max-h-[54vh] overflow-y-auto border-t border-borde bg-panel md:max-h-none md:w-[400px] md:border-l md:border-t-0">
          <AnimatePresence mode="wait">
            <motion.div key={pestana} className="min-h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {pestana === 'documento' && <PanelDocumento />}
              {pestana === 'chunks' && <PanelChunks />}
              {pestana === 'vectores' && <PanelVectores />}
              {pestana === 'espacio' && <PanelEspacio />}
              {pestana === 'buscar' && <PanelBuscar />}
              {pestana === 'metodos' && <PanelMetodos />}
            </motion.div>
          </AnimatePresence>
        </aside>
      </main>
    </div>
  );
}

export default function App() {
  const [datos, setDatos] = useState<Datos | null>(null);
  useEffect(() => {
    // Las texturas usan las fuentes de la página: se espera a que carguen antes de dibujar.
    Promise.all([cargarDatos(), document.fonts.ready]).then(([d]) => setDatos(d));
  }, []);
  if (!datos)
    return (
      <div className="grid h-full place-items-center">
        <div className="text-center">
          <div className="font-titulo text-3xl font-extrabold">PLANOS</div>
          <div className="mt-2 text-sm text-tenue">Cargando 524 chunks reales…</div>
        </div>
      </div>
    );
  return (
    <ProveedorEstado datos={datos}>
      <Interfaz />
    </ProveedorEstado>
  );
}
