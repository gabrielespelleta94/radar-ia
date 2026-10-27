# Producción de un pick COMPLETO (vídeo)

Escribe `$W/contenido/<id>.json` con estos campos (los factuales, como name, url o stars, los añade build.py). Referencia de nivel: el doc `mattpocock__skills` del dashboard.

Campos obligatorios (build.py rechaza el pick si falta uno): `funcion, quickwins, licencia, myday, lamina, guion, demo, kind, tldr, flow, idea, why, apply, fit, effort, risk, category`. `before` y `after` son opcionales.
`kind` debe ser exactamente uno de: Skill, Plugin, Mod, Agente, Multi-agente, MCP server, CLI, Librería, Framework, App, Plantilla, Guía, Modelo, Space, Concepto, Novedad.

## Licencia
- `licencia` (obligatoria): `{tipo, nombre, nota, pago}`. Sale de la licencia real (la API de GitHub o de Hugging Face y el README), nunca de memoria.
  - `tipo`: `libre` (código o pesos abiertos con licencia permisiva: MIT, Apache-2.0, BSD; uso comercial sin trabas), `condiciones` (gratis pero con límites: licencia propia del modelo, no comercial, copyleft fuerte como GPL/AGPL, acceso con registro, tope de usuarios), `pago` (hace falta pagar para usarlo de verdad: plan, suscripción o API sin capa gratuita), `desconocida` (no aparece la licencia; dilo también en `risk`).
  - `nombre`: tal cual, «MIT», «Apache-2.0», «Qwen License», «Sin licencia publicada».
  - `nota`: máx 15 palabras con la condición que importa al usuario (uso comercial, datos que salen, registro). Vacía si es `libre` sin más.
  - `pago`: máx 12 palabras si algo se paga aparte aunque la herramienta sea gratis (p. ej. «el modelo que conectes se paga por uso»). Vacío si nada.

## Función y quick wins
En una `Novedad` de mercado, el quick win es lo que el usuario puede hacer esta semana con un cliente: una demo corta, una nota para preventa o una prueba en un tenant de pruebas. `proyecto` es el cliente o la línea de negocio, nunca un dato confidencial.
Es lo primero que escribes y lo que más pesa del pick.
- `funcion`: una frase «Entra X → hace Y → sale Z», máx 25 palabras, con exactamente lo que hace la herramienta. Sin adjetivos.
- `quickwins`: 2-3 objetos `{titulo, proyecto, esfuerzo, antes, despues, paso}`.
  - Un quick win es algo que el usuario puede hacer ESTA SEMANA en un proyecto real de `contexto.md`. Si no cabe en una semana, no lo es.
  - titulo: máx 6 palabras. proyecto: uno de los de `contexto.md` o «Estudio LLM». esfuerzo: "1 h" | "medio día" | "1-2 días".
  - antes y despues: máx 10 palabras cada uno, honestos y sin cifras inventadas ni % ni horas ahorradas.
  - paso: el primer paso literal, que se pueda copiar (comando o acción), máx 60 caracteres.
  - Varios quick wins solo si son de proyectos o usos distintos. Si solo hay uno bueno, escribe dos distintos o revisa si el pick merece ser completo.

## myday
1-2 frases: la situación concreta con impacto, es decir proyecto + tarea real (lista en contexto.md) + qué duele o qué se gana. Sin días de la semana ni momentos del día (build.py los rechaza). Ej.: «Al incorporar a un desarrollador al repo de Expansión, el contexto no escrito se pierde en preguntas».

## lamina
La lámina es el dibujo que se construye en el vídeo y se pinta en el report. Formato, tipos, rangos y anclas de llamadas: `laminas.md`. Elige el tipo que haga entender QUÉ ES cada pieza en su caso y varíalo entre picks.
- Textos cortos: títulos de llamada de hasta 5 palabras, textos de hasta 18. Sin cifras inventadas.
- `piensa`: 1-3 burbujas `{paso, texto}` con lo que el agente razona en SU caso, como antes hacía `thinks`: primera persona, máx 10 palabras, un detalle concreto (proyecto, fichero, tabla), sin cifras ni fórmulas repetidas entre picks. Marca con `agente: true` la pieza que es el agente donde el tipo lo admite (calles, hub, ciclo). Reglas en `laminas.md`.
- AGÉNTICO: un agente que razona o actúa se nombra como agente; los comandos, scripts y hooks, como pieza. Muestra qué lee, qué decide, qué entrega y dónde valida el usuario.
- Narrativa: lo primero es la escena de SU día; lo intermedio, el mecanismo paso a paso en su caso; lo último, el resultado y el primer paso concreto. En los niveles 3-4, explica el CONCEPTO (qué es un knowledge graph, un embedding…) con su caso.

## guion
`"guion": [{"titulo", "say", "paso"}]`: 5-7 beats. `paso` = índice del paso de la lámina que se revela (0 = contexto); es entero, no baja y el primero es 0.
- El beat 0 presenta el primer quick win (qué ganas esta semana, en qué proyecto, de qué estado a cuál), con su título o su «despues» a la vista, y entra por el quick win o la situación, nunca por un día. Los beats 1.. explican la lámina con sus pasos. El último termina con el primer paso concreto.
- `titulo`: 1-4 palabras por beat, sin repetir en el guion; el beat 0 usa el título del quick win o «Quick win»; el último, «Empieza por» u otra fórmula equivalente, variada. Se usa en el índice lateral del vídeo.
- say = guion HABLADO, 20-35 palabras por beat y 120-190 en total, segunda persona, frases cortas y variadas (alguna pregunta; exclamaciones, como mucho una por guion), sin URLs, markdown ni símbolos, números como se dicen y siglas como se pronuncian. Sin días de la semana ni «esta mañana/tarde/noche».
- SINCRONÍA VOZ-OBJETO: cada pieza aparece cuando la voz la pronuncia. En el say del beat donde aparece, nómbrala con la misma palabra que su rótulo en la lámina.
- Compatibilidad: `scene3d` (nodes, edges, beats) sigue aceptada si viene, pero ya no es obligatoria.

## demo
Ver demos.md. Obligatoria en los picks completos.

## glosario
`glosario: [{termino, definicion}]`, 0-4 entradas, en completos y fichas. `termino` tal como aparece en el texto («embeddings», «MCP», «knowledge graph», «RAG», «evals»); `definicion` de 8-20 palabras, llana, sin otro tecnicismo sin explicar y, si ayuda, ligada a su caso. Es obligatorio definir todo término de «TÉRMINOS QUE NO SE TRADUCEN» (contexto.md) que aparezca en tldr, funcion, quickwins, myday, guion o lámina, salvo los que el usuario domina (los términos de su stack que ya domina (ver contexto.md)). build.py da error si falta uno.

## Tarjeta
- kind (ver cascada.md); tldr (máx 12 palabras, verbo + resultado).
- flow: 3-5 nodos `{kind, label}` con kind ∈ input/process/output/you y label de máx 4 palabras.
- before / after: máx 8 palabras cada uno. Omítelos si no puedes estimarlos honestamente.

## Detalle
- idea: 1-2 frases.
- why: 4-6 frases (proyecto o aprendizaje, nivel, dolor si aplica, qué gana y qué sustituye).
- apply: 3-5 pasos concretos con su stack y sus restricciones.
- fit: 1-3 de "Onboarding / equipos", "Documentación", "Actas y status", "Ofertas y estimaciones", "Seguimiento vs vendido", "Claude Code / skills", "Apps de datos", "Fabric y mercado", "EPM / planning", "React / TypeScript", "LLM engineering", "IA general".
- effort: "1 h" | "medio día" | "1-2 días" | "proyecto".
- risk: 1 frase. category: 2-4 palabras.
