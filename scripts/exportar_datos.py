# /// script
# requires-python = ">=3.11"
# dependencies = ["fastembed", "pypdf", "numpy", "rank-bm25", "snowballstemmer"]
# ///
"""
Exporta a public/data/ los datos reales que usa la web (mismo pipeline de los episodios, en
../datos/rag_ley.py):

  chunks.json    524 chunks: id, página, texto y posición 3D (proyección PCA)
  vectores.bin   524 × 384 float32 normalizados (para buscar en el navegador)
  pca.json       media y componentes de la PCA (para ubicar en 3D una pregunta nueva)
  casos.json     los casos de los episodios 001–004: pregunta, respuesta correcta, vector de la
                 pregunta y el puesto real de la respuesta con vectores, palabras, híbrida y reranker
  paginas.json   el texto de cada una de las 86 páginas (para rechunkear en vivo y dibujar las hojas)
  temas.json     8 grupos de chunks (k-means sobre los vectores) con sus palabras más características

Uso (desde planos/):  uv run web/scripts/exportar_datos.py
"""
import json
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'datos'))
import rag_ley as R  # noqa: E402

DESTINO = RAIZ / 'web' / 'public' / 'data'
DESTINO.mkdir(parents=True, exist_ok=True)

CASOS = [
    {'episodio': '001', 'pregunta': '¿Cuánto tiempo tiene una tienda para responder mi reclamo?', 'correcta': 94,
     'respuesta': '15 días hábiles improrrogables (Art. 24, p. 18)'},
    {'episodio': '002–003', 'pregunta': '¿Cuánto es lo máximo que me pueden multar?', 'correcta': 319,
     'respuesta': 'Multas de hasta 450 UIT (Art. 110, p. 50)'},
    {'episodio': '004', 'pregunta': '¿Qué es un método comercial agresivo?', 'correcta': 158,
     'respuesta': 'Prácticas que limitan la libertad de elección: acoso, coacción, influencia indebida o dolo (Art. 58, p. 27)'},
]

c, v = R.indice()  # vectores ya normalizados
v = v.astype(np.float32)
v.tofile(DESTINO / 'vectores.bin')

# PCA a 3D sobre los chunks (la pregunta se proyecta con los mismos ejes en el navegador).
media = v.mean(axis=0)
_, _, vt = np.linalg.svd(v - media, full_matrices=False)
comps = vt[:3]
xyz = (v - media) @ comps.T
escala = float(np.abs(xyz).max())
xyz /= escala
(DESTINO / 'pca.json').write_text(json.dumps({'media': media.round(6).tolist(), 'comps': comps.round(6).tolist(), 'escala': escala}))
(DESTINO / 'chunks.json').write_text(json.dumps(
    [{'id': x['id'], 'pagina': x['pagina'], 'texto': x['texto'], 'xyz': [round(float(a), 4) for a in xyz[i]]} for i, x in enumerate(c)],
    ensure_ascii=False))

# Rankings reales por caso.
from fastembed.rerank.cross_encoder import TextCrossEncoder  # noqa: E402
from rank_bm25 import BM25Okapi  # noqa: E402

modelo = R.modelo()
bm25 = BM25Okapi([R.tokens(x['texto']) for x in c])
reranker = TextCrossEncoder(R.RERANKER)
salida = []
for caso in CASOS:
    q = np.array(list(modelo.embed([caso['pregunta']])))[0]
    q = q / np.linalg.norm(q)
    s = v @ q
    orden = list(np.argsort(-s))
    bm = bm25.get_scores(R.tokens(caso['pregunta']))
    rv = {int(i): r + 1 for r, i in enumerate(orden)}
    rb = {int(i): r + 1 for r, i in enumerate(np.argsort(-bm))}
    rrf = {i: 1 / (60 + rv[i]) + 1 / (60 + rb[i]) for i in rv}
    rh = {i: r + 1 for r, i in enumerate(sorted(rrf, key=lambda i: -rrf[i]))}
    top20 = [int(i) for i in orden[:20]]
    puntos = list(reranker.rerank(caso['pregunta'], [c[i]['texto'] for i in top20]))
    rr = [i for i, _ in sorted(zip(top20, puntos), key=lambda x: -x[1])]
    k = caso['correcta']
    salida.append({
        **caso,
        'vector': q.round(6).tolist(),
        'puestos': {
            'vectores': rv[k],
            'palabras': rb[k],
            'hibrida': rh[k],
            'reranker': (rr.index(k) + 1) if k in rr else None,
        },
        'top_reranker': rr[:5],
    })
    print(caso['episodio'], caso['pregunta'], salida[-1]['puestos'])
(DESTINO / 'casos.json').write_text(json.dumps({
    'modelo': R.MODELO, 'reranker': R.RERANKER, 'nota_reranker': 'reranker aplicado al top 20 por vectores',
    'casos': salida}, ensure_ascii=False))
# Texto de cada página, tal como lo extrae el pipeline.
from pypdf import PdfReader  # noqa: E402
paginas = [{'n': n, 'texto': ' '.join((p.extract_text() or '').split())} for n, p in enumerate(PdfReader(R.PDF).pages, 1)]
(DESTINO / 'paginas.json').write_text(json.dumps(paginas, ensure_ascii=False))

# Temas: k-means (k=8, semilla fija) sobre los vectores normalizados, y las palabras que más distinguen a
# cada grupo (frecuencia en el grupo frente al documento, sin palabras vacías).
import re  # noqa: E402
from collections import Counter  # noqa: E402

rng = np.random.default_rng(0)
K = 8
centros = v[rng.choice(len(v), K, replace=False)]
for _ in range(60):
    grupo = np.argmax(v @ centros.T, axis=1)
    centros = np.stack([v[grupo == g].mean(axis=0) for g in range(K)])
    centros /= np.linalg.norm(centros, axis=1, keepdims=True)
VACIAS = set('''de la que el en y a los del se las por un una con no su para es al lo como más o
pero sus le ya este esta son entre cuando todo esta ser dos también fue había era muy desde nos durante
todos uno les ni contra otros ese eso ante ellos e esto mí antes algunos qué unos yo otro otras otra él
tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tú te
ti tu tus ellas nosotras vosotros vosotras os mío mía míos mías tuyo tuya suyo suya nuestro nuestra
vuestro vuestra esos esas estoy está están sea sean dicho dicha cualquier caso así sobre sin hasta cada
debe deben puede pueden artículo código protección defensa consumidor consumidores proveedor proveedores
presente ley conforme según través mediante dicha dichos parte partes'''.split())
palabras = lambda t: [w for w in re.findall(r'[a-záéíóúñü]+', t.lower()) if len(w) > 3 and w not in VACIAS]
total = Counter(w for x in c for w in palabras(x['texto']))
N = sum(total.values())
temas = []
for g in range(K):
    ids = [i for i in range(len(c)) if grupo[i] == g]
    cuenta = Counter(w for i in ids for w in palabras(c[i]['texto']))
    n = sum(cuenta.values())
    puntaje = {w: (cuenta[w] / n) / (total[w] / N) * np.log1p(cuenta[w]) for w in cuenta if cuenta[w] >= 3}
    clave = sorted(puntaje, key=lambda w: -puntaje[w])[:4]
    temas.append({'id': g, 'palabras': clave, 'chunks': len(ids), 'paginas': sorted({c[i]['pagina'] for i in ids})})
    print('tema', g, len(ids), clave)
(DESTINO / 'temas.json').write_text(json.dumps({'temas': temas, 'grupo': [int(x) for x in grupo]}, ensure_ascii=False))

print('exportado en', DESTINO, '·', len(c), 'chunks')
