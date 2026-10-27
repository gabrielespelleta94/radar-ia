"""Índice compacto de todo lo visto (doc config/index del dashboard).

items: {doc_id: [pick 0/1, score, level, status, featured, day]}
  refresh W       aplica las señales del usuario (status) y escribe W/seen.txt
  add W HOY       añade candidatos y picks de hoy y deja W/out/index.json listo para set
  build DIR       crea el índice desde una exportación completa de repos (DIR/repos/*.json)
"""
import glob, json, os, sys
sys.stdout.reconfigure(encoding="utf-8")


def load(path):
    d = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    return d.get("data", d)


def entry(d):
    return [1 if d.get("pick") else 0, d.get("score") or 0, d.get("level") or 0,
            d.get("status") or "new", d.get("featured") or "", d.get("featured") or d.get("firstSeen") or ""]


def write_seen(w, items):
    with open(f"{w}/seen.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(items)) + "\n")


def main():
    cmd, w = sys.argv[1], sys.argv[2]
    if cmd == "build":
        items = {os.path.basename(f)[:-5]: entry(load(f)) for f in glob.glob(f"{w}/repos/*.json")}
        os.makedirs(f"{w}/out", exist_ok=True)
        json.dump({"items": items, "updated": ""}, open(f"{w}/out/index.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"índice con {len(items)} docs")
        return
    idx = load(f"{w}/db/config/index.json")
    items = idx.get("items", {})
    if cmd == "refresh":
        n = 0
        for f in glob.glob(f"{w}/db/repos/*.json"):
            i = os.path.basename(f)[:-5]
            st = load(f).get("status") or "new"
            if i in items and items[i][3] != st:
                items[i][3] = st; n += 1
        idx["items"] = items
        json.dump(idx, open(f"{w}/db/config/index.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        write_seen(w, items)
        print(f"{len(items)} vistos, {n} señales nuevas aplicadas")
    elif cmd == "add":
        hoy = sys.argv[3]
        for f in glob.glob(f"{w}/out/reservas/*.json"):
            items[os.path.basename(f)[:-5]] = entry(load(f))
        for f in glob.glob(f"{w}/out/picks/*.json"):
            name = os.path.basename(f)
            d = load(f)
            if name.endswith(".update.json"):  # rescatado: solo cambian pick, score, nivel y featured
                i = name[:-len(".update.json")]
                old = items.get(i, [0, 0, 0, "new", "", ""])
                items[i] = [1, d.get("score", old[1]), d.get("level", old[2]), old[3], hoy, hoy]
            else:
                items[name[:-5]] = entry(d)
        os.makedirs(f"{w}/out", exist_ok=True)
        json.dump({"items": items, "updated": hoy}, open(f"{w}/out/index.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"índice: {len(items)} docs")


if __name__ == "__main__":
    main()
