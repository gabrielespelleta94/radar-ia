# Fuentes

Usa WebFetch (curl a github.com está bloqueado). En cada llamada pide: "List every item as owner/name | language or task | stars or likes | stars in period if shown | short description. No other text."

## GitHub trending
- https://github.com/trending?since=daily
- https://github.com/trending?since=weekly
- https://github.com/trending/python?since=daily
- https://github.com/trending/typescript?since=daily

## GitHub por temas de IA
Prueba primero `https://api.github.com/search/repositories?q=topic:TEMA+pushed:>FECHA_HACE_30_DIAS&sort=stars&order=desc&per_page=15`. Si no responde, usa `https://github.com/topics/TEMA?o=desc&s=updated`.
TEMAS: claude-code, knowledge-graph, graphrag, vector-database, embeddings, rag, llm-agents, mcp, llm-evaluation, agent-memory.
Quédate con los que tengan tracción reciente (estrellas o actividad), no con los viejos y parados.
Si con todo esto hay menos de 15 nuevos con score >= 40, haz una segunda vuelta: claude-code-plugin, semantic-search, knowledge-base, text-to-sql, llmops, ai-agents, context-engineering.

## Hugging Face (por curl con su API; WebFetch no resuelve el dominio)
Un solo comando, que ya filtra imagen, vídeo y voz y deja una línea por item:
```bash
$PY - <<'EOF'
import json, subprocess
skip = ("image", "video", "audio", "speech", "text-to-3d", "image-to")
def get(u): return json.loads(subprocess.run(["curl", "-s", "--max-time", "20", u], capture_output=True, text=True).stdout or "[]")
for m in get("https://huggingface.co/api/models?sort=trendingScore&limit=40"):
    t = m.get("pipeline_tag") or ""
    if not any(s in t for s in skip): print("model", m["id"], t, m.get("likes"), sep=" | ")
for s in get("https://huggingface.co/api/spaces?sort=trendingScore&limit=30"):
    print("space", s["id"], s.get("sdk"), s.get("likes"), sep=" | ")
EOF
```
Si curl no responde (en local el entorno puede bloquearlo), pide con WebFetch las mismas dos URLs de la API (devuelven JSON) con el mismo prompt de fuentes y aplica tú el filtro. Si tampoco responde, sigue sin Hugging Face y anótalo en `sources_failed`. La descripción de un modelo o Space solo hace falta para los que vayan a entrar en el top: la saca el paso 3 de la model card.

## Mercado Fabric y EPM (novedades de producto para clientes)
Pide con WebFetch: "List every announcement of the last 7 days as vendor | product or feature | date | one-line summary | URL. No other text." Quédate solo con lo que un cliente podría querer contratar o probar; descarta webinars, eventos, casos de éxito y todo lo que sea de Power BI.
- Fabric: https://blog.fabric.microsoft.com/en-us/blog/ y https://learn.microsoft.com/en-us/fabric/fundamentals/whats-new
- Cargas de trabajo de terceros en Fabric: https://learn.microsoft.com/en-us/fabric/workload-development-kit/more-workloads-add (y novedades del Workload Hub en el blog de Fabric)
- EPM: https://news.sap.com/tags/sap-analytics-cloud/ · https://www.anaplan.com/blog/ · https://www.pigment.com/blog · https://board.com/en/blog · https://www.onestream.com/blog/ · https://www.jedox.com/en/blog/
Si una no responde, sigue sin ella y anótala en `sources_failed`. Máximo 8 candidatos de este bloque por día.

## doc_id
- GitHub: `owner/repo` con "/" cambiado por "__" (p. ej. `obra__superpowers`).
- Modelo de Hugging Face: `hf__owner__name`. Space de Hugging Face: `hfspace__owner__name`.
- Novedad de mercado: `news__<marca>__<producto-o-funcion>` en minúsculas y con guiones (p. ej. `news__fabric__copilot-in-notebooks`), `name` = `<marca>/<producto-o-funcion>`, `url` = el anuncio, `stars` = null, `language` = "Novedad · Fabric" o "Novedad · EPM", kind = Novedad.
- `name` siempre en formato `owner/name`. En Hugging Face, `language` es la tarea (p. ej. "Modelo · embeddings" o "Space") y `stars` son los likes.
