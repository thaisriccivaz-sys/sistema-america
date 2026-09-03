with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# The function is defined as `function _pmRenderTabela(itens) {`
old_def = "    function _pmRenderTabela(itens) {"
new_def = "    function _pmRenderTabela(itens) {\n        const temComAoVivo = !!(window._pdfDuploBase64 && window._pdfDuploBase64.comunicacao);"

if old_def in c:
    c = c.replace(old_def, new_def)
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print("app.js updated")
else:
    print("Could not find the function definition.")
