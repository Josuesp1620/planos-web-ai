/**
 * Métodos: tabla de posiciones vista de frente. Cada fila es un método y cada casilla un puesto
 * (1 a 50). La ficha de la respuesta correcta viaja hasta su puesto real. Las 5 primeras casillas
 * son lo que recibe el modelo. El reranker solo revisa las 20 primeras que trae la búsqueda por
 * vectores: si la respuesta no está ahí, no la ve.
 */
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useEstado } from '../lib/estado';
import { DORADO, MAGENTA } from './comun';

const PUESTOS = 50;
const ANCHO = 10;
const X0 = -ANCHO / 2 + 0.4;
const PASO = (ANCHO - 0.4) / PUESTOS;
const xDe = (p: number) => X0 + (p - 0.5) * PASO;
const FILAS = [
  { clave: 'vectores', nombre: 'Vectores', y: 1.65 },
  { clave: 'palabras', nombre: 'Palabras (BM25)', y: 0.55 },
  { clave: 'hibrida', nombre: 'Híbrida', y: -0.55 },
  { clave: 'reranker', nombre: 'Reranker', y: -1.65 },
] as const;

function Casillas() {
  const malla = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const t = new THREE.Object3D();
    const c = new THREE.Color();
    let i = 0;
    FILAS.forEach((f) =>
      Array.from({ length: PUESTOS }, (_, k) => k + 1).forEach((p) => {
        t.position.set(xDe(p), f.y, 0);
        t.scale.set(PASO * 0.8, 0.62, 0.02);
        t.updateMatrix();
        malla.current.setMatrixAt(i, t.matrix);
        const fuera = f.clave === 'reranker' && p > 20;
        malla.current.setColorAt(i, c.set(p <= 5 ? '#4a3d14' : fuera ? '#101217' : '#2a3040'));
        i++;
      }),
    );
    malla.current.instanceMatrix.needsUpdate = true;
    malla.current.instanceColor!.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={malla} args={[undefined, undefined, FILAS.length * PUESTOS]}>
      <boxGeometry />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function Ficha({ y, destino, exito, retraso }: { y: number; destino: number; exito: boolean; retraso: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const inicio = useRef(0);
  const { animacion } = useEstado();
  const reloj = useThree((s) => s.clock);
  useEffect(() => {
    inicio.current = reloj.elapsedTime;
    ref.current.position.set(xDe(PUESTOS) + 0.6, y, 0.15);
  }, [animacion, reloj, y]);
  useFrame(({ clock }, dt) => {
    if (clock.elapsedTime - inicio.current > retraso) easing.damp(ref.current.position, 'x', destino, 0.5, dt);
  });
  return (
    <mesh ref={ref} position={[xDe(PUESTOS) + 0.6, y, 0.15]}>
      <sphereGeometry args={[0.19, 32, 32]} />
      <meshBasicMaterial color={exito ? DORADO : MAGENTA} toneMapped={false} />
    </mesh>
  );
}

export function EscenaMetodos() {
  const { datos, casoMetodos } = useEstado();
  const caso = datos.casos[casoMetodos];
  const filas = useMemo(
    () =>
      FILAS.map((f) => {
        const puesto = caso.puestos[f.clave];
        const noLaVe = puesto === null;
        return { ...f, puesto, noLaVe, exito: !noLaVe && puesto! <= 5, destino: noLaVe ? xDe(21) : xDe(Math.min(puesto!, PUESTOS)) };
      }),
    [caso],
  );
  return (
    <group>
      <Casillas />
      {/* Marco del top 5 */}
      <mesh position={[(xDe(1) + xDe(5)) / 2, 0, -0.02]}>
        <planeGeometry args={[5 * PASO + 0.12, 4.3]} />
        <meshBasicMaterial color={DORADO} transparent opacity={0.08} />
      </mesh>
      <Html position={[(xDe(1) + xDe(5)) / 2, 2.55, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap text-center font-mono text-[11px] font-semibold text-dorado">TOP 5<br /><span className="font-normal text-dorado/80">lo que recibe el modelo</span></div>
      </Html>
      <Html position={[(xDe(21) + xDe(50)) / 2, -2.65, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap font-mono text-[10px] text-tenue">el reranker no revisa del puesto 21 en adelante</div>
      </Html>
      {filas.map((f, i) => (
        <group key={f.clave}>
          <Html position={[X0 - 0.35, f.y, 0]} style={{ pointerEvents: 'none' }}>
            <div className="-translate-x-full -translate-y-1/2 whitespace-nowrap pr-1 text-right">
              <div className="text-sm font-semibold text-tinta">{f.nombre}</div>
              <div className={`font-mono text-[11px] ${f.exito ? 'text-dorado' : 'text-magenta'}`}>{f.noLaVe ? '✕ no la ve' : f.exito ? `✓ puesto ${f.puesto}` : `✕ puesto ${f.puesto}`}</div>
            </div>
          </Html>
          <Ficha y={f.y} destino={f.destino} exito={f.exito} retraso={0.2 + i * 0.3} />
        </group>
      ))}
      {[1, 5, 10, 20, 30, 40, 50].map((p) => (
        <Html key={p} position={[xDe(p), -2.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="font-mono text-[10px] text-tenue">{p === 50 ? '50+' : p}</div>
        </Html>
      ))}
    </group>
  );
}
