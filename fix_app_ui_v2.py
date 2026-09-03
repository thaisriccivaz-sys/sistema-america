"""
fix_app_ui_v2.py - usa o view_file para encontrar a string exata
"""
with open('frontend/app.js', 'rb') as f:
    raw = f.read()

c = raw.decode('utf-8')

# Procurar pelo id exato
idx = c.find('pm-file-pagamento')
print(f'pm-file-pagamento encontrado em índice: {idx}')

# Mostrar bytes ao redor
ctx = c[max(0,idx-400):idx+400]
print('Context (repr):', repr(ctx))
