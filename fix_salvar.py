with open('backend/pagamentos_massa.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Encontrar onde o salvarDocumentoNoBanco foi cortado
# Está em L329 mas o corpo foi removido. Precisamos substituir do L329 até o fim
# com o conteúdo correto.

# Encontrar o ponto de corte
bad_tail = (
    "    if (docsExistentes.length > 0) {\r\n"
    "        console.log(`[PAGAMENTOS-MASSA] Substituindo ${docsExistentes.length} doc(s) existente(s) para colaborador ${colaboradorId} (${mes}/${ano})`);\r\n"
    "    }\r\n"
    " * Cada p"
)

good_tail = (
    "    if (docsExistentes.length > 0) {\r\n"
    "        console.log(`[PAGAMENTOS-MASSA] Substituindo ${docsExistentes.length} doc(s) existente(s) para colaborador ${colaboradorId} (${mes}/${ano})`);\r\n"
    "    }\r\n"
    "    // ────────────────────────────────────────────────────────────────────────────────────────────\r\n"
    "\r\n"
    "    const filePath = path.join(colabDir, nomeArquivo);\r\n"
    "    fs.writeFileSync(filePath, bufferPDF);\r\n"
    "\r\n"
    "    const docId = await new Promise((resolve, reject) => {\r\n"
    "        db.run(\r\n"
    "            `INSERT INTO documentos\r\n"
    "             (colaborador_id, tab_name, document_type, file_path, file_name, year, month, assinafy_status, upload_date, tem_adiantamento, tem_pagamento, tem_emprestimo)\r\n"
    "             VALUES (?, 'Pagamentos', ?, ?, ?, ?, ?, 'Pendente', datetime('now'), ?, ?, ?)`,\r\n"
    "            [colaboradorId, tipoDocumento, filePath, nomeArquivo, ano, mes || '', temAdiantamento ? 1 : 0, temPagamento ? 1 : 0, temEmprestimo ? 1 : 0],\r\n"
    "            function(err) {\r\n"
    "                if (err) reject(err);\r\n"
    "                else resolve(this.lastID);\r\n"
    "            }\r\n"
    "        );\r\n"
    "    });\r\n"
    "\r\n"
    "    return { docId, filePath };\r\n"
    "}\r\n"
    "\r\n"
    "/**\r\n"
    " * Processa o PDF de Empr\u00e9stimos/Comunicados identificando colaboradores por CPF.\r\n"
    " * Cada p"
)

# Normalizar CRLF
c_n = c.replace('\r\n', '\n')
bad_n = bad_tail.replace('\r\n', '\n')
good_n = good_tail.replace('\r\n', '\n')

if bad_n in c_n:
    c_n = c_n.replace(bad_n, good_n, 1)
    with open('backend/pagamentos_massa.js', 'wb') as f:
        f.write(c_n.encode('utf-8'))
    print('OK: salvarDocumentoNoBanco restaurado com tem_emprestimo')
else:
    print('FALHA: bad_tail nao encontrado')
    idx = c_n.find('if (docsExistentes.length > 0)')
    print(repr(c_n[idx:idx+500]))

# Tambem atualizar a assinatura da funcao para incluir temEmprestimo
with open('backend/pagamentos_massa.js', 'rb') as f:
    c2 = f.read().decode('utf-8')

old_sig = "async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath, temAdiantamento, temPagamento })"
new_sig = "async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath, temAdiantamento, temPagamento, temEmprestimo })"
if old_sig in c2:
    c2 = c2.replace(old_sig, new_sig, 1)
    with open('backend/pagamentos_massa.js', 'wb') as f:
        f.write(c2.encode('utf-8'))
    print('OK: assinatura atualizada com temEmprestimo')
else:
    print('FALHA: assinatura nao encontrada')
