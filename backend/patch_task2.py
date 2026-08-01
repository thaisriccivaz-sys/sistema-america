
import re
f = r'C:\Users\thais\.gemini\antigravity\brain\bff92257-f303-4aa7-87bc-55539620550c\task.md'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

content = content.replace('- `[/]` 2. Vínculo de Treinamentos na Integração', '- `[x]` 2. Vínculo de Treinamentos na Integração')
content = content.replace('- `[ ]` 2.1 Backend', '- `[x]` 2.1 Backend')
content = content.replace('- `[ ]` 2.2 Frontend', '- `[x]` 2.2 Frontend')
content = content.replace('- `[ ]` 2.3 Backend', '- `[x]` 2.3 Backend')
content = content.replace('- `[ ]` 2.4 Frontend', '- `[x]` 2.4 Frontend')
content = content.replace('- `[ ]` 2.5 Backend', '- `[x]` 2.5 Backend')
content = content.replace('- `[ ]` 2.6 Backend', '- `[x]` 2.6 Backend')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)
