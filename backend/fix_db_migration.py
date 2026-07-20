# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\database.js'

with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.read().splitlines()

new_lines = []
for line in lines:
    # Filter out the destructive migration lines
    if "UPDATE epi_templates SET departamentos_json =" in line:
        continue
    if "// Migration para aplicar os departamentos corretos" in line:
        continue
    new_lines.append(line)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Removed destructive database seeding lines")
