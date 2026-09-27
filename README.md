# planos-web-ai · Planos, RAG por dentro (web interactiva)

Autores: **Josue Salazar ([GitHub Josuesp1620](https://github.com/Josuesp1620) · [LinkedIn](https://www.linkedin.com/in/joucode))** · **[API SERVICE SAC](https://apiservicesac.com)**.
Logos en `public/marca/`: avatar de GitHub y logo de API SERVICE SAC (copiado de `dooprint-odoo`).

Explora paso a paso, en 3D, cómo un RAG divide, vectoriza y busca en el caso de estudio de los episodios
001–011 (Ley de Protección al Consumidor, Perú, 86 págs., 524 chunks). Todos los datos son reales.

- **Producción:** Cloudflare Workers (sitio estático, worker `planos-web-ai`, configuración en `wrangler.jsonc`).
- **Pestañas** (app exploradora; enlace directo con `#documento`, `#chunks`, `#vectores`, `#espacio`, `#buscar`, `#metodos`):
  - **Documento:** las 86 hojas reales en carrusel 3D, con su texto.
  - **Chunks:** rechunkear en vivo (tamaño y solapamiento); la página pinta cada chunk y el total se recalcula (100/25 = 524).
  - **Vectores:** comparar dos chunks; sus 384 números como skylines 3D y el producto A×B, cuya suma es la similitud coseno.
  - **Espacio:** los 524 chunks en 3D con temas reales (k-means) y filtro por palabra; clic para volar a un chunk y ver sus vecinos.
  - **Buscar:** tu propia pregunta (modelo en el navegador) o los casos de los episodios; la sonda enciende el top-k.
  - **Métodos:** carrera en 4 carriles (vectores, BM25, híbrida, reranker) con el puesto real de la respuesta correcta.
- **Stack:** React 19 · Vite · Tailwind 4 · Three.js (@react-three/fiber, drei) · motion · @huggingface/transformers
  (vectoriza en el navegador la pregunta que escribe el usuario, con el mismo modelo de los episodios).

## Comandos

| Comando           | Qué hace                                          |
| :---------------- | :------------------------------------------------ |
| `pnpm install`    | Instala dependencias                              |
| `pnpm dev`        | Servidor de desarrollo en `localhost:5173`        |
| `pnpm build`      | Compila a `./dist/`                               |
| `pnpm deploy`     | Compila y publica en Cloudflare                   |
| `pnpm cf-typegen` | Regenera los tipos de las bindings de Workers     |

Para volver a exportar los datos reales (desde `planos/`): `uv run web/scripts/exportar_datos.py`. El script
usa `datos/rag_ley.py` de la carpeta principal de Planos, que no está en este repo: aquí sirve como referencia
de cómo se generaron los datos.

En el servidor de desarrollo pnpm no se instala: corre dentro de Docker.

```bash
docker run --rm -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:22-bookworm npx -y pnpm@latest install
docker run --rm -it -u $(id -u):$(id -g) -e HOME=/tmp -p 5173:5173 -v $PWD:/app -w /app node:22-bookworm npx vite --host 0.0.0.0
```

## Cloudflare

- `wrangler.jsonc` sirve `dist/` como sitio estático; la navegación es por hash (`#chunks`, `#buscar`…).
- `public/_headers`: caché de un día para `/data/`.
- `public/.assetsignore` deja fuera `*.wasm`. Vite copia el wasm de ONNX Runtime (~27 MB), pero Cloudflare
  no acepta archivos de más de 25 MiB. transformers.js lo descarga de jsdelivr en el navegador.

## Datos (`public/data/`, generados por `scripts/exportar_datos.py`)

- `chunks.json`: 524 chunks con página, texto y posición 3D (PCA).
- `vectores.bin`: 524 × 384 float32 normalizados.
- `pca.json`: ejes de la PCA para ubicar en 3D una pregunta nueva.
- `paginas.json`: texto de las 86 páginas.
- `temas.json`: 8 temas (k-means sobre los vectores) con sus palabras más características.
- `casos.json`: casos de los episodios 001–004 con el puesto real de la respuesta correcta en vectores,
  palabras (BM25), híbrida (RRF k=60) y reranker (jina v2 sobre el top 20).

La vista 3D es una proyección de 384 dimensiones: las distancias en pantalla son aproximadas. Los rankings
siempre usan la similitud real.

## Diseño de la interfaz

- Interfaz grafito sobria; el color queda para los datos (cian, magenta, dorado).
- Todos los paneles siguen la misma estructura: qué estás viendo → Prueba → Resultado → Cómo funciona (plegable) → Siguiente.
- Cada escena tiene una leyenda corta arriba a la izquierda con el significado de cada color.

## Notas técnicas

- Sin `StrictMode` y con una etiqueta `<Html>` invisible de relevo en `Escenario.tsx`: drei pierde la primera
  etiqueta que se monta en el lienzo.
- La cámara usa `CameraControls` con una posición por pestaña (`CAMARAS` en `escenas/Escenario.tsx`).

## Licencia

Código bajo licencia MIT ([`LICENSE`](LICENSE)). No incluye los logos de API SERVICE SAC, la foto de perfil
ni el texto de la Ley N° 29571 (edición de Indecopi), que se usa solo como caso de estudio.
