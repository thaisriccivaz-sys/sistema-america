with open('backend/server.js', 'rb') as f:
    c = f.read().decode('utf-8').replace('\r\n', '\n')

old = "rowOld = await new Promise((res, rej) => db.get('SELECT file_path, tem_adiantamento, tem_pagamento FROM documentos WHERE id = ?', [docId], (e, r) => e ? rej(e) : res(r)));"
new = "rowOld = await new Promise((res, rej) => db.get('SELECT file_path, tem_adiantamento, tem_pagamento, tem_emprestimo FROM documentos WHERE id = ?', [docId], (e, r) => e ? rej(e) : res(r)));"
if old in c:
    c = c.replace(old, new, 1)
    with open('backend/server.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print('OK: SELECT rowOld atualizado com tem_emprestimo')
else:
    print('FALHA')
    idx = c.find('rowOld = await')
    print(repr(c[idx:idx+200]))
