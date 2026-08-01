import re

replacements = {
    '??cone': 'ícone',
    '??es': 'ões',
    '??lcool': 'álcool',
    '??leo': 'óleo',
    '??ltima': 'última',
    '??ltimo': 'último',
    '??ndice': 'índice',
    '??nico': 'único',
    '??nicos': 'únicos',
    '??poca': 'época',
    '??rg': 'órg',
    '??veis': 'áveis',
    '??vel': 'ável',
    'AUTOM??TICO': 'AUTOMÁTICO',
    'h??': 'há',
    'l??': 'lá',
    'exp??e': 'expõe',
    'influ??ncia': 'influência',
    'pr??': 'pré',
    'poder??': 'poderá',
    'por??m': 'porém'
}

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True):
        content = content.replace(old, new)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Fixed {filepath} round 3")

fix_file('backend/server.js')
