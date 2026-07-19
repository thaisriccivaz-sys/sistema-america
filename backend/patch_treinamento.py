# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the H1 title text
js = js.replace("if (h1) h1.textContent = 'Materiais para Palestras';", "if (h1) h1.textContent = 'Materiais Pales.';")
js = js.replace("if (h1) h1.textContent = 'Materiais de Palestras';", "if (h1) h1.textContent = 'Materiais Pales.';")
js = js.replace("if (h1) h1.textContent = 'Materiais de Treinamento';", "if (h1) h1.textContent = 'Materiais Trein.';")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated treinamento.js")
