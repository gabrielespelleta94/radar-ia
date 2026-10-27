---
name: radar-diario
description: Edición diaria del Radar de IA. Rastrea GitHub (y Hugging Face si hay red), elige 10 novedades nunca presentadas por una cascada de interés, produce 5 vídeos completos (lámina, guion, demo y voz) y 5 fichas cortas, y lo escribe en su dashboard. Úsala cuando la tarea programada o el usuario pidan "el radar de hoy".
---

# Radar diario

Dashboard (artifact con base de datos): <URL del artifact de tu dashboard>
Entorno (fija estas variables al empezar y úsalas en todos los comandos):
- Nube (Linux): `W=/tmp/radar/w`, `V=/tmp/radar/voz`, `PY=python3`.
- Local (Windows, Git Bash): `W="$LOCALAPPDATA/radar/w"`, `V="$LOCALAPPDATA/radar/voz"` (persistente: el entorno virtual y el modelo de voz se reutilizan), `PY="python"` con `export PYTHONUTF8=1`. Las subidas de audio (Artifact `asset: true`) solo se aceptan desde la carpeta scratchpad de la sesión: copia allí los .webm antes de subirlos.
Carpeta de la skill: `S` = la carpeta de este SKILL.md. Scripts: `$REPO/scripts`.
Escribe en español, directo, frases cortas. Vetado: "delve", "leverage" como verbo, "robust" sin contexto, "best practices" sin referencia.

Modos (los indica el texto extra de la ejecución):
- FORZAR: genera la edición aunque ya exista una de hoy, sobrescribiendo el run.
- PRUEBA: ensayo sin escribir NADA en el dashboard (ni repos, ni run, ni config, ni assets). Sigue aunque ya exista la edición de hoy. Produce solo 1 pick completo y 1 ficha (`build.py ... --parcial`), sáltate la voz y las preferencias, deja todo en `$W` y termina con un resumen de lo que habría escrito.

Regla de tokens: carga cada referencia SOLO en el paso que la pide. Las salidas de Bash, siempre con `| tail`. A ArtifactData le pasas `file_path` para escribir: nunca reescribas un JSON a mano en la llamada.

## Paso 0 · Preparar (sin LLM)
1. `HOY=$(TZ=Europe/Madrid date +%F)`; `mkdir -p $W/db $W/contenido $W/out`.
2. ToolSearch `select:ArtifactData,WebFetch`.
3. ArtifactData, todo con `out_dir=$W/db`:
   - `get` runs/HOY. Si existe y tiene picks, y el encargo no dice FORZAR, para y responde "Ya hay edición hoy".
   - `get` config/index (índice compacto de todo lo visto) y `get` config/prefs (puede no existir).
   - `query` repos where `status` in ["saved","tried","dismissed"] (las señales del usuario).
4. `$PY $REPO/scripts/index.py refresh $W` aplica esas señales al índice y escribe `$W/seen.txt`.

## Paso 1 · Rastreo (subagente barato)
Lanza el subagente con la herramienta Agent, `model: "haiku"` y `run_in_background: false` (tienes que esperar su resultado). Como prompt, el contenido de `$REPO/.claude/agents/radar-scout.md` más estas líneas: `W=$W`, `HOY=$HOY`, `REPO=$REPO`.
Devuelve `$W/candidatos.json` y un resumen de 3 líneas. No leas tú las páginas de tendencias.

## Paso 2 · Selección (determinista)
`$PY $REPO/scripts/select.py $W $HOY | tail -20` → `$W/seleccion.json` con `full` (5), `short` (5), `rescued` y `reserves`, más las reservas ya listas en `$W/out/reservas/`.
Revisa la lista una vez. Solo la cambias si dos picks son el mismo concepto o uno choca con las restricciones de `references/contexto.md`; en ese caso editas `seleccion.json` y lo dices en la línea final.
Para cada rescatado: ArtifactData `get` repos/<id> con `out_dir=$W/db` y apunta su `version`.

## Paso 3 · Investigar
Para cada uno de los 10, WebFetch del README (o de la model card en Hugging Face) con este prompt exacto: "Resume en máx 150 palabras: qué hace, cómo se usa, requisitos, limitaciones, licencia exacta (nombre y si permite uso comercial) y si algo se paga (plan, API). Sin marketing." No inventes funcionalidades: lo que no quede claro va a `risk`.

## Paso 4 · Producir
Lee `references/contexto.md`, `references/estilo.md`, `references/produccion.md` y `references/laminas.md` (tipos de lámina y guion; produccion.md incluye la lista exacta de campos y los valores válidos de kind) y, solo para los `full`, `references/demos.md`.
- Por cada pick escribe `$W/contenido/<id>.json` SOLO con los campos de contenido (el script añade los factuales).
  - `full`: los campos de `produccion.md` (lamina, guion, demo, tarjeta y detalle).
  - `short`: los campos de `references/ficha.md`.
- `$PY $REPO/scripts/build.py $W $HOY | tail -30` une base y contenido, valida y deja `$W/out/picks/<id>.json`. Si da errores, corrige el contenido y repite hasta "OK".

## Paso 5 · Escribir
ArtifactData `batch` usando `file_path`:
- Picks nuevos: op `set` con `$W/out/picks/<id>.json` (máx 5 por lote). Rescatados: op `update` con `$W/out/picks/<id>.update.json` e `if_version`.
- Reservas: op `set` con `$W/out/reservas/*.json` (máx 25 por lote).
- Run: escribe `$W/out/run.json` con date, scanned, fresh, repeated, rescued, headline (2-3 frases), topIdeas (3 objetos `{"repo": "dueño/nombre", "accion": "máx 20 palabras"}`; `repo` tal cual el `name` del pick) y script {intro 35-50 palabras habladas, outro 40-60}, con las reglas de `references/estilo.md`. Luego set runs/HOY (con `if_version` si ya existía).
- Índice: `$PY $REPO/scripts/index.py add $W $HOY` → set config/index con `file_path=$W/out/index.json` e `if_version`.

## Paso 6 · Voz
Sigue `references/voz.md`. Si falla, no bloquea nada: dilo en la línea final.

## Paso 7 · Preferencias (solo si config/prefs no existe o tiene más de 7 días)
`$PY $REPO/scripts/prefs.py $W $HOY` → set config/prefs con `file_path=$W/out/prefs.json`.

## Final
Una línea: revisados, nuevos, rescatados, vídeos completos y fichas (por nivel), audio sí/no y cualquier cambio manual de la selección.
