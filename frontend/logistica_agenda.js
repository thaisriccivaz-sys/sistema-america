// ═══════════════════════════════════════════════════════════════
// MÓDULO: AGENDA LOGÍSTICA v3
// ═══════════════════════════════════════════════════════════════
(function() {
    const API = '/api';
    let agendaCurrentDate = new Date();
    let agendaViewMode = 'mes'; // 'dia', 'semana', 'mes'
    let agendaCards = [];
    let agendaColabs = [];

    function isoDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
    function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }
    function getStartOfWeek(d) {
        const dt = new Date(d);
        const day = dt.getDay();
        dt.setDate(dt.getDate() - day);
        return dt;
    }

    const TIPOS = [
        { value: 'aviso',   label: 'Aviso Geral',    icon: 'ph-bell',          color: '#f59e0b' },
        { value: 'falta',   label: 'Aviso de Falta', icon: 'ph-user-minus',    color: '#ef4444' },
        { value: 'reuniao', label: 'Reunião',         icon: 'ph-users',         color: '#3b82f6' },
        { value: 'tarefa',  label: 'Tarefa',          icon: 'ph-check-square',  color: '#10b981' },
        { value: 'email',   label: 'Envio de E-mail', icon: 'ph-envelope',      color: '#8b5cf6' },
        { value: 'outro',   label: 'Outro',           icon: 'ph-calendar',      color: '#6b7280' },
    ];
    function getTipo(v) { return TIPOS.find(t => t.value === v) || TIPOS[5]; }

    async function carregarColabs() {
        try {
            const r = await fetch(`${API}/colaboradores`, { headers: { Authorization: `Bearer ${window.currentToken}` } });
            if (!r.ok) return;
            agendaColabs = await r.json();
        } catch(e) {}
    }

    async function carregarCards(inicio, fim) {
        try {
            const r = await fetch(`${API}/logistica/agenda?inicio=${inicio}&fim=${fim}`, {
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

    // ── Renderização principal ──────────────────────────────────
    window.renderAgendaLogistica = async function() {
        const container = document.getElementById('logistica-agenda-container');
        if (!container) return;
        await carregarColabs();
        
        let inicio, fim;
        if (agendaViewMode === 'mes') {
            const ano = agendaCurrentDate.getFullYear();
            const mes = agendaCurrentDate.getMonth();
            inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
            fim = `${ano}-${String(mes+1).padStart(2,'0')}-${daysInMonth(ano, mes)}`;
        } else if (agendaViewMode === 'semana') {
            const start = getStartOfWeek(agendaCurrentDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            inicio = isoDate(start);
            fim = isoDate(end);
        } else {
            inicio = isoDate(agendaCurrentDate);
            fim = inicio;
        }

        agendaCards = await carregarCards(inicio, fim);
        container.innerHTML = buildAgendaHTML();
    };

    function buildAgendaHTML() {
        let diasRender = [];
        const dt = new Date(agendaCurrentDate);
        const ano = dt.getFullYear();
        const mes = dt.getMonth();
        const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
        let titulo = '';
        const hoje = isoDate(new Date());

        if (agendaViewMode === 'mes') {
            titulo = `${meses[mes]} ${ano}`;
            const dias = daysInMonth(ano, mes);
            const primeiro = firstDayOfMonth(ano, mes);
            for (let i = 0; i < primeiro; i++) diasRender.push(null);
            for (let d = 1; d <= dias; d++) diasRender.push(new Date(ano, mes, d));
        } else if (agendaViewMode === 'semana') {
            const start = getStartOfWeek(dt);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            if (start.getMonth() === end.getMonth()) {
                titulo = `${start.getDate()} a ${end.getDate()} de ${meses[start.getMonth()]} ${start.getFullYear()}`;
            } else {
                titulo = `${start.getDate()} de ${meses[start.getMonth()]} a ${end.getDate()} de ${meses[end.getMonth()]} ${end.getFullYear()}`;
            }
            for (let i = 0; i < 7; i++) {
                const cur = new Date(start);
                cur.setDate(cur.getDate() + i);
                diasRender.push(cur);
            }
        } else if (agendaViewMode === 'dia') {
            titulo = `${dayNames[dt.getDay()]}, ${dt.getDate()} de ${meses[dt.getMonth()]} ${dt.getFullYear()}`;
            diasRender.push(new Date(dt));
        }

        let cells = '';
        for (const dObj of diasRender) {
            if (!dObj) {
                cells += `<div class="ag-cell ag-empty"></div>`;
                continue;
            }
            const dateStr = isoDate(dObj);
            const isHoje = dateStr === hoje;
            const cardsDay = agendaCards.filter(c => c.data === dateStr)
                .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

            const limit = agendaViewMode === 'mes' ? 3 : 999;
            const badges = cardsDay.slice(0, limit).map(c => {
                const t = getTipo(c.tipo);
                const hora = c.horario ? `<span style="opacity:0.8;margin-right:4px;font-weight:700;">${c.horario}</span>` : '';
                return `<div class="ag-badge" style="background:${t.color}22;color:${t.color};border-left:3px solid ${t.color};"
                    onclick="event.stopPropagation();abrirCardDetalhes(${c.id})" title="${c.titulo||t.label}">
                    <i class="ph ${t.icon}" style="font-size:0.8rem;flex-shrink:0;"></i>
                    ${hora}<span style="overflow:hidden;text-overflow:ellipsis;">${(c.titulo||t.label)}</span>
                </div>`;
            }).join('');
            const mais = cardsDay.length > limit ? `<div class="ag-mais">+${cardsDay.length - limit} mais</div>` : '';

            let headerText = '';
            if (agendaViewMode === 'semana') {
                const curDayName = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dObj.getDay()];
                headerText = `<div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700;">${curDayName}</div>`;
            }

            cells += `<div class="ag-cell ${isHoje?'ag-hoje':''} mode-${agendaViewMode}" data-date="${dateStr}" onclick="abrirNovoCard('${dateStr}')">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    ${headerText}
                    <div class="ag-day-num ${isHoje?'ag-hoje-num':''}">${dObj.getDate()}</div>
                </div>
                <div class="ag-badges mode-${agendaViewMode}">${badges}${mais}</div>
            </div>`;
        }

        let weekdaysHTML = '';
        if (agendaViewMode === 'mes') {
            weekdaysHTML = `<div class="ag-weekdays"><div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>`;
        }

        return `<div class="ag-wrap">
            <div class="ag-header">
                <div class="ag-header-left">
                    <button class="ag-nav-btn" onclick="agendaNav(-1)"><i class="ph ph-caret-left"></i></button>
                    <h2 class="ag-titulo">${titulo}</h2>
                    <button class="ag-nav-btn" onclick="agendaNav(1)"><i class="ph ph-caret-right"></i></button>
                    <button class="ag-nav-btn ag-hoje-btn" onclick="agendaIrHoje()"><i class="ph ph-calendar-blank"></i> Hoje</button>
                </div>
                <div class="ag-header-right">
                    <div class="ag-view-toggles">
                        <button class="ag-view-btn ${agendaViewMode==='dia'?'active':''}" onclick="agendaSetView('dia')">Dia</button>
                        <button class="ag-view-btn ${agendaViewMode==='semana'?'active':''}" onclick="agendaSetView('semana')">Semana</button>
                        <button class="ag-view-btn ${agendaViewMode==='mes'?'active':''}" onclick="agendaSetView('mes')">Mês</button>
                    </div>
                    <button class="ag-btn-novo" onclick="abrirNovoCard('')"><i class="ph ph-plus"></i> Novo Card</button>
                </div>
            </div>
            ${weekdaysHTML}
            <div class="ag-grid grid-${agendaViewMode}">${cells}</div>
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
        .ag-wrap{padding:1.5rem;min-height:100%;background:#f0f4f8;}
        .ag-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:.5rem;}
        .ag-header-left{display:flex;align-items:center;gap:.5rem;}
        .ag-header-right{display:flex;align-items:center;}
        .ag-titulo{font-size:1.4rem;font-weight:700;color:#1e293b;margin:0;min-width:180px;text-align:center;}
        .ag-nav-btn{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;cursor:pointer;color:#475569;font-size:.88rem;display:flex;align-items:center;gap:4px;transition:all .2s;}
        .ag-nav-btn:hover{background:#2d9e5f;color:#fff;border-color:#2d9e5f;}
        .ag-hoje-btn{font-weight:600;}
        .ag-view-toggles { display: flex; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin-right: 12px; padding: 2px; }
        .ag-view-btn { border: none; background: transparent; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #64748b; transition: all 0.2s; }
        .ag-view-btn.active { background: #fff; color: #2d9e5f; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .ag-btn-novo{background:linear-gradient(135deg,#2d9e5f,#1a7a46);color:#fff;border:none;border-radius:10px;padding:8px 18px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(45,158,95,.35);transition:all .2s;}
        .ag-btn-novo:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(45,158,95,.45);}
        .ag-weekdays{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-weight:600;font-size:.8rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;padding-bottom:.4rem;border-bottom:2px solid #e2e8f0;margin-bottom:.5rem;}
        .ag-grid.grid-mes { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .ag-grid.grid-semana { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .ag-grid.grid-dia { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .ag-cell{background:#fff;border-radius:10px;padding:6px;cursor:pointer;transition:all .2s;border:2px solid transparent;position:relative;overflow:hidden;}
        .ag-cell:hover{border-color:#2d9e5f;box-shadow:0 2px 8px rgba(45,158,95,.15);}
        .ag-cell.ag-empty{background:transparent;cursor:default;border:none;}
        .ag-cell.ag-hoje{border-color:#2d9e5f;background:#f0fdf4;}
        .ag-cell.mode-mes { min-height: 110px; }
        .ag-cell.mode-semana { min-height: 350px; padding: 10px; }
        .ag-cell.mode-dia { min-height: 450px; padding: 16px; }
        .ag-day-num{font-size:.85rem;font-weight:600;color:#475569;}
        .ag-cell.mode-dia .ag-day-num { display: none; }
        .ag-hoje-num{background:#2d9e5f;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.78rem;}
        .ag-badges{display:flex;flex-direction:column;gap:4px;}
        .ag-badge{padding:4px 6px;border-radius:6px;font-weight:600;display:flex;align-items:center;gap:4px;cursor:pointer;overflow:hidden;white-space:nowrap;}
        .ag-badge:hover{filter:brightness(.92);}
        .ag-badges.mode-mes .ag-badge { font-size: 0.68rem; padding:2px 5px; border-radius:4px; }
        .ag-badges.mode-semana .ag-badge { font-size: 0.78rem; padding: 6px 8px; margin-bottom: 2px; }
        .ag-badges.mode-dia .ag-badge { font-size: 0.9rem; padding: 10px 14px; margin-bottom: 4px; border-radius: 8px; border-left-width: 4px !important; }
        .ag-mais{font-size:.65rem;color:#94a3b8;font-style:italic;margin-top:1px;}
        
        #ag-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(3px);}
        .ag-modal{background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);animation:agSlideIn .25s ease;}
        @keyframes agSlideIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .ag-modal-header{display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1;}
        .ag-modal-header span{color:#fff;font-weight:700;font-size:1.05rem;}
        .ag-modal-close{background:rgba(255,255,255,.15);border:none;border-radius:8px;color:#fff;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:background .2s;}
        .ag-modal-close:hover{background:rgba(255,255,255,.3);}
        .ag-modal-body{padding:1.5rem;}
        .ag-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .ag-field{margin-bottom:1rem;}
        .ag-field label{display:block;font-weight:600;font-size:.82rem;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
        .ag-field input,.ag-field select,.ag-field textarea{width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:.9rem;color:#1e293b;background:#f8fafc;transition:border-color .2s;box-sizing:border-box;font-family:inherit;}
        .ag-field input:focus,.ag-field select:focus,.ag-field textarea:focus{outline:none;border-color:#2d9e5f;background:#fff;}
        .ag-field textarea{resize:vertical;min-height:70px;}
        .ag-tipos-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
        .ag-tipo-btn{border:2px solid #e2e8f0;border-radius:8px;padding:8px 6px;cursor:pointer;background:#f8fafc;text-align:center;font-size:.75rem;font-weight:600;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:4px;color:#475569;}
        .ag-tipo-btn.active{border-width:2px;color:#fff;}
        .ag-tipo-btn i{font-size:1.1rem;}
        .ag-chips-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;min-height:28px;}
        .ag-chip-resp{display:flex;align-items:center;gap:5px;background:#e0f2fe;color:#0284c7;border-radius:20px;padding:4px 10px;font-size:.78rem;font-weight:600;}
        .ag-chip-ref{display:flex;align-items:center;gap:5px;background:#fef3c7;color:#92400e;border-radius:20px;padding:4px 10px;font-size:.78rem;font-weight:600;}
        .ag-chip-resp button,.ag-chip-ref button{background:none;border:none;cursor:pointer;padding:0;font-size:.8rem;line-height:1;color:inherit;opacity:.7;}
        .ag-chip-resp button:hover,.ag-chip-ref button:hover{opacity:1;}
        .ag-acoes-grid{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
        .ag-acao-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;transition:all .2s;}
        .ag-acao-item.selected{background:#f0fdf4;border-color:#2d9e5f;}
        .ag-acao-item input[type=checkbox]{accent-color:#2d9e5f;width:14px;height:14px;}
        .ag-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:1.2rem;padding-top:1rem;border-top:1px solid #e2e8f0;}
        .ag-btn-save{background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-weight:700;cursor:pointer;transition:all .2s;}
        .ag-btn-save:hover{background:#1a7a46;}
        .ag-btn-del{background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer;}
        .ag-btn-del:hover{background:#ef4444;color:#fff;}
        .ag-btn-cancel{background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer;}
        </style>`;
    }

    // ── Navegação ───────────────────────────────────────────────
    window.agendaNav = function(delta) {
        if (agendaViewMode === 'mes') {
            agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() + delta);
        } else if (agendaViewMode === 'semana') {
            agendaCurrentDate.setDate(agendaCurrentDate.getDate() + (delta * 7));
        } else if (agendaViewMode === 'dia') {
            agendaCurrentDate.setDate(agendaCurrentDate.getDate() + delta);
        }
        window.renderAgendaLogistica();
    };
    
    window.agendaIrHoje = function() {
        agendaCurrentDate = new Date();
        window.renderAgendaLogistica();
    };

    window.agendaSetView = function(mode) {
        agendaViewMode = mode;
        window.renderAgendaLogistica();
    };

    window.abrirNovoCard = function(dateStr) { mostrarFormCard({ data: dateStr }); };

    window.abrirCardDetalhes = function(id) {
        const card = agendaCards.find(c => c.id === id);
        if (!card) return;
        mostrarFormCard(card);
    };

    // ── Modal de formulário ─────────────────────────────────────
    function mostrarFormCard(card) {
        const overlay = document.getElementById('ag-modal-overlay');
        const body    = document.getElementById('ag-modal-body');
        const titleEl = document.getElementById('ag-modal-title');
        if (!overlay || !body) return;

        const isEdicao  = !!card.id;
        titleEl.textContent = isEdicao ? 'Editar Card' : 'Novo Card';

        let responsaveisSel = [];
        let referentesSel   = [];
        let acoesSel        = [];
        try { responsaveisSel = JSON.parse(card.responsaveis || '[]'); } catch(e){}
        try { referentesSel   = JSON.parse(card.referente_ids || '[]'); } catch(e){}
        try { acoesSel        = JSON.parse(card.acoes || '[]'); } catch(e){}
        const tipoAtual = card.tipo || 'aviso';

        const tiposHTML = TIPOS.map(t => {
            const ativo = tipoAtual === t.value;
            return `<div class="ag-tipo-btn ${ativo?'active':''}"
                style="${ativo?`background:${t.color};border-color:${t.color};color:#fff;`:''}"
                onclick="agendaSelectTipo('${t.value}','${t.color}')"
                data-tipo="${t.value}">
                <i class="ph ${t.icon}"></i>${t.label}
            </div>`;
        }).join('');

        const colabOptions = agendaColabs
            .map(c => `<option value="${c.id}">${c.nome_completo}</option>`)
            .join('');

        const respChips = responsaveisSel.map(id => {
            const c = agendaColabs.find(x => x.id == id);
            return c ? `<div class="ag-chip-resp" data-id="${id}">
                <i class="ph ph-user-gear"></i>${c.nome_completo.split(' ')[0]}
                <button onclick="agendaRemoveChip('resp','${id}')"><i class="ph ph-x"></i></button>
            </div>` : '';
        }).join('');

        const refChips = referentesSel.map(id => {
            const c = agendaColabs.find(x => x.id == id);
            return c ? `<div class="ag-chip-ref" data-id="${id}">
                <i class="ph ph-user"></i>${c.nome_completo.split(' ')[0]}
                <button onclick="agendaRemoveChip('ref','${id}')"><i class="ph ph-x"></i></button>
            </div>` : '';
        }).join('');

        const ACOES = [
            { value: 'enviar_email',      label: 'Enviar e-mail para os responsáveis', icon: 'ph-envelope' },
            { value: 'notificar_sistema', label: 'Notificação no sistema',              icon: 'ph-bell'     },
        ];
        const acoesHTML = ACOES.map(a => `
            <div class="ag-acao-item ${acoesSel.includes(a.value)?'selected':''}" onclick="agendaToggleAcao('${a.value}',this)">
                <input type="checkbox" ${acoesSel.includes(a.value)?'checked':''} onclick="event.stopPropagation()" value="${a.value}">
                <i class="ph ${a.icon}"></i><span>${a.label}</span>
            </div>`).join('');

        body.innerHTML = `
            <div class="ag-field">
                <label>Tipo de Card</label>
                <div class="ag-tipos-grid" id="ag-tipos-grid">${tiposHTML}</div>
                <input type="hidden" id="ag-tipo-val" value="${tipoAtual}">
            </div>
            <div class="ag-field">
                <label>Título</label>
                <input type="text" id="ag-titulo" placeholder="Ex: Reunião de equipe, Falta do João..." value="${card.titulo||''}">
            </div>
            <div class="ag-row2">
                <div class="ag-field">
                    <label>Data</label>
                    <input type="date" id="ag-data" value="${card.data||''}">
                </div>
                <div class="ag-field">
                    <label>Horário</label>
                    <input type="time" id="ag-horario" value="${card.horario||''}">
                </div>
            </div>
            <div class="ag-field">
                <label>Descrição / Observação</label>
                <textarea id="ag-descricao" placeholder="Descreva o que deve ser registrado...">${card.descricao||''}</textarea>
            </div>
            <div class="ag-field">
                <label><i class="ph ph-user-gear" style="color:#0284c7;margin-right:4px;"></i>Responsáveis pelo card</label>
                <select id="ag-resp-select" onchange="agendaAddChip('resp',this.value);this.value=''">
                    <option value="">— Adicionar responsável —</option>
                    ${colabOptions}
                </select>
                <div class="ag-chips-list" id="ag-resp-list">${respChips}</div>
            </div>
            <div class="ag-field">
                <label><i class="ph ph-user" style="color:#92400e;margin-right:4px;"></i>Card referente à</label>
                <select id="ag-ref-select" onchange="agendaAddChip('ref',this.value);this.value=''">
                    <option value="">— Selecionar colaborador —</option>
                    ${colabOptions}
                </select>
                <div class="ag-chips-list" id="ag-ref-list">${refChips}</div>
            </div>
            <div class="ag-field">
                <label>Ações a disparar na data</label>
                <div class="ag-acoes-grid" id="ag-acoes-grid">${acoesHTML}</div>
            </div>
            <div class="ag-footer">
                ${isEdicao?`<button class="ag-btn-del" onclick="agendaExcluirCard(${card.id})"><i class="ph ph-trash"></i> Excluir</button>`:''}
                <button class="ag-btn-cancel" onclick="fecharAgendaModal()">Cancelar</button>
                <button class="ag-btn-save" onclick="agendaSalvarCard(${card.id||'null'})">
                    <i class="ph ph-floppy-disk"></i> ${isEdicao?'Salvar':'Criar Card'}
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
            b.style.background = b.style.borderColor = b.style.color = '';
        });
        const btn = document.querySelector(`.ag-tipo-btn[data-tipo="${val}"]`);
        if (btn) { btn.classList.add('active'); btn.style.background = color; btn.style.borderColor = color; btn.style.color = '#fff'; }
    };

    window.agendaAddChip = function(tipo, id) {
        if (!id) return;
        const listId = tipo === 'resp' ? 'ag-resp-list' : 'ag-ref-list';
        const list = document.getElementById(listId);
        if (!list || list.querySelector(`[data-id="${id}"]`)) return;
        const c = agendaColabs.find(x => x.id == id);
        if (!c) return;
        const cls   = tipo === 'resp' ? 'ag-chip-resp' : 'ag-chip-ref';
        const icone = tipo === 'resp' ? 'ph-user-gear' : 'ph-user';
        const chip  = document.createElement('div');
        chip.className = cls;
        chip.dataset.id = id;
        chip.innerHTML = `<i class="ph ${icone}"></i>${c.nome_completo.split(' ')[0]}
            <button onclick="agendaRemoveChip('${tipo}','${id}')"><i class="ph ph-x"></i></button>`;
        list.appendChild(chip);
    };

    window.agendaRemoveChip = function(tipo, id) {
        const listId = tipo === 'resp' ? 'ag-resp-list' : 'ag-ref-list';
        const chip = document.querySelector(`#${listId} [data-id="${id}"]`);
        if (chip) chip.remove();
    };

    window.agendaToggleAcao = function(val, el) {
        el.classList.toggle('selected');
        const cb = el.querySelector('input[type=checkbox]');
        if (cb) cb.checked = !cb.checked;
    };

    window.agendaSalvarCard = async function(idExistente) {
        const titulo    = document.getElementById('ag-titulo')?.value.trim();
        const data      = document.getElementById('ag-data')?.value;
        const horario   = document.getElementById('ag-horario')?.value || '';
        const descricao = document.getElementById('ag-descricao')?.value.trim();
        const tipo      = document.getElementById('ag-tipo-val')?.value || 'aviso';

        if (!data) { showToast('Selecione uma data para o card.', 'error'); return; }

        const responsaveis  = JSON.stringify(Array.from(document.querySelectorAll('#ag-resp-list [data-id]')).map(c => parseInt(c.dataset.id)));
        const referente_ids = JSON.stringify(Array.from(document.querySelectorAll('#ag-ref-list [data-id]')).map(c => parseInt(c.dataset.id)));
        const acoes         = JSON.stringify(Array.from(document.querySelectorAll('#ag-acoes-grid .ag-acao-item.selected')).map(el => el.querySelector('input').value));

        const payload = { titulo, data, horario, descricao, tipo, responsaveis, referente_ids, acoes, setor: 'logistica' };
        if (idExistente) payload.id = idExistente;

        try {
            await salvarCard(payload);
            showToast(idExistente ? 'Card atualizado!' : 'Card criado!', 'success');
            document.getElementById('ag-modal-overlay').style.display = 'none';
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
            document.getElementById('ag-modal-overlay').style.display = 'none';
            await window.renderAgendaLogistica();
        } catch(e) {
            showToast('Erro ao excluir: ' + e.message, 'error');
        }
    };

})();
