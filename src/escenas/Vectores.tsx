/**
 * Vectores: tres franjas alineadas con las 384 dimensiones.
 *   A      los 384 números del chunk A (hacia arriba positivos, hacia abajo negativos)
 *   B      los del chunk B
 *   A × B  el producto de cada dimensión: dorado si A y B van en el mismo sentido (suma),
 *          magenta si van en sentido contrario (resta). La suma de esta franja es la similitud coseno.
 * Al pasar el mouse por una columna se ven sus tres valores.
 */
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { coseno, DIM, vectorDe } from '../lib/datos';
import { useEstado } from '../lib/estado';
import { CIAN, DORADO, MAGENTA } from './comun';

const ANCHO = 10.4;
const X0 = -ANCHO / 2;
const PASO = ANCHO / DIM;
const FILAS = [
  { clave: 'a', y: 2.1, escala: 5 },
  { clave: 'b', y: 0.15, escala: 5 },
  { clave: 'p', y: -1.95, escala: 70 },
] as const;

function Franja({ valores, y, escala, pos, neg }: { valores: ArrayLike<number>; y: number; escala: number; pos: string; neg: string }) {
  const malla = useRef<THREE.InstancedMesh>(null!);
  const crecer = useRef(0);
  const t = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    crecer.current = 0;
    const c = new THREE.Color();
    for (let j = 0; j < DIM; j++) malla.current.setColorAt(j, c.set(valores[j] >= 0 ? pos : neg));
    malla.current.instanceColor!.needsUpdate = true;
  }, [valores, pos, neg]);
  useFrame((_, dt) => {
    if (crecer.current >= 1) return;
    crecer.current = Math.min(1, crecer.current + dt * 1.6);
    const k = 1 - Math.pow(1 - crecer.current, 3);
    for (let j = 0; j < DIM; j++) {
      const h = Math.max(0.006, Math.min(1.5, Math.abs(valores[j]) * escala) * k);
      t.position.set(X0 + (j + 0.5) * PASO, y + (valores[j] >= 0 ? h : -h) / 2, 0);
      t.scale.set(PASO * 0.72, h, 0.05);
      t.updateMatrix();
      malla.current.setMatrixAt(j, t.matrix);
    }
    malla.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh position={[0, y, -0.03]}>
        <planeGeometry args={[ANCHO + 0.2, 0.008]} />
        <meshBasicMaterial color="#3a4152" />
      </mesh>
      <instancedMesh ref={malla} args={[undefined, undefined, DIM]}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function EscenaVectores() {
  const { datos, chunkA, chunkB } = useEstado();
  const a = vectorDe(datos, chunkA);
  const b = vectorDe(datos, chunkB);
  const producto = useMemo(() => Float32Array.from({ length: DIM }, (_, j) => a[j] * b[j]), [a, b]);
  const sim = coseno(datos, chunkA, chunkB);
  const [dim, setDim] = useState<number | null>(null);
  const etiquetas = [
    { y: FILAS[0].y, t: 'A', s: `chunk #${chunkA} · p. ${datos.chunks[chunkA].pagina}` },
    { y: FILAS[1].y, t: 'B', s: `chunk #${chunkB} · p. ${datos.chunks[chunkB].pagina}` },
    { y: FILAS[2].y, t: 'A × B', s: `suma = ${sim.toFixed(3)}` },
  ];
  return (
    <group>
      <Franja valores={a} y={FILAS[0].y} escala={FILAS[0].escala} pos={CIAN} neg={MAGENTA} />
      <Franja valores={b} y={FILAS[1].y} escala={FILAS[1].escala} pos={CIAN} neg={MAGENTA} />
      <Franja valores={producto} y={FILAS[2].y} escala={FILAS[2].escala} pos={DORADO} neg={MAGENTA} />

      {/* Zona para leer una columna con el mouse. */}
      <mesh position={[0, 0.1, 0.05]} onPointerMove={(e) => setDim(Math.max(0, Math.min(DIM - 1, Math.floor((e.point.x - X0) / PASO))))} onPointerOut={() => setDim(null)}>
        <planeGeometry args={[ANCHO, 5.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {dim !== null && (
        <>
          <mesh position={[X0 + (dim + 0.5) * PASO, 0.1, 0.02]}>
            <planeGeometry args={[PASO * 1.6, 5.6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <Html position={[X0 + (dim + 0.5) * PASO, 3.3, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="vidrio whitespace-nowrap rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed">
              <div className="text-tenue">dimensión {dim + 1} de 384</div>
              <div>A = <span className={a[dim] >= 0 ? 'text-cian' : 'text-magenta'}>{a[dim].toFixed(3)}</span> · B = <span className={b[dim] >= 0 ? 'text-cian' : 'text-magenta'}>{b[dim].toFixed(3)}</span></div>
              <div>A × B = <span className={producto[dim] >= 0 ? 'text-dorado' : 'text-magenta'}>{producto[dim] >= 0 ? '+' : ''}{producto[dim].toFixed(4)}</span></div>
            </div>
          </Html>
        </>
      )}

      {etiquetas.map((e) => (
        <Html key={e.t} position={[X0 - 0.25, e.y, 0]} style={{ pointerEvents: 'none' }}>
          <div className="-translate-x-full -translate-y-1/2 pr-1 text-right">
            <div className="font-titulo text-lg font-extrabold text-tinta">{e.t}</div>
            <div className="whitespace-nowrap font-mono text-[10px] text-tenue">{e.s}</div>
          </div>
        </Html>
      ))}
    </group>
  );
}
