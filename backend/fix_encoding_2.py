# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

replacements = {
    'opini??o': 'opinião',
    'cab??veis': 'cabíveis',
    'pend??ncias': 'pendências',
    'Admiss??o': 'Admissão',
    'coment??rio': 'comentário',
    'Reuni??o': 'Reunião',
    'espec??fico': 'específico',
    'm??nimo': 'mínimo',
    'm??nima': 'mínima',
    'M??DULO': 'MÓDULO',
    'Devolu????o': 'Devolução',
    'In??cio': 'Início',
    'condu????o': 'condução',
    'tamb??m': 'também',
    'espont??nea': 'espontânea',
    'poder??o': 'poderão',
    'ENDERE??O': 'ENDEREÇO',
    'N?? do AIT': 'Nº do AIT',
    'N??o': 'Não',
    'Exerc??cio': 'Exercício',
    'v??lido': 'válido',
    's??o': 'são',
    'Este à um': 'Este é um',
    'à obrigatório': 'é obrigatório',
    'opini??o à': 'opinião é',
    'à v??lido': 'é válido'
}

for bad, good in replacements.items():
    content = content.replace(bad, good)
    content = content.replace(bad.lower(), good.lower())

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed encoding errors pass 2 in server.js")
