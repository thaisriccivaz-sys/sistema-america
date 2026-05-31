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
        </div>

        <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem;">

            <!-- STATUS -->
            <div class="card p-4" style="border-left: 4px solid #3b82f6;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h3 style="margin: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-plugs" style="color: #3b82f6;"></i> Status da Conexão
                    </h3>
                    <button class="btn btn-secondary" onclick="testarConexaoRHID()" id="btn-teste-rhid" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; padding: 0.4rem 1rem;">
                        <i class="ph ph-arrows-clockwise"></i> Testar Conexão
                    </button>
                </div>
                <div id="rhid-status-box" style="padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-spinner ph-spin"></i> Verificando status...
                    </p>
                </div>
            </div>

            <!-- CREDENCIAIS -->
            <div class="card p-4" style="border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-key" style="color: #f59e0b;"></i> Credenciais de Acesso (RHID)
                </h3>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.25rem;">
                    Se você alterar sua senha no portal do Control iD, atualize ela aqui também para o sistema continuar funcionando.
                </p>

                <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
                    <div>
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem;">
                            <i class="ph ph-envelope"></i> E-mail
                        </label>
                        <input
                            type="email"
                            id="rhid-email-input"
                            placeholder="Carregando..."
                            style="width: 100%; padding: 0.6rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; color: #1e293b; background: #fff; box-sizing: border-box;"
                        >
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem;">
                            <i class="ph ph-lock"></i> Senha
                        </label>
                        <div style="position: relative;">
                            <input
                                type="password"
                                id="rhid-password-input"
                                placeholder="••••••••  (deixe em branco para não alterar)"
                                style="width: 100%; padding: 0.6rem 2.5rem 0.6rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; color: #1e293b; background: #fff; box-sizing: border-box;"
                            >
                            <button type="button" onclick="toggleRhidPassword()" style="position: absolute; right: 0.7rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0;">
                                <i class="ph ph-eye" id="rhid-eye-icon" style="font-size: 1.1rem;"></i>
                            </button>
                        </div>
                        <p id="rhid-senha-info" style="font-size: 0.8rem; color: #64748b; margin: 0.4rem 0 0;"></p>
                    </div>

                    <div>
                        <button class="btn btn-primary" onclick="salvarCredenciaisRHID()" id="btn-salvar-rhid" style="display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-floppy-disk"></i> Salvar Credenciais
                        </button>
                    </div>
                </div>
            </div>

            <!-- SINCRONIZAÇÃO FUTURA -->
            <div class="card p-4" style="border-left: 4px solid #94a3b8; opacity: 0.75;">
                <h3 style="margin-top: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-users-three" style="color: #94a3b8;"></i> Sincronização de Dados
                    <span style="font-size: 0.7rem; background: #e2e8f0; color: #64748b; padding: 2px 8px; border-radius: 20px; font-weight: 600; margin-left: 4px;">EM BREVE</span>
                </h3>
                <p style="color: #94a3b8; margin-bottom: 1rem; font-size: 0.9rem;">A sincronização de funcionários e pontos será habilitada em breve para automatizar os cálculos de VR e VT.</p>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-secondary" disabled style="opacity: 0.5; cursor: not-allowed; display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
                        <i class="ph ph-users-three"></i> Sincronizar Funcionários
                    </button>
                    <button class="btn btn-secondary" disabled style="opacity: 0.5; cursor: not-allowed; display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
                        <i class="ph ph-clock"></i> Buscar Pontos
                    </button>
                </div>
            </div>

        </div>
    `;

    // Carrega email salvo e verifica status
    await Promise.all([carregarCredenciaisRHID(), verificarStatusRHID()]);
}

// ── Carrega o email salvo no banco ────────────────────────────────────────────
async function carregarCredenciaisRHID() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/diretoria/controlid/credenciais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        const emailInput = document.getElementById('rhid-email-input');
        const senhaInfo = document.getElementById('rhid-senha-info');
        if (emailInput) emailInput.value = data.email || '';
        if (senhaInfo) {
            senhaInfo.innerHTML = data.tem_senha_salva
                ? '<i class="ph ph-check-circle" style="color:#10b981;"></i> Senha salva no banco. Deixe em branco para manter a atual.'
                : '<i class="ph ph-warning" style="color:#f59e0b;"></i> Nenhuma senha salva no banco (usando padrão do servidor).';
        }
    } catch (e) {
        console.warn('[ControlID] Não foi possível carregar credenciais:', e.message);
    }
}

// ── Verifica o status da conexão ─────────────────────────────────────────────
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
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 4px #d1fae5; flex-shrink: 0;"></div>
                    <div>
                        <strong style="color: #065f46; display: block;">Conectado ao RHID</strong>
                        <span style="color: #64748b; font-size: 0.85rem;">Sessão ativa. Token expira em aprox. <b>${data.expires_in_minutes} minutos</b>.</span>
                    </div>
                </div>`;
        } else {
            statusBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; flex-shrink: 0;"></div>
                    <div>
                        <strong style="color: #991b1b; display: block;">Desconectado</strong>
                        <span style="color: #64748b; font-size: 0.85rem;">Falha ao autenticar: ${data.error || 'Erro desconhecido'}. Verifique as credenciais abaixo.</span>
                    </div>
                </div>`;
        }
    } catch (e) {
        statusBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; flex-shrink: 0;"></div>
                <div>
                    <strong style="color: #991b1b; display: block;">Erro de Comunicação</strong>
                    <span style="color: #64748b; font-size: 0.85rem;">Não foi possível contatar o servidor.</span>
                </div>
            </div>`;
    }
}

// ── Salvar credenciais ────────────────────────────────────────────────────────
window.salvarCredenciaisRHID = async function() {
    const emailInput = document.getElementById('rhid-email-input');
    const passwordInput = document.getElementById('rhid-password-input');
    const btn = document.getElementById('btn-salvar-rhid');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!email) {
        Swal.fire('Atenção', 'O campo de e-mail não pode estar vazio.', 'warning');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/diretoria/controlid/credenciais`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            // Limpa o campo de senha após salvar
            if (passwordInput) passwordInput.value = '';
            Swal.fire({
                icon: 'success',
                title: 'Credenciais salvas!',
                text: 'O sistema já está usando as novas credenciais. Testando a conexão...',
                timer: 2200,
                showConfirmButton: false
            });
            await carregarCredenciaisRHID();
            setTimeout(() => verificarStatusRHID(), 2500);
        } else {
            Swal.fire('Erro', data.message || 'Não foi possível salvar.', 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Falha de comunicação: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// ── Testar conexão manualmente ────────────────────────────────────────────────
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
            Swal.fire({ icon: 'success', title: 'Conectado!', text: 'Autenticação com o RHID realizada com sucesso.', timer: 2000, showConfirmButton: false });
        } else {
            Swal.fire('Falha na conexão', data.message || 'Erro ao autenticar.', 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Falha de rede: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        await verificarStatusRHID();
    }
};

// ── Toggle de visibilidade da senha ──────────────────────────────────────────
window.toggleRhidPassword = function() {
    const input = document.getElementById('rhid-password-input');
    const icon = document.getElementById('rhid-eye-icon');
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ph ph-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'ph ph-eye';
    }
};

// ── Hook no navigateTo ────────────────────────────────────────────────────────
const origNavigateToForControlID = window.navigateTo;
window.navigateTo = function(targetId) {
    if (origNavigateToForControlID) origNavigateToForControlID.apply(this, arguments);
    if (targetId === 'controlid') {
        initControlIDView();
    }
};
