"""Preferencias aprendidas de los botones del usuario (Guardar, Probado, Descartar).

Entrada: W/db/repos/*.json (exportados con status saved, tried o dismissed).
Salida:  W/out/prefs.json {text, stats, updated}. El rastreador usa `text` para ajustar el score ±10.
"""
import collections, glob, json, os, sys
sys.stdout.reconfigure(encoding="utf-8")

W = {"saved": 1, "tried": 2, "dismissed": -1}


def main():
    w, hoy = sys.argv[1], sys.argv[2]
    by = {k: collections.Counter() for k in ("kind", "level", "fit", "category")}
    n = collections.Counter()
    for f in glob.glob(f"{w}/db/repos/*.json"):
        d = json.load(open(f, encoding="utf-8")); d = d.get("data", d)
        s = W.get(d.get("status"))
        if not s:
            continue
        n[d["status"]] += 1
        by["kind"][d.get("kind") or "?"] += s
        by["level"][f"nivel {d.get('level') or '?'}"] += s
        by["category"][d.get("category") or "?"] += s
        for x in d.get("fit") or []:
            by["fit"][x] += s
    likes, dislikes = [], []
    for dim, c in by.items():
        for k, v in c.most_common():
            if k.endswith("?"):
                continue
            (likes if v > 0 else dislikes if v < 0 else []).append(f"{k} ({v:+d})")
    text = ("Le interesa más: " + (", ".join(likes[:8]) or "aún sin señales") + ". "
            "Suele descartar: " + (", ".join(dislikes[:6]) or "nada todavía") + ".")
    os.makedirs(f"{w}/out", exist_ok=True)
    json.dump({"text": text, "stats": {k: dict(v) for k, v in by.items()}, "signals": dict(n), "updated": hoy},
              open(f"{w}/out/prefs.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(text)


if __name__ == "__main__":
    main()
