# -*- coding: utf-8 -*-
import re

js_file_new = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
js_file_old = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server_old.js'

with open(js_file_old, 'r', encoding='utf-8', errors='ignore') as f:
    lines_old = f.read().splitlines()

with open(js_file_new, 'r', encoding='utf-8', errors='ignore') as f:
    lines_new = f.read().splitlines()

old_map = {}
for i, l in enumerate(lines_old):
    key = re.sub(r'[^\w\s]', '', l).replace(' ', '').replace('?', '')
    if len(key) > 5:
        old_map[key] = l

for i, l in enumerate(lines_new):
    if '??' in l:
        key = re.sub(r'[^\w\s]', '', l).replace(' ', '').replace('?', '')
        if key in old_map:
            lines_new[i] = old_map[key]
        else:
            print(f'Line {i+1} UNMATCHED: {l.strip()}')

with open(js_file_new, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines_new))

print("Restored lines from server_old.js")
