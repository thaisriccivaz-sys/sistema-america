"""
fix_frontend_emprestimo.py
1. Adiciona coluna EMPRÉSTIMO no cabeçalho da tabela
2. Adiciona célula EMPRÉSTIMO nas linhas da tabela
3. Atualiza _pmPreview para passar pdfEmprestimo e paginaEmprestimo
4. Adiciona aviso se arquivo de empréstimo foi enviado mas nenhum CPF foi encontrado
"""
with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

print(f'Arquivo: {len(c)} chars')

# ─────────────────────────────────────────────────────────────────────────────
# 1. Cabeçalho da tabela: adicionar coluna EMPRÉSTIMO entre HOLERITE e SALVO
# ─────────────────────────────────────────────────────────────────────────────
old_thead = (
    '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;">HOLERITE</th>\n'
    '                       <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#16a34a;">SALVO</th>'
)
new_thead = (
    '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#64748b;">HOLERITE</th>\n'
    '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#166534;" title="Documento de Empréstimos associado por CPF">EMPRÉSTIMO</th>\n'
    '                       <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#16a34a;">SALVO</th>'
)
if old_thead in c:
    c = c.replace(old_thead, new_thead, 1)
    print('OK: coluna EMPRÉSTIMO adicionada ao cabeçalho')
else:
    print('FALHA: cabeçalho não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Linha da tabela: adicionar célula EMPRÉSTIMO entre HOLERITE e SALVO
# ─────────────────────────────────────────────────────────────────────────────
old_row = (
    '            <td style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#22c55e;">\n'
    '              ${((item.paginaPagamento && item.paginaPagamento !== \'-\') || item.temPagamento) ? \'OK\' : \'<span style="color:#9ca3af;font-weight:normal">-</span>\'}\n'
    '            </td>\n'
    '            ${celulaSalvo}'
)
new_row = (
    '            <td style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#22c55e;">\n'
    '              ${((item.paginaPagamento && item.paginaPagamento !== \'-\') || item.temPagamento) ? \'OK\' : \'<span style="color:#9ca3af;font-weight:normal">-</span>\'}\n'
    '            </td>\n'
    '            <td style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;">\n'
    '              ${item.paginaEmprestimo ? \'<span style="color:#166534;">OK</span>\' : (item.temEmprestimo ? \'<span style="color:#166534;">✓</span>\' : \'<span style="color:#9ca3af;font-weight:normal">-</span>\')}\n'
    '            </td>\n'
    '            ${celulaSalvo}'
)
if old_row in c:
    c = c.replace(old_row, new_row, 1)
    print('OK: célula EMPRÉSTIMO adicionada às linhas da tabela')
else:
    print('FALHA: linha da tabela não encontrada')

# ─────────────────────────────────────────────────────────────────────────────
# 3. _pmPreview: incluir empréstimo no preview ao vivo
# ─────────────────────────────────────────────────────────────────────────────
old_preview = (
    '            if (item.paginaPagamento && window._pdfDuploBase64.pagamento) {\n'
    '               const i4 = document.createElement(\'input\'); i4.type=\'hidden\'; i4.name=\'pdfPagamento\'; i4.value=window._pdfDuploBase64.pagamento; f.appendChild(i4);\n'
    '               const i5 = document.createElement(\'input\'); i5.type=\'hidden\'; i5.name=\'paginaPagamento\'; i5.value=item.paginaPagamento; f.appendChild(i5);\n'
    '            }\n'
    '            document.body.appendChild(f);\n'
    '            f.submit();\n'
    '            document.body.removeChild(f);\n'
    '            \n'
    '        } else if (item.docId) {'
)
new_preview = (
    '            if (item.paginaPagamento && window._pdfDuploBase64.pagamento) {\n'
    '               const i4 = document.createElement(\'input\'); i4.type=\'hidden\'; i4.name=\'pdfPagamento\'; i4.value=window._pdfDuploBase64.pagamento; f.appendChild(i4);\n'
    '               const i5 = document.createElement(\'input\'); i5.type=\'hidden\'; i5.name=\'paginaPagamento\'; i5.value=item.paginaPagamento; f.appendChild(i5);\n'
    '            }\n'
    '            if (item.paginaEmprestimo && window._pdfDuploBase64 && window._pdfDuploBase64.emprestimo) {\n'
    '               const i6 = document.createElement(\'input\'); i6.type=\'hidden\'; i6.name=\'pdfEmprestimo\'; i6.value=window._pdfDuploBase64.emprestimo; f.appendChild(i6);\n'
    '               const i7 = document.createElement(\'input\'); i7.type=\'hidden\'; i7.name=\'paginaEmprestimo\'; i7.value=item.paginaEmprestimo; f.appendChild(i7);\n'
    '            }\n'
    '            document.body.appendChild(f);\n'
    '            f.submit();\n'
    '            document.body.removeChild(f);\n'
    '            \n'
    '        } else if (item.docId) {'
)
if old_preview in c:
    c = c.replace(old_preview, new_preview, 1)
    print('OK: pdfEmprestimo adicionado ao preview ao vivo')
else:
    print('FALHA: bloco preview não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Aviso se CPF não encontrado no documento de empréstimos
# ─────────────────────────────────────────────────────────────────────────────
# Após processar o resultado, se fileEmpr foi enviado mas nenhum item tem paginaEmprestimo, avisar
old_matches_end = (
    '                if (matches === 0) {\n'
    '                    Swal.fire({ icon:\'warning\', title:\'Nenhuma correspondência\', text:\'Nenhum colaborador foi encontrado nos holerites anexados.\', timer:3000 });\n'
    '                    _pmFiltrar();\n'
    '                    return;\n'
    '                }\n'
)
new_matches_end = (
    '                if (matches === 0) {\n'
    '                    Swal.fire({ icon:\'warning\', title:\'Nenhuma correspondência\', text:\'Nenhum colaborador foi encontrado nos holerites anexados.\', timer:3000 });\n'
    '                    _pmFiltrar();\n'
    '                    return;\n'
    '                }\n'
    '\n'
    '                // Aviso se PDF de empréstimos foi enviado mas nenhum CPF foi identificado\n'
    '                const algumComEmprestimo = data.resultado.some(r => r.paginaEmprestimo);\n'
    '                if (fileEmpr && !algumComEmprestimo) {\n'
    '                    Swal.fire({ icon:\'warning\', title:\'Empréstimos sem match\',\n'
    '                        html: \'O PDF de empréstimos foi anexado, mas <b>nenhum CPF foi encontrado</b> nas páginas do documento.<br><br>Verifique se o CPF está no PDF (formato XXX.XXX.XXX-XX) e se o colaborador tem CPF cadastrado no sistema.\',\n'
    '                        timer: 8000, timerProgressBar: true });\n'
    '                }\n'
)
if old_matches_end in c:
    c = c.replace(old_matches_end, new_matches_end, 1)
    print('OK: aviso de CPF não encontrado adicionado')
else:
    print('FALHA: bloco de matches=0 não encontrado')

with open('frontend/app.js', 'wb') as f:
    f.write(c.encode('utf-8'))
print('app.js salvo.')
