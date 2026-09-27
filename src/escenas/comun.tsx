/** Constantes y piezas compartidas por las escenas. */
import { Html } from '@react-three/drei';
import type { ReactNode } from 'react';

export const ESCALA_ESPACIO = 4.4;
export const CIAN = '#7ef0ff';
export const MAGENTA = '#ff7ad9';
export const DORADO = '#ffd23f';

/** Etiqueta HTML anclada a un punto 3D, con el estilo de vidrio de la interfaz. */
export function Etiqueta3D({ position, children, className = '' }: { position: [number, number, number]; children: ReactNode; className?: string }) {
  return (
    <Html position={position} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 0]}>
      <div className={`vidrio whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-[11px] text-tinta ${className}`}>{children}</div>
    </Html>
  );
}
