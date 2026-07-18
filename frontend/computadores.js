// =============================================================
// MODULO COMPUTADORES CORPORATIVOS
// Abas: Colaboradores | Computadores | E-mails
// =============================================================
(function () {
    'use strict';

    var _computadores = [];
    var _colaboradores = [];
    var _emails = [];
    var _editandoId = null;
    var _editandoEmail = null;
    var _atribData = { email_id: null, colab_id: null };
    var _devEmailId = null;
    var _devAtribId = null;
    var _filterQ = '';
    var _filterStatus = '';
    var _filterEmailQ = '';
    var _filterEmailStatus = '';
    var _sortCol = 'nome_colaborador';
    var _sortDir = 'asc';
    var _activeTab = 'colaboradores';

    /* ─── API Helpers ─── */
    function _tok() { return window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || ''; }
    function _baseUrl() { return (typeof API_URL !== 'undefined' ? API_URL : '/api'); }
    async function _apiGet(p) {
        var r = await fetch(_baseUrl() + p, { headers: { 'Authorization': 'Bearer ' + _tok() } });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiPost(p, body) {
        var r = await fetch(_baseUrl() + p, { method: 'POST', headers: { 'Authorization': 'Bearer ' + _tok(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiPut(p, body) {
        var r = await fetch(_baseUrl() + p, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + _tok(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiDelete(p) {
        var r = await fetch(_baseUrl() + p, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + _tok() } });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    /* ─── Helpers visuais ─── */
    function fmtData(s) {
        if (!s) return '-';
        var p = s.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s;
    }
    function obsIcon(obs) {
        if (!obs || !obs.trim()) return '';
        return '<i class="ph ph-info" style="color:#3b82f6;cursor:help;margin-left:5px;font-size:1.1rem;" title="' + obs.replace(/"/g, '&quot;') + '"></i>';
    }
    function iniciais(nome) {
        if (!nome) return '?';
        var parts = nome.trim().split(/\s+/);
        return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    function avatarHtml(fotoPath, fotoBase64, nome, size) {
        size = size || 40;
        var ini = iniciais(nome);
        var colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];
        var col = colors[ini.charCodeAt(0) % colors.length];
        var fs2 = Math.round(size * 0.35);
        var dv = '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + col + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:' + fs2 + 'px;flex-shrink:0;">' + ini + '</div>';
        if (fotoBase64) return '<img src="' + fotoBase64 + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.style.display=\'none\';">' ;
        if (!fotoPath) return dv;
        var base = (typeof API_URL !== 'undefined') ? API_URL.replace('/api', '') : '';
        return '<img src="' + base + '/' + fotoPath + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\'' + dv.replace(/'/g, '&#39;') + '\'">';
    }
    function statusBadge(s) {
        var map = {
            'Em uso':      { bg: '#dbeafe', color: '#1e40af', icon: 'ph-monitor' },
            'Reserva':     { bg: '#f3e8ff', color: '#6d28d9', icon: 'ph-archive-box' },
            'Manutenção':  { bg: '#fef9c3', color: '#854d0e', icon: 'ph-wrench' },
            'Devolvido':   { bg: '#f1f5f9', color: '#64748b', icon: 'ph-arrow-u-up-left' },
            'Inativo':     { bg: '#fee2e2', color: '#991b1b', icon: 'ph-x-circle' }
        };
        var i = map[s] || { bg: '#f1f5f9', color: '#64748b', icon: 'ph-monitor' };
        return '<span style="background:' + i.bg + ';color:' + i.color + ';padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ' + i.icon + '"></i>' + (s || '-') + '</span>';
    }
    function emailStatusBadge(s) {
        if (!s) return '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;">-</span>';
        if (s.toLowerCase().includes('ativo')) return '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;border:1px solid #bbf7d0;">Ativo</span>';
        return '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;border:1px solid #fecaca;">Bloqueado</span>';
    }
    function tipoIcon(t) { return t === 'Notebook' ? 'ph-laptop' : 'ph-monitor'; }

    /* ─── Carga de dados ─── */
    async function loadAll() {
        var cont = document.getElementById('computadores-content');
        if (cont) cont.innerHTML = '<div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><br>Carregando...</div>';
        try {
            var r = await Promise.all([
                _apiGet('/computadores'),
                _apiGet('/computadores/colaboradores'),
                fetch('/api/emails', { headers: { 'Authorization': 'Bearer ' + _tok() } }).then(function(res) { return res.json(); }).catch(function() { return []; })
            ]);
            _computadores = r[0] || [];
            _colaboradores = r[1] || [];
            _emails = Array.isArray(r[2]) ? r[2] : [];
        } catch (e) {
            console.error('[COMPUTADORES]', e);
            _computadores = [];
            _colaboradores = [];
            _emails = [];
        }
        renderTela();
    }

    async function reloadEmails() {
        try {
            var res = await fetch('/api/emails', { headers: { 'Authorization': 'Bearer ' + _tok() } });
            _emails = await res.json();
        } catch (e) { _emails = []; }
        renderTela();
    }

    /* ─── Render principal ─── */
    window.computadoresSetTab = function (tab) {
        _activeTab = tab;
        _filterQ = '';
        _filterEmailQ = '';
        _filterEmailStatus = '';
        renderTela();
    };

    window.computadoresSetStatusFilter = function (status) {
        _filterStatus = status;
        renderTela();
    };

    window.computadoresVincular = function (colabId) {
        window.computadoresOpenModal();
        setTimeout(function () {
            var s = document.getElementById('comp-colaborador');
            if (s) s.value = colabId;
        }, 100);
    };

    function renderTela() {
        var cont = document.getElementById('computadores-content');
        if (!cont) return;

        var countColabs = _colaboradores.length;
        var countComps = _computadores.length;
        var countEmails = _emails.length;

        function tabS(t) {
            return 'padding:0.6rem 1.25rem;border:none;background:transparent;cursor:pointer;font-size:0.85rem;font-weight:600;color:' +
                (_activeTab === t ? '#6366f1' : '#64748b') +
                ';border-bottom:' + (_activeTab === t ? '2px solid #6366f1' : '2px solid transparent') + ';margin-bottom:-2px;transition:all 0.15s;';
        }

        // AMBOS botões aparecem em TODAS as abas
        var actionBtns =
            '<button id="btn-novo-computador" onclick="window.computadoresOpenModal()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:0.55rem 1.1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;box-shadow:0 2px 8px rgba(99,102,241,0.3);">' +
            '<i class="ph ph-plus"></i> Novo Computador</button>' +
            '<button onclick="window.compEmailOpenModalEmail()" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;padding:0.55rem 1.1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;box-shadow:0 2px 8px rgba(79,70,229,0.3);">' +
            '<i class="ph ph-plus"></i> Novo E-mail</button>';

        var tabContent = '';
        if (_activeTab === 'colaboradores') tabContent = renderTabColaboradores();
        else if (_activeTab === 'computadores') tabContent = renderTabComputadores();
        else tabContent = renderTabEmails();

        cont.innerHTML =
            '<div style="padding:1.5rem 1.5rem 0;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">' +
            '<i class="ph ph-desktop" style="font-size:1.5rem;color:#fff;"></i></div>' +
            '<div><h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;">Computadores Corporativos</h2>' +
            '<p style="margin:0;font-size:0.8rem;color:#64748b;">' + countComps + ' equipamentos &middot; ' + countColabs + ' colaboradores &middot; ' + countEmails + ' e-mails</p></div></div>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' + actionBtns + '</div></div>' +
            '<div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:1.25rem;">' +
            '<button onclick="window.computadoresSetTab(\'colaboradores\')" style="' + tabS('colaboradores') + '"><i class="ph ph-users"></i> Colaboradores <span style="font-size:0.75rem;opacity:0.8;">(' + countColabs + ')</span></button>' +
            '<button onclick="window.computadoresSetTab(\'computadores\')" style="' + tabS('computadores') + '"><i class="ph ph-desktop"></i> Computadores <span style="font-size:0.75rem;opacity:0.8;">(' + countComps + ')</span></button>' +
            '<button onclick="window.computadoresSetTab(\'emails\')" style="' + tabS('emails') + '"><i class="ph ph-envelope-simple"></i> E-mails <span style="font-size:0.75rem;opacity:0.8;">(' + countEmails + ')</span></button>' +
            '</div></div>' +
            '<div style="padding:0 1.5rem 2rem;" id="comp-tab-content">' + tabContent + '</div>' +
            renderModal() +
            renderModalEmail() +
            renderModalAtribuirEmail() +
            renderModalDevolverEmail() +
            renderModalVincularEquipamentos() +
            renderModalDevolverMulti();
    }

    /* ─── Aba Colaboradores ─── */
    function renderTabColaboradores() {
        var fq = _filterQ.trim().toLowerCase();
        var filtered = _colaboradores.filter(function (c) {
            if (!fq) return true;
            return (c.nome_completo && c.nome_completo.toLowerCase().includes(fq)) ||
                (c.departamento && c.departamento.toLowerCase().includes(fq));
        });

        var thStyle = 'padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;';

        var rows = filtered.map(function (c) {
            var td = 'padding:0.75rem;vertical-align:middle;';
            // Apenas 1 computador por colaborador
            var emailsDoColab = _emails.filter(function (e) { return String(e.colaborador_id) === String(c.id); });
            var compsDoColab = _computadores.filter(function (comp) { return String(comp.colaborador_id) === String(c.id); });
            var temEmail = emailsDoColab.length > 0;
            var temComp = compsDoColab.length > 0;

            var colabInfo = '<div style="display:flex;align-items:center;gap:0.75rem;">' +
                avatarHtml(c.foto_path, c.foto_base64, c.nome_completo, 40) +
                '<div><div style="font-weight:700;font-size:0.9rem;color:#0f172a;">' + (c.nome_completo || '-') + '</div>' +
                '<div style="font-size:0.75rem;color:#64748b;font-weight:600;"><i class="ph ph-buildings" style="margin-right:3px;"></i>' + (c.departamento || '-') + ' &middot; ' + (c.cargo || '-') + '</div>' +
                '</div></div>';

            var emailsHtml = temEmail ? emailsDoColab.map(function(e){ return '<div style="font-weight:600;font-size:0.85rem;color:#2563eb;margin-bottom:2px;display:flex;align-items:center;">'+e.endereco+obsIcon(e.observacao)+'</div>'; }).join('') : '<span style="color:#94a3b8;font-size:0.85rem;font-style:italic;">Nenhum e-mail</span>';

            var eqpInfo = '';
            var acoes = '';

            if (temComp || temEmail) {
                if (temComp) {
                    var cp = compsDoColab[0];
                    eqpInfo = '<div>' +
                        '<div style="font-weight:600;font-size:0.95rem;color:#0f172a;display:flex;align-items:center;">' + (cp.tipo || 'Computador') + ' ' + (cp.modelo || '') + obsIcon(cp.observacoes) + '</div>' +
                        '<div style="font-size:0.75rem;color:#64748b;font-family:monospace;margin-top:2px;">Patr: ' + (cp.patrimonio || '-') + ' / SN: ' + (cp.numero_serie || '-') + '</div>' +
                        '</div>';
                } else {
                    eqpInfo = '<span style="color:#94a3b8;font-size:0.85rem;font-style:italic;">Nenhum equipamento</span>';
                }
                
                var btnHist = temComp ? '<button onclick="window.computadoresToggleHistorico(' + compsDoColab[0].id + ')" style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;cursor:pointer;color:#64748b;display:flex;align-items:center;" title="Histórico"><i class="ph ph-clock-counter-clockwise"></i><i class="ph ph-caret-down" style="font-size:0.7rem;margin-left:2px;"></i></button>' : '';
                var btnDev = '<button onclick="window.computadoresDevolverMulti(' + c.id + ',\'' + (c.nome_completo.replace(/'/g, "\\'")) + '\')" style="background:#fff;border:1px solid #fca5a5;border-radius:6px;padding:5px 9px;cursor:pointer;color:#dc2626;display:flex;align-items:center;gap:3px;" title="Devolver"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>';
                acoes = '<div style="display:flex;gap:5px;flex-wrap:wrap;">' + btnHist + btnDev + '</div>';
            } else {
                eqpInfo = '<span style="color:#94a3b8;font-size:0.85rem;font-style:italic;">Nenhum equipamento</span>';
                acoes = '<button onclick="window.computadoresVincularModal(' + c.id + ')" style="background:#eef2ff;border:1px solid #c7d2fe;color:#4f46e5;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.3rem;"><i class="ph ph-link"></i> Vincular Equipamentos</button>';
            }

            return '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                '<td style="' + td + '">' + colabInfo + '</td>' +
                '<td style="' + td + '">' + eqpInfo + '</td>' +
                '<td style="' + td + '">' + emailsHtml + '</td>' +
                '<td style="' + td + '">' + acoes + '</td>' +
                '</tr>' + 
                (temComp ? '<tr id="hist-row-comp-' + compsDoColab[0].id + '" style="display:none;"><td colspan="4" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-comp-' + compsDoColab[0].id + '" style="padding:1rem;">Carregando histórico...</div></td></tr>' : '');
        }).join('');

        if (!filtered.length) rows = '<tr><td colspan="4" style="padding:2rem;text-align:center;color:#64748b;">Nenhum colaborador encontrado.</td></tr>';

        return '<div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">' +
            '<i class="ph ph-funnel" style="color:#94a3b8;font-size:1.1rem;"></i>' +
            '<input id="comp-filter-q" type="text" placeholder="Buscar colaborador por nome ou departamento..." value="' + _filterQ.replace(/"/g, '&quot;') + '" oninput="window.computadoresFilter()" style="flex:1;min-width:200px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;outline:none;">' +
            '</div>' +
            '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">' +
            '<th style="' + thStyle + 'width:30%;">Colaborador</th>' +
            '<th style="' + thStyle + 'width:30%;">Equipamento Atribuído</th>' +
            '<th style="' + thStyle + 'width:25%;">E-mail</th>' +
            '<th style="' + thStyle + 'width:15%;">Ações</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    /* ─── Aba Computadores ─── */
    function renderTabComputadores() {
        var total = _computadores.length;
        var emUso = _computadores.filter(function (c) { return c.status === 'Em uso'; }).length;
        var reserva = _computadores.filter(function (c) { return c.status === 'Reserva'; }).length;
        var manut = _computadores.filter(function (c) { return c.status === 'Manutenção'; }).length;

        function statCard(icon, label, val, color, bg, statusValue) {
            var onClick = "window.computadoresSetStatusFilter('" + statusValue + "')";
            return '<div onclick="' + onClick + '" style="background:#fff;border-radius:10px;padding:0.9rem 1rem;border:1px solid #e2e8f0;display:flex;align-items:center;gap:0.6rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;transition:transform 0.1s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
                '<div style="width:34px;height:34px;border-radius:8px;background:' + bg + ';display:flex;align-items:center;justify-content:center;">' +
                '<i class="ph ' + icon + '" style="color:' + color + ';font-size:1.1rem;"></i></div>' +
                '<div><div style="font-size:1.25rem;font-weight:800;color:#0f172a;line-height:1;">' + val + '</div>' +
                '<div style="font-size:0.72rem;color:#64748b;">' + label + '</div></div></div>';
        }

        return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;margin-bottom:1.5rem;">' +
            statCard('ph-stack', 'Total', total, '#6366f1', '#eef2ff', '') +
            statCard('ph-monitor', 'Em Uso', emUso, '#2563eb', '#dbeafe', 'Em uso') +
            statCard('ph-archive-box', 'Reserva', reserva, '#7c3aed', '#f3e8ff', 'Reserva') +
            statCard('ph-wrench', 'Manutenção', manut, '#d97706', '#fef9c3', 'Manutenção') +
            '</div>' +
            '<div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">' +
            '<i class="ph ph-funnel" style="color:#94a3b8;font-size:1.1rem;"></i>' +
            '<input id="comp-filter-q" type="text" placeholder="Buscar por colaborador, modelo, patrimônio ou série..." value="' + _filterQ.replace(/"/g, '&quot;') + '" oninput="window.computadoresFilter()" style="flex:1;min-width:200px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;outline:none;">' +
            '<select id="comp-filter-status" onchange="window.computadoresFilter()" style="border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;cursor:pointer;outline:none;">' +
            '<option value="">Todos os Status</option>' +
            ['Em uso', 'Reserva', 'Manutenção', 'Devolvido'].map(function (s) {
                return '<option value="' + s + '"' + (_filterStatus === s ? ' selected' : '') + '>' + s + '</option>';
            }).join('') +
            '</select>' +
            '</div>' +
            renderTable();
    }

    function renderTable() {
        var fq = _filterQ.trim().toLowerCase();
        var filtered = _computadores.filter(function (c) {
            if (_filterStatus && c.status !== _filterStatus) return false;
            if (!fq) return true;
            return (c.nome_colaborador && c.nome_colaborador.toLowerCase().includes(fq)) ||
                (c.modelo && c.modelo.toLowerCase().includes(fq)) ||
                (c.patrimonio && c.patrimonio.toLowerCase().includes(fq)) ||
                (c.numero_serie && c.numero_serie.toLowerCase().includes(fq)) ||
                (c.departamento_colaborador && c.departamento_colaborador.toLowerCase().includes(fq));
        });

        var sm = _sortDir === 'asc' ? 1 : -1;
        filtered.sort(function (a, b) {
            var v1 = (a[_sortCol] || '').toString().toLowerCase();
            var v2 = (b[_sortCol] || '').toString().toLowerCase();
            return v1.localeCompare(v2) * sm;
        });

        if (!filtered.length) {
            return '<div style="text-align:center;padding:3rem;color:#94a3b8;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">' +
                '<i class="ph ph-desktop" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum computador encontrado.</div>';
        }

        var thStyle = 'padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer;user-select:none;white-space:nowrap;';
        function thSort(col, label) {
            var active = _sortCol === col;
            var icon = active ? (_sortDir === 'asc' ? '<i class="ph ph-caret-up"></i>' : '<i class="ph ph-caret-down"></i>') : '<i class="ph ph-caret-up" style="opacity:0.25;"></i>';
            return '<th style="' + thStyle + (active ? 'color:#6366f1;' : '') + '" onclick="window.computadoresSetSort(\'' + col + '\')">' +
                '<div style="display:flex;align-items:center;gap:3px;">' + label + icon + '</div></th>';
        }

        var rows = filtered.map(function (c) {
            var td = 'padding:0.75rem;vertical-align:middle;';
            var shortName = c.nome_colaborador && c.nome_colaborador.length > 20 ? c.nome_colaborador.substring(0, 20) + '…' : (c.nome_colaborador || '-');
            var shortLivre = c.colaborador_livre && c.colaborador_livre.length > 20 ? c.colaborador_livre.substring(0, 20) + '…' : c.colaborador_livre;
            return '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                '<td style="' + td + '"><div style="font-weight:700;font-size:0.85rem;color:#0f172a;display:flex;align-items:center;">' + (c.tipo || '-') + obsIcon(c.observacoes) + '</div>' +
                '<div style="font-size:0.72rem;color:#64748b;">' + (c.modelo || '-') + '</div></td>' +
                '<td style="' + td + '">' + (c.processador ? '<span style="font-size:0.82rem;">' + c.processador + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;">-</span>') + '</td>' +
                '<td style="' + td + '">' + (c.ram_1 ? '<span style="font-size:0.82rem;">' + c.ram_1 + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;">-</span>') + '</td>' +
                '<td style="' + td + '">' + (c.ssd ? '<span style="font-size:0.82rem;">' + c.ssd + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;">-</span>') + '</td>' +
                '<td style="' + td + 'font-size:0.82rem;"><div style="font-weight:600;color:#334155;">' + (c.patrimonio || '-') + '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;font-family:monospace;">' + (c.numero_serie || '') + '</div></td>' +
                '<td style="' + td + '" title="' + (c.nome_colaborador || '') + '">' +
                (c.colaborador_id
                    ? '<div><div style="font-weight:600;font-size:0.83rem;color:#0f172a;">' + shortName + '</div>' +
                      '<div style="font-size:0.72rem;color:#6366f1;font-weight:600;">' + (c.departamento_colaborador || '') + '</div></div>'
                    : (c.colaborador_livre
                        ? '<div><div style="font-weight:600;font-size:0.83rem;color:#0f172a;">' + shortLivre + '</div>' +
                          '<div style="font-size:0.72rem;color:#94a3b8;">Sem vínculo</div></div>'
                        : '<span style="color:#94a3b8;font-size:0.8rem;font-style:italic;">Sem colaborador</span>')) +
                '</td>' +
                '<td style="' + td + '">' + statusBadge(c.status) + '</td>' +
                '<td style="' + td + 'font-size:0.8rem;color:#64748b;">' + fmtData(c.data_atribuicao) + '</td>' +
                '<td style="' + td + '"><div style="display:flex;gap:5px;flex-wrap:wrap;">' +
                '<button onclick="window.computadoresToggleHistorico(' + c.id + ')" style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;cursor:pointer;color:#64748b;" title="Histórico"><i class="ph ph-clock-counter-clockwise"></i></button>' +
                '<button onclick="window.computadoresOpenModal(' + c.id + ')" style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;cursor:pointer;color:#6366f1;" title="Editar"><i class="ph ph-pencil-simple"></i></button>' +
                (c.colaborador_id || c.colaborador_livre ? '<button onclick="window.computadoresDevolver(' + c.id + ',\'' + ((c.nome_colaborador || c.colaborador_livre || '').replace(/'/g, "\\'")) + '\')" style="background:#fff;border:1px solid #fca5a5;border-radius:6px;padding:5px 9px;cursor:pointer;color:#dc2626;" title="Devolver"><i class="ph ph-arrow-u-up-left"></i></button>' : '') +
                '<button onclick="window.computadoresExcluir(' + c.id + ',\'' + (c.modelo || '').replace(/'/g, "\\'") + '\')" style="background:#fff;border:1px solid #fca5a5;border-radius:6px;padding:5px 9px;cursor:pointer;color:#dc2626;" title="Excluir"><i class="ph ph-trash"></i></button>' +
                '</div></td></tr>' + 
                '<tr id="hist-row-comp-' + c.id + '" style="display:none;"><td colspan="9" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-comp-' + c.id + '" style="padding:1rem;">Carregando histórico...</div></td></tr>';
        }).join('');

        return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">' +
            thSort('tipo', 'Tipo / Modelo') +
            thSort('processador', 'Processador') +
            thSort('ram_1', 'RAM') +
            thSort('ssd', 'SSD/HD') +
            thSort('patrimonio', 'Patrimônio / Série') +
            thSort('nome_colaborador', 'Colaborador') +
            thSort('status', 'Status') +
            thSort('data_atribuicao', 'Desde') +
            '<th style="' + thStyle.replace('cursor:pointer;user-select:none;', '') + '">Ações</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    /* ─── Aba E-mails (padrão chips: lista todos os e-mails) ─── */
    function renderTabEmails() {
        var fq = _filterEmailQ.trim().toLowerCase();
        var fs = _filterEmailStatus;

        var filtered = _emails.filter(function (e) {
            var isAtrib = !!(e.colaborador_id || e.responsavel_nome);
            var status = isAtrib ? 'atribuido' : 'disponivel';
            if (fs && status !== fs) return false;
            if (!fq) return true;
            return (e.endereco && e.endereco.toLowerCase().includes(fq)) ||
                (e.plataforma && e.plataforma.toLowerCase().includes(fq)) ||
                (e.colab_nome && e.colab_nome.toLowerCase().includes(fq)) ||
                (e.responsavel_nome && e.responsavel_nome.toLowerCase().includes(fq));
        });

        if (!filtered.length && !fq && !fs) {
            return '<div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">' +
                '<i class="ph ph-funnel" style="color:#94a3b8;font-size:1.1rem;"></i>' +
                '<span style="color:#94a3b8;font-size:0.85rem;">Nenhum e-mail cadastrado. Clique em "Novo E-mail" para começar.</span></div>';
        }

        var thStyle = 'padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;';
        var td = 'padding:0.75rem;vertical-align:middle;';

        var rows = filtered.map(function (e) {
            var atribs = e.atribuicoes || [];
            var isAtrib = atribs.length > 0;
            
            var respInfo = '';
            if (isAtrib) {
                respInfo = atribs.map(function(a) {
                    var nome = a.colab_nome || a.responsavel_nome;
                    var delBtn = '';
                    if (e.caixa_compartilhada || a.recebe_copia) {
                         delBtn = '<button onclick="window.compEmailOpenModalDevolver(' + e.id + ',\'' + (nome || '').replace(/'/g, "\\'") + '\', ' + (typeof a.id === 'number' ? a.id : `'${a.id}'`) + ')" style="background:none;border:none;color:#dc2626;cursor:pointer;margin-left:4px;padding:2px;" title="Remover"><i class="ph ph-x"></i></button>';
                    }
                    var badge = a.recebe_copia ? ' <span style="font-size:0.65rem;background:#e2e8f0;color:#475569;padding:1px 4px;border-radius:4px;">Cópia</span>' : '';
                    return '<div style="display:flex;align-items:center;gap:0.4rem;margin-top:3px;"><i class="ph ph-user" style="color:#6d28d9;font-size:0.8rem;"></i><span style="font-size:0.72rem;color:#6d28d9;font-weight:600;">' + nome + badge + '</span>' + delBtn + '</div>';
                }).join('');
            } else {
                if (e.status === 'Bloqueado') {
                    respInfo = '<span style="font-size:0.75rem;color:#dc2626;font-style:italic;font-weight:600;">Bloqueado</span>';
                } else {
                    respInfo = '<span style="font-size:0.75rem;color:#22c55e;font-style:italic;font-weight:600;">Disponível</span>';
                }
            }

            var acoes = '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
                '<button onclick="window.compEmailOpenModalEmail(' + e.id + ')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;" title="Editar"><i class="ph ph-pencil-simple"></i></button>' +
                '<button onclick="window.compEmailDelete(' + e.id + ')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;" title="Excluir"><i class="ph ph-trash"></i></button>';

            var hasAvulso = atribs.some(function(a) { return !!a.responsavel_nome; });
            
            if (isAtrib && (!e.caixa_compartilhada || hasAvulso)) {
                var a = atribs[0]; // Se tiver avulso, consideramos o primeiro (ou o próprio avulso) para o botão de devolver
                var nomeA = a.colab_nome || a.responsavel_nome;
                acoes += '<button onclick="window.compEmailOpenModalDevolver(' + e.id + ',\'' + (nomeA || '').replace(/'/g, "\\'") + '\', ' + (typeof a.id === 'number' ? a.id : `'${a.id}'`) + ')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>';
            }
            if (e.status !== 'Bloqueado') {
                if (!isAtrib || (e.caixa_compartilhada && !hasAvulso)) {
                    acoes += '<button onclick="window.compEmailOpenModalAtribuir(' + e.id + ', null)" style="background:#4f46e5;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>';
                }
            }
            acoes += '</div>';
            
            var tags = '';
            if (e.caixa_compartilhada) tags += '<span style="font-size:0.65rem;background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:12px;margin-right:4px;display:inline-block;">Compartilhada</span>';
            if (e.recebe_copia) tags += '<span style="font-size:0.65rem;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:12px;display:inline-block;">Recebe Cópia</span>';

            return '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                '<td style="' + td + '">' +
                '<div style="font-weight:700;color:#2563eb;font-size:0.9rem;display:flex;align-items:center;">' + e.endereco + obsIcon(e.observacao) + '</div>' +
                '<div style="font-size:0.72rem;color:#64748b;margin-bottom:4px;">' + (e.plataforma || '-') + '</div>' + tags +
                '</td>' +
                '<td style="' + td + '">' + emailStatusBadge(e.status) + '</td>' +
                '<td style="' + td + '">' + respInfo + '</td>' +
                '<td style="' + td + '">' + acoes + '</td>' +
                '</tr>';
        }).join('');

        if (!filtered.length) rows = '<tr><td colspan="4" style="padding:2rem;text-align:center;color:#94a3b8;"><i class="ph ph-envelope-simple" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>Nenhum e-mail encontrado.</td></tr>';

        return '<div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">' +
            '<i class="ph ph-funnel" style="color:#94a3b8;font-size:1.1rem;"></i>' +
            '<input id="comp-email-filter-q" type="text" placeholder="Buscar por endereço, plataforma ou colaborador..." value="' + _filterEmailQ.replace(/"/g, '&quot;') + '" oninput="window.compEmailFilter()" style="flex:1;min-width:200px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;outline:none;">' +
            '<select id="comp-email-filter-status" onchange="window.compEmailFilterStatus()" style="border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;cursor:pointer;outline:none;">' +
            '<option value="">Todos</option>' +
            '<option value="disponivel"' + (fs === 'disponivel' ? ' selected' : '') + '>Disponível</option>' +
            '<option value="atribuido"' + (fs === 'atribuido' ? ' selected' : '') + '>Atribuído</option>' +
            '</select></div>' +
            '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">' +
            '<th style="' + thStyle + 'width:35%;">Endereço de E-mail</th>' +
            '<th style="' + thStyle + 'width:10%;">Status</th>' +
            '<th style="' + thStyle + 'width:30%;">Atribuído a</th>' +
            '<th style="' + thStyle + 'width:25%;">Ações</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    /* ─── Modal Computador ─── */
    function renderModal() {
        var c = _editandoId ? (_computadores.find(function (x) { return x.id === _editandoId; }) || {}) : {};
        var isEdit = !!_editandoId;

        var colabOptions = '<option value="">— Nenhum / Sem vínculo —</option>' +
            _colaboradores.map(function (col) {
                // Verifica se o colaborador já tem computador atribuído (bloqueia adicionar 2º)
                var jaTemComp = _computadores.some(function(cp) {
                    return String(cp.colaborador_id) === String(col.id) && cp.id !== _editandoId;
                });
                var disabled = jaTemComp ? ' disabled' : '';
                var label = col.nome_completo + ' – ' + (col.departamento || 'Sem dept.') + (jaTemComp ? ' (já tem computador)' : '');
                var sel = String(c.colaborador_id) === String(col.id) ? ' selected' : '';
                return '<option value="' + col.id + '"' + sel + disabled + '>' + label + '</option>';
            }).join('');

        return '<div id="modal-computador" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.55);z-index:3000;align-items:center;justify-content:center;padding:1rem;">' +
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">' +
            '<div style="padding:1.5rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">' +
            '<i class="ph ph-desktop" style="color:#fff;font-size:1.2rem;"></i></div>' +
            '<h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">' + (isEdit ? 'Editar Computador' : 'Novo Computador') + '</h3></div>' +
            '<button onclick="window.computadoresCloseModal()" style="background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;line-height:1;">&times;</button></div>' +
            '<form id="form-computador" onsubmit="event.preventDefault();window.computadoresSalvar();" style="padding:1.5rem;display:flex;flex-direction:column;gap:1.1rem;">' +
            fldSelect('comp-tipo', 'Tipo *', ['Notebook', 'All-In-One'], c.tipo || 'Notebook') +
            fldInput('comp-modelo', 'Modelo *', c.modelo || '', 'Ex: Dell Inspiron 15') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            fldInput('comp-patrimonio', 'Patrimônio', c.patrimonio || '', 'Ex: 00123') +
            fldInput('comp-serie', 'Nº de Série', c.numero_serie || '', 'Ex: SN-ABC123') +
            '</div>' +
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">Colaborador Vinculado <span style="font-size:0.7rem;color:#94a3b8;">(1 por colaborador)</span></label>' +
            '<select id="comp-colaborador" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;">' + colabOptions + '</select>' +
            '<input id="comp-colaborador-livre" type="text" value="' + (c.colaborador_livre || '').replace(/"/g, '&quot;') + '" placeholder="Ou digite o nome de alguém sem vínculo..." style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;margin-top:0.5rem;">' +
            '</div>' +
            fldSelect('comp-status', 'Status *', ['Em uso', 'Reserva', 'Manutenção', 'Devolvido', 'Inativo'], c.status || 'Em uso') +
            fldInput('comp-data', 'Data de Atribuição', c.data_atribuicao || '', '', 'date') +
            '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;"><i class="ph ph-lock-key"></i> Senha Windows</label>' +
            '<div style="position:relative;">' +
            '<input id="comp-senha" type="password" value="' + (c.senha_windows || '').replace(/"/g, '&quot;') + '" placeholder="Senha do Windows" autocomplete="new-password" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 2.5rem 0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;box-sizing:border-box;">' +
            '<button type="button" onclick="var i=document.getElementById(\'comp-senha\');var ic=this.querySelector(\'i\');if(i.type===\'password\'){i.type=\'text\';ic.className=\'ph ph-eye-slash\';}else{i.type=\'password\';ic.className=\'ph ph-eye\';}" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;padding:4px;">' +
            '<i class="ph ph-eye"></i></button></div></div>' +
            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;">' +
            '<h4 style="margin:0 0 1rem 0;font-size:0.9rem;color:#0f172a;"><i class="ph ph-cpu" style="margin-right:5px;color:#6366f1;"></i>Especificações</h4>' +
            fldInput('comp-processador', 'Processador', c.processador || '', 'Ex: Intel Core i5') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem;">' +
            fldInput('comp-ram1', 'Memória RAM 1', c.ram_1 || '', 'Ex: 8GB DDR4') +
            fldInput('comp-ram2', 'Memória RAM 2 (Opcional)', c.ram_2 || '', 'Ex: 8GB DDR4') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem;">' +
            fldInput('comp-ssd', 'Armazenamento (SSD/HD)', c.ssd || '', 'Ex: 256GB NVMe') +
            '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">Memória Expansível?</label>' +
            '<select id="comp-expansivel" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;">' +
            '<option value="0"' + (!c.expansivel ? ' selected' : '') + '>Não / Desconhecido</option>' +
            '<option value="1"' + (c.expansivel ? ' selected' : '') + '>Sim</option>' +
            '</select></div></div></div>' +
            '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">Observações</label>' +
            '<textarea id="comp-obs" rows="3" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Observações adicionais...">' + (c.observacoes || '') + '</textarea></div>' +
            '<div style="display:flex;gap:0.75rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #f1f5f9;">' +
            '<button type="button" onclick="window.computadoresCloseModal()" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:0.55rem 1.1rem;cursor:pointer;font-size:0.88rem;color:#64748b;font-weight:600;">Cancelar</button>' +
            '<button type="submit" id="btn-salvar-computador" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;padding:0.55rem 1.4rem;cursor:pointer;font-size:0.88rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;">' +
            '<i class="ph ph-floppy-disk"></i> ' + (isEdit ? 'Salvar Alterações' : 'Cadastrar') + '</button></div>' +
            '</form></div></div>';
    }

    /* ─── Modais E-mail ─── */
    function renderModalEmail() {
        var e = _editandoEmail;
        return '<div id="modal-comp-email-cadastro" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:95%;max-width:800px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;height:95vh;max-height:95vh;margin:1rem;">' +
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">' +
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-envelope-simple" style="color:#4f46e5;font-size:1.4rem;"></i> ' + (e ? 'Editar E-mail' : 'Cadastrar E-mail') + '</h3>' +
            '<button onclick="document.getElementById(\'modal-comp-email-cadastro\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>' +
            '<div style="padding:1.5rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Endereço de E-mail *</label>' +
            '<input id="comp-email-cad-endereco" type="email" value="' + (e ? e.endereco : '') + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Senha Temporária/Acesso</label>' +
            '<input id="comp-email-cad-senha" type="text" value="' + (e ? e.senha || '' : '') + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Plataforma</label>' +
            '<input id="comp-email-cad-plat" type="text" placeholder="Ex: Google Workspace" value="' + (e ? e.plataforma || '' : '') + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Situação</label>' +
            '<select id="comp-email-cad-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' +
            '<option value="Ativo"' + (e && e.status === 'Ativo' ? ' selected' : '') + '>Ativo</option>' +
            '<option value="Bloqueado"' + (e && e.status === 'Bloqueado' ? ' selected' : '') + '>Bloqueado</option></select></div></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observações</label>' +
            '<textarea id="comp-email-cad-obs" rows="2" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' + (e ? e.observacao || '' : '') + '</textarea></div>' +
            '<div style="display:flex;gap:1.5rem;margin-top:0.25rem;">' +
            '<label style="font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="comp-email-cad-caixa" ' + (e && e.caixa_compartilhada ? 'checked' : '') + ' onchange="window.compEmailToggleRelacionamentos()"> Caixa Compartilhada</label>' +
            '<label style="font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="comp-email-cad-copia" ' + (e && e.recebe_copia ? 'checked' : '') + ' onchange="window.compEmailToggleRelacionamentos()"> Recebe cópia dos e-mails</label>' +
            '</div>' +
            '<div id="comp-email-rel-copia-container" style="display:' + (e && (e.recebe_copia || e.caixa_compartilhada) ? 'block' : 'none') + ';margin-top:0.5rem;">' +
            '<label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Recebe cópia ou é compartilhada com quais e-mails?</label>' +
            '<div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
            '<div style="padding:0.4rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;">' +
            '<input type="text" placeholder="Pesquisar e-mail..." oninput="window.compEmailFilterCb(\'copias\', this.value)" style="width:100%;border:1px solid #cbd5e1;border-radius:4px;padding:4px 8px;font-size:0.8rem;outline:none;">' +
            '</div>' +
            '<div id="comp-email-list-copias" style="max-height:160px;overflow-y:auto;padding:0.25rem;">' +
            _emails.filter(function(em) { return !e || em.id !== e.id; }).map(function(em) { 
                var sel = (e && e.relacionamentos && e.relacionamentos.some(function(r){ return (r.tipo === "recebe_copia_de" || r.tipo === "compartilhada_com") && r.email_destino_id === em.id; })) ? ' checked' : '';
                return '<label style="display:flex;align-items:center;gap:5px;padding:4px 8px;font-size:0.85rem;cursor:pointer;" class="email-cb-item"><input type="checkbox" value="' + em.id + '" class="cb-copia"' + sel + '> <span class="email-cb-text">' + em.endereco + '</span></label>'; 
            }).join('') +
            '</div></div></div>' +
            '</div>' +
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">' +
            '<button onclick="document.getElementById(\'modal-comp-email-cadastro\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.compEmailSaveEmail()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar</button>' +
            '</div></div></div>';
    }

    function renderModalAtribuirEmail() {
        // Todos os e-mails disponíveis para atribuição (sem dono) + o atual se editando
        var emOpts = _emails.filter(function (e) {
            return !e.colaborador_id && !e.responsavel_nome && (!e.atribuicoes || e.atribuicoes.length === 0) || e.caixa_compartilhada;
        }).map(function (e) {
            return '<option value="' + e.id + '"' + (e.id === _atribData.email_id ? ' selected' : '') + '>' + e.endereco + (e.caixa_compartilhada ? ' (Compartilhada)' : '') + '</option>';
        }).join('');

        // Colaboradores — podem ter múltiplos e-mails, então não filtramos
        var coOpts = _colaboradores.map(function (c) {
            return '<option value="' + c.id + '"' + (c.id === _atribData.colab_id ? ' selected' : '') + '>' + c.nome_completo + ' – ' + (c.departamento || '') + '</option>';
        }).join('');

        return '<div id="modal-comp-email-atribuir" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;margin:1rem;">' +
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">' +
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-link" style="color:#4f46e5;font-size:1.4rem;"></i> Atribuir E-mail</h3>' +
            '<button onclick="document.getElementById(\'modal-comp-email-atribuir\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>' +
            '<div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">E-mail Disponível *</label>' +
            '<select id="comp-atrib-email-id" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' +
            '<option value="">-- Selecione o E-mail --</option>' + emOpts + '</select></div>' +
            '<div style="display:flex;gap:1rem;margin-bottom:0.25rem;">' +
            '<label style="font-size:0.85rem;font-weight:600;cursor:pointer;"><input type="radio" name="comp_email_tipo_resp" value="colaborador" checked onchange="window.compEmailToggleResp(this.value)"> Colaborador</label>' +
            '<label style="font-size:0.85rem;font-weight:600;cursor:pointer;"><input type="radio" name="comp_email_tipo_resp" value="avulso" onchange="window.compEmailToggleResp(this.value)"> Responsável Avulso</label></div>' +
            '<div id="comp-email-resp-colab">' +
            '<label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Colaborador <small style="color:#64748b;font-weight:400;">(pode ter múltiplos e-mails)</small></label>' +
            '<select id="comp-atrib-email-colab" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' +
            '<option value="">-- Selecione --</option>' + coOpts + '</select></div>' +
            '<div id="comp-email-resp-avulso" style="display:none;">' +
            '<label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Nome do Responsável (Livre)</label>' +
            '<input id="comp-atrib-email-avulso-nome" type="text" placeholder="Ex: Financeiro Geral" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data de Atribuição</label>' +
            '<input id="comp-atrib-email-data" type="date" value="' + (new Date().toISOString().split('T')[0]) + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">' +
            '<button onclick="document.getElementById(\'modal-comp-email-atribuir\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.compEmailSaveAtribuir()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Atribuir</button>' +
            '</div></div></div>';
    }

    function renderModalDevolverEmail() {
        return '<div id="modal-comp-email-devolver" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:400px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;text-align:center;margin:1rem;">' +
            '<div style="padding:2rem 1.5rem 1rem;">' +
            '<div style="width:60px;height:60px;background:#fee2e2;color:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1rem;"><i class="ph ph-warning-circle"></i></div>' +
            '<h3 style="margin:0 0 0.5rem;font-size:1.2rem;color:#0f172a;">Devolver E-mail</h3>' +
            '<p style="margin:0;color:#64748b;font-size:0.9rem;">Remover o e-mail de <strong id="comp-email-dev-nome" style="color:#0f172a;"></strong>?<br><small>O e-mail ficará disponível para nova atribuição.</small></p></div>' +
            '<div style="padding:1rem 1.5rem;display:flex;justify-content:center;gap:0.75rem;margin-bottom:1rem;">' +
            '<button onclick="document.getElementById(\'modal-comp-email-devolver\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.compEmailSaveDevolver()" style="background:#dc2626;color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Sim, Devolver</button>' +
            '</div></div></div>';
    }

    function fldInput(id, label, value, placeholder, type) {
        type = type || 'text';
        return '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">' + label + '</label>' +
            '<input id="' + id + '" type="' + type + '" value="' + String(value).replace(/"/g, '&quot;') + '" placeholder="' + (placeholder || '') + '" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;box-sizing:border-box;"></div>';
    }
    function fldSelect(id, label, opts, selected) {
        return '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">' + label + '</label>' +
            '<select id="' + id + '" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;">' +
            opts.map(function (o) { return '<option value="' + o + '"' + (o === selected ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select></div>';
    }

    /* ─── Public API ─── */
    window.computadoresInit = function () { loadAll(); };

    window.computadoresFilter = function () {
        var fId = document.activeElement ? document.activeElement.id : null;
        var sStart = document.activeElement ? document.activeElement.selectionStart : null;
        _filterQ = (document.getElementById('comp-filter-q') || {}).value || '';
        if (_activeTab === 'computadores') _filterStatus = (document.getElementById('comp-filter-status') || {}).value || '';
        var wrap = document.getElementById('comp-tab-content');
        if (!wrap) return;
        if (_activeTab === 'colaboradores') wrap.innerHTML = renderTabColaboradores();
        else if (_activeTab === 'computadores') wrap.innerHTML = renderTabComputadores();
        if(fId){var el=document.getElementById(fId);if(el){el.focus();try{el.setSelectionRange(sStart,sStart);}catch(e){}}}
    };

    window.compEmailFilter = function () {
        var fId = document.activeElement ? document.activeElement.id : null;
        var sStart = document.activeElement ? document.activeElement.selectionStart : null;
        _filterEmailQ = (document.getElementById('comp-email-filter-q') || {}).value || '';
        var wrap = document.getElementById('comp-tab-content');
        if (wrap) wrap.innerHTML = renderTabEmails();
        if(fId){var el=document.getElementById(fId);if(el){el.focus();try{el.setSelectionRange(sStart,sStart);}catch(e){}}}
    };

    window.compEmailFilterStatus = function () {
        _filterEmailStatus = (document.getElementById('comp-email-filter-status') || {}).value || '';
        var wrap = document.getElementById('comp-tab-content');
        if (wrap) wrap.innerHTML = renderTabEmails();
    };

    window.computadoresSetSort = function (col) {
        if (_sortCol === col) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        else { _sortCol = col; _sortDir = 'asc'; }
        var wrap = document.getElementById('comp-tab-content');
        if (wrap) wrap.innerHTML = renderTabComputadores();
    };

    window.computadoresOpenModal = function (id) {
        _editandoId = id || null;
        var cont = document.getElementById('computadores-content');
        if (cont) {
            var old = document.getElementById('modal-computador');
            if (old) old.remove();
            cont.insertAdjacentHTML('beforeend', renderModal());
        }
        var m = document.getElementById('modal-computador');
        if (m) m.style.display = 'flex';
    };

    window.computadoresCloseModal = function () {
        var m = document.getElementById('modal-computador');
        if (m) { m.style.display = 'none'; m.remove(); }
        _editandoId = null;
    };

    window.computadoresSalvar = async function () {
        var tipo = (document.getElementById('comp-tipo') || {}).value;
        var modelo = ((document.getElementById('comp-modelo') || {}).value || '').trim();
        var patrimonio = (document.getElementById('comp-patrimonio') || {}).value || '';
        var numero_serie = (document.getElementById('comp-serie') || {}).value || '';
        var colaborador_id = (document.getElementById('comp-colaborador') || {}).value || null;
        var colaborador_livre = (document.getElementById('comp-colaborador-livre') || {}).value || '';
        if (colaborador_id) colaborador_livre = null;
        var status = (document.getElementById('comp-status') || {}).value;
        var data_atribuicao = (document.getElementById('comp-data') || {}).value || null;
        var senha_windows = (document.getElementById('comp-senha') || {}).value || '';
        var observacoes = (document.getElementById('comp-obs') || {}).value || '';
        var processador = (document.getElementById('comp-processador') || {}).value || '';
        var ram_1 = (document.getElementById('comp-ram1') || {}).value || '';
        var ram_2 = (document.getElementById('comp-ram2') || {}).value || '';
        var ssd = (document.getElementById('comp-ssd') || {}).value || '';
        var expansivel = parseInt((document.getElementById('comp-expansivel') || {}).value || 0, 10);

        if (!tipo) return alert('Selecione o tipo do computador.');
        if (!modelo) return alert('Informe o modelo do computador.');

        // Bloqueia 2º computador para o mesmo colaborador
        if (colaborador_id) {
            var jaTemOutro = _computadores.some(function (cp) {
                return String(cp.colaborador_id) === String(colaborador_id) && cp.id !== _editandoId;
            });
            if (jaTemOutro) return alert('Este colaborador já possui um computador atribuído. Cada colaborador pode ter apenas 1 computador.');
        }

        var payload = { tipo, modelo, patrimonio, numero_serie, colaborador_id: colaborador_id || null, colaborador_livre, status, data_atribuicao, senha_windows, observacoes, processador, ram_1, ram_2, ssd, expansivel };
        var btn = document.getElementById('btn-salvar-computador');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

        try {
            if (_editandoId) await _apiPut('/computadores/' + _editandoId, payload);
            else await _apiPost('/computadores', payload);
            window.computadoresCloseModal();
            await loadAll();
        } catch (e) {
            alert('Erro ao salvar: ' + (e.message || e));
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar'; }
        }
    };

    window.computadoresExcluir = async function (id, nome) {
        if (!confirm('Excluir o computador "' + nome + '"? Esta ação não pode ser desfeita.')) return;
        try { await _apiDelete('/computadores/' + id); await loadAll(); }
        catch (e) { alert('Erro ao excluir: ' + (e.message || e)); }
    };

    window.computadoresDevolver = async function (id, nome) {
        if (!confirm('Tem certeza que deseja devolver o computador de ' + nome + '? Ele ficará disponível.')) return;
        try { 
            await fetch('/api/computadores/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
                body: JSON.stringify({ status: 'Devolvido', colaborador_id: null, colaborador_livre: '', data_atribuicao: '' })
            });
            await loadAll(); 
        }
        catch (e) { alert('Erro ao devolver: ' + (e.message || e)); }
    };

    window.computadoresToggleHistorico = async function (id) {
        var row = document.getElementById('hist-row-comp-' + id);
        if (!row) return;
        if (row.style.display === 'table-row') {
            row.style.display = 'none';
            return;
        }
        row.style.display = 'table-row';
        var cont = document.getElementById('hist-content-comp-' + id);
        cont.innerHTML = '<div style="text-align:center;padding:1rem;"><i class="ph ph-spinner ph-spin" style="font-size:1.5rem;color:#6366f1;"></i></div>';
        
        try {
            var data = await _apiGet('/computadores/historico/' + id);
            if (!data || data.length === 0) {
                cont.innerHTML = '<div style="text-align:center;color:#64748b;font-size:0.85rem;">Nenhum histórico encontrado.</div>';
                return;
            }
            var html = '<div style="max-height:200px;overflow-y:auto;padding-right:0.5rem;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">' +
                '<thead><tr style="text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">' +
                '<th style="padding:0.4rem 0;">Data</th><th>Ação</th><th>Responsável</th><th>Observação</th>' +
                '</tr></thead><tbody>';
            
            data.forEach(function(h) {
                var d = new Date(h.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(h.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                var resp = h.colab_nome || h.responsavel_nome || '-';
                html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
                    '<td style="padding:0.4rem 0;color:#64748b;">' + d + '</td>' +
                    '<td><span style="font-weight:600;color:#0f172a;">' + h.acao + '</span></td>' +
                    '<td>' + resp + '</td>' +
                    '<td style="color:#64748b;">' + (h.observacao || '-') + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div>';
            cont.innerHTML = html;
        } catch(e) {
            cont.innerHTML = '<div style="color:red;font-size:0.85rem;">Erro ao carregar histórico: ' + e.message + '</div>';
        }
    };

    /* ─── Ações E-mail ─── */
    window.compEmailFilterCb = function(tipo, termo) {
        termo = termo.toLowerCase().trim();
        var container = document.getElementById('comp-email-list-' + tipo);
        if (!container) return;
        var labels = container.querySelectorAll('label.email-cb-item');
        for (var i = 0; i < labels.length; i++) {
            var text = labels[i].querySelector('.email-cb-text').textContent.toLowerCase();
            labels[i].style.display = text.includes(termo) ? 'flex' : 'none';
        }
    };

    window.compEmailToggleRelacionamentos = function() {
        var cx = document.getElementById('comp-email-cad-caixa');
        var cp = document.getElementById('comp-email-cad-copia');
        
        if (cx && cx.checked && cp) {
            cp.checked = true;
        }

        var cpCont = document.getElementById('comp-email-rel-copia-container');
        if (cpCont) cpCont.style.display = ((cx && cx.checked) || (cp && cp.checked)) ? 'block' : 'none';
    };

    window.compEmailOpenModalEmail = function (id) {
        _editandoEmail = id ? (_emails.find(function (e) { return e.id === id; }) || null) : null;
        renderTela();
        setTimeout(function () {
            var m = document.getElementById('modal-comp-email-cadastro');
            if (m) m.style.display = 'flex';
        }, 50);
    };

    window.compEmailSaveEmail = function () {
        var end = ((document.getElementById('comp-email-cad-endereco') || {}).value || '').trim();
        var sen = (document.getElementById('comp-email-cad-senha') || {}).value || '';
        var pla = (document.getElementById('comp-email-cad-plat') || {}).value || '';
        var sta = (document.getElementById('comp-email-cad-status') || {}).value || 'Ativo';
        var obs = (document.getElementById('comp-email-cad-obs') || {}).value || '';
        var cx = (document.getElementById('comp-email-cad-caixa') || {}).checked;
        var cp = (document.getElementById('comp-email-cad-copia') || {}).checked;

        var emCop = [];
        var cbsCp = document.querySelectorAll('.cb-copia:checked');
        for (var j = 0; j < cbsCp.length; j++) emCop.push(cbsCp[j].value);

        var emComp = cx ? emCop : [];

        if (!end) return alert('Endereço de e-mail é obrigatório.');

        var payload = { endereco: end, senha: sen, plataforma: pla, status: sta, observacao: obs, caixa_compartilhada: cx, recebe_copia: cp, emails_compartilhados: emComp, emails_copia: emCop };
        var url = _editandoEmail ? '/api/emails/' + _editandoEmail.id : '/api/emails';
        var meth = _editandoEmail ? 'PUT' : 'POST';

        fetch(url, { method: meth, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.error) return alert(data.error);
                _editandoEmail = null;
                reloadEmails();
            }).catch(function (e) { alert('Erro de rede: ' + e.message); });
    };

    window.compEmailDelete = function (id) {
        if (!confirm('Excluir este e-mail permanentemente?')) return;
        fetch('/api/emails/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + _tok() } })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.error) return alert(data.error);
                reloadEmails();
            }).catch(function (e) { alert('Erro: ' + e.message); });
    };

    window.compEmailOpenModalAtribuir = function (emailId, colabId) {
        _atribData = { email_id: emailId, colab_id: colabId };
        renderTela();
        setTimeout(function () {
            var m = document.getElementById('modal-comp-email-atribuir');
            if (m) m.style.display = 'flex';
            if (emailId) {
                var sel = document.getElementById('comp-atrib-email-id');
                if (sel) sel.value = emailId;
            }
            if (colabId) {
                var selC = document.getElementById('comp-atrib-email-colab');
                if (selC) selC.value = colabId;
            }
        }, 60);
    };

    window.compEmailToggleResp = function (v) {
        var colab = document.getElementById('comp-email-resp-colab');
        var avulso = document.getElementById('comp-email-resp-avulso');
        if (colab) colab.style.display = v === 'colaborador' ? 'block' : 'none';
        if (avulso) avulso.style.display = v === 'avulso' ? 'block' : 'none';
    };

    window.compEmailSaveAtribuir = function () {
        var emailId = (document.getElementById('comp-atrib-email-id') || {}).value || '';
        if (!emailId) return alert('Selecione um e-mail.');

        var tipoRad = document.querySelector('input[name="comp_email_tipo_resp"]:checked');
        var tipo = tipoRad ? tipoRad.value : 'colaborador';
        var colabId = tipo === 'colaborador' ? ((document.getElementById('comp-atrib-email-colab') || {}).value || null) : null;
        var nomeAvulso = tipo === 'avulso' ? (((document.getElementById('comp-atrib-email-avulso-nome') || {}).value || '').trim()) : null;
        var dataAt = (document.getElementById('comp-atrib-email-data') || {}).value || '';
        if (tipo === 'colaborador' && !colabId) return alert('Selecione um colaborador.');
        if (tipo === 'avulso' && !nomeAvulso) return alert('Informe o nome do responsável.');

        fetch('/api/emails/' + emailId + '/atribuir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
            body: JSON.stringify({ colaborador_id: colabId, responsavel_nome: nomeAvulso, data_atribuicao: dataAt })
        }).then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.error) return alert(data.error);
            var m = document.getElementById('modal-comp-email-atribuir');
            if (m) m.style.display = 'none';
            reloadEmails();
        }).catch(function (e) { alert('Erro de rede: ' + e.message); });
    };

    window.compEmailOpenModalDevolver = function (emailId, nomeResp, atribId) {
        _devEmailId = emailId;
        _devAtribId = atribId;
        var el = document.getElementById('comp-email-dev-nome');
        if (el) el.textContent = nomeResp;
        var m = document.getElementById('modal-comp-email-devolver');
        if (m) m.style.display = 'flex';
    };

    window.compEmailSaveDevolver = function () {
        fetch('/api/emails/' + _devEmailId + '/devolver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
            body: JSON.stringify({ atribuicao_id: _devAtribId })
        }).then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.error) return alert(data.error);
            var m = document.getElementById('modal-comp-email-devolver');
            if (m) m.style.display = 'none';
            reloadEmails();
        }).catch(function (e) { alert('Erro: ' + e.message); });
    };

    // --- Novos Modais: Vincular Equipamentos e Devolver Equipamentos ---
    var _vincularColabId = null;
    var _devolverColabId = null;

    window.computadoresVincularModal = function(colabId) {
        _vincularColabId = colabId;
        renderTela();
        setTimeout(function(){
            var m = document.getElementById('modal-vincular-equipamentos');
            if(m) m.style.display = 'flex';
        }, 50);
    };

    function renderModalVincularEquipamentos() {
        var c = _colaboradores.find(function(x){ return x.id === _vincularColabId; });
        if(!c) return '';

        var compOpts = '<option value="">— Selecione um Computador —</option>' +
            _computadores.filter(function(cp) { return !cp.colaborador_id && (cp.status === 'Disponível' || cp.status === 'Reserva' || cp.status === 'Devolvido'); })
            .map(function(cp) {
                return '<option value="'+cp.id+'">'+(cp.tipo||'Computador')+' '+cp.modelo+' (Patr: '+cp.patrimonio+')</option>';
            }).join('');

        var emailsList = _emails.filter(function(em) { return !em.colaborador_id && !em.caixa_compartilhada; })
            .map(function(em) {
                return '<label style="display:flex;align-items:center;gap:5px;padding:4px 8px;font-size:0.85rem;cursor:pointer;" class="email-cb-item">' +
                       '<input type="checkbox" value="'+em.id+'" class="cb-vincular-email"> ' +
                       '<span class="email-cb-text">'+em.endereco+'</span></label>';
            }).join('');

        if (!emailsList) emailsList = '<div style="padding:0.5rem;font-size:0.85rem;color:#94a3b8;font-style:italic;">Nenhum e-mail disponível.</div>';

        return '<div id="modal-vincular-equipamentos" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;max-height:90vh;">' +
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">' +
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-link" style="color:#4f46e5;font-size:1.4rem;"></i> Vincular a '+(c.nome_completo)+'</h3>' +
            '<button onclick="document.getElementById(\'modal-vincular-equipamentos\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>' +
            '<div style="padding:1.5rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Computador</label>' +
            '<select id="vincular-comp-id" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' + compOpts + '</select></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">E-mails</label>' +
            '<div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
            '<div style="padding:0.4rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;">' +
            '<input type="text" placeholder="Pesquisar e-mail..." oninput="window.compEmailFilterCb(\'vincular\', this.value)" style="width:100%;border:1px solid #cbd5e1;border-radius:4px;padding:4px 8px;font-size:0.8rem;outline:none;">' +
            '</div><div id="comp-email-list-vincular" style="max-height:160px;overflow-y:auto;padding:0.25rem;">' + emailsList + '</div></div></div>' +
            '</div>' +
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">' +
            '<button onclick="document.getElementById(\'modal-vincular-equipamentos\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.computadoresSalvarVincularEquipamentos()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar Vínculos</button>' +
            '</div></div></div>';
    }

    window.computadoresSalvarVincularEquipamentos = async function() {
        var compId = document.getElementById('vincular-comp-id').value;
        var emCb = document.querySelectorAll('.cb-vincular-email:checked');
        var emailIds = Array.from(emCb).map(function(cb){ return cb.value; });

        if(!compId && emailIds.length === 0) {
            alert('Selecione pelo menos um computador ou e-mail para vincular.');
            return;
        }

        var promises = [];
        var dataHoje = new Date().toISOString().split('T')[0];

        if(compId) {
            var cp = _computadores.find(function(x){ return String(x.id) === compId; });
            if(cp) {
                var payload = Object.assign({}, cp, {
                    colaborador_id: _vincularColabId,
                    status: 'Em uso',
                    data_atribuicao: dataHoje,
                    colaborador_livre: ''
                });
                promises.push(
                    fetch('/api/computadores/' + compId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
                        body: JSON.stringify(payload)
                    }).then(function(r){ return r.json(); })
                );
            }
        }

        emailIds.forEach(function(eId) {
            promises.push(
                fetch('/api/emails/' + eId + '/atribuir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
                    body: JSON.stringify({ colaborador_id: _vincularColabId, data_atribuicao: dataHoje })
                }).then(function(r){ return r.json(); })
            );
        });

        document.getElementById('modal-vincular-equipamentos').style.opacity = '0.5';
        try {
            await Promise.all(promises);
            document.getElementById('modal-vincular-equipamentos').style.display='none';
            document.getElementById('modal-vincular-equipamentos').style.opacity = '1';
            await loadAll();
        } catch(e) {
            alert('Erro ao vincular: ' + e.message);
            document.getElementById('modal-vincular-equipamentos').style.opacity = '1';
        }
    };

    window.computadoresDevolverMulti = function(colabId, nome) {
        _devolverColabId = colabId;
        renderTela();
        setTimeout(function(){
            var m = document.getElementById('modal-devolver-multi');
            if(m) m.style.display = 'flex';
        }, 50);
    };

    function renderModalDevolverMulti() {
        var c = _colaboradores.find(function(x){ return x.id === _devolverColabId; });
        if(!c) return '';

        var comps = _computadores.filter(function(cp) { return String(cp.colaborador_id) === String(_devolverColabId); });
        var emails = _emails.filter(function(em) { return String(em.colaborador_id) === String(_devolverColabId); });

        var opts = '';
        if(comps.length > 0) {
            var cp = comps[0];
            opts += '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;cursor:pointer;">' +
                    '<input type="checkbox" value="'+cp.id+'" class="cb-dev-comp" checked>' +
                    '<div><div style="font-weight:700;color:#0f172a;font-size:0.9rem;">Computador: '+cp.modelo+'</div><div style="font-size:0.75rem;color:#64748b;">Patrimônio: '+(cp.patrimonio||'-')+'</div></div></label>';
        }

        emails.forEach(function(em) {
            opts += '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;cursor:pointer;">' +
                    '<input type="checkbox" value="'+em.id+'" class="cb-dev-email" checked>' +
                    '<div><div style="font-weight:700;color:#0f172a;font-size:0.9rem;">E-mail: '+em.endereco+'</div><div style="font-size:0.75rem;color:#64748b;">' + (em.plataforma||'') + '</div></div></label>';
        });

        if(!opts) opts = '<div style="color:#64748b;font-size:0.9rem;">Nenhum equipamento para devolver.</div>';

        return '<div id="modal-devolver-multi" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:450px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;">' +
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#fef2f2;border-radius:12px 12px 0 0;">' +
            '<h3 style="margin:0;font-size:1.1rem;color:#991b1b;display:flex;align-items:center;gap:8px;"><i class="ph ph-arrow-u-up-left" style="color:#ef4444;font-size:1.4rem;"></i> Devolver Equipamentos</h3>' +
            '<button onclick="document.getElementById(\'modal-devolver-multi\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>' +
            '<div style="padding:1.5rem;">' +
            '<p style="margin:0 0 1rem 0;font-size:0.9rem;color:#334155;">O que você deseja devolver de <strong>'+c.nome_completo+'</strong>?</p>' +
            opts +
            '</div>' +
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">' +
            '<button onclick="document.getElementById(\'modal-devolver-multi\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.computadoresSalvarDevolverMulti()" style="background:#ef4444;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Confirmar Devolução</button>' +
            '</div></div></div>';
    }

    window.computadoresSalvarDevolverMulti = async function() {
        var compCb = document.querySelectorAll('.cb-dev-comp:checked');
        var compIds = Array.from(compCb).map(function(cb){ return cb.value; });
        var emCb = document.querySelectorAll('.cb-dev-email:checked');
        var emailIds = Array.from(emCb).map(function(cb){ return cb.value; });

        if(compIds.length === 0 && emailIds.length === 0) {
            alert('Selecione pelo menos um item para devolver.');
            return;
        }

        var promises = [];
        
        compIds.forEach(function(cId) {
            var cp = _computadores.find(function(x){ return String(x.id) === cId; });
            if(cp) {
                var payload = Object.assign({}, cp, { colaborador_id: null, status: 'Devolvido', colaborador_livre: '' });
                promises.push(
                    fetch('/api/computadores/' + cId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
                        body: JSON.stringify(payload)
                    }).then(function(r){ return r.json(); })
                );
            }
        });

        emailIds.forEach(function(eId) {
            promises.push(
                fetch('/api/emails/' + eId + '/devolver', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
                    body: JSON.stringify({ colaborador_id: _devolverColabId })
                }).then(function(r){ return r.json(); })
            );
        });

        document.getElementById('modal-devolver-multi').style.opacity = '0.5';
        try {
            await Promise.all(promises);
            document.getElementById('modal-devolver-multi').style.display='none';
            document.getElementById('modal-devolver-multi').style.opacity = '1';
            await loadAll();
        } catch(e) {
            alert('Erro ao devolver: ' + e.message);
            document.getElementById('modal-devolver-multi').style.opacity = '1';
        }
    };

})();
