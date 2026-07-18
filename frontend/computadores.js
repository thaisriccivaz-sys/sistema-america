// =============================================================
// MODULO COMPUTADORES CORPORATIVOS (com aba E-mails integrada)
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
    var _filterQ = '';
    var _filterStatus = '';
    var _filterEmailQ = '';
    var _sortCol = 'nome_colaborador';
    var _sortDir = 'asc';
    var _activeTab = 'colaboradores';

    /* ─── API Helpers ─── */
    function _tok() { return window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || ''; }
    async function _apiGet(p) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { headers: { 'Authorization': 'Bearer ' + _tok() } });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiPost(p, body) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { method: 'POST', headers: { 'Authorization': 'Bearer ' + _tok(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiPut(p, body) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + _tok(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function _apiDelete(p) {
        var r = await fetch((typeof API_URL !== 'undefined' ? API_URL : '/api') + p, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + _tok() } });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    /* ─── helpers visuais ─── */
    function fmtData(s) {
        if (!s) return '-';
        var p = s.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s;
    }
    function obsIcon(obs) {
        if (!obs || !obs.trim()) return '';
        return '<i class="ph ph-info" style="color:#3b82f6;cursor:help;margin-left:5px;font-size:1.1rem;" title="'+obs.replace(/"/g, '&quot;')+'"></i>';
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
    function tipoIcon(t) { return t === 'Notebook' ? 'ph-laptop' : 'ph-monitor'; }
    function emailStatusBadge(s) {
        if (!s) return '';
        var sl = s.toLowerCase();
        if (sl.includes('ativo')) return '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;border:1px solid #bbf7d0;">Ativo</span>';
        if (sl.includes('bloqueado') || sl.includes('inativo')) return '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;border:1px solid #fecaca;">Bloqueado</span>';
        return '<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;border:1px solid #e2e8f0;">' + s + '</span>';
    }

    /* ─── Carga de dados ─── */
    async function loadAll() {
        try {
            var r = await Promise.all([
                _apiGet('/computadores'),
                _apiGet('/computadores/colaboradores'),
                fetch('/api/emails', { headers: { 'Authorization': 'Bearer ' + _tok() } }).then(res => res.json()).catch(() => [])
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
        } catch(e) { _emails = []; }
        renderTela();
    }

    /* ─── Render principal ─── */
    window.computadoresSetTab = function (tab) {
        _activeTab = tab;
        _filterQ = '';
        _filterEmailQ = '';
        renderTela();
    };

    window.computadoresVincular = function (colabId) {
        window.computadoresOpenModal();
        setTimeout(function() {
            var s = document.getElementById('comp-colaborador');
            if(s) { s.value = colabId; }
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
                ';border-bottom:' + (_activeTab === t ? '2px solid #6366f1' : '2px solid transparent') + ';margin-bottom:-2px;';
        }

        var actionBtn = '';
        if (_activeTab === 'computadores' || _activeTab === 'colaboradores') {
            actionBtn = '<button id="btn-novo-computador" onclick="window.computadoresOpenModal()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:0.55rem 1.1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;box-shadow:0 2px 8px rgba(99,102,241,0.3);">' +
                '<i class="ph ph-plus"></i> Novo Computador</button>';
        } else if (_activeTab === 'emails') {
            actionBtn = '<button onclick="window.compEmailOpenModalEmail()" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;padding:0.55rem 1.1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;box-shadow:0 2px 8px rgba(79,70,229,0.3);">' +
                '<i class="ph ph-plus"></i> Novo E-mail</button>';
        }

        var tabContent = '';
        if (_activeTab === 'colaboradores') tabContent = renderTabColaboradores();
        else if (_activeTab === 'computadores') tabContent = renderTabComputadores();
        else tabContent = renderTabEmails();

        cont.innerHTML =
            '<div style="padding:1.5rem 1.5rem 0;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;"><div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;"><i class="ph ph-desktop" style="font-size:1.5rem;color:#fff;"></i></div>' +
            '<div><h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;">Computadores Corporativos</h2><p style="margin:0;font-size:0.8rem;color:#64748b;">' + countComps + ' equipamentos &middot; ' + countColabs + ' colaboradores</p></div></div>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' + actionBtn + '</div></div>' +
            '<div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:1.25rem;">' +
            '<button onclick="window.computadoresSetTab(\'colaboradores\')" style="' + tabS('colaboradores') + '"><i class="ph ph-users"></i> Colaboradores <span style="font-size:0.75rem;opacity:0.8;">(' + countColabs + ')</span></button>' +
            '<button onclick="window.computadoresSetTab(\'computadores\')" style="' + tabS('computadores') + '"><i class="ph ph-desktop"></i> Computadores <span style="font-size:0.75rem;opacity:0.8;">(' + countComps + ')</span></button>' +
            '<button onclick="window.computadoresSetTab(\'emails\')" style="' + tabS('emails') + '"><i class="ph ph-envelope-simple"></i> E-mails <span style="font-size:0.75rem;opacity:0.8;">(' + countEmails + ')</span></button>' +
            '</div></div>' +
            '<div style="padding:0 1.5rem 2rem;" id="comp-tab-content">' + tabContent + '</div>' +
            renderModal() +
            renderModalEmail() +
            renderModalAtribuirEmail() +
            renderModalDevolverEmail();
    }

    /* ─── Aba Computadores ─── */
    function renderTabComputadores() {
        var total = _computadores.length;
        var emUso = _computadores.filter(function (c) { return c.status === 'Em uso'; }).length;
        var reserva = _computadores.filter(function (c) { return c.status === 'Reserva'; }).length;
        var manut = _computadores.filter(function (c) { return c.status === 'Manutenção'; }).length;

        return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;margin-bottom:1.5rem;">' +
            statCard('ph-stack', 'Total', total, '#6366f1', '#eef2ff') +
            statCard('ph-monitor', 'Em Uso', emUso, '#2563eb', '#dbeafe') +
            statCard('ph-archive-box', 'Reserva', reserva, '#7c3aed', '#f3e8ff') +
            statCard('ph-wrench', 'Manutenção', manut, '#d97706', '#fef9c3') +
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
            '<div id="comp-table-wrap">' + renderTable() + '</div>';
    }

    /* ─── Aba Colaboradores ─── */
    function renderTabColaboradores() {
        var fq = _filterQ.trim().toLowerCase();

        var filtered = _colaboradores.filter(function(c) {
            if (!fq) return true;
            return (c.nome_completo && c.nome_completo.toLowerCase().includes(fq)) ||
                   (c.departamento && c.departamento.toLowerCase().includes(fq));
        });

        var thStyle = 'padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;';

        var rows = filtered.map(function(c) {
            var td = 'padding:0.75rem;vertical-align:middle;';
            var compsDoColab = _computadores.filter(function(cp) { return String(cp.colaborador_id) === String(c.id); });

            var colabInfo = '<div style="display:flex;align-items:center;gap:0.75rem;">' +
                            avatarHtml(c.foto_path, c.foto_base64, c.nome_completo, 40) +
                            '<div><div style="font-weight:700;font-size:0.9rem;color:#0f172a;">' + (c.nome_completo || '-') + '</div>' +
                            '<div style="font-size:0.75rem;color:#64748b;font-weight:600;"><i class="ph ph-buildings" style="margin-right:3px;"></i>' + (c.departamento || '-') + ' &middot; ' + (c.cargo || '-') + '</div>' +
                            '</div></div>';

            var eqpInfo = '';
            var acoes = '';

            if (compsDoColab.length > 0) {
                eqpInfo = compsDoColab.map(function(cp) {
                    return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:0.5rem;display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">' +
                           '<div style="width:30px;height:30px;border-radius:6px;background:#e0e7ff;display:flex;align-items:center;justify-content:center;color:#4f46e5;"><i class="ph ' + tipoIcon(cp.tipo) + '" style="font-size:1.1rem;"></i></div>' +
                           '<div style="flex:1;"><div style="font-weight:600;font-size:0.8rem;color:#1e293b;display:flex;align-items:center;">' + (cp.tipo || 'Computador') + ' ' + (cp.modelo || '') + obsIcon(cp.observacoes) + '</div>' +
                           '<div style="font-size:0.7rem;color:#64748b;font-family:monospace;">Patr: ' + (cp.patrimonio || '-') + ' / SN: ' + (cp.numero_serie || '-') + '</div></div>' +
                           '<div>' + statusBadge(cp.status) + '</div>' +
                           '<button onclick="window.computadoresOpenModal(' + cp.id + ')" style="background:none;border:none;color:#6366f1;cursor:pointer;padding:4px;" title="Editar Aparelho"><i class="ph ph-pencil-simple"></i></button>' +
                           '</div>';
                }).join('');
                acoes = '<button onclick="window.computadoresVincular(' + c.id + ')" style="background:#fff;border:1px solid #e2e8f0;color:#0f172a;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.3rem;"><i class="ph ph-plus"></i> Outro Equip.</button>';
            } else {
                eqpInfo = '<span style="color:#94a3b8;font-size:0.85rem;font-style:italic;">Nenhum equipamento</span>';
                acoes = '<button onclick="window.computadoresVincular(' + c.id + ')" style="background:#eef2ff;border:1px solid #c7d2fe;color:#4f46e5;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.3rem;"><i class="ph ph-link"></i> Vincular Computador</button>';
            }

            return '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                   '<td style="' + td + '">' + colabInfo + '</td>' +
                   '<td style="' + td + '">' + eqpInfo + '</td>' +
                   '<td style="' + td + '">' + acoes + '</td>' +
                   '</tr>';
        }).join('');

        if(!filtered.length) rows = '<tr><td colspan="3" style="padding:2rem;text-align:center;color:#64748b;">Nenhum colaborador encontrado.</td></tr>';

        return '<div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">' +
            '<i class="ph ph-funnel" style="color:#94a3b8;font-size:1.1rem;"></i>' +
            '<input id="comp-filter-q" type="text" placeholder="Buscar colaborador por nome ou departamento..." value="' + _filterQ.replace(/"/g, '&quot;') + '" oninput="window.computadoresFilter()" style="flex:1;min-width:200px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;outline:none;">' +
            '</div>' +
            '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">' +
            '<th style="' + thStyle + 'width:40%;">Colaborador</th>' +
            '<th style="' + thStyle + 'width:45%;">Equipamento Atribuído</th>' +
            '<th style="' + thStyle + 'width:15%;">Ações</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    /* ─── Aba E-mails ─── */
    function renderTabEmails() {
        var q = _filterEmailQ.trim().toLowerCase();
        var uAt = {};
        _emails.forEach(function(e) { if (e.colaborador_id) uAt[e.colaborador_id] = true; });

        // Seção: colaboradores sem e-mail
        var cSem = _colaboradores.filter(function(c) { return !uAt[c.id]; });
        var cSemF = q ? cSem.filter(function(c) {
            return c.nome_completo.toLowerCase().includes(q) || (c.departamento||'').toLowerCase().includes(q);
        }) : cSem;

        // Seção: colaboradores com e-mail
        var cAt = _colaboradores.filter(function(c) { return uAt[c.id]; });
        var cAtF = q ? cAt.filter(function(c) {
            return c.nome_completo.toLowerCase().includes(q) || (c.departamento||'').toLowerCase().includes(q) ||
                _emails.some(function(e) { return e.colaborador_id === c.id && e.endereco.toLowerCase().includes(q); });
        }) : cAt;

        // Seção: avulsos
        var avulsos = _emails.filter(function(e) { return !e.colaborador_id && e.responsavel_nome; });
        var avF = q ? avulsos.filter(function(e) {
            return e.responsavel_nome.toLowerCase().includes(q) || e.endereco.toLowerCase().includes(q);
        }) : avulsos;

        var thStyle = 'padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;';
        var td = 'padding:0.75rem;vertical-align:middle;';

        var rows = '';

        // Com e-mail
        if (cAtF.length > 0) {
            rows += '<tr><td colspan="3" style="padding:0.5rem 0.75rem;background:#dcfce7;border-bottom:1px solid #bbf7d0;"><span style="font-size:0.75rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-check-circle"></i> Com E-mail (' + cAtF.length + ')</span></td></tr>';
            cAtF.forEach(function(c) {
                var myE = _emails.filter(function(e) { return e.colaborador_id === c.id; });
                var emailHtml = myE.map(function(e) {
                    return '<div style="margin-bottom:4px;"><div style="font-weight:600;color:#2563eb;font-size:0.85rem;">' + e.endereco + '</div>' +
                           '<div style="font-size:0.7rem;color:#64748b;">' + (e.plataforma||'-') + ' &middot; ' + emailStatusBadge(e.status) + '</div></div>';
                }).join('');
                var devHtml = myE.map(function(e) {
                    return '<button onclick="window.compEmailOpenModalDevolver(' + e.id + ',\'' + c.nome_completo.replace(/'/g, "\\'") + '\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;margin-bottom:4px;display:block;"><i class="ph ph-arrow-u-up-left"></i> Devolver ' + e.endereco + '</button>';
                }).join('');
                rows += '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                    '<td style="' + td + '">' + '<div style="display:flex;align-items:center;gap:0.6rem;">' + avatarHtml(c.foto_path, c.foto_base64, c.nome_completo, 40) +
                    '<div><div style="font-weight:700;color:#0f172a;">' + c.nome_completo + '</div><div style="font-size:0.72rem;color:#64748b;">' + (c.departamento||'-') + '</div></div></div></td>' +
                    '<td style="' + td + '">' + emailHtml + '</td>' +
                    '<td style="' + td + '">' + devHtml + '</td></tr>';
            });
        }

        // Avulsos
        if (avF.length > 0) {
            rows += '<tr><td colspan="3" style="padding:0.5rem 0.75rem;background:#ede9fe;border-bottom:1px solid #ddd6fe;"><span style="font-size:0.75rem;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-user-gear"></i> Responsável Avulso (' + avF.length + ')</span></td></tr>';
            avF.forEach(function(e) {
                rows += '<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">' +
                    '<td style="' + td + '">' + '<div style="display:flex;align-items:center;gap:0.6rem;">' + avatarHtml('', null, e.responsavel_nome, 40) +
                    '<div><div style="font-weight:700;color:#7c3aed;">' + e.responsavel_nome + '</div><div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsável Avulso</div></div></div></td>' +
                    '<td style="' + td + '">' + '<div style="font-weight:600;color:#2563eb;">' + e.endereco + '</div><div style="font-size:0.72rem;color:#64748b;">' + (e.plataforma||'-') + '</div></td>' +
                    '<td style="' + td + '">' + '<button onclick="window.compEmailOpenModalDevolver(' + e.id + ',\'' + e.responsavel_nome.replace(/'/g, "\\'") + '\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button></td></tr>';
            });
        }

        // Sem e-mail
        if (cSemF.length > 0) {
            rows += '<tr><td colspan="3" style="padding:0.5rem 0.75rem;background:#fef3c7;border-bottom:1px solid #fde68a;"><span style="font-size:0.75rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-warning-circle"></i> Sem E-mail (' + cSemF.length + ')</span></td></tr>';
            cSemF.forEach(function(c) {
                rows += '<tr style="border-bottom:1px solid #fffbeb;background:#fffbeb;" onmouseover="this.style.background=\'#fef9e7\'" onmouseout="this.style.background=\'#fffbeb\'">' +
                    '<td style="' + td + '">' + '<div style="display:flex;align-items:center;gap:0.6rem;">' + avatarHtml(c.foto_path, c.foto_base64, c.nome_completo, 40) +
                    '<div><div style="font-weight:700;color:#92400e;">' + c.nome_completo + '</div><div style="font-size:0.72rem;color:#b45309;">' + (c.departamento||'-') + '</div></div></div></td>' +
                    '<td style="' + td + '"><span style="font-size:0.8rem;color:#b45309;font-style:italic;">Sem e-mail atribuído</span></td>' +
                    '<td style="' + td + '"><button onclick="window.compEmailOpenModalAtribuir(null,' + c.id + ')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.78rem;font-weight:700;"><i class="ph ph-link"></i> Atribuir E-mail</button></td></tr>';
            });
        }

        if (!rows) rows = '<tr><td colspan="3" style="padding:2rem;text-align:center;color:#64748b;">Nenhum resultado encontrado.</td></tr>';

        return '<div style="background:#f8fafc;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">' +
            '<i class="ph ph-funnel" style="color:#94a3b8;font-size:1.1rem;"></i>' +
            '<input id="comp-email-filter-q" type="text" placeholder="Buscar por nome, e-mail ou departamento..." value="' + _filterEmailQ.replace(/"/g, '&quot;') + '" oninput="window.compEmailFilter()" style="flex:1;min-width:200px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0.4rem 0.7rem;font-size:0.85rem;background:#fff;outline:none;">' +
            '</div>' +
            '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">' +
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">' +
            '<th style="' + thStyle + 'width:35%;">Colaborador</th>' +
            '<th style="' + thStyle + 'width:40%;">E-mail Atribuído</th>' +
            '<th style="' + thStyle + 'width:25%;">Ações</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
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
                '<div><div style="font-weight:700;font-size:0.85rem;color:#0f172a;display:flex;align-items:center;">' + (c.tipo || '-') + obsIcon(c.observacoes) + '</div>' +
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

    /* ─── Modal Computador ─── */
    function renderModal() {
        var c = _editandoId ? (_computadores.find(function (x) { return x.id === _editandoId; }) || {}) : {};
        var isEdit = !!_editandoId;

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
            fldSelect('comp-tipo', 'Tipo *', ['Notebook', 'All-In-One'], c.tipo || 'Notebook') +
            fldInput('comp-modelo', 'Modelo *', c.modelo || '', 'Ex: Dell Inspiron 15') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            fldInput('comp-patrimonio', 'Patrimônio', c.patrimonio || '', 'Ex: 00123') +
            fldInput('comp-serie', 'Nº de Série', c.numero_serie || '', 'Ex: SN-ABC123') +
            '</div>' +
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;">Colaborador Vinculado <span style="font-size:0.7rem;color:#94a3b8;">(apenas administrativos)</span></label>' +
            '<select id="comp-colaborador" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;">' +
            colabOptions +
            '</select>' +
            '<input id="comp-colaborador-livre" type="text" value="' + (c.colaborador_livre || '').replace(/"/g, '&quot;') + '" placeholder="Ou digite o nome de alguém sem vínculo..." style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;margin-top:0.5rem;">' +
            '</div>' +
            fldSelect('comp-status', 'Status *', ['Em uso', 'Reserva', 'Manutenção', 'Devolvido', 'Inativo'], c.status || 'Em uso') +
            fldInput('comp-data', 'Data de Atribuição', c.data_atribuicao || '', '', 'date') +
            '<div>' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:4px;"><i class="ph ph-lock-key"></i> Senha Windows</label>' +
            '<div style="position:relative;">' +
            '<input id="comp-senha" type="password" value="' + (c.senha_windows || '').replace(/"/g, '&quot;') + '" placeholder="Senha do Windows" autocomplete="new-password" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 2.5rem 0.5rem 0.7rem;font-size:0.88rem;outline:none;background:#fff;box-sizing:border-box;">' +
            '<button type="button" onclick="var i=document.getElementById(\'comp-senha\');var ic=this.querySelector(\'i\');if(i.type===\'password\'){i.type=\'text\';ic.className=\'ph ph-eye-slash\';}else{i.type=\'password\';ic.className=\'ph ph-eye\';}" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;padding:4px;" title="Mostrar/Ocultar senha">' +
            '<i class="ph ph-eye"></i>' +
            '</button></div>' +
            '</div>' +
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

    /* ─── Modais E-mail ─── */
    function renderModalEmail() {
        var e = _editandoEmail;
        return '<div id="modal-comp-email-cadastro" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;max-height:90vh;">' +
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">' +
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-envelope-simple" style="color:#4f46e5;font-size:1.4rem;"></i> ' + (e ? 'Editar E-mail' : 'Cadastrar E-mail') + '</h3>' +
            '<button onclick="document.getElementById(\'modal-comp-email-cadastro\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>' +
            '<div style="padding:1.5rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Endereço de E-mail *</label><input id="comp-email-cad-endereco" type="email" value="' + (e ? e.endereco : '') + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Senha Temporária/Acesso</label><input id="comp-email-cad-senha" type="text" value="' + (e ? e.senha || '' : '') + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Plataforma</label><input id="comp-email-cad-plat" type="text" placeholder="Ex: Google Workspace" value="' + (e ? e.plataforma || '' : '') + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Situação</label><select id="comp-email-cad-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="Ativo" ' + (e && e.status === 'Ativo' ? 'selected' : '') + '>Ativo</option><option value="Bloqueado" ' + (e && e.status === 'Bloqueado' ? 'selected' : '') + '>Bloqueado</option></select></div>' +
            '</div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observações</label><textarea id="comp-email-cad-obs" rows="2" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' + (e ? e.observacao || '' : '') + '</textarea></div>' +
            '</div>' +
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">' +
            '<button onclick="document.getElementById(\'modal-comp-email-cadastro\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.compEmailSaveEmail()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar</button>' +
            '</div></div></div>';
    }

    function renderModalAtribuirEmail() {
        var emOpts = _emails.filter(function(e) { return !e.colaborador_id && !e.responsavel_nome; }).map(function(e) {
            return '<option value="' + e.id + '"' + (e.id === _atribData.email_id ? ' selected' : '') + '>' + e.endereco + '</option>';
        }).join('');
        var coOpts = _colaboradores.map(function(c) {
            return '<option value="' + c.id + '"' + (c.id === _atribData.colab_id ? ' selected' : '') + '>' + c.nome_completo + '</option>';
        }).join('');

        return '<div id="modal-comp-email-atribuir" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;">' +
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">' +
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-link" style="color:#4f46e5;font-size:1.4rem;"></i> Atribuir E-mail</h3>' +
            '<button onclick="document.getElementById(\'modal-comp-email-atribuir\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>' +
            '<div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">E-mail Disponível</label><select id="comp-atrib-email-id" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">-- Selecione o E-mail --</option>' + emOpts + '</select></div>' +
            '<div style="display:flex;gap:1rem;margin-bottom:0.5rem;"><label style="font-size:0.85rem;font-weight:600;cursor:pointer;"><input type="radio" name="comp_email_tipo_resp" value="colaborador" checked onchange="window.compEmailToggleResp(this.value)"> Colaborador</label><label style="font-size:0.85rem;font-weight:600;cursor:pointer;"><input type="radio" name="comp_email_tipo_resp" value="avulso" onchange="window.compEmailToggleResp(this.value)"> Responsável Avulso</label></div>' +
            '<div id="comp-email-resp-colab"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Colaborador</label><select id="comp-atrib-email-colab" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">-- Selecione o Colaborador --</option>' + coOpts + '</select></div>' +
            '<div id="comp-email-resp-avulso" style="display:none;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Nome do Responsável (Livre)</label><input id="comp-atrib-email-avulso-nome" type="text" placeholder="Ex: Financeiro Geral" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data de Atribuição</label><input id="comp-atrib-email-data" type="date" value="' + (new Date().toISOString().split('T')[0]) + '" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">' +
            '<button onclick="document.getElementById(\'modal-comp-email-atribuir\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.compEmailSaveAtribuir()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Atribuir</button>' +
            '</div></div></div>';
    }

    function renderModalDevolverEmail() {
        return '<div id="modal-comp-email-devolver" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">' +
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:400px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;text-align:center;">' +
            '<div style="padding:2rem 1.5rem 1rem;"><div style="width:60px;height:60px;background:#fee2e2;color:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1rem;"><i class="ph ph-warning-circle"></i></div>' +
            '<h3 style="margin:0 0 0.5rem;font-size:1.2rem;color:#0f172a;">Devolver E-mail</h3>' +
            '<p style="margin:0;color:#64748b;font-size:0.9rem;">Tem certeza que deseja remover o e-mail de <strong id="comp-email-dev-nome" style="color:#0f172a;"></strong>?</p></div>' +
            '<div style="padding:1rem 1.5rem;display:flex;justify-content:center;gap:0.75rem;margin-bottom:1rem;">' +
            '<button onclick="document.getElementById(\'modal-comp-email-devolver\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>' +
            '<button onclick="window.compEmailSaveDevolver()" style="background:#dc2626;color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Sim, Devolver</button>' +
            '</div></div></div>';
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
    window.computadoresInit = function () { loadAll(); };

    window.computadoresFilter = function () {
        _filterQ = (document.getElementById('comp-filter-q') || {}).value || '';
        if (_activeTab === 'computadores') {
            _filterStatus = (document.getElementById('comp-filter-status') || {}).value || '';
        }
        var wrap = document.getElementById('comp-tab-content');
        if (wrap) {
            if (_activeTab === 'colaboradores') wrap.innerHTML = renderTabColaboradores();
            else if (_activeTab === 'computadores') wrap.innerHTML = renderTabComputadores();
            else wrap.innerHTML = renderTabEmails();
        }
    };

    window.compEmailFilter = function () {
        _filterEmailQ = (document.getElementById('comp-email-filter-q') || {}).value || '';
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

        if (!tipo) return alert('Selecione o tipo do computador.');
        if (!modelo.trim()) return alert('Informe o modelo do computador.');

        var payload = { tipo, modelo: modelo.trim(), patrimonio, numero_serie, colaborador_id: colaborador_id || null, colaborador_livre, status, data_atribuicao, senha_windows, observacoes, processador, ram_1, ram_2, ssd, expansivel };

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
            await loadAll();
        } catch (e) {
            alert('Erro ao excluir: ' + (e.message || e));
        }
    };

    /* ─── Ações E-mail ─── */
    window.compEmailOpenModalEmail = function(id) {
        _editandoEmail = id ? (_emails.find(function(e){ return e.id === id; }) || null) : null;
        renderTela();
        setTimeout(function() {
            var m = document.getElementById('modal-comp-email-cadastro');
            if (m) m.style.display = 'flex';
        }, 50);
    };

    window.compEmailSaveEmail = function() {
        var end = (document.getElementById('comp-email-cad-endereco') || {}).value || '';
        var sen = (document.getElementById('comp-email-cad-senha') || {}).value || '';
        var pla = (document.getElementById('comp-email-cad-plat') || {}).value || '';
        var sta = (document.getElementById('comp-email-cad-status') || {}).value || 'Ativo';
        var obs = (document.getElementById('comp-email-cad-obs') || {}).value || '';

        if (!end.trim()) return alert('Endereço de e-mail é obrigatório.');

        var payload = { endereco: end.trim(), senha: sen, plataforma: pla, status: sta, observacao: obs };
        var url = _editandoEmail ? '/api/emails/' + _editandoEmail.id : '/api/emails';
        var meth = _editandoEmail ? 'PUT' : 'POST';

        fetch(url, {
            method: meth,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
            body: JSON.stringify(payload)
        }).then(function(r){ return r.json(); }).then(function(data) {
            if (data.error) return alert(data.error);
            _editandoEmail = null;
            reloadEmails();
        }).catch(function(e){ alert('Erro de rede: ' + e.message); });
    };

    window.compEmailOpenModalAtribuir = function(emailId, colabId) {
        _atribData = { email_id: emailId, colab_id: colabId };
        renderTela();
        setTimeout(function() {
            var m = document.getElementById('modal-comp-email-atribuir');
            if (m) m.style.display = 'flex';
            if (colabId) {
                var sel = document.getElementById('comp-atrib-email-colab');
                if (sel) sel.value = colabId;
            }
        }, 50);
    };

    window.compEmailToggleResp = function(v) {
        var colab = document.getElementById('comp-email-resp-colab');
        var avulso = document.getElementById('comp-email-resp-avulso');
        if (colab) colab.style.display = v === 'colaborador' ? 'block' : 'none';
        if (avulso) avulso.style.display = v === 'avulso' ? 'block' : 'none';
    };

    window.compEmailSaveAtribuir = function() {
        var emailId = (document.getElementById('comp-atrib-email-id') || {}).value || '';
        if (!emailId) return alert('Selecione um e-mail.');

        var tipoRad = document.querySelector('input[name="comp_email_tipo_resp"]:checked');
        var tipo = tipoRad ? tipoRad.value : 'colaborador';
        var colabId = tipo === 'colaborador' ? ((document.getElementById('comp-atrib-email-colab') || {}).value || null) : null;
        var nomeAvulso = tipo === 'avulso' ? ((document.getElementById('comp-atrib-email-avulso-nome') || {}).value || '').trim() : null;
        var dataAt = (document.getElementById('comp-atrib-email-data') || {}).value || '';

        if (tipo === 'colaborador' && !colabId) return alert('Selecione um colaborador.');
        if (tipo === 'avulso' && !nomeAvulso) return alert('Informe o nome do responsável.');

        fetch('/api/emails/' + emailId + '/atribuir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok() },
            body: JSON.stringify({ colaborador_id: colabId, responsavel_nome: nomeAvulso, data_atribuicao: dataAt })
        }).then(function(r){ return r.json(); }).then(function(data) {
            if (data.error) return alert(data.error);
            var m = document.getElementById('modal-comp-email-atribuir');
            if (m) m.style.display = 'none';
            reloadEmails();
        }).catch(function(e){ alert('Erro de rede: ' + e.message); });
    };

    window.compEmailOpenModalDevolver = function(emailId, nomeResp) {
        _devEmailId = emailId;
        var el = document.getElementById('comp-email-dev-nome');
        if (el) el.textContent = nomeResp;
        var m = document.getElementById('modal-comp-email-devolver');
        if (m) m.style.display = 'flex';
    };

    window.compEmailSaveDevolver = function() {
        fetch('/api/emails/' + _devEmailId + '/devolver', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + _tok() }
        }).then(function(r){ return r.json(); }).then(function(data) {
            if (data.error) return alert(data.error);
            var m = document.getElementById('modal-comp-email-devolver');
            if (m) m.style.display = 'none';
            reloadEmails();
        }).catch(function(e){ alert('Erro: ' + e.message); });
    };

})();
