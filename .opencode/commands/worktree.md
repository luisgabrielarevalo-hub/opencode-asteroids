---
description: Crea un git worktree en .worktrees/ con nombre ultra-resumido
agent: build
---
Recibes un solo argumento: $ARGUMENTS.

Tu ÚNICA tarea es ejecutar vía herramienta bash este comando:

git worktree add .worktrees/<nombre>

Reglas para derivar <nombre> del argumento (ultra-resumido):
1. Minúsculas, sin acentos (á→a, é→e, í→i, ó→o, ú→u, ü→u, ñ→n).
2. Elimina palabras vacías/comunes en ES+EN: agregar, crear, añadir, nuevo, nueva, hacer, fix, feat, feature, tarea, task, de, la, el, los, las, con, para, en, y, a, the, a, an, with, and, to, for, on.
3. Quédate con máx. 2-3 palabras clave, en el orden original.
4. Une con guiones: espacios/_ → `-`; conserva solo `[a-z0-9-]`; colapsa `--` → `-`; recorta guiones extremos.
5. Trunca a máx. 30 caracteres (corta en límite de palabra con guion si es posible).
6. Si el resultado queda vacío, usa `worktree`.
7. Ejemplo: `Agregar login con OAuth` → `login-oauth`.

Restricciones estrictas:
- NO hagas nada más: no leas, edites, crees ni analices otros archivos; no ejecutes tests/lint/build; no hagas checkout, commit ni push.
- Ejecuta el comando exactamente una vez.
- Si git responde `already exists`, informa `Ya existe .worktrees/<nombre>` y termina sin reintentar ni proponer alternativas.
- Si `$ARGUMENTS` viene vacío, pide el argumento y termina sin ejecutar nada.
