# Voz (local, sin APIs externas)

Solo si hay picks hoy. Carpeta de trabajo `$V` (ver «Entorno» en SKILL.md).
1. Entorno de Python de voz: en la nube, `pip install -q sherpa-onnx soundfile numpy 2>&1 | tail -2` y `VPY=$PY`. En local, `VPY="$V/.venv/Scripts/python"`; si no existe, `$PY -m venv "$V/.venv" && "$VPY" -m pip install -q sherpa-onnx soundfile numpy`. ffmpeg ya está instalado en los dos.
2. `cp $REPO/scripts/voz/*.py $V/`. Si no existe `$V/kokoro-multi-lang-v1_0`, descarga el modelo con `curl -sSL https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2 | tar xj -C $V` (carpeta `kokoro-multi-lang-v1_0`, ~380 MB). La voz es Dora mezclada con Sara; `voice.py` crea la mezcla sola la primera vez.
3. Fuentes: `mkdir -p $V/src/repos $V/src/runs`; copia `$W/out/picks/*.json` a `$V/src/repos/` y `$W/out/run.json` a `$V/src/runs/HOY.json`. Las fichas cortas no tienen guion y el script las salta solo (lee `guion`, o `scene3d.beats` en picks antiguos).
4. `cd $V && timeout 580 "$VPY" make_audio.py src out 2>&1 | tail -5` → `out/*.webm` y `out/manifest.json`.
5. Antes de subir: Artifact action "read" del dashboard. Luego copia los .webm a la carpeta scratchpad de la sesión (las subidas solo se aceptan desde ahí) y súbelos con Artifact publish: url del dashboard, `asset: true`, `file_paths` (máx 25 por llamada). Apunta el id de cada uno.
6. ArtifactData `batch` op `update` con `if_version`: en cada repo `audio = {url: "/_blob/<id>", id, offsets, dur, cues}` (del manifest); en el run de hoy `audio = {intro: {url, id, offsets, dur}, outro: {...}}`.
