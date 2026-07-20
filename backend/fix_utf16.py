# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# I will replace these exact weird lines
weird_line_1 = "s u b j e c t :   ` ? ? ? ? ? ?   A v i s o   d e   F a l t a   ( A g e n d a )   ? ? ?   $ { n o m e s } ` ,"
weird_line_2 = "< p   s t y l e = \" m a r g i n : 4 p x   0 ; \" > < s t r o n g > D a t a : < / s t r o n g >   $ { c a r d . d a t a   ?   c a r d . d a t a . s p l i t ( ' - ' ) . r e v e r s e ( ) . j o i n ( ' / ' )   :   ' ? ? ? ' } < / p >"

correct_line_1 = "subject: `⚠️ Aviso de Falta (Agenda) - ${nomes}`,"
correct_line_2 = "<p style=\"margin:4px 0;\"><strong>Data:</strong> ${card.data ? card.data.split('-').reverse().join('/') : '---'}</p>"

js = js.replace(weird_line_1, correct_line_1)
js = js.replace(weird_line_2, correct_line_2)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed UTF-16 corrupted lines")
