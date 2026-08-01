
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'a', encoding='utf-8') as fh:
    fh.write("""

// --- VERIFICAÇÃO AUTOMÁTICA DE PENDÊNCIAS ---
document.addEventListener('DOMContentLoaded', () => {
    // Delay to let login happen
    setTimeout(window.verificarPendenciasIntegracao, 3000);
});

window.verificarPendenciasIntegracao = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/integracao/processos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        let totalPendentes = 0;
        data.forEach(p => {
            if (p.pendentes) totalPendentes += parseInt(p.pendentes);
        });
        
        if (totalPendentes > 0) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Ações de Integração',
                    html: `Você possui <b>${totalPendentes}</b> ações de integração pendentes!<br><br><button onclick="Swal.close(); window.switchMenu('integracao')" style="padding: 8px 12px; background: #0f4c81; color: white; border: none; border-radius: 4px; cursor: pointer;">Acessar Integração</button>`,
                    icon: 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 15000,
                    timerProgressBar: true
                });
            }
        }
    } catch (e) {
        console.error("Erro ao verificar pendencias de integracao", e);
    }
};
""")

print("Appended popup logic to frontend/integracao.js")
