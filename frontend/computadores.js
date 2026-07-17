// =============================================================
// MODULO COMPUTADORES CORPORATIVOS
// =============================================================
(function () {
    'use strict';

    var _computadores = [];
    var _colaboradores = [];
    var _editandoId = null;
    var _filterQ = '';
    var _filterStatus = '';
    var _sortCol = 'nome_colaborador';
    var _sortDir = 'asc';

    /* ─── API Helpers ─── */
    async function _apiGet(p) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { headers: { 'Authorization': 'Bearer ' + currentToken } });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiPost(p, body) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { method: 'POST', headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiPut(p, body) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiDelete(p) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + currentToken } });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    /* ─── helpers ─── */
    function fmtData(s) {
        if (!s) return '-';
        var p = s.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s;
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
        if (fotoBase64) return '<img src="' + fotoBase64 + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' + dv.replace('flex-shrink:0;">', 'flex-shrink:0;display:none">');
        if (!fotoPath) return dv;
        var base = (typeof API_URL !== 'undefined') ? API_URL.replace('/api', '') : '';
        var dvEsc = dv.replace(/"/g, '&quot;');
        return '<img src="' + base + '/' + fotoPath + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\'' + dvEsc + '\'">';
    }
    function statusInfo(s) {
        var map = {
            'Em uso':      { bg: '#dbeafe', color: '#1e40af', icon: 'ph-monitor' },
            'Reserva':     { bg: '#f3e8ff', color: '#6d28d9', icon: 'ph-archive-box' },
            'Manutenção':  { bg: '#fef9c3', color: '#854d0e', icon: 'ph-wrench' },
            'Devolvido':   { bg: '#f1f5f9', color: '#64748b', icon: 'ph-arrow-u-up-left' },
            'Inativo':     { bg: '#fee2e2', color: '#991b1b', icon: 'ph-x-circle' }
        };
        return map[s] || { bg: '#f1f5f9', color: '#64748b', icon: 'ph-monitor' };
    }
    function statusBadge(s) {
        var i = statusInfo(s);
        return '<span style="background:' + i.bg + ';color:' + i.color + ';padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ' + i.icon + '"></i>' + (s || '-') + '</span>';
    }
    function tipoIcon(t) {
        return t === 'Notebook' ? 'ph-laptop' : 'ph-monitor';
    }

    /* ─── API ─── */
    async function loadAll() {
        try {
            var r = await Promise.all([
                _apiGet('/computadores'),
                _apiGet('/computadores/colaboradores')
            ]);
            _computadores = r[0] || [];
            _colaboradores = r[1] || [];
        } catch (e) {
            console.error('[COMPUTADORES]', e);
            _computadores = [];
            _colaboradores = [];
        }
        renderTela();
    }

    /* ─── Main render ─── */
    function renderTela() {
        var cont = document.getElementById('computadores-content');
        if (!cont) return;

        var total = _computadores.length;
        var emUso = _computadores.filter(function (c) { return c.status === 'Em uso'; }).length;
        var reserva = _computadores.filter(function (c) { return c.status === 'Reserva'; }).length;
        var manut = _computadores.filter(function (c) { return c.status === 'Manutenção'; }).length;

        cont.innerHTML =
            '<div style="padding:1.5rem 1.5rem 0;">' +
            // Header
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">' +
            '<i class="ph ph-desktop" style="font-size:1.5rem;color:#fff;"></i></div>' +
            '<div><h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;">Computadores Corporativos</h2>' +
            '<p style="margin:0;font-size:0.8rem;color:#64748b;">' + total + ' equipamento(s) cadastrado(s)</p></div>' +
            '</div>' +
            '<button id="btn-novo-computador" onclick="window.computadoresOpenModal()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:0.55rem 1.1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;box-shadow:0 2px 8px rgba(99,102,241,0.3);">' +
            '<i class="ph ph-plus"></i> Novo Computador</button>' +
            '</div>' +
            // Stats cards
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;margin-bottom:1.5rem;">' +
            statCard('ph-stack', 'Total', total, '#6366f1', '#eef2ff') +
            statCard('ph-monitor', 'Em Uso', emUso, '#2563eb', '#dbeafe') +
            statCard('ph-archive-box', 'Reserva', reserva, '#7c3aed', '#f3e8ff') +
            statCard('ph-wrench', 'Manutenção', manut, '#d97706', '#fef9c3') +
            '</div>' +
            // Filter bar
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
            '</div>' +
            '<div style="padding:0 1.5rem 2rem;" id="comp-table-wrap">' +
            renderTable() +
            '</div>' +
            renderModal();
    }

    function statCard(icon, label, val, color, bg) {
        return '<div style="background:#fff;border-radius:10px;padding:0.9rem 1rem;border:1px solid #e2e8f0;display:flex;align-items:center;gap:0.6rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);">' +
            '<div style="width:34px;height:34px;border-radius:8px;background:' + bg + ';display:flex;align-items:center;justify-content:center;">' +
            '<i class="ph ' + icon + '" style="color:' + color + ';font-size:1.1rem;"></i></div>' +
            '<div><div style="font-size:1.25rem;font-weight:800;color:#0f172a;line-height:1;">' + val + '</div>' +
            '<div style="font-size:0.72rem;color:#64748b;">' + label + '</div>' +
            '</div></div>';
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

        // Sort
        var sm = _sortDir === 'asc' ? 1 : -1;
        filtered.sort(function (a, b) {
            var v1 = (a[_sortCol] || '').toString().toLowerCase();
            var v2 = (b[_sortCol] || '').toString().toLowerCase();
            return v1.localeCompare(v2) * sm;
        });

        if (!filtered.length) {
            return '<div style="text-align:center;padding:3rem;color:#94a3b8;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">' +
                '<i class="ph ph-desktop" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>' +
                'Nenhum computador encontrado.' +
                '</div>';
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
            var shortName = c.nome_colaborador && c.nome_colaborador.length > 20 ? c.nome_colaborador.substring(0, 20) + '...' : (c.nome_colaborador || '-');
            var shortLivre = c.colaborador_livre && c.colaborador_livre.length > 20 ? c.colaborador_livre.substring(0, 20) + '...' : c.colaborador_livre;
            return '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                '<td style="' + td + '" title="' + (c.nome_colaborador || '') + '">' +
                (c.colaborador_id
                    ? '<div style="display:flex;align-items:center;gap:0.5rem;">' +
                      avatarHtml(c.foto_path, c.foto_base64, c.nome_colaborador, 36) +
                      '<div><div style="font-weight:600;font-size:0.83rem;color:#0f172a;">' + shortName + '</div>' +
                      '<div style="font-size:0.72rem;color:#6366f1;font-weight:600;">' + (c.departamento_colaborador || '') + '</div>' +
                      '</div></div>'
                    : (c.colaborador_livre
                        ? '<div style="display:flex;align-items:center;gap:0.5rem;" title="' + c.colaborador_livre + '">' +
                          '<div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:700;">' + (c.colaborador_livre.charAt(0).toUpperCase()) + '</div>' +
                          '<div><div style="font-weight:600;font-size:0.83rem;color:#0f172a;">' + shortLivre + '</div>' +
                          '<div style="font-size:0.72rem;color:#94a3b8;font-weight:600;">Sem vínculo (Texto Livre)</div>' +
                          '</div></div>'
                        : '<span style="color:#94a3b8;font-size:0.8rem;font-style:italic;">Sem colaborador</span>')) +
                '</td>' +
                '<td style="' + td + '">' +
                '<div><div style="font-weight:700;font-size:0.85rem;color:#0f172a;">' + (c.tipo || '-') + '</div>' +
                '<div style="font-size:0.72rem;color:#64748b;">' + (c.modelo || '-') + '</div>' +
                '</div></td>' +
                '<td style="' + td + '">' + (c.processador ? '<span style="font-size:0.82rem;color:#0f172a;font-weight:500;">' + c.processador + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;font-style:italic;">-</span>') + '</td>' +
                '<td style="' + td + '">' + (c.ram_1 ? '<span style="font-size:0.82rem;color:#475569;font-weight:500;">' + c.ram_1 + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;font-style:italic;">-</span>') + '</td>' +
                '<td style="' + td + '">' + (c.ram_2 ? '<span style="font-size:0.82rem;color:#475569;font-weight:500;">' + c.ram_2 + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;font-style:italic;">-</span>') + '</td>' +
                '<td style="' + td + '">' + (c.ssd ? '<span style="font-size:0.82rem;color:#475569;font-weight:500;">' + c.ssd + '</span>' : '<span style="color:#94a3b8;font-size:0.75rem;font-style:italic;">-</span>') + '</td>' +
                '<td style="' + td + 'font-size:0.82rem;"><div style="font-weight:600;color:#334155;">' + (c.patrimonio || '-') + '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;font-family:monospace;">' + (c.numero_serie || '') + '</div></td>' +
                '<td style="' + td + '">' + statusBadge(c.status) + '</td>' +
                '<td style="' + td + 'font-size:0.8rem;color:#64748b;">' + fmtData(c.data_atribuicao) + '</td>' +
                '<td style="' + td + '">' +
                '<div style="display:flex;gap:5px;">' +
                '<button onclick="window.computadoresOpenModal(' + c.id + ')" style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;cursor:pointer;color:#6366f1;font-size:0.78rem;font-weight:600;" title="Editar"><i class="ph ph-pencil-simple"></i></button>' +
                '<button onclick="window.computadoresExcluir(' + c.id + ',\'' + (c.modelo || '').replace(/'/g, "\\'") + '\')" style="background:#fff;border:1px solid #fca5a5;border-radius:6px;padding:5px 9px;cursor:pointer;color:#dc2626;font-size:0.78rem;" title="Excluir"><i class="ph ph-trash"></i></button>' +
                '</div></td>' +
                '</tr>';
        }).join('');

        return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">' +
            thSort('nome_colaborador', 'Colaborador') +
            thSort('tipo', 'Tipo / Modelo') +
            thSort('processador', 'Processador') +
            thSort('ram_1', 'Mem. RAM 1') +
            thSort('ram_2', 'Mem. RAM 2') +
            thSort('ssd', 'SSD/HD') +
            thSort('patrimonio', 'Patrimônio / Série') +
            thSort('status', 'Status') +
            thSort('data_atribuicao', 'Desde') +
            '<th style="' + thStyle.replace('cursor:pointer;user-select:none;', '') + '">Ações</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table></div>';
    }

    /* ─── Modal ─── */
    function renderModal() {
        var c = _editandoId ? (_computadores.find(function (x) { return x.id === _editandoId; }) || {}) : {};
        var isEdit = !!_editandoId;

        // Build colaboradores select - administrativo only
        var colabOptions = '<option value="">— Nenhum / Sem vínculo —</option>' +
            _colaboradores.map(function (col) {
                var sel = String(c.colaborador_id) === String(col.id) ? ' selected' : '';
                return '<option value="' + col.id + '"' + sel + '>' + col.nome_completo + ' – ' + (col.departamento || 'Sem dept.') + '</option>';
            }).join('');

        return '<div id="modal-computador" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.55);z-index:3000;align-items:center;justify-content:center;padding:1rem;">' +
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">' +
            '<div style="padding:1.5rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">' +
            '<i class="ph ph-desktop" style="color:#fff;font-size:1.2rem;"></i></div>' +
            '<h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">' + (isEdit ? 'Editar Computador' : 'Novo Computador') + '</h3>' +
            '</div>' +
            '<button onclick="window.computadoresCloseModal()" style="background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;line-height:1;">&times;</button>' +
            '</div>' +
            '<form id="form-computador" onsubmit="event.preventDefault();window.computadoresSalvar();" style="padding:1.5rem;display:flex;flex-direction:column;gap:1.1rem;">' +
            // Tipo
            fldSelect('comp-tipo', 'Tipo *', ['Notebook', 'All-In-One'], c.tipo || 'Notebook') +
            // Modelo
            fldInput('comp-modelo', 'Modelo *', c.modelo || '', 'Ex: Dell Inspiron 15') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            // Patrimônio
            fldInput('comp-patrimonio', 'Patrimônio', c.patrimonio || '', 'Ex: 00123') +
            // Nº de Série
            fldInput('comp-serie', 'Nº de Série', c.numero_serie || '', 'Ex: SN-ABC123') +
            '</div>' +
            // Colaborador
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">Colaborador Vinculado <span style="font-size:0.7rem;color:#94a3b8;">(apenas administrativos)</span></label>' +
            '<select id="comp-colaborador" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;">' +
            colabOptions +
            '</select>' +
            '<input id="comp-colaborador-livre" type="text" value="' + (c.colaborador_livre || '').replace(/"/g, '&quot;') + '" placeholder="Ou digite o nome de alguém sem vínculo..." style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;margin-top:0.5rem;">' +
            '</div>' +
            // Status
            fldSelect('comp-status', 'Status *', ['Em uso', 'Reserva', 'Manutenção', 'Devolvido', 'Inativo'], c.status || 'Em uso') +
            // Data atribuição
            fldInput('comp-data', 'Data de Atribuição', c.data_atribuicao || '', '', 'date') +
            // Senha Windows
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;"><i class="ph ph-lock-key"></i> Senha Windows</label>' +
            '<div style="position:relative;">' +
            '<input id="comp-senha" type="password" value="' + (c.senha_windows || '').replace(/"/g, '&quot;') + '" placeholder="Senha do Windows" autocomplete="new-password" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 2.5rem 0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;box-sizing:border-box;">' +
            '<button type="button" onclick="var i=document.getElementById(\'comp-senha\');var ic=this.querySelector(\'i\');if(i.type===\'password\'){i.type=\'text\';ic.className=\'ph ph-eye-slash\';}else{i.type=\'password\';ic.className=\'ph ph-eye\';}" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;padding:4px;" title="Mostrar/Ocultar senha">' +
            '<i class="ph ph-eye"></i>' +
            '</button></div>' +
            '</div>' +
            // E-mail Vinculado
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;"><i class="ph ph-envelope"></i> E-mail Vinculado (Preenche e-mail corporativo do colaborador automaticamente)</label>' +
            '<input id="comp-email-vinculado" type="email" value="' + (c.email_vinculado || '').replace(/"/g, '&quot;') + '" placeholder="Ex: nome@americarental.com.br" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;box-sizing:border-box;">' +
            '</div>' +
            // Especificações (Hardware)
            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;">' +
            '<h4 style="margin:0 0 1rem 0;font-size:0.9rem;color:#0f172a;"><i class="ph ph-cpu" style="margin-right:5px;color:#6366f1;"></i>Especificações (Hardware)</h4>' +
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
            '</select></div>' +
            '</div>' +
            '</div>' +
            // Observações
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">Observações</label>' +
            '<textarea id="comp-obs" rows="3" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Observações adicionais...">' + (c.observacoes || '') + '</textarea>' +
            '</div>' +
            '<div style="display:flex;gap:0.75rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #f1f5f9;">' +
            '<button type="button" onclick="window.computadoresCloseModal()" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:0.55rem 1.1rem;cursor:pointer;font-size:0.88rem;color:#64748b;font-weight:600;">Cancelar</button>' +
            '<button type="submit" id="btn-salvar-computador" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;padding:0.55rem 1.4rem;cursor:pointer;font-size:0.88rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;">' +
            '<i class="ph ph-floppy-disk"></i> ' + (isEdit ? 'Salvar Alterações' : 'Cadastrar') + '</button>' +
            '</div>' +
            '</form></div></div>';
    }

    function fldInput(id, label, value, placeholder, type) {
        type = type || 'text';
        return '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">' + label + '</label>' +
            '<input id="' + id + '" type="' + type + '" value="' + String(value).replace(/"/g, '&quot;') + '" placeholder="' + placeholder + '" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;box-sizing:border-box;"></div>';
    }
    function fldSelect(id, label, opts, selected) {
        return '<div><label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">' + label + '</label>' +
            '<select id="' + id + '" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;">' +
            opts.map(function (o) { return '<option value="' + o + '"' + (o === selected ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select></div>';
    }

    /* ─── Public API ─── */
    window.computadoresInit = function () {
        loadAll();
    };

    window.computadoresFilter = function () {
        _filterQ = (document.getElementById('comp-filter-q') || {}).value || '';
        _filterStatus = (document.getElementById('comp-filter-status') || {}).value || '';
        var wrap = document.getElementById('comp-table-wrap');
        if (wrap) wrap.innerHTML = renderTable();
    };

    window.computadoresSetSort = function (col) {
        if (_sortCol === col) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        else { _sortCol = col; _sortDir = 'asc'; }
        var wrap = document.getElementById('comp-table-wrap');
        if (wrap) wrap.innerHTML = renderTable();
    };

    window.computadoresOpenModal = function (id) {
        _editandoId = id || null;
        var cont = document.getElementById('computadores-content');
        if (cont) {
            // Remove old modal if any
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
        var modelo = (document.getElementById('comp-modelo') || {}).value || '';
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
        var email_vinculado = (document.getElementById('comp-email-vinculado') || {}).value || '';

        if (!tipo) return alert('Selecione o tipo do computador.');
        if (!modelo.trim()) return alert('Informe o modelo do computador.');

        var payload = { tipo, modelo: modelo.trim(), patrimonio, numero_serie, colaborador_id: colaborador_id || null, colaborador_livre, status, data_atribuicao, senha_windows, observacoes, processador, ram_1, ram_2, ssd, expansivel, email_vinculado };

        var btn = document.getElementById('btn-salvar-computador');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

        try {
            if (_editandoId) {
                await _apiPut('/computadores/' + _editandoId, payload);
            } else {
                await _apiPost('/computadores', payload);
            }
            window.computadoresCloseModal();
            await loadAll();
        } catch (e) {
            alert('Erro ao salvar: ' + (e.message || e));
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar'; }
        }
    };

    window.computadoresExcluir = async function (id, nome) {
        if (!confirm('Excluir o computador "' + nome + '"? Esta ação não pode ser desfeita.')) return;
        try {
            await _apiDelete('/computadores/' + id);
        } catch (e) {
            alert('Erro ao excluir: ' + (e.message || e));
        }
    };

})();
