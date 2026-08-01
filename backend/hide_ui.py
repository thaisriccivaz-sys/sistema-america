# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Hide bottom bar
html = html.replace('<div id="breadcrumb-bar"', '<div id="breadcrumb-bar" style="display:none !important;"')

# Hide star button
html = html.replace('<button id="btn-star-page"', '<button id="btn-star-page" style="display:none !important;"')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Hidden star and bottom bar.")
