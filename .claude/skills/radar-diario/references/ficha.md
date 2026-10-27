# Ficha corta (picks 6-10: tarjeta sin vídeo)

Escribe `$W/contenido/<id>.json` solo con:
- funcion (obligatoria): una frase «Entra X → hace Y → sale Z», máx 25 palabras, con lo que hace exactamente.
- quickwins (obligatoria): 1-2 objetos `{titulo (máx 6 palabras), proyecto (de contexto.md o «Estudio LLM»), esfuerzo ("1 h" | "medio día" | "1-2 días"), antes (máx 10 palabras), despues (máx 10), paso (primer paso literal, máx 60 caracteres)}`. Algo que el usuario puede hacer esta semana, sin cifras inventadas; dos solo si son de proyectos distintos.
- licencia (obligatoria): `{tipo, nombre, nota, pago}`, mismas reglas que en `produccion.md` (tipo: libre | condiciones | pago | desconocida).
- kind (exactamente uno de: Skill, Plugin, Mod, Agente, Multi-agente, MCP server, CLI, Librería, Framework, App, Plantilla, Guía, Modelo, Space, Concepto, Novedad) y tldr (máx 12 palabras).
- myday: 1 frase con la situación concreta en la que tiene impacto (proyecto + tarea + qué duele o qué gana), sin días ni horas.
- flow: 3 nodos `{kind, label}`.
- idea: 1-2 frases. why: 2-3 frases.
- apply: 2-3 pasos concretos.
- fit (1-2), effort, risk (1 frase), category.

- lamina (opcional): el dibujo del report, formato en `laminas.md`. Recomendada `tabla` o `capas`, que son compactas. Si la pones, se valida.
- glosario: `[{termino, definicion}]`, 0-4 entradas; mismas reglas que en `produccion.md`.

Sin guion ni demo: no salen en el vídeo, solo como tarjeta en el dashboard.
