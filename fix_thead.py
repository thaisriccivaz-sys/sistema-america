with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Inserir coluna EMPRÉSTIMO após HOLERITE e antes de SALVO
# O arquivo usa > ao invés de >, então vamos usar as strings reais
search = 'HOLERITE</th>\n                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#16a34a;">SALVO</th>'
replacement = (
    'HOLERITE</th>\n'
    '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#166534;" title="Documento de Empr\u00e9stimos associado por CPF">EMPR\u00c9STIMO</th>\n'
    '                      <th style="padding:0.5rem 0.75rem;text-align:center;font-size:0.75rem;font-weight:700;color:#16a34a;">SALVO</th>'
)

count = c.count(search)
print(f'Ocorrencias: {count}')
if count == 1:
    c = c.replace(search, replacement, 1)
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: coluna EMPR\u00c9STIMO adicionada ao cabe\u00e7alho')
else:
    # Tentar com CRLF
    search2 = search.replace('\n', '\r\n')
    count2 = c.count(search2)
    print(f'Ocorrencias CRLF: {count2}')
    if count2 >= 1:
        replacement2 = replacement.replace('\n', '\r\n')
        c = c.replace(search2, replacement2, 1)
        with open('frontend/app.js', 'wb') as f:
            f.write(c.encode('utf-8'))
        print('OK: coluna EMPR\u00c9STIMO adicionada (CRLF)')
    else:
        idx = c.find('HOLERITE</th>')
        print(repr(c[idx:idx+200]))
