"""
fix_app_ui.py - Adiciona o input de empréstimo ao HTML do app.js
O arquivo tem unicode escapes e indentação diferente do esperado, então
vamos usar a string exata encontrada no output anterior.
"""
with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# A string exata encontrada no output anterior (com unicode escapes)
target = (
    '<div style="margin-bottom:1.5rem;">\r\n'
    '                  <label style="font-size:0.8rem;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Holerite Sal\u00e1rio/Pagamento (PDF \u00danico)</label>\r\n'
    '                  <input id="pm-file-pagamento" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">\r\n'
    '                </div>\r\n'
    '\r\n'
    '                <button type="button"'
)

replacement = (
    '<div style="margin-bottom:1.5rem;">\r\n'
    '                  <label style="font-size:0.8rem;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Holerite Sal\u00e1rio/Pagamento (PDF \u00danico)</label>\r\n'
    '                  <input id="pm-file-pagamento" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">\r\n'
    '                </div>\r\n'
    '\r\n'
    '                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">\r\n'
    '                  <label style="font-size:0.8rem;font-weight:600;color:#166534;display:block;margin-bottom:4px;">\r\n'
    '                    \U0001f4ce Documentos de Empr\u00e9stimos (PDF \u00danico)\r\n'
    '                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> \u2014 opcional, associado por CPF</span>\r\n'
    '                  </label>\r\n'
    '                  <input id="pm-file-emprestimo" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #86efac;border-radius:6px;background:#fff;">\r\n'
    '                </div>\r\n'
    '\r\n'
    '                <button type="button"'
)

if target in c:
    c = c.replace(target, replacement, 1)
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: input de emprestimo adicionado ao HTML')
else:
    print('FALHA - tentando sem CRLF final')
    # Tentar apenas o bloco sem botão
    target2 = (
        '<div style="margin-bottom:1.5rem;">\r\n'
        '                  <label style="font-size:0.8rem;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Holerite Sal\u00e1rio/Pagamento (PDF \u00danico)</label>\r\n'
        '                  <input id="pm-file-pagamento" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">\r\n'
        '                </div>'
    )
    idx = c.find(target2)
    print(f'target2 encontrado em: {idx}')
    if idx > 0:
        after = c[idx + len(target2):idx + len(target2) + 50]
        print('Após target2:', repr(after))
