/**
 * Paneles del inspector. Misma estructura en todos:
 *   qué estás viendo → Prueba → Resultado → Cómo funciona (plegable) → Siguiente
 */
import { useMemo, useState } from 'react';
import { Bloque, Campo, Cifra, Deslizador, Detalles, Opciones, Panel, Pildoras } from '../components/ui';
import { buscar, coseno, cortar, palabrasDe, totalChunks, vectorDe } from '../lib/datos';
import { COLORES_TEMA, useEstado } from '../lib/estado';
import { useEmbedder } from '../lib/useEmbedder';

const fmt = (n: number) => n.toLocaleString('es-PE');

export function PanelDocumento() {
  const { datos, pagina, setPagina, setPestana } = useEstado();
  const texto = datos.paginasTexto[pagina - 1].texto;
  const palabras = palabrasDe(texto).length;
  return (
    <Panel
      titulo="El documento"
      intro={<>Una ley real de <b>{datos.paginas} páginas</b>. Todo lo que ves en las demás pestañas se calcula sobre este texto.</>}
      siguiente={{ etiqueta: 'cómo se corta en chunks', onClick: () => setPestana('chunks') }}
    >
      <Bloque titulo="Prueba">
        <Deslizador id="pagina" etiqueta="Página" valor={pagina} min={1} max={datos.paginas} onCambio={setPagina} />
      </Bloque>
      <Bloque titulo="Resultado">
        <div className="grid grid-cols-2 gap-2">
          <Cifra valor={palabras} etiqueta={`palabras en la página ${pagina}`} />
          <Cifra valor={cortar(palabras, 100, 25).length} etiqueta="chunks que produce" />
        </div>
      </Bloque>
      <Detalles titulo="Ver el texto de esta página">
        <p className="max-h-60 overflow-y-auto">{texto}</p>
      </Detalles>
    </Panel>
  );
}

const PRESETS_CHUNK = [
  { nombre: 'Pequeños · 50/10', tam: 50, solape: 10 },
  { nombre: 'Episodios · 100/25', tam: 100, solape: 25 },
  { nombre: 'Grandes · 200/50', tam: 200, solape: 50 },
];

export function PanelChunks() {
  const { datos, pagina, tam, setTam, solape, setSolape, setPestana } = useEstado();
  const palabras = palabrasDe(datos.paginasTexto[pagina - 1].texto).length;
  const total = useMemo(() => totalChunks(datos, tam, solape), [datos, tam, solape]);
  const activo = PRESETS_CHUNK.find((p) => p.tam === tam && p.solape === solape)?.nombre;
  return (
    <Panel
      titulo="Chunks"
      intro="El documento se corta en fragmentos de palabras. Cada color de la página es un chunk; lo dorado se repite en dos chunks seguidos."
      siguiente={{ etiqueta: 'cada chunk como números', onClick: () => setPestana('vectores') }}
    >
      <Bloque titulo="Prueba">
        <Pildoras opciones={PRESETS_CHUNK.map((p) => p.nombre)} activa={activo} onElegir={(n) => { const p = PRESETS_CHUNK.find((x) => x.nombre === n)!; setTam(p.tam); setSolape(p.solape); }} />
        <Deslizador id="tam" etiqueta="Tamaño" valor={tam} min={20} max={200} paso={5} onCambio={(v) => { setTam(v); if (solape >= v) setSolape(Math.max(0, v - 5)); }} formato={(v) => `${v} palabras`} />
        <Deslizador id="solape" etiqueta="Solapamiento" valor={solape} min={0} max={Math.max(0, tam - 5)} paso={5} onCambio={setSolape} formato={(v) => `${v} palabras`} />
      </Bloque>
      <Bloque titulo="Resultado">
        <div className="grid grid-cols-2 gap-2">
          <Cifra valor={cortar(palabras, tam, solape).length} etiqueta={`chunks en la página ${pagina}`} />
          <Cifra valor={fmt(total)} etiqueta="chunks en todo el documento" />
        </div>
      </Bloque>
      <Detalles>
        <p>Se toma una ventana de <b>{tam}</b> palabras y se avanza <b>{tam - solape}</b>. Así, cada chunk comparte sus últimas {solape} palabras con el siguiente y ninguna idea queda partida sin contexto.</p>
        <p>Chunks pequeños dan búsquedas más precisas pero con poco contexto. Los grandes dan más contexto pero mezclan temas. Los episodios usan 100/25: 524 chunks.</p>
      </Detalles>
    </Panel>
  );
}

export function PanelVectores() {
  const { datos, chunkA, setChunkA, chunkB, setChunkB, setPestana } = useEstado();
  const sim = coseno(datos, chunkA, chunkB);
  const vecinosA = useMemo(() => buscar(datos, vectorDe(datos, chunkA)), [datos, chunkA]);
  const puestoB = vecinosA.findIndex((r) => r.id === chunkB);
  const [modo, setModo] = useState<'parecido' | 'distinto' | 'libre'>('parecido');
  const [q, setQ] = useState('');
  const hallados = useMemo(() => {
    const f = q.trim().toLowerCase();
    return f.length < 3 ? [] : datos.chunks.filter((c) => c.texto.toLowerCase().includes(f)).slice(0, 5);
  }, [q, datos]);
  const nivel = sim > 0.75 ? 'casi lo mismo' : sim > 0.5 ? 'hablan de lo mismo' : sim > 0.3 ? 'algo relacionados' : 'temas distintos';
  return (
    <Panel
      titulo="Vectores"
      intro="Cada chunk se convierte en 384 números. Si dos chunks hablan de lo mismo, sus números suben y bajan juntos."
      siguiente={{ etiqueta: 'todos los chunks en el espacio', onClick: () => setPestana('espacio') }}
    >
      <Bloque titulo="Prueba">
        <Opciones
          valor={modo}
          onCambio={(m) => {
            setModo(m);
            if (m === 'parecido') setChunkB(vecinosA[1].id);
            if (m === 'distinto') setChunkB(vecinosA[vecinosA.length - 1].id);
          }}
          opciones={[
            { valor: 'parecido', etiqueta: 'Comparar con el más parecido', detalle: 'B = el chunk más similar a A' },
            { valor: 'distinto', etiqueta: 'Comparar con el más distinto', detalle: 'B = el chunk menos similar a A' },
            { valor: 'libre', etiqueta: 'Elegir B con una palabra', detalle: 'busca un chunk que contenga esa palabra' },
          ]}
        />
        {modo === 'libre' && (
          <div>
            <Campo id="buscar-b" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. garantía, banco, reclamo" />
            {hallados.map((c) => (
              <button key={c.id} onClick={() => (setChunkB(c.id), setQ(''))} className="mt-1 block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-tinta/75 hover:bg-white/5">
                <span className="font-mono text-tinta">p.{c.pagina}</span> · {c.texto.slice(0, 60)}…
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-tenue">Pasa el mouse sobre las barras para ver los números de cada dimensión.</p>
      </Bloque>
      <Bloque titulo="Resultado">
        <div className="rounded-lg bg-white/[0.035] p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-titulo text-4xl font-extrabold text-dorado tabular-nums">{sim.toFixed(3)}</span>
            <span className="text-sm text-tinta/80">{nivel}</span>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-white/10 via-white/20 to-dorado/60">
            <div className="absolute -top-1 h-4 w-1 rounded bg-tinta" style={{ left: `calc(${Math.max(0, Math.min(1, sim)) * 100}% - 2px)` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-tenue">
            <span>0 · nada que ver</span>
            <span>1 · idénticos</span>
          </div>
          <p className="mt-3 text-xs text-tenue">B es el chunk número <b className="text-tinta">{puestoB}</b> más parecido a A, de {datos.chunks.length - 1}.</p>
        </div>
      </Bloque>
      <Detalles>
        <p>Se multiplica cada número de A por el de B (franja inferior) y se suma todo. Como los vectores tienen largo 1, esa suma es la <b>similitud coseno</b>: {sim.toFixed(3)}.</p>
        <p>Dorado: A y B van en el mismo sentido y suman. Magenta: van en sentido contrario y restan.</p>
        <button onClick={() => setChunkA(chunkB === 319 ? 94 : 319)} className="text-xs text-tinta underline underline-offset-2">Cambiar A por otro chunk de ejemplo</button>
      </Detalles>
      <Detalles titulo="Ver el texto de A y B">
        <p><b>A · p. {datos.chunks[chunkA].pagina}:</b> {datos.chunks[chunkA].texto}</p>
        <p><b>B · p. {datos.chunks[chunkB].pagina}:</b> {datos.chunks[chunkB].texto}</p>
      </Detalles>
    </Panel>
  );
}

export function PanelEspacio() {
  const { datos, colorPor, setColorPor, filtro, setFiltro, seleccion, setSeleccion, setPestana } = useEstado();
  const coincidencias = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f.length >= 3 ? datos.chunks.filter((c) => c.texto.toLowerCase().includes(f)).length : null;
  }, [filtro, datos]);
  const vecinos = useMemo(() => (seleccion !== null ? buscar(datos, vectorDe(datos, seleccion)).slice(1, 6) : []), [datos, seleccion]);
  return (
    <Panel
      titulo="Espacio"
      intro="Cada punto es un chunk. Los que hablan de lo mismo quedan cerca, y se forman grupos por tema."
      siguiente={{ etiqueta: 'hacer una pregunta', onClick: () => setPestana('buscar') }}
    >
      <Bloque titulo="Prueba">
        <Campo id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Resalta los chunks con una palabra" />
        <Pildoras opciones={['multa', 'garantía', 'banco', 'reclamo']} activa={filtro} onElegir={setFiltro} />
        <p className="text-xs text-tenue">Haz clic en un punto para acercarte y ver sus vecinos.</p>
      </Bloque>
      <Bloque titulo="Resultado">
        {seleccion !== null ? (
          <div className="rounded-lg bg-white/[0.035] p-3.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold">Chunk de la página {datos.chunks[seleccion].pagina}</span>
              <button onClick={() => setSeleccion(null)} className="text-tenue hover:text-tinta">cerrar</button>
            </div>
            <p className="line-clamp-4 text-[13px] leading-relaxed text-tinta/75">{datos.chunks[seleccion].texto}</p>
            <div className="mt-3 text-[11px] text-tenue">SUS 5 VECINOS MÁS PARECIDOS</div>
            {vecinos.map((v) => (
              <button key={v.id} onClick={() => setSeleccion(v.id)} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-white/5">
                <span className="w-10 text-tenue">p.{datos.chunks[v.id].pagina}</span>
                <span className="flex-1 truncate text-tinta/75">{datos.chunks[v.id].texto.slice(0, 44)}</span>
                <span className="font-mono tabular-nums">{v.score.toFixed(2)}</span>
              </button>
            ))}
          </div>
        ) : coincidencias !== null ? (
          <Cifra valor={coincidencias} etiqueta={`chunks contienen “${filtro.trim()}”`} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Cifra valor={datos.chunks.length} etiqueta="chunks" />
            <Cifra valor={datos.temas.length} etiqueta="grupos de temas" />
          </div>
        )}
      </Bloque>
      <Detalles titulo="Los 8 grupos de temas">
        <div className="flex gap-1.5 pb-1">
          <button onClick={() => setColorPor('tema')} className={`rounded px-2 py-0.5 text-xs ${colorPor === 'tema' ? 'bg-white/10 text-tinta' : 'text-tenue'}`}>color por tema</button>
          <button onClick={() => setColorPor('pagina')} className={`rounded px-2 py-0.5 text-xs ${colorPor === 'pagina' ? 'bg-white/10 text-tinta' : 'text-tenue'}`}>color por página</button>
        </div>
        {datos.temas.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORES_TEMA[i] }} />
            <span className="flex-1 truncate">{t.palabras.join(' · ')}</span>
            <span className="text-tenue">{t.chunks}</span>
          </div>
        ))}
        <p>Grupos calculados con k-means sobre los vectores; las palabras son las más características de cada grupo. Las 384 dimensiones se muestran proyectadas en 3D, así que las distancias en pantalla son aproximadas.</p>
      </Detalles>
    </Panel>
  );
}

export function PanelBuscar() {
  const { datos, pregunta, setPregunta, resultados, k, setK, relanzar, setPestana } = useEstado();
  const { estado, vectorizar } = useEmbedder();
  const [texto, setTexto] = useState('');
  const correcta = pregunta.caso?.correcta;
  const puesto = correcta !== undefined ? resultados.findIndex((r) => r.id === correcta) + 1 : null;
  return (
    <Panel
      titulo="Buscar"
      intro={<>Tu pregunta se convierte en un punto (blanco) y se toman los <b>{k} chunks más cercanos</b>. Solo eso recibe el modelo para responder.</>}
      siguiente={{ etiqueta: 'comparar métodos de búsqueda', onClick: () => setPestana('metodos') }}
    >
      <Bloque titulo="Prueba">
        <Opciones
          valor={pregunta.caso?.correcta ?? null}
          onCambio={(id) => { const c = datos.casos.find((x) => x.correcta === id)!; setPregunta({ texto: c.pregunta, vector: c.vector, caso: c }); }}
          opciones={datos.casos.map((c) => ({ valor: c.correcta, etiqueta: c.pregunta, detalle: `episodio ${c.episodio}` }))}
        />
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = texto.trim();
            if (!t) return;
            setPregunta({ texto: t, vector: await vectorizar(t) });
          }}
        >
          <Campo id="pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O escribe tu propia pregunta" />
          <button disabled={estado.cargando} className="shrink-0 rounded-lg bg-tinta px-4 text-sm font-semibold text-fondo disabled:opacity-50">Buscar</button>
        </form>
        {estado.cargando && (
          <div>
            <div className="h-1 overflow-hidden rounded bg-white/10">
              <div className="h-full bg-tinta transition-all" style={{ width: `${estado.listo ? 100 : estado.progreso}%` }} />
            </div>
            <p className="mt-1 text-xs text-tenue">{estado.listo ? 'Vectorizando…' : `La primera vez se descarga el modelo en tu navegador (~120 MB) · ${estado.progreso}%`}</p>
          </div>
        )}
        {estado.error && <p className="text-xs text-magenta">No se pudo cargar el modelo. Los casos de los episodios siguen funcionando.</p>}
      </Bloque>
      <Bloque titulo="Resultado">
        {pregunta.caso && puesto ? (
          <div className={`rounded-lg border p-3.5 ${puesto <= k ? 'border-dorado/50 bg-dorado/[0.06]' : 'border-magenta/50 bg-magenta/[0.06]'}`}>
            <div className={`font-titulo text-xl font-extrabold ${puesto <= k ? 'text-dorado' : 'text-magenta'}`}>
              {puesto <= k ? `✓ La respuesta correcta entra (puesto ${puesto})` : `✕ La respuesta correcta queda fuera (puesto ${puesto})`}
            </div>
            <p className="mt-1 text-xs text-tinta/70">Respuesta correcta: {pregunta.caso.respuesta}. En el 3D es el punto dorado con aro.</p>
            {puesto > k && <p className="mt-2 text-xs text-tenue">Si en el 3D se ve cerca, es un efecto de la vista: son 384 dimensiones dibujadas en 3. El puesto usa la similitud real.</p>}
          </div>
        ) : (
          <p className="text-xs text-tenue">Con tu propia pregunta no hay una respuesta “correcta” marcada: mira qué chunks trae.</p>
        )}
        <div className="space-y-0.5">
          {resultados.slice(0, k).map((r, i) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded px-1 py-1.5 text-xs">
              <span className="w-5 text-tenue">{i + 1}</span>
              <span className="w-10 font-mono">p.{datos.chunks[r.id].pagina}</span>
              <span className="flex-1 truncate text-tinta/70">{datos.chunks[r.id].texto.slice(0, 48)}</span>
              <span className={`font-mono tabular-nums ${r.id === correcta ? 'text-dorado' : ''}`}>{r.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Bloque>
      <Detalles titulo="Ajustar cuántos chunks recibe el modelo">
        <Deslizador id="k" etiqueta="Chunks que recibe (top-k)" valor={k} min={1} max={10} onCambio={setK} />
        <button onClick={relanzar} className="text-xs text-tinta underline underline-offset-2">Repetir la animación</button>
      </Detalles>
      <Detalles titulo="Ver el prompt que recibe el modelo">
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed">{`Responde solo con este contexto:\n\n${resultados.slice(0, k).map((r) => `[p. ${datos.chunks[r.id].pagina}] ${datos.chunks[r.id].texto}`).join('\n\n')}\n\nPregunta: ${pregunta.texto}`}</pre>
      </Detalles>
    </Panel>
  );
}

export function PanelMetodos() {
  const { datos, casoMetodos, setCasoMetodos } = useEstado();
  const caso = datos.casos[casoMetodos];
  const filas = [
    ['Vectores', caso.puestos.vectores],
    ['Palabras (BM25)', caso.puestos.palabras],
    ['Híbrida', caso.puestos.hibrida],
    ['Reranker', caso.puestos.reranker],
  ] as const;
  return (
    <Panel titulo="Métodos" intro="La misma pregunta con cuatro formas de buscar. Gana el método que deja la respuesta correcta en el top 5, lo que recibe el modelo.">
      <Bloque titulo="Prueba">
        <Opciones valor={casoMetodos} onCambio={setCasoMetodos} opciones={datos.casos.map((c, i) => ({ valor: i, etiqueta: c.pregunta, detalle: `episodio ${c.episodio}` }))} />
      </Bloque>
      <Bloque titulo="Resultado">
        <div className="divide-y divide-borde rounded-lg bg-white/[0.035]">
          {filas.map(([nombre, puesto]) => {
            const ok = puesto !== null && puesto <= 5;
            return (
              <div key={nombre} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                <span>{nombre}</span>
                <span className={`font-mono font-semibold ${ok ? 'text-dorado' : 'text-magenta'}`}>{puesto === null ? '✕ no la ve' : `${ok ? '✓' : '✕'} puesto ${puesto}`}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-tenue">Respuesta correcta: {caso.respuesta}</p>
      </Bloque>
      <Detalles titulo="Qué hace cada método">
        <p><b>Vectores:</b> compara el significado de la pregunta con el de cada chunk.</p>
        <p><b>Palabras (BM25):</b> cuenta las palabras de la pregunta que aparecen en cada chunk y premia las menos comunes.</p>
        <p><b>Híbrida:</b> combina los dos rankings anteriores (RRF, k = 60).</p>
        <p><b>Reranker:</b> procesa la pregunta con cada chunk, juntos, y los reordena. Solo revisa los 20 primeros de la búsqueda por vectores: si la respuesta no está ahí, no la ve.</p>
        <p className="text-tenue">Datos reales: reranker {datos.reranker.split('/')[1]}; BM25 con las palabras llevadas a su raíz.</p>
      </Detalles>
    </Panel>
  );
}
