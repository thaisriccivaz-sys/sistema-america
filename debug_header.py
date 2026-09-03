with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Encontrar o cabeçalho exato
idx = c.find('HOLERITE</th>')
print(f'HOLERITE</th> em: {idx}')
if idx > 0:
    print(repr(c[max(0, idx-50):idx+200]))
