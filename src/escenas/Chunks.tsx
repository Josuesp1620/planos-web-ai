/**
 * Chunks: la página real con cada chunk resaltado en su color (el solapamiento en dorado) y,
 * a la derecha, las tarjetas 3D de esos chunks conectadas a su lugar en la página.
 * Se recalcula en vivo al cambiar tamaño y solapamiento.
 */
import { Html, Line, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type Corte, cortar, palabrasDe } from '../lib/datos';
import { useEstado } from '../lib/estado';
import { COLORES_CHUNK, texturaHoja, texturaTarjeta } from '../lib/texturas';

const HOJA_ANCHO = 3.5;
const HOJA_ALTO = HOJA_ANCHO * 1.414;
const HOJA_X = -2.9;
const COL_X = 2.35;
const TARJ_ANCHO = 3.9;

function Tarjeta({ corte, i, total, y, alto, palabras, pagina }: { corte: Corte; i: number; total: number; y: number; alto: number; palabras: string[]; pagina: number }) {
  const ref = useRef<THREE.Group>(null!);
  const color = COLORES_CHUNK[i % COLORES_CHUNK.length];
  const texto = palabras.slice(corte.inicio, corte.fin).join(' ');
  const textura = useMemo(
    () => texturaTarjeta(`${pagina}-${corte.inicio}-${corte.fin}`, `chunk ${i + 1}/${total} · palabras ${corte.inicio + 1}–${corte.fin}`, texto, color),
    [pagina, corte, i, total, texto, color],
  );
  useFrame((_, dt) => easing.damp3(ref.current.position, [COL_X, y, 0], 0.25 + i * 0.01, dt));
  const escalaY = alto / 0.86;
  return (
    <group ref={ref} position={[HOJA_X, y, 0]}>
      <RoundedBox args={[TARJ_ANCHO, alto, 0.08]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color="#0d1226" roughness={0.4} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0, 0.041]} scale={[1, escalaY, 1]}>
        <planeGeometry args={[TARJ_ANCHO - 0.04, 0.86 - 0.04]} />
        <meshBasicMaterial map={textura} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function EscenaChunks() {
  const { datos, pagina, tam, solape } = useEstado();
  const texto = datos.paginasTexto[pagina - 1].texto;
  const palabras = useMemo(() => palabrasDe(texto), [texto]);
  const cortes = useMemo(() => cortar(palabras.length, tam, solape), [palabras.length, tam, solape]);
  const textura = useMemo(() => texturaHoja(pagina, texto, true, cortes, `c${tam}-${solape}`), [pagina, texto, cortes, tam, solape]);

  // Tarjetas en columna, ajustadas al alto de la hoja.
  const hueco = Math.min(1.0, HOJA_ALTO / cortes.length);
  const alto = Math.max(0.28, Math.min(0.86, hueco * 0.84));
  const y0 = ((cortes.length - 1) * hueco) / 2;

  return (
    <group>
      <mesh position={[HOJA_X, 0, 0]}>
        <planeGeometry args={[HOJA_ANCHO, HOJA_ALTO]} />
        <meshStandardMaterial map={textura} roughness={0.85} />
      </mesh>
      <Html position={[HOJA_X, HOJA_ALTO / 2 + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap font-mono text-xs text-tenue">página {pagina} · {palabras.length} palabras</div>
      </Html>
      {cortes.map((c, i) => {
        const y = y0 - i * hueco;
        // Dónde empieza el chunk en la hoja, aproximado por la fracción de palabras.
        const yHoja = HOJA_ALTO / 2 - 0.35 - (c.inicio / Math.max(1, palabras.length)) * (HOJA_ALTO - 0.6);
        const color = COLORES_CHUNK[i % COLORES_CHUNK.length];
        return (
          <group key={`${c.inicio}-${c.fin}`}>
            <Line
              points={[
                [HOJA_X + HOJA_ANCHO / 2, yHoja, 0.01],
                [(HOJA_X + HOJA_ANCHO / 2 + COL_X - TARJ_ANCHO / 2) / 2, (yHoja + y) / 2, 0.01],
                [COL_X - TARJ_ANCHO / 2, y, 0.01],
              ]}
              color={color}
              lineWidth={1.4}
              transparent
              opacity={0.55}
            />
            <Tarjeta corte={c} i={i} total={cortes.length} y={y} alto={alto} palabras={palabras} pagina={pagina} />
            {i > 0 && solape > 0 && cortes[i - 1].fin > c.inicio && (
              <Html position={[COL_X + TARJ_ANCHO / 2 + 0.05, y + hueco / 2, 0]} style={{ pointerEvents: 'none' }}>
                <div className="whitespace-nowrap rounded-full border border-dorado/60 bg-dorado/15 px-2 py-0.5 font-mono text-[10px] text-dorado">
                  ↕ {cortes[i - 1].fin - c.inicio}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
