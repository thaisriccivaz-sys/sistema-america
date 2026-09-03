with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

old_str = "        const b64Empr = await readB64(fileEmpr);"
new_str = "        const b64Empr = await readB64(fileEmpr);\n        const b64Com = await readB64(fileCom);"

if old_str in c:
    c = c.replace(old_str, new_str, 1)
    with open('frontend/app.js', 'wb') as f:
        f.write(c.encode('utf-8'))
    print("Fixed b64Com undefined.")
else:
    print("Could not find the target string!")
