"""
fix_app_ui_final.py - insere o input de empréstimo no app.js usando índices de posição
"""
with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Encontrar a linha com pm-file-pagamento e o botão logo após
# Vamos inserir após o fechamento do div do pagamento e antes do botão
# Sequência exata: </div>\n\n                 <button type="button" onclick="window._pmProcessarDuplo()"

search = '</div>\n\n                 <button type="button" onclick="window._pmProcessarDuplo()"'
replacement = (
    '</div>\n'
    '\n'
    '                 <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">\n'
    '                   <label style="font-size:0.8rem;font-weight:600;color:#166534;display:block;margin-bottom:4px;">\n'
    '                     \U0001f4ce Documentos de Empr\u00e9stimos (PDF \u00danico)\n'
    '                     <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> \u2014 opcional, associado por CPF do colaborador</span>\n'
    '                   </label>\n'
    '                   <input id="pm-file-emprestimo" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #86efac;border-radius:6px;background:#fff;">\n'
    '                 </div>\n'
    '\n'
    '                 <button type="button" onclick="window._pmProcessarDuplo()"'
)

# Verificar quantas vezes aparece (para garantir que pegamos o certo - do bloco de pagamento)
count = c.count(search)
print(f'Ocorrências de search: {count}')

# Verificar se pm-file-emprestimo já existe
if 'pm-file-emprestimo' in c:
    print('pm-file-emprestimo já existe no arquivo - nada a fazer')
elif count == 1:
    c = c.replace(search, replacement, 1)
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: input de empréstimo inserido')
elif count == 0:
    print('FALHA: search não encontrado')
    # Diagnóstico
    idx = c.find('pm-file-pagamento')
    print(f'pm-file-pagamento está em índice {idx}')
    ctx_after = c[idx:idx+300]
    print('Após pm-file-pagamento:', repr(ctx_after))
else:
    # Múltiplas ocorrências - precisamos do contexto correto
    # O correto é o que tem pm-file-pagamento logo antes
    idx_pag = c.find('pm-file-pagamento')
    # Encontrar a próxima ocorrência do search após pm-file-pagamento
    idx_search = c.find(search, idx_pag)
    print(f'Usando ocorrência em índice {idx_search}')
    c = c[:idx_search] + replacement + c[idx_search + len(search):]
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: input de empréstimo inserido (múltiplas ocorrências)')
