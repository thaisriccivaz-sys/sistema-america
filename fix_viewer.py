import sys

def process_frontend(filename):
    with open(filename, 'r', encoding='latin-1') as f:
        content = f.read()

    # 1. Update eyeBtn in Contratos
    content = content.replace(
        "const eyeBtn = `<button onclick=\"window.openContratoViewerById(${doc.id})\" style=\"border:none;background:none;cursor:pointer;color:#64748b;\" title=\"Visualizar Documento\"><i class=\"ph ph-eye\" style=\"font-size:1.4rem;\"></i></button>`;",
        "const eyeBtn = `<button onclick=\"window.openContratoViewerById(${doc.id}, '${(doc.file_name || '').replace(/'/g, \"\\\\'\")}')\" style=\"border:none;background:none;cursor:pointer;color:#64748b;\" title=\"Visualizar Documento\"><i class=\"ph ph-eye\" style=\"font-size:1.4rem;\"></i></button>`;"
    )

    # 2. Update window.openContratoViewerById function
    old_func = """window.openContratoViewerById = function (docId, nomeDoc) {
    var token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
    var pdfUrl = API_URL + '/documentos/view/' + docId + '?token=' + encodeURIComponent(token);
    window.openContratoViewerPopup(pdfUrl, nomeDoc);
};"""
    new_func = """window.openContratoViewerById = function (docId, nomeDoc) {
    var token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
    
    if (nomeDoc && (!nomeDoc.toLowerCase().endsWith('.pdf'))) {
        var dlUrl = API_URL + '/documentos/download/' + docId + '?token=' + encodeURIComponent(token);
        window.open(dlUrl, '_blank');
        return;
    }

    var pdfUrl = API_URL + '/documentos/view/' + docId + '?token=' + encodeURIComponent(token);
    window.openContratoViewerPopup(pdfUrl, nomeDoc);
};"""
    
    # Due to encoding and text differences, sometimes exact match fails. We'll use a more robust replace for the function.
    if "window.openContratoViewerById = function (docId, nomeDoc) {" in content:
        start_idx = content.find("window.openContratoViewerById = function (docId, nomeDoc) {")
        end_idx = content.find("};", start_idx) + 2
        content = content[:start_idx] + new_func + content[end_idx:]
    
    with open(filename, 'w', encoding='latin-1') as f:
        f.write(content)

def process_backend():
    with open('backend/server.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace hardcoded application/pdf
    replacement = """        if (pathLocal && fs.existsSync(pathLocal)) {
            const ext = row.file_name ? require('path').extname(row.file_name).toLowerCase() : '.pdf';
            const contentType = ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ext === '.doc' ? 'application/msword' : 'application/pdf';
            res.setHeader('Content-Type', contentType);"""
            
    content = content.replace(
        """        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');""",
        replacement
    )
    
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)

process_frontend('frontend/app.js')
process_frontend('frontend/app_homologacao.js')
process_backend()
print("Applied fixes to download instead of viewing non-pdf docs")
