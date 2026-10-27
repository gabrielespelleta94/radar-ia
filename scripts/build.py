"""Une la base factual con el contenido escrito por el modelo y valida cada pick.

Entrada: W/seleccion.json, W/base.json (nuevos), W/db/repos/<id>.json (rescatados), W/contenido/<id>.json.
Salida:  W/out/picks/<id>.json listo para ArtifactData (set si es nuevo; update si es rescatado).
Sale con código 1 y la lista de errores si algo no cumple el contrato.
"""
import json, os, re, sys, unicodedata
sys.stdout.reconfigure(encoding="utf-8")

ROLES = {"input", "tool", "output", "you", "context"}
ICONS = set("doc notes agent db repo chat chart table gear user check folder clock money shield search terminal plug book list mail calendar cloud bolt lake eye team link".split())
KINDS = {"Skill", "Plugin", "Mod", "Agente", "Multi-agente", "MCP server", "CLI", "Librería", "Framework", "App", "Plantilla", "Guía", "Modelo", "Space", "Concepto", "Novedad"}
FITS = {"Onboarding / equipos", "Documentación", "Actas y status", "Ofertas y estimaciones", "Seguimiento vs vendido", "Claude Code / skills",
        "Apps de datos", "Fabric y mercado", "EPM / planning", "React / TypeScript", "LLM engineering", "IA general"}
EFFORT = {"1 h", "medio día", "1-2 días", "proyecto"}
QWEFFORT = {"1 h", "medio día", "1-2 días"}
BANNED = re.compile(r"\bdelve\b|\bleverag(e|ing)\b|best practices|—|\bpotente|sin fricción|desbloque|\baprovech|\bpotenci[ae]|\bholístic|es importante|cabe señalar|en resumen|en definitiva|no solo .{1,60} sino|\bFDE\b|forward.deployed|\bpower ?bi\b", re.I)
CAPS = {1: 100, 2: 100, 3: 75, 4: 65, 5: 45}
TICONS = set("notes gear agent book search user lock list eye check folder doc".split())
MOTIVOS = {"doc", "arbol", "lector", "respuesta"}
LAMINAS = {"ventana", "calles", "hub", "capas", "tabla", "grupos", "ciclo"}
PENDIENTES = {"escritorio", "fabrica", "frontera", "maqueta", "lupa"}
ISOMETRICAS = PENDIENTES | {"capas"}
# pasos animables por tipo (el paso del guion y de piensa no puede pasar de aquí)
NPASOS = dict(ventana=5, calles=6, hub=6, capas=5, tabla=6, grupos=3, ciclo=6, escritorio=5, fabrica=6, frontera=4, maqueta=5, lupa=6)
# dónde se permite `agente` (ruta dentro de la lámina; [] = cada elemento de la lista)
AGENTE_OK = {"pasos[]": {"calles"}, "flujo.pasos[]": {"hub"}, "centro": {"hub"}, "nodos[]": {"ciclo"}}
DIAS = re.compile(r"\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b|fin de semana|\besta (ma[ñn]ana|tarde|noche)\b|\bpor la (ma[ñn]ana|tarde|noche)\b", re.I)
# términos de contexto.md que no se traducen y exigen definición en `glosario` (salvo los que el usuario ya domina, ver contexto.md)
GLOS_TERMS = ["writeback", "mirroring", "snapshot", "skill", "hook", "MCP", "RAG", "eval", "embedding", "knowledge graph"]
STOP = set("para como esta este esos esas pero sino sobre desde hasta entre cada todo todos tiene tienes haces hace sera donde cuando".split())
FULL_KEYS = ["funcion", "quickwins", "licencia", "myday", "lamina", "guion", "demo", "kind", "tldr", "flow", "idea", "why", "apply", "fit", "effort", "risk", "category"]
SHORT_KEYS = ["funcion", "quickwins", "licencia", "myday", "kind", "tldr", "flow", "idea", "why", "apply", "fit", "effort", "risk", "category"]
words = lambda t: len(str(t or "").split())


def norm(t):
    t = unicodedata.normalize("NFD", str(t or "").lower())
    return "".join(ch for ch in t if unicodedata.category(ch) != "Mn")


def sig(t):
    """Palabras significativas (4+ letras, sin acentos), reducidas a 5 letras para tolerar plurales."""
    return {w[:5] for w in re.findall(r"[a-z0-9]+", norm(t)) if len(w) >= 4 and w not in STOP}


def check_agente_piensa(l, t, err):
    # agente: booleano y solo en los sitios permitidos (en escritorio, `agente` es el nombre del agente: texto)
    def walk(o, path):
        if isinstance(o, dict):
            if "agente" in o and path:
                if not isinstance(o["agente"], bool): err(f"lamina.{path}.agente debe ser true o false")
                elif t not in AGENTE_OK.get(path, ()): err(f"lamina: agente no se permite en {path} (solo calles.pasos, hub.flujo.pasos, hub.centro y ciclo.nodos)")
            for k, v in o.items():
                if k not in ("piensa",): walk(v, f"{path}.{k}" if path else k)
        elif isinstance(o, list):
            for v in o: walk(v, path + "[]")
    for k, v in l.items():
        if k == "agente":
            if t == "escritorio": continue
            err(f"lamina: agente no se permite en el nivel raíz de {t}")
        elif k != "piensa": walk(v, k)
    p = l.get("piensa")
    if p is None: return
    if not isinstance(p, list) or not 1 <= len(p) <= 3: err(f"lamina.piensa: {len(p) if isinstance(p, list) else 0} burbujas (debe ser 1-3)"); return
    m = NPASOS.get(t, 6)
    for k, b in enumerate(p):
        if not isinstance(b, dict): err(f"lamina.piensa {k}: debe ser un objeto {{paso, texto}}"); continue
        ps = b.get("paso")
        if not isinstance(ps, int) or isinstance(ps, bool) or not 0 <= ps < m: err(f"lamina.piensa {k}: paso {ps} fuera de 0..{m-1}")
        tx = str(b.get("texto") or "")
        if not tx.strip(): err(f"lamina.piensa {k}: falta texto")
        if words(tx) > 10: err(f"lamina.piensa {k}: texto > 10 palabras")
        if re.search(r"%|\d[\d.,]*\s*[A-Za-z€$]", tx): err(f"lamina.piensa {k}: lleva cifras con unidades o %")
    if len({b.get("paso") for b in p if isinstance(b, dict)}) < len(p): err("lamina.piensa: dos burbujas en el mismo paso")


def check_lamina(l, err):
    t = l.get("tipo") if isinstance(l, dict) else None
    if t not in LAMINAS | PENDIENTES: err(f"lamina.tipo desconocido: {t}"); return
    check_agente_piensa(l, t, err)
    L = lambda o, k: o.get(k) if isinstance(o, dict) and isinstance(o.get(k), list) else []
    D = lambda o, k: o.get(k) if isinstance(o, dict) and isinstance(o.get(k), dict) else {}
    def rng(o, k, a, z, what=None):
        n = len(L(o, k))
        if not a <= n <= z: err(f"lamina.{what or k}: {n} elementos (debe ser {a}-{z})")
    def need(o, ks, what):
        for k in ks:
            if o.get(k) in (None, "", [], {}): err(f"lamina.{what}: falta {k}")
    def llamadas(key, anclas, a=2, z=4):
        # anclas: {campo: nº de elementos válidos, índice base 0}
        rng(l, key, a, z)
        for c in L(l, key):
            if c.get("n") in (None, ""): err(f"lamina.{key}: llamada sin n")
            if words(c.get("titulo")) > 5: err(f"lamina.{key} {c.get('n')}: titulo > 5 palabras")
            if words(c.get("texto")) > 18: err(f"lamina.{key} {c.get('n')}: texto > 18 palabras")
            for f, m in anclas.items():
                v = c.get(f)
                if not isinstance(v, int) or isinstance(v, bool) or not 0 <= v < m: err(f"lamina.{key} {c.get('n')}: {f} {v} fuera de 0..{m-1}")
    if t == "ventana":
        need(l, ["tabs", "raiz", "arbol", "fichero", "lineas", "terminal", "pide", "propone", "piezas", "local", "llamadas"], t)
        rng(l, "tabs", 3, 3); rng(l, "arbol", 4, 6); rng(l, "lineas", 5, 7); rng(l, "terminal", 2, 3); rng(l, "piezas", 4, 5)
        for x in L(l, "lineas"):
            if not (isinstance(x.get("w"), (int, float)) and 0 <= x["w"] <= 1): err("lamina.lineas.w debe estar entre 0 y 1")
        for x in L(l, "terminal"):
            if len(str(x.get("cmd") or "")) > 44: err(f"lamina.terminal.cmd > 44 caracteres: {str(x.get('cmd'))[:50]}")
            if not x.get("out"): err("lamina.terminal.out vacío")
        if not (D(l, "local").get("t") and D(l, "local").get("s")): err("lamina.local necesita t y s")
        if not isinstance(l.get("activa"), int) or not 0 <= l["activa"] < len(L(l, "tabs")): err("lamina.activa fuera de rango")
        for c in L(l, "llamadas")[:2]:
            if not (c.get("titulo") and c.get("texto")): err(f"lamina.llamadas {c.get('n')}: falta titulo o texto")  # la 3 usa local.s
        llamadas("llamadas", {}, 3, 3)
    elif t == "calles":
        need(l, ["carriles", "pasos", "nota", "llamadas"], t); rng(l, "carriles", 2, 2); rng(l, "pasos", 6, 6)
        ps = L(l, "pasos")
        if ps and not ps[-1].get("persona"): err("lamina.pasos: el último debe llevar persona:true")
        llamadas("llamadas", {"paso": len(ps)})
    elif t == "hub":
        need(l, ["centro", "izq", "der", "flujo", "llamadas"], t)
        if not (D(l, "centro").get("t") and D(l, "centro").get("s")): err("lamina.centro necesita t y s")
        for lado in ("izq", "der"):
            if not (D(l, lado).get("rot") and D(l, lado).get("sub")): err(f"lamina.{lado} necesita rot y sub")
            rng(D(l, lado), "items", 3, 4, f"{lado}.items")
        rng(D(l, "flujo"), "pasos", 5, 5, "flujo.pasos")
        llamadas("llamadas", {"paso": len(L(D(l, "flujo"), "pasos"))})
    elif t == "capas":
        need(l, ["capas", "consulta", "arbol"], t); rng(l, "capas", 3, 4); rng(D(l, "arbol"), "items", 5, 7, "arbol.items")
        for x in L(l, "capas"):
            if x.get("motivo") not in MOTIVOS: err(f"lamina.capas.motivo {x.get('motivo')} (doc, arbol, lector, respuesta)")
        if not (D(l, "consulta").get("t") and D(l, "consulta").get("fin")): err("lamina.consulta necesita t y fin")
        if not D(l, "arbol").get("rot"): err("lamina.arbol.rot vacío")
    elif t == "tabla":
        need(l, ["cab", "filas", "llamadas"], t); rng(l, "cab", 2, 2); rng(l, "filas", 4, 7)
        for x in L(l, "filas"):
            if x.get("icono") not in TICONS: err(f"lamina.filas.icono {x.get('icono')}")
            if not (x.get("t") and x.get("s") and x.get("donde")): err(f"lamina.filas {x.get('n')}: necesita t, s y donde")
        llamadas("llamadas", {"fila": len(L(l, "filas"))})
    elif t == "grupos":
        need(l, ["cols", "llamadas"], t); rng(l, "cols", 2, 3)
        cols = L(l, "cols")
        for k, c in enumerate(cols): rng(c, "items", 3, 5, f"cols[{k}].items")
        for c in L(l, "llamadas"):
            k, it = c.get("col"), c.get("item")
            if not (isinstance(k, int) and 0 <= k < len(cols)): err(f"lamina.llamadas {c.get('n')}: col {k} fuera de rango")
            elif not (isinstance(it, int) and 0 <= it < len(L(cols[k], "items"))): err(f"lamina.llamadas {c.get('n')}: item {it} fuera de rango")
            if c.get("lado") not in ("izq", "der"): err(f"lamina.llamadas {c.get('n')}: lado debe ser izq o der")
        llamadas("llamadas", {})
    elif t == "ciclo":
        need(l, ["nodos", "cierre", "centro", "llamadas"], t); rng(l, "nodos", 4, 6); rng(D(l, "centro"), "checks", 3, 5, "centro.checks")
        if sum(1 for x in L(l, "nodos") if x.get("persona")) != 1: err("lamina.nodos: exactamente un nodo con persona:true")
        llamadas("llamadas", {"nodo": len(L(l, "nodos"))})
        for c in L(l, "llamadas"):
            if c.get("pos") not in ("tl", "tr", "br"): err(f"lamina.llamadas {c.get('n')}: pos {c.get('pos')} (tl, tr, br)")
    else:
        print(f"   · lamina.tipo {t}: contrato pendiente, solo se comprueban las llamadas")
        key = next((k for k in ("llamadas", "rotulos", "hallazgos") if L(l, k)), None)
        if not key: err(f"lamina.{t}: sin llamadas")
        else: llamadas(key, {}, 2, 4)


def check_quickwins(q, n, err):
    if not isinstance(q, list) or not n[0] <= len(q) <= n[1]: err(f"quickwins: {len(q) if isinstance(q, list) else 0} elementos (debe ser {n[0]}-{n[1]})"); return
    cifra = re.compile(r"%|\d\s*(h|horas?)\b", re.I)
    for k, x in enumerate(q):
        if not isinstance(x, dict): err(f"quickwins {k}: debe ser un objeto"); continue
        for f in ("titulo", "proyecto", "esfuerzo", "antes", "despues", "paso"):
            if not str(x.get(f) or "").strip(): err(f"quickwins {k}: falta {f}")
        if words(x.get("titulo")) > 6: err(f"quickwins {k}: titulo > 6 palabras")
        if x.get("esfuerzo") and x["esfuerzo"] not in QWEFFORT: err(f"quickwins {k}: esfuerzo {x['esfuerzo']} (1 h, medio día, 1-2 días)")
        for f in ("antes", "despues"):
            if words(x.get(f)) > 10: err(f"quickwins {k}: {f} > 10 palabras")
            if cifra.search(str(x.get(f) or "")): err(f"quickwins {k}: {f} lleva cifras inventadas (% u horas)")
        if len(str(x.get("paso") or "")) > 60: err(f"quickwins {k}: paso > 60 caracteres")


LIC_TIPOS = {"libre", "condiciones", "pago", "desconocida"}


def check_licencia(l, err):
    if not isinstance(l, dict): err("licencia debe ser {tipo, nombre, nota, pago}"); return
    if l.get("tipo") not in LIC_TIPOS: err(f"licencia.tipo {l.get('tipo')!r}: usa libre | condiciones | pago | desconocida")
    if not str(l.get("nombre") or "").strip(): err("falta licencia.nombre")
    if words(l.get("nota")) > 15: err("licencia.nota > 15 palabras")
    if words(l.get("pago")) > 12: err("licencia.pago > 12 palabras")
    if l.get("tipo") == "condiciones" and not str(l.get("nota") or "").strip(): err("licencia condiciones sin nota: di cuál es la condición")


def check_dias(c, err):
    """Ni días de la semana ni momentos del día en myday, guion, quickwins y headline."""
    for campo in ("myday", "guion", "quickwins", "headline", "lamina"):
        if c.get(campo) in (None, "", [], {}): continue
        m = DIAS.search(json.dumps(c[campo], ensure_ascii=False))
        if m: err(f"{campo}: nombra un día o momento de la semana («{m.group(0)}»); describe la situación, no el cuándo")


def _sing(t):
    t = norm(t).strip()
    return t[:-1] if t.endswith("s") and len(t) > 4 else t


def check_glosario(c, err):
    g = c.get("glosario")
    if g is None: g = []
    if not isinstance(g, list) or len(g) > 4: err(f"glosario: {len(g) if isinstance(g, list) else 0} entradas (debe ser 0-4)"); g = []
    dados = set()
    for k, x in enumerate(g):
        if not isinstance(x, dict) or not str(x.get("termino") or "").strip(): err(f"glosario {k}: falta termino"); continue
        dados.add(_sing(x["termino"]))
        n = words(x.get("definicion"))
        if not 8 <= n <= 20: err(f"glosario {k} ({x['termino']}): definicion de {n} palabras (8-20)")
    texto = json.dumps({k: c.get(k) for k in ("tldr", "funcion", "quickwins", "myday", "guion", "lamina")}, ensure_ascii=False)
    for t in GLOS_TERMS:
        if re.search(r"(?<![\w-])" + re.escape(t) + r"s?(?![\w-])", texto, re.I) and _sing(t) not in dados:
            err(f"glosario: «{t}» aparece en el texto y no está definido")


def check_guion(g, err, qw=None):
    if not isinstance(g, list) or not 5 <= len(g) <= 7: err(f"guion: {len(g) if isinstance(g, list) else 0} beats (5-7)"); return 0
    prev = 0; tot = 0; titulos = set()
    for k, b in enumerate(g):
        w = words(b.get("say")); tot += w
        tt = str(b.get("titulo") or "").strip()
        if not tt: err(f"guion {k}: falta titulo")
        elif not 1 <= words(tt) <= 4: err(f"guion {k}: titulo de {words(tt)} palabras (1-4)")
        elif norm(tt) in titulos: err(f"guion {k}: titulo «{tt}» repetido dentro del guion")
        titulos.add(norm(tt))
        if not 15 <= w <= 45: err(f"guion {k}: {w} palabras (20-35)")
        if re.search(r"https?://|[*#`]", b.get("say") or ""): err(f"guion {k}: el say lleva URL o markdown")
        p = b.get("paso")
        if not isinstance(p, int) or isinstance(p, bool) or p < 0: err(f"guion {k}: paso {p} debe ser un entero >= 0"); continue
        if k == 0 and p != 0: err(f"guion 0: el primer paso debe ser 0, no {p}")
        if p < prev: err(f"guion {k}: paso {p} baja respecto al anterior ({prev})")
        prev = max(prev, p)
    if not 100 <= tot <= 190: err(f"guion total {tot} palabras (120-190)")
    # el beat 0 presenta el primer quick win
    q = qw[0] if isinstance(qw, list) and qw and isinstance(qw[0], dict) else None
    if q and isinstance(g[0], dict):
        s0 = sig(g[0].get("say"))
        if len(s0 & sig(q.get("titulo"))) < 2 and len(s0 & sig(q.get("despues"))) < 2:
            err("guion 0: debe presentar el primer quick win (nombra su título o su «despues», al menos 2 palabras en común)")
    return len(g)


def check_demo(d, nbeats, err):
    s = d.get("scene"); b = d.get("beat")
    if not isinstance(b, int) or not 1 <= b < nbeats: err(f"demo.beat {b} fuera de 1..{nbeats-1}")
    L = lambda k: d.get(k) if isinstance(d.get(k), list) else []
    def rng(k, a, z):
        if not a <= len(L(k)) <= z: err(f"demo.{k}: {len(L(k))} elementos (debe ser {a}-{z})")
    def maxlen(vals, n, what):
        for v in vals:
            if len(str(v)) > n: err(f"demo.{what} > {n} caracteres: {str(v)[:50]}")
    if s == "gap-scan":
        rng("lines", 5, 6); rng("roles", 1, 3); maxlen(L("lines"), 40, "lines")
        for g in L("gaps"):
            if not (isinstance(g.get("line"), int) and 0 <= g["line"] < len(L("lines"))): err("demo.gaps.line fuera de rango")
        if not d.get("summary"): err("demo.summary vacío")
    elif s == "diff-review":
        rng("lines", 1, 9); rng("comments", 1, 3); maxlen([x.get("text") for x in L("lines")], 50, "lines.text")
        for x in L("lines"):
            if x.get("t") not in ("+", "-", " "): err("demo.lines.t debe ser '+', '-' o ' '")
        for c in L("comments"):
            if not (isinstance(c.get("line"), int) and 0 <= c["line"] < len(L("lines"))): err("demo.comments.line fuera de rango")
        if not d.get("verdict"): err("demo.verdict vacío")
    elif s == "parallel-lanes":
        rng("lanes", 2, 5)
        if not d.get("merge"): err("demo.merge vacío")
    elif s == "doc-builder":
        rng("sections", 2, 4)
        for x in L("sections"):
            if not (x.get("name") and x.get("source") and x.get("text")): err("demo.sections necesita name, source y text")
    elif s == "context-squeeze":
        rng("log", 6, 10); rng("summary", 2, 4)
        a, z = d.get("tokensBefore"), d.get("tokensAfter")
        if not (isinstance(a, (int, float)) and isinstance(z, (int, float)) and a > z >= 0): err("demo.tokensBefore > tokensAfter >= 0")
    elif s == "eval-scorecard":
        rng("checks", 3, 7)
        if not d.get("grade") or len(str(d["grade"])) > 14: err("demo.grade vacío o > 14 caracteres")
    elif s == "cli-wrap":
        rng("commands", 1, 3); maxlen([x.get("cmd") for x in L("commands")], 44, "commands.cmd")
        if not d.get("app"): err("demo.app vacío")
    elif s == "memory-recall":
        rng("items", 4, 8)
        if not (d.get("query") and d.get("answer")): err("demo.query y demo.answer obligatorios")
        if not any(x.get("hit") for x in L("items")): err("demo.items: al menos un hit")
    elif s == "plugin-pack":
        rng("skills", 2, 5); rng("targets", 1, 3)
        if not d.get("plugin"): err("demo.plugin vacío")
    elif s == "event-log":
        rng("events", 3, 7)
        if not d.get("replayLabel"): err("demo.replayLabel vacío")
    else:
        err(f"demo.scene desconocida: {s}")


def check_scene(s, err):
    nodes = s.get("nodes") or []; ids = {n.get("id") for n in nodes}
    if not 4 <= len(nodes) <= 8: err(f"scene3d: {len(nodes)} nodos (4-8)")
    for n in nodes:
        if n.get("role") not in ROLES: err(f"nodo {n.get('id')}: role {n.get('role')}")
        if n.get("icon") not in ICONS: err(f"nodo {n.get('id')}: icon {n.get('icon')}")
        if not isinstance(n.get("col"), (int, float)) or not 0 <= n["col"] <= 4: err(f"nodo {n.get('id')}: col 0-4")
        if not isinstance(n.get("row"), (int, float)) or not -1.6 <= n["row"] <= 1.6: err(f"nodo {n.get('id')}: row -1.6..1.6")
        if words(n.get("label")) > 3: err(f"nodo {n.get('id')}: label > 3 palabras")
    for i, a in enumerate(nodes):
        for b in nodes[i + 1:]:
            if a.get("col") == b.get("col") and abs((a.get("row") or 0) - (b.get("row") or 0)) < 1.4:
                err(f"nodos {a.get('id')} y {b.get('id')} demasiado juntos en la col {a.get('col')}")
    for e in s.get("edges") or []:
        if e.get("from") not in ids or e.get("to") not in ids: err(f"edge {e} apunta a un nodo que no existe")
    beats = s.get("beats") or []
    if not 4 <= len(beats) <= 7: err(f"scene3d: {len(beats)} beats (4-7)")
    shown = set()
    for k, b in enumerate(beats):
        w = words(b.get("say"))
        if not 15 <= w <= 45: err(f"beat {k}: {w} palabras (20-35)")
        for i in b.get("show") or []:
            if i not in ids: err(f"beat {k}: show {i} no existe")
            shown.add(i)
        if b.get("focus") and b["focus"] not in ids: err(f"beat {k}: focus {b['focus']} no existe")
        if re.search(r"https?://|[*#`]", b.get("say") or ""): err(f"beat {k}: el say lleva URL o markdown")
    if ids - shown: err(f"nodos que nunca aparecen: {sorted(ids - shown)}")
    tot = sum(words(b.get("say")) for b in beats)
    if not 80 <= tot <= 170: err(f"guion total {tot} palabras (100-150)")
    return len(beats)


def main():
    w, hoy = sys.argv[1], sys.argv[2]
    parcial = "--parcial" in sys.argv  # modo PRUEBA: solo valida los picks que tienen contenido
    sel = json.load(open(f"{w}/seleccion.json", encoding="utf-8")); base = json.load(open(f"{w}/base.json", encoding="utf-8"))
    os.makedirs(f"{w}/out/picks", exist_ok=True)
    errors = 0; openers = {}; tipos = {}  # tipos: lamina.tipo de cada pick completo con lámina
    for kind in ("full", "short"):
        for i in sel[kind]:
            msgs = []; err = msgs.append
            cpath = f"{w}/contenido/{i}.json"
            if not os.path.exists(cpath):
                if parcial: continue
                print(f"✗ {i}: falta {cpath}"); errors += 1; continue
            c = json.load(open(cpath, encoding="utf-8"))
            op = " ".join(str(c.get("myday") or "").lower().split()[:2])
            if op and op in openers: err(f"myday empieza igual que {openers[op]} («{op}…»): varía la entrada")
            openers.setdefault(op, i)
            for k in (FULL_KEYS if kind == "full" else SHORT_KEYS):
                if c.get(k) in (None, "", [], {}): err(f"falta {k}")
            if c.get("kind") and c["kind"] not in KINDS: err(f"kind {c['kind']}")
            if words(c.get("tldr")) > 14: err("tldr > 14 palabras (objetivo 12)")
            for f in c.get("fit") or []:
                if f not in FITS: err(f"fit desconocido: {f}")
            if c.get("effort") and c["effort"] not in EFFORT: err(f"effort {c['effort']}")
            if BANNED.search(json.dumps(c, ensure_ascii=False)): err(f"texto vetado (ver estilo.md): {BANNED.search(json.dumps(c, ensure_ascii=False)).group(0)}")
            if words(c.get("funcion")) > 25: err("funcion > 25 palabras")
            if c.get("funcion") and "→" not in c["funcion"]: err("funcion debe seguir «Entra X → hace Y → sale Z»")
            check_dias(c, err)
            if c.get("licencia"): check_licencia(c["licencia"], err)
            check_glosario(c, err)
            if c.get("quickwins"): check_quickwins(c["quickwins"], (2, 3) if kind == "full" else (1, 2), err)
            if c.get("lamina"):
                check_lamina(c["lamina"], err)
                tl = c["lamina"].get("tipo") if isinstance(c["lamina"], dict) else None
                if kind == "full" and tl:
                    if tl in tipos: err(f"lamina.tipo {tl} repetido: ya lo usa {tipos[tl]} (varía el tipo entre los picks completos)")
                    tipos.setdefault(tl, i)
            if kind == "full":
                nb = check_scene(c["scene3d"], err) if c.get("scene3d") else 0  # compatibilidad con la escena 3D antigua
                if c.get("guion"):
                    ng = check_guion(c["guion"], err, c.get("quickwins")); nb = nb or ng
                if c.get("demo") and nb: check_demo(c["demo"], nb, err)
            if kind == "short":
                c.pop("scene3d", None); c.pop("demo", None); c.pop("guion", None)
            if i in sel["rescued"]:
                old = json.load(open(f"{w}/db/repos/{i}.json", encoding="utf-8")); old = old.get("data", old)
                doc = dict(c, pick=True, featured=hoy, level=old.get("level") or c.get("level"), score=old.get("score"))
            else:
                doc = dict(base[i], **c)
                lv = doc.get("level") or 5
                if (doc.get("score") or 0) > CAPS.get(lv, 45): err(f"score {doc.get('score')} supera el tope del nivel {lv}")
            if msgs:
                errors += 1; print(f"✗ {i}:"); [print("   -", m) for m in msgs]
            else:
                name = f"{i}.update.json" if i in sel["rescued"] else f"{i}.json"
                json.dump(doc, open(f"{w}/out/picks/{name}", "w", encoding="utf-8"), ensure_ascii=False)
                print(f"✓ {i} ({kind})")
    if len(tipos) >= 3 and not set(tipos) & ISOMETRICAS:
        print(f"⚠ ningún pick completo usa un tipo isométrico ({', '.join(sorted(ISOMETRICAS))}): al menos uno de cada tres debería serlo")
    if errors:
        print(f"{errors} picks con errores"); sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
