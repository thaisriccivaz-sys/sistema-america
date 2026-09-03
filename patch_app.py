"""
patch_app.py - mudanças no frontend/app.js para suporte a Documentos de Empréstimos
"""
with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8').replace('\r\n', '\n')

print(f'Arquivo: {len(c)} chars')

# ─────────────────────────────────────────────────────────────────────────────
# 1. UI: Adicionar input de empréstimo após o input de pagamento
# ─────────────────────────────────────────────────────────────────────────────
old_ui = (
    '                <div style="margin-bottom:1.5rem;">\n'
    '                   <label style="font-size:0.8rem;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Holerite Sal\\u00e1rio/Pagamento (PDF \\u00danico)</label>\n'
    '                   <input id="pm-file-pagamento" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">\n'
    '                 </div>\n'
)
new_ui = (
    '                <div style="margin-bottom:1.5rem;">\n'
    '                   <label style="font-size:0.8rem;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Holerite Sal\\u00e1rio/Pagamento (PDF \\u00danico)</label>\n'
    '                   <input id="pm-file-pagamento" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">\n'
    '                 </div>\n'
    '\n'
    '                 <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">\n'
    '                   <label style="font-size:0.8rem;font-weight:600;color:#166534;display:block;margin-bottom:4px;">\n'
    '                     \\uD83D\\uDCCE Documentos de Empr\\u00e9stimos (PDF \\u00danico)\n'
    '                     <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> \\u2014 opcional, associado por CPF</span>\n'
    '                   </label>\n'
    '                   <input id="pm-file-emprestimo" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #86efac;border-radius:6px;background:#fff;">\n'
    '                 </div>\n'
    '\n'
)
if old_ui in c:
    c = c.replace(old_ui, new_ui, 1)
    print('OK: input de empréstimo adicionado ao HTML')
else:
    print('FALHA: bloco HTML do pagamento nao encontrado — tentando pesquisa alternativa')
    idx = c.find('pm-file-pagamento')
    print(repr(c[max(0,idx-200):idx+200]))

# ─────────────────────────────────────────────────────────────────────────────
# 2. _pmProcessarDuplo: ler arquivo de empréstimo
# ─────────────────────────────────────────────────────────────────────────────
old_read = (
    '        const fileAd = document.getElementById(\'pm-file-adiantamento\')?.files[0];\n'
    '        const filePg = document.getElementById(\'pm-file-pagamento\')?.files[0];\n'
)
new_read = (
    '        const fileAd = document.getElementById(\'pm-file-adiantamento\')?.files[0];\n'
    '        const filePg = document.getElementById(\'pm-file-pagamento\')?.files[0];\n'
    '        const fileEmpr = document.getElementById(\'pm-file-emprestimo\')?.files[0];\n'
)
if old_read in c:
    c = c.replace(old_read, new_read, 1)
    print('OK: fileEmpr adicionado ao _pmProcessarDuplo')
else:
    print('FALHA: bloco fileAd/filePg nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 3. _pmProcessarDuplo: incluir b64Empr e atualizar _pdfDuploBase64
# ─────────────────────────────────────────────────────────────────────────────
old_b64 = (
    '        const b64Ad = await readB64(fileAd);\n'
    '        const b64Pg = await readB64(filePg);\n'
    '\n'
    '        window._pdfDuploBase64 = { adiantamento: b64Ad, pagamento: b64Pg };\n'
)
new_b64 = (
    '        const b64Ad = await readB64(fileAd);\n'
    '        const b64Pg = await readB64(filePg);\n'
    '        const b64Empr = await readB64(fileEmpr);\n'
    '\n'
    '        window._pdfDuploBase64 = { adiantamento: b64Ad, pagamento: b64Pg, emprestimo: b64Empr };\n'
)
if old_b64 in c:
    c = c.replace(old_b64, new_b64, 1)
    print('OK: b64Empr e _pdfDuploBase64 atualizados')
else:
    print('FALHA: bloco b64Ad/b64Pg nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 4. _pmProcessarDuplo: adicionar pdfEmprestimo ao FormData
# ─────────────────────────────────────────────────────────────────────────────
old_fd = (
    '            if (fileAd) formData.append(\'pdfAdiantamento\', fileAd);\n'
    '            if (filePg) formData.append(\'pdfPagamento\', filePg);\n'
)
new_fd = (
    '            if (fileAd) formData.append(\'pdfAdiantamento\', fileAd);\n'
    '            if (filePg) formData.append(\'pdfPagamento\', filePg);\n'
    '            if (fileEmpr) formData.append(\'pdfEmprestimo\', fileEmpr);\n'
)
if old_fd in c:
    c = c.replace(old_fd, new_fd, 1)
    print('OK: pdfEmprestimo adicionado ao FormData')
else:
    print('FALHA: bloco FormData nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 5. _pmProcessarDuplo: salvar paginaEmprestimo no item
# ─────────────────────────────────────────────────────────────────────────────
old_page = (
    '                        item.paginaAdiantamento = res.paginaAdiantamento;\n'
    '                        item.paginaPagamento = res.paginaPagamento;\n'
    '                        matches++;\n'
)
new_page = (
    '                        item.paginaAdiantamento = res.paginaAdiantamento;\n'
    '                        item.paginaPagamento = res.paginaPagamento;\n'
    '                        item.paginaEmprestimo = res.paginaEmprestimo || null;\n'
    '                        matches++;\n'
)
if old_page in c:
    c = c.replace(old_page, new_page, 1)
    print('OK: paginaEmprestimo salvo no item')
else:
    print('FALHA: bloco paginaAdiantamento/paginaPagamento nao encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Array de itens no envio ao /api/pagamentos-massa/enviar: incluir paginaEmprestimo
# ─────────────────────────────────────────────────────────────────────────────
old_itens = (
    '                            pagina: i.pagina,\n'
    '                            paginaAdiantamento: i.paginaAdiantamento,\n'
    '                            paginaPagamento: i.paginaPagamento,\n'
    '                            colaborador_id: i.colaborador_id,\n'
)
new_itens = (
    '                            pagina: i.pagina,\n'
    '                            paginaAdiantamento: i.paginaAdiantamento,\n'
    '                            paginaPagamento: i.paginaPagamento,\n'
    '                            paginaEmprestimo: i.paginaEmprestimo || null,\n'
    '                            colaborador_id: i.colaborador_id,\n'
)
if old_itens in c:
    c = c.replace(old_itens, new_itens, 1)
    print('OK: paginaEmprestimo adicionado ao array de itens (enviar)')
else:
    print('FALHA: array de itens nao encontrado')

with open('frontend/app.js', 'wb') as f:
    f.write(c.encode('utf-8'))
print('Arquivo app.js salvo.')
