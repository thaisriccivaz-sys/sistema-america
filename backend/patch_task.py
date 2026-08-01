
import re
f = r'C:\Users\thais\.gemini\antigravity\brain\bff92257-f303-4aa7-87bc-55539620550c\task.md'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

content = content.replace('- `[ ]` 1.1 Backend', '- `[x]` 1.1 Backend')
content = content.replace('- `[ ]` 1.2 Backend', '- `[x]` 1.2 Backend')
content = content.replace('- `[ ]` 1.3 Frontend', '- `[x]` 1.3 Frontend')
content = content.replace('- `[ ]` 1.4 Frontend', '- `[x]` 1.4 Frontend')
content = content.replace('- `[ ]` 1.5 Backend', '- `[x]` 1.5 Backend')
content = content.replace('- `[/]` 1. Responsável por Departamento', '- `[x]` 1. Responsável por Departamento')
content = content.replace('- `[ ]` 2. Vínculo de Treinamentos na Integração', '- `[/]` 2. Vínculo de Treinamentos na Integração')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)
