
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD = """    if (condicao === 'vc') return transporte.includes('vc') || transporte.includes('combustivel') || transporte.includes('combustível') || transporte.includes('vale combust');
    return true;
}"""
NEW = """    if (condicao === 'vc') return transporte.includes('vc') || transporte.includes('combustivel') || transporte.includes('combustível') || transporte.includes('vale combust');
    if (condicao === 'terapia') return (colab.terapia_participa || '').toLowerCase() === 'sim';
    return true;
}"""
content = content.replace(OLD, NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

f_int = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f_int, 'r', encoding='utf-8') as fh_int:
    content_int = fh_int.read()

OLD_INT = """<option value="vc" ${a.condicao==='vc'?'selected':''}>Somente se usar VC</option>"""
NEW_INT = """<option value="vc" ${a.condicao==='vc'?'selected':''}>Somente se usar VC</option>
                    <option value="terapia" ${a.condicao==='terapia'?'selected':''}>Somente se usar Terapia</option>"""
content_int = content_int.replace(OLD_INT, NEW_INT)

with open(f_int, 'w', encoding='utf-8') as fh_int:
    fh_int.write(content_int)

print("Patch condicao terapia aplicado com sucesso!")
