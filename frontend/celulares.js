// =============================================================
// MODULO CELULARES CORPORATIVOS
// =============================================================
(function () {
    'use strict';
    var _aparelhos = [], _chips = [], _colaboradores = [];
    var _activeTab = 'atribuidos', _expandedHistorico = {};
    var _editandoAparelho = null, _editandoChip = null;
    var _filterAp = {modelo:'', colab:'', status:'', ativo:'1'};
    var _filterCh = {numero:'', status:''};
    var _filterColab = {q:''};

    function fmtData(s) {
        if (!s) return '-';
        var p = s.split('-');
        return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : s;
    }
    function fmtTel(s) {
        if (!s) return '-';
        var n = s.replace(/\D/g, '');
        if (n.length === 9 || n.length === 8) n = '11' + n;
        if (n.length === 11) return n.substring(0, 2) + ' ' + n.substring(2, 7) + '-' + n.substring(7);
        if (n.length === 10) return n.substring(0, 2) + ' ' + n.substring(2, 6) + '-' + n.substring(6);
        return s;
    }
    function obsIcon(obs) {
        if (!obs || !obs.trim()) return '';
        return '<i class="ph ph-info" style="color:#3b82f6;cursor:help;margin-left:5px;font-size:1.1rem;" title="'+obs.replace(/"/g, '&quot;')+'"></i>';
    }
    function iniciais(nome) {
        if (!nome) return '?';
        var parts = nome.trim().split(/\s+/);
        return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
    }
    function avatarHtml(fotoPath, nome, size, fotoBase64) {
        size = size || 44;
        var ini = iniciais(nome);
        var colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2'];
        var col = colors[ini.charCodeAt(0) % colors.length];
        var fs2 = Math.round(size * 0.35);
        var dv = '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+col+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:'+fs2+'px;flex-shrink:0;">'+ini+'</div>';
        // Preferir base64 (persiste entre deploys no Render)
        if (fotoBase64) return '<img src="'+fotoBase64+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' + dv.replace('flex-shrink:0;">', 'flex-shrink:0;display:none">');
        if (!fotoPath) return dv;
        var base = (typeof API_URL !== 'undefined') ? API_URL.replace('/api','') : '';
        // Escapar aspas duplas como &quot; para nÃ£o quebrar o atributo onerror="..."
        var dvEsc = dv.replace(/"/g, '&quot;');
        return '<img src="'+base+'/'+fotoPath+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\''+dvEsc+'\'">';
    }
    function statusBadge(s) {
        var m = {
            'disponivel' :{bg:'#dcfce7',c:'#166534',l:'Disponivel'},
            'em_uso'     :{bg:'#dbeafe',c:'#1e40af',l:'Em Uso'},
            'manutencao' :{bg:'#fef9c3',c:'#854d0e',l:'Manutencao'},
            'atribuido'  :{bg:'#ede9fe',c:'#6d28d9',l:'Atribuido'}
        };
        var v = m[s] || {bg:'#f1f5f9',c:'#64748b',l:s||'-'};
        return '<span style="background:'+v.bg+';color:'+v.c+';padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:700;">'+v.l+'</span>';
    }
    async function loadAll() {
        try {
            var r = await Promise.all([_apiGet('/celulares/aparelhos'),_apiGet('/celulares/chips'),_apiGet('/celulares/colaboradores')]);
            _aparelhos=r[0]; _chips=r[1]; _colaboradores=r[2];
        } catch(e) { console.error('[CELULARES]',e); _aparelhos=[]; _chips=[]; _colaboradores=[]; }
        renderTela();
    }
    function renderTela() {
        var cont = document.getElementById('celulares-corporativos-content');
        if (!cont) return;
        var apDisp = _aparelhos.filter(function(a){return a.status==='disponivel';}).length;
        var chDisp = _chips.filter(function(c){return c.status==='disponivel';}).length;
        
        // Count for Colaboradores tab
        var atribArr = _aparelhos.filter(function(a){return !!a.atrib_id;});
        // chipsAv: chips com atribuição ativa que NÃO são chip_id NEM chip_id2 de nenhum aparelho atribuído
        var chipsAvArr = _chips.filter(function(c){ 
            return !!c.atrib_id && !_aparelhos.some(function(a){ 
                return !!a.atrib_id && (
                    String(a.atrib_chip_id)===String(c.id) ||
                    String(a.atrib_chip_id2)===String(c.id)
                );
            }); 
        });
        var colabsComAtrib = {};
        atribArr.forEach(function(a){ if(a.colaborador_id) colabsComAtrib[a.colaborador_id]=true; });
        chipsAvArr.forEach(function(c){ if(c.colaborador_id) colabsComAtrib[c.colaborador_id]=true; });
        var semAtribArr = _colaboradores.filter(function(c){ return !colabsComAtrib[c.id] && !(c.status||'').toLowerCase().includes('desligado'); });
        // Contar colaboradores únicos (não linhas)
        var colabsAtribUnicos = {};
        atribArr.forEach(function(a){ if(a.colaborador_id) colabsAtribUnicos[a.colaborador_id]=true; else colabsAtribUnicos['av-'+a.id]=true; });
        chipsAvArr.forEach(function(c){ if(c.colaborador_id) colabsAtribUnicos[c.colaborador_id]=true; else colabsAtribUnicos['chav-'+c.id]=true; });
        var countColabTab = semAtribArr.length + Object.keys(colabsAtribUnicos).length;

        function tabS(t){return 'padding:0.6rem 1.25rem;border:none;background:transparent;cursor:pointer;font-size:0.85rem;font-weight:600;color:'+(_activeTab===t?'#e67700':'#64748b')+';border-bottom:'+(_activeTab===t?'2px solid #e67700':'2px solid transparent')+';margin-bottom:-2px;';}
        cont.innerHTML =
            '<div style="padding:1.5rem 1.5rem 0;">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">'+
            '<div style="display:flex;align-items:center;gap:0.75rem;"><div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#e67700,#f59e0b);display:flex;align-items:center;justify-content:center;"><i class="ph ph-device-mobile" style="font-size:1.5rem;color:#fff;"></i></div>'+
            '<div><h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;">Celulares Corporativos</h2><p style="margin:0;font-size:0.8rem;color:#64748b;">'+_aparelhos.length+' aparelhos &middot; '+_chips.length+' chips</p></div></div>'+
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">'+
            '<button onclick="window.celularesOpenModalAparelho()" style="background:#0f172a;color:#fff;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;"><i class="ph ph-device-mobile"></i> + Aparelho</button>'+
            '<button onclick="window.celularesOpenModalChip()" style="background:#2563eb;color:#fff;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;"><i class="ph ph-sim-card"></i> + Chip</button>'+
            '<button onclick="window.celularesOpenModalAtribuir()" style="background:#e67700;color:#fff;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>'+
            '</div></div>'+
            '<div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:1.25rem;">'+
            '<button onclick="window.celularesSetTab(\'atribuidos\')" style="'+tabS('atribuidos')+'"><i class="ph ph-users"></i> Colaboradores <span id="tab-label-atribuidos">('+countColabTab+')</span></button>'+
            '<button onclick="window.celularesSetTab(\'aparelhos\')" style="'+tabS('aparelhos')+'"><i class="ph ph-device-mobile"></i> Aparelhos <span id="tab-label-aparelhos">('+_aparelhos.length+')</span></button>'+
            '<button onclick="window.celularesSetTab(\'chips\')" style="'+tabS('chips')+'"><i class="ph ph-sim-card"></i> Chips <span id="tab-label-chips">('+_chips.length+')</span></button>'+
            '</div></div>'+
            '<div style="padding:0 1.5rem 2rem;" id="celulares-tab-content">'+
            (_activeTab==='atribuidos'?renderTabAtribuidos():_activeTab==='aparelhos'?renderTabAparelhos():renderTabChips())+
            '</div>'+
            renderModalAparelho()+renderModalChip()+renderModalAtribuir()+renderModalDevolver();
    }
    window._celSortCol = 'desde';
    window._celSortDir = 'desc';
    window.celularesSetSort = function(col) {
        if (window._celSortCol === col) {
            window._celSortDir = window._celSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            window._celSortCol = col;
            window._celSortDir = 'asc';
        }
        renderTela();
    };

    window.celularesSetStatusFilter = function(status) {
        _filterAp.status = status;
        renderTela();
    };

    function thHead(cols) {
        var th='padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;';
        return '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">'+cols.map(function(c){
            if (typeof c === 'object') {
                var isSorted = c.sortKey === window._celSortCol;
                var icon = isSorted ? (window._celSortDir === 'asc' ? '<i class="ph ph-caret-up"></i>' : '<i class="ph ph-caret-down"></i>') : '<i class="ph ph-caret-up" style="opacity:0.3;margin-left:4px"></i>';
                var s = th + 'cursor:pointer;user-select:none;';
                if (isSorted) s += 'color:#e67700;';
                return '<th style="'+s+'" onclick="window.celularesSetSort(\''+c.sortKey+'\')"><div style="display:flex;align-items:center;gap:4px;">'+c.label+icon+'</div></th>';
            }
            return '<th style="'+th+'">'+c+'</th>';
        }).join('')+'</tr></thead>';
    }
    function tableWrap(head, rows) {
        return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">'+head+'<tbody>'+rows+'</tbody></table></div>';
    }
    function situacaoBadge(status) {
        var s = (status || '').trim();
        var sl = s.toLowerCase();
        var cfg;
        if (sl.includes('desligado'))      cfg = { label:'Desligado',  bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' };
        else if (sl.includes('f\u00e9rias') || sl.includes('ferias')) cfg = { label:'F\u00e9rias', bg:'#f3e8ff', color:'#6b21a8', border:'#d8b4fe' };
        else if (sl.includes('afastado'))  cfg = { label:'Afastado',   bg:'#fef9c3', color:'#854d0e', border:'#fde047' };
        else if (sl.includes('aguardando'))cfg = { label:'Aguardando', bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' };
        else if (!s)                       cfg = { label:'Ativo',      bg:'#dcfce7', color:'#166534', border:'#86efac' };
        else                               cfg = { label: s,           bg:'#dcfce7', color:'#166534', border:'#86efac' };
        return '<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:700;background:'+cfg.bg+';color:'+cfg.color+';border:1px solid '+cfg.border+';">'+cfg.label+'</span>';
    }

    function renderTabAtribuidos() {
        var atrib = _aparelhos.filter(function(a){return !!a.atrib_id;});
        // chipsAv: chips com atribuição ativa que NÃO são chip_id NEM chip_id2 de nenhum aparelho atribuído
        var chipsAv = _chips.filter(function(c){ 
            return !!c.atrib_id && !_aparelhos.some(function(a){
                return !!a.atrib_id && (
                    String(a.atrib_chip_id) === String(c.id) ||
                    String(a.atrib_chip_id2) === String(c.id)
                );
            });
        });
        // IDs de colaboradores que já têm atribuição ativa
        var colabsComAtrib = {};
        atrib.forEach(function(a){ if(a.colaborador_id) colabsComAtrib[a.colaborador_id]=true; });
        chipsAv.forEach(function(c){ if(c.colaborador_id) colabsComAtrib[c.colaborador_id]=true; });
        // Colaboradores com Sim mas sem atribuição ativa (desligados sem atribuição ficam de fora)
        var semAtrib = _colaboradores.filter(function(c){
            if (colabsComAtrib[c.id]) return false;
            var sl = (c.status||'').toLowerCase();
            if (sl.includes('desligado')) return false; // desligado sem celular não aparece
            return true;
        });
        // Desligados com atribuição ativa (devem aparecer com badge vermelho)
        var colabStatusMap = {};
        _colaboradores.forEach(function(c) { colabStatusMap[c.id] = c.status || ''; });

        // Filtering logic
        var fq = (_filterColab.q||'').trim().toLowerCase();
        var filterMatch = function(nome, tel, mod, pat, imei1, imei2, num, op, dept) {
            if(!fq) return true;
            return (nome&&nome.toLowerCase().includes(fq)) ||
                   (tel&&tel.toLowerCase().includes(fq)) ||
                   (mod&&mod.toLowerCase().includes(fq)) ||
                   (pat&&pat.toLowerCase().includes(fq)) ||
                   (imei1&&imei1.toLowerCase().includes(fq)) ||
                   (imei2&&imei2.toLowerCase().includes(fq)) ||
                   (num&&num.toLowerCase().includes(fq)) ||
                   (op&&op.toLowerCase().includes(fq)) ||
                   (dept&&dept.toLowerCase().includes(fq));
        };

        var deptMap = {};
        _colaboradores.forEach(function(c) { deptMap[c.id] = c.departamento || ''; });

        var semAtribF = semAtrib.filter(function(c){ return filterMatch(c.nome_completo, c.telefone_corporativo || c.telefone, '', '', '', '', '', '', c.departamento); });
        var atribF = atrib.filter(function(a){ return filterMatch(a.colab_nome||a.responsavel_nome, a.colab_tel_corp, a.modelo, a.patrimonio, a.imei1, a.imei2, a.chip_numero, a.chip_operadora, deptMap[a.colaborador_id]); });
        var chipsAvF = chipsAv.filter(function(c){ return filterMatch(c.colab_nome||c.responsavel_nome, '', '', '', '', '', c.numero, c.operadora, deptMap[c.colaborador_id]); });

        var bar = '<div style="background:#f8fafc;padding:1rem;border-radius:12px;margin-bottom:1rem;display:flex;gap:0.75rem;align-items:center;border:1px solid #e2e8f0;">'+
            '<div style="font-weight:700;font-size:0.8rem;color:#64748b;margin-right:0.5rem;"><i class="ph ph-funnel"></i> Busca:</div>'+
            '<div style="position:relative;flex:1;max-width:550px;">'+
            '<i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1.1rem;"></i>'+
            '<input id="cel-filter-colab-q" type="text" placeholder="Buscar por colaborador, departamento, modelo, imei ou chip..." value="'+(_filterColab.q||'').replace(/"/g,'&quot;')+'" oninput="window.celularesFilterColab()" style="width:100%;padding:0.5rem 0.75rem 0.5rem 2.2rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">'+
            '</div></div>';

        var totalColab = semAtrib.length + atrib.length + chipsAv.length;
        // Contar colaboradores únicos (não linhas) para exibição
        var colabsAtribUnicosR = {};
        atrib.forEach(function(a){ if(a.colaborador_id) colabsAtribUnicosR[a.colaborador_id]=true; else colabsAtribUnicosR['av-'+a.id]=true; });
        chipsAv.forEach(function(c){ if(c.colaborador_id) colabsAtribUnicosR[c.colaborador_id]=true; else colabsAtribUnicosR['chav-'+c.id]=true; });
        var totalColabUnico = semAtrib.length + Object.keys(colabsAtribUnicosR).length;
        var hasFilter = !!fq;
        var colabsAtribUnicosF = {};
        atribF.forEach(function(a){ if(a.colaborador_id) colabsAtribUnicosF[a.colaborador_id]=true; else colabsAtribUnicosF['av-'+a.id]=true; });
        chipsAvF.forEach(function(c){ if(c.colaborador_id) colabsAtribUnicosF[c.colaborador_id]=true; else colabsAtribUnicosF['chav-'+c.id]=true; });
        var totalLabel = ''; // Removido texto cinza conforme solicitado
        setTimeout(function() {
            var el = document.getElementById('tab-label-atribuidos');
            if(el) el.innerHTML = hasFilter ? '('+(semAtribF.length+Object.keys(colabsAtribUnicosF).length)+' de '+totalColabUnico+')' : '('+totalColabUnico+')';
        }, 0);

        var hasAny = atribF.length || chipsAvF.length || semAtribF.length;
        if (!hasAny) {
            var msgEmpty = fq ? 'Nenhum resultado encontrado para a busca.' : 'Nenhum colaborador com Celular Corporativo ativo.<br><small>Verifique o cadastro dos colaboradores.</small>';
            return bar + totalLabel + '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-device-mobile" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>'+msgEmpty+'</div>';
        }

        var sortCol = window._celSortCol || 'desde';
        var sortDir = window._celSortDir || 'desc';
        var sortMult = sortDir === 'asc' ? 1 : -1;

        var cmp = function(v1, v2) {
            if(!v1 && !v2) return 0;
            if(!v1) return 1;
            if(!v2) return -1;
            var s1 = String(v1).toLowerCase();
            var s2 = String(v2).toLowerCase();
            return s1.localeCompare(s2) * sortMult;
        };

        atribF.sort(function(a, b) {
            if (sortCol === 'colaborador') return cmp(a.colab_nome||a.responsavel_nome, b.colab_nome||b.responsavel_nome);
            if (sortCol === 'situacao') return cmp(a.colab_status || colabStatusMap[a.colaborador_id], b.colab_status || colabStatusMap[b.colaborador_id]);
            if (sortCol === 'aparelho') return cmp(a.modelo, b.modelo);
            if (sortCol === 'chip') return cmp(a.chip_numero, b.chip_numero);
            if (sortCol === 'desde') return cmp(a.atrib_data_inicio, b.atrib_data_inicio);
            return 0;
        });
        
        chipsAvF.sort(function(a, b) {
            if (sortCol === 'colaborador') return cmp(a.colab_nome||a.responsavel_nome, b.colab_nome||b.responsavel_nome);
            if (sortCol === 'situacao') return cmp(colabStatusMap[a.colaborador_id], colabStatusMap[b.colaborador_id]);
            if (sortCol === 'chip') return cmp(a.numero, b.numero);
            if (sortCol === 'desde') return cmp(a.atrib_data_inicio, b.atrib_data_inicio);
            return 0;
        });

        semAtribF.sort(function(a, b) {
            if (sortCol === 'colaborador') return cmp(a.nome_completo, b.nome_completo);
            if (sortCol === 'situacao') return cmp(a.status, b.status);
            return 0;
        });

        var rows = '';
        var COLSPAN = '6';

        // ── Colaboradores sem atribuição (aguardando) ──
        if (semAtribF.length) {
            rows += '<tr><td colspan="'+COLSPAN+'" style="padding:0.5rem 0.75rem;background:#fff7ed;border-bottom:1px solid #fed7aa;"><span style="font-size:0.75rem;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-clock"></i> Aguardando Atribuição ('+semAtribF.length+')</span></td></tr>';
            semAtribF.forEach(function(c) {
                var nome = c.nome_completo || '-';
                rows += '<tr style="border-bottom:1px solid #fef3c7;background:#fffbeb;cursor:pointer;" onclick="window.celularesOpenModalAtribuir(null,null,'+c.id+')" onmouseover="this.style.background=\'#fef9c3\'" onmouseout="this.style.background=\'#fffbeb\'">';
                rows += '<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">';
                rows += avatarHtml(c.foto_path, nome, 40, c.foto_base64);
                rows += '<div><div style="font-weight:700;font-size:0.85rem;color:#92400e;">'+nome+'</div>';
                rows += '<div style="font-size:0.72rem;color:#b45309;"><i class="ph ph-buildings" style="margin-right:3px;"></i>'+(c.departamento || '-')+' &middot; '+(c.cargo || '-')+'</div>';
                rows += '</div></div></td>';
                rows += '<td style="padding:0.75rem;">'+situacaoBadge(c.status)+'</td>';
                rows += '<td style="padding:0.75rem;" colspan="2"><span style="font-size:0.8rem;color:#b45309;font-style:italic;">Sem aparelho atribuído</span></td>';
                rows += '<td style="padding:0.75rem;"><span style="font-size:0.8rem;color:#b45309;">-</span></td>';
                rows += '<td style="padding:0.75rem;"><button onclick="event.stopPropagation();window.celularesOpenModalAtribuir(null,null,'+c.id+')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.78rem;font-weight:700;"><i class="ph ph-link"></i> Atribuir</button></td>';
                rows += '</tr>';
            });
        }

        // ── Atribuições ativas ──
        if (atribF.length || chipsAvF.length) {
            var uAt = {};
            atribF.forEach(function(a){ uAt[a.colaborador_id||('av-'+a.id)]=true; });
            chipsAvF.forEach(function(c){ uAt[c.colaborador_id||('chav-'+c.id)]=true; });
            rows += '<tr><td colspan="'+COLSPAN+'" style="padding:0.5rem 0.75rem;background:#f0fdf4;border-bottom:1px solid #bbf7d0;"><span style="font-size:0.75rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-check-circle"></i> Atribuídos ('+Object.keys(uAt).length+')</span></td></tr>';
        }
        atribF.forEach(function(a) {
            var base=(typeof API_URL!=='undefined')?API_URL.replace('/api',''):'';
            var hk='aparelho-'+a.id, isOpen=!!_expandedHistorico[hk];
            var nome=a.colab_nome||a.responsavel_nome||'-';
            var isAv=!a.colaborador_id;
            var fotoApSrc=a.foto_path?(a.foto_path.startsWith('http')?a.foto_path:base+'/'+a.foto_path):'';
            var fotoApThumb=fotoApSrc
                ?'<img src="'+fotoApSrc+'" style="width:40px;height:40px;border-radius:7px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\'<div style=&quot;width:40px;height:40px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;&quot;><i class=&quot;ph ph-device-mobile&quot; style=&quot;color:#94a3b8;font-size:1.1rem;&quot;></i></div>\'">'
                :'<div style="width:40px;height:40px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-device-mobile" style="color:#94a3b8;font-size:1.1rem;"></i></div>';
            var colabSt = a.colab_status || colabStatusMap[a.colaborador_id] || '';
            var colabObj = a.colaborador_id ? _colaboradores.find(function(col){ return String(col.id) === String(a.colaborador_id); }) : null;
            var deptCargoHtml = colabObj ? '<div style="font-size:0.72rem;color:#64748b;"><i class="ph ph-buildings" style="margin-right:3px;"></i>'+(colabObj.departamento || '-')+' &middot; '+(colabObj.cargo || '-')+'</div>' : '';
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(a.colab_foto,nome,40,a.colab_foto_base64)+'<div><div style="font-weight:700;font-size:0.85rem;color:'+(isAv?'#7c3aed':'#0f172a')+';">'+nome+'</div>'+(isAv?'<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsavel Avulso</div>':deptCargoHtml)+'</div></div></td>';
            rows+='<td style="padding:0.75rem;">'+situacaoBadge(isAv ? '' : colabSt)+'</td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+fotoApThumb+'<div><div style="font-weight:600;display:flex;align-items:center;">'+(a.modelo||'-')+obsIcon(a.observacao)+'</div><div style="font-size:0.72rem;color:#64748b;">Pat.: '+(a.patrimonio||'-')+'</div><div style="font-size:0.72rem;color:#64748b;font-family:monospace;">IMEI: '+a.imei1+'</div></div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;">'+(a.chip_numero
                ? '<div style="font-weight:600;color:#2563eb;">'+fmtTel(a.chip_numero)+'</div>'
                  +(a.chip_numero2?'<div style="font-weight:600;color:#2563eb;margin-top:4px;">'+fmtTel(a.chip_numero2)+'</div>':'')
                : '<span style="color:#94a3b8;font-size:0.8rem;">Sem chip</span>')+'</td>';
            rows+='<td style="padding:0.75rem;font-size:0.8rem;color:#64748b;">'+fmtData(a.atrib_data_inicio)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesOpenModalDevolver('+a.atrib_id+',\''+nome.replace(/'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'+
                '</div></td></tr>';
        });
        chipsAvF.forEach(function(c) {
            var hk='chip-'+c.id, isOpen=!!_expandedHistorico[hk];
            var nome=c.colab_nome||c.responsavel_nome||'-';
            var isAv=!c.colaborador_id;
            var colabSt = c.colab_status || colabStatusMap[c.colaborador_id] || '';
            var colabObjC = c.colaborador_id ? _colaboradores.find(function(col){ return String(col.id) === String(c.colaborador_id); }) : null;
            var deptCargoHtmlC = colabObjC ? '<div style="font-size:0.72rem;color:#64748b;"><i class="ph ph-buildings" style="margin-right:3px;"></i>'+(colabObjC.departamento || '-')+' &middot; '+(colabObjC.cargo || '-')+'</div>' : '';
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(c.colab_foto,nome,40,c.colab_foto_base64)+'<div><div style="font-weight:700;font-size:0.85rem;color:'+(isAv?'#7c3aed':'#0f172a')+';">'+nome+'</div>'+(isAv?'<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsavel Avulso</div>':deptCargoHtmlC)+'</div></div></td>';
            rows+='<td style="padding:0.75rem;">'+situacaoBadge(isAv ? '' : colabSt)+'</td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;color:#94a3b8;font-style:italic;">Apenas chip</td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="font-weight:600;color:#2563eb;display:flex;align-items:center;">'+fmtTel(c.numero)+obsIcon(c.observacao)+'</div><div style="font-size:0.72rem;color:#64748b;">'+(c.operadora||'')+'</div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.8rem;color:#64748b;">'+fmtData(c.atrib_data_inicio)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;">'+
                '<button onclick="window.celularesOpenModalDevolver('+c.atrib_id+',\''+nome.replace(/'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'+
                '</div></td></tr>';
        });

        var head = thHead([
            { label: 'Colaborador / Responsavel', sortKey: 'colaborador' },
            { label: 'Situação', sortKey: 'situacao' },
            { label: 'Aparelho', sortKey: 'aparelho' },
            { label: 'Chip / Numero', sortKey: 'chip' },
            { label: 'Desde', sortKey: 'desde' },
            'Ações'
        ]);

        return bar + totalLabel + tableWrap(head, rows);
    }

    function _filterBar(fields, onchange) {
        var inp = 'padding:0.45rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.82rem;outline:none;background:#fff;';
        var parts = fields.map(function(f) {
            if (f.type === 'select') {
                return '<select id="cel-filter-'+f.key+'" onchange="'+onchange+'" style="'+inp+'cursor:pointer;">'+
                    f.opts.map(function(o){return '<option value="'+o.v+'"'+(f.val===o.v?' selected':'')+'>'+o.l+'</option>';}).join('')+
                    '</select>';
            }
            return '<input id="cel-filter-'+f.key+'" type="text" placeholder="'+f.ph+'" value="'+f.val+'" oninput="'+onchange+'" style="'+inp+'min-width:160px;">';
        });
        return '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;"><i class="ph ph-funnel" style="color:#94a3b8;"></i>'+parts.join('')+'</div>';
    }

    function renderTabAparelhos() {
        var base=(typeof API_URL!=='undefined')?API_URL.replace('/api',''):'';
        // Todos os aparelhos (com status derivado de atrib_id)
        var all = _aparelhos.slice();

        var total = all.length;
        var atribuidos = all.filter(function(a) { return !!a.atrib_id; }).length;
        var disponiveis = all.filter(function(a) { return !a.atrib_id && (a.status||'disponivel') === 'disponivel'; }).length;
        var manutencao = all.filter(function(a) { return !a.atrib_id && a.status === 'manutencao'; }).length;

        function statCard(icon, label, val, color, bg, statusValue) {
            var onClick = "window.celularesSetStatusFilter('" + statusValue + "')";
            return '<div onclick="' + onClick + '" style="background:#fff;border-radius:10px;padding:0.9rem 1rem;border:1px solid #e2e8f0;display:flex;align-items:center;gap:0.6rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;transition:transform 0.1s;" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
                '<div style="width:34px;height:34px;border-radius:8px;background:' + bg + ';display:flex;align-items:center;justify-content:center;">' +
                '<i class="ph ' + icon + '" style="color:' + color + ';font-size:1.1rem;"></i></div>' +
                '<div><div style="font-size:1.25rem;font-weight:800;color:#0f172a;line-height:1;">' + val + '</div>' +
                '<div style="font-size:0.72rem;color:#64748b;">' + label + '</div></div></div>';
        }

        var cardsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;margin-bottom:1.5rem;">' +
            statCard('ph-stack', 'Total', total, '#6366f1', '#eef2ff', '') +
            statCard('ph-device-mobile', 'Em Uso', atribuidos, '#2563eb', '#dbeafe', 'atribuido') +
            statCard('ph-archive-box', 'Reserva', disponiveis, '#7c3aed', '#f3e8ff', 'disponivel') +
            statCard('ph-wrench', 'Manutenção', manutencao, '#d97706', '#fef9c3', 'manutencao') +
            '</div>';

        // Aplicar filtros
        var fM = (_filterAp.modelo||'').trim().toLowerCase();
        var fC = (_filterAp.colab||'').trim().toLowerCase();
        var fS = _filterAp.status||'';
        var fA = _filterAp.ativo||'';
        var filtered = all.filter(function(a) {
            var isAtrib = !!a.atrib_id;
            var sBadge = isAtrib ? 'atribuido' : (a.status||'disponivel');
            var isAtivo = (a.ativo !== undefined) ? a.ativo == 1 : true;
            if (fA === '1' && !isAtivo) return false;
            if (fA === '0' && isAtivo) return false;
            if (fM && !(a.modelo||'').toLowerCase().includes(fM)) return false;
            if (fC) {
                var cn = (a.colab_nome||'').toLowerCase();
                if (!cn.includes(fC)) return false;
            }
            if (fS && sBadge !== fS) return false;
            return true;
        });
        var bar = '<div style="background:#f8fafc;padding:1rem;border-radius:12px;margin-bottom:1rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;border:1px solid #e2e8f0;">'+
            '<div style="font-weight:700;font-size:0.8rem;color:#64748b;margin-right:0.5rem;"><i class="ph ph-funnel"></i> Filtros:</div>'+
            '<input id="cel-filter-ap-modelo" type="text" placeholder="Modelo..." value="'+_filterAp.modelo+'" oninput="window.celularesFilterAp()" style="padding:0.45rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.82rem;width:160px;">'+
            '<input id="cel-filter-ap-colab" type="text" placeholder="Colaborador..." value="'+_filterAp.colab+'" oninput="window.celularesFilterAp()" style="padding:0.45rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.82rem;width:160px;">'+
            '<select id="cel-filter-ap-status" onchange="window.celularesFilterAp()" style="padding:0.45rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.82rem;">'+
                '<option value="">Todos os status</option>'+
                '<option value="disponivel" '+(_filterAp.status==='disponivel'?'selected':'')+'>Disponível</option>'+
                '<option value="atribuido" '+(_filterAp.status==='atribuido'?'selected':'')+'>Atribuído</option>'+
                '<option value="manutencao" '+(_filterAp.status==='manutencao'?'selected':'')+'>Manutenção</option>'+
            '</select>'+
            '<select id="cel-filter-ap-ativo" onchange="window.celularesFilterAp()" style="padding:0.45rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.82rem;">'+
                '<option value="1" '+(_filterAp.ativo==='1'?'selected':'')+'>Ativos</option>'+
                '<option value="0" '+(_filterAp.ativo==='0'?'selected':'')+'>Inativos</option>'+
                '<option value="" '+(_filterAp.ativo===''?'selected':'')+'>Todos (Ativos/Inativos)</option>'+
            '</select>'+
        '</div>';
        if (!filtered.length) return cardsHtml + bar+'<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-device-mobile" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum aparelho encontrado.<br><small>Ajuste os filtros ou cadastre um novo aparelho.</small></div>';
        var rows='';
        filtered.forEach(function(a){
            var hk='aparelho-'+a.id, isOpen=!!_expandedHistorico[hk];
            var isAtrib = !!a.atrib_id;
            var sBadge = isAtrib ? 'atribuido' : (a.status||'disponivel');
            var fotoSrc=a.foto_path?(a.foto_path.startsWith('http')?a.foto_path:base+'/'+a.foto_path):'';
            var fotoThumb=fotoSrc
                ?'<img src="'+fotoSrc+'" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\'<div style=&quot;width:48px;height:48px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;&quot;><i class=&quot;ph ph-device-mobile&quot; style=&quot;color:#94a3b8;font-size:1.4rem;&quot;></i></div>\'">'
                :'<div style="width:48px;height:48px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-device-mobile" style="color:#94a3b8;font-size:1.4rem;"></i></div>';
            var colabInfo = isAtrib && a.colab_nome ? '<div style="font-size:0.72rem;color:#6d28d9;margin-top:2px;"><i class="ph ph-user"></i> '+a.colab_nome+'</div>' : '';
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.65rem;">'+fotoThumb+'<div><div style="font-weight:700;font-size:0.85rem;display:flex;align-items:center;">'+(a.modelo||'-')+obsIcon(a.observacao)+'</div><div style="font-size:0.72rem;color:#64748b;">Pat.: '+(a.patrimonio||'-')+'</div>'+colabInfo+'</div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.82rem;"><div>IMEI1: <strong style="font-family:monospace;">'+a.imei1+'</strong></div>'+(a.imei2?'<div>IMEI2: <strong style="font-family:monospace;">'+a.imei2+'</strong></div>':'')+' </td>';
            rows+='<td style="padding:0.75rem;">'+statusBadge(sBadge)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'aparelho\','+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i> Historico <i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalAparelho('+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '<button onclick="window.celularesDeleteAparelho('+a.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
                (isAtrib ? '<button onclick="window.celularesOpenModalDevolver('+a.atrib_id+',\''+((a.colab_nome||'').replace(/'/g,"\\'"))+'\')" ' +
                     'style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'
                   : '<button onclick="window.celularesOpenModalAtribuir('+a.id+')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>')+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="4" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando...</div></div></td></tr>';
        });
        var hasFilter = !!_filterAp.modelo || !!_filterAp.colab || !!_filterAp.status;
        var totalLabel = '';
        setTimeout(function() {
            var el = document.getElementById('tab-label-aparelhos');
            if(el) el.innerHTML = hasFilter ? '('+filtered.length+' de '+all.length+')' : '('+all.length+')';
        }, 0);
        return cardsHtml + bar + totalLabel + tableWrap(thHead(['Modelo','IMEI','Status','A\u00e7\u00f5es']),rows);
    }

    function renderTabChips() {
        var fN = (_filterCh.numero||'').trim().replace(/[\s\-().]/g,'');
        var fS = _filterCh.status||'';
        var norm = function(s){ return (s||'').replace(/[\s\-().]/g,''); };
        var filtered = _chips.filter(function(c) {
            var isAtrib = !!c.atrib_id;
            var sBadge = isAtrib ? 'atribuido' : (c.status||'disponivel');
            if (fN && norm(c.numero).indexOf(fN) === -1) return false;
            if (fS && sBadge !== fS) return false;
            return true;
        });
        var bar = _filterBar([
            {type:'text', key:'ch-numero', ph:'Filtrar por número...', val:_filterCh.numero},
            {type:'select', key:'ch-status', val:_filterCh.status, opts:[
                {v:'',l:'Todos os status'},
                {v:'disponivel',l:'Disponível'},
                {v:'atribuido',l:'Atribuído'}
            ]}
        ], 'window.celularesFilterCh()');
        var hasFilter = !!_filterCh.numero || !!_filterCh.status;
        var totalLabel = '';
        setTimeout(function() {
            var el = document.getElementById('tab-label-chips');
            if(el) el.innerHTML = hasFilter ? '('+filtered.length+' de '+_chips.length+')' : '('+_chips.length+')';
        }, 0);
        bar += totalLabel;
        if (!filtered.length) return bar+'<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-sim-card" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum chip encontrado.<br><small>Ajuste os filtros.</small></div>';
        var rows='';
        filtered.forEach(function(c){
            var hk='chip-'+c.id, isOpen=!!_expandedHistorico[hk];
            var isAtrib = !!c.atrib_id;
            var sBadge = isAtrib ? 'atribuido' : (c.status||'disponivel');
            var nomeResp = c.colab_nome || c.responsavel_nome;
            var colabInfo = isAtrib && nomeResp ? '<div style="font-size:0.72rem;color:#6d28d9;margin-top:2px;"><i class="ph ph-user"></i> '+nomeResp+'</div>' : '';
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;font-size:0.85rem;"><div style="font-weight:700;color:#2563eb;display:flex;align-items:center;">'+fmtTel(c.numero)+obsIcon(c.observacao)+'</div>'+(c.operadora?'<div style="font-size:0.72rem;color:#64748b;">'+c.operadora+'</div>':'')+colabInfo+'</td>';
            rows+='<td style="padding:0.75rem;">'+statusBadge(sBadge)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'chip\','+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i> Historico <i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalChip('+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '<button onclick="window.celularesDeleteChip('+c.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
                (isAtrib
                    ? '<button onclick="window.celularesOpenModalDevolver('+c.atrib_id+',\''+((c.colab_nome||'').replace(/'/g,"\\'"))+'\')" ' +
                       'style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'
                    : '<button onclick="window.celularesOpenModalAtribuir(null,'+c.id+')" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>')+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="3" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando...</div></div></td></tr>';
        });
        return bar + tableWrap(thHead(['Número / Operadora','Status','Ações']),rows);
    }
    window.celularesToggleHistorico = async function(key, tipo, id) {
        _expandedHistorico[key] = !_expandedHistorico[key];
        var tc=document.getElementById('celulares-tab-content');
        if(tc) tc.innerHTML=_activeTab==='atribuidos'?renderTabAtribuidos():_activeTab==='aparelhos'?renderTabAparelhos():renderTabChips();
        if(!_expandedHistorico[key]) return;
        try {
            var hist=await _apiGet('/celulares/historico/'+tipo+'/'+id);
            var el=document.getElementById('hist-content-'+key);
            if(!el) return;
            if(!hist||!hist.length){el.innerHTML='<p style="color:#94a3b8;font-size:0.82rem;text-align:center;margin:0;">Sem historico.</p>';return;}
            var html='<div style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:0.5rem;"><i class="ph ph-clock-counter-clockwise"></i> Historico de Uso</div><div style="display:flex;flex-direction:column;gap:6px;">';
            hist.forEach(function(h){
                var hn=h.colab_nome||h.responsavel_nome||'(sem registro)', ativo=!h.data_fim;
                var extra=(h.chip_numero?' - Chip 1: '+h.chip_numero+(h.chip_operadora?' ('+h.chip_operadora+')':''):'')+
                           (h.chip_numero2?' - Chip 2: '+h.chip_numero2+(h.chip_operadora2?' ('+h.chip_operadora2+')':''):'')+
                           (h.aparelho_modelo?' - Aparelho: '+h.aparelho_modelo:'');
                var imeis=h.imei1?'<br><span style="font-family:monospace;font-size:0.7rem;">IMEI1: '+h.imei1+(h.imei2?' - IMEI2: '+h.imei2:'')+'</span>':'';
                html+='<div style="display:flex;align-items:center;gap:0.75rem;background:'+(ativo?'#fff7ed':'#fff')+';border:1px solid '+(ativo?'#fed7aa':'#e2e8f0')+';border-radius:8px;padding:0.5rem 0.75rem;">'+avatarHtml(h.colab_foto,hn,32)+
                      '<div style="flex:1;"><div style="font-weight:600;font-size:0.82rem;">'+hn+'</div>'+
                      '<div style="font-size:0.72rem;color:#64748b;">'+fmtData(h.data_inicio)+' -> '+(h.data_fim?fmtData(h.data_fim):'<strong style="color:#e67700;">Em uso</strong>')+extra+imeis+(h.observacao?'<br><em>'+h.observacao+'</em>':'')+'</div></div>'+
                      (ativo?'<span style="background:#fed7aa;color:#9a3412;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:700;white-space:nowrap;">Atual</span>':'')+
                      '</div>';
            });
            html+='</div>';
            el.innerHTML=html;
        } catch(e){var el2=document.getElementById('hist-content-'+key);if(el2)el2.innerHTML='<p style="color:#dc2626;">Erro ao carregar historico.</p>';}
    };
    function renderModalAparelho() {
        var a=_editandoAparelho;
        var base=(typeof API_URL!=='undefined')?API_URL.replace('/api',''):'';
        var fotoAtual=a&&a.foto_path?(a.foto_path.startsWith('http')?a.foto_path:base+'/'+a.foto_path):'';
        var ssel=a?('<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Status</label><select id="cel-ap-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="disponivel"'+(a.status==='disponivel'?' selected':'')+'>Disponivel</option><option value="em_uso"'+(a.status==='em_uso'?' selected':'')+'>Em Uso</option><option value="manutencao"'+(a.status==='manutencao'?' selected':'')+'>Manutencao</option></select></div>'):'';
        return '<div id="modal-celular-aparelho" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;margin:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto;">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0;font-size:1rem;font-weight:700;"><i class="ph ph-device-mobile" style="color:#e67700;"></i> '+(a?'Editar Aparelho':'Novo Aparelho')+'</h3><button onclick="document.getElementById(\'modal-celular-aparelho\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem;">'+
            // Foto do aparelho
            '<div style="display:flex;align-items:center;gap:1rem;">'+
            '<div id="cel-ap-foto-preview" style="width:72px;height:72px;border-radius:10px;border:2px dashed #e2e8f0;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f8fafc;cursor:pointer;" onclick="document.getElementById(\'cel-ap-foto-input\').click()">'+
            (fotoAtual?'<img src="'+fotoAtual+'" style="width:100%;height:100%;object-fit:cover;">':'<i class="ph ph-camera" style="font-size:1.75rem;color:#94a3b8;"></i>')+
            '</div>'+
            '<div><div style="font-size:0.82rem;font-weight:600;color:#374151;">Foto do Aparelho</div>'+
            '<div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Clique para adicionar ou alterar</div>'+
            '<input id="cel-ap-foto-input" type="file" accept="image/*" style="display:none;" onchange="window.celularesPreviewFotoAp(this)">'+
            '</div></div>'+
            // Modelo + PatrimÃ´nio
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Modelo</label><input id="cel-ap-modelo" type="text" value="'+(a?(a.modelo||''):'').replace(/"/g,'&quot;')+'" placeholder="Ex: Samsung A55" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Patrimonio</label><input id="cel-ap-patrimonio" type="text" value="'+(a?(a.patrimonio||''):'').replace(/"/g,'&quot;')+'" placeholder="Ex: 00123" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '</div>'+
            // IMEI 1 + IMEI 2
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">IMEI 1 *</label><input id="cel-ap-imei1" type="text" maxlength="20" value="'+(a?a.imei1:'')+'" placeholder="Ex: 350457203829527" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;font-family:monospace;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">IMEI 2</label><input id="cel-ap-imei2" type="text" maxlength="20" value="'+(a?(a.imei2||''):'').replace(/"/g,'&quot;')+'" placeholder="Opcional" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;font-family:monospace;"></div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">'+
            (ssel||'')+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Situação</label><select id="cel-ap-ativo" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="1"'+(a&&(a.ativo===1||a.ativo===undefined)?' selected':'')+'>Ativo</option><option value="0"'+(a&&a.ativo===0?' selected':'')+'>Inativo</option></select></div>'+
            '</div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observacao</label><textarea id="cel-ap-obs" rows="2" placeholder="Opcional..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;">'+(a?(a.observacao||''):'')+'</textarea></div>'+
            '</div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;">'+ 
            '<div id="cel-ap-erro" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:0.6rem 0.9rem;font-size:0.82rem;font-weight:600;margin-bottom:0.75rem;"><i class="ph ph-warning"></i> <span id="cel-ap-erro-msg"></span></div>'+
            '<div style="display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-celular-aparelho\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.celularesSalvarAparelho()" style="background:#e67700;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar</button>'+
            '</div></div></div></div>';
    }
    function renderModalChip() {
        var c=_editandoChip;
        var ops=['Claro','Vivo','TIM','Oi','Nextel','Algar','Sercomtel'].map(function(op){var sel=(c?c.operadora===op:op==='TIM')?' selected':'';return '<option value="'+op+'"'+sel+'>'+op+'</option>';}).join('');
        var ssel=c?('<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Status</label><select id="cel-ch-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="disponivel"'+(c.status==='disponivel'?' selected':'')+'>Disponivel</option><option value="em_uso"'+(c.status==='em_uso'?' selected':'')+'>Em Uso</option></select></div>'):'';
        return '<div id="modal-celular-chip" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:400px;margin:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0;font-size:1rem;font-weight:700;"><i class="ph ph-sim-card" style="color:#2563eb;"></i> '+(c?'Editar Chip':'Novo Chip')+'</h3><button onclick="document.getElementById(\'modal-celular-chip\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Numero *</label><input id="cel-ch-numero" type="text" value="'+(c?fmtTel(c.numero):'11 ')+'" placeholder="11 99999-9999" maxlength="20" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Operadora</label><select id="cel-ch-operadora" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">'+ops+'</select></div>'+ssel+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observacao</label><textarea id="cel-ch-obs" rows="2" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;">'+(c?(c.observacao||''):'')+'</textarea></div>'+
            '</div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-celular-chip\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.celularesSalvarChip()" style="background:#2563eb;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar</button>'+
            '</div></div></div>';
    }
    function renderModalAtribuir() {
        var apOpts=_aparelhos.filter(function(a){return a.status==='disponivel';}).map(function(a){return '<option value="'+a.id+'">'+(a.modelo||'Sem modelo')+' - Pat. '+(a.patrimonio||'-')+' - IMEI: '+a.imei1+'</option>';}).join('');
        var chOpts=_chips.filter(function(c){return c.status==='disponivel';}).map(function(c){return '<option value="'+c.id+'">'+fmtTel(c.numero)+(c.operadora?' ('+c.operadora+')':'')+'</option>';}).join('');
        var colOpts=_colaboradores.map(function(c){return '<option value="'+c.id+'">'+c.nome_completo+'</option>';}).join('');
        var hoje=new Date().toISOString().split('T')[0];
        return '<div id="modal-celular-atribuir" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:520px;margin:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto;">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;">'+
            '<h3 style="margin:0;font-size:1rem;font-weight:700;"><i class="ph ph-link" style="color:#e67700;"></i> Atribuir Aparelho / Chip</h3>'+
            '<button onclick="document.getElementById(\'modal-celular-atribuir\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem;">'+
            '<div style="background:#f8fafc;border-radius:10px;padding:0.75rem;border:1px solid #e2e8f0;">'+
            '<label style="font-size:0.8rem;font-weight:700;display:block;margin-bottom:0.5rem;">Tipo de Responsavel</label>'+
            '<div style="display:flex;gap:0.75rem;">'+
            '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="cel-tipo-resp" value="colaborador" checked onchange="window.celularesToggleTipoResp(this.value)"> Colaborador</label>'+
            '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="cel-tipo-resp" value="avulso" onchange="window.celularesToggleTipoResp(this.value)"> Responsavel Avulso</label>'+
            '</div></div>'+
            '<div id="cel-atrib-colab-block"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Colaborador *</label>'+
            '<select id="cel-atrib-colab" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">Selecione...</option>'+colOpts+'</select>'+
            (_colaboradores.length===0?'<p style="color:#94a3b8;font-size:0.78rem;margin:4px 0 0;">Nenhum colaborador com Celular Corporativo = Sim.</p>':'')+'</div>'+
            '<div id="cel-atrib-avulso-block" style="display:none;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Nome do Responsavel *</label>'+
            '<input id="cel-atrib-avulso-nome" type="text" placeholder="Ex: Joao Silva - Manutencao" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div style="position:relative;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Aparelho</label>'+
            '<input id="cel-atrib-aparelho-busca" type="text" autocomplete="off" placeholder="Pesquisar por modelo, patrimônio ou IMEI..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;" oninput="window.celularesAparelhoSearch(this.value)" onfocus="window.celularesAparelhoSearch(this.value)">'+
            '<input type="hidden" id="cel-atrib-aparelho">'+
            '<div id="cel-ap-dropdown" style="display:none;position:absolute;left:0;right:0;top:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:100;max-height:220px;overflow-y:auto;margin-top:2px;"></div>'+
            '</div>'+
            // Chip 1
            '<div style="position:relative;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Chip / Número 1</label>'+
            '<input id="cel-atrib-chip-busca" type="text" autocomplete="off" placeholder="Digite ou cole o numero do chip..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;" oninput="window.celularesChipSearch(this.value)" onfocus="window.celularesChipSearch(this.value)">'+
            '<input type="hidden" id="cel-atrib-chip">'+
            '<div id="cel-chip-dropdown" style="display:none;position:absolute;left:0;right:0;top:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:100;max-height:200px;overflow-y:auto;margin-top:2px;"></div>'+
            '</div>'+
            // Chip 2
            '<div style="position:relative;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Chip / Número 2 <span style="font-size:0.72rem;color:#94a3b8;font-weight:400;">(opcional)</span></label>'+
            '<input id="cel-atrib-chip2-busca" type="text" autocomplete="off" placeholder="Segundo chip (opcional)..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;" oninput="window.celularesChipSearch2(this.value)" onfocus="window.celularesChipSearch2(this.value)">'+
            '<input type="hidden" id="cel-atrib-chip2">'+
            '<div id="cel-chip2-dropdown" style="display:none;position:absolute;left:0;right:0;top:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:100;max-height:200px;overflow-y:auto;margin-top:2px;"></div>'+
            '</div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data de Inicio</label>'+
            '<input id="cel-atrib-data" type="date" value="'+hoje+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observacao</label>'+
            '<textarea id="cel-atrib-obs" rows="2" placeholder="Opcional..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;"></textarea></div>'+
            '<div id="cel-atrib-erro" style="display:none;color:#dc2626;font-size:0.82rem;background:#fef2f2;padding:0.5rem 0.75rem;border-radius:8px;border:1px solid #fca5a5;"></div>'+
            '</div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;position:sticky;bottom:0;background:#fff;">'+
            '<button onclick="document.getElementById(\'modal-celular-atribuir\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.celularesSalvarAtribuicao()" style="background:#e67700;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Confirmar Atribuicao</button>'+
            '</div></div></div>';
    }
    function renderModalDevolver() {
        var hoje=new Date().toISOString().split('T')[0];
        return '<div id="modal-celular-devolver" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:400px;margin:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">'+
            '<h3 style="margin:0;font-size:1rem;font-weight:700;color:#dc2626;"><i class="ph ph-arrow-u-up-left"></i> Registrar Devolução</h3>'+
            '<button onclick="document.getElementById(\'modal-celular-devolver\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem;">'+
            '<p id="cel-dev-info" style="margin:0;font-size:0.88rem;color:#374151;background:#f8fafc;padding:0.75rem;border-radius:8px;border:1px solid #e2e8f0;"></p>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Selecione o que deseja devolver:</label>'+
            '<div id="cel-dev-items"></div></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data da Devolução</label>'+
            '<input id="cel-dev-data" type="date" value="'+hoje+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observação</label>'+
            '<textarea id="cel-dev-obs" rows="2" placeholder="Ex: Aparelho devolvido em perfeito estado" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;"></textarea></div>'+
            '<input type="hidden" id="cel-dev-atrib-id"></div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-celular-devolver\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.celularesConfirmarDevolucao()" style="background:#dc2626;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Confirmar Devolução</button>'+
            '</div></div></div>';
    }
    window.celularesSetTab=function(t){_activeTab=t;_expandedHistorico={};renderTela();};
    window.celularesFilterColab=function(){
        var q=document.getElementById('cel-filter-colab-q');
        var fId = document.activeElement ? document.activeElement.id : null;
        var sStart = document.activeElement ? document.activeElement.selectionStart : null;
        if(q)_filterColab.q=q.value;
        var tc=document.getElementById('celulares-tab-content'); if(tc) tc.innerHTML=renderTabAtribuidos();
        if(fId){var el=document.getElementById(fId);if(el){el.focus();try{el.setSelectionRange(sStart,sStart);}catch(e){}}}
    };
    window.celularesFilterAp=function(){
        var m=document.getElementById('cel-filter-ap-modelo'),c=document.getElementById('cel-filter-ap-colab'),s=document.getElementById('cel-filter-ap-status'), at=document.getElementById('cel-filter-ap-ativo');
        var fId = document.activeElement ? document.activeElement.id : null;
        var sStart = document.activeElement ? document.activeElement.selectionStart : null;
        if(m)_filterAp.modelo=m.value; if(c)_filterAp.colab=c.value; if(s)_filterAp.status=s.value; if(at)_filterAp.ativo=at.value;
        var tc=document.getElementById('celulares-tab-content'); if(tc) tc.innerHTML=renderTabAparelhos();
        if(fId){var el=document.getElementById(fId);if(el){el.focus();try{el.setSelectionRange(sStart,sStart);}catch(e){}}}
    };
    window.celularesFilterCh=function(){
        var n=document.getElementById('cel-filter-ch-numero'),s=document.getElementById('cel-filter-ch-status');
        var fId = document.activeElement ? document.activeElement.id : null;
        var sStart = document.activeElement ? document.activeElement.selectionStart : null;
        if(n)_filterCh.numero=n.value; if(s)_filterCh.status=s.value;
        var tc=document.getElementById('celulares-tab-content'); if(tc) tc.innerHTML=renderTabChips();
        if(fId){var el=document.getElementById(fId);if(el){el.focus();try{el.setSelectionRange(sStart,sStart);}catch(e){}}}
    };
    window.celularesToggleTipoResp=function(v){var cb=document.getElementById('cel-atrib-colab-block'),ab=document.getElementById('cel-atrib-avulso-block');if(cb)cb.style.display=v==='colaborador'?'':'none';if(ab)ab.style.display=v==='avulso'?'':'none';};

    // Busca de chip por numero (ignora tracos, espacos, parenteses)
    window.celularesChipSearch=function(q){
        var drop=document.getElementById('cel-chip-dropdown');
        if(!drop)return;
        var norm=function(s){return (s||'').replace(/[\s\-().]/g,'');};
        var qn=norm(q);
        // Excluir o chip2 já selecionado do dropdown do chip1
        var chip2sel=parseInt((document.getElementById('cel-atrib-chip2')||{}).value||0);
        var chips=_chips.filter(function(c){return c.status==='disponivel' && c.id!==chip2sel;});
        var matches=qn?chips.filter(function(c){
            return norm(c.numero).indexOf(qn)!==-1;
        }):chips;
        if(!matches.length){
            drop.innerHTML='<div style="padding:0.6rem 0.75rem;font-size:0.82rem;color:#94a3b8;">Nenhum chip encontrado</div>';
            drop.style.display='block';
            return;
        }
        drop.innerHTML=matches.map(function(c){
            var label=fmtTel(c.numero)+(c.operadora?' <span style="color:#64748b;font-size:0.78rem;">('+c.operadora+')</span>':'');
            return '<div style="padding:0.6rem 0.75rem;cursor:pointer;font-size:0.85rem;border-bottom:1px solid #f1f5f9;" '+
                'onmousedown="window.celularesChipSelect('+c.id+',\''+fmtTel(c.numero).replace(/'/g,"\\'")+(c.operadora?' ('+c.operadora+')':'')+'\')" '+
                'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">'+
                label+'</div>';
        }).join('');
        drop.style.display='block';
    };
    window.celularesChipSelect=function(id,label){
        var inp=document.getElementById('cel-atrib-chip-busca');
        var hid=document.getElementById('cel-atrib-chip');
        var drop=document.getElementById('cel-chip-dropdown');
        if(inp)inp.value=label;
        if(hid)hid.value=id;
        if(drop)drop.style.display='none';
    };
    // Chip 2
    window.celularesChipSearch2=function(q){
        var drop=document.getElementById('cel-chip2-dropdown');
        if(!drop)return;
        var norm=function(s){return (s||'').replace(/[\s\-().]/g,'');};
        var qn=norm(q);
        // Excluir o chip1 já selecionado do dropdown do chip2
        var chip1sel=parseInt((document.getElementById('cel-atrib-chip')||{}).value||0);
        var chips=_chips.filter(function(c){return c.status==='disponivel' && c.id!==chip1sel;});
        var matches=qn?chips.filter(function(c){
            return norm(c.numero).indexOf(qn)!==-1;
        }):chips;
        if(!matches.length){
            drop.innerHTML='<div style="padding:0.6rem 0.75rem;font-size:0.82rem;color:#94a3b8;">Nenhum chip encontrado</div>';
            drop.style.display='block';
            return;
        }
        drop.innerHTML=matches.map(function(c){
            var label=c.numero+(c.operadora?' <span style="color:#64748b;font-size:0.78rem;">('+c.operadora+')</span>':'');
            return '<div style="padding:0.6rem 0.75rem;cursor:pointer;font-size:0.85rem;border-bottom:1px solid #f1f5f9;" '+
                'onmousedown="window.celularesChipSelect2('+c.id+',\''+c.numero.replace(/'/g,"\\'")+(c.operadora?' ('+c.operadora+')':'')+'\')" '+
                'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">'+
                label+'</div>';
        }).join('');
        drop.style.display='block';
    };
    window.celularesChipSelect2=function(id,label){
        var inp=document.getElementById('cel-atrib-chip2-busca');
        var hid=document.getElementById('cel-atrib-chip2');
        var drop=document.getElementById('cel-chip2-dropdown');
        if(inp)inp.value=label;
        if(hid)hid.value=id;
        if(drop)drop.style.display='none';
    };
    // Fechar dropdown ao clicar fora
    document.addEventListener('click',function(e){
        var drop=document.getElementById('cel-chip-dropdown');
        var inp=document.getElementById('cel-atrib-chip-busca');
        if(drop&&inp&&!inp.contains(e.target)&&!drop.contains(e.target))drop.style.display='none';
        var drop2=document.getElementById('cel-chip2-dropdown');
        var inp2=document.getElementById('cel-atrib-chip2-busca');
        if(drop2&&inp2&&!inp2.contains(e.target)&&!drop2.contains(e.target))drop2.style.display='none';
    });
    window.celularesOpenModalAparelho=function(id){_editandoAparelho=id?(_aparelhos.find(function(a){return a.id==id;})||null):null;renderTela();var el=document.getElementById('modal-celular-aparelho');if(el)el.style.display='flex';};
    window.celularesOpenModalChip=function(id){_editandoChip=id?(_chips.find(function(c){return c.id==id;})||null):null;renderTela();var el=document.getElementById('modal-celular-chip');if(el)el.style.display='flex';};
    window.celularesAparelhoSearch=function(q){
        var drop=document.getElementById('cel-ap-dropdown');
        if(!drop)return;
        var norm=function(s){return (s||'').toLowerCase().replace(/[\s\-().]/g,'');};
        var qn=norm(q);
        // Apenas aparelhos disponíveis e ativos
        var aps=_aparelhos.filter(function(a){return a.status==='disponivel' && (a.ativo===1||a.ativo===undefined);});
        var matches=qn?aps.filter(function(a){
            return norm(a.modelo).indexOf(qn)!==-1||
                   norm(a.patrimonio).indexOf(qn)!==-1||
                   norm(a.imei1).indexOf(qn)!==-1||
                   norm(a.imei2).indexOf(qn)!==-1;
        }):aps;
        if(!matches.length){
            drop.innerHTML='<div style="padding:0.6rem 0.75rem;font-size:0.82rem;color:#94a3b8;">Nenhum aparelho encontrado</div>';
            drop.style.display='block';return;
        }
        drop.innerHTML=matches.map(function(a){
            var label=(a.modelo||'Sem modelo')+' - Pat. '+(a.patrimonio||'-')+' - IMEI: '+a.imei1;
            return '<div style="padding:0.6rem 0.75rem;cursor:pointer;font-size:0.85rem;border-bottom:1px solid #f1f5f9;" '+
                'onmousedown="window.celularesAparelhoSelect('+a.id+',\''+label.replace(/'/g,"\\'")+'\')" '+
                'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">'+ label+'</div>';
        }).join('');
        drop.style.display='block';
    };
    window.celularesAparelhoSelect=function(id,label){
        var inp=document.getElementById('cel-atrib-aparelho-busca');
        var hid=document.getElementById('cel-atrib-aparelho');
        var drop=document.getElementById('cel-ap-dropdown');
        if(inp)inp.value=label;
        if(hid)hid.value=id;
        if(drop)drop.style.display='none';
    };
    document.addEventListener('click',function(e){
        var drop=document.getElementById('cel-ap-dropdown');
        if(drop&&!drop.contains(e.target)&&e.target.id!=='cel-atrib-aparelho-busca') drop.style.display='none';
    },true);
    window.celularesOpenModalAtribuir=function(apId,chId,colabId){
        renderTela();
        var el=document.getElementById('modal-celular-atribuir');
        if(el)el.style.display='flex';
        // Pré-preencher aparelho
        if(apId){
            var ap=_aparelhos.find(function(a){return a.id==apId;});
            var sb=document.getElementById('cel-atrib-aparelho-busca');
            var hid=document.getElementById('cel-atrib-aparelho');
            if(ap&&sb) sb.value=(ap.modelo||'Sem modelo')+' - Pat. '+(ap.patrimonio||'-')+' - IMEI: '+ap.imei1;
            if(hid) hid.value=apId;
        } else {
            var sb0=document.getElementById('cel-atrib-aparelho-busca');
            var hid0=document.getElementById('cel-atrib-aparelho');
            if(sb0)sb0.value=''; if(hid0)hid0.value='';
        }
        // Pré-preencher chip 1
        if(chId){
            var s2=document.getElementById('cel-atrib-chip');if(s2)s2.value=chId;
            var ch=_chips.find(function(c){return c.id==chId;});
            var sb2=document.getElementById('cel-atrib-chip-busca');
            if(sb2&&ch)sb2.value=fmtTel(ch.numero)+(ch.operadora?' ('+ch.operadora+')':'');
        } else {
            var sb3=document.getElementById('cel-atrib-chip-busca');if(sb3)sb3.value='';
            var hid3=document.getElementById('cel-atrib-chip');if(hid3)hid3.value='';
        }
        // Limpar chip 2
        var sb4=document.getElementById('cel-atrib-chip2-busca');if(sb4)sb4.value='';
        var hid4=document.getElementById('cel-atrib-chip2');if(hid4)hid4.value='';
        if(colabId){var s3=document.getElementById('cel-atrib-colab');if(s3)s3.value=colabId;}
    };
    window.celularesOpenModalDevolver=function(atribId,nome){
        var el=document.getElementById('modal-celular-devolver');
        if(el){
            el.style.display='flex';
            var i=document.getElementById('cel-dev-info');if(i)i.textContent='Devolver de: '+nome;
            var aid=document.getElementById('cel-dev-atrib-id');if(aid)aid.value=atribId;
            var dd=document.getElementById('cel-dev-data');if(dd)dd.value=new Date().toISOString().split('T')[0];
            
            var cont = document.getElementById('cel-dev-items');
            if(cont) {
                var ap = _aparelhos.find(function(x){return String(x.atrib_id)===String(atribId);});
                var ch = _chips.filter(function(x){return String(x.atrib_id)===String(atribId);});
                var html = '';
                if(ap) html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;margin-bottom:6px;"><input type="checkbox" class="cb-cel-dev" data-tipo="aparelho" value="'+ap.id+'" checked> <div style="font-size:0.85rem;"><b>Aparelho:</b> '+ap.modelo+' (IMEI: '+ap.imei1+')</div></label>';
                ch.forEach(function(c){
                    html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;margin-bottom:6px;"><input type="checkbox" class="cb-cel-dev" data-tipo="chip" value="'+c.id+'" checked> <div style="font-size:0.85rem;"><b>Chip:</b> '+fmtTel(c.numero)+' ('+(c.operadora||'')+')</div></label>';
                });
                cont.innerHTML = html;
            }
        }
    };
    window.celularesPreviewFotoAp=function(input){
        if(!input.files||!input.files[0])return;
        var reader=new FileReader();
        reader.onload=function(e){
            var prev=document.getElementById('cel-ap-foto-preview');
            if(prev)prev.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;">';
        };
        reader.readAsDataURL(input.files[0]);
    };
    window.celularesSalvarAparelho=async function(){
        var im=document.getElementById('cel-ap-imei1').value.trim();
        var erEl=document.getElementById('cel-ap-erro'), erMsg=document.getElementById('cel-ap-erro-msg');
        var showErr=function(msg){if(erEl){erMsg.textContent=msg;erEl.style.display='block';}else{alert(msg);}return;};
        if(erEl) erEl.style.display='none';
        if(!im){showErr('IMEI 1 é obrigatório.');return;}
        var atv=document.getElementById('cel-ap-ativo');
        var body={imei1:im,imei2:document.getElementById('cel-ap-imei2').value.trim(),modelo:document.getElementById('cel-ap-modelo').value.trim(),patrimonio:document.getElementById('cel-ap-patrimonio').value.trim(),observacao:document.getElementById('cel-ap-obs').value.trim(), ativo: atv ? parseInt(atv.value) : 1};
        var se=document.getElementById('cel-ap-status');if(se)body.status=se.value;
        try{
            var savedId;
            if(_editandoAparelho){await _apiPut('/celulares/aparelhos/'+_editandoAparelho.id,body);savedId=_editandoAparelho.id;}
            else{var r=await _apiPost('/celulares/aparelhos',body);savedId=r.id;}
            // Upload de foto se selecionada
            var fi=document.getElementById('cel-ap-foto-input');
            if(fi&&fi.files&&fi.files[0]&&savedId){
                var fd=new FormData();fd.append('foto',fi.files[0]);
                await fetch(API_URL+'/celulares/aparelhos/'+savedId+'/foto',{method:'POST',headers:{'Authorization':'Bearer '+currentToken},body:fd});
            }
            _editandoAparelho=null;await loadAll();
        }catch(e){
            // Tenta extrair mensagem do JSON de erro do backend
            var msg=e.message||String(e);
            try{var j=JSON.parse(msg);if(j.error)msg=j.error;}catch(_){}
            showErr(msg);
        }
    };
    window.celularesSalvarChip=async function(){var nu=document.getElementById('cel-ch-numero').value.trim();if(!nu){alert('Numero obrigatorio.');return;}var body={numero:nu,operadora:document.getElementById('cel-ch-operadora').value,observacao:document.getElementById('cel-ch-obs').value.trim()};var se=document.getElementById('cel-ch-status');if(se)body.status=se.value;try{if(_editandoChip){await _apiPut('/celulares/chips/'+_editandoChip.id,body);}else{await _apiPost('/celulares/chips',body);}_editandoChip=null;await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
    window.celularesSalvarAtribuicao=async function(){
        var tr=(document.querySelector('input[name="cel-tipo-resp"]:checked')||{}).value,
            cid=(document.getElementById('cel-atrib-colab')||{}).value,
            an=((document.getElementById('cel-atrib-avulso-nome')||{}).value||'').trim(),
            apid=(document.getElementById('cel-atrib-aparelho')||{}).value,
            chid=(document.getElementById('cel-atrib-chip')||{}).value,
            chid2=(document.getElementById('cel-atrib-chip2')||{}).value,
            di=(document.getElementById('cel-atrib-data')||{}).value,
            obs=((document.getElementById('cel-atrib-obs')||{}).value||'').trim(),
            ee=document.getElementById('cel-atrib-erro'),
            se=function(m){if(ee){ee.textContent=m;ee.style.display='block';}};
        if(ee)ee.style.display='none';
        if(tr==='colaborador'&&!cid)return se('Selecione um colaborador.');
        if(tr==='avulso'&&!an)return se('Informe o nome do responsavel.');
        if(!apid&&!chid&&!chid2)return se('Selecione pelo menos um aparelho ou chip.');
        if(chid&&chid2&&chid===chid2)return se('Os dois chips não podem ser iguais.');
        var body={
            colaborador_id:tr==='colaborador'?(cid||null):null,
            responsavel_nome:tr==='avulso'?an:null,
            aparelho_id:apid||null,
            chip_id:chid||null,
            chip_id2:chid2||null,
            data_inicio:di,
            observacao:obs
        };
        try{
            await _apiPost('/celulares/atribuicoes',body);
            document.getElementById('modal-celular-atribuir').style.display='none';
            _activeTab='atribuidos';
            await loadAll();
        }catch(e){se('Erro: '+(e.message||e));}
    };
    window.celularesConfirmarDevolucao=async function(){
        var aid=document.getElementById('cel-dev-atrib-id').value;
        var df=document.getElementById('cel-dev-data').value;
        var obs=document.getElementById('cel-dev-obs').value.trim();
        
        var ap = _aparelhos.find(function(x){return String(x.atrib_id)===String(aid);});
        var chs = _chips.filter(function(x){return String(x.atrib_id)===String(aid);});
        var baseColabId = ap ? ap.colaborador_id : (chs.length > 0 ? chs[0].colaborador_id : null);
        var baseResp = ap ? ap.responsavel_nome : (chs.length > 0 ? chs[0].responsavel_nome : null);

        var cbs = document.querySelectorAll('.cb-cel-dev');
        var dev_aparelho = false, dev_chip1 = false, dev_chip2 = false;
        var chipIds = chs.map(function(c){ return String(c.id); });
        
        cbs.forEach(function(cb){
            if(!cb.checked) return;
            if(cb.dataset.tipo==='aparelho') dev_aparelho=true;
            if(cb.dataset.tipo==='chip'){
                if(String(cb.value)===chipIds[0]) dev_chip1=true;
                else if(String(cb.value)===chipIds[1]) dev_chip2=true;
            }
        });

        if(!dev_aparelho && !dev_chip1 && !dev_chip2) return alert('Selecione pelo menos um item para devolver.');

        try {
            await _apiPut('/celulares/atribuicoes/'+aid+'/devolver',{data_fim:df,observacao:obs});
            
            var keepAp = (ap && !dev_aparelho) ? ap.id : null;
            var keepCh1 = (chs.length > 0 && !dev_chip1) ? chs[0].id : null;
            var keepCh2 = (chs.length > 1 && !dev_chip2) ? chs[1].id : null;

            if (keepAp || keepCh1 || keepCh2) {
                await _apiPost('/celulares/atribuicoes', {
                    colaborador_id: baseColabId,
                    responsavel_nome: baseResp,
                    aparelho_id: keepAp,
                    chip_id: keepCh1,
                    chip_id2: keepCh2,
                    data_inicio: df,
                    observacao: 'Continuação de atribuição anterior (Devolução parcial)'
                });
            }

            document.getElementById('modal-celular-devolver').style.display='none';
            _activeTab='atribuidos';
            await loadAll();
        } catch(e) {
            alert('Erro: '+(e.message||e));
        }
    };
    window.celularesDeleteAparelho=async function(id){if(!confirm('Excluir este aparelho?'))return;try{await _apiDelete('/celulares/aparelhos/'+id);await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
    window.celularesDeleteChip=async function(id){if(!confirm('Excluir este chip?'))return;try{await _apiDelete('/celulares/chips/'+id);await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
    window.initCelularesCorporativos=async function(){_activeTab='atribuidos';_expandedHistorico={};await loadAll();};
    async function _apiGet(p){var r=await fetch(API_URL+p,{headers:{'Authorization':'Bearer '+currentToken}});if(!r.ok)throw new Error(await r.text());return r.json();}
    async function _apiPost(p,b){var r=await fetch(API_URL+p,{method:'POST',headers:{'Authorization':'Bearer '+currentToken,'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();}
    async function _apiPut(p,b){var r=await fetch(API_URL+p,{method:'PUT',headers:{'Authorization':'Bearer '+currentToken,'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();}
    async function _apiDelete(p){var r=await fetch(API_URL+p,{method:'DELETE',headers:{'Authorization':'Bearer '+currentToken}});if(!r.ok)throw new Error(await r.text());return r.json();}
})();
