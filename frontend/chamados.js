// ============================================================
// ===== MODULO DE CHAMADOS (SUPPORT TICKETS) =================
// ============================================================

(function() {
'use strict';

const ADMIN_CHAMADOS = 'Thais.Ricci';
let _pollingInterval = null;
let _chamadoAtual = null;

function _apiBase() {
    return window.API_URL || (window.location.origin + '/api');
}

function _token() {
    return window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
}

function _isAdmin() {
    if (!window.currentUser) return false;
    return window.currentUser.username === ADMIN_CHAMADOS;
}

function _headers() {
    return { 'Authorization': 'Bearer ' + _token(), 'Content-Type': 'application/json' };
}

// Badge de notificacao
window.atualizarBadgeChamados = async function() {
    try {
        const r = await fetch(_apiBase() + '/chamados/notificacoes/count', {
            headers: { 'Authorization': 'Bearer ' + _token() }
        });
        if (!r.ok) return;
        const { count } = await r.json();
        const badge = document.getElementById('chamados-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch(e) {}
};

function _startPolling() {
    if (_pollingInterval) clearInterval(_pollingInterval);
    window.atualizarBadgeChamados();
    _pollingInterval = setInterval(window.atualizarBadgeChamados, 60000);
}

function _formatDate(dt) {
    if (!dt) return '-';
    let raw = dt;
    if (!raw.includes('T')) raw = raw.replace(' ', 'T');
    if (!raw.includes('Z') && !raw.includes('+')) raw += '-03:00';
    const d = new Date(raw);
    if (isNaN(d)) return dt;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function _statusBadge(status) {
    const map = {
        'Novo':                   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: 'ph-star' },
        'Aguardando Informacoes': { bg: '#fffbeb', color: '#b45309', border: '#fcd34d', icon: 'ph-hourglass' },
        'Respondido':             { bg: '#f0fdf4', color: '#15803d', border: '#86efac', icon: 'ph-chat-dots' },
        'Finalizado':             { bg: '#f8fafc', color: '#475569', border: '#cbd5e1', icon: 'ph-check-circle' }
    };
    const key = (status || '').replace('\u00e7\u00f5', 'co').replace('\u00e3', 'a');
    const s = map[key] || map['Novo'];
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:' + s.bg + ';color:' + s.color + ';border:1px solid ' + s.border + ';border-radius:20px;padding:3px 10px;font-size:0.75rem;font-weight:700;"><i class=\\"ph ' + s.icon + '\\"></i> ' + (status || '') + '</span>';
}

function _tipoBadge(tipo) {
    if (tipo === 'urgente') {
        return '<span style="background:#fef2f2;color:#b91c1c;border:1px solid #f87171;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:700;">🚨 Urgente</span>';
    }
    if (tipo === 'correcao') {
        return '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:700;">\uD83D\uDC1B Corre\u00e7\u00e3o</span>';
    }
    return '<span style="background:#f0fdf4;color:#16a34a;border:1px solid #86efac;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:700;">\u2728 Melhoria</span>';
}

function _escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Tela principal: lista de chamados
window.initChamados = async function() {
    const el = document.getElementById('content-chamados');
    if (!el) return;

    fetch(_apiBase() + '/chamados/notificacoes/marcar-lido', {
        method: 'POST', headers: _headers()
    }).then(() => window.atualizarBadgeChamados()).catch(() => {});

    el.innerHTML = '<div style="max-width:1100px;margin:0 auto;padding:24px 16px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">' +
            '<div><h1 style="margin:0;font-size:1.6rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:10px;"><i class="ph ph-ticket" style="color:#dc2626;font-size:1.4rem;"></i> Chamados</h1>' +
            '<p style="margin:4px 0 0;color:#64748b;font-size:0.88rem;">Gerencie melhorias e corre\u00e7\u00f5es do sistema</p></div>' +
            '<button id="btn-novo-chamado" onclick="window.abrirNovoChamado()" style="display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:700;font-size:0.9rem;cursor:pointer;box-shadow:0 4px 12px rgba(220,38,38,0.3);">' +
                '<i class="ph ph-plus-circle"></i> Novo Chamado</button></div>' +
        '<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">' +
            '<select id="filtro-chamados-tipo" onchange="window.renderListaChamados()" style="border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 12px;font-size:0.85rem;color:#334155;background:#fff;cursor:pointer;">' +
                '<option value="">Todos os tipos</option><option value="melhoria">\u2728 Melhoria</option><option value="correcao">\uD83D\uDC1B Corre\u00e7\u00e3o</option><option value="urgente">🚨 Urgente</option></select>' +
            '<select id="filtro-chamados-status" onchange="window.renderListaChamados()" style="border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 12px;font-size:0.85rem;color:#334155;background:#fff;cursor:pointer;">' +
                '<option value="">Todos os status</option><option value="Novo">Novo</option><option value="Aguardando Informa\u00e7\u00f5es">Aguardando Informa\u00e7\u00f5es</option><option value="Respondido">Respondido</option><option value="Finalizado">Finalizado</option></select>' +
            '<input id="filtro-chamados-busca" type="search" placeholder="Buscar chamado..." oninput="window.renderListaChamados()" style="flex:1;min-width:180px;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 12px;font-size:0.85rem;"></div>' +
        '<div id="chamados-lista-container"><div style="text-align:center;padding:60px;color:#94a3b8;"><i class="ph ph-spinner" style="font-size:2rem;"></i><br>Carregando...</div></div></div>';

    await window.renderListaChamados();
};

window._chamadosCache = [];

window.renderListaChamados = async function() {
    const container = document.getElementById('chamados-lista-container');
    if (!container) return;
    try {
        const r = await fetch(_apiBase() + '/chamados', { headers: { 'Authorization': 'Bearer ' + _token() } });
        if (!r.ok) throw new Error('Erro ao carregar chamados');
        let dados = await r.json();
        window._chamadosCache = dados;

        const tipo = (document.getElementById('filtro-chamados-tipo') || {}).value || '';
        const status = (document.getElementById('filtro-chamados-status') || {}).value || '';
        const busca = ((document.getElementById('filtro-chamados-busca') || {}).value || '').toLowerCase();
        if (tipo) dados = dados.filter(function(c) { return c.tipo === tipo; });
        if (status) dados = dados.filter(function(c) { return c.status === status; });
        if (busca) dados = dados.filter(function(c) { return (c.titulo||'').toLowerCase().includes(busca)||(c.descricao||'').toLowerCase().includes(busca); });

        if (dados.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8;"><i class="ph ph-ticket" style="font-size:3rem;opacity:0.3;"></i><p style="margin-top:12px;">Nenhum chamado encontrado.</p></div>';
            return;
        }

        container.innerHTML = dados.map(function(c) {
            return '<div onclick="window.verChamado(' + c.id + ')" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:10px;cursor:pointer;transition:all 0.15s;display:flex;align-items:flex-start;gap:16px;" onmouseover="this.style.borderColor=\'#94a3b8\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.06)\'" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.boxShadow=\'none\'">' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' + _tipoBadge(c.tipo) + ' ' + _statusBadge(c.status) + '<span style="color:#94a3b8;font-size:0.72rem;margin-left:auto;">#' + c.id + '</span></div>' +
                '<div style="font-weight:700;color:#0f172a;font-size:0.97rem;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _escHtml(c.titulo) + '</div>' +
                '<div style="color:#64748b;font-size:0.82rem;display:flex;gap:16px;flex-wrap:wrap;"><span><i class="ph ph-user"></i> ' + _escHtml(c.usuario_nome) + '</span><span><i class="ph ph-clock"></i> ' + _formatDate(c.criado_em) + '</span></div></div>' +
                '<i class="ph ph-caret-right" style="color:#94a3b8;font-size:1.2rem;flex-shrink:0;margin-top:4px;"></i></div>';
        }).join('');
    } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">' + _escHtml(e.message) + '</div>';
    }
};

// ── Ver chamado individual
window.verChamado = async function(id) {
    const el = document.getElementById('content-chamados');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:80px;color:#94a3b8;"><i class="ph ph-spinner" style="font-size:2rem;"></i><br>Carregando...</div>';
    try {
        const r = await fetch(_apiBase() + '/chamados/' + id, { headers: { 'Authorization': 'Bearer ' + _token() } });
        if (!r.ok) throw new Error('Erro ao carregar chamado');
        const c = await r.json();
        _chamadoAtual = c;
        _renderDetalhe(c);
    } catch(e) {
        el.innerHTML = '<div style="padding:24px;"><button onclick="window._fecharOuVoltar()" style="background:none;border:none;color:#2563eb;cursor:pointer;font-size:0.9rem;"><i class="ph ph-arrow-left"></i> Voltar</button><div style="color:#ef4444;margin-top:20px;">' + _escHtml(e.message) + '</div></div>';
    }
};

function _renderDetalhe(c) {
    const el = document.getElementById('content-chamados');
    if (!el) return;
    const isAdmin = _isAdmin();
    const id = c.id;

    const statusOpts = ['Novo','Aguardando Informa\u00e7\u00f5es','Respondido','Finalizado'].map(function(s) {
        return '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    const comentariosHtml = (c.comentarios || []).length === 0
        ? '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:0.88rem;">Nenhum coment\u00e1rio ainda.</div>'
        : (c.comentarios || []).map(function(cm) {
            const isAdminCm = cm.usuario_nome === ADMIN_CHAMADOS;
            return '<div style="display:flex;gap:12px;margin-bottom:20px;">' +
                '<div style="width:36px;height:36px;border-radius:50%;background:' + (isAdminCm ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)') + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.85rem;flex-shrink:0;">' +
                    (cm.usuario_nome || '?').charAt(0).toUpperCase() + '</div>' +
                '<div style="flex:1;background:' + (isAdminCm ? '#fef2f2' : '#f8fafc') + ';border:1px solid ' + (isAdminCm ? '#fca5a5' : '#e2e8f0') + ';border-radius:0 10px 10px 10px;padding:12px 14px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                '<span style="font-weight:700;color:#0f172a;font-size:0.85rem;">' + _escHtml(cm.usuario_nome) + '</span>' +
                (isAdminCm ? '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:10px;padding:1px 6px;font-size:0.65rem;font-weight:700;">Admin</span>' : '') +
                '<span style="color:#94a3b8;font-size:0.75rem;margin-left:auto;">' + _formatDate(cm.criado_em) + '</span></div>' +
                (cm.conteudo ? '<div style="color:#334155;font-size:0.9rem;line-height:1.5;white-space:pre-wrap;">' + _escHtml(cm.conteudo) + '</div>' : '') +
                (cm.imagem_url ? '<img src="' + cm.imagem_url + '" style="max-width:100%;max-height:400px;border-radius:8px;margin-top:8px;border:1px solid #e2e8f0;cursor:pointer;" onclick="window.open(this.src,\'_blank\')" alt="Imagem">' : '') +
                '</div></div>';
        }).join('');

    el.innerHTML = '<div style="max-width:900px;margin:0 auto;padding:24px 16px;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
            '<button onclick="window._fecharOuVoltar()" style="display:flex;align-items:center;gap:6px;background:none;border:1.5px solid #e2e8f0;color:#475569;border-radius:8px;padding:7px 14px;font-size:0.85rem;cursor:pointer;font-weight:600;"><i class="ph ph-arrow-left"></i> Voltar</button>' +
            '<span style="color:#94a3b8;font-size:0.85rem;">#' + c.id + '</span>' +
        '</div>' +
        '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 24px;margin-bottom:20px;">' +
            '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;">' + _tipoBadge(c.tipo) + ' ' + _statusBadge(c.status) + '</div>' +
            '<h2 style="margin:0 0 8px;font-size:1.2rem;font-weight:800;color:#0f172a;">' + _escHtml(c.titulo) + '</h2>' +
            (c.descricao ? '<p style="margin:0 0 12px;color:#475569;font-size:0.9rem;line-height:1.6;white-space:pre-wrap;">' + _escHtml(c.descricao) + '</p>' : '') +
            '<div style="display:flex;gap:16px;flex-wrap:wrap;color:#64748b;font-size:0.8rem;border-top:1px solid #f1f5f9;padding-top:12px;">' +
                '<span><i class="ph ph-user"></i> Aberto por: <b>' + _escHtml(c.usuario_nome) + '</b></span>' +
                '<span><i class="ph ph-calendar"></i> ' + _formatDate(c.criado_em) + '</span>' +
                '<span><i class="ph ph-clock-clockwise"></i> Atualizado: ' + _formatDate(c.atualizado_em) + '</span>' +
            '</div>' +
        '</div>' +
        (isAdmin ? '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
            '<span style="font-weight:700;color:#b45309;font-size:0.88rem;"><i class="ph ph-gear"></i> Status:</span>' +
            '<select id="select-status-chamado" style="border:1.5px solid #fcd34d;border-radius:8px;padding:6px 12px;font-size:0.88rem;background:#fff;cursor:pointer;">' + statusOpts + '</select>' +
            '<button onclick="window.mudarStatusChamado(' + id + ')" style="background:#b45309;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:0.85rem;font-weight:700;cursor:pointer;"><i class="ph ph-check"></i> Salvar</button>' +
        '</div>' : '') +
        '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px 24px;">' +
            '<h3 style="margin:0 0 20px;font-size:1rem;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-chat-dots" style="color:#2563eb;"></i> Coment\u00e1rios <span style="background:#eff6ff;color:#1d4ed8;border-radius:20px;padding:2px 10px;font-size:0.75rem;">' + (c.comentarios||[]).length + '</span></h3>' +
            '<div id="chamados-comentarios-lista">' + comentariosHtml + '</div>' +
            '<div style="border-top:1px solid #f1f5f9;margin-top:20px;padding-top:20px;" id="chamado-form-comentario">' +
                '<div id="chamado-img-preview" style="display:none;margin-bottom:10px;position:relative;">' +
                    '<img id="chamado-img-preview-img" style="max-height:180px;max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" alt="preview">' +
                    '<button onclick="window._removerImagemChamado()" style="position:absolute;top:4px;left:4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:0.75rem;">x</button>' +
                '</div>' +
                '<textarea id="chamado-comentario-texto" rows="3" placeholder="Escreva um coment\u00e1rio... (Ctrl+V para colar imagem)" style="width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;font-size:0.9rem;resize:vertical;font-family:inherit;" onpaste="window._handlePasteChamado(event)" onkeydown="if(event.ctrlKey&&event.key===\'Enter\')window.enviarComentarioChamado(' + id + ')"></textarea>' +
                '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
                    '<label style="display:flex;align-items:center;gap:6px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 12px;cursor:pointer;font-size:0.82rem;color:#475569;font-weight:600;"><i class="ph ph-image"></i> Anexar imagem<input type="file" id="chamado-file-input" accept="image/*" style="display:none;" onchange="window._handleFileChamado(event)"></label>' +
                    '<span style="color:#94a3b8;font-size:0.78rem;">ou Ctrl+V para colar</span>' +
                    '<button id="btn-enviar-comentario-' + id + '" onclick="window.enviarComentarioChamado(' + id + ')" style="margin-left:auto;display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;border-radius:8px;padding:9px 20px;font-weight:700;font-size:0.88rem;cursor:pointer;box-shadow:0 4px 10px rgba(37,99,235,0.25);"><i class="ph ph-paper-plane-tilt"></i> Enviar</button>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';

    setTimeout(function() {
        var ta = document.getElementById('chamado-comentario-texto');
        if (ta) ta.focus();
    }, 100);
}

window.mudarStatusChamado = async function(id) {
    var sel = document.getElementById('select-status-chamado');
    if (!sel) return;
    var status = sel.value;
    try {
        var r = await fetch(_apiBase() + '/chamados/' + id + '/status', {
            method: 'PUT', headers: _headers(), body: JSON.stringify({ status: status })
        });
        if (!r.ok) { var e = await r.json(); throw new Error(e.error || 'Erro'); }
        Swal.fire({ icon: 'success', title: 'Status atualizado!', timer: 1500, showConfirmButton: false });
        window.verChamado(id);
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

window.abrirNovoChamado = async function() {
    var result = await Swal.fire({
        title: 'Novo Chamado',
        html: '<div style="text-align:left;">' +
            '<div style="margin-bottom:14px;"><label style="font-weight:700;font-size:0.85rem;color:#475569;display:block;margin-bottom:6px;">Tipo *</label>' +
            '<div style="display:flex;gap:10px;">' +
            '<label id="lbl-melhoria" style="flex:1;border:2px solid #16a34a;border-radius:10px;padding:12px;cursor:pointer;text-align:center;background:#f0fdf4;">' +
                '<input type="radio" name="nctype" value="melhoria" checked style="display:none;">' +
                '<div style="font-size:1.3rem;">\u2728</div><div style="font-weight:700;color:#16a34a;font-size:0.88rem;margin-top:4px;">Melhoria</div></label>' +
            '<label id="lbl-correcao" style="flex:1;border:2px solid #e2e8f0;border-radius:10px;padding:12px;cursor:pointer;text-align:center;background:#fff;">' +
                '<input type="radio" name="nctype" value="correcao" style="display:none;">' +
                '<div style="font-size:1.3rem;">\uD83D\uDC1B</div><div style="font-weight:700;color:#dc2626;font-size:0.88rem;margin-top:4px;">Corre\u00e7\u00e3o</div></label>' +
            '<label id="lbl-urgente" style="flex:1;border:2px solid #e2e8f0;border-radius:10px;padding:12px;cursor:pointer;text-align:center;background:#fff;">' +
                '<input type="radio" name="nctype" value="urgente" style="display:none;">' +
                '<div style="font-size:1.3rem;">🚨</div><div style="font-weight:700;color:#b91c1c;font-size:0.88rem;margin-top:4px;">Urgente</div></label>' +
            '</div></div>' +
            '<div style="margin-bottom:14px;"><label style="font-weight:700;font-size:0.85rem;color:#475569;display:block;margin-bottom:6px;">T\u00edtulo *</label>' +
            '<input type="text" id="nc-titulo" placeholder="Descreva em poucas palavras..." style="width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:0.9rem;"></div>' +
            '<div><label style="font-weight:700;font-size:0.85rem;color:#475569;display:block;margin-bottom:6px;">Descri\u00e7\u00e3o (opcional)</label>' +
            '<textarea id="nc-desc" rows="4" placeholder="Detalhe o problema ou melhoria..." style="width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:0.9rem;resize:vertical;font-family:inherit;"></textarea></div>' +
            '</div>',
        showCancelButton: true,
        confirmButtonText: 'Abrir Chamado',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        width: 520,
        didOpen: function() {
            document.querySelectorAll('[name="nctype"]').forEach(function(inp) {
                inp.closest('label').addEventListener('click', function() {
                    document.getElementById('lbl-melhoria').style.borderColor = '#e2e8f0';
                    document.getElementById('lbl-melhoria').style.background = '#fff';
                    document.getElementById('lbl-correcao').style.borderColor = '#e2e8f0';
                    document.getElementById('lbl-correcao').style.background = '#fff';
                    document.getElementById('lbl-urgente').style.borderColor = '#e2e8f0';
                    document.getElementById('lbl-urgente').style.background = '#fff';
                    if (inp.value === 'melhoria') {
                        document.getElementById('lbl-melhoria').style.borderColor = '#16a34a';
                        document.getElementById('lbl-melhoria').style.background = '#f0fdf4';
                    } else if (inp.value === 'correcao') {
                        document.getElementById('lbl-correcao').style.borderColor = '#dc2626';
                        document.getElementById('lbl-correcao').style.background = '#fef2f2';
                    } else {
                        document.getElementById('lbl-urgente').style.borderColor = '#b91c1c';
                        document.getElementById('lbl-urgente').style.background = '#fef2f2';
                    }
                });
            });
            document.getElementById('nc-titulo').focus();
        },
        preConfirm: function() {
            var titulo = document.getElementById('nc-titulo').value.trim();
            var descricao = document.getElementById('nc-desc').value.trim();
            var tipoEl = document.querySelector('[name="nctype"]:checked');
            var tipo = tipoEl ? tipoEl.value : 'melhoria';
            if (!titulo) { Swal.showValidationMessage('Informe o t\u00edtulo'); return false; }
            return { titulo: titulo, descricao: descricao, tipo: tipo };
        }
    });
    if (!result.isConfirmed || !result.value) return;
    try {
        var r = await fetch(_apiBase() + '/chamados', {
            method: 'POST', headers: _headers(), body: JSON.stringify(result.value)
        });
        if (!r.ok) { var e = await r.json(); throw new Error(e.error || 'Erro'); }
        var res = await r.json();
        Swal.fire({ icon: 'success', title: 'Chamado aberto!', text: '#' + res.id, timer: 1800, showConfirmButton: false });
        await window.renderListaChamados();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};

window._imagemDataChamado = null;

window._handlePasteChamado = function(event) {
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            event.preventDefault();
            var blob = items[i].getAsFile();
            var reader = new FileReader();
            reader.onload = function(e) { window._mostrarPreviewImagem(e.target.result); };
            reader.readAsDataURL(blob);
            break;
        }
    }
};

window._handleFileChamado = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) { window._mostrarPreviewImagem(e.target.result); };
    reader.readAsDataURL(file);
};

window._mostrarPreviewImagem = function(dataUrl) {
    window._imagemDataChamado = dataUrl;
    var preview = document.getElementById('chamado-img-preview');
    var img = document.getElementById('chamado-img-preview-img');
    if (preview && img) { img.src = dataUrl; preview.style.display = 'block'; }
};

window._removerImagemChamado = function() {
    window._imagemDataChamado = null;
    var preview = document.getElementById('chamado-img-preview');
    if (preview) preview.style.display = 'none';
    var fi = document.getElementById('chamado-file-input');
    if (fi) fi.value = '';
};

window.enviarComentarioChamado = async function(id) {
    var ta = document.getElementById('chamado-comentario-texto');
    var conteudo = ta ? ta.value.trim() : '';
    var imagem_base64 = window._imagemDataChamado || null;
    if (!conteudo && !imagem_base64) {
        Swal.fire({ icon: 'warning', title: 'Coment\u00e1rio vazio', timer: 2000, showConfirmButton: false });
        return;
    }
    var btn = document.getElementById('btn-enviar-comentario-' + id);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner"></i> Enviando...'; }
    try {
        var r = await fetch(_apiBase() + '/chamados/' + id + '/comentarios', {
            method: 'POST', headers: _headers(),
            body: JSON.stringify({ conteudo: conteudo, imagem_base64: imagem_base64 })
        });
        if (!r.ok) { var e = await r.json(); throw new Error(e.error || 'Erro'); }
        window._imagemDataChamado = null;
        window.verChamado(id);
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar'; }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(_startPolling, 3000);
});
window.initChamadosPolling = _startPolling;

    // Voltar da lista -> fechar overlay; dentro de um chamado -> volta para a lista
    window._fecharOuVoltar = function() {
        if (_chamadoAtual) {
            _chamadoAtual = null;
            window.initChamados();
        } else {
            window.fecharTelaChamados();
        }
    };

})();