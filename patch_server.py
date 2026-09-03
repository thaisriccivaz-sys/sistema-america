"""
patch_server.py
Aplica as mudanças no backend/server.js para suportar Documentos de Empréstimos:
1. Rota GET pendentes: adicionar d.tem_emprestimo no SELECT e temEmprestimo no resultado
2. Rota POST processar: processar pdfEmprestimo e retornar paginaEmprestimo
3. Rota POST enviar: extrair bufEmpr e fazer merge no bloco normal
4. Bloco forcarAnexar: merge de emprestimo e contagem de paginas
5. Atualizações de UPDATE documentos (tem_emprestimo)
"""

with open('backend/server.js', 'rb') as f:
    c = f.read().decode('utf-8').replace('\r\n', '\n')

print(f'Arquivo: {len(c)} chars')

# ─────────────────────────────────────────────────────────────────────────────
# 1. GET /pendentes: adicionar tem_emprestimo no SELECT e no resultado
# ─────────────────────────────────────────────────────────────────────────────
old1 = "                   d.tem_adiantamento, d.tem_pagamento,\n"
new1 = "                   d.tem_adiantamento, d.tem_pagamento, d.tem_emprestimo,\n"
if old1 in c:
    c = c.replace(old1, new1, 1)
    print('OK: tem_emprestimo adicionado ao SELECT pendentes')
else:
    print('FALHA: SELECT pendentes nao encontrado')

old2 = "            temAdiantamento: r.tem_adiantamento ? true : false,\n            temPagamento:    r.tem_pagamento    ? true : false,\n        }));"
new2 = "            temAdiantamento: r.tem_adiantamento ? true : false,\n            temPagamento:    r.tem_pagamento    ? true : false,\n            temEmprestimo:   r.tem_emprestimo   ? true : false,\n        }));"
if old2 in c:
    c = c.replace(old2, new2, 1)
    print('OK: temEmprestimo adicionado ao resultado pendentes')
else:
    print('FALHA: resultado pendentes nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 2. POST /processar: processar pdfEmprestimo e adicionar paginaEmprestimo
# ─────────────────────────────────────────────────────────────────────────────
old3 = (
    "            if (fileAd) resAd = await pagamentosMassa.processarPDF(fileAd.buffer, 'Holerite Adiantamento');\n"
    "            if (filePg) resPg = await pagamentosMassa.processarPDF(filePg.buffer, 'Holerite Salario');\n"
    "\n"
    "            const colabsMap = {};"
)
new3 = (
    "            if (fileAd) resAd = await pagamentosMassa.processarPDF(fileAd.buffer, 'Holerite Adiantamento');\n"
    "            if (filePg) resPg = await pagamentosMassa.processarPDF(filePg.buffer, 'Holerite Salario');\n"
    "\n"
    "            // Processar PDF de Empréstimos por CPF\n"
    "            const fileEmpr = files.find(f => f.fieldname === 'pdfEmprestimo');\n"
    "            let resEmpr = [];\n"
    "            if (fileEmpr) resEmpr = await pagamentosMassa.processarPDFEmprestimos(fileEmpr.buffer);\n"
    "            // Mapa colabId -> página no PDF de empréstimos\n"
    "            const emprMap = {};\n"
    "            resEmpr.forEach(e => { emprMap[e.colaborador_id] = e.pagina; });\n"
    "\n"
    "            const colabsMap = {};"
)
if old3 in c:
    c = c.replace(old3, new3, 1)
    print('OK: processarPDFEmprestimos adicionado à rota processar')
else:
    print('FALHA: bloco processar não encontrado')

# Adicionar paginaEmprestimo na saida do colabsMap
old4 = "            res.json({ ok: true, resultado: Object.values(colabsMap) });"
new4 = (
    "            // Adicionar paginaEmprestimo a cada colaborador que tiver match\n"
    "            const resultadoFinal = Object.values(colabsMap).map(item => ({\n"
    "                ...item,\n"
    "                paginaEmprestimo: emprMap[item.colaborador_id] || null,\n"
    "            }));\n"
    "            res.json({ ok: true, resultado: resultadoFinal });"
)
if old4 in c:
    c = c.replace(old4, new4, 1)
    print('OK: paginaEmprestimo adicionado ao resultado processar')
else:
    print('FALHA: res.json processar nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 3. POST /enviar: extrair bufEmpr
# ─────────────────────────────────────────────────────────────────────────────
old5 = (
    "    const bufAd = pdfDuploBase64 && pdfDuploBase64.adiantamento ? Buffer.from(pdfDuploBase64.adiantamento, 'base64') : null;\n"
    "    const bufPg = pdfDuploBase64 && pdfDuploBase64.pagamento ? Buffer.from(pdfDuploBase64.pagamento, 'base64') : null;"
)
new5 = (
    "    const bufAd = pdfDuploBase64 && pdfDuploBase64.adiantamento ? Buffer.from(pdfDuploBase64.adiantamento, 'base64') : null;\n"
    "    const bufPg = pdfDuploBase64 && pdfDuploBase64.pagamento ? Buffer.from(pdfDuploBase64.pagamento, 'base64') : null;\n"
    "    const bufEmpr = pdfDuploBase64 && pdfDuploBase64.emprestimo ? Buffer.from(pdfDuploBase64.emprestimo, 'base64') : null;"
)
if old5 in c:
    c = c.replace(old5, new5, 1)
    print('OK: bufEmpr extraído no enviar')
else:
    print('FALHA: bufAd/bufPg nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Bloco forcarAnexar: adicionar merge de empréstimo após pagamento
# ─────────────────────────────────────────────────────────────────────────────
old6 = (
    "                            if (bufPg && item.paginaPagamento) {\n"
    "                                const bufExPg = await pagamentosMassa.extrairPagina(bufPg, item.paginaPagamento, true);\n"
    "                                const pgDoc = await PDFDocument.load(bufExPg);\n"
    "                                const pgPgs = await basePdfDoc.copyPages(pgDoc, pgDoc.getPageIndices());\n"
    "                                pgPgs.forEach(p => basePdfDoc.addPage(p));\n"
    "                                temPgFlag = true;\n"
    "                            }\n"
    "\n"
    "                            const mergedBytes = await basePdfDoc.save();"
)
new6 = (
    "                            if (bufPg && item.paginaPagamento) {\n"
    "                                const bufExPg = await pagamentosMassa.extrairPagina(bufPg, item.paginaPagamento, true);\n"
    "                                const pgDoc = await PDFDocument.load(bufExPg);\n"
    "                                const pgPgs = await basePdfDoc.copyPages(pgDoc, pgDoc.getPageIndices());\n"
    "                                pgPgs.forEach(p => basePdfDoc.addPage(p));\n"
    "                                temPgFlag = true;\n"
    "                            }\n"
    "                            // Empréstimos: anexado por último, sem recorte da metade\n"
    "                            let temEmprFlag = false;\n"
    "                            if (bufEmpr && item.paginaEmprestimo) {\n"
    "                                const bufExEmpr = await pagamentosMassa.extrairPagina(bufEmpr, item.paginaEmprestimo, false);\n"
    "                                const emprDoc = await PDFDocument.load(bufExEmpr);\n"
    "                                const emprPgs = await basePdfDoc.copyPages(emprDoc, emprDoc.getPageIndices());\n"
    "                                emprPgs.forEach(p => basePdfDoc.addPage(p));\n"
    "                                temEmprFlag = true;\n"
    "                            }\n"
    "\n"
    "                            const mergedBytes = await basePdfDoc.save();"
)
if old6 in c:
    c = c.replace(old6, new6, 1)
    print('OK: merge empréstimo adicionado ao bloco forcarAnexar')
else:
    print('FALHA: bloco forcarAnexar (pagamento) nao encontrado')

# Atualizar salvarDocumentoNoBanco no forcarAnexar para incluir temEmprestimo
old7 = (
    "                            const dbRes2 = await pagamentosMassa.salvarDocumentoNoBanco({\n"
    "                                colaboradorId: item.colaborador_id,\n"
    "                                nomeColab: colab?.nome_completo,\n"
    "                                bufferPDF: mergedBytes,\n"
    "                                nomeArquivo: nomeArq2,\n"
    "                                tipoDocumento: tipo,\n"
    "                                ano: anoDoc,\n"
    "                                mes: mesDoc,\n"
    "                                basePath: BASE_UPLOAD_PATH,\n"
    "                                temAdiantamento: temAdFlag,\n"
    "                                temPagamento: temPgFlag,\n"
    "                            });"
)
new7 = (
    "                            const dbRes2 = await pagamentosMassa.salvarDocumentoNoBanco({\n"
    "                                colaboradorId: item.colaborador_id,\n"
    "                                nomeColab: colab?.nome_completo,\n"
    "                                bufferPDF: mergedBytes,\n"
    "                                nomeArquivo: nomeArq2,\n"
    "                                tipoDocumento: tipo,\n"
    "                                ano: anoDoc,\n"
    "                                mes: mesDoc,\n"
    "                                basePath: BASE_UPLOAD_PATH,\n"
    "                                temAdiantamento: temAdFlag,\n"
    "                                temPagamento: temPgFlag,\n"
    "                                temEmprestimo: temEmprFlag,\n"
    "                            });"
)
if old7 in c:
    c = c.replace(old7, new7, 1)
    print('OK: temEmprestimo adicionado ao salvarDocumentoNoBanco (forcarAnexar)')
else:
    print('FALHA: salvarDocumentoNoBanco forcarAnexar nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Bloco forcarAnexar: atualizar paginasHolAnt para incluir tem_emprestimo
# ─────────────────────────────────────────────────────────────────────────────
old8 = "                        const rowOld = await new Promise((res, rej) => db.get('SELECT file_path, tem_adiantamento, tem_pagamento FROM documentos WHERE id = ?', [docId], (e, r) => e ? rej(e) : res(r)));"
new8 = "                        const rowOld = await new Promise((res, rej) => db.get('SELECT file_path, tem_adiantamento, tem_pagamento, tem_emprestimo FROM documentos WHERE id = ?', [docId], (e, r) => e ? rej(e) : res(r)));"
if old8 in c:
    c = c.replace(old8, new8, 1)
    print('OK: SELECT rowOld atualizado (forcarAnexar)')
else:
    print('FALHA: SELECT rowOld forcarAnexar nao encontrado')

old9 = "                                const paginasHolAnt = (rowOld.tem_adiantamento ? 1 : 0) + (rowOld.tem_pagamento ? 1 : 0);"
new9 = "                                const paginasHolAnt = (rowOld.tem_adiantamento ? 1 : 0) + (rowOld.tem_pagamento ? 1 : 0) + (rowOld.tem_emprestimo ? 1 : 0);"
if old9 in c:
    c = c.replace(old9, new9, 1)
    print('OK: paginasHolAnt atualizado (forcarAnexar)')
else:
    print('FALHA: paginasHolAnt forcarAnexar nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Bloco normal (else if tipo===Pagamentos): merge emprestimo após pagamento
# ─────────────────────────────────────────────────────────────────────────────
old10 = (
    "                            if (bufPg && item.paginaPagamento) {\n"
    "                                const bufExtraidaPg = await pagamentosMassa.extrairPagina(bufPg, item.paginaPagamento, true);\n"
    "                                const pgPdfDoc = await PDFDocument.load(bufExtraidaPg);\n"
    "                                const pgPages = await basePdfDoc.copyPages(pgPdfDoc, pgPdfDoc.getPageIndices());\n"
    "                                pgPages.forEach(p => basePdfDoc.addPage(p));\n"
    "                            }\n"
    "\n"
    "                            const mergedPdfBytes = await basePdfDoc.save();\n"
    "                            await fs.writeFile(fullPath, mergedPdfBytes);"
)
new10 = (
    "                            if (bufPg && item.paginaPagamento) {\n"
    "                                const bufExtraidaPg = await pagamentosMassa.extrairPagina(bufPg, item.paginaPagamento, true);\n"
    "                                const pgPdfDoc = await PDFDocument.load(bufExtraidaPg);\n"
    "                                const pgPages = await basePdfDoc.copyPages(pgPdfDoc, pgPdfDoc.getPageIndices());\n"
    "                                pgPages.forEach(p => basePdfDoc.addPage(p));\n"
    "                            }\n"
    "                            // Empréstimos: por último, sem recorte da metade\n"
    "                            let temEmprMerged = false;\n"
    "                            if (bufEmpr && item.paginaEmprestimo) {\n"
    "                                const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, item.paginaEmprestimo, false);\n"
    "                                const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);\n"
    "                                const emprPages = await basePdfDoc.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());\n"
    "                                emprPages.forEach(p => basePdfDoc.addPage(p));\n"
    "                                temEmprMerged = true;\n"
    "                            }\n"
    "\n"
    "                            const mergedPdfBytes = await basePdfDoc.save();\n"
    "                            await fs.writeFile(fullPath, mergedPdfBytes);"
)
if old10 in c:
    c = c.replace(old10, new10, 1)
    print('OK: merge empréstimo adicionado ao bloco normal')
else:
    print('FALHA: bloco normal (pagamento) nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 7. UPDATE documentos no bloco normal: incluir tem_emprestimo
# ─────────────────────────────────────────────────────────────────────────────
old11 = "'UPDATE documentos SET tem_adiantamento = ?, tem_pagamento = ? WHERE id = ?',\n                                [temAd ? 1 : 0, temPg ? 1 : 0, docId]"
new11 = "'UPDATE documentos SET tem_adiantamento = ?, tem_pagamento = ?, tem_emprestimo = ? WHERE id = ?',\n                                [temAd ? 1 : 0, temPg ? 1 : 0, temEmprMerged ? 1 : 0, docId]"
if old11 in c:
    c = c.replace(old11, new11, 1)
    print('OK: UPDATE documentos atualizado com tem_emprestimo (bloco normal)')
else:
    print('FALHA: UPDATE documentos nao encontrado — tentando variação')
    # Tentar encontrar e ver o contexto
    idx = c.find('UPDATE documentos SET tem_adiantamento')
    if idx > 0:
        print(repr(c[idx:idx+200]))

# ─────────────────────────────────────────────────────────────────────────────
# 8. Bloco normal rowBase: incluir tem_emprestimo no SELECT e no calculo
# ─────────────────────────────────────────────────────────────────────────────
old12 = "                    const rowBase = await new Promise((res, rej) => db.get('SELECT file_path, tem_adiantamento, tem_pagamento FROM documentos WHERE id = ?', [docId], (e, r) => e ? rej(e) : res(r)));"
new12 = "                    const rowBase = await new Promise((res, rej) => db.get('SELECT file_path, tem_adiantamento, tem_pagamento, tem_emprestimo FROM documentos WHERE id = ?', [docId], (e, r) => e ? rej(e) : res(r)));"
if old12 in c:
    c = c.replace(old12, new12, 1)
    print('OK: SELECT rowBase atualizado (bloco normal)')
else:
    print('FALHA: SELECT rowBase nao encontrado')

old13 = "                                const paginasHoleriteAnteriores = (rowBase.tem_adiantamento ? 1 : 0) + (rowBase.tem_pagamento ? 1 : 0);"
new13 = "                                const paginasHoleriteAnteriores = (rowBase.tem_adiantamento ? 1 : 0) + (rowBase.tem_pagamento ? 1 : 0) + (rowBase.tem_emprestimo ? 1 : 0);"
if old13 in c:
    c = c.replace(old13, new13, 1)
    print('OK: paginasHoleriteAnteriores atualizado (bloco normal)')
else:
    print('FALHA: paginasHoleriteAnteriores nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 9. salvarDocumentoNoBanco no bloco normal: incluir temEmprestimo
# ─────────────────────────────────────────────────────────────────────────────
old14 = (
    "                    temAdiantamento: !!(item.paginaAdiantamento && bufAd),\n"
    "                    temPagamento:    !!(item.paginaPagamento    && bufPg),\n"
    "                });"
)
new14 = (
    "                    temAdiantamento: !!(item.paginaAdiantamento && bufAd),\n"
    "                    temPagamento:    !!(item.paginaPagamento    && bufPg),\n"
    "                    temEmprestimo:   !!(item.paginaEmprestimo   && bufEmpr),\n"
    "                });"
)
if old14 in c:
    c = c.replace(old14, new14, 1)
    print('OK: temEmprestimo adicionado ao salvarDocumentoNoBanco (bloco novo docId)')
else:
    print('FALHA: salvarDocumentoNoBanco novo doc nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# Salvar
# ─────────────────────────────────────────────────────────────────────────────
with open('backend/server.js', 'wb') as f:
    f.write(c.encode('utf-8'))
print('Arquivo server.js salvo.')
