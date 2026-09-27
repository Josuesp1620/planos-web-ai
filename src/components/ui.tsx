/**
 * Piezas de interfaz. Todos los paneles siguen la misma estructura:
 *   qué estás viendo → Prueba (control principal) → Resultado → Cómo funciona (plegable) → Siguiente
 */
import type { ReactNode } from 'react';

export function Panel({ titulo, intro, children, siguiente }: { titulo: string; intro: ReactNode; children: ReactNode; siguiente?: { etiqueta: string; onClick: () => void } }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="px-6 pb-5 pt-6">
        <h2 className="font-titulo text-2xl font-extrabold tracking-tight">{titulo}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta/75">{intro}</p>
      </div>
      <div className="flex-1 space-y-5 px-6 pb-6">{children}</div>
      {siguiente && (
        <div className="sticky bottom-0 border-t border-borde bg-panel px-6 py-4">
          <button onClick={siguiente.onClick} className="flex w-full items-center justify-between rounded-lg bg-tinta px-4 py-2.5 text-sm font-semibold text-fondo transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta">
            <span>Siguiente: {siguiente.etiqueta}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-tenue uppercase">{titulo}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Detalles({ titulo = 'Cómo funciona', children }: { titulo?: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-borde">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-tinta/80 hover:text-tinta">
        {titulo}
        <span className="text-tenue transition group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <div className="space-y-2.5 border-t border-borde px-4 py-3 text-[13px] leading-relaxed text-tinta/70">{children}</div>
    </details>
  );
}

export function Deslizador({
  id,
  etiqueta,
  valor,
  min,
  max,
  paso = 1,
  onCambio,
  formato = (v: number) => String(v),
}: {
  id: string;
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  onCambio: (v: number) => void;
  formato?: (v: number) => string;
}) {
  const pct = ((valor - min) / (max - min)) * 100;
  return (
    <label htmlFor={id} className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm text-tinta/80">{etiqueta}</span>
        <span className="font-mono text-sm font-semibold text-tinta tabular-nums">{formato(valor)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambio(Number(e.target.value))} className="deslizador w-full" style={{ ['--pct' as string]: `${pct}%` }} />
    </label>
  );
}

export function Cifra({ valor, etiqueta, color = 'text-tinta' }: { valor: ReactNode; etiqueta: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.035] px-3.5 py-3">
      <div className={`font-titulo text-[26px] font-extrabold leading-none tabular-nums ${color}`}>{valor}</div>
      <div className="mt-1.5 text-xs leading-tight text-tenue">{etiqueta}</div>
    </div>
  );
}

export function Opciones<T extends string | number>({ valor, opciones, onCambio }: { valor: T | null; opciones: { valor: T; etiqueta: ReactNode; detalle?: ReactNode }[]; onCambio: (v: T) => void }) {
  return (
    <div className="space-y-1.5">
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          onClick={() => onCambio(o.valor)}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-tinta ${
            valor === o.valor ? 'border-tinta/70 bg-white/[0.06]' : 'border-borde hover:border-white/25'
          }`}
        >
          <div className="text-sm text-tinta">{o.etiqueta}</div>
          {o.detalle && <div className="mt-0.5 text-xs text-tenue">{o.detalle}</div>}
        </button>
      ))}
    </div>
  );
}

export function Pildoras({ opciones, onElegir, activa }: { opciones: string[]; onElegir: (o: string) => void; activa?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => (
        <button
          key={o}
          onClick={() => onElegir(o)}
          className={`rounded-full border px-3 py-1 text-xs transition ${activa === o ? 'border-tinta/70 bg-white/[0.08] text-tinta' : 'border-borde text-tinta/70 hover:border-white/25 hover:text-tinta'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Campo(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-lg border border-borde bg-black/30 px-3.5 py-2.5 text-sm outline-none placeholder:text-tenue/70 focus:border-tinta/50" />;
}
