# -*- coding: utf-8 -*-
lines = open(r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html', encoding='utf-8', errors='ignore').read().splitlines()
for i, l in enumerate(lines):
    l_lower = l.lower()
    if 'ph-star' in l_lower or 'bottom' in l_lower or 'nav' in l_lower or 'footer' in l_lower:
        if '<nav' in l or 'id="bottom' in l_lower or 'class="bottom' in l_lower or 'ph-star' in l_lower or 'id="footer' in l_lower or 'class="footer' in l_lower:
            print(f'Line {i+1}: {l.strip()}')
