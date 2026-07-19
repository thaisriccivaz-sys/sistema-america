
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

cleanup_code = """
// LIMPEZA TEMPORÁRIA DE ENCODING
db.serialize(() => {
    db.run("DELETE FROM departamentos WHERE nome LIKE '%?%'", [], err => {
        if (!err) console.log('[DB] Limpeza de departamentos com caracteres especiais (?) concluída.');
    });
});
"""

if "LIMPEZA TEMPORÁRIA DE ENCODING" not in content:
    content += cleanup_code

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)
print("Limpeza de departamentos adicionada")
