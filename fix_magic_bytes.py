import os

def fix_backend():
    with open('backend/server.js', 'r', encoding='utf-8') as f:
        content = f.read()

    magic_bytes_logic = '''        if (pathLocal && fs.existsSync(pathLocal)) {
            let isDocx = false;
            try {
                const fd = fs.openSync(pathLocal, 'r');
                const buffer = Buffer.alloc(4);
                fs.readSync(fd, buffer, 0, 4, 0);
                fs.closeSync(fd);
                if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) isDocx = true;
            } catch(e) {}
            
            let ext = row.file_name ? require('path').extname(row.file_name).toLowerCase() : '.pdf';
            if (isDocx) ext = '.docx';

            const contentType = ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ext === '.doc' ? 'application/msword' : 'application/pdf';
            res.setHeader('Content-Type', contentType);'''
            
    content = content.replace(
        '''        if (pathLocal && fs.existsSync(pathLocal)) {
            const ext = row.file_name ? require('path').extname(row.file_name).toLowerCase() : '.pdf';
            const contentType = ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ext === '.doc' ? 'application/msword' : 'application/pdf';
            res.setHeader('Content-Type', contentType);''',
        magic_bytes_logic
    )
    
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)

def fix_frontend():
    for filepath in ['frontend/app.js', 'frontend/app_homologacao.js']:
        with open(filepath, 'r', encoding='latin-1') as f:
            content = f.read()
            
        new_func = '''window.openContratoViewerById = function (docId, nomeDoc) {
    var token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
    
    var viewUrl = API_URL + '/documentos/view/' + docId + '?token=' + encodeURIComponent(token);
    var dlUrl = API_URL + '/documentos/download/' + docId + '?token=' + encodeURIComponent(token);
    
    fetch(viewUrl, { method: 'HEAD' }).then(res => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('pdf')) {
            window.openContratoViewerPopup(viewUrl, nomeDoc);
        } else {
            window.open(dlUrl, '_blank');
        }
    }).catch(err => {
        window.openContratoViewerPopup(viewUrl, nomeDoc);
    });
};'''
        
        start_idx = content.find("window.openContratoViewerById = function (docId, nomeDoc) {")
        end_idx = content.find("};", start_idx) + 2
        content = content[:start_idx] + new_func + content[end_idx:]
        
        # Also remove the trash button completely from assinaturas
        content = content.replace(
            '''<button onclick="window.excluirAssinatura(${d.id}, '${d.source}', this)" style="display:none; background:#ef4444;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Excluir Pedido"><i class="ph ph-trash"></i></button>''',
            '''<!-- Trash button hidden -->'''
        )
        
        with open(filepath, 'w', encoding='latin-1') as f:
            f.write(content)

fix_backend()
fix_frontend()
