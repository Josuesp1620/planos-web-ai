/**
 * El lienzo 3D común: cámara que viaja con suavidad entre pestañas, luces, estrellas, brillo
 * (bloom) y la escena de la pestaña activa.
 */
import { CameraControls, Environment, Html, Lightformer, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useRef } from 'react';
import { ESCALA_ESPACIO } from './comun';
import { type Pestana, useEstado } from '../lib/estado';
import { EscenaChunks } from './Chunks';
import { EscenaDocumento } from './Documento';
import { EscenaEspacio } from './Espacio';
import { EscenaMetodos } from './Metodos';
import { EscenaVectores } from './Vectores';

const CAMARAS: Record<Pestana, [number, number, number, number, number, number]> = {
  documento: [0, 0.4, 8.2, 0, 0, 0],
  chunks: [0, 0, 9.4, 0, 0, 0],
  vectores: [-0.7, 0.3, 13.2, -0.7, 0.2, 0],
  espacio: [2.5, 1.5, 11, 0, 0, 0],
  buscar: [2.5, 1.5, 11, 0, 0, 0],
  metodos: [-0.8, 0, 12.5, -0.8, 0, 0],
};

function Camara() {
  const ref = useRef<CameraControls>(null!);
  const { pestana, seleccion, datos } = useEstado();
  useEffect(() => {
    const c = CAMARAS[pestana];
    ref.current?.setLookAt(...c, true);
  }, [pestana]);
  // En el espacio, al elegir un chunk la cámara vuela hacia él.
  useEffect(() => {
    if (pestana !== 'espacio' || seleccion === null) return;
    const [x, y, z] = datos.chunks[seleccion].xyz.map((v) => v * ESCALA_ESPACIO);
    ref.current?.setLookAt(x + 1.6, y + 0.8, z + 3.2, x, y, z, true);
  }, [pestana, seleccion, datos]);
  return <CameraControls ref={ref} makeDefault minDistance={2.5} maxDistance={28} smoothTime={0.6} />;
}

export function Escenario() {
  const { pestana } = useEstado();
  return (
    <Canvas camera={{ position: [0, 0.4, 8.2], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={['#0b0d12']} />
      <fog attach="fog" args={['#0b0d12', 18, 36]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.3} />
      <Environment resolution={256}>
        <Lightformer intensity={1.6} position={[0, 4, 6]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.8} color="#7ef0ff" position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer intensity={0.6} color="#ff7ad9" position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} />
      </Environment>
      {/* Relevo: drei <Html> pierde la primera etiqueta que se monta en el lienzo; esta es invisible. */}
      <Html style={{ display: 'none' }}>
        <span />
      </Html>
      <Stars radius={60} depth={30} count={1800} factor={2.6} saturation={0} fade speed={0.4} />
      {pestana === 'documento' && <EscenaDocumento />}
      {pestana === 'chunks' && <EscenaChunks />}
      {pestana === 'vectores' && <EscenaVectores />}
      {(pestana === 'espacio' || pestana === 'buscar') && <EscenaEspacio modo={pestana} />}
      {pestana === 'metodos' && <EscenaMetodos />}
      <Camara />
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
