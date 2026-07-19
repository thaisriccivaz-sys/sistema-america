# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

replacements = {
    'F??rias': 'Férias',
    'Distribui????o': 'Distribuição',
    'Log??stica': 'Logística',
    'per??odo': 'período',
    'per??odos': 'períodos',
    '1?? e 2??': '1º e 2º',
    'autom??tica': 'automática',
    'L??gica': 'Lógica',
    't??rmino': 'término',
    'ap??s': 'após',
    'aplic??veis': 'aplicáveis',
    'cont??m': 'contém',
    'conclus??o': 'conclusão',
    'lan??adas': 'lançadas',
}

for old, new in replacements.items():
    js = js.replace(old, new)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed encoding corruptions in server.js")
