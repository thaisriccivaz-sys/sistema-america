// =============================================================
// MODULO CELULARES CORPORATIVOS
// =============================================================
(function () {
    'use strict';
    var _aparelhos = [], _chips = [], _colaboradores = [];
    var _activeTab = 'atribuidos', _expandedHistorico = {};
    var _editandoAparelho = null, _editandoChip = null;

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
    function avatarHtml(fotoPath, nome, size) {
        size = size || 44;
        var ini = iniciais(nome);
        var colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2'];
        var col = colors[ini.charCodeAt(0) % colors.length];
        var fs2 = Math.round(size * 0.35);
        var dv = '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+col+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:'+fs2+'px;flex-shrink:0;">'+ini+'</div>';
        if (!fotoPath) return dv;
        var base = (typeof API_URL !== 'undefined') ? API_URL.replace('/api','') : '';
        return '<img src="'+base+'/uploads/'+fotoPath+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;" onerror="this.outerHTML=\u0027'+dv.replace(/\u0027/g,'&apos;')+'\u0027">';
    }
    function statusBadge(s) {
        var m = {'disponivel':{bg:'#dcfce7',c:'#166534',l:'Disponivel'},'em_uso':{bg:'#dbeafe',c:'#1e40af',l:'Em Uso'},'manutencao':{bg:'#fef9c3',c:'#854d0e',l:'Manutencao'}};
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
            '<button onclick="window.celularesSetTab(\'atribuidos\')" style="'+tabS('atribuidos')+'"><i class="ph ph-users"></i> Atribuidos ('+(atrib+chipsAtrib)+')</button>'+
            '<button onclick="window.celularesSetTab(\'aparelhos\')" style="'+tabS('aparelhos')+'"><i class="ph ph-device-mobile"></i> Aparelhos Livres ('+apDisp+')</button>'+
            '<button onclick="window.celularesSetTab(\'chips\')" style="'+tabS('chips')+'"><i class="ph ph-sim-card"></i> Chips Livres ('+chDisp+')</button>'+
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
        if (!atrib.length && !chipsAv.length) return '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-device-mobile" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum aparelho ou chip atribuido.<br><small>Use o botao Atribuir.</small></div>';
        var rows = '';
        atrib.forEach(function(a) {
            var hk='aparelho-'+a.id, isOpen=!!_expandedHistorico[hk];
            var nome=a.colab_nome||a.responsavel_nome||'-';
            var isAv=!a.colaborador_id;
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(a.colab_foto,nome,40)+'<div><div style="font-weight:700;font-size:0.85rem;color:'+(isAv?'#7c3aed':'#0f172a')+';">'+nome+'</div>'+(isAv?'<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsavel Avulso</div>':'')+(a.colab_tel_corp?'<div style="font-size:0.72rem;color:#64748b;">'+a.colab_tel_corp+'</div>':'')+'</div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="font-weight:600;">'+(a.modelo||'-')+'</div><div style="font-size:0.72rem;color:#64748b;">Pat.: '+(a.patrimonio||'-')+'</div><div style="font-size:0.72rem;color:#64748b;font-family:monospace;">IMEI1: '+a.imei1+'</div>'+(a.imei2?'<div style="font-size:0.72rem;color:#64748b;font-family:monospace;">IMEI2: '+a.imei2+'</div>':'')+'</td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;">'+(a.chip_numero?'<div style="font-weight:600;color:#2563eb;">'+a.chip_numero+'</div><div style="font-size:0.72rem;color:#64748b;">'+(a.chip_operadora||'')+'</div>':'<span style="color:#94a3b8;font-size:0.8rem;">Sem chip</span>')+'</td>';
            rows+='<td style="padding:0.75rem;font-size:0.8rem;color:#64748b;">'+fmtData(a.atrib_data_inicio)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'aparelho\','+a.id+')" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;background:'+(isOpen?'#f1f5f9':'transparent')+';" title="Historico"><i class="ph ph-clock-counter-clockwise"></i><i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalDevolver('+a.atrib_id+',\''+nome.replace(/\'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'+
                '<button onclick="window.celularesOpenModalAparelho('+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="5" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando historico...</div></div></td></tr>';
        });
        chipsAv.forEach(function(c) {
            var hk='chip-'+c.id, isOpen=!!_expandedHistorico[hk];
            var nome=c.colab_nome||c.responsavel_nome||'-';
            var isAv=!c.colaborador_id;
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;align-items:center;gap:0.6rem;">'+avatarHtml(c.colab_foto,nome,40)+'<div><div style="font-weight:700;font-size:0.85rem;color:'+(isAv?'#7c3aed':'#0f172a')+';">'+nome+'</div>'+(isAv?'<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;">Responsavel Avulso</div>':'')+'</div></div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;color:#94a3b8;font-style:italic;">Apenas chip</td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="font-weight:600;color:#2563eb;">'+c.numero+'</div><div style="font-size:0.72rem;color:#64748b;">'+(c.operadora||'')+'</div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.8rem;color:#64748b;">'+fmtData(c.atrib_data_inicio)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'chip\','+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i><i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalDevolver('+c.atrib_id+',\''+nome.replace(/\'/g,"\\'")+'\')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-arrow-u-up-left"></i> Devolver</button>'+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="5" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando historico...</div></div></td></tr>';
        });
        return tableWrap(thHead(['Colaborador / Responsavel','Aparelho','Chip / Numero','Desde','Acoes']),rows);
    }
    function renderTabAparelhos() {
        var disp=_aparelhos.filter(function(a){return a.status==='disponivel'||a.status==='manutencao';});
        if (!disp.length) return '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-device-mobile" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum aparelho disponivel.<br><small>Use + Aparelho.</small></div>';
        var rows='';
        disp.forEach(function(a){
            var hk='aparelho-'+a.id, isOpen=!!_expandedHistorico[hk];
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;"><div style="font-weight:700;">'+(a.modelo||'-')+'</div><div style="font-size:0.72rem;color:#64748b;">Pat.: '+(a.patrimonio||'-')+(a.cor?' · '+a.cor:'')+'</div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.82rem;"><div>IMEI1: <strong style="font-family:monospace;">'+a.imei1+'</strong></div>'+(a.imei2?'<div>IMEI2: <strong style="font-family:monospace;">'+a.imei2+'</strong></div>':'')+'</td>';
            rows+='<td style="padding:0.75rem;">'+statusBadge(a.status)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'aparelho\','+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i> Historico <i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalAparelho('+a.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '<button onclick="window.celularesDeleteAparelho('+a.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
                '<button onclick="window.celularesOpenModalAtribuir('+a.id+')" style="background:#e67700;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>'+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="4" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando...</div></div></td></tr>';
        });
        return tableWrap(thHead(['Modelo','IMEI','Status','Acoes']),rows);
    }
    function renderTabChips() {
        var disp=_chips.filter(function(c){return c.status==='disponivel';});
        if (!disp.length) return '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-sim-card" style="font-size:3rem;display:block;margin-bottom:0.75rem;"></i>Nenhum chip disponivel.<br><small>Use + Chip.</small></div>';
        var rows='';
        disp.forEach(function(c){
            var hk='chip-'+c.id, isOpen=!!_expandedHistorico[hk];
            rows+='<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'transparent\'">';
            rows+='<td style="padding:0.75rem;font-size:0.85rem;"><div style="font-weight:700;color:#2563eb;">'+c.numero+'</div></td>';
            rows+='<td style="padding:0.75rem;font-size:0.83rem;color:#64748b;">'+(c.operadora||'-')+'</td>';
            rows+='<td style="padding:0.75rem;">'+statusBadge(c.status)+'</td>';
            rows+='<td style="padding:0.75rem;"><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
                '<button onclick="window.celularesToggleHistorico(\''+hk+'\',\'chip\','+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;font-size:0.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock-counter-clockwise"></i> Historico <i class="ph ph-caret-'+(isOpen?'up':'down')+'" style="font-size:0.7rem;"></i></button>'+
                '<button onclick="window.celularesOpenModalChip('+c.id+')" style="background:transparent;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#2563eb;font-size:0.78rem;"><i class="ph ph-pencil-simple"></i></button>'+
                '<button onclick="window.celularesDeleteChip('+c.id+')" style="background:transparent;border:1px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;color:#dc2626;font-size:0.78rem;"><i class="ph ph-trash"></i></button>'+
                '<button onclick="window.celularesOpenModalAtribuir(null,'+c.id+')" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;"><i class="ph ph-link"></i> Atribuir</button>'+
                '</div></td></tr>';
            if (isOpen) rows+='<tr id="hist-row-'+hk+'"><td colspan="4" style="padding:0;background:#f8fafc;border-bottom:2px solid #e2e8f0;"><div id="hist-content-'+hk+'" style="padding:0.75rem 1rem;"><div style="color:#94a3b8;font-size:0.82rem;text-align:center;">Carregando...</div></div></td></tr>';
        });
        return tableWrap(thHead(['Numero','Operadora','Status','Acoes']),rows);
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
        var ssel=a?('<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Status</label><select id="cel-ap-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="disponivel"'+(a.status==='disponivel'?' selected':'')+'>Disponivel</option><option value="em_uso"'+(a.status==='em_uso'?' selected':'')+'>Em Uso</option><option value="manutencao"'+(a.status==='manutencao'?' selected':'')+'>Manutencao</option></select></div>'):'';
        return '<div id="modal-celular-aparelho" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;margin:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto;">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0;font-size:1rem;font-weight:700;"><i class="ph ph-device-mobile" style="color:#e67700;"></i> '+(a?'Editar Aparelho':'Novo Aparelho')+'</h3><button onclick="document.getElementById(\'modal-celular-aparelho\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">IMEI 1 *</label><input id="cel-ap-imei1" type="text" maxlength="20" value="'+(a?a.imei1:'')+'" placeholder="Ex: 350457203829527" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;font-family:monospace;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">IMEI 2</label><input id="cel-ap-imei2" type="text" maxlength="20" value="'+(a?(a.imei2||''):'')+'" placeholder="Opcional" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;font-family:monospace;"></div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Modelo</label><input id="cel-ap-modelo" type="text" value="'+(a?(a.modelo||''):'')+'" placeholder="Ex: Samsung A55" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Patrimonio</label><input id="cel-ap-patrimonio" type="text" value="'+(a?(a.patrimonio||''):'')+'" placeholder="Ex: 00123" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            '</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Cor</label><input id="cel-ap-cor" type="text" value="'+(a?(a.cor||''):'')+'" placeholder="Ex: Preto" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"></div>'+
            ssel+'</div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Observacao</label><textarea id="cel-ap-obs" rows="2" placeholder="Opcional..." style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;">'+(a?(a.observacao||''):'')+'</textarea></div>'+
            '</div>'+
            '<div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.5rem;">'+
            '<button onclick="document.getElementById(\'modal-celular-aparelho\').style.display=\'none\'" style="background:#f1f5f9;color:#64748b;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'+
            '<button onclick="window.celularesSalvarAparelho()" style="background:#e67700;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;cursor:pointer;font-weight:700;">Salvar</button>'+
            '</div></div></div>';
    }
    function renderModalChip() {
        var c=_editandoChip;
        var ops=['Claro','Vivo','TIM','Oi','Nextel','Algar','Sercomtel'].map(function(op){return '<option value="'+op+'"'+(c&&c.operadora===op?' selected':'')+'>'+op+'</option>';}).join('');
        var ssel=c?('<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Status</label><select id="cel-ch-status" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="disponivel"'+(c.status==='disponivel'?' selected':'')+'>Disponivel</option><option value="em_uso"'+(c.status==='em_uso'?' selected':'')+'>Em Uso</option></select></div>'):'';
        return '<div id="modal-celular-chip" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">'+
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:400px;margin:1rem;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'+
            '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0;font-size:1rem;font-weight:700;"><i class="ph ph-sim-card" style="color:#2563eb;"></i> '+(c?'Editar Chip':'Novo Chip')+'</h3><button onclick="document.getElementById(\'modal-celular-chip\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#64748b;">&#215;</button></div>'+
            '<div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.9rem;">'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Numero *</label><input id="cel-ch-numero" type="text" value="'+(c?c.numero:'')+'" placeholder="(11) 99999-9999" maxlength="20" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;"></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Operadora</label><select id="cel-ch-operadora" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">Selecione...</option>'+ops+'</select></div>'+ssel+
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
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Aparelho</label>'+
            '<select id="cel-atrib-aparelho" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">Nenhum aparelho</option>'+apOpts+'</select></div>'+
            '<div><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Chip / Numero</label>'+
            '<select id="cel-atrib-chip" style="width:100%;padding:0.5rem 0.75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;box-sizing:border-box;"><option value="">Nenhum chip</option>'+chOpts+'</select></div>'+
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
    window.celularesToggleTipoResp=function(v){var cb=document.getElementById('cel-atrib-colab-block'),ab=document.getElementById('cel-atrib-avulso-block');if(cb)cb.style.display=v==='colaborador'?'':'none';if(ab)ab.style.display=v==='avulso'?'':'none';};
    window.celularesOpenModalAparelho=function(id){_editandoAparelho=id?(_aparelhos.find(function(a){return a.id==id;})||null):null;renderTela();var el=document.getElementById('modal-celular-aparelho');if(el)el.style.display='flex';};
    window.celularesOpenModalChip=function(id){_editandoChip=id?(_chips.find(function(c){return c.id==id;})||null):null;renderTela();var el=document.getElementById('modal-celular-chip');if(el)el.style.display='flex';};
    window.celularesOpenModalAtribuir=function(apId,chId){renderTela();var el=document.getElementById('modal-celular-atribuir');if(el)el.style.display='flex';if(apId){var s=document.getElementById('cel-atrib-aparelho');if(s)s.value=apId;}if(chId){var s2=document.getElementById('cel-atrib-chip');if(s2)s2.value=chId;}};
    window.celularesOpenModalDevolver=function(atribId,nome){var el=document.getElementById('modal-celular-devolver');if(el){el.style.display='flex';var i=document.getElementById('cel-dev-info');if(i)i.textContent='Devolver de: '+nome;var aid=document.getElementById('cel-dev-atrib-id');if(aid)aid.value=atribId;var dd=document.getElementById('cel-dev-data');if(dd)dd.value=new Date().toISOString().split('T')[0];}};
    window.celularesSalvarAparelho=async function(){var im=document.getElementById('cel-ap-imei1').value.trim();if(!im){alert('IMEI 1 obrigatorio.');return;}var body={imei1:im,imei2:document.getElementById('cel-ap-imei2').value.trim(),modelo:document.getElementById('cel-ap-modelo').value.trim(),patrimonio:document.getElementById('cel-ap-patrimonio').value.trim(),cor:document.getElementById('cel-ap-cor').value.trim(),observacao:document.getElementById('cel-ap-obs').value.trim()};var se=document.getElementById('cel-ap-status');if(se)body.status=se.value;try{if(_editandoAparelho){await _apiPut('/celulares/aparelhos/'+_editandoAparelho.id,body);}else{await _apiPost('/celulares/aparelhos',body);}_editandoAparelho=null;await loadAll();}catch(e){alert('Erro: '+(e.message||e));}};
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
