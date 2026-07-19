
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.read().splitlines()

new_lines = []
skip = False
for l in lines:
    if '<div class="nav-group" id="nav-group-terapia">' in l:
        skip = True
        continue
    if skip:
        if '<a href="#" class="nav-item nav-item-sub"' in l and 'Palestras</a>' in l or 'Listas</a>' in l or 'data-target="treinamento-' in l:
            # We want to keep these links but un-indent them a bit.
            new_lines.append(l)
        if '</div>' in l:
            # The outer div has 3 </div> to close it down, wait, let's just do a regex!
            pass
