// frontend/notificacoes.js

// Define the notification types available in the system
const TIPOS_NOTIFICACAO = [
    { id: 'credenciamento_solicitado', nome: 'Solicitação de Credenciamento', icone: 'ph-identification-card' },
    { id: 'documentos_assinados', nome: 'Documentos Assinados', icone: 'ph-signature' },
    { id: 'aviso_faltas', nome: 'Aviso de Faltas', icone: 'ph-warning' },
    { id: 'formulario_experiencia', nome: 'Formulário de Experiência Preenchido', icone: 'ph-clipboard-text' }
];

let globalUsuariosConfig = [];

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
        
        // Group configs by tipo
        const configByTipo = {};
        configs.forEach(c => {
            if (!configByTipo[c.tipo]) configByTipo[c.tipo] = [];
            configByTipo[c.tipo].push(c.usuario_id);
        });
        
        // 3. Render HTML
        let html = '';
        TIPOS_NOTIFICACAO.forEach(tipo => {
            const selectedUsers = configByTipo[tipo.id] || [];
            
            html += `
                <div class="config-notificacao-item" style="border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; cursor: pointer; user-select: none;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('.arrow').style.transform = this.nextElementSibling.style.display === 'none' ? 'rotate(0deg)' : 'rotate(180deg)'">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 32px; height: 32px; border-radius: 6px; background: #fff5f5; color: #d9480f; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="ph ${tipo.icone}" style="font-size: 1.2rem;"></i>
                            </div>
                            <h3 style="margin: 0; font-size: 1rem; color: #334155; line-height: 1.2;">${tipo.nome}</h3>
                        </div>
                        <i class="ph ph-caret-down arrow" style="color: #94a3b8; transition: transform 0.2s;"></i>
                    </div>
                    
                    <div class="notif-users-list" style="display: none; border-top: 1px solid #e2e8f0; padding: 1rem; background: #f8fafc; border-radius: 0 0 8px 8px; max-height: 300px; overflow-y: auto;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: #64748b; margin-bottom: 0.75rem; display: block;">Selecione os usuários:</label>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            `;
            
            // Checkboxes para cada usuário
            globalUsuariosConfig.forEach(u => {
                const isChecked = selectedUsers.includes(u.id) ? 'checked' : '';
                html += `
                    <label class="user-checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; background: #fff; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer; user-select: none; transition: background 0.2s;">
                        <input type="checkbox" class="config-notif-cb" data-tipo="${tipo.id}" data-uid="${u.id}" ${isChecked}>
                        <span style="font-size: 0.9rem; color: #475569;">${u.nome || u.username}</span>
                    </label>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
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
    
    TIPOS_NOTIFICACAO.forEach(t => { selectedByTipo[t.id] = []; });
    
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const tipo = cb.getAttribute('data-tipo');
            const uid = parseInt(cb.getAttribute('data-uid'));
            if (selectedByTipo[tipo]) {
                selectedByTipo[tipo].push(uid);
            }
        }
    });
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const btn = document.querySelector('#view-notificacoes .btn-primary');
        const btnOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
        btn.disabled = true;
        
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
        
        btn.innerHTML = btnOriginal;
        btn.disabled = false;
        
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', e.message, 'error');
        const btn = document.querySelector('#view-notificacoes .btn-primary');
        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Configurações';
        btn.disabled = false;
    }
}

// Intercept navigateTo in index/app to initialize view
const origNavigateToForNotif = window.navigateTo;
window.navigateTo = function(targetId) {
    if (origNavigateToForNotif) origNavigateToForNotif.apply(this, arguments);
    if (targetId === 'notificacoes') {
        initNotificacoesView();
    }
};
