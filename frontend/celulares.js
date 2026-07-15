// =============================================================
// MODULO CELULARES CORPORATIVOS
// =============================================================
(function () {
    'use strict';
    var _aparelhos = [], _chips = [], _colaboradores = [];
    var _activeTab = 'atribuidos', _expandedHistorico = {};
    var _editandoAparelho = null, _editandoChip = null;
    var _filterAp = {modelo:'', colab:'', status:''};
    var _filterCh = {numero:'', status:''};
    var _filterColab = {nome:''};

    function fmtData(s) {
        if (!s) return '-';
        var p = s.split('-');
        return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : s;
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
        var atrib  = _aparelhos.filter(function(a){return !!a.atrib_id;}).length;
        var chipsAtrib = _chips.filter(function(c){return !!c.atrib_id;}).length;
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
            '<button onclick="window.celularesSetTab(\'atribuidos\')" style="'+tabS('atribuidos')+'"><i class="ph ph-users"></i> Colaboradores ('+(atrib+chipsAtrib)+')</button>'+
            '<button onclick="window.celularesSetTab(\'aparelhos\')" style="'+tabS('aparelhos')+'"><i class="ph ph-device-mobile"></i> Aparelhos ('+_aparelhos.length+')</button>'+
            '<button onclick="window.celularesSetTab(\'chips\')" style="'+tabS('chips')+'"><i class="ph ph-sim-card"></i> Chips ('+_chips.length+')</button>'+
            '</div></div>'+
            '<div style="padding:0 1.5rem 2rem;" id="celulares-tab-content">'+
            (_activeTab==='atribuidos'?renderTabAtribuidos():_activeTab==='aparelhos'?renderTabAparelhos():renderTabChips())+
            '</div>'+
            renderModalAparelho()+renderModalChip()+renderModalAtribuir()+renderModalDevolver();
    }
    function thHead(cols) {
        var th='padding:0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;';
        return '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">'+cols.map(function(c){return '<th style="'+th+'">'+c+'</th>';}).join('')+'</tr></thead>';
    }
    function tableWrap(head, rows) {
        return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">'+head+'<tbody>'+rows+'</tbody></table></div>';
    }
    function renderTabAtribuidos() {
        var atrib = _aparelhos.filter(function(a){return !!a.atrib_id;});
        var chipsAv = _chips.filter(function(c){ return !!c.atrib_id && !_aparelhos.some(function(a){return String(a.atrib_chip_id)===String(c.id)&&!!a.atrib_id;}); });
        // IDs de colaboradores que jÃ¡ tÃªm atribuiÃ§Ã£o ativa
        var colabsComAtrib = {};
        atrib.forEach(function(a){ if(a.colaborador_id) colabsComAtrib[a.colaborador_id]=true; });
        chipsAv.forEach(function(c){ if(c.colaborador_id) colabsComAtrib[c.colaborador_id]=true; });
        // Colaboradores com Sim mas sem atribuiÃ§Ã£o
        var semAtrib = _colaboradores.filter(function(c){ return !colabsComAtrib[c.id]; });

        var hasAny = atrib.length || chipsAv.length || semAtrib.length;
        if (!hasAny) return '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-device-mobile" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum colaborador com Celular Corporativo ativo.<br><small>Verifique o cadastro dos colaboradores.</small></div>';

        var rows = '';

        // â”€â”€ Colaboradores sem atribuiÃ§Ã£o (aguardando) â”€â”€
        if (semAtrib.length) {
            rows += '<tr><td colspan="5" style="padding:0.5rem 0.75rem;background:#fff7ed;border-bottom:1px solid #fed7aa;"><span style="font-size:0.75rem;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-clock"></i> Aguardando AtribuiÃ§Ã£o ('+semAtrib.length+')</span></td></tr>';
            semAtrib.forEach(function(c) {
                var nome = c.nome_completo || '-';
                rows += '<tr style="border-bottom:1px solid #fef3c7;background:#fffbeb;cursor:pointer;" onclick="window.celularesOpenModalAtribuir(null,null,'+c.id+')" onmouseover="this.style.background=\'#fef9c3\'" onmouseout="this.style.background=\'#fffbeb\'">';
                rows += '<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">';
                rows += avatarHtml(c.foto_path, nome, 40, c.foto_base64);
                rows += '<div><div style="font-weight:700;font-size:0.85rem;color:#92400e;">'+nome+'</div>';
                rows += '<div style="font-size:0.72rem;color:#b45309;">'+( c.telefone_corporativo || c.telefone || '')+'</div>';
                rows += '</div></div></td>';
                rows += '<td style="padding:0.75rem;" colspan="2"><span style="font-size:0.8rem;color:#b45309;font-style:italic;">Sem aparelho atribuÃ­do</span></td>';
                rows += '<td style="padding:0.75rem;"><span style="font-size:0.8rem;color:#b45309;">-</span></td>';
                rows += '<td style="padding:0.75rem;"><button onclick="event.stopPropagation();window.celularesOpenModalAtribuir(null,null,'+c.id+')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.78rem;font-weight:700;"><i class="ph ph-link"></i> Atribuir</button></td>';
                rows += '</tr>';
            });
        }

        // â”€â”€ AtribuiÃ§Ãµes ativas â”€â”€
        if (atrib.length || chipsAv.length) {
            rows += '<tr><td colspan="5" style="padding:0.5rem 0.75rem;background:#f0fdf4;border-bottom:1px solid #bbf7d0;"><span style="font-size:0.75rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;"><i class="ph ph-check-circle"></i> AtribuÃ­dos ('+(atrib.length+chipsAv.length)+')</span></td></tr>';
        }
        atrib.forEach(function(a) {
            var base=(typeof API_URL!=='undefined')?API_URL.replace('/api',''):'';
            var hk='aparelho-'+a.id, isOpen=!!_expandedHistorico[hk];
            var nome=a.colab_nome||a.responsavel_nome||'-';
            var isAv=!a.colaborador_id;
            var fotoApSrc=a.foto_path?(a.foto_path.startsWith('http')?a.foto_path:base+'/'+a.foto_path):'';
            var fotoApThumb=fotoApSrc
                ?'<img src="'+fotoApSrc+'" style="width:40px;height:40px;border-radius:7px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\'<div style=&quot;width:40px;height:40px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;&quot;><i class=&quot;ph ph-device-mobile&quot; style=&quot;color:#94a3b8;font-size:1.1rem;&quot;></i></div>\'">'
                :'<div style="width:40px;height:40px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-device-mobile" style="color:#94a3b8;font-size:1.1rem;"></i></div>';
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(a.colab_foto,nome,40,a.colab_foto_base64)+'<div><div style="font-weight:700;font-size:0.85rem;color:'+(isAv?'#7c3aed':'#0f172a')+';">'+nome+'</div>'+(isAv?'<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsavel Avulso</div>':'')+(a.colab_tel_corp?'<div style="font-size:0.72rem;color:#64748b;">'+a.colab_tel_corp+'</div>':'')+'</div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+fotoApThumb+'<div><div style="font-weight:600;">'+(a.modelo||'-')+'</div><div style="font-size:0.72rem;color:#64748b;">Pat.: '+(a.patrimonio||'-')+'</div><div style="font-size:0.72rem;color:#64748b;font-family:monospace;">IMEI: '+a.imei1+'</div></div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;">'+(a.chip_numero?'<div style="font-weight:600;color:#2563eb;">'+a.chip_numero+'</div><div style="font-size:0.72rem;color:#64748b;">'+(a.chip_operadora||'')+'</div>':'<span style="color:#94a3b8;font-size:0.8rem;">Sem chip</span>')+'</td>';
            rows+='<td style="padding:0.75rem;font-size:0.8rem;color:#64748b;">'+fmtData(a.atrib_data_inicio)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'aparelho\','+a.id+')" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;background:'+(isOpen?'#f1f5f9':'transparent')+';" title="Historico"><i class="ph ph-clock-counter-clockwise"></i><i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalDevolver('+a.atrib_id+',\''+nome.replace(/'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'+
                '<button onclick="window.celularesOpenModalAparelho('+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="5" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando historico...</div></div></td></tr>';
        });
        chipsAv.forEach(function(c) {
            var hk='chip-'+c.id, isOpen=!!_expandedHistorico[hk];
            var nome=c.colab_nome||c.responsavel_nome||'-';
            var isAv=!c.colaborador_id;
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(c.colab_foto,nome,40,c.colab_foto_base64)+'<div><div style="font-weight:700;font-size:0.85rem;color:'+(isAv?'#7c3aed':'#0f172a')+';">'+nome+'</div>'+(isAv?'<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsavel Avulso</div>':'')+'</div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;color:#94a3b8;font-style:italic;">Apenas chip</td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="font-weight:600;color:#2563eb;">'+c.numero+'</div><div style="font-size:0.72rem;color:#64748b;">'+(c.operadora||'')+'</div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.8rem;color:#64748b;">'+fmtData(c.atrib_data_inicio)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'chip\','+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i><i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalDevolver('+c.atrib_id+',\''+nome.replace(/'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="5" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando historico...</div></div></td></tr>';
        });
        return tableWrap(thHead(['Colaborador / Responsavel','Aparelho','Chip / Numero','Desde','Acoes']),rows);
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
        // Aplicar filtros
        var fM = (_filterAp.modelo||'').trim().toLowerCase();
        var fC = (_filterAp.colab||'').trim().toLowerCase();
        var fS = _filterAp.status||'';
        var filtered = all.filter(function(a) {
            var isAtrib = !!a.atrib_id;
            var sBadge = isAtrib ? 'atribuido' : (a.status||'disponivel');
            if (fM && !(a.modelo||'').toLowerCase().includes(fM)) return false;
            if (fC) {
                var cn = (a.colab_nome||'').toLowerCase();
                if (!cn.includes(fC)) return false;
            }
            if (fS && sBadge !== fS) return false;
            return true;
        });
        var bar = _filterBar([
            {type:'text', key:'ap-modelo', ph:'Filtrar por modelo...', val:_filterAp.modelo},
            {type:'text', key:'ap-colab',  ph:'Filtrar por colaborador...', val:_filterAp.colab},
            {type:'select', key:'ap-status', val:_filterAp.status, opts:[
                {v:'',l:'Todos os status'},
                {v:'disponivel',l:'DisponÃ­vel'},
                {v:'atribuido',l:'AtribuÃ­do'},
                {v:'manutencao',l:'ManutenÃ§Ã£o'}
            ]}
        ], 'window.celularesFilterAp()');
        if (!filtered.length) return bar+'<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-device-mobile" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum aparelho encontrado.<br><small>Ajuste os filtros ou cadastre um novo aparelho.</small></div>';
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
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.65rem;">'+fotoThumb+'<div><div style="font-weight:700;font-size:0.85rem;">'+(a.modelo||'-')+'</div><div style="font-size:0.72rem;color:#64748b;">Pat.: '+(a.patrimonio||'-')+'</div>'+colabInfo+'</div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.82rem;"><div>IMEI1: <strong style="font-family:monospace;">'+a.imei1+'</strong></div>'+(a.imei2?'<div>IMEI2: <strong style="font-family:monospace;">'+a.imei2+'</strong></div>':'')+' </td>';
            rows+='<td style="padding:0.75rem;">'+statusBadge(sBadge)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'aparelho\','+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i> Historico <i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalAparelho('+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '<button onclick="window.celularesDeleteAparelho('+a.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
                (isAtrib ? '<button onclick="window.celularesOpenModalDevolver('+a.atrib_id+',\''+((a.colab_nome||'').replace(/'/g,"\\'"))+'\')"
                     style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'
                   : '<button onclick="window.celularesOpenModalAtribuir('+a.id+')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>')+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="4" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando...</div></div></td></tr>';
        });
        return bar + tableWrap(thHead(['Modelo','IMEI','Status','Acoes']),rows);
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
            {type:'text', key:'ch-numero', ph:'Filtrar por nÃºmero...', val:_filterCh.numero},
            {type:'select', key:'ch-status', val:_filterCh.status, opts:[
                {v:'',l:'Todos os status'},
                {v:'disponivel',l:'DisponÃ­vel'},
                {v:'atribuido',l:'AtribuÃ­do'}
            ]}
        ], 'window.celularesFilterCh()');
        if (!filtered.length) return bar+'<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-sim-card" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum chip encontrado.<br><small>Ajuste os filtros.</small></div>';
        var rows='';
        filtered.forEach(function(c){
            var hk='chip-'+c.id, isOpen=!!_expandedHistorico[hk];
            var isAtrib = !!c.atrib_id;
            var sBadge = isAtrib ? 'atribuido' : (c.status||'disponivel');
            var colabInfo = isAtrib && c.colab_nome ? '<div style="font-size:0.72rem;color:#6d28d9;margin-top:2px;"><i class="ph ph-user"></i> '+c.colab_nome+'</div>' : '';
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;font-size:0.85rem;"><div style="font-weight:700;color:#2563eb;">'+c.numero+'</div>'+(c.operadora?'<div style="font-size:0.72rem;color:#64748b;">'+c.operadora+'</div>':'')+colabInfo+'</td>';
            rows+='<td style="padding:0.75rem;">'+statusBadge(sBadge)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'chip\','+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i> Historico <i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalChip('+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '<button onclick="window.celularesDeleteChip('+c.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
                (isAtrib
                    ? '<button onclick="window.celularesOpenModalDevolver('+c.atrib_id+',\''+((c.colab_nome||'').replace(/'/g,"\\'"))+'\')"
                       style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'
                    : '<button onclick="window.celularesOpenModalAtribuir(null,'+c.id+')" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>')+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="3" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando...</div></div></td></tr>';
        });
        return bar + tableWrap(thHead(['Numero / Operadora','Status','Acoes']),rows);
    }
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
                var extra=(h.chip_numero?' - Chip: '+h.chip_numero+(h.chip_operadora?' ('+h.chip_operadora+')':''):'')+
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
            (ssel||'')+
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
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Numero *</label><input id="cel-ch-numero" type="text" value="'+(c?c.numero:'(11) ')+'" placeholder="(11) 99999-9999" maxlength="20" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;"></div>'+
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
        var chOpts=_chips.filter(function(c){return c.status==='disponivel';}).map(function(c){return '<option value="'+c.id+'">'+c.numero+(c.operadora?' ('+c.operadora+')':'')+'</option>';}).join('');
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
            '<div style="position:relative;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Chip / Numero</label>'+
            '<input id="cel-atrib-chip-busca" type="text" autocomplete="off" placeholder="Digite ou cole o numero do chip..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;" oninput="window.celularesChipSearch(this.value)" onfocus="window.celularesChipSearch(this.value)">'+
            '<input type="hidden" id="cel-atrib-chip">'+
            '<div id="cel-chip-dropdown" style="display:none;position:absolute;left:0;right:0;top:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:100;max-height:200px;overflow-y:auto;margin-top:2px;"></div>'+
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
            '<h3 style="margin:0;font-size:1rem;font-weight:700;color:#dc2626;"><i class="ph ph-arrow-u-up-left"></i> Registrar Devolucao</h3>'+
            '<button onclick="document.getElementById(\'modal-celular-devolver\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem;">'+
            '<p id="cel-dev-info" style="margin:0;font-size:0.88rem;color:#374151;background:#f8fafc;padding:0.75rem;border-radius:8px;border:1px solid #e2e8f0;"></p>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data da Devolucao</label>'+
            '<input id="cel-dev-data" type="date" value="'+hoje+'" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observacao</label>'+
            '<textarea id="cel-dev-obs" rows="2" placeholder="Ex: Aparelho devolvido em perfeito estado" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;"></textarea></div>'+
            '<input type="hidden" id="cel-dev-atrib-id"></div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-celular-devolver\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.celularesConfirmarDevolucao()" style="background:#dc2626;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Confirmar Devolucao</button>'+
            '</div></div></div>';
    }
    window.celularesSetTab=function(t){_activeTab=t;_expandedHistorico={};renderTela();};
    window.celularesFilterAp=function(){
        var m=document.getElementById('cel-filter-ap-modelo'),c=document.getElementById('cel-filter-ap-colab'),s=document.getElementById('cel-filter-ap-status');
        if(m)_filterAp.modelo=m.value; if(c)_filterAp.colab=c.value; if(s)_filterAp.status=s.value;
        var tc=document.getElementById('celulares-tab-content'); if(tc) tc.innerHTML=renderTabAparelhos();
    };
    window.celularesFilterCh=function(){
        var n=document.getElementById('cel-filter-ch-numero'),s=document.getElementById('cel-filter-ch-status');
        if(n)_filterCh.numero=n.value; if(s)_filterCh.status=s.value;
        var tc=document.getElementById('celulares-tab-content'); if(tc) tc.innerHTML=renderTabChips();
    };
    window.celularesToggleTipoResp=function(v){var cb=document.getElementById('cel-atrib-colab-block'),ab=document.getElementById('cel-atrib-avulso-block');if(cb)cb.style.display=v==='colaborador'?'':'none';if(ab)ab.style.display=v==='avulso'?'':'none';};

    // Busca de chip por numero (ignora tracos, espacos, parenteses)
    window.celularesChipSearch=function(q){
        var drop=document.getElementById('cel-chip-dropdown');
        if(!drop)return;
        var norm=function(s){return (s||'').replace(/[\s\-().]/g,'');};
        var qn=norm(q);
        var chips=_chips.filter(function(c){return c.status==='disponivel';});
        // Sem texto: mostrar todos se o campo estiver em foco
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
                'onmousedown="window.celularesChipSelect('+c.id+',\''+c.numero.replace(/'/g,"\\'")+(c.operadora?' ('+c.operadora+')':'')+'\')" '+
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
    // Fechar dropdown ao clicar fora
    document.addEventListener('click',function(e){
        var drop=document.getElementById('cel-chip-dropdown');
        var inp=document.getElementById('cel-atrib-chip-busca');
        if(drop&&inp&&!inp.contains(e.target)&&!drop.contains(e.target))drop.style.display='none';
    });
    window.celularesOpenModalAparelho=function(id){_editandoAparelho=id?(_aparelhos.find(function(a){return a.id==id;})||null):null;renderTela();var el=document.getElementById('modal-celular-aparelho');if(el)el.style.display='flex';};
    window.celularesOpenModalChip=function(id){_editandoChip=id?(_chips.find(function(c){return c.id==id;})||null):null;renderTela();var el=document.getElementById('modal-celular-chip');if(el)el.style.display='flex';};
    window.celularesAparelhoSearch=function(q){
        var drop=document.getElementById('cel-ap-dropdown');
        if(!drop)return;
        var norm=function(s){return (s||'').toLowerCase().replace(/[\s\-().]/g,'');};
        var qn=norm(q);
        // Apenas aparelhos disponíveis
        var aps=_aparelhos.filter(function(a){return a.status==='disponivel';});
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
        // Pré-preencher chip
        if(chId){
            var s2=document.getElementById('cel-atrib-chip');if(s2)s2.value=chId;
            var ch=_chips.find(function(c){return c.id==chId;});
            var sb2=document.getElementById('cel-atrib-chip-busca');
            if(sb2&&ch)sb2.value=ch.numero+(ch.operadora?' ('+ch.operadora+')':'');
        } else {
            var sb3=document.getElementById('cel-atrib-chip-busca');if(sb3)sb3.value='';
            var hid3=document.getElementById('cel-atrib-chip');if(hid3)hid3.value='';
        }
        if(colabId){var s3=document.getElementById('cel-atrib-colab');if(s3)s3.value=colabId;}
    };
    window.celularesOpenModalDevolver=function(atribId,nome){var el=document.getElementById('modal-celular-devolver');if(el){el.style.display='flex';var i=document.getElementById('cel-dev-info');if(i)i.textContent='Devolver de: '+nome;var aid=document.getElementById('cel-dev-atrib-id');if(aid)aid.value=atribId;var dd=document.getElementById('cel-dev-data');if(dd)dd.value=new Date().toISOString().split('T')[0];}};
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
        var body={imei1:im,imei2:document.getElementById('cel-ap-imei2').value.trim(),modelo:document.getElementById('cel-ap-modelo').value.trim(),patrimonio:document.getElementById('cel-ap-patrimonio').value.trim(),observacao:document.getElementById('cel-ap-obs').value.trim()};
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
    window.celularesSalvarAtribuicao=async function(){var tr=(document.querySelector('input[name="cel-tipo-resp"]:checked')||{}).value,cid=(document.getElementById('cel-atrib-colab')||{}).value,an=((document.getElementById('cel-atrib-avulso-nome')||{}).value||'').trim(),apid=(document.getElementById('cel-atrib-aparelho')||{}).value,chid=(document.getElementById('cel-atrib-chip')||{}).value,di=(document.getElementById('cel-atrib-data')||{}).value,obs=((document.getElementById('cel-atrib-obs')||{}).value||'').trim(),ee=document.getElementById('cel-atrib-erro'),se=function(m){if(ee){ee.textContent=m;ee.style.display='block';}};if(ee)ee.style.display='none';if(tr==='colaborador'&&!cid)return se('Selecione um colaborador.');if(tr==='avulso'&&!an)return se('Informe o nome do responsavel.');if(!apid&&!chid)return se('Selecione pelo menos um aparelho ou chip.');var body={colaborador_id:tr==='colaborador'?(cid||null):null,responsavel_nome:tr==='avulso'?an:null,aparelho_id:apid||null,chip_id:chid||null,data_inicio:di,observacao:obs};try{await _apiPost('/celulares/atribuicoes',body);document.getElementById('modal-celular-atribuir').style.display='none';_activeTab='atribuidos';await loadAll();}catch(e){se('Erro: '+(e.message||e));}};
    window.celularesConfirmarDevolucao=async function(){var aid=document.getElementById('cel-dev-atrib-id').value,df=document.getElementById('cel-dev-data').value,obs=document.getElementById('cel-dev-obs').value.trim();try{await _apiPut('/celulares/atribuicoes/'+aid+'/devolver',{data_fim:df,observacao:obs});document.getElementById('modal-celular-devolver').style.display='none';_activeTab='atribuidos';await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
    window.celularesDeleteAparelho=async function(id){if(!confirm('Excluir este aparelho?'))return;try{await _apiDelete('/celulares/aparelhos/'+id);await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
    window.celularesDeleteChip=async function(id){if(!confirm('Excluir este chip?'))return;try{await _apiDelete('/celulares/chips/'+id);await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
    window.initCelularesCorporativos=async function(){_activeTab='atribuidos';_expandedHistorico={};await loadAll();};
    async function _apiGet(p){var r=await fetch(API_URL+p,{headers:{'Authorization':'Bearer '+currentToken}});if(!r.ok)throw new Error(await r.text());return r.json();}
    async function _apiPost(p,b){var r=await fetch(API_URL+p,{method:'POST',headers:{'Authorization':'Bearer '+currentToken,'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();}
    async function _apiPut(p,b){var r=await fetch(API_URL+p,{method:'PUT',headers:{'Authorization':'Bearer '+currentToken,'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();}
    async function _apiDelete(p){var r=await fetch(API_URL+p,{method:'DELETE',headers:{'Authorization':'Bearer '+currentToken}});if(!r.ok)throw new Error(await r.text());return r.json();}
})();
