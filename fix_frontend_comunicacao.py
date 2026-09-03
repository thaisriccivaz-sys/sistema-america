with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# 1. Add Input Field
old_input = """                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                  <label style="font-size:0.8rem;font-weight:600;color:#166534;display:block;margin-bottom:4px;">
                    \uD83D\uDCCE Documentos de Empréstimos (PDF Único)
                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> — opcional, associado por CPF do colaborador</span>
                  </label>
                  <input id="pm-file-emprestimo" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #86efac;border-radius:6px;background:#fff;">
                </div>"""
new_input = """                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                  <label style="font-size:0.8rem;font-weight:600;color:#166534;display:block;margin-bottom:4px;">
                    \uD83D\uDCCE Documentos de Empréstimos (PDF Único)
                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> — opcional, associado por CPF do colaborador</span>
                  </label>
                  <input id="pm-file-emprestimo" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #86efac;border-radius:6px;background:#fff;">
                </div>

                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
                  <label style="font-size:0.8rem;font-weight:600;color:#334155;display:block;margin-bottom:4px;">
                    \uD83D\uDCE4 Comunicação (PDF Único)
                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> — opcional, enviado igual para todos, anexado no final</span>
                  </label>
                  <input id="pm-file-comunicacao" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">
                </div>"""
c = c.replace(old_input, new_input)

# 2. Add Table Column (Header)
old_th = '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#166534;" title="Documento de Empréstimos associado por CPF">EMPRÉSTIMO</th>'
new_th = '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#166534;" title="Documento de Empréstimos associado por CPF">EMPRÉSTIMO</th>\n                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#475569;" title="Documento genérico enviado a todos">COMUNICAÇÃO</th>'
c = c.replace(old_th, new_th)

# 3. Add Table Column (Cell)
# First we need to inject temComAoVivo in the render scope
old_render_start = "    function _pmRenderTabela() {"
new_render_start = "    function _pmRenderTabela() {\n        const temComAoVivo = !!(window._pdfDuploBase64 && window._pdfDuploBase64.comunicacao);"
c = c.replace(old_render_start, new_render_start)

old_td = """            <td style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;">
              ${item.paginaEmprestimo ? '<span style="color:#166534;">OK</span>' : (item.temEmprestimo ? '<span style="color:#166534;">✓</span>' : '<span style="color:#9ca3af;font-weight:normal">-</span>')}
            </td>"""
new_td = """            <td style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;">
              ${item.paginaEmprestimo ? '<span style="color:#166534;">OK</span>' : (item.temEmprestimo ? '<span style="color:#166534;">✓</span>' : '<span style="color:#9ca3af;font-weight:normal">-</span>')}
            </td>
            <td style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;">
              ${temComAoVivo ? '<span style="color:#475569;">OK</span>' : (item.temComunicacao ? '<span style="color:#475569;">✓</span>' : '<span style="color:#9ca3af;font-weight:normal">-</span>')}
            </td>"""
c = c.replace(old_td, new_td)

# 4. _pmProcessarDuplo
old_read = "        const fileEmpr = document.getElementById('pm-file-emprestimo')?.files[0];"
new_read = "        const fileEmpr = document.getElementById('pm-file-emprestimo')?.files[0];\n        const fileCom = document.getElementById('pm-file-comunicacao')?.files[0];"
c = c.replace(old_read, new_read)

old_b64 = "        const b64Empr = fileEmpr ? await readB64(fileEmpr) : null;"
new_b64 = "        const b64Empr = fileEmpr ? await readB64(fileEmpr) : null;\n        const b64Com = fileCom ? await readB64(fileCom) : null;"
c = c.replace(old_b64, new_b64)

old_pdfDuplo = "        window._pdfDuploBase64 = { adiantamento: b64Ad, pagamento: b64Pg, emprestimo: b64Empr };"
new_pdfDuplo = "        window._pdfDuploBase64 = { adiantamento: b64Ad, pagamento: b64Pg, emprestimo: b64Empr, comunicacao: b64Com };"
c = c.replace(old_pdfDuplo, new_pdfDuplo)

# Notice: fileCom doesn't need to go to FormData because the backend /processar doesn't do anything with it!
# Wait, we should probably send it if the user only attached fileCom and no other files?
# The user shouldn't just attach fileCom to /processar, it's generic. But the prompt checks:
# if (!fileAd && !filePg) ... "Anexe pelo menos um holerite..."
# This is correct. You can't process ONLY a communication. You must have holerites to associate.
# But wait, what if they just want to send a communication to everyone?
# This screen is "Docs em Massa" for "Pagamentos". It's fine to require holerites.

# 5. _pmPreview
old_prev = """            if (item.paginaEmprestimo && window._pdfDuploBase64 && window._pdfDuploBase64.emprestimo) {
               const i6 = document.createElement('input'); i6.type='hidden'; i6.name='pdfEmprestimo'; i6.value=window._pdfDuploBase64.emprestimo; f.appendChild(i6);
               const i7 = document.createElement('input'); i7.type='hidden'; i7.name='paginaEmprestimo'; i7.value=item.paginaEmprestimo; f.appendChild(i7);
            }
            document.body.appendChild(f);"""
new_prev = """            if (item.paginaEmprestimo && window._pdfDuploBase64 && window._pdfDuploBase64.emprestimo) {
               const i6 = document.createElement('input'); i6.type='hidden'; i6.name='pdfEmprestimo'; i6.value=window._pdfDuploBase64.emprestimo; f.appendChild(i6);
               const i7 = document.createElement('input'); i7.type='hidden'; i7.name='paginaEmprestimo'; i7.value=item.paginaEmprestimo; f.appendChild(i7);
            }
            if (window._pdfDuploBase64 && window._pdfDuploBase64.comunicacao) {
               const i8 = document.createElement('input'); i8.type='hidden'; i8.name='pdfComunicacao'; i8.value=window._pdfDuploBase64.comunicacao; f.appendChild(i8);
            }
            document.body.appendChild(f);"""
c = c.replace(old_prev, new_prev)

with open('frontend/app.js', 'wb') as f:
    f.write(c.encode('utf-8'))
print('frontend/app.js updated')
