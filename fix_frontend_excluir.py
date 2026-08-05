import sys

def process_frontend(filename):
    with open(filename, 'r', encoding='latin-1') as f:
        content = f.read()

    # Add delete button to UI
    content = content.replace(
        "                viewBtn = `<button onclick=\"window.openSignedDocPopupDocumento(${d.id}, '${nomeEsc}')\" style=\"background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\"><i class=\"ph ph-eye\"></i> Ver PDF</button>`;",
        "                viewBtn = `<div style=\"display:flex;gap:4px;justify-content:center;\"><button onclick=\"window.openSignedDocPopupDocumento(${d.id}, '${nomeEsc}')\" style=\"background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\"><i class=\"ph ph-eye\"></i> Ver PDF</button><button onclick=\"window.excluirAssinatura(${d.id}, '${d.source}', this)\" style=\"background:#ef4444;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\" title=\"Excluir Pedido\"><i class=\"ph ph-trash\"></i></button></div>`;"
    )
    
    content = content.replace(
        "                viewBtn = `<button onclick=\"window.openSignedDocPopup(${d.id}, '${nomeEsc}', event)\" style=\"background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\"><i class=\"ph ph-eye\"></i> Ver PDF</button>`;",
        "                viewBtn = `<div style=\"display:flex;gap:4px;justify-content:center;\"><button onclick=\"window.openSignedDocPopup(${d.id}, '${nomeEsc}', event)\" style=\"background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\"><i class=\"ph ph-eye\"></i> Ver PDF</button><button onclick=\"window.excluirAssinatura(${d.id}, '${d.source}', this)\" style=\"background:#ef4444;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\" title=\"Excluir Pedido\"><i class=\"ph ph-trash\"></i></button></div>`;"
    )

    content = content.replace(
        "                <button onclick=\"window.reenviarAssinatura(${d.id}, '${d.source}', this)\" style=\"background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\" title=\"Reenviar\"><i class=\"ph ph-paper-plane-right\"></i></button>\n            </div>`;",
        "                <button onclick=\"window.reenviarAssinatura(${d.id}, '${d.source}', this)\" style=\"background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\" title=\"Reenviar\"><i class=\"ph ph-paper-plane-right\"></i></button>\n                <button onclick=\"window.excluirAssinatura(${d.id}, '${d.source}', this)\" style=\"background:#ef4444;color:#fff;border:none;border-radius:6px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;\" title=\"Excluir Pedido\"><i class=\"ph ph-trash\"></i></button>\n            </div>`;"
    )

    if "window.excluirAssinatura =" not in content:
        func = """
window.excluirAssinatura = async function (id, source, btn) {
    if (!confirm('Tem certeza que deseja excluir de forma permanente este pedido de assinatura? Isso retornará o documento ao status pendente no prontuário e o removerá desta tela.')) return;
    
    const token = window._assinaturaToken || window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/assinaturas/${id}?source=${source}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir assinatura');
        
        if (typeof showToast !== 'undefined') showToast('Assinatura excluída com sucesso', 'success');
        else alert('Assinatura excluída com sucesso');
        
        if (window.loadAssinaturasDigitais) await window.loadAssinaturasDigitais();
    } catch (err) {
        if (typeof showToast !== 'undefined') showToast(err.message, 'error');
        else alert(err.message);
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};
"""
        content = content.replace(
            "window.reenviarAssinatura = async function (id, source, btn) {",
            func + "\nwindow.reenviarAssinatura = async function (id, source, btn) {"
        )

    with open(filename, 'w', encoding='latin-1') as f:
        f.write(content)

process_frontend('frontend/app.js')
process_frontend('frontend/app_homologacao.js')
print("Frontend update complete")
