# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

replacements = {
    'Formul??rio': 'Formulário',
    'Pontua????o': 'Pontuação',
    'Notifica????o': 'Notificação',
    'notifica????o': 'notificação',
    'Prontu??rio': 'Prontuário',
    'prontu??rio': 'prontuário',
    'se????o': 'seção',
    'pr??xima': 'próxima',
    'ALVAR??': 'ALVARÁ',
    'Opera????o': 'Operação',
    'm??dulo': 'módulo',
    'fa??a': 'faça',
    'voc??': 'você',
    'definir??': 'definirá',
    'S?? ': 'Só ',
    's?? ': 'só ',
    'est?? ': 'está ',
    'corre????o': 'correção',
    'L?? da requisi????o': 'Lê da requisição',
    'renova????o': 'renovação',
    'N??mero': 'Número',
    'N??o': 'Não',
    'espec??fica': 'específica',
    'sincroniza????o': 'sincronização',
    'Suspens??o': 'Suspensão',
    'El??trico': 'Elétrico',
    'Hidr??ulica': 'Hidráulica',
    'Suc????o': 'Sucção',
    'Seguran??a': 'Segurança',
    'Legaliza????o': 'Legalização',
    '??nico': 'único',
    'MIGRA????O': 'MIGRAÇÃO',
    'Altera????o': 'Alteração',
    'configura????o': 'configuração',
    'M??dulo': 'Módulo',
    '???? Formulário': '📋 Formulário',
    '???? Formul??rio': '📋 Formulário',
    '???? Nova Multa': '🚨 Nova Multa',
    '?????? Aviso de Falta': '⚠️ Aviso de Falta',
    ' ??? ': ' - ',
    'obrigatério': 'obrigatório',
    'diagnàstico': 'diagnóstico',
    'maiàsculo': 'maiúsculo'
}

for old, new in replacements.items():
    js = js.replace(old, new)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed remaining emojis and encodings in server.js emails")
