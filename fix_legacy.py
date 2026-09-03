import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('frontend/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

print('Total len:', len(code))
count3 = code.count(chr(39)+'Desist')
print('Desist count:', count3)

