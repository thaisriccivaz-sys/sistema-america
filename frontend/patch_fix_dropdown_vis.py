
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# I need to conditionally hide the cia-treinamento block based on the group name.
# In ciAdicionarAcaoNoGrupo:
# The function signature is `window.ciAdicionarAcaoNoGrupo = function(grupoBlock, aObj) {`
# Let's insert the definition of `isTreinamentos` right after `const a = aObj || {};`
# The group name comes from `grupoBlock.querySelector('.cig-nome').value`
# And then update the `<div style="flex:1;">` for the Treinamento Vinculado to `<div style="flex:1; display:${displayTrein};">`

regex_aObj = r'(const a = aObj \|\| {};)'
replacement_aObj = r'''\1
    const grupoNomeAcao = (grupoBlock && grupoBlock.querySelector('.cig-nome')) ? grupoBlock.querySelector('.cig-nome').value.toLowerCase() : '';
    const isTreinamentosAcao = grupoNomeAcao.includes('treinamentos');
    const displayTrein = isTreinamentosAcao ? 'block' : 'none';'''
content = re.sub(regex_aObj, replacement_aObj, content)

# Now find the Treinamento Vinculado div and add display:${displayTrein}
regex_trein_div = r'(<div style="flex:1;">)\s*<label[^>]*>Treinamento Vinculado</label>'
replacement_trein_div = r'<div style="flex:1; display:${displayTrein};">\n                    <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:0.25rem;">Treinamento Vinculado</label>'
content = re.sub(regex_trein_div, replacement_trein_div, content)

# Next, we also need to make sure that if the user changes the group name, the dropdown appears or disappears dynamically.
# To do that, we can add an onchange listener to `.cig-nome`. Wait, `.cig-nome` already has `onblur` and `onfocus`.
# Actually, the user can't edit the "4 Treinamentos" group anyway since we locked it earlier.
# But for now this is enough.

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Fixed integracao.js dropdown visibility")
