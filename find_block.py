with open('frontend/sac.js', 'rb') as f:
    content = f.read().decode('utf-8')

idx = content.find("if (ticket.stage === 'aguardando_setores') {")
print('Block found at index:', idx)
ctx = content[idx:idx+350]
print('Context repr:', repr(ctx))
