// frontend/controlid.js

async function initControlIDView() {
    const container = document.getElementById('controlid-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="page-header flex-between mb-4" style="padding: 1.5rem 2rem 0; margin-bottom: 0;">
            <div class="flex-align" style="gap: 15px;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: #fff5f5; color: #d9480f; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; flex-shrink: 0;">
                    <i class="ph ph-fingerprint"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b;">Integração Control iD</h2>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 0.95rem;">Gerencie a integração com o RHID para ponto eletrônico e benefícios.</p>
                </div>
            </div>
            <div>
                <button class="btn btn-primary" onclick="testarConexaoRHID()" id="btn-teste-rhid" style="display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-arrows-clockwise"></i> Testar Conexão
                </button>
            </div>
        </div>

        <div style="padding: 2rem;">
            <div class="card p-4 mb-4" style="border-left: 4px solid #3b82f6;">
                <h3 style="margin-top: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-plugs" style="color: #3b82f6;"></i> Status da Integração (RHID)
                </h3>
                <div id="rhid-status-box" style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="color: #64748b; margin: 0;">Verificando status...</p>
                </div>
            </div>

            <div class="card p-4">
                <h3 style="margin-top: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-users-three" style="color: #d9480f;"></i> Sincronização de Dados
                </h3>
                <p style="color: #64748b; margin-bottom: 1.5rem;">A sincronização de funcionários e pontos será habilitada em breve para automatizar os cálculos de VR e VT.</p>
                
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="sincronizarFuncionariosRHID()" id="btn-sync-funcionarios" disabled style="opacity: 0.6; cursor: not-allowed; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-users-three"></i> Sincronizar Funcionários (Em breve)
                    </button>
                    <button class="btn btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-clock"></i> Buscar Pontos (Em breve)
                    </button>
                </div>
            </div>
        </div>
    `;

    // Buscar status logo ao abrir
    await verificarStatusRHID();
}

async function verificarStatusRHID() {
    const statusBox = document.getElementById('rhid-status-box');
    if (!statusBox) return;

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/diretoria/controlid/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (res.ok && data.token_valido) {
            statusBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 4px #d1fae5;"></div>
                    <div>
                        <strong style="color: #065f46; display: block; font-size: 1.1rem;">Conectado</strong>
                        <span style="color: #64748b; font-size: 0.9rem;">Sessão ativa e válida. Expira em aprox. ${data.expires_in_minutes} minutos.</span>
                    </div>
                </div>
            `;
        } else {
            statusBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px #fee2e2;"></div>
                    <div>
                        <strong style="color: #991b1b; display: block; font-size: 1.1rem;">Desconectado</strong>
                        <span style="color: #64748b; font-size: 0.9rem;">Não foi possível autenticar. Detalhe: ${data.error || 'Token inválido'}</span>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        statusBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px #fee2e2;"></div>
                <div>
                    <strong style="color: #991b1b; display: block; font-size: 1.1rem;">Erro de Conexão</strong>
                    <span style="color: #64748b; font-size: 0.9rem;">Falha na comunicação com o servidor local.</span>
                </div>
            </div>
        `;
    }
}

window.testarConexaoRHID = async function() {
    const btn = document.getElementById('btn-teste-rhid');
    const originalHtml = btn.innerHTML;
    
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Testando...';
    btn.disabled = true;

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/diretoria/controlid/login`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
            Swal.fire('Sucesso!', 'Conexão com a API RHID (Control iD) estabelecida com sucesso.', 'success');
        } else {
            Swal.fire('Erro', 'Falha ao autenticar: ' + (data.message || 'Erro desconhecido'), 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Falha de rede: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        await verificarStatusRHID();
    }
}

window.sincronizarFuncionariosRHID = async function() {
    Swal.fire('Em breve', 'Esta função será implementada na próxima fase, após o mapeamento dos campos necessários.', 'info');
}

// Hook into app.js routing
const origNavigateToForControlID = window.navigateTo;
window.navigateTo = function(targetId) {
    if (origNavigateToForControlID) origNavigateToForControlID.apply(this, arguments);
    if (targetId === 'controlid') {
        initControlIDView();
    }
};
