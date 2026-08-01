# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

# Read as raw bytes
with open(js_file, 'rb') as f:
    raw_bytes = f.read()

# Remove all null bytes
cleaned_bytes = raw_bytes.replace(b'\x00', b'')

# Decode to string
js = cleaned_bytes.decode('utf-8', errors='ignore')

# Fix the specific lines
js = js.replace('subject: `?????? Aviso de Falta (Agenda) ??? ${nomes}`,', 'subject: `⚠️ Aviso de Falta (Agenda) - ${nomes}`,')
js = js.replace('<p style="margin:4px 0;"><strong>Data:</strong> ${card.data ? card.data.split(\'-\').reverse().join(\'/\') : \'???\'}</p>', '<p style="margin:4px 0;"><strong>Data:</strong> ${card.data ? card.data.split(\'-\').reverse().join(\'/\') : \'---\'}</p>')

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Removed null bytes and fixed lines")
