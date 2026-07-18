// frontend/emails.js
(function(){
    var _emails = [];
    var _colaboradores = [];
    var _editandoEmail = null;
    var _filterColab = { q: '' };
    var _filterEmail = { q: '', status: '' };
    var _currentTab = 'colaboradores';

    function fetchEmails() {
        return fetch('/api/emails', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') } })
            .then(res => res.json())
            .then(data => { _emails = data; });
    }

    function fetchColabs() {
        return fetch('/api/emails/colaboradores', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') } })
            .then(res => res.json())
            .then(data => { _colaboradores = data; });
    }

    window.initEmailsCorporativos = function() {
        var cont = document.getElementById('emails-corporativos-content');
        if (!cont) return;
        cont.innerHTML = '<div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><br>Carregando E-mails...</div>';
        
        Promise.all([fetchEmails(), fetchColabs()]).then(() => {
            renderTela();
        }).catch(err => {
            console.error(err);
            cont.innerHTML = '<div style="color:red;padding:2rem;">Erro ao carregar dados de e-mails.</div>';
        });
    };

    function renderTela() {
        var cont = document.getElementById('emails-corporativos-content');
        if (!cont) return;

        var head = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">' +
            '<div><h2 style="margin:0;color:#0f172a;font-size:1.5rem;display:flex;align-items:center;gap:10px;"><div style="width:40px;height:40px;background:#e0e7ff;color:#4f46e5;border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-envelope-simple"></i></div> E-mails Corporativos</h2>' +
            '<p style="margin:4px 0 0 50px;color:#64748b;font-size:0.9rem;">' + _emails.length + ' e-mails corporativos</p></div>' +
            '<div style="display:flex;gap:0.75rem;">' +
            '<button onclick="window.emailsOpenModalEmail()" style="background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.25rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(79,70,229,0.2);"><i class="ph ph-plus"></i> Novo E-mail</button>' +
            '</div></div>';

        var tabs = '<div style="display:flex;gap:1.5rem;border-bottom:2px solid #e2e8f0;margin-bottom:1.5rem;">' +
            '<div onclick="window.emailsSetTab(\'colaboradores\')" style="padding:0.75rem 0.5rem;cursor:pointer;font-weight:600;font-size:0.95rem;color:'+(_currentTab==='colaboradores'?'#4f46e5':'#64748b')+';border-bottom:3px solid '+(_currentTab==='colaboradores'?'#4f46e5':'transparent')+';display:flex;align-items:center;gap:6px;"><i class="ph ph-users"></i> Colaboradores ('+_colaboradores.length+')</div>' +
            '<div onclick="window.emailsSetTab(\'emails\')" style="padding:0.75rem 0.5rem;cursor:pointer;font-weight:600;font-size:0.95rem;color:'+(_currentTab==='emails'?'#4f46e5':'#64748b')+';border-bottom:3px solid '+(_currentTab==='emails'?'#4f46e5':'transparent')+';display:flex;align-items:center;gap:6px;"><i class="ph ph-envelope"></i> Contas de E-mail ('+_emails.length+')</div>' +
            '</div>';

        var body = '<div id="emails-tab-content">' + (_currentTab === 'colaboradores' ? renderTabColaboradores() : renderTabEmails()) + '</div>';

        cont.innerHTML = head + tabs + body + renderModalEmail() + renderModalAtribuir() + renderModalDevolver();
    }

    window.emailsSetTab = function(t) {
        _currentTab = t;
        renderTela();
    };

    function avatarHtml(foto, nome, size, b64) {
        var base=(typeof API_URL!=='undefined')?API_URL.replace('/api',''):'';
        var initial = (nome||'A').charAt(0).toUpperCase();
        var colors = ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80','#2dd4bf','#38bdf8','#818cf8','#a78bfa','#e879f9','#f43f5e'];
        var color = colors[(nome||'a').charCodeAt(0) % colors.length];
        var src = b64 ? b64 : (foto ? (foto.startsWith('http')?foto:base+'/'+foto) : null);
        if (src) {
            return '<img src="'+src+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);flex-shrink:0;">';
        }
        return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+color+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:'+(size*0.4)+'px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);flex-shrink:0;">'+initial+'</div>';
    }

    function statusBadge(s) {
        if(!s) return '';
        var sl = s.toLowerCase();
        if(sl.includes('ativo')) return '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;border:1px solid #bbf7d0;">Ativo</span>';
        if(sl.includes('bloqueado') || sl.includes('inativo')) return '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;border:1px solid #fecaca;">Bloqueado</span>';
        return '<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;border:1px solid #e2e8f0;">'+s+'</span>';
    }

    function renderTabColaboradores() {
        var q = (_filterColab.q||'').trim().toLowerCase();
        
        var uAt = {}; // colabs with email
        _emails.forEach(e => { if(e.colaborador_id) uAt[e.colaborador_id] = true; });

        var bar = '<div style="background:#f8fafc;padding:1rem;border-radius:12px;margin-bottom:1rem;display:flex;gap:0.75rem;align-items:center;border:1px solid #e2e8f0;">'+
            '<div style="font-weight:700;font-size:0.8rem;color:#64748b;margin-right:0.5rem;"><i class="ph ph-funnel"></i> Busca:</div>'+
            '<div style="position:relative;flex:1;max-width:550px;">'+
            '<i class="ph ph-magnifying-glass" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>'+
            '<input type="text" id="emails-search-colab" placeholder="Buscar por nome, e-mail ou departamento..." value="'+(_filterColab.q||'')+'" onkeyup="if(event.key===\'Enter\') window.emailsFilterColab()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #cbd5e1;border-radius:8px;outline:none;font-size:0.85rem;">'+
            '</div>'+
            '<button onclick="window.emailsFilterColab()" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1rem;cursor:pointer;color:#334155;font-weight:600;font-size:0.85rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);">Pesquisar</button>'+
            '</div>';

        var rows = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;"><thead><tr style="background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em;"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid #e2e8f0;">Colaborador</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid #e2e8f0;">E-mail Atribuído</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid #e2e8f0;">Ações</th></tr></thead><tbody>';

        // 1. Emails avulsos (sem colab)
        var avulsos = _emails.filter(e => !e.colaborador_id && e.responsavel_nome);
        var avF = q ? avulsos.filter(e => e.responsavel_nome.toLowerCase().includes(q) || e.endereco.toLowerCase().includes(q)) : avulsos;
        avF.forEach(e => {
            rows += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml('', e.responsavel_nome, 40)+'<div><div style="font-weight:700;color:#7c3aed;">'+e.responsavel_nome+'</div><div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsável Avulso</div></div></div></td>'+
            '<td style="padding:0.75rem;"><div style="font-weight:600;color:#2563eb;">'+e.endereco+'</div><div style="font-size:0.72rem;color:#64748b;">'+(e.plataforma||'-')+'</div></td>'+
            '<td style="padding:0.75rem;"><button onclick="window.emailsOpenModalDevolver('+e.id+',\''+e.responsavel_nome.replace(/'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button></td></tr>';
        });

        // 2. Colaboradores com e-mail
        var cAt = _colaboradores.filter(c => uAt[c.id]);
        var cAtF = q ? cAt.filter(c => c.nome_completo.toLowerCase().includes(q) || (c.departamento||'').toLowerCase().includes(q) || _emails.some(e=>e.colaborador_id===c.id && e.endereco.toLowerCase().includes(q))) : cAt;
        cAtF.forEach(c => {
            var myE = _emails.filter(e => e.colaborador_id === c.id);
            var emailHtml = myE.map(e => '<div style="margin-bottom:4px;"><div style="font-weight:600;color:#2563eb;">'+e.endereco+'</div><div style="font-size:0.72rem;color:#64748b;">'+(e.plataforma||'-')+'</div></div>').join('');
            var devHtml = myE.map(e => '<button onclick="window.emailsOpenModalDevolver('+e.id+',\''+c.nome_completo.replace(/'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;margin-bottom:4px;display:block;"><i class="ph ph-arrow-u-up-left"></i> Devolver '+e.endereco+'</button>').join('');

            rows += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(c.foto_path, c.nome_completo, 40, c.foto_base64)+'<div><div style="font-weight:700;color:#0f172a;">'+c.nome_completo+'</div><div style="font-size:0.72rem;color:#64748b;">'+(c.departamento||'-')+'</div></div></div></td>'+
            '<td style="padding:0.75rem;">'+emailHtml+'</td>'+
            '<td style="padding:0.75rem;">'+devHtml+'</td></tr>';
        });

        // 3. Colaboradores sem e-mail
        var cSem = _colaboradores.filter(c => !uAt[c.id]);
        var cSemF = q ? cSem.filter(c => c.nome_completo.toLowerCase().includes(q) || (c.departamento||'').toLowerCase().includes(q)) : cSem;
        if(cSemF.length > 0) {
            rows += '<tr><td colspan="3" style="padding:0.5rem 0.75rem;background:#fef3c7;border-bottom:1px solid #fde68a;"><span style="font-size:0.75rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-warning-circle"></i> Sem E-mail ('+cSemF.length+')</span></td></tr>';
            cSemF.forEach(c => {
                rows += '<tr style="border-bottom:1px solid #fffbeb;background:#fffbeb;"><td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(c.foto_path, c.nome_completo, 40, c.foto_base64)+'<div><div style="font-weight:700;color:#92400e;">'+c.nome_completo+'</div><div style="font-size:0.72rem;color:#b45309;">'+(c.departamento||'-')+'</div></div></div></td>'+
                '<td style="padding:0.75rem;"><span style="font-size:0.8rem;color:#b45309;font-style:italic;">Sem e-mail atribuído</span></td>'+
                '<td style="padding:0.75rem;"><button onclick="window.emailsOpenModalAtribuir(null,'+c.id+')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.78rem;font-weight:700;"><i class="ph ph-link"></i> Atribuir E-mail</button></td></tr>';
            });
        }

        rows += '</tbody></table>';
        return bar + rows;
    }

    window.emailsFilterColab = function() {
        var el = document.getElementById('emails-search-colab');
        _filterColab.q = el ? el.value : '';
        renderTela();
    };

    function renderTabEmails() {
        var q = (_filterEmail.q||'').trim().toLowerCase();
        
        var bar = '<div style="background:#f8fafc;padding:1rem;border-radius:12px;margin-bottom:1rem;display:flex;gap:0.75rem;align-items:center;border:1px solid #e2e8f0;">'+
            '<div style="font-weight:700;font-size:0.8rem;color:#64748b;margin-right:0.5rem;"><i class="ph ph-funnel"></i> Busca:</div>'+
            '<div style="position:relative;flex:1;max-width:550px;">'+
            '<i class="ph ph-magnifying-glass" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>'+
            '<input type="text" id="emails-search-email" placeholder="Buscar por endereço, plataforma..." value="'+(_filterEmail.q||'')+'" onkeyup="if(event.key===\'Enter\') window.emailsFilterEmail()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 2.2rem;border:1px solid #cbd5e1;border-radius:8px;outline:none;font-size:0.85rem;">'+
            '</div>'+
            '<button onclick="window.emailsFilterEmail()" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1rem;cursor:pointer;color:#334155;font-weight:600;font-size:0.85rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);">Pesquisar</button>'+
            '</div>';

        var filtered = q ? _emails.filter(e => e.endereco.toLowerCase().includes(q) || (e.plataforma||'').toLowerCase().includes(q)) : _emails;

        var rows = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;"><thead><tr style="background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em;"><th style="padding:0.75rem;text-align:left;border-bottom:1px solid #e2e8f0;">Endereço de E-mail</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid #e2e8f0;">Situação</th><th style="padding:0.75rem;text-align:left;border-bottom:1px solid #e2e8f0;">Ações</th></tr></thead><tbody>';

        filtered.forEach(e => {
            var isAtrib = e.colaborador_id || e.responsavel_nome;
            var nomeResp = e.colab_nome || e.responsavel_nome;
            var colabInfo = isAtrib && nomeResp ? '<div style="font-size:0.72rem;color:#6d28d9;margin-top:2px;"><i class="ph ph-user"></i> '+nomeResp+'</div>' : '';
            var sBadge = statusBadge(e.status);

            rows += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:0.75rem;"><div style="font-weight:700;color:#2563eb;font-size:0.9rem;">'+e.endereco+'</div><div style="font-size:0.72rem;color:#64748b;">'+(e.plataforma||'-')+'</div>'+colabInfo+'</td>'+
            '<td style="padding:0.75rem;">'+sBadge+'</td>'+
            '<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
            '<button onclick="window.emailsOpenModalEmail('+e.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
            '<button onclick="window.emailsDelete('+e.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
            (isAtrib 
                ? '<button onclick="window.emailsOpenModalDevolver('+e.id+',\''+(nomeResp.replace(/'/g,"\\'"))+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'
                : '<button onclick="window.emailsOpenModalAtribuir('+e.id+', null)" style="background:#4f46e5;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>'
            )+
            '</div></td></tr>';
        });

        rows += '</tbody></table>';
        return bar + rows;
    }

    window.emailsFilterEmail = function() {
        var el = document.getElementById('emails-search-email');
        _filterEmail.q = el ? el.value : '';
        renderTela();
    };

    // --- MODAL NOVO/EDITAR E-MAIL ---
    window.emailsOpenModalEmail = function(id) {
        _editandoEmail = id ? _emails.find(e=>e.id===id) : null;
        renderTela(); // Atualiza pra ter modal preenchido
        document.getElementById('modal-email-cadastro').style.display='flex';
    };

    function renderModalEmail() {
        var e = _editandoEmail;
        return '<div id="modal-email-cadastro" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;max-height:90vh;">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">'+
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-envelope-simple" style="color:#4f46e5;font-size:1.4rem;"></i> '+(e?'Editar E-mail':'Cadastrar E-mail')+'</h3>'+
            '<button onclick="document.getElementById(\'modal-email-cadastro\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>'+
            '<div style="padding:1.5rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Endereço de E-mail *</label><input id="email-cad-endereco" type="email" value="'+(e?e.endereco:'')+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Senha Temporária/Acesso</label><input id="email-cad-senha" type="text" value="'+(e?e.senha||'':'')+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Plataforma</label><input id="email-cad-plat" type="text" placeholder="Ex: Google Workspace" value="'+(e?e.plataforma||'':'')+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Situação</label><select id="email-cad-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="Ativo" '+(e&&e.status==='Ativo'?'selected':'')+'>Ativo</option><option value="Bloqueado" '+(e&&e.status==='Bloqueado'?'selected':'')+'>Bloqueado</option></select></div>'+
            '</div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observações</label><textarea id="email-cad-obs" rows="2" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">'+(e?e.observacao||'':'')+'</textarea></div>'+
            '</div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-email-cadastro\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.emailsSaveEmail()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar</button>'+
            '</div></div></div>';
    }

    window.emailsSaveEmail = function() {
        var end = document.getElementById('email-cad-endereco').value.trim();
        var sen = document.getElementById('email-cad-senha').value.trim();
        var pla = document.getElementById('email-cad-plat').value.trim();
        var sta = document.getElementById('email-cad-status').value;
        var obs = document.getElementById('email-cad-obs').value.trim();

        if(!end) return alert('Endereço de e-mail é obrigatório.');
        
        var payload = { endereco: end, senha: sen, plataforma: pla, status: sta, observacao: obs };
        var url = _editandoEmail ? '/api/emails/'+_editandoEmail.id : '/api/emails';
        var meth = _editandoEmail ? 'PUT' : 'POST';

        fetch(url, {
            method: meth,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') },
            body: JSON.stringify(payload)
        }).then(r=>r.json()).then(data => {
            if(data.error) return alert(data.error);
            document.getElementById('modal-email-cadastro').style.display='none';
            fetchEmails().then(() => renderTela());
        }).catch(e => alert('Erro de rede: '+e.message));
    };

    window.emailsDelete = function(id) {
        if(!confirm('Tem certeza que deseja excluir este e-mail?')) return;
        fetch('/api/emails/'+id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') }
        }).then(r=>r.json()).then(data => {
            if(data.error) return alert(data.error);
            fetchEmails().then(() => renderTela());
        }).catch(e => alert('Erro: '+e.message));
    };

    // --- MODAL ATRIBUIR ---
    var _atribData = { email_id: null, colab_id: null };
    window.emailsOpenModalAtribuir = function(emailId, colabId) {
        _atribData = { email_id: emailId, colab_id: colabId };
        renderTela();
        document.getElementById('modal-email-atribuir').style.display='flex';
    };

    function renderModalAtribuir() {
        var emOpts = _emails.filter(e => !e.colaborador_id && !e.responsavel_nome).map(e => '<option value="'+e.id+'"'+(e.id===_atribData.email_id?' selected':'')+'>'+e.endereco+'</option>').join('');
        var coOpts = _colaboradores.map(c => '<option value="'+c.id+'"'+(c.id===_atribData.colab_id?' selected':'')+'>'+c.nome_completo+'</option>').join('');

        return '<div id="modal-email-atribuir" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:12px 12px 0 0;">'+
            '<h3 style="margin:0;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px;"><i class="ph ph-link" style="color:#4f46e5;font-size:1.4rem;"></i> Atribuir E-mail</h3>'+
            '<button onclick="document.getElementById(\'modal-email-atribuir\').style.display=\'none\'" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button></div>'+
            '<div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">E-mail Disponível</label><select id="atrib-email-id" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">-- Selecione o E-mail --</option>'+emOpts+'</select></div>'+
            '<div style="display:flex;gap:1rem;margin-bottom:0.5rem;"><label style="font-size:0.85rem;font-weight:600;cursor:pointer;"><input type="radio" name="email_tipo_resp" value="colaborador" checked onchange="window.emailsToggleResp(this.value)"> Colaborador</label><label style="font-size:0.85rem;font-weight:600;cursor:pointer;"><input type="radio" name="email_tipo_resp" value="avulso" onchange="window.emailsToggleResp(this.value)"> Responsável Avulso</label></div>'+
            '<div id="email-resp-colab"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Colaborador</label><select id="atrib-email-colab" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">-- Selecione o Colaborador --</option>'+coOpts+'</select></div>'+
            '<div id="email-resp-avulso" style="display:none;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Nome do Responsável (Livre)</label><input id="atrib-email-avulso-nome" type="text" placeholder="Ex: Financeiro Geral" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data de Atribuição</label><input id="atrib-email-data" type="date" value="'+(new Date().toISOString().split('T')[0])+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '</div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-email-atribuir\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.emailsSaveAtribuir()" style="background:#4f46e5;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Atribuir</button>'+
            '</div></div></div>';
    }

    window.emailsToggleResp = function(v) {
        document.getElementById('email-resp-colab').style.display = v==='colaborador' ? 'block' : 'none';
        document.getElementById('email-resp-avulso').style.display = v==='avulso' ? 'block' : 'none';
    };

    window.emailsSaveAtribuir = function() {
        var emailId = document.getElementById('atrib-email-id').value;
        if(!emailId) return alert('Selecione um e-mail.');
        
        var tipo = document.querySelector('input[name="email_tipo_resp"]:checked').value;
        var colabId = tipo === 'colaborador' ? document.getElementById('atrib-email-colab').value : null;
        var nomeAvulso = tipo === 'avulso' ? document.getElementById('atrib-email-avulso-nome').value.trim() : null;
        var dataAt = document.getElementById('atrib-email-data').value;

        if (tipo === 'colaborador' && !colabId) return alert('Selecione um colaborador.');
        if (tipo === 'avulso' && !nomeAvulso) return alert('Informe o nome do responsável.');

        fetch('/api/emails/'+emailId+'/atribuir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') },
            body: JSON.stringify({ colaborador_id: colabId, responsavel_nome: nomeAvulso, data_atribuicao: dataAt })
        }).then(r=>r.json()).then(data => {
            if(data.error) return alert(data.error);
            document.getElementById('modal-email-atribuir').style.display='none';
            fetchEmails().then(() => renderTela());
        }).catch(e => alert('Erro de rede: '+e.message));
    };

    // --- MODAL DEVOLVER ---
    var _devEmailId = null;
    window.emailsOpenModalDevolver = function(emailId, nomeResp) {
        _devEmailId = emailId;
        document.getElementById('email-dev-nome').textContent = nomeResp;
        document.getElementById('modal-email-devolver').style.display='flex';
    };

    function renderModalDevolver() {
        return '<div id="modal-email-devolver" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:12px;width:100%;max-width:400px;box-shadow:0 25px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column;text-align:center;">'+
            '<div style="padding:2rem 1.5rem 1rem;"><div style="width:60px;height:60px;background:#fee2e2;color:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1rem;"><i class="ph ph-warning-circle"></i></div>'+
            '<h3 style="margin:0 0 0.5rem;font-size:1.2rem;color:#0f172a;">Devolver E-mail</h3>'+
            '<p style="margin:0;color:#64748b;font-size:0.9rem;">Tem certeza que deseja remover o e-mail de <strong id="email-dev-nome" style="color:#0f172a;"></strong>?</p></div>'+
            '<div style="padding:1rem 1.5rem;display:flex;justify-content:center;gap:0.75rem;margin-bottom:1rem;">'+
            '<button onclick="document.getElementById(\'modal-email-devolver\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.emailsSaveDevolver()" style="background:#dc2626;color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Sim, Devolver</button>'+
            '</div></div></div>';
    }

    window.emailsSaveDevolver = function() {
        fetch('/api/emails/'+_devEmailId+'/devolver', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') }
        }).then(r=>r.json()).then(data => {
            if(data.error) return alert(data.error);
            document.getElementById('modal-email-devolver').style.display='none';
            fetchEmails().then(() => renderTela());
        }).catch(e => alert('Erro de rede: '+e.message));
    };

})();
