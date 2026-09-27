/**
 * Espacio vectorial: los 524 chunks en la proyección PCA 3D de sus vectores reales.
 *  - modo "espacio": color por tema (k-means real) o por página, filtro por palabra, clic para
 *    volar al chunk y ver sus 5 vecinos por similitud real.
 *  - modo "buscar": la pregunta entra como sonda, se expande una onda y se encienden, uno por uno,
 *    los k chunks más similares con su puesto.
 * Las distancias en pantalla son aproximadas (384 → 3 dimensiones); los rankings usan la similitud real.
 */
import { Html, Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { buscar, vectorDe } from '../lib/datos';
import { COLORES_TEMA, useEstado } from '../lib/estado';
import { CIAN, DORADO, ESCALA_ESPACIO } from './comun';

const pos = (xyz: number[]) => xyz.map((v) => v * ESCALA_ESPACIO) as [number, number, number];

function Puntos({ modo, onHover }: { modo: 'espacio' | 'buscar'; onHover: (id: number | null) => void }) {
  const { datos, colorPor, filtro, seleccion, setSeleccion, resultados, k, pregunta, animacion } = useEstado();
  const malla = useRef<THREE.InstancedMesh>(null!);
  const n = datos.chunks.length;
  const t = useMemo(() => new THREE.Object3D(), []);
  const inicio = useRef(0);
  const reloj = useThree((s) => s.clock);
  useEffect(() => {
    inicio.current = reloj.elapsedTime;
  }, [animacion, modo, reloj]);

  const coincide = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f.length >= 3 ? new Set(datos.chunks.filter((c) => c.texto.toLowerCase().includes(f)).map((c) => c.id)) : null;
  }, [filtro, datos]);
  const rango = useMemo(() => new Map(resultados.slice(0, k).map((r, i) => [r.id, i])), [resultados, k]);
  const vecinos = useMemo(() => (seleccion !== null ? new Set(buscar(datos, vectorDe(datos, seleccion)).slice(1, 6).map((r) => r.id)) : new Set<number>()), [datos, seleccion]);

  useFrame(({ clock }) => {
    const c = new THREE.Color();
    const e = clock.elapsedTime - inicio.current;
    for (let i = 0; i < n; i++) {
      let s = 0.07;
      if (modo === 'espacio') {
        c.set(colorPor === 'tema' ? COLORES_TEMA[datos.grupo[i]] : new THREE.Color(CIAN).lerp(new THREE.Color('#ff7ad9'), (datos.chunks[i].pagina - 1) / 85));
        if (coincide && !coincide.has(i)) c.multiplyScalar(0.12);
        if (seleccion !== null && i !== seleccion && !vecinos.has(i)) c.multiplyScalar(0.35);
        if (i === seleccion) s = 0.16;
        else if (vecinos.has(i) || coincide?.has(i)) s = 0.1;
      } else {
        const r = rango.get(i);
        const encendido = r !== undefined && e > 1.9 + r * 0.28;
        // La respuesta correcta se ve siempre (esté o no en el top-k), para que el aro rodee algo visible.
        if (i === pregunta.caso?.correcta && e > 1.9) (c.set(DORADO), (s = 0.17));
        else if (encendido) (c.set(CIAN), (s = 0.12));
        else c.set('#3a4170');
      }
      malla.current.setColorAt(i, c);
      t.position.set(...pos(datos.chunks[i].xyz));
      t.scale.setScalar(s);
      t.updateMatrix();
      malla.current.setMatrixAt(i, t.matrix);
    }
    malla.current.instanceMatrix.needsUpdate = true;
    malla.current.instanceColor!.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={malla}
      args={[undefined, undefined, n]}
      onPointerMove={(e) => (e.stopPropagation(), onHover(e.instanceId ?? null))}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (modo === 'espacio' && e.instanceId !== undefined) setSeleccion(e.instanceId);
      }}
    >
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function EtiquetasTemas() {
  const { datos, colorPor, seleccion } = useEstado();
  const centros = useMemo(
    () =>
      datos.temas.map((tema) => {
        const ids = datos.grupo.map((g, i) => (g === tema.id ? i : -1)).filter((i) => i >= 0);
        const c = [0, 0, 0];
        ids.forEach((i) => datos.chunks[i].xyz.forEach((v, j) => (c[j] += v / ids.length)));
        // Se empuja la etiqueta hacia afuera del centro de la nube para que no se monten.
        const largo = Math.hypot(c[0], c[1], c[2]) || 1;
        return pos(c.map((v) => v + (v / largo) * 0.28));
      }),
    [datos],
  );
  if (colorPor !== 'tema' || seleccion !== null) return null;
  return (
    <>
      {datos.temas.map((tema, i) => (
        <Html key={tema.id} position={centros[i]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="vidrio whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px]" style={{ borderColor: COLORES_TEMA[i], color: COLORES_TEMA[i] }}>
            {tema.palabras.slice(0, 3).join(' · ')}
          </div>
        </Html>
      ))}
    </>
  );
}

function Vecindad() {
  const { datos, seleccion } = useEstado();
  if (seleccion === null) return null;
  const vecinos = buscar(datos, vectorDe(datos, seleccion)).slice(1, 6);
  const p = pos(datos.chunks[seleccion].xyz);
  return (
    <>
      {vecinos.map((v) => (
        <group key={v.id}>
          <Line points={[p, pos(datos.chunks[v.id].xyz)]} color={CIAN} lineWidth={1.4} transparent opacity={0.7} />
          <Html position={pos(datos.chunks[v.id].xyz)} style={{ pointerEvents: 'none' }}>
            <div className="ml-2 whitespace-nowrap font-mono text-[10px] text-cian">{v.score.toFixed(3)}</div>
          </Html>
        </group>
      ))}
    </>
  );
}

function Sonda() {
  const { datos, posPregunta, resultados, k, pregunta, animacion } = useEstado();
  const sonda = useRef<THREE.Mesh>(null!);
  const onda = useRef<THREE.Mesh>(null!);
  const inicio = useRef(0);
  const [e, setE] = useState(0);
  const reloj = useThree((s) => s.clock);
  const destino = useMemo(() => new THREE.Vector3(...pos(posPregunta)), [posPregunta]);
  const origen = useMemo(() => new THREE.Vector3(0, 0, 9), []);
  useEffect(() => {
    inicio.current = reloj.elapsedTime;
  }, [animacion, reloj]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime - inicio.current;
    const viaje = Math.min(1, t / 1.2);
    const suave = 1 - Math.pow(1 - viaje, 3);
    sonda.current.position.lerpVectors(origen, destino, suave);
    sonda.current.scale.setScalar(0.14 + 0.03 * Math.sin(clock.elapsedTime * 4));
    const w = Math.max(0, Math.min(1, (t - 1.2) / 1.1));
    onda.current.position.copy(destino);
    onda.current.scale.setScalar(0.1 + w * 3.2);
    (onda.current.material as THREE.MeshBasicMaterial).opacity = w > 0 && w < 1 ? 0.22 * (1 - w) : 0;
    if (Math.floor(t * 8) !== Math.floor(e * 8)) setE(t);
  });
  const top = resultados.slice(0, k);
  return (
    <>
      <mesh ref={sonda}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh ref={onda}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={CIAN} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {top.map((r, i) =>
        e > 1.9 + i * 0.28 ? (
          <group key={r.id}>
            <Line points={[destino.toArray() as [number, number, number], pos(datos.chunks[r.id].xyz)]} color={r.id === pregunta.caso?.correcta ? DORADO : CIAN} lineWidth={1.6} transparent opacity={0.8} />
            <Html position={pos(datos.chunks[r.id].xyz)} style={{ pointerEvents: 'none' }} zIndexRange={[25, 0]}>
              <div className={`ml-2 whitespace-nowrap rounded px-1 font-mono text-[10px] font-semibold ${r.id === pregunta.caso?.correcta ? 'bg-dorado text-fondo' : 'bg-cian/85 text-fondo'}`}>
                {i + 1}
              </div>
            </Html>
          </group>
        ) : null,
      )}
      {pregunta.caso && e > 1.9 && (() => {
        const id = pregunta.caso.correcta;
        const puesto = resultados.findIndex((r) => r.id === id) + 1;
        const dentro = puesto <= k;
        const p = pos(datos.chunks[id].xyz);
        return (
          <group>
            <mesh position={p}>
              <torusGeometry args={[0.38, 0.03, 12, 48]} />
              <meshBasicMaterial color={DORADO} toneMapped={false} />
            </mesh>
            {!dentro && <Line points={[destino.toArray() as [number, number, number], p]} color={DORADO} lineWidth={1.4} dashed dashSize={0.12} gapSize={0.1} transparent opacity={0.8} />}
            <Html position={p} style={{ pointerEvents: 'none' }} zIndexRange={[35, 0]}>
              <div className={`ml-7 -mt-16 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] font-semibold ${dentro ? 'border-dorado bg-dorado text-fondo' : 'border-dorado bg-fondo/90 text-dorado'}`}>
                respuesta correcta · puesto {puesto}{dentro ? '' : ` · fuera del top ${k}`}
              </div>
            </Html>
          </group>
        );
      })()}
      <Html position={destino.toArray() as [number, number, number]} center style={{ pointerEvents: 'none' }}>
        <div className="-translate-y-7 whitespace-nowrap rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-fondo">tu pregunta</div>
      </Html>
    </>
  );
}

function Tooltip({ id }: { id: number }) {
  const { datos } = useEstado();
  const c = datos.chunks[id];
  return (
    <Html position={pos(c.xyz)} style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
      <div className="vidrio ml-3 w-64 rounded-xl p-3 text-xs leading-snug">
        <div className="mb-1 flex justify-between font-mono text-[10px]">
          <span className="text-cian">chunk #{c.id}</span>
          <span className="text-tenue">p. {c.pagina} · tema: {datos.temas[datos.grupo[c.id]].palabras[0]}</span>
        </div>
        <div className="text-tinta/85">{c.texto.slice(0, 160)}…</div>
      </div>
    </Html>
  );
}

export function EscenaEspacio({ modo }: { modo: 'espacio' | 'buscar' }) {
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    document.body.style.cursor = hover !== null && modo === 'espacio' ? 'pointer' : 'auto';
    return () => void (document.body.style.cursor = 'auto');
  }, [hover, modo]);
  const grupo = useRef<THREE.Group>(null!);
  return (
    <group ref={grupo}>
      <Puntos modo={modo} onHover={setHover} />
      {modo === 'espacio' && <EtiquetasTemas />}
      {modo === 'espacio' && <Vecindad />}
      {modo === 'buscar' && <Sonda />}
      {hover !== null && <Tooltip id={hover} />}
    </group>
  );
}
