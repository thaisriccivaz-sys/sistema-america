
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix encoding
regex_enc = r'situa\?\?\?\?o (.*?)\?\?\?'
replacement_enc = r'situação \1—'
content = re.sub(regex_enc, replacement_enc, content)

# Fix isAdmin
regex_admin = r"const isAdmin = req\.user && \(req\.user\.role === 'admin' \|\| req\.user\.nivel_acesso === 'admin'\);"
replacement_admin = r"const isAdmin = req.user && (req.user.role === 'admin' || req.user.nivel_acesso === 'admin' || (req.user.username && req.user.username.toLowerCase() === 'thais.ricci'));"
content = re.sub(regex_admin, replacement_admin, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched backend/server.js")
