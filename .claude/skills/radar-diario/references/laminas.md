# Lámina (formato documento funcional)

Cada pick lleva `"lamina": {"tipo", ...datos del tipo}`. El dashboard la pinta en el report y, en los picks completos, la construye paso a paso en el vídeo al ritmo de `guion`. Principios visuales en `dashboard/DIAGRAMAS.md`.

## Elegir el tipo
Elige el dibujo que haga entender QUÉ ES cada pieza en su caso. Entre los picks completos del día no se repite tipo (build.py lo rechaza), y al menos uno de cada tres es isométrico (escritorio, fabrica, frontera, maqueta, lupa, capas; build.py avisa si no hay ninguno). Todo pick con un agente que razona o actúa lo marca con `agente` y lleva 1-3 `piensa`.
| tipo | Cuándo |
|---|---|
| ventana | Se usa dentro de un editor, terminal o app (CLI, skill, MCP, plugin) |
| calles | Proceso con reparto: qué prepara el agente y qué cierra la persona |
| hub | Una pieza central que conecta muchas (gateway, orquestador) |
| capas | Arquitectura por niveles (RAG, índices, grafos) |
| tabla | Glosario: varias piezas y qué es cada una |
| grupos | Colecciones (cursos, catálogos de skills, modelos) |
| ciclo | Algo que se repite y mejora (evals, memoria que aprende) |
| escritorio, fabrica, frontera, maqueta, lupa | Tipos isométricos: ver su contrato abajo |

`frontera` es obligatoria si la herramienta envía datos a un proveedor externo: así se ve qué cruza.

## Contrato por tipo
Las llamadas (`llamadas`) son 2-4, cada una `{n, titulo (máx 5 palabras), texto (máx 18 palabras)}` más su ancla según el tipo. Textos cortos: los nodos parten línea solos, pero un título de nodo pasa de 4 palabras solo si es imprescindible.
- ventana: `{tabs:[3], activa, raiz, arbol:[{n, nivel, sel, clave, tenue}] (4-6), fichero, lineas:[{w (0-1), az}] (5-7), terminal:[{cmd (máx 44 car.), out (JSON corto)}] (2-3), pide, propone, piezas:[{t, s}] (4-5), local:{t, s}, llamadas:[{n, titulo, texto}] (3; la 3 usa local.s)}`
- calles: `{carriles:["Prepara el agente","Cierra la persona"], pasos:[{t, s, persona}] (6 exactos, el último persona:true), nota, llamadas:[{n, paso, titulo, texto}]}`
- hub: `{centro:{t, s}, izq:{rot, sub, items:[{t, s}] (3-4)}, der:{rot, sub, items:[{t, s}] (3-4)}, flujo:{rot, pasos:[{t, s, persona}] (5 exactos)}, llamadas:[{n, paso, titulo, texto}]}`
- capas: `{capas:[{t, s, motivo, activa}] (3-4, de arriba abajo; motivo ∈ doc, arbol, lector, respuesta), consulta:{t, s, fin}, arbol:{rot, items:[{n, nivel, hit}] (5-7), pie}}`
- tabla: `{cab:[2], filas:[{n:"01", icono, t, s, donde}] (4-7; icono ∈ notes, gear, agent, book, search, user, lock, list, eye, check, folder, doc), llamadas:[{n, fila, titulo, texto}]}`
- grupos: `{cols:[{t, s, principal, cadena, items:[{t, s, tag}]}] (2-3 columnas, 3-5 items), llamadas:[{n, col, item, lado ∈ izq|der, titulo, texto}]}`
- ciclo: `{nodos:[{t, s, persona}] (4-6, uno persona:true), cierre, centro:{rot, nota, sub, checks:[{t, ok}] (3-5)}, llamadas:[{n, nodo, pos ∈ tl|tr|br, titulo, texto}]}`
- escritorio (mesa isométrica con portátil, agente y persona): `{agente, tu:{t, s}, llamadas:[{n, titulo, texto}] (4)}`
- fabrica (cinta: entra, máquinas, sale, revisa la persona): `{entra, sale, entrada:{t, s}, llamadas (4)}`
- frontera (tres plataformas: Tu portátil, Nube Microsoft, Proveedor externo): `{zonas:[{t, s}] (3), llamadas (4)}`; la que avisa de lo que sale fuera lleva `n:"!"`.
- maqueta (bloques de arquitectura apilados): `{tu:{t, s}, puerta, rotulos:[{n, titulo, texto}] (4)}`
- lupa (documento con zonas resaltadas y hallazgos): `{doc:{t, s}, lupa:{t, s}, hallazgos:[{n, y, h, titulo, texto}] (3), fin:{t, s}}`

### Campos comunes: `agente` y `piensa`
- `agente: true` marca la pieza que es un agente que razona o actúa (se dibuja con un robot pequeño). Solo se admite en `calles.pasos[i]`, `hub.flujo.pasos[i]`, `hub.centro` y `ciclo.nodos[i]`; en escritorio, `agente` ya es el nombre del agente (texto). Los comandos, scripts y hooks no son agentes.
- `piensa: [{paso, texto}]` (1-3) en cualquier tipo: burbujas de pensamiento del agente. `paso` = índice de paso válido del tipo (mismos límites que el guion, ver abajo; sin dos burbujas en el mismo paso). `texto`: primera persona, máx 10 palabras, con un ejemplo concreto del caso de el usuario («Leo los commits de Expansión de esta semana»), sin cifras inventadas ni «%». Cada pick escribe las suyas: nada de fórmulas repetidas entre picks.

Anclas (paso, fila, nodo, col, item) en base 0. En maqueta y lupa las llamadas se llaman `rotulos` y `hallazgos`. Número de pasos animables por tipo: ventana 5, calles 6, hub 6, capas 5, tabla 6, grupos 3, ciclo 6, escritorio 5, fabrica 6, frontera 4, maqueta 5, lupa 6; el `paso` del guion no puede pasar de ahí.

## Guion del vídeo (solo picks completos)
`"guion": [{"titulo", "say", "paso"}]`: 5-7 beats.
- El beat 0 presenta el primer quick win: qué ganas esta semana, en qué proyecto, de qué estado pasas a cuál. Nombra su título o su «despues» (build.py exige al menos 2 palabras significativas en común). Lleva `paso` 0.
- Los beats 1.. explican la lámina; `paso` = índice del paso que se revela (0 = contexto), no decreciente. Cada beat revela su paso y los anteriores; la cámara se acerca a esa parte. La lámina explica la `funcion` del pick (qué entra, qué hace, qué sale).
- El último beat termina con el primer paso concreto del quick win.
- `titulo`: obligatorio, 1-4 palabras (sustantivo o acción corta), sin repetirse dentro del guion. Alimenta el índice lateral del vídeo. Beat 0: el título del quick win o «Quick win»; último: «Empieza por» u otra fórmula equivalente, variada entre picks. Ej.: «El índice en árbol», «Cómo razona el lector».
- Ni días de la semana ni momentos del día («viernes», «esta mañana»…): build.py los rechaza. El beat 0 entra por el quick win o la situación, nunca por un día.
- El `say` sigue las reglas de voz de `produccion.md` (20-35 palabras por beat, 120-190 en total) y nombra la pieza que aparece con la misma palabra que su rótulo.

## Glosario
Los términos técnicos de las láminas y del guion se definen en el campo `glosario` del pick (ver `produccion.md`): `[{termino, definicion}]`, 0-4 entradas, definición de 8-20 palabras.
