# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\app.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# Replace the titles
js = js.replace("path: 'Treinamentos → Presença Trein.'", "path: 'Treinamentos → Presença Treinamento'")
js = js.replace("path: 'Treinamentos → Presença Pales.'", "path: 'Treinamentos → Presença Palestras'")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated app.js breadcrumb paths")
