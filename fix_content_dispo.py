import os

def fix_backend():
    with open('backend/server.js', 'r', encoding='utf-8') as f:
        content = f.read()

    replacement = '''let safeFilename = row.file_name || ('documento' + ext);
            if (isDocx && safeFilename.toLowerCase().endsWith('.pdf')) {
                safeFilename = safeFilename.substring(0, safeFilename.length - 4) + '.docx';
            }
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFilename)}"`);'''
            
    content = content.replace(
        '''res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'documento.pdf')}"`);''',
        replacement
    )
    
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)

fix_backend()
