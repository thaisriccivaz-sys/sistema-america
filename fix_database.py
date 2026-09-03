with open('backend/database.js', 'rb') as f:
    c = f.read().decode('utf-8').replace('\r\n', '\n')

bad = (
    "if (!cols.includes('assinafy_status')) db.run(\"ALTER TABLE documentos ADD COLUMN assinafy_status TEXT DEFAULT 'Nenhum'\", (err) => {});\n"
    "                \n"
    "                // Geradores"
)

good = (
    "if (!cols.includes('assinafy_status')) db.run(\"ALTER TABLE documentos ADD COLUMN assinafy_status TEXT DEFAULT 'Nenhum'\", (err) => {});\n"
    "                    if (!cols.includes('assinafy_url')) db.run(\"ALTER TABLE documentos ADD COLUMN assinafy_url TEXT\", (err) => {});\n"
    "                    if (!cols.includes('assinafy_sent_at')) db.run(\"ALTER TABLE documentos ADD COLUMN assinafy_sent_at DATETIME\", (err) => {});\n"
    "                    if (!cols.includes('signed_file_path')) db.run(\"ALTER TABLE documentos ADD COLUMN signed_file_path TEXT\", (err) => {});\n"
    "                    if (!cols.includes('assinafy_signed_at')) db.run(\"ALTER TABLE documentos ADD COLUMN assinafy_signed_at DATETIME\", (err) => {});\n"
    "                    // Campos de periodo do atestado\n"
    "                    if (!cols.includes('atestado_tipo'))  db.run(\"ALTER TABLE documentos ADD COLUMN atestado_tipo TEXT\", (err) => {});\n"
    "                    if (!cols.includes('atestado_inicio')) db.run(\"ALTER TABLE documentos ADD COLUMN atestado_inicio TEXT\", (err) => {});\n"
    "                    if (!cols.includes('atestado_fim'))    db.run(\"ALTER TABLE documentos ADD COLUMN atestado_fim TEXT\", (err) => {});\n"
    "                    // Indicadores se holerite adiantamento/pagamento/emprestimo foram anexados\n"
    "                    if (!cols.includes('tem_adiantamento')) db.run(\"ALTER TABLE documentos ADD COLUMN tem_adiantamento INTEGER DEFAULT 0\", (err) => {});\n"
    "                    if (!cols.includes('tem_pagamento'))    db.run(\"ALTER TABLE documentos ADD COLUMN tem_pagamento INTEGER DEFAULT 0\", (err) => {});\n"
    "                    if (!cols.includes('tem_emprestimo'))   db.run(\"ALTER TABLE documentos ADD COLUMN tem_emprestimo INTEGER DEFAULT 0\", (err) => {});\n"
    "                    if (!cols.includes('boleto_financeiro_enviado_em')) db.run(\"ALTER TABLE documentos ADD COLUMN boleto_financeiro_enviado_em TEXT\", (err) => {});\n"
    "                });\n"
    "                \n"
    "                // Geradores"
)

if bad in c:
    c = c.replace(bad, good, 1)
    with open('backend/database.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: database.js restaurado e tem_emprestimo adicionado')
else:
    print('FALHA: bloco nao encontrado')
    idx = c.find('assinafy_status')
    print(repr(c[idx:idx+300]))
