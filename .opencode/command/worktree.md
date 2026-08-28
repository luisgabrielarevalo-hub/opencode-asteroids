---
description: Crea un worktree de git basado en el argumento recibido.
agent: build
---

Recibiste el siguiente argumento del usuario para nombrar el worktree:
"$ARGUMENTS"

Analiza el argumento y genera un nombre de worktree corto con estas reglas:
- Convierte el texto a minúsculas.
- Reemplaza los espacios y cualquier carácter no alfanumérico (excepto guiones) por un guion (`-`).
- Colapsa guiones consecutivos en uno solo.
- Elimina guiones al inicio y al final.
- Recorta el resultado a un máximo de 15 caracteres.
- Si al recortar queda un guion al final, elimínalo.

Luego ejecuta exactamente este comando, sustituyendo <nombre> por el nombre generado:

git worktree add .worktrees/<nombre>

No hagas nada más: solo ejecuta ese comando.
