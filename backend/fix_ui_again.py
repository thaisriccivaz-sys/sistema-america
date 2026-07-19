# -*- coding: utf-8 -*-
import re

# 1. Update usuarios.js
js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\usuarios.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

js = js.replace("pagina_nome: 'Materiais'", "pagina_nome: 'Materiais Trein.'")
js = js.replace("pagina_nome: 'Presenças'", "pagina_nome: 'Presença Trein.'")
js = js.replace("pagina_nome: 'Conteúdos (Terapia)'", "pagina_nome: 'Materiais Pales.'")
js = js.replace("pagina_nome: 'Listas (Terapia)'", "pagina_nome: 'Presença Pales.'")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated usuarios.js")

# 2. Revert hiding the breadcrumb bar in index.html
html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

html = html.replace('<div id="breadcrumb-bar" style="display:none !important;"', '<div id="breadcrumb-bar"')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)

print("Reverted bottom bar visibility.")
