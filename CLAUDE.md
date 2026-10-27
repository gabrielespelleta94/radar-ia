# radar-ia

Radar diario de IA. Una tarea programada ejecuta la skill `.claude/skills/radar-diario` y escribe el resultado en un dashboard (artifact con base de datos).

- Toda la lógica de la edición diaria está en `.claude/skills/radar-diario/SKILL.md`. Las referencias se cargan solo en el paso que las pide.
- El contexto del usuario (proyectos, dolores, restricciones) vive en `references/contexto.md`. Es el único archivo que hay que tocar cuando cambia un proyecto.
- Lo mecánico va en `scripts/`: selección, validación, índice de vistos, preferencias y voz. No lo hagas a mano con el modelo.
- No metas en el repo datos de cliente, cifras reales ni secretos.
