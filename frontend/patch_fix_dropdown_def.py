
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix the missing displayTrein definition.
# Current line: `if (!a || a instanceof Event) a = {};`

regex_aObj = r'(if \(!a \|\| a instanceof Event\) a = \{\};)'
replacement_aObj = r'''\1
    const grupoNomeAcao = (grupoEl && grupoEl.querySelector('.cig-nome')) ? grupoEl.querySelector('.cig-nome').value.toLowerCase() : '';
    const isTreinamentosAcao = grupoNomeAcao.includes('treinamentos');
    const displayTrein = isTreinamentosAcao ? 'block' : 'none';'''
content = re.sub(regex_aObj, replacement_aObj, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Fixed integracao.js displayTrein definition")
