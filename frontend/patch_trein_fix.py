
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

CACHE_ERR = """            const is_integracao = el('editar-treinamento-is-integracao') && el('editar-treinamento-is-integracao').checked ? 1 : 0;
            if (idx !== -1) {"""
CACHE_FIX = """            if (idx !== -1) {"""
content = content.replace(CACHE_ERR, CACHE_FIX)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Frontend patch syntax fix done!")
