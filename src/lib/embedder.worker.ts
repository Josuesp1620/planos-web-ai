/**
 * Vectoriza la pregunta del usuario en el navegador con el mismo modelo de los episodios
 * (paraphrase-multilingual-MiniLM-L12-v2, versión ONNX de Xenova). Corre en un worker para no
 * trabar la animación. La primera vez descarga el modelo (~120 MB) y el navegador lo guarda.
 */
import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
const MODELO = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

self.onmessage = async (e: MessageEvent<{ texto: string }>) => {
  try {
    if (!extractor) {
      extractor = await pipeline('feature-extraction', MODELO, {
        dtype: 'q8',
        progress_callback: (p: { status: string; progress?: number; file?: string }) => self.postMessage({ tipo: 'progreso', p }),
      });
    }
    const out = await extractor(e.data.texto, { pooling: 'mean', normalize: true });
    self.postMessage({ tipo: 'vector', vector: Array.from(out.data as Float32Array) });
  } catch (err) {
    self.postMessage({ tipo: 'error', mensaje: String(err) });
  }
};
