# Demo (panel animado sobre la lámina)

Formato: `"demo": {"scene": plantilla, "beat": índice base 0 del beat del guion donde la herramienta actúa (de 1 a la longitud del guion menos 1; nunca 0, que es la escena de su día), ...datos}`.
Elige la plantilla que mejor haga TANGIBLE lo que hace la herramienta en su caso, y varíalas entre picks.

| scene | Para qué | Datos (contrato exacto) |
|---|---|---|
| gap-scan | revisión que marca huecos | doc (opcional), lines [5-6, máx 40 caracteres], gaps [{line (base 0), label: "SIN FUENTE"}], roles [{name, text}] (1-3), summary |
| diff-review | cambios con comentarios y sello | file, lines [{t: "+"\|"-"\|" ", text}] (máx 9, máx 50 caracteres), comments [{line, who, text}] (1-3), verdict ("Aprobado" o "Cambios pedidos") |
| parallel-lanes | agentes en paralelo que se fusionan | lanes [{agent, task}] (2-5), merge |
| doc-builder | documento que se rellena desde sus fuentes | title, sections [{name, source, text}] (2-4) |
| context-squeeze | log largo que se comprime en una ficha | log [6-10 líneas], summary [2-4], tokensBefore, tokensAfter (números redondos de ejemplo) |
| eval-scorecard | comprobaciones hasta una nota | checks [{name, pass}] (3-7), grade (máx 14 caracteres) |
| cli-wrap | app convertida en comandos con salida JSON | app, commands [{cmd (máx 44 caracteres), out (JSON corto, 1 línea)}] (1-3) |
| memory-recall | consulta que enciende casos (búsqueda vectorial, knowledge graph) | query, items [{name, hit}] (4-8), answer, answerLabel (opcional) |
| plugin-pack | skills, plugins o mods que se instalan en el equipo | skills [...] (2-5), plugin, targets [...] (1-3) |
| event-log | log de eventos que se reproduce | events [{time, text}] (3-7), replayLabel |

El contenido sale de su myday y de la lámina. Son ejemplos ilustrativos (la página lo marca en pantalla): nada de cifras presentadas como reales, nombres de cliente ni datos personales. Usa marcadores ("Proyecto A", "AAAA-MM-DD"). Textos cortos para que no se corten.
