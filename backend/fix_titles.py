# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# Replace the titles
js = js.replace("textContent = 'Materiais Pales.'", "textContent = 'Materiais de Palestras'")
js = js.replace("textContent = 'Materiais Trein.'", "textContent = 'Materiais de Treinamento'")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated treinamento.js titles")
