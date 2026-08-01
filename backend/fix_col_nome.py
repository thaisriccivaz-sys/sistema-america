
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix: usuarios table has 'nome' column, not 'nome_completo'
# Replace only within the integration module section (after the marker)
marker = 'MÓDULO: INTEGRAÇÃO DE COLABORADORES'
assert marker in content, 'Marker not found!'

before = content[:content.index(marker)]
after_raw = content[content.index(marker):]

# Within the integration module, replace u.nome_completo with u.nome
fixed = after_raw.replace('u.nome_completo as responsavel_nome', 'u.nome as responsavel_nome')
fixed = fixed.replace('u.nome_completo as responsavel_email', 'u.nome as responsavel_email')

count = after_raw.count('u.nome_completo as responsavel_nome')
print(f'Replacements made: {count}')

content = before + fixed

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print('Done. Verifying...')
remaining = content.count('u.nome_completo as responsavel_nome')
print(f'Remaining occurrences: {remaining}')
