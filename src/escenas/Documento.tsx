/**
 * Documento: las 86 hojas de la ley como papel 3D en carrusel (cover flow), con su texto real.
 * La hoja elegida sale al frente en alta resolución; las vecinas giran a los costados.
 */
import { ContactShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useEstado } from '../lib/estado';
import { texturaHoja } from '../lib/texturas';

const ANCHO = 2.3;
const ALTO = ANCHO * 1.414;
const VECINAS = 11;

function Hoja({ n, activa, desfase, onClick }: { n: number; activa: boolean; desfase: number; onClick: () => void }) {
  const { datos } = useEstado();
  const ref = useRef<THREE.Mesh>(null!);
  const textura = useMemo(() => texturaHoja(n, datos.paginasTexto[n - 1].texto, activa), [n, activa, datos]);
  const lado = Math.sign(desfase);
  const d = Math.abs(desfase);
  const objetivo = activa ? new THREE.Vector3(0, 0.05, 1.3) : new THREE.Vector3(lado * (1.75 + d * 0.36), 0, -0.6 - d * 0.06);
  const giro = activa ? 0 : -lado * 1.1;
  useFrame((_, dt) => {
    easing.damp3(ref.current.position, objetivo, 0.28, dt);
    easing.dampE(ref.current.rotation, [0, giro, 0], 0.28, dt);
  });
  return (
    <mesh ref={ref} position={[lado * 8, 0, -2]} onClick={(e) => (e.stopPropagation(), onClick())}>
      <planeGeometry args={[ANCHO, ALTO]} />
      <meshStandardMaterial map={textura} roughness={0.82} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function EscenaDocumento() {
  const { datos, pagina, setPagina } = useEstado();
  const visibles = useMemo(() => {
    const out: number[] = [];
    for (let n = Math.max(1, pagina - VECINAS); n <= Math.min(datos.paginas, pagina + VECINAS); n++) out.push(n);
    return out;
  }, [pagina, datos.paginas]);
  return (
    <group>
      {visibles.map((n) => (
        <Hoja key={n} n={n} activa={n === pagina} desfase={n - pagina} onClick={() => setPagina(n)} />
      ))}
      <ContactShadows position={[0, -ALTO / 2 - 0.08, 0]} opacity={0.55} scale={16} blur={2.6} far={3} color="#000" />
    </group>
  );
}
