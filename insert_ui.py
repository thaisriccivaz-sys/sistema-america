with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Inserir o bloco de empréstimo entre o div de pagamento e o button
# Usando os caracteres de escape do HTML que estão no template (\\n, \\t, etc. - não, é um template string literal)
# O arquivo usa template literals com caracteres reais mas o output mostra \n escaped - isso é o repr()
# Os caracteres reais no arquivo são literais \n dentro de template strings JavaScript
# Vamos encontrar exatamente

search_end = ('\u003c/div\u003e\\n\\n                \u003cbutton type=\"button\" onclick=\"window._pmProcessarDuplo()\"')

# Na verdade o arquivo tem os caracteres < > como < > reais mas dentro de template JS
# Vamos ler os bytes e procurar pela sequência exata

# O output mostrou: \\n                \\u003c/div\\u003e\\n\\n                \\u003cbutton
# Isso significa que o arquivo tem literalmente: \n                </div>\n\n                <button
# Os \u003c são apenas o repr() da ferramenta mostrando os chars < > como unicode

search = '</div>\n\n                <button type="button" onclick="window._pmProcessarDuplo()"'

count = c.count(search)
print(f'Ocorrencias: {count}')

if count >= 1:
    # Pegar a ocorrência que está logo após pm-file-pagamento
    idx_pag = c.find('pm-file-pagamento')
    idx_btn = c.find(search, idx_pag)
    print(f'Inserindo após idx: {idx_btn}')
    
    new_block = (
        '</div>\n'
        '\n'
        '                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">\n'
        '                  <label style="font-size:0.8rem;font-weight:600;color:#166534;display:block;margin-bottom:4px;">\n'
        '                    \U0001f4ce Documentos de Empr\u00e9stimos (PDF \u00danico)\n'
        '                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> \u2014 opcional, associado por CPF do colaborador</span>\n'
        '                  </label>\n'
        '                  <input id="pm-file-emprestimo" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #86efac;border-radius:6px;background:#fff;">\n'
        '                </div>\n'
        '\n'
        '                <button type="button" onclick="window._pmProcessarDuplo()"'
    )
    
    c = c[:idx_btn] + new_block + c[idx_btn + len(search):]
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: input de emprestimo HTML inserido')
else:
    print('FALHA: sequencia nao encontrada')
    idx_pag = c.find('pm-file-pagamento')
    print(repr(c[idx_pag:idx_pag+300]))
