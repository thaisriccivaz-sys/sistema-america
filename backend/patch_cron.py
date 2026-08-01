
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix the bug in verificarDesempenhosPendentes SQL query
regex_cron = r"(WHERE c\.status = 'Ativo') AND \(c\.nao_admitido IS NULL OR c\.nao_admitido = 0\)"
replacement_cron = r"\1"
content = re.sub(regex_cron, replacement_cron, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched backend/server.js")
