# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Replace class="submenu-item" with class="nav-item" in the whole file
html = html.replace('class="submenu-item"', 'class="nav-item"')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed submenu classes.")
