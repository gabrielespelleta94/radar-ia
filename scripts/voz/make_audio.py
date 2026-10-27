import json, glob, os, re, sys, unicodedata
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) or ".")
from voice import scene_audio
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
split = lambda t: [s.strip() for s in re.split(r'(?<=[.!?])\s+', t or "") if s.strip()]
def norm(t): return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")
def cue_positions(text, ids, nodes):
    """caracter de la frase donde se nombra cada nodo; si no se nombra, se reparte a lo largo del beat"""
    nt = norm(text); res = []; used = set(); missing = []
    for nid in ids:
        nd = nodes.get(nid, {}); best = None
        for w in re.findall(r"[\w-]{3,}", norm(nd.get("label", "")) + " " + norm(nd.get("sub", ""))):
            for mt in re.finditer(r"(?<![\w])" + re.escape(w), nt):
                if mt.start() not in used and (best is None or mt.start() < best): best = mt.start()
                break
        if best is None: missing.append(nid)
        else: used.add(best); res.append((best, nid))
    for k, nid in enumerate(missing):
        res.append((int(len(text) * (k + (0 if not res else 1)) / (len(missing) + 1)), nid))
    return sorted(res)
man = {"repos": {}, "run": {}}
run = json.load(open(glob.glob(f"{src}/runs/*.json")[0], encoding="utf-8")); run = run.get("data", run)
sc = run.get("script") or {}
for key in ("intro", "outro"):
    if sc.get(key):
        offs, dur, _ = scene_audio(split(sc[key]), f"{out}/{run['date']}-{key}.webm")
        man["run"][key] = {"file": f"{run['date']}-{key}.webm", "offsets": offs, "dur": dur}
for f in sorted(glob.glob(f"{src}/repos/*.json")):
    j = json.load(open(f, encoding="utf-8")); doc = j.get("id") or os.path.basename(f)[:-5]; d = j.get("data", j)
    s3 = d.get("scene3d") or {}
    nodes = {n.get("id"): n for n in s3.get("nodes", []) if n.get("id")}
    guion = [b for b in d.get("guion") or [] if b.get("say")]
    beats = guion or [b for b in s3.get("beats", []) if b.get("say")]
    if not beats: continue
    # con lámina, cada beat revela su paso: no hacen falta marcas por nodo
    bc = None if guion else [cue_positions(b["say"], [i for i in (b.get("show") or []) if i in nodes], nodes) for b in beats]
    fn = f"{d.get('featured') or d.get('firstSeen','x')}-{doc}.webm"
    offs, dur, cues = scene_audio([b["say"] for b in beats], f"{out}/{fn}", bc)
    man["repos"][doc] = {"file": fn, "offsets": offs, "dur": dur, "cues": cues}
    print(doc, dur, len(cues), file=sys.stderr)
json.dump(man, open(f"{out}/manifest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
