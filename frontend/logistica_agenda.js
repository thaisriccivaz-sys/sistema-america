// ═══════════════════════════════════════════════════════════════
// MÓDULO: AGENDA LOGÍSTICA
// ═══════════════════════════════════════════════════════════════

(function() {
    const API = '/api';
    let agendaCurrentDate = new Date();
    let agendaCards = [];
    let agendaColabs = [];

    // ── Utilitários de data ─────────────────────────────────────
    function fmtDate(d) {
        const dt = new Date(d + 'T12:00:00');
        return dt.toLocaleDateString('pt-BR');
    }
    function isoDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
    function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }

    const TIPOS = [
        { value: 'aviso', label: 'Aviso Geral', icon: 'ph-bell', color: '#f59e0b' },
        { value: 'falta', label: 'Aviso de Falta', icon: 'ph-user-minus', color: '#ef4444' },
        { value: 'reuniao', label: 'Reunião', icon: 'ph-users', color: '#3b82f6' },
        { value: 'tarefa', label: 'Tarefa', icon: 'ph-check-square', color: '#10b981' },
        { value: 'email', label: 'Envio de E-mail', icon: 'ph-envelope', color: '#8b5cf6' },
        { value: 'outro', label: 'Outro', icon: 'ph-calendar', color: '#6b7280' },
    ];

    function getTipo(v) { return TIPOS.find(t => t.value === v) || TIPOS[5]; }

    // ── Carregar colaboradores para o seletor ───────────────────
    async function carregarColabs() {
        try {
            const r = await fetch(`${API}/colaboradores`, { headers: { Authorization: `Bearer ${window.currentToken}` } });
            if (!r.ok) return;
            agendaColabs = await r.json();
        } catch(e) {}
    }

    // ── API da Agenda ───────────────────────────────────────────
    async function carregarCards(ano, mes) {
        try {
            const r = await fetch(`${API}/logistica/agenda?ano=${ano}&mes=${mes+1}`, {
                headers: { Authorization: `Bearer ${window.currentToken}` }
            });
            if (!r.ok) return [];
            return await r.json();
        } catch(e) { return []; }
    }

    async function salvarCard(data) {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? `${API}/logistica/agenda/${data.id}` : `${API}/logistica/agenda`;
        const r = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${window.currentToken}` },
            body: JSON.stringify(data)
        });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    async function excluirCard(id) {
        const r = await fetch(`${API}/logistica/agenda/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${window.currentToken}` }
        });
        if (!r.ok) throw new Error(await r.text());
    }

    // ── Renderização ────────────────────────────────────────────
    window.renderAgendaLogistica = async function() {
        const container = document.getElementById('logistica-agenda-container');
        if (!container) return;

        await carregarColabs();

        const ano = agendaCurrentDate.getFullYear();
        const mes = agendaCurrentDate.getMonth();
        agendaCards = await carregarCards(ano, mes);

        container.innerHTML = buildAgendaHTML(ano, mes);
        attachAgendaEvents();
    };

    function buildAgendaHTML(ano, mes) {
        const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const dias = daysInMonth(ano, mes);
        const primeiro = firstDayOfMonth(ano, mes);
        const hoje = isoDate(new Date());

        let cells = '';
        // Dias vazios antes do 1
        for (let i = 0; i < primeiro; i++) {
            cells += `<div class="ag-cell ag-empty"></div>`;
        }

        for (let d = 1; d <= dias; d++) {
            const dateStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isHoje = dateStr === hoje;
            const cardsDay = agendaCards.filter(c => c.data === dateStr);
            const badges = cardsDay.slice(0,3).map(c => {
                const t = getTipo(c.tipo);
                return `<div class="ag-badge" style="background:${t.color}22;color:${t.color};border-left:3px solid ${t.color};"
                    onclick="abrirCardDetalhes(${c.id})" title="${c.titulo || c.tipo}">
                    <i class="ph ${t.icon}" style="font-size:0.7rem;"></i>
                    <span>${(c.titulo || t.label).substring(0,20)}</span>
                </div>`;
            }).join('');
            const mais = cardsDay.length > 3 ? `<div class="ag-mais">+${cardsDay.length - 3} mais</div>` : '';

            cells += `<div class="ag-cell ${isHoje ? 'ag-hoje' : ''}" data-date="${dateStr}" onclick="abrirNovoCard('${dateStr}')">
                <div class="ag-day-num ${isHoje ? 'ag-hoje-num' : ''}">${d}</div>
                <div class="ag-badges">${badges}${mais}</div>
            </div>`;
        }

        return `
        <div class="ag-wrap">
            <div class="ag-header">
                <div class="ag-header-left">
                    <button class="ag-nav-btn" onclick="agendaNavMes(-1)"><i class="ph ph-caret-left"></i></button>
                    <h2 class="ag-titulo">${meses[mes]} ${ano}</h2>
                    <button class="ag-nav-btn" onclick="agendaNavMes(1)"><i class="ph ph-caret-right"></i></button>
                    <button class="ag-nav-btn ag-hoje-btn" onclick="agendaIrHoje()" title="Hoje">
                        <i class="ph ph-calendar-blank"></i> Hoje
                    </button>
                </div>
                <div class="ag-header-right">
                    <button class="ag-btn-novo" onclick="abrirNovoCard('')">
                        <i class="ph ph-plus"></i> Novo Card
                    </button>
                </div>
            </div>

            <div class="ag-weekdays">
                <div>Dom</div><div>Seg</div><div>Ter</div>
                <div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
            </div>
            <div class="ag-grid">${cells}</div>
        </div>

        <!-- Modal de Card -->
        <div id="ag-modal-overlay" style="display:none;" onclick="fecharAgendaModal(event)">
            <div class="ag-modal" onclick="event.stopPropagation()">
                <div class="ag-modal-header">
                    <span id="ag-modal-title">Novo Card</span>
                    <button onclick="fecharAgendaModal()" class="ag-modal-close"><i class="ph ph-x"></i></button>
                </div>
                <div class="ag-modal-body" id="ag-modal-body"></div>
            </div>
        </div>

        <style>
        .ag-wrap { padding: 1.5rem; min-height: 100%; background: #f0f4f8; }
        .ag-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem; }
        .ag-header-left { display:flex; align-items:center; gap:0.5rem; }
        .ag-titulo { font-size:1.4rem; font-weight:700; color:#1e293b; margin:0; min-width:180px; text-align:center; }
        .ag-nav-btn { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; cursor:pointer; color:#475569; font-size:0.88rem; display:flex;align-items:center;gap:4px; transition:all 0.2s; }
        .ag-nav-btn:hover { background:#2d9e5f; color:#fff; border-color:#2d9e5f; }
        .ag-hoje-btn { font-weight:600; }
        .ag-btn-novo { background:linear-gradient(135deg,#2d9e5f,#1a7a46); color:#fff; border:none; border-radius:10px; padding:8px 18px; font-weight:600; cursor:pointer; display:flex;align-items:center;gap:6px; box-shadow:0 2px 8px rgba(45,158,95,0.35); transition:all 0.2s; }
        .ag-btn-novo:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(45,158,95,0.45); }
        .ag-weekdays { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-weight:600; font-size:0.8rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; padding-bottom:0.4rem; border-bottom:2px solid #e2e8f0; margin-bottom:0.5rem; }
        .ag-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
        .ag-cell { background:#fff; border-radius:10px; min-height:110px; padding:6px; cursor:pointer; transition:all 0.2s; border:2px solid transparent; position:relative; overflow:hidden; }
        .ag-cell:hover { border-color:#2d9e5f; box-shadow:0 2px 8px rgba(45,158,95,0.15); }
        .ag-cell.ag-empty { background:transparent; cursor:default; }
        .ag-cell.ag-hoje { border-color:#2d9e5f; background:#f0fdf4; }
        .ag-day-num { font-size:0.85rem; font-weight:600; color:#475569; margin-bottom:4px; }
        .ag-hoje-num { background:#2d9e5f; color:#fff; width:22px; height:22px; border-radius:50%; display:flex;align-items:center;justify-content:center; font-size:0.78rem; }
        .ag-badges { display:flex; flex-direction:column; gap:2px; }
        .ag-badge { font-size:0.7rem; padding:2px 5px; border-radius:4px; font-weight:600; display:flex;align-items:center;gap:3px; cursor:pointer; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .ag-mais { font-size:0.68rem; color:#94a3b8; font-style:italic; margin-top:1px; }
        /* Modal */
        #ag-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; backdrop-filter:blur(3px); }
        .ag-modal { background:#fff; border-radius:16px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 25px 60px rgba(0,0,0,0.3); animation:agSlideIn 0.25s ease; }
        @keyframes agSlideIn { from { transform:translateY(-20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        .ag-modal-header { display:flex; justify-content:space-between; align-items:center; padding:1.2rem 1.5rem; background:linear-gradient(135deg,#1e293b,#334155); border-radius:16px 16px 0 0; }
        .ag-modal-header span { color:#fff; font-weight:700; font-size:1.05rem; }
        .ag-modal-close { background:rgba(255,255,255,0.15); border:none; border-radius:8px; color:#fff; width:30px;height:30px; cursor:pointer; display:flex;align-items:center;justify-content:center; font-size:1rem; transition:background 0.2s; }
        .ag-modal-close:hover { background:rgba(255,255,255,0.3); }
        .ag-modal-body { padding:1.5rem; }
        .ag-field { margin-bottom:1rem; }
        .ag-field label { display:block; font-weight:600; font-size:0.82rem; color:#475569; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; }
        .ag-field input, .ag-field select, .ag-field textarea { width:100%; border:1.5px solid #e2e8f0; border-radius:8px; padding:8px 12px; font-size:0.9rem; color:#1e293b; background:#f8fafc; transition:border-color 0.2s; box-sizing:border-box; }
        .ag-field input:focus, .ag-field select:focus, .ag-field textarea:focus { outline:none; border-color:#2d9e5f; background:#fff; }
        .ag-field textarea { resize:vertical; min-height:70px; }
        .ag-tipos-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        .ag-tipo-btn { border:2px solid #e2e8f0; border-radius:8px; padding:8px 6px; cursor:pointer; background:#f8fafc; text-align:center; font-size:0.75rem; font-weight:600; transition:all 0.2s; display:flex;flex-direction:column;align-items:center;gap:4px; color:#475569; }
        .ag-tipo-btn.active { border-width:2px; color:#fff; }
        .ag-tipo-btn i { font-size:1.1rem; }
        .ag-responsaveis-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
        .ag-resp-chip { display:flex; align-items:center; gap:5px; background:#e0f2fe; color:#0284c7; border-radius:20px; padding:4px 10px; font-size:0.78rem; font-weight:600; }
        .ag-resp-chip button { background:none; border:none; color:#0369a1; cursor:pointer; padding:0; font-size:0.8rem; line-height:1; }
        .ag-acoes-grid { display:flex; flex-direction:column; gap:6px; margin-top:6px; }
        .ag-acao-item { display:flex; align-items:center; gap:8px; padding:6px 10px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer; transition:all 0.2s; }
        .ag-acao-item.selected { background:#f0fdf4; border-color:#2d9e5f; }
        .ag-acao-item input[type=checkbox] { accent-color:#2d9e5f; width:14px;height:14px; }
        .ag-footer { display:flex; gap:8px; justify-content:flex-end; margin-top:1.2rem; padding-top:1rem; border-top:1px solid #e2e8f0; }
        .ag-btn-save { background:#2d9e5f; color:#fff; border:none; border-radius:8px; padding:9px 22px; font-weight:700; cursor:pointer; transition:all 0.2s; }
        .ag-btn-save:hover { background:#1a7a46; }
        .ag-btn-del { background:#fee2e2; color:#ef4444; border:none; border-radius:8px; padding:9px 16px; font-weight:600; cursor:pointer; }
        .ag-btn-del:hover { background:#ef4444; color:#fff; }
        .ag-btn-cancel { background:#f1f5f9; color:#475569; border:none; border-radius:8px; padding:9px 16px; font-weight:600; cursor:pointer; }
        </style>`;
    }

    function attachAgendaEvents() {}

    // ── Navegação de mês ────────────────────────────────────────
    window.agendaNavMes = function(delta) {
        agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() + delta);
        window.renderAgendaLogistica();
    };
    window.agendaIrHoje = function() {
        agendaCurrentDate = new Date();
        window.renderAgendaLogistica();
    };

    // ── Abrir modal de NOVO card ────────────────────────────────
    window.abrirNovoCard = function(dateStr) {
        mostrarFormCard({ data: dateStr });
    };

    // ── Abrir detalhes de card existente ────────────────────────
    window.abrirCardDetalhes = function(id) {
        const card = agendaCards.find(c => c.id === id);
        if (!card) return;
        mostrarFormCard(card);
    };

    function mostrarFormCard(card) {
        const overlay = document.getElementById('ag-modal-overlay');
        const body = document.getElementById('ag-modal-body');
        const titleEl = document.getElementById('ag-modal-title');
        if (!overlay || !body) return;

        const isEdicao = !!card.id;
        titleEl.textContent = isEdicao ? 'Editar Card' : 'Novo Card';

        const responsaveisSelecionados = card.responsaveis ? JSON.parse(card.responsaveis) : [];
        const acoesSelecionadas = card.acoes ? JSON.parse(card.acoes) : [];
        const tipoAtual = card.tipo || 'aviso';

        const ACOES_DISPONIVEIS = [
            { value: 'enviar_email', label: 'Enviar e-mail para os responsáveis', icon: 'ph-envelope' },
            { value: 'notificar_sistema', label: 'Notificação no sistema', icon: 'ph-bell' },
        ];

        const tiposHTML = TIPOS.map(t => `
            <div class="ag-tipo-btn ${tipoAtual === t.value ? 'active' : ''}"
                style="${tipoAtual === t.value ? `background:${t.color};border-color:${t.color};` : `--hover-color:${t.color};`}"
                onclick="agendaSelectTipo('${t.value}','${t.color}')"
                data-tipo="${t.value}">
                <i class="ph ${t.icon}"></i>${t.label}
            </div>`).join('');

        const respHTML = responsaveisSelecionados.map(id => {
            const c = agendaColabs.find(x => x.id == id);
            return c ? `<div class="ag-resp-chip" data-id="${id}">
                <i class="ph ph-user"></i>${c.nome_completo.split(' ')[0]}
                <button onclick="agendaRemoveResp(${id})"><i class="ph ph-x"></i></button>
            </div>` : '';
        }).join('');

        const acoesHTML = ACOES_DISPONIVEIS.map(a => `
            <div class="ag-acao-item ${acoesSelecionadas.includes(a.value) ? 'selected' : ''}"
                onclick="agendaToggleAcao('${a.value}',this)">
                <input type="checkbox" ${acoesSelecionadas.includes(a.value) ? 'checked' : ''}
                    onclick="event.stopPropagation()" id="acao_${a.value}" value="${a.value}">
                <i class="ph ${a.icon}"></i>
                <span>${a.label}</span>
            </div>`).join('');

        const colabOptions = agendaColabs.map(c =>
            `<option value="${c.id}">${c.nome_completo}</option>`
        ).join('');

        body.innerHTML = `
            <div class="ag-field">
                <label>Tipo de Card</label>
                <div class="ag-tipos-grid" id="ag-tipos-grid">${tiposHTML}</div>
                <input type="hidden" id="ag-tipo-val" value="${tipoAtual}">
            </div>
            <div class="ag-field">
                <label>Título</label>
                <input type="text" id="ag-titulo" placeholder="Ex: Reunião de equipe, Falta do João..." value="${card.titulo || ''}">
            </div>
            <div class="ag-field">
                <label>Data</label>
                <input type="date" id="ag-data" value="${card.data || ''}">
            </div>
            <div class="ag-field">
                <label>Descrição / Observação</label>
                <textarea id="ag-descricao" placeholder="Descreva o que deve ser registrado...">${card.descricao || ''}</textarea>
            </div>
            <div class="ag-field">
                <label>Responsáveis pelo card</label>
                <select id="ag-resp-select" onchange="agendaAddResp(this.value)">
                    <option value="">— Adicionar colaborador —</option>
                    ${colabOptions}
                </select>
                <div class="ag-responsaveis-list" id="ag-resp-list">${respHTML}</div>
            </div>
            <div class="ag-field">
                <label>Ações a disparar na data</label>
                <div class="ag-acoes-grid" id="ag-acoes-grid">${acoesHTML}</div>
            </div>
            <div class="ag-footer">
                ${isEdicao ? `<button class="ag-btn-del" onclick="agendaExcluirCard(${card.id})"><i class="ph ph-trash"></i> Excluir</button>` : ''}
                <button class="ag-btn-cancel" onclick="fecharAgendaModal()">Cancelar</button>
                <button class="ag-btn-save" onclick="agendaSalvarCard(${card.id || 'null'})">
                    <i class="ph ph-floppy-disk"></i> ${isEdicao ? 'Salvar' : 'Criar Card'}
                </button>
            </div>`;

        overlay.style.display = 'flex';
    }

    window.fecharAgendaModal = function(e) {
        if (e && e.target !== document.getElementById('ag-modal-overlay')) return;
        const ov = document.getElementById('ag-modal-overlay');
        if (ov) ov.style.display = 'none';
    };

    window.agendaSelectTipo = function(val, color) {
        document.getElementById('ag-tipo-val').value = val;
        document.querySelectorAll('.ag-tipo-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = '';
            b.style.borderColor = '';
            b.style.color = '';
        });
        const btn = document.querySelector(`.ag-tipo-btn[data-tipo="${val}"]`);
        if (btn) {
            btn.classList.add('active');
            btn.style.background = color;
            btn.style.borderColor = color;
            btn.style.color = '#fff';
        }
    };

    window.agendaAddResp = function(id) {
        if (!id) return;
        const list = document.getElementById('ag-resp-list');
        if (!list) return;
        if (list.querySelector(`[data-id="${id}"]`)) return; // já existe
        const c = agendaColabs.find(x => x.id == id);
        if (!c) return;
        const chip = document.createElement('div');
        chip.className = 'ag-resp-chip';
        chip.dataset.id = id;
        chip.innerHTML = `<i class="ph ph-user"></i>${c.nome_completo.split(' ')[0]}
            <button onclick="agendaRemoveResp(${id})"><i class="ph ph-x"></i></button>`;
        list.appendChild(chip);
        document.getElementById('ag-resp-select').value = '';
    };

    window.agendaRemoveResp = function(id) {
        const chip = document.querySelector(`#ag-resp-list [data-id="${id}"]`);
        if (chip) chip.remove();
    };

    window.agendaToggleAcao = function(val, el) {
        el.classList.toggle('selected');
        const cb = el.querySelector('input[type=checkbox]');
        if (cb) cb.checked = !cb.checked;
    };

    window.agendaSalvarCard = async function(idExistente) {
        const titulo = document.getElementById('ag-titulo')?.value.trim();
        const data = document.getElementById('ag-data')?.value;
        const descricao = document.getElementById('ag-descricao')?.value.trim();
        const tipo = document.getElementById('ag-tipo-val')?.value || 'aviso';

        if (!data) { showToast('Selecione uma data para o card.', 'error'); return; }

        const respChips = document.querySelectorAll('#ag-resp-list [data-id]');
        const responsaveis = JSON.stringify(Array.from(respChips).map(c => parseInt(c.dataset.id)));

        const acoesChecked = document.querySelectorAll('#ag-acoes-grid .ag-acao-item.selected');
        const acoes = JSON.stringify(Array.from(acoesChecked).map(el => el.querySelector('input').value));

        const payload = { titulo, data, descricao, tipo, responsaveis, acoes, setor: 'logistica' };
        if (idExistente) payload.id = idExistente;

        try {
            await salvarCard(payload);
            showToast(idExistente ? 'Card atualizado!' : 'Card criado!', 'success');
            const ov = document.getElementById('ag-modal-overlay');
            if (ov) ov.style.display = 'none';
            await window.renderAgendaLogistica();
        } catch(e) {
            showToast('Erro ao salvar: ' + e.message, 'error');
        }
    };

    window.agendaExcluirCard = async function(id) {
        if (!confirm('Excluir este card da agenda?')) return;
        try {
            await excluirCard(id);
            showToast('Card excluído.', 'success');
            const ov = document.getElementById('ag-modal-overlay');
            if (ov) ov.style.display = 'none';
            await window.renderAgendaLogistica();
        } catch(e) {
            showToast('Erro ao excluir: ' + e.message, 'error');
        }
    };

})();
