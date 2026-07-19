# -*- coding: utf-8 -*-
import re

server_js = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(server_js, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# I need to add `status: c.status,` to the returned object.
# The block is:
# return {
# id: c.id,
# nome_completo: c.nome_completo,
# departamento: c.departamento,
# departamento_tipo: c.departamento_tipo,
# cargo: c.cargo,
# foto_path: c.foto_path,

old_return = """return {
id: c.id,
nome_completo: c.nome_completo,
departamento: c.departamento,
departamento_tipo: c.departamento_tipo,
cargo: c.cargo,
foto_path: c.foto_path,"""

new_return = """return {
id: c.id,
nome_completo: c.nome_completo,
departamento: c.departamento,
departamento_tipo: c.departamento_tipo,
cargo: c.cargo,
status: c.status,
foto_path: c.foto_path,"""

if old_return in js:
    js = js.replace(old_return, new_return)
    print("Replaced successfully.")
else:
    print("Not found exactly, using regex.")
    # More robust regex replacement
    js = re.sub(
        r'return \{\s*id: c\.id,\s*nome_completo: c\.nome_completo,\s*departamento: c\.departamento,\s*departamento_tipo: c\.departamento_tipo,\s*cargo: c\.cargo,\s*foto_path: c\.foto_path,',
        r'return {\nid: c.id,\nnome_completo: c.nome_completo,\ndepartamento: c.departamento,\ndepartamento_tipo: c.departamento_tipo,\ncargo: c.cargo,\nstatus: c.status,\nfoto_path: c.foto_path,',
        js
    )

with open(server_js, 'w', encoding='utf-8') as f:
    f.write(js)
