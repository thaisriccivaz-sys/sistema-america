// frontend/notificacoes.js

// Define the notification types available in the system
const TIPOS_NOTIFICACAO = [
    { id: 'nova_solicitacao_credenciamento', nome: 'Nova Solicitação de Credenciamento', icone: 'ph-identification-card' },
    { id: 'credenciamento_solicitado', nome: 'Credenciamento Solicitado (Legado)', icone: 'ph-identification-card' },
    { id: 'aviso_faltas', nome: 'Aviso de Faltas', icone: 'ph-warning' },
    { id: 'aviso_equipes', nome: 'Aviso de Equipe Desfalcada', icone: 'ph-users-three' },
    { id: 'formulario_experiencia', nome: 'Formulário de Experiência Preenchido', icone: 'ph-clipboard-text' },
    { id: 'documentos_assinados', nome: 'Documentos Assinados', icone: 'ph-signature' },
    { id: 'licenca_vencida', nome: 'Aviso de Licença Vencida', icone: 'ph-warning-circle' },
    { id: 'novo_sinistro', nome: 'Novo Sinistro Registrado', icone: 'ph-warning' },
    { id: 'nova_multa_prontuario', nome: 'Nova Multa no Prontuário', icone: 'ph-traffic-cone' },
    { id: 'multa_rec_indeferida', nome: 'Multa Rec. Indeferida (vai ao prontuário)', icone: 'ph-traffic-cone', descricao: 'Popup enviado quando uma multa tem o recurso indeferido (Rec. Indeferida). A multa é automaticamente inserida no prontuário do colaborador. Não envia e-mail.' },
    { id: 'nova_multa_monaco', nome: 'Nova Multa Integrada Mônaco', icone: 'ph-police-car' },
    { id: 'estoque_minimo', nome: 'Estoque mínimo para compra', icone: 'ph-shopping-cart-simple', descricao: 'Notificado quando um item em endereço do tipo "Pedido de Compra" atinge o estoque mínimo.' },
    { id: 'estoque_reposicao', nome: 'Mínimo para reposição de estoque', icone: 'ph-arrows-left-right', descricao: 'Notificado quando um item em endereço do tipo "Pedido de Reposição" atinge o estoque mínimo.' },
    { id: 'novo_colaborador_equipe', nome: 'Equipe para distribuição', icone: 'ph-users-three' },
    { id: 'nova_ocorrencia', nome: 'Nova Ocorrência no Prontuário', icone: 'ph-warning' },
    { id: 'pesquisa_satisfacao_treinamento', nome: 'Pesquisa de Satisfação de Treinamentos', icone: 'ph-star' }
];

const TIPOS_NOTIFICACAO_CELULARES = [
    { id: 'celular_controle', nome: 'Controle de Celulares', icone: 'ph-device-mobile' }
];

const TIPOS_NOTIFICACAO_COMPUTADORES = [
    { id: 'computador_controle', nome: 'Controle de Computadores', icone: 'ph-monitor', descricao: 'Quem receberá popup e e-mail quando um novo colaborador administrativo for cadastrado' }
];

let globalUsuariosConfig = [];
// Armazena email_override por { tipo: { uid: email } }
let _emailOverrideMap = {};

async function initNotificacoesView() {
    try {
        const container = document.getElementById('notificacoes-container');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align:center; padding: 2rem; color: #94a3b8;">Carregando configurações...</div>';
        
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        if (!token) throw new Error('Usuário não autenticado');

        // 1. Fetch Users
        const resUsers = await fetch(`${API_URL}/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resUsers.ok) throw new Error('Erro ao carregar usuários');
        globalUsuariosConfig = await resUsers.json();
        
        // Filter only active users to select
        globalUsuariosConfig = globalUsuariosConfig.filter(u => u.ativo);
        
        // 2. Fetch Configs
        const resConfig = await fetch(`${API_URL}/config-notificacoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resConfig.ok) throw new Error('Erro ao carregar configurações');
        const configs = await resConfig.json();
        
        // Group configs by tipo — store both usuario_id and email_override
        const configByTipo = {};
        _emailOverrideMap = {};
        configs.forEach(c => {
            if (!configByTipo[c.tipo]) configByTipo[c.tipo] = [];
            configByTipo[c.tipo].push(c.usuario_id);
            if (!_emailOverrideMap[c.tipo]) _emailOverrideMap[c.tipo] = {};
            if (c.email_override) _emailOverrideMap[c.tipo][c.usuario_id] = c.email_override;
        });

        // Helper: renderiza um tipo como card colapsável
        function renderTipoCard(tipo, corBorda, corIcon, bgIcon) {
            const selectedUsers = configByTipo[tipo.id] || [];
            const overrides = _emailOverrideMap[tipo.id] || {};
            return `
                <div class="config-notificacao-item" style="border: 1px solid ${corBorda}; border-radius: 8px; background: #fff; display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; cursor: pointer; user-select: none;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('.arrow').style.transform = this.nextElementSibling.style.display === 'none' ? 'rotate(0deg)' : 'rotate(180deg)'">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${bgIcon}; color: ${corIcon}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="ph ${tipo.icone}" style="font-size: 1.2rem;"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1rem; color: #334155; line-height: 1.2;">${tipo.nome}</h3>
                                ${tipo.descricao ? `<p style="margin:2px 0 0;font-size:0.76rem;color:#94a3b8;line-height:1.3;">${tipo.descricao}</p>` : ''}
                                ${selectedUsers.length > 0 ? `<span style="font-size:0.75rem;color:#16a34a;font-weight:600;">${selectedUsers.length} destinatário(s) configurado(s)</span>` : '<span style="font-size:0.75rem;color:#ef4444;">Nenhum destinatário</span>'}
                            </div>
                        </div>
                        <i class="ph ph-caret-down arrow" style="color: #94a3b8; transition: transform 0.2s;"></i>
                    </div>
                    <div class="notif-users-list" style="display: none; border-top: 1px solid #e2e8f0; padding: 1rem; background: #f8fafc; border-radius: 0 0 8px 8px; max-height: 400px; overflow-y: auto;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: #64748b; margin-bottom: 0.75rem; display: block;">Selecione os usuários que receberão as notificações (o e-mail será obtido do cadastro do usuário):</label>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${globalUsuariosConfig.map(u => {
                                const isChecked = selectedUsers.includes(u.id) ? 'checked' : '';
                                return `<div class="notif-user-row" style="display: flex; align-items: center; gap: 0.5rem; background: #fff; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="const cb = this.querySelector('.config-notif-cb'); cb.checked = !cb.checked;">
                                    <input type="checkbox" class="config-notif-cb" data-tipo="${tipo.id}" data-uid="${u.id}" ${isChecked} style="flex-shrink:0; pointer-events: none;">
                                    <span style="font-size: 0.9rem; color: #475569; min-width: 160px; flex-shrink:0;">${u.nome || u.username}</span>
                                </div>`;
                            }).join('')}
                        </div>
                        ${tipo.id === 'celular_controle' ? `
                        <div style="margin-top:1rem;padding-top:1rem;border-top:1px dashed #e2e8f0;">
                            <button onclick="window.testarNotifCelular()" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:0.4rem 1rem;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;">
                                <i class="ph ph-paper-plane-tilt"></i> Enviar notificação de TESTE agora
                            </button>
                            <p style="font-size:0.75rem;color:#94a3b8;margin:0.4rem 0 0;">Envia um e-mail e popup de teste para os destinatários configurados (sem precisar salvar um colaborador).</p>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }
        
        // 3. Render HTML
        let html = '';

        // 🔹 Renderiza a sessão de Celulares primeiro (destaque) 🔹
        TIPOS_NOTIFICACAO_CELULARES.forEach(tipo => {
            html += renderTipoCard(tipo, '#fed7aa', '#d9480f', '#fff5f5');
        });

        // 🔹 Renderiza a sessão de Computadores 🔹
        TIPOS_NOTIFICACAO_COMPUTADORES.forEach(tipo => {
            html += renderTipoCard(tipo, '#c7d2fe', '#4f46e5', '#eef2ff');
        });

        // ── Demais tipos de notificação ──
        TIPOS_NOTIFICACAO.forEach(tipo => {
            const isEstoqueCompra = tipo.id === 'estoque_minimo';
            const isEstoqueRepos  = tipo.id === 'estoque_reposicao';
            const corBorda  = isEstoqueCompra ? '#fed7aa' : isEstoqueRepos ? '#bbf7d0' : '#e2e8f0';
            const bgIcon    = isEstoqueCompra ? '#fff3e6' : isEstoqueRepos ? '#f0fdf4' : '#fff5f5';
            const corIcon   = isEstoqueCompra ? '#e67700' : isEstoqueRepos ? '#16a34a' : '#d9480f';
            html += renderTipoCard(tipo, corBorda, corIcon, bgIcon);
        });
        
        container.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        document.getElementById('notificacoes-container').innerHTML = `<div class="error-msg">Erro: ${e.message}</div>`;
    }
}

window.salvarConfigNotificacoes = async function() {
    const checkboxes = document.querySelectorAll('.config-notif-cb');
    const selectedByTipo = {};
    
    // Incluir todos os tipos (padrão + celulares + computadores)
    TIPOS_NOTIFICACAO.forEach(t => { selectedByTipo[t.id] = []; });
    TIPOS_NOTIFICACAO_CELULARES.forEach(t => { selectedByTipo[t.id] = []; });
    TIPOS_NOTIFICACAO_COMPUTADORES.forEach(t => { selectedByTipo[t.id] = []; });
    
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const tipo = cb.getAttribute('data-tipo');
            const uid = parseInt(cb.getAttribute('data-uid'));
            if (selectedByTipo[tipo]) {
                selectedByTipo[tipo].push({ usuario_id: uid, email_override: null });
            }
        }
    });
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const btn = document.querySelector('#view-notificacoes .btn-primary');
        const btnOriginal = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; btn.disabled = true; }
        
        // Salvar cada tipo
        const promises = Object.keys(selectedByTipo).map(tipo => {
            return fetch(`${API_URL}/config-notificacoes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tipo, usuarios: selectedByTipo[tipo] })
            });
        });
        
        const results = await Promise.all(promises);
        const hasError = results.some(r => !r.ok);
        
        if (hasError) throw new Error('Algumas configurações não puderam ser salvas.');
        
        Swal.fire({
            icon: 'success',
            title: 'Salvo!',
            text: 'As configurações de notificações foram atualizadas com sucesso.',
            timer: 2000,
            showConfirmButton: false
        });
        
        if (btn) { btn.innerHTML = btnOriginal; btn.disabled = false; }
        
        // Recarregar para atualizar os contadores
        setTimeout(() => initNotificacoesView(), 2100);
        
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', e.message, 'error');
        const btn = document.querySelector('#view-notificacoes .btn-primary');
        if (btn) { btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Configurações'; btn.disabled = false; }
    }
};

window.testarNotifCelular = async function() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const resp = await fetch(`${API_URL}/internal/trigger-notif-test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': 'america-test-2025'
            },
            body: JSON.stringify({ colaborador_nome: 'Colaborador Teste (Sistema)' })
        });
        const data = await resp.json();
        if (data.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Teste enviado!',
                html: `Notificação e e-mail disparados para <strong>${data.destinatarios_encontrados}</strong> destinatário(s).<br><small>${(data.destinatarios||[]).map(d=>d.email_override||d.email_usuario||d.username).join(', ')}</small>`,
                confirmButtonText: 'OK'
            });
        } else {
            Swal.fire('Erro', data.error || 'Falha desconhecida', 'error');
        }
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};

// Intercept navigateTo in index/app to initialize view
const origNavigateToForNotif = window.navigateTo;
window.navigateTo = function(targetId) {
    if (origNavigateToForNotif) origNavigateToForNotif.apply(this, arguments);
    if (targetId === 'notificacoes') {
        initNotificacoesView();
    }
};
