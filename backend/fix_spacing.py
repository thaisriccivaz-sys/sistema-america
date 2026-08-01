# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# Replace double newlines caused by \r\r\n
js = js.replace('\n\n', '\n')

with open(js_file, 'w', encoding='utf-8', newline='') as f:
    f.write(js)
print("Fixed double spacing")
