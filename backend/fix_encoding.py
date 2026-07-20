# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

replacements = {
    'autom??tico': 'automático',
    'Satisfa????o': 'Satisfação',
    'participa????o': 'participação',
    'Atualiza????o': 'Atualização',
    'confirma????o': 'confirmação',
    'edi????o': 'edição',
    'suspens??o': 'suspensão',
    'advert??ncia': 'advertência',
    'Rodap??': 'Rodapé',
    'est?? ': 'está ',
    'est??o': 'estão',
    'v??lido': 'válido',
    'Este à um': 'Este é um',
    'nàs!': 'nós!',
    'a????o': 'ação'
}

for bad, good in replacements.items():
    content = content.replace(bad, good)
    # also handle capitalized/lowercase variations if any
    content = content.replace(bad.lower(), good.lower())

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed encoding errors in server.js")
