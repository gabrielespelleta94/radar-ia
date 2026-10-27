"""Voz del Radar: Kokoro v1.0, ef_dora (es_ES) mezclada con if_sara para sonar más joven, con entonación variable por frase."""
import sherpa_onnx, numpy as np, re, subprocess, soundfile as sf, sys, os, json
D = os.environ.get("VOICE_DIR", "kokoro-multi-lang-v1_0")
DORA, SARA, SID = 28, 35, 45      # ids de speaker_names en el modelo; 45 (zf_xiaobei) es un hueco que no usamos y aloja la mezcla
MIX = {DORA: 0.75, SARA: 0.25}    # más peso a Sara = más joven, pero con más acento
SPEED, PITCH = 1.08, 0.8          # un punto más ágil y aguda que Dora tal cual
_tts = None
def voices():
    """copia de voices.bin con la mezcla en el hueco SID (cada voz es un estilo 510x256 en float32)"""
    out = f"{D}/voices_radar.bin"
    if not os.path.exists(out):
        V = np.fromfile(f"{D}/voices.bin", dtype=np.float32).reshape(-1, 510, 256)
        V[SID] = sum(V[i] * w for i, w in MIX.items()); V.tofile(out)
    return out
def tts():
    global _tts
    if _tts is None:
        cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=f"{D}/model.onnx", voices=voices(), tokens=f"{D}/tokens.txt",
              data_dir=f"{D}/espeak-ng-data", dict_dir=f"{D}/dict", lexicon=f"{D}/lexicon-us-en.txt,{D}/lexicon-zh.txt", lang="es"),
            num_threads=4))
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts
def sentences(t): return [s for s in re.split(r'(?<=[.!?…])\s+', t.strip()) if s]
def trim(x, sr, thr=0.012, keep=0.03):
    """quita el silencio que el modelo deja en los bordes (las pausas las pone render_text) y suaviza con fundidos de 10 ms"""
    idx = np.flatnonzero(np.abs(x) > thr)
    if idx.size: x = x[max(0, idx[0] - int(sr*keep)): idx[-1] + int(sr*keep)]
    n = min(len(x)//2, int(sr*0.01)); f = np.linspace(0, 1, n, dtype=np.float32)
    if n: x = x.copy(); x[:n] *= f; x[-n:] *= f[::-1]
    return x
def shift(x, sr, semis, tempo=1.0):
    """pitch-shift by resampling + time-stretch back (ffmpeg); desplazamientos pequeños para no cambiar el timbre"""
    if abs(semis) < 0.05 and abs(tempo - 1) < 0.005: return x
    r = 2 ** (semis/12)
    p = subprocess.run(["ffmpeg","-loglevel","error","-f","f32le","-ar",str(sr),"-ac","1","-i","-",
        "-af",f"asetrate={int(sr*r)},aresample={sr},atempo={tempo/r:.5f}","-f","f32le","-"], input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32)
def render_text(text, i0=0):
    """devuelve (samples, sr, spans) con contorno por frase; spans = [(t0, t1, char0, char1)] por frase"""
    out = []; sr = None; spans = []; t = 0.0; pos = 0
    for k, s in enumerate(sentences(text)):
        c0 = text.find(s, pos); c0 = pos if c0 < 0 else c0; pos = c0 + len(s)
        a = tts().generate(s, sid=SID, speed=SPEED); sr = a.sample_rate; x = np.array(a.samples, dtype=np.float32)
        # Kokoro ya entona dentro de la frase; esto solo varía el nivel entre frases (más de ~1 semitono extra suena acelerado)
        e = 0.6 if s.endswith("?") else (0.8 if s.endswith("!") else [0.3, 0.0, 0.4, -0.2][(i0+k) % 4])
        x = trim(shift(x, sr, PITCH + e), sr)
        spans.append((t, t + len(x)/sr, c0, pos))
        # frases largas respiran algo más; preguntas y exclamaciones enganchan con la siguiente
        pause = (0.22 if s.endswith(("?", "!")) else 0.30) + min(0.10, len(s) / 1500)
        out += [x, np.zeros(int(sr*pause), dtype=np.float32)]; t += len(x)/sr + pause
    return np.concatenate(out), sr, spans
def time_at(spans, ci):
    """momento (s) en que se pronuncia el caracter ci, interpolando dentro de su frase"""
    for t0, t1, c0, c1 in spans:
        if ci < c1: return t0 + max(0.0, (ci - c0)) / max(1, (c1 - c0)) * (t1 - t0)
    return spans[-1][1] if spans else 0.0
def finish(wav, out_mp4):
    # limpia graves, quita barro, cuerpo y presencia suaves, controla eses, compresión ligera y -16 LUFS
    af = ("highpass=f=75,equalizer=f=320:t=q:w=1.2:g=-2,equalizer=f=160:t=q:w=1:g=1.5,equalizer=f=2800:t=q:w=1.2:g=2,"
          "equalizer=f=9000:t=q:w=1:g=-1.5,deesser=i=0.35:m=0.5:f=0.5,"
          "acompressor=threshold=-20dB:ratio=2.2:attack=8:release=120:makeup=1.5,loudnorm=I=-16:TP=-1.5:LRA=9")
    subprocess.run(["ffmpeg","-loglevel","error","-y","-i",wav,"-af",af,"-c:a","libopus","-b:a","64k","-ac","1","-vn",out_mp4], check=True)
def scene_audio(beats_text, out_mp4, beat_cues=None):
    """un audio por escena; devuelve (offsets de beats, duración, cues [{t,id}])"""
    parts, offs, t, sr, cues = [], [], 0.0, None, []
    for j, txt in enumerate(beats_text):
        x, sr, spans = render_text(txt, j); offs.append(round(t, 2)); parts.append(x)
        for ci, nid in (beat_cues[j] if beat_cues else []):
            cues.append({"t": round(t + max(0.0, time_at(spans, ci) - 0.15), 2), "id": nid})
        t += len(x)/sr
    wav = out_mp4.rsplit(".", 1)[0] + ".wav"; sf.write(wav, np.concatenate(parts), sr); finish(wav, out_mp4); os.remove(wav)
    return offs, round(t, 2), cues
if __name__ == "__main__":
    txt = sys.argv[1]; x, sr, _ = render_text(txt); sf.write("tmp.wav", x, sr); finish("tmp.wav", sys.argv[2])
