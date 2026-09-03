with open('backend/pagamentos_massa.js', 'rb') as f:
    c = f.read().decode('utf-8')

old_sig = 'async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath, temAdiantamento, temPagamento, temEmprestimo }) {'
new_sig = 'async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath, temAdiantamento, temPagamento, temEmprestimo, temComunicacao }) {'
c = c.replace(old_sig, new_sig)

old_insert = """            `INSERT INTO documentos
             (colaborador_id, tab_name, document_type, file_path, file_name, year, month, assinafy_status, upload_date, tem_adiantamento, tem_pagamento, tem_emprestimo)
             VALUES (?, 'Pagamentos', ?, ?, ?, ?, ?, 'Pendente', datetime('now'), ?, ?, ?)`,\r
            [colaboradorId, tipoDocumento, filePath, nomeArquivo, ano, mes || '', temAdiantamento ? 1 : 0, temPagamento ? 1 : 0, temEmprestimo ? 1 : 0],"""

new_insert = """            `INSERT INTO documentos
             (colaborador_id, tab_name, document_type, file_path, file_name, year, month, assinafy_status, upload_date, tem_adiantamento, tem_pagamento, tem_emprestimo, tem_comunicacao)
             VALUES (?, 'Pagamentos', ?, ?, ?, ?, ?, 'Pendente', datetime('now'), ?, ?, ?, ?)`,\r
            [colaboradorId, tipoDocumento, filePath, nomeArquivo, ano, mes || '', temAdiantamento ? 1 : 0, temPagamento ? 1 : 0, temEmprestimo ? 1 : 0, temComunicacao ? 1 : 0],"""

c = c.replace(old_insert, new_insert)

with open('backend/pagamentos_massa.js', 'wb') as f:
    f.write(c.encode('utf-8'))
print('backend/pagamentos_massa.js updated')
