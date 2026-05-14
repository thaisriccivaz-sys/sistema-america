// ═══════════════════════════════════════════════════════════════
// MÓDULO: AGENDA LOGÍSTICA v3
// ═══════════════════════════════════════════════════════════════
(function() {
    const API = '/api';
    let agendaCurrentDate = new Date();
    let agendaViewMode = 'semana'; // 'dia', 'semana', 'mes'
    let agendaFilterTipo = '';
    let agendaCards = [];
    let agendaColabs = [];
    let agendaEscalaData = [];
    let agendaEscalaFiltroStatus = 'todos'; // 'todos','disponivel','folga','ferias','afastado','falta'
    let agendaBuscaNome = '';
    let agendaBuscaSetores = [];

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
        { value: 'reuniao', label: 'Reunião', icon: 'ph-users', color: '#2563eb' },
        { value: 'tarefa', label: 'Tarefa', icon: 'ph-check-square-offset', color: '#00cec8' },
        { value: 'aviso', label: 'Aviso', icon: 'ph-warning-circle', color: '#9333ea' },
        { value: 'falta', label: 'Falta', icon: 'ph-x-circle', color: '#dc2626' },
        { value: 'afastado', label: 'Afastado', icon: 'ph-first-aid', color: '#ca8a04' },
        { value: 'ferias',  label: 'Férias', icon: 'ph-airplane-tilt', color: '#ea580c' },
        { value: 'aso',     label: 'ASO Agendado', icon: 'ph-heartbeat', color: '#0891b2' },
        { value: 'outro',   label: 'Outro',           icon: 'ph-calendar',      color: '#6b7280' },
    ];
    function getTipo(v) { return TIPOS.find(t => t.value === v) || TIPOS[6]; }

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

    async function carregarEscala(inicio, fim) {
        try {
            const r = await fetch(`${API}/rh/escala?inicio=${inicio}&fim=${fim}`, {
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

    window.limparTestesRhAgenda = async function() {
        if (!confirm('Tem certeza que deseja apagar TODOS os cards criados manualmente (reuniões, avisos, testes)?\n\nEssa ação deixará apenas os cards automáticos gerados pelo RH (Férias, Afastamentos, ASO).')) return;
        try {
            const r = await fetch(`${API}/logistica/agenda/clear`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${window.currentToken}` }
            });
            if (!r.ok) throw new Error(await r.text());
            window.renderAgendaRH();
        } catch(e) {
            alert('Erro ao limpar testes: ' + e.message);
        }
    };

    // ── Renderização principal ──────────────────────────────────
    window.renderAgendaRH = async function() {
        const container = document.getElementById('rh-agenda-container');
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
        if (agendaFilterTipo === 'escala') {
            agendaEscalaData = await carregarEscala(inicio, fim);
            // Enriquecer com faltas registradas nos cards da agenda
            const faltaCards = agendaCards.filter(c => c.tipo === 'falta');
            faltaCards.forEach(fc => {
                const refs = (() => { try { return JSON.parse(fc.referente_ids || '[]'); } catch(e){ return []; } })();
                refs.forEach(colabId => {
                    const colab = agendaEscalaData.find(c => String(c.id) === String(colabId));
                    if (colab) {
                        const dia = (colab.dias || []).find(d => d.data === fc.data);
                        if (dia && dia.status === 'disponivel') dia.status = 'falta';
                        else if (!dia) colab.dias = [...(colab.dias||[]), { data: fc.data, status: 'falta' }];
                    }
                });
            });
        }
        container.innerHTML = buildAgendaHTML();
    };

    window.rhAgendaSetEscalaFiltro = function(status) {
        agendaEscalaFiltroStatus = status;
        window.rhAgendaUpdateGrid();
    };

    window.rhAgendaSetBuscaNome = function(val) {
        agendaBuscaNome = (val || '').toLowerCase();
        window.rhAgendaUpdateGrid();
    };

    window.rhAgendaToggleSetor = function(setor) {
        if (agendaBuscaSetores.includes(setor)) {
            agendaBuscaSetores = agendaBuscaSetores.filter(s => s !== setor);
        } else {
            agendaBuscaSetores.push(setor);
        }
        window.rhAgendaUpdateGrid();
    };

    window.rhAgendaUpdateGrid = function() {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buildAgendaHTML();
        const newGrid = tempDiv.querySelector('.ag-grid');
        const oldGrid = document.querySelector('.ag-grid');
        if (newGrid && oldGrid) {
            oldGrid.innerHTML = newGrid.innerHTML;
        }
        const newFiltro = tempDiv.querySelector('#ag-escala-filtro-wrap');
        const oldFiltro = document.querySelector('#ag-escala-filtro-wrap');
        if (newFiltro && oldFiltro) {
            oldFiltro.innerHTML = newFiltro.innerHTML;
        }
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

        // Mapa de estilos para o filtro Escala
        const ESC_STYLE = {
            disponivel: { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
            folga:      { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' },
            ferias:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
            afastado:   { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
            falta:      { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
            aso:        { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
        };

        for (const dObj of diasRender) {
            if (!dObj) {
                cells += `<div class="ag-cell ag-empty"></div>`;
                continue;
            }
            const dateStr = isoDate(dObj);
            const isHoje = dateStr === hoje;
            // Se filtro Escala: ignorar cards normais e mostrar chips de colaboradores
            if (agendaFilterTipo === 'escala') {
                let headerText = '';
                if (agendaViewMode === 'semana') {
                    const nm = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dObj.getDay()];
                    headerText = `<div style="font-size:0.75rem;color:${isHoje?'#008000':'#64748b'};text-transform:uppercase;font-weight:700;">${nm}</div>`;
                }
                // Filtrar colaboradores pelo status selecionado
                const colabsFiltrados = (agendaEscalaData || []).filter(colab => {
                    if (agendaBuscaNome && !(colab.nome_completo || '').toLowerCase().includes(agendaBuscaNome)) return false;
                    if (agendaBuscaSetores.length > 0 && !agendaBuscaSetores.includes(colab.departamento)) return false;
                    if (agendaEscalaFiltroStatus === 'todos') return true;
                    const diaInfo = (colab.dias || []).find(x => x.data === dateStr);
                    const status = diaInfo ? diaInfo.status : 'disponivel';
                    return status === agendaEscalaFiltroStatus;
                });
                const colabChips = colabsFiltrados.map(colab => {
                    const diaInfo = (colab.dias || []).find(x => x.data === dateStr);
                    const status  = diaInfo ? diaInfo.status : 'disponivel';
                    const st = ESC_STYLE[status] || ESC_STYLE.disponivel;
                    const nome1 = (colab.nome_completo || '').split(' ').slice(0,2).join(' ');
                    const inicial = (colab.nome_completo || '?').charAt(0).toUpperCase();
                    const fotoHTML = colab.foto_base64
                        ? `<img src="${colab.foto_base64}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid ${st.border};" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                        : '';
                    const avatarHTML = `<div style="width:20px;height:20px;border-radius:50%;background:${st.bg};border:1.5px solid ${st.border};display:${colab.foto_base64?'none':'flex'};align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${st.color};flex-shrink:0;">${inicial}</div>`;
                    const sublabel = status === 'disponivel' && colab.horario_entrada
                        ? `${colab.horario_entrada}${colab.horario_saida?'-'+colab.horario_saida:''}`
                        : ({disponivel:'Disponível',folga:'Folga',ferias:'Férias',afastado:'Afastado',falta:'Falta',aso:'ASO'}[status]||'');
                    return `<div style="display:flex;align-items:center;gap:4px;padding:3px 5px;margin-bottom:2px;border-radius:6px;background:${st.bg};border:1px solid ${st.border};">
                        ${fotoHTML}${avatarHTML}
                        <div style="overflow:hidden;min-width:0;">
                            <div style="font-size:0.68rem;font-weight:700;color:${st.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome1}</div>
                            <div style="font-size:0.6rem;color:${st.color};opacity:0.8;">${sublabel}</div>
                        </div>
                    </div>`;
                }).join('');
                cells += `<div class="ag-cell ${isHoje?'ag-hoje':''} mode-${agendaViewMode}" data-date="${dateStr}" onclick="rhAbrirNovoCard('${dateStr}')">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                        ${headerText}<div class="ag-day-num ${isHoje?'ag-hoje-num':''}">${dObj.getDate()}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0;">${colabChips}</div>
                </div>`;
                continue;
            }
            const cardsDay = agendaCards.filter(c => c.data === dateStr && (!agendaFilterTipo || c.tipo === agendaFilterTipo))
                .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

            const limit = agendaViewMode === 'mes' ? 3 : 999;
            const badges = cardsDay.slice(0, limit).map(c => {
                const t = getTipo(c.tipo);
                let tituloDisplay = c.titulo || t.label;
                let fotosHTML = '';
                
                try {
                    let colabsEnvolvidos = [];
                    
                    if (c.is_auto) {
                        const colabId = String(c.id).split('_')[1];
                        if (colabId) colabsEnvolvidos.push(colabId);
                    } else {
                        const refs = JSON.parse(c.referente_ids || '[]');
                        if (refs && refs.length > 0) {
                            const nomesRefs = [];
                            refs.forEach(id => {
                                const col = agendaColabs.find(x => String(x.id) === String(id));
                                if (col) nomesRefs.push(col.nome_completo.split(' ').slice(0, 2).join(' '));
                            });
                            if (nomesRefs.length > 0) {
                                tituloDisplay += `: ${nomesRefs.join(', ')}`;
                            }
                            colabsEnvolvidos = refs;
                        }
                    }

                    if (colabsEnvolvidos.length > 0) {
                        fotosHTML = `<div style="display:flex; align-items:center; gap:2px; margin-right:4px;">` + 
                        colabsEnvolvidos.map(id => {
                            const col = agendaColabs.find(x => String(x.id) === String(id));
                            if (!col) return '';
                            if (col.foto_base64 || col.foto_path) {
                                const fotoUrl = col.foto_base64 || `/api/colaboradores/foto/${col.id}`;
                                return `<img src="${fotoUrl}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid ${t.color};" title="${col.nome_completo}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                <div style="width:16px;height:16px;border-radius:50%;background:#fff;color:${t.color};border:1px solid ${t.color};display:none;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;" title="${col.nome_completo}">${col.nome_completo.charAt(0).toUpperCase()}</div>`;
                            } else {
                                const init = col.nome_completo.charAt(0).toUpperCase();
                                return `<div style="width:16px;height:16px;border-radius:50%;background:#fff;color:${t.color};border:1px solid ${t.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;" title="${col.nome_completo}">${init}</div>`;
                            }
                        }).join('') + `</div>`;
                    }
                } catch(e) {}
                
                return `<div class="ag-badge" style="background:${t.color}22;color:${t.color};border-left:3px solid ${t.color};"
                    onclick="rhAbrirCardDetalhes(event, '${c.id}')" title="${tituloDisplay}">
                    ${fotosHTML || `<i class="ph ${t.icon}" style="font-size:0.8rem;flex-shrink:0;margin-right:2px;"></i>`}
                    <span style="overflow:hidden;text-overflow:ellipsis;">${tituloDisplay}</span>
                </div>`;
            }).join('');
            const mais = cardsDay.length > limit ? `<div class="ag-mais">+${cardsDay.length - limit} mais</div>` : '';

            let headerText = '';
            if (agendaViewMode === 'semana') {
                const curDayName = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dObj.getDay()];
                headerText = `<div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700;">${curDayName}</div>`;
            }

            cells += `<div class="ag-cell ${isHoje?'ag-hoje':''} mode-${agendaViewMode}" data-date="${dateStr}" onclick="rhAbrirNovoCard('${dateStr}')">
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
                    <button class="ag-nav-btn" onclick="rhAgendaNav(-1)"><i class="ph ph-caret-left"></i></button>
                    <h2 class="ag-titulo">${titulo}</h2>
                    <button class="ag-nav-btn" onclick="rhAgendaNav(1)"><i class="ph ph-caret-right"></i></button>
                    <button class="ag-nav-btn ag-hoje-btn" onclick="rhAgendaIrHoje()"><i class="ph ph-calendar-blank"></i> Hoje</button>
                </div>
                <div class="ag-header-right">
                    <button class="ag-nav-btn ${agendaFilterTipo === 'escala' ? 'ag-escala-active' : ''}" onclick="rhAgendaSetFilter('${agendaFilterTipo === 'escala' ? '' : 'escala'}')" style="${agendaFilterTipo === 'escala' ? 'background:#1a7a46;color:#fff;border-color:#1a7a46;' : 'color:#1a7a46;border-color:#1a7a46;font-weight:600;'}"><i class="ph ph-users"></i> Controle de Escala</button>
                    <select id="ag-filter-tipo" class="ag-nav-btn" onchange="rhAgendaSetFilter(this.value)" style="outline:none; font-weight:600;">
                        <option value="">Todos os Cards</option>
                        ${TIPOS.filter(t => t.value !== 'outro' && t.value !== 'aso').map(t => `<option value="${t.value}" ${agendaFilterTipo === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                    </select>
                    <div class="ag-view-toggles">
                        <button class="ag-view-btn ${agendaViewMode==='dia'?'active':''}" onclick="rhAgendaSetView('dia')">Dia</button>
                        <button class="ag-view-btn ${agendaViewMode==='semana'?'active':''}" onclick="rhAgendaSetView('semana')">Semana</button>
                        <button class="ag-view-btn ${agendaViewMode==='mes'?'active':''}" onclick="rhAgendaSetView('mes')">Mês</button>
                    </div>
                    <button class="ag-nav-btn" onclick="limparTestesRhAgenda()" style="display:none; color: #dc2626; border-color: #fca5a5;"><i class="ph ph-trash"></i> Limpar Testes</button>
                    <button class="ag-btn-novo" onclick="rhAbrirNovoCard('')"><i class="ph ph-plus"></i> Novo Card</button>
                </div>
            </div>
            ${agendaFilterTipo === 'escala' ? `
            <div id="ag-escala-filtro-wrap" style="display:flex; gap:16px; margin-bottom:16px; align-items:center; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-magnifying-glass" style="color:#94a3b8;font-size:1.1rem;"></i>
                    <input type="text" placeholder="Buscar por nome..." value="${agendaBuscaNome || ''}" oninput="rhAgendaSetBuscaNome(this.value)" style="padding:6px 10px; border:none; border-bottom:1px solid #cbd5e1; font-size:0.85rem; outline:none; min-width:180px; background:transparent;">
                </div>
                <div style="width:1px; height:24px; background:#e2e8f0; margin:0 4px;"></div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; flex:1; align-items:center;">
                    <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Setores:</span>
                    ${Array.from(new Set(agendaEscalaData.map(c => c.departamento).filter(Boolean))).sort().map(d => {
                        const isSelected = agendaBuscaSetores.includes(d);
                        return `<button onclick="rhAgendaToggleSetor('${d}')" style="border:1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}; background:${isSelected ? '#eff6ff' : '#f8fafc'}; color:${isSelected ? '#1d4ed8' : '#64748b'}; border-radius:16px; padding:3px 12px; font-size:0.75rem; font-weight:${isSelected ? '700' : '600'}; cursor:pointer; transition:all .15s;">${d}</button>`;
                    }).join('')}
                </div>
            </div>
            <div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.2rem 0;margin-bottom:0.75rem;">
            <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Status:</span>
            ${[
                {k:'todos',    label:'Todos',      color:'#334155', bg:'#f1f5f9'},
                {k:'disponivel',label:'🟢 Escalados',color:'#16a34a', bg:'#dcfce7'},
                {k:'folga',    label:'⚪ Folga',    color:'#94a3b8', bg:'#f1f5f9'},
                {k:'ferias',   label:'🟠 Férias',   color:'#ea580c', bg:'#fff7ed'},
                {k:'afastado', label:'🟡 Afastado', color:'#ca8a04', bg:'#fefce8'},
                {k:'falta',    label:'🔴 Falta',    color:'#dc2626', bg:'#fef2f2'},
                {k:'aso',      label:'⚪ ASO',      color:'#64748b', bg:'#f8fafc'},
            ].map(f => `<button onclick="rhAgendaSetEscalaFiltro('${f.k}')"
                style="border:1.5px solid ${agendaEscalaFiltroStatus===f.k?f.color:'#e2e8f0'};background:${agendaEscalaFiltroStatus===f.k?f.bg:'#fff'};color:${agendaEscalaFiltroStatus===f.k?f.color:'#64748b'};border-radius:20px;padding:4px 14px;font-size:0.8rem;font-weight:${agendaEscalaFiltroStatus===f.k?'700':'500'};cursor:pointer;transition:all .15s;">${f.label}</button>`
            ).join('')}
        </div>` : ''}
        ${weekdaysHTML}
            <div class="ag-grid grid-${agendaViewMode}">${cells}</div>
        </div>

        <!-- Barra de sub-filtro de status (só aparece na view Escala) -->
        

        <!-- Modal de Card -->
        <div id="ag-modal-overlay" style="display:none;" onclick="fecharRhAgendaModal(event)">
            <div class="ag-modal" onclick="event.stopPropagation()">
                <div class="ag-modal-header">
                    <span id="ag-modal-title">Novo Card</span>
                    <button onclick="fecharRhAgendaModal()" class="ag-modal-close"><i class="ph ph-x"></i></button>
                </div>
                <div class="ag-modal-body" id="ag-modal-body"></div>
            </div>
        </div>

        <style>
        .ag-wrap{padding:1.5rem;min-height:100%;background:#f0f4f8;}
        .ag-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:.75rem;}
        .ag-header-left{display:flex;align-items:center;gap:.5rem;}
        .ag-header-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .ag-titulo{font-size:1.4rem;font-weight:700;color:#1e293b;margin:0;min-width:180px;text-align:center;}
        .ag-nav-btn{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;cursor:pointer;color:#475569;font-size:.88rem;display:flex;align-items:center;gap:4px;transition:all .2s;}
        .ag-nav-btn:hover{background:#2d9e5f;color:#fff;border-color:#2d9e5f;}
        .ag-hoje-btn{font-weight:600;}
        .ag-view-toggles { display: flex; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin-right: 0; padding: 2px; }
        .ag-view-btn { border: none; background: transparent; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #64748b; transition: all 0.2s; }
        .ag-view-btn.active { background: #fff; color: #2d9e5f; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .ag-btn-novo{background:linear-gradient(135deg,#f503c5,#c000a0);color:#fff;border:none;border-radius:10px;padding:8px 18px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(45,158,95,.35);transition:all .2s;}
        .ag-btn-novo:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(245,3,197,.45);}
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
    window.rhAgendaNav = function(delta) {
        if (agendaViewMode === 'mes') {
            agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() + delta);
        } else if (agendaViewMode === 'semana') {
            agendaCurrentDate.setDate(agendaCurrentDate.getDate() + (delta * 7));
        } else if (agendaViewMode === 'dia') {
            agendaCurrentDate.setDate(agendaCurrentDate.getDate() + delta);
        }
        window.renderAgendaRH();
    };
    
    window.rhAgendaIrHoje = function() {
        agendaCurrentDate = new Date();
        window.renderAgendaRH();
    };

    window.rhAgendaSetView = function(mode) {
        agendaViewMode = mode;
        window.renderAgendaRH();
    };

    window.rhAgendaSetFilter = function(tipo) {
        agendaFilterTipo = tipo;
        window.renderAgendaRH();
    };

    window.rhAbrirNovoCard = function(dateStr) { mostrarFormCard({ data: dateStr }); };

    window.rhAbrirCardDetalhes = function(e, id) {
        if (e) e.stopPropagation();
        const card = agendaCards.find(c => String(c.id) === String(id));
        if (!card) {
            Swal.fire('Erro', 'Card não encontrado na lista atual. Atualize a página.', 'error');
            return;
        }
        if (card.is_auto) {
            Swal.fire('Informação', 'Este é um aviso automático do sistema. Para editar o período, acesse o Prontuário Digital do colaborador.', 'info');
            return;
        }
        mostrarFormCard(card);
    };

    // ── Modal de formulário ─────────────────────────────────────
    function mostrarFormCard(card) {
        try {
            const overlay = document.getElementById('ag-modal-overlay');
            const body    = document.getElementById('ag-modal-body');
            const titleEl = document.getElementById('ag-modal-title');
            if (!overlay || !body) {
                console.error('Modal elements not found!');
                return;
            }

            const isEdicao  = !!card.id;
            titleEl.textContent = isEdicao ? 'Editar Card' : 'Novo Card';

        let responsaveisSel = [];
        let referentesSel   = [];
        let acoesSel        = [];
        try { responsaveisSel = JSON.parse(card.responsaveis || '[]'); } catch(e){}
        try { referentesSel   = JSON.parse(card.referente_ids || '[]'); } catch(e){}
        try { acoesSel        = JSON.parse(card.acoes || '[]'); } catch(e){}
        const tipoAtual = card.tipo || 'aviso';

        const tiposHTML = TIPOS.filter(t => t.value !== 'ferias' && t.value !== 'outro' && t.value !== 'afastado').map(t => {
            const ativo = tipoAtual === t.value;
            return `<div class="ag-tipo-btn ${ativo?'active':''}"
                style="${ativo?`background:${t.color};border-color:${t.color};color:#fff;`:''}"
                onclick="rhAgendaSelectTipo('${t.value}','${t.color}')"
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
                <button onclick="rhAgendaRemoveChip('resp','${id}')"><i class="ph ph-x"></i></button>
            </div>` : '';
        }).join('');

        const refChips = referentesSel.map(id => {
            const c = agendaColabs.find(x => x.id == id);
            return c ? `<div class="ag-chip-ref" data-id="${id}">
                <i class="ph ph-user"></i>${c.nome_completo.split(' ')[0]}
                <button onclick="rhAgendaRemoveChip('ref','${id}')"><i class="ph ph-x"></i></button>
            </div>` : '';
        }).join('');

        // Ações ocultas — regra de notificação gerenciada globalmente pelo sistema de notificações


        body.innerHTML = `
            <div class="ag-field">
                <label>Tipo de Card</label>
                <div class="ag-tipos-grid" id="ag-tipos-grid">${tiposHTML}</div>
                <input type="hidden" id="ag-tipo-val" value="${tipoAtual}">
            </div>
            <div class="ag-field">
                <label>Título</label>
                <input type="text" id="ag-titulo" placeholder="Ex: Reunião de equipe..." value="${card.titulo || getTipo(tipoAtual).label}">
            </div>
            <div class="ag-row2">
                <div class="ag-field">
                    <label>Data</label>
                    <input type="date" id="ag-data" value="${card.data||''}">
                </div>
                <div class="ag-field">
                    <label>Horário</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="time" id="ag-horario-ini" value="${(card.horario||'').split(' - ')[0]||''}" style="flex:1;">
                        <span style="color:#64748b;font-weight:600;">até</span>
                        <input type="time" id="ag-horario-fim" value="${(card.horario||'').split(' - ')[1]||''}" style="flex:1;">
                    </div>
                </div>
            </div>
            <div class="ag-field">
                <label>Descrição / Observação</label>
                <textarea id="ag-descricao" placeholder="Descreva o que deve ser registrado...">${card.descricao||''}</textarea>
            </div>
            <!-- Responsáveis ocultos: gerenciados pelo sistema -->
            <div style="display:none" id="ag-resp-list-hidden">${respChips}</div>
            <select id="ag-resp-select" style="display:none" onchange="rhAgendaAddChip('resp',this.value);this.value=''">
                <option value="">— Adicionar responsável —</option>
                ${colabOptions}
            </select>
            <div class="ag-chips-list" id="ag-resp-list" style="display:none"></div>
            <div class="ag-field">
                <label><i class="ph ph-user" style="color:#92400e;margin-right:4px;"></i>Card referente à</label>
                <select id="ag-ref-select" onchange="rhAgendaAddChip('ref',this.value);this.value=''">
                    <option value="">— Selecionar colaborador —</option>
                    ${colabOptions}
                </select>
                <div class="ag-chips-list" id="ag-ref-list">${refChips}</div>
            </div>
            <!-- Ações ocultas: gerenciadas pelo sistema de notificações -->

            <div class="ag-footer">
                ${isEdicao?`<button class="ag-btn-del" onclick="rhAgendaExcluirCard(${card.id})"><i class="ph ph-trash"></i> Excluir Card</button>`:''}
                <button class="ag-btn-cancel" onclick="fecharRhAgendaModal()">Cancelar</button>
                <button class="ag-btn-save" onclick="rhAgendaSalvarCard(${card.id||'null'})">
                    <i class="ph ph-floppy-disk"></i> ${isEdicao?'Editar Card':'Criar Card'}
                </button>
            </div>`;

            overlay.style.display = 'flex';
        } catch (err) {
            console.error('Erro em mostrarFormCard:', err);
            Swal.fire('Erro', 'Ocorreu um erro ao abrir o card: ' + err.message, 'error');
        }
    }

    window.fecharRhAgendaModal = function(e) {
        if (e && e.target !== document.getElementById('ag-modal-overlay')) return;
        const ov = document.getElementById('ag-modal-overlay');
        if (ov) ov.style.display = 'none';
    };

    window.rhAgendaSelectTipo = function(val, color) {
        const titInput = document.getElementById('ag-titulo');
        const oldTypeObj = TIPOS.find(t => t.label === titInput.value);
        if (!titInput.value || oldTypeObj) {
            titInput.value = getTipo(val).label;
        }
        
        document.getElementById('ag-tipo-val').value = val;
        document.querySelectorAll('.ag-tipo-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = b.style.borderColor = b.style.color = '';
        });
        const btn = document.querySelector(`.ag-tipo-btn[data-tipo="${val}"]`);
        if (btn) { btn.classList.add('active'); btn.style.background = color; btn.style.borderColor = color; btn.style.color = '#fff'; }
    };

    window.rhAgendaAddChip = function(tipo, id) {
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
            <button onclick="rhAgendaRemoveChip('${tipo}','${id}')"><i class="ph ph-x"></i></button>`;
        list.appendChild(chip);
    };

    window.rhAgendaRemoveChip = function(tipo, id) {
        const listId = tipo === 'resp' ? 'ag-resp-list' : 'ag-ref-list';
        const chip = document.querySelector(`#${listId} [data-id="${id}"]`);
        if (chip) chip.remove();
    };

    window.rhAgendaToggleAcao = function(val, el) {
        el.classList.toggle('selected');
        const cb = el.querySelector('input[type=checkbox]');
        if (cb) cb.checked = !cb.checked;
    };

    window.rhAgendaSalvarCard = async function(idExistente) {
        const titulo    = document.getElementById('ag-titulo')?.value.trim();
        const data      = document.getElementById('ag-data')?.value;
        
        const hIni = document.getElementById('ag-horario-ini')?.value;
        const hFim = document.getElementById('ag-horario-fim')?.value;
        let horario = '';
        if (hIni && hFim) horario = `${hIni} - ${hFim}`;
        else if (hIni) horario = hIni;

        const descricao = document.getElementById('ag-descricao')?.value.trim();
        const tipo      = document.getElementById('ag-tipo-val')?.value || 'aviso';

        if (!data) { showToast('Selecione uma data para o card.', 'error'); return; }

        const responsaveis  = Array.from(document.querySelectorAll('#ag-resp-list [data-id]')).map(c => parseInt(c.dataset.id));
        const referente_ids = Array.from(document.querySelectorAll('#ag-ref-list [data-id]')).map(c => parseInt(c.dataset.id));
        const acoes         = Array.from(document.querySelectorAll('#ag-acoes-grid .ag-acao-item.selected')).map(el => el.querySelector('input').value);

        const payload = { titulo, data, horario, descricao, tipo, responsaveis, referente_ids, acoes, setor: 'logistica' };
        if (idExistente) payload.id = idExistente;

        try {
            await salvarCard(payload);
            showToast(idExistente ? 'Card atualizado!' : 'Card criado!', 'success');
            document.getElementById('ag-modal-overlay').style.display = 'none';
            await window.renderAgendaRH();
        } catch(e) {
            showToast('Erro ao salvar: ' + e.message, 'error');
        }
    };

    window.rhAgendaExcluirCard = async function(id) {
        if (!confirm('Excluir este card da agenda?')) return;
        try {
            await excluirCard(id);
            showToast('Card excluído.', 'success');
            document.getElementById('ag-modal-overlay').style.display = 'none';
            await window.renderAgendaRH();
        } catch(e) {
            showToast('Erro ao excluir: ' + e.message, 'error');
        }
    };

})();
