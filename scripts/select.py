"""Selección determinista del top 10 por la cascada de interés.

Entrada: W/candidatos.json (nuevos, del rastreador) y W/db/config/index.json.
Salida:  W/seleccion.json {full, short, rescued, reserves} y W/out/reservas/<id>.json.
Orden: nivel ascendente y, dentro del nivel, score descendente. Corte: score >= 40.
Los 5 primeros salen en vídeo (full) y los 5 siguientes como ficha corta (short).
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")

CUT, TOP, FULL = 40, 10, 5
CAPS = {1: 100, 2: 100, 3: 75, 4: 65, 5: 45}
TIER = {1: "A", 2: "B"}


def main():
    w, hoy = sys.argv[1], sys.argv[2]
    cand = json.load(open(f"{w}/candidatos.json", encoding="utf-8"))
    idx = json.load(open(f"{w}/db/config/index.json", encoding="utf-8")) if os.path.exists(f"{w}/db/config/index.json") else {}
    items = idx.get("data", idx).get("items", {})
    new = []
    for it in cand.get("items", []):
        if not it.get("id") or it["id"] in items:
            continue
        lv = int(it.get("level") or 5)
        lv = lv if lv in CAPS else 5
        it["level"] = lv
        it["score"] = max(0, min(CAPS[lv], int(it.get("score") or 0)))
        new.append(it)
    key = lambda x: (x["level"], -x["score"])
    good = sorted([x for x in new if x["score"] >= CUT], key=key)
    picks = [("new", x["id"], x["level"], x["score"]) for x in good[:TOP]]
    if len(picks) < TOP:
        pool = [(v[2] or 5, -(v[1] or 0), i) for i, v in items.items()
                if not v[0] and (v[1] or 0) >= CUT and v[3] != "dismissed" and not v[4]]
        for lv, ns, i in sorted(pool)[: TOP - len(picks)]:
            picks.append(("rescued", i, lv, -ns))
    picks.sort(key=lambda p: (p[2], -p[3]))
    sel = {"date": hoy, "full": [p[1] for p in picks[:FULL]], "short": [p[1] for p in picks[FULL:TOP]],
           "rescued": [p[1] for p in picks if p[0] == "rescued"],
           "scanned": cand.get("scanned"), "repeated": cand.get("repeated"), "fresh": len(new),
           "sources_failed": cand.get("sources_failed", [])}
    chosen = {p[1] for p in picks}
    os.makedirs(f"{w}/out/reservas", exist_ok=True)
    base = {}
    for x in new:
        doc = {k: x.get(k) for k in ("name", "url", "description", "language", "stars", "starsToday", "level", "score", "kind", "tldr")}
        doc.update(firstSeen=hoy, tier=TIER.get(x["level"], "C"), pick=x["id"] in chosen, status="new")
        if x["id"] in chosen:
            base[x["id"]] = doc
        else:
            json.dump(doc, open(f"{w}/out/reservas/{x['id']}.json", "w", encoding="utf-8"), ensure_ascii=False)
    sel["reserves"] = len(new) - len([i for i in chosen if i in base])
    json.dump(base, open(f"{w}/base.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(sel, open(f"{w}/seleccion.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for kind in ("full", "short"):
        for i in sel[kind]:
            tag = "rescatado" if i in sel["rescued"] else "nuevo"
            print(f"{kind:5} {i}  ({tag})")
    print(f"revisados {sel['scanned']} · nuevos {sel['fresh']} · reservas {sel['reserves']} · fuentes caídas {sel['sources_failed']}")


if __name__ == "__main__":
    main()
