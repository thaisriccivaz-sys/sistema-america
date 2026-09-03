with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Verificar onde o input HTML do pagamento está
idx_html = c.find('pm-file-pagamento')
print('pm-file-pagamento (HTML template) em:', idx_html)
print(repr(c[max(0, idx_html - 300):idx_html + 400]))
