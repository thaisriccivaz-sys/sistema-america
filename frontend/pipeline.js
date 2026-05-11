/* ═══════════════════════════════════════════════════════════════
   MÓDULO: PIPELINE OS (Kanban de Ordens de Serviço)
   ═══════════════════════════════════════════════════════════════ */

const PIPELINE_COLS = [
    { key: 'manutencao', label: 'Manutenção',    cor: '#e2e8f0', icon: '<i class="ph ph-wrench"></i>', textCor: '#334155' },
    { key: 'entrega',    label: 'Entrega',         cor: '#dcfce7', icon: '<i class="ph ph-truck"></i>', textCor: '#166534' },
    { key: 'retirada',   label: 'Retirada',        cor: '#fef08a', icon: '<i class="ph ph-arrow-u-down-left"></i>', textCor: '#854d0e' },
    { key: 'avulso',     label: 'Avulso',          cor: '#ffffff', icon: '<i class="ph ph-lightning"></i>', textCor: '#334155' },
];

const PIPELINE_VARS_CORES = {
    'NOTURNO':              { bg:'#1e3a5f', text:'#fff', icon:'🌘' },
    'INFORMACOES IMPORTANTES': { bg:'#dc2626', text:'#fff', icon:'🚨' },
    'ATENCAO AO HORARIO':   { bg:'#b45309', text:'#fff', icon:'⏰' },
    'AVULSO':               { bg:'#ea580c', text:'#fff', icon:'❗' },
    'LEVAR CARRINHO':       { bg:'#f59e0b', text:'#fff', icon:'🛒' },
    'LEVAR EXTENSORA':      { bg:'#f59e0b', text:'#fff', icon:'🌀' },
    'VAC':                  { bg:'#374151', text:'#fff', icon:'🏗️' },
    'CARRETINHA':           { bg:'#374151', text:'#fff', icon:'🔗' },
    'LEVAR EPI':            { bg:'#16a34a', text:'#fff', icon:'🦺' },
    'TROCA DE CABINE':      { bg:'#0284c7', text:'#fff', icon:'♻️' },
    'INTEGRACAO':           { bg:'#7c3aed', text:'#fff', icon:'👷' },
    'APOIO DE SUCCAO':      { bg:'#0891b2', text:'#fff', icon:'💧' },
    'TROCA DE EQUIPAMENTO': { bg:'#0284c7', text:'#fff', icon:'♻️' },
};

const PIPELINE_EQ_ICONS = {
    'STD OBRA':'💙','STD EVENTO':'💜','LX OBRA':'🟦','LX EVENTO':'🟪',
    'ELX OBRA':'🔵','ELX EVENTO':'🟣','PCD OBRA':'♿','PCD EVENTO':'🧑🏾‍🦽',
    'CHUVEIRO OBRA':'🚿','CHUVEIRO EVENTO':'🚿','HIDRÁULICO OBRA':'🚽','HIDRÁULICO EVENTO':'🚽','HIDRAULICO OBRA':'🚽','HIDRAULICO EVENTO':'🚽',
    'MICTORIO OBRA':'💦','MICTORIO EVENTO':'💦','PBII OBRA':'🧼','PBII EVENTO':'🧼',
    'GUARITA INDIVIDUAL OBRA':'⬜','GUARITA INDIVIDUAL EVENTO':'⬜',
    'GUARITA DUPLA OBRA':'⚪','GUARITA DUPLA EVENTO':'⚪',
    'LIMPA FOSSA':'💧','VISITA TECNICA':'⚙️','CARRINHO':'🛞',
};

const PIPELINE_DIAS_SEMANA = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

function pipelineGetCorCard(tipoServico) {
    const t = (tipoServico || '').toLowerCase();
    if (t.includes('obra'))   return '#e3f0ff'; // azul claro
    if (t.includes('evento')) return '#f5edff'; // roxo claro
    return '#ffffff';
}

function pipelineRenderVar(v) {
    const vUp = v.trim().toUpperCase();
    for (const [key, style] of Object.entries(PIPELINE_VARS_CORES)) {
        if (vUp.includes(key)) {
            return `<span style="background:${style.bg};color:${style.text};border-radius:6px;padding:2px 9px;font-size:0.68rem;font-weight:700;display:inline-flex;align-items:center;gap:3px;">${style.icon} ${v.trim()}</span>`;
        }
    }
    return `<span style="background:#f1f5f9;color:#334155;border-radius:6px;padding:2px 9px;font-size:0.68rem;">❔ ${v.trim()}</span>`;
}

function pipelineRenderProd(p) {
    const desc = (p.desc || '').trim().toUpperCase();
    const qtd  = p.qtd || 1;
    const ic   = PIPELINE_EQ_ICONS[desc] ? PIPELINE_EQ_ICONS[desc] + ' ' : '';
    
    let bg = '#f1f5f9';
    let color = '#334155';
    if (desc.includes('OBRA')) { bg = '#dbeafe'; color = '#1d4ed8'; }
    else if (desc.includes('EVENTO')) { bg = '#f3e8ff'; color = '#7e22ce'; }
    
    return `<span style="background:${bg};color:${color};border-radius:6px;padding:2px 9px;font-size:0.68rem;font-weight:600;">${ic}${desc} (${qtd})</span>`;
}

function pipelineGetIconServico(tipoServico) {
    const t = (tipoServico || '').toLowerCase();
    if (t.includes('retirada') && t.includes('total')) return '⭕';
    if (t.includes('retirada') && t.includes('parcial')) return '🔶';
    if (t.includes('retirada'))            return '⭕';
    if (t.includes('visita tecnica') || t.includes('visita técnica')) return '⚙️';
    if (t.includes('reparo'))              return '🔧';
    if (t.includes('limpa fossa'))         return '💦';
    if (t.includes('manutencao avulsa') || t.includes('manutenção avulsa')) return '❗';
    if (t.includes('manutencao') || t.includes('manutenção')) return '';
    if (t.includes('vac'))                 return '🏗️';
    if (t.includes('succao') || t.includes('sucção')) return '💧';
    if (t.includes('compras'))             return '💳';
    if (t.includes('entrega'))             return '🚛';
    return '';
}

// Recorrentes: Manutenção e VAC (dias da semana aparecem no card)
function pipelineIsRecorrente(tipoServico) {
    const t = (tipoServico || '').toLowerCase();
    return (t.includes('manutencao') || t.includes('manutenção') || t.includes('vac')) && !t.includes('avulsa');
}

function pipelineGetDiaColor(d) {
    const _d = (d||'').substring(0,3).toLowerCase();
    if (_d === 'seg') return '#ef4444';
    if (_d === 'ter') return '#f97316';
    if (_d === 'qua') return '#ca8a04';
    if (_d === 'qui') return '#16a34a';
    if (_d === 'sex') return '#3b82f6';
    if (_d === 'sáb' || _d === 'sab') return '#8b5cf6';
    if (_d === 'dom') return '#ec4899';
    return '#64748b';
}

// Fix de mojibake: corrige UTF-8 bytes interpretados como Latin-1 (ex: "Ã³" → "ó")
function _fixMojibake(s) {
    if (!s || typeof s !== 'string') return s || '';
    try { return decodeURIComponent(escape(s)); } catch(e) { return s; }
}

function pipelineRenderCard(os) {
    // Corrigir encoding dos campos de texto exibidos no card
    const _cliente   = _fixMojibake(os.cliente   || '');
    const _endereco  = _fixMojibake(os.endereco  || '');
    const _complemento = _fixMojibake(os.complemento || '');
    const _tipoServ  = _fixMojibake(os.tipo_servico || '');
    const _obs       = _fixMojibake(os.observacoes_internas || '');
    const dias  = Array.isArray(os.dias_semana) ? os.dias_semana : [];
    const vars  = Array.isArray(os.variaveis)   ? os.variaveis.filter(v => v.trim()) : [];
    const prods = Array.isArray(os.produtos)    ? os.produtos : [];
    const isRec = pipelineIsRecorrente(os.tipo_servico);

    const _t = (os.tipo_servico || '').toLowerCase();

    // Inferência do tipo de contrato (Obra vs Evento)
    let tipoContrato = (os.tipo_os || '').toLowerCase();
    // Sanitizar: ignorar valor literal 'manutenção' ou 'manutencao'
    if (tipoContrato.includes('manut') || tipoContrato === 'entrega' || tipoContrato === 'retirada') tipoContrato = '';
    if (!tipoContrato) {
        // 1) pelo nome do tipo_servico
        if (_t.includes('obra'))   tipoContrato = 'obra';
        else if (_t.includes('evento')) tipoContrato = 'evento';
    }
    if (!tipoContrato) {
        // 2) pelos produtos (ex: 'STD OBRA', 'STD EVENTO')
        const prodDesc = prods.map(p => (p.desc || p.produto || '').toUpperCase()).join(' ');
        if (prodDesc.includes('OBRA'))   tipoContrato = 'obra';
        else if (prodDesc.includes('EVENTO')) tipoContrato = 'evento';
    }
    if (!tipoContrato) {
        // 3) pelas variáveis (ex: 'STD OBRA')
        const varText = vars.join(' ').toUpperCase();
        if (varText.includes('OBRA'))   tipoContrato = 'obra';
        else if (varText.includes('EVENTO')) tipoContrato = 'evento';
    }

    const bgCard     = tipoContrato === 'obra' ? '#dbeafe' : tipoContrato === 'evento' ? '#ede9fe' : '#f8fafc';
    const borderCard = tipoContrato === 'obra' ? '#93c5fd' : tipoContrato === 'evento' ? '#c4b5fd' : '#e2e8f0';

    let endFull = [_endereco, _complemento, os.cep ? `CEP: ${os.cep}` : ''].filter(Boolean).join(', ');


    // Dias da semana: apenas para serviços RECORRENTES
    const diasHtml = (isRec && dias.length) ? `
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px;">
        ${dias.map(d => {
            const cor = pipelineGetDiaColor(d);
            return `<span style="background:${cor};color:white;border-radius:6px;padding:2px 8px;font-size:0.68rem;font-weight:700;">${d}</span>`;
        }).join('')}
        </div>` : '';

    // Produtos (sem habilidades/variáveis — já aparecem como ícones no nome do cliente)
    const prodsHtml = prods.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;">
        ${prods.map(p => pipelineRenderProd(p)).join('')}
        </div>` : '';

    const _obsMotorista = _fixMojibake(os.observacoes || '');
    const _obsInterna   = _fixMojibake(os.observacoes_internas || '');

    const obsMotoristaHtml = _obsMotorista.trim()
        ? `<div onclick="window.pipelineEditarObsMotorista(event, ${os.id})" style="cursor:pointer;margin-top:5px;background:#e0f2fe;border-radius:5px;padding:3px 8px;font-size:0.68rem;color:#0369a1;border:1px solid #bae6fd;transition:all 0.15s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'" title="Editar Obs do Motorista">📝 ${_obsMotorista}</div>` 
        : `<div onclick="window.pipelineEditarObsMotorista(event, ${os.id})" style="cursor:pointer;margin-top:5px;font-size:0.68rem;color:#94a3b8;border:1px dashed #cbd5e1;padding:2px 6px;border-radius:4px;display:inline-block;transition:all 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" title="Adicionar Obs do Motorista">+ 📝 Add Obs Motorista</div>`;

    const obsInternaHtml = _obsInterna.trim()
        ? `<div style="margin-top:5px;background:#fef9c3;border-radius:5px;padding:3px 8px;font-size:0.68rem;color:#854d0e;border:1px solid #fde047;">🔒 ${_obsInterna}</div>` : '';

    const obsHtml = obsMotoristaHtml + obsInternaHtml;

    // 📦 compra interna ao lado do nome do cliente
    const isCompra = vars.some(v => v.trim().toUpperCase().includes('COMPRA'));
    const clienteLabel = `${isCompra ? '📦 ' : ''}${_cliente || '—'}`;

    return `
    <div class="pipe-card" data-os-id="${os.id}"
         style="background:${bgCard};border-left:3px solid ${borderCard};position:relative;"
         onclick="pipelineAbrirOS(${os.id},'${(os.numero_os||'').replace(/'/g,"\\'")}')"
         >
        <!-- Checkbox de seleção -->
        <span class="pipe-sel-cb"
              onclick="pipelineToggleSelecionar(event, ${os.id})"
              title="Selecionar para exportar"
              style="position:absolute;top:6px;right:6px;width:16px;height:16px;border-radius:4px;border:1.5px solid #cbd5e1;background:white;display:flex;align-items:center;justify-content:center;font-size:0.65rem;cursor:pointer;color:transparent;transition:all 0.15s;z-index:10;"
        ></span>
        <!-- OS número e Turno -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:800;font-size:0.82rem;color:#1e3a5f;display:flex;align-items:center;gap:4px;">
                <span onclick="pipelineEditarTipoContrato(event, ${os.id}, '${(_t||'').replace(/'/g,"\\'")}')" style="cursor:pointer;width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${tipoContrato === 'obra' ? '#3b82f6' : tipoContrato === 'evento' ? '#8b5cf6' : '#cbd5e1'};" title="Clique para alterar Obra/Evento"></span>
                OS: ${os.numero_os||'—'}
            </span>
            ${(os.turno || '').toLowerCase() === 'noturno' ? '<span style="background:#1e293b;padding:3px 5px;border-radius:4px;font-size:0.85rem;display:flex;align-items:center;justify-content:center;" title="Turno Noturno">🌒</span>' : ''}
        </div>
        <!-- Cliente (com 📦 se compra interna) -->
        <div style="font-size:0.73rem;font-weight:700;color:#1e293b;margin-bottom:2px;">${clienteLabel}</div>
        <!-- Endereço completo -->
        <div style="font-size:0.68rem;color:#475569;line-height:1.4;margin-bottom:2px;">${endFull || '—'}</div>
        ${(!_t.includes('entrega') && !_t.includes('retirada') && !(_t.includes('manutencao obra') || _t.includes('manutenção obra') || (_t.includes('vac') && _t.includes('obra')))) ? `
        <div style="font-size:0.68rem;color:#64748b;margin-bottom:2px;margin-top:3px;">
            <b>${(os.tipo_servico||'').toUpperCase()}</b>
        </div>` : ''}
        <!-- Data -->
        ${(()=>{ let d = os.data_os||""; if(d && d.includes("-")){ const p = d.split("-"); if(p.length===3 && p[0].length===4) d = `${p[2]}/${p[1]}/${p[0]}`; } return d ? `<div style="font-size:0.68rem;color:#94a3b8;">Data: ${d}</div>` : ""; })()}
        ${diasHtml}${prodsHtml}${obsHtml}
    </div>`;
}

function pipelineRenderKanban(dados) {
    const container = document.getElementById('pipeline-kanban');
    if (!container) return;

    const diaSelecionado = document.getElementById('pipe-filtro-dia')?.value;
    const colunasExibidas = diaSelecionado 
        ? PIPELINE_COLS.filter(c => c.key === 'manutencao') 
        : PIPELINE_COLS;

    const totalOS   = colunasExibidas.reduce((a,c)=> a+(dados[c.key]||[]).length, 0);
    const totalProd  = colunasExibidas.reduce((a,c)=> a+(dados[c.key]||[]).reduce((s,o)=>(Array.isArray(o.produtos)?o.produtos.reduce((x,p)=>x+(+p.qtd||1),0):0)+s,0), 0);
    const badge = document.getElementById('pipeline-total-badge');
    if (badge) badge.innerHTML = `<i class="ph ph-list-checks" style="font-size:0.82rem;vertical-align:middle;"></i> ${totalOS} &nbsp;<i class="ph ph-toilet" style="font-size:0.82rem;vertical-align:middle;"></i> ${totalProd}`;

    container.innerHTML = `
    <div style="display:flex;gap:14px;min-height:calc(100vh - 170px);padding:0.5rem 1.5rem 2rem 1.5rem;box-sizing:border-box;align-items:flex-start;flex-wrap:nowrap;">
    ${colunasExibidas.map(col => {
        const lista = dados[col.key] || [];
        return `
        <div style="flex:1;min-width:260px;display:flex;flex-direction:column;border-radius:12px;background:${col.cor};box-shadow:0 2px 10px rgba(0,0,0,0.07);min-height:calc(100vh - 120px);padding-bottom:8px;">
            <!-- Header coluna sticky — z-index alto para sempre ficar acima dos cards -->
        <div style="background:${col.cor};padding:10px 14px;display:flex;align-items:center;gap:8px;position:sticky;top:var(--pipe-header-height,125px);z-index:500;border-radius:12px 12px 0 0;box-shadow:0 2px 6px rgba(0,0,0,0.10);">
                <span style="font-size:1.1rem;color:${col.textCor};">${col.icon}</span>
                <span style="color:${col.textCor};font-weight:800;font-size:0.9rem;flex:1;">${col.label}</span>
                <span style="background:rgba(0,0,0,0.08);color:${col.textCor};border-radius:20px;padding:1px 10px;font-size:0.8rem;font-weight:700;" title="OS"><i class="ph ph-list-checks" style="font-size:0.8rem;vertical-align:middle;"></i> ${lista.length}</span>
                <span style="background:rgba(0,0,0,0.08);color:${col.textCor};border-radius:20px;padding:1px 10px;font-size:0.8rem;font-weight:700;" title="Total de produtos"><i class="ph ph-toilet" style="font-size:0.8rem;vertical-align:middle;"></i> ${lista.reduce((s,o)=>(Array.isArray(o.produtos)?o.produtos.reduce((a,p)=>a+(+p.qtd||1),0):0)+s,0)}</span>
            </div>
            <!-- Cards — scroll da página, sem overflow interno -->
            <div style="flex:1;padding:8px;">
                ${lista.length === 0
                    ? `<div style="text-align:center;padding:2rem;color:#94a3b8;font-size:0.78rem;"><i class="ph ph-clipboard-text" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhuma OS</div>`
                    : lista.map(os => pipelineRenderCard(os)).join('')}
            </div>
        </div>`;
    }).join('')}
    </div>`;

    // Hover effect sem transform (transform cria stacking context que sobrepõe sticky header)
    document.querySelectorAll('.pipe-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.16)';
            card.style.outline   = '2px solid rgba(45,158,95,0.35)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            card.style.outline   = 'none';
        });
    });
}

let _pipelineDados = {};

async function buscarPipeline() {
    const dataDe   = document.getElementById('pipe-filtro-data-de')?.value  || '';
    const dataAte  = document.getElementById('pipe-filtro-data-ate')?.value || '';
    const os       = document.getElementById('pipe-filtro-os')?.value       || '';
    const contrato = document.getElementById('pipe-filtro-contrato')?.value || '';
    const cliente  = document.getElementById('pipe-filtro-cliente')?.value  || '';
    const endereco = document.getElementById('pipe-filtro-endereco')?.value || '';

    const container = document.getElementById('pipeline-kanban');
    if (container) container.innerHTML = `<div style="text-align:center;padding:4rem;color:#64748b;width:100%;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><p style="margin-top:1rem;">Carregando Pipeline...</p></div>`;

    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const params = new URLSearchParams();
    if (dataDe)   params.set('data_de',  dataDe);
    if (dataAte)  params.set('data_ate', dataAte);
    if (os)       params.set('os',       os);
    if (contrato) params.set('contrato', contrato);
    if (cliente)  params.set('cliente',  cliente);
    if (endereco) params.set('endereco', endereco);

    const diaFiltro = document.getElementById('pipe-filtro-dia')?.value || '';
    if (diaFiltro) params.set('dia', diaFiltro);

    try {
        const resp = await fetch(`/api/logistica/pipeline?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(await resp.text());
        _pipelineDados = await resp.json();

        // Filtro por Obra / Evento (client-side)
        const tipoOs = document.getElementById('pipe-filtro-tipo-os')?.value || '';
        if (tipoOs) {
            ['manutencao','entrega','retirada','avulso'].forEach(key => {
                _pipelineDados[key] = (_pipelineDados[key] || []).filter(item => {
                    return (item.tipo_servico || '').toLowerCase().includes(tipoOs);
                });
            });
        }

        // Filtro por dia da semana (client-side adicional)
        const dia = document.getElementById('pipe-filtro-dia')?.value || '';
        if (dia) {
            const diaPrefix = dia.toLowerCase().substring(0, 3);
            ['manutencao','entrega','retirada','avulso'].forEach(key => {
                _pipelineDados[key] = (_pipelineDados[key] || []).filter(item => {
                    const d = Array.isArray(item.dias_semana) ? item.dias_semana : [];
                    return d.some(x => x.toLowerCase().startsWith(diaPrefix));
                });
            });
        }

        // Filtro por Serviço de Texto Livre
        const srvText = document.getElementById('pipe-filtro-servico')?.value || '';
        if (srvText) {
            ['manutencao','entrega','retirada','avulso'].forEach(key => {
                _pipelineDados[key] = (_pipelineDados[key] || []).filter(item => {
                    return (item.tipo_servico || '').toLowerCase().includes(srvText.toLowerCase());
                });
            });
        }

        // Filtro por turno (Diurno / Noturno)
        const turnoFiltro = document.getElementById('pipe-filtro-turno')?.value || '';
        if (turnoFiltro) {
            ['manutencao','entrega','retirada','avulso'].forEach(key => {
                _pipelineDados[key] = (_pipelineDados[key] || []).filter(item =>
                    (item.turno || '').toLowerCase() === turnoFiltro.toLowerCase()
                );
            });
        }

        pipelineRenderKanban(_pipelineDados);
    } catch(e) {
        const msg = (e.message || '').toLowerCase();
        const isAuth = msg.includes('token') || msg.includes('401') || msg.includes('403') || msg.includes('unauthorized');
        const errHtml = isAuth
            ? `<div style="text-align:center;padding:3rem;width:100%;">
                <i class="ph ph-lock" style="font-size:2.5rem;color:#f59e0b;display:block;margin-bottom:0.75rem;"></i>
                <p style="color:#92400e;font-weight:700;font-size:1rem;">Sessão expirada</p>
                <p style="color:#78716c;font-size:0.85rem;margin-top:4px;">Faça logout e login novamente para continuar.</p>
               </div>`
            : `<div style="text-align:center;padding:3rem;color:#ef4444;width:100%;">${e.message}</div>`;
        if (container) container.innerHTML = errHtml;
    }
}

function pipelineLimparFiltros() {
    ['pipe-filtro-data-de','pipe-filtro-data-ate','pipe-filtro-os','pipe-filtro-contrato','pipe-filtro-cliente','pipe-filtro-endereco','pipe-filtro-servico'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    // Reseta hidden inputs
    ['pipe-filtro-dia','pipe-filtro-tipo-os','pipe-filtro-turno'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    // Reseta visual dos botões de Dia
    const _DIA_C = {'':'#64748b','Segunda':'#ef4444','Terça':'#f97316','Quarta':'#ca8a04','Quinta':'#16a34a','Sexta':'#3b82f6','Sábado':'#8b5cf6','Domingo':'#ec4899'};
    document.querySelectorAll('[id^="pipe-dia-"]').forEach(b => {
        const cor = _DIA_C[b.id.replace('pipe-dia-','').replace('todos','')] || '#64748b';
        b.style.background = 'white'; b.style.color = cor;
    });
    // Reseta visual dos botões de Tipo e Turno
    document.querySelectorAll('[id^="pipe-tipo-"],[id^="pipe-turno-"]').forEach(b => {
        b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#cbd5e1';
    });
    // Atualiza _pipelineFiltros
    Object.keys(_pipelineFiltros).forEach(k => { _pipelineFiltros[k] = ''; });
    // Limpa seleção de cards e restaura botão SimpliRoute
    pipelineLimparSelecao();
    buscarPipeline();
}

async function pipelineAbrirOS(osId, numeroOs) {
    // Busca o registro exato pelo ID antes de navegar
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    let osData = null;
    try {
        const resp = await fetch(`/api/logistica/os/${osId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) osData = await resp.json();
    } catch(e) { console.warn('[Pipeline] Erro ao buscar OS por ID:', e); }

    if (typeof navigateTo === 'function') navigateTo('logistica-rota-redonda');

    // Aguarda a página renderizar e carrega o registro exato
    let tentativas = 0;
    const intervalo = setInterval(() => {
        tentativas++;
        const containerReady = document.getElementById('rr-input-os') || document.getElementById('rota-redonda-content');
        if (containerReady) {
            clearInterval(intervalo);
            if (osData && typeof carregarRegistroNaTela === 'function') {
                // Carrega diretamente o registro exato (sem modal de lista)
                carregarRegistroNaTela(osData);
                if (typeof mostrarToastAviso === 'function') mostrarToastAviso(`✅ OS ${numeroOs} carregada.`);
            } else if (typeof carregarOsPorNumero === 'function') {
                // Fallback: busca por número
                carregarOsPorNumero(numeroOs);
            }
        } else if (tentativas >= 15) {
            clearInterval(intervalo);
            console.warn('[Pipeline] Timeout ao aguardar Rota Redonda para OS:', numeroOs);
        }
    }, 200);
}

// Monta o Título (coluna A do SimpliRoute) com ícones na ordem:
// 1-Lua(noturno) 2-Produtos(entrega/retirada) 3-Serviço 4-Variáveis 5-Habilidades + Nome do cliente
function pipelineBuildTitulo(r) {
    const vars  = Array.isArray(r.variaveis)   ? r.variaveis.map(v => v.trim().toUpperCase()) : [];
    const habs  = Array.isArray(r.habilidades) ? r.habilidades.map(h => h.trim().toUpperCase()) : [];
    const prods = Array.isArray(r.produtos)    ? r.produtos : [];
    const ts    = (r.tipo_servico || '').toLowerCase();
    // Entrega e Retirada usam ícones de produto — seus ícones de serviço (🚛 ↩️) não existem no sistema
    const isEntregaOuRetirada = ts.includes('entrega') || ts.includes('retirada');
    const icones = [];

    // 1. Lua — ler do objeto PIPELINE_VARS_CORES, não hardcodar
    const noturnoStyle = Object.entries(PIPELINE_VARS_CORES).find(([k]) => k === 'NOTURNO');
    if (noturnoStyle && vars.some(v => v.includes('NOTURNO'))) {
        icones.push(noturnoStyle[1].icon);
    }

    // 2. Ícones de produtos (entrega e retirada usam PIPELINE_EQ_ICONS)
    //    Normaliza variante EVENTO → OBRA para que STD OBRA e STD EVENTO usem o mesmo ícone
    //    e o Set elimine duplicatas corretamente
    if (isEntregaOuRetirada && prods.length) {
        const iconesProdSet = new Set();
        prods.forEach(p => {
            const desc = (p.desc || '').trim().toUpperCase();
            // Tenta o desc original primeiro; se não existir, tenta a variante OBRA
            const descNorm = desc.replace(/ EVENTO$/, ' OBRA');
            const ic = PIPELINE_EQ_ICONS[desc] || PIPELINE_EQ_ICONS[descNorm];
            if (ic) iconesProdSet.add(ic);
        });
        iconesProdSet.forEach(ic => icones.push(ic));
    }

    // 3. Ícone específico para Reparo de Equipamento (único serviço com ícone próprio confirmado)
    if (ts.includes('reparo')) icones.push('🔧');

    // 4. Ícones das variáveis (exceto NOTURNO, já adicionado)
    vars.forEach(v => {
        if (v.includes('NOTURNO')) return;
        for (const [key, style] of Object.entries(PIPELINE_VARS_CORES)) {
            if (v.includes(key)) { icones.push(style.icon); break; }
        }
    });

    // 5. Ícones das habilidades (via PIPELINE_VARS_CORES onde existir)
    //    VAC: ícone 🏗️ só aparece quando o próprio tipo de serviço é VAC
    const isVac = ts.includes('vac');
    habs.forEach(h => {
        for (const [key, style] of Object.entries(PIPELINE_VARS_CORES)) {
            if (h.includes(key)) {
                if (key === 'VAC' && !isVac) break; // 🏗️ só para serviço VAC
                icones.push(style.icon);
                break;
            }
        }
    });

    // Deduplicação global: remove ícones repetidos de qualquer etapa, preservando ordem
    const iconesUnicos = [...new Set(icones)];
    const prefixo = iconesUnicos.length ? iconesUnicos.join(' ') + ' ' : '';
    return (prefixo + (r.cliente || '')).trim();
}

async function pipelineExportarExcel(registrosOverride) {
    // Se passado uma lista, usa ela; caso contrário usa todos os dados do pipeline
    let registros;
    if (Array.isArray(registrosOverride)) {
        registros = registrosOverride;
    } else {

        if (!_pipelineDados || Object.keys(_pipelineDados).length === 0) {
            alert('Busque antes de exportar.');
            return;
        }
        const ORDER = ['manutencao', 'entrega', 'retirada', 'avulso'];
        registros = [];
        ORDER.forEach(key => {
            const cat = (_pipelineDados[key] || []).slice().sort((a, b) => {
                const aN = (a.turno || '').toLowerCase() === 'noturno' ? 0 : 1;
                const bN = (b.turno || '').toLowerCase() === 'noturno' ? 0 : 1;
                return aN - bN;
            });
            cat.forEach(r => registros.push(r));
        });
    }
    if (registros.length === 0) { alert('Nenhum registro para exportar.'); return; }

    // Abreviação dos dias da semana para coluna G
    const ABREV_DIA = {
        'segunda':'seg','terça':'ter','terca':'ter',
        'quarta':'qua','quinta':'qui','sexta':'sex',
        'sábado':'sab','sabado':'sab','domingo':'dom'
    };
    function abreviarDias(dias) {
        if (!Array.isArray(dias) || !dias.length) return '';
        return dias.map(d => (ABREV_DIA[d.toLowerCase()] || d.toLowerCase().substring(0,3)).toUpperCase()).join(', ');
    }

    // ── Títulos EXATOS das colunas (A–Z) ────────────────────────────────
    const HEADERS = [
        'Obs Internas',                 // A — Observações internas
        'Titulo',                       // B
        'Endereço completo',            // C
        'Carga',                        // D
        'Janela de horário inicial',    // E
        'Janela de horário final',      // F
        'Tempo de serviço',             // G
        'Anotações2',                   // H
        'Latitude',                     // I
        'Longitude',                    // J
        'Identificação de referência',  // K
        'Habilidade necessária',        // L
        'Habilidade opcional',          // M — não preencher
        'Telefone de contato',          // N — não preencher
        'Pessoa de contato',            // O — não preencher
        'Janela de horário inicial 2',  // P — não preencher
        'Janela de horário final 2',    // Q — não preencher
        'Capacidade 2',                 // R — Carroceria
        'Capacidade 3',                 // S — Carretinha
        'Prioridade',                   // T — não preencher
        'SMS',                          // U — não preencher
        'Correio eletrônico de contato',// V — Email
        'Carga pick',                   // W — não preencher
        'Carga pick 2',                 // X — não preencher
        'Não preencher',                // Y — não preencher
        'Data Agendamento',             // Z — não preencher
        'Tipo de visita'                // AA — Tipo de serviço
    ];

    if (typeof ExcelJS === 'undefined') {
        alert('Biblioteca ExcelJS não carregada. Atualize a página e tente novamente.');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OS');

    // Adiciona o cabeçalho
    const headerRow = worksheet.addRow(HEADERS);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } };

    registros.forEach(r => {
        const ts = (r.tipo_servico || '').toLowerCase();
        // Mostrar dias da semana apenas para manutenção recorrente (obra/evento)
        const isManutObraEvento  = (ts.includes('manut') && !ts.includes('avulsa')) && (ts.includes('obra') || ts.includes('evento'));
        const mostrarDias = isManutObraEvento;

        // Inferir tipo de contrato (obra/evento) para colorir linhas de manutenção avulsa
        let tipoContratoXls = (r.tipo_os || '').toLowerCase();
        if (tipoContratoXls.includes('manut') || tipoContratoXls === 'entrega' || tipoContratoXls === 'retirada') tipoContratoXls = '';
        if (!tipoContratoXls) {
            if (ts.includes('obra'))   tipoContratoXls = 'obra';
            else if (ts.includes('evento')) tipoContratoXls = 'evento';
        }
        if (!tipoContratoXls) {
            const prodDescXls = (r.produtos || []).map(p => (p.desc || p.produto || '').toUpperCase()).join(' ');
            if (prodDescXls.includes('OBRA'))   tipoContratoXls = 'obra';
            else if (prodDescXls.includes('EVENTO')) tipoContratoXls = 'evento';
        }

        // Parse defensivo: campos podem chegar como string JSON da API
        function parseArr(v) {
            if (Array.isArray(v)) return v;
            try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch(e) { return []; }
        }
        const habilidadesArr = parseArr(r.habilidades);
        const variaveisArr   = parseArr(r.variaveis);
        const produtosArr    = parseArr(r.produtos);
        const diasArr        = parseArr(r.dias_semana);

        // Ícones das habilidades (PIPELINE_EQ_ICONS)
        const icHab = habilidadesArr
            .map(h => PIPELINE_EQ_ICONS[(h || '').trim().toUpperCase()] || '')
            .filter(Boolean).join('');

        // Ícones das variáveis que têm ícone cadastrado (PIPELINE_VARS_CORES)
        const icVar = variaveisArr.map(v => {
            const vUp = (v || '').trim().toUpperCase();
            for (const [key, style] of Object.entries(PIPELINE_VARS_CORES)) {
                if (vUp.includes(key)) return style.icon;
            }
            return '';
        }).filter(Boolean).join('');

        const iconesTitulo = [icHab, icVar].filter(Boolean).join('');
        const titulo = (iconesTitulo ? iconesTitulo + ' ' : '') + (r.cliente || '').trim();

        // --- INÍCIO: Cálculo Dinâmico de Cargas e Tempo de Serviço ---
        let totalCargaVeiculo = 0;
        let totalCargaTanque = 0;

        for (const p of produtosArr) {
            const equipamento = (p.desc || p.produto || '').trim().toUpperCase();
            const quantidade = parseInt(p.qtd) || 0;
            if (!equipamento) continue;

            let cargaVeic = 0;
            let cargaTanq = 0;

            if (equipamento.includes('LIMPA FOSSA')) {
                cargaTanq = 33 * quantidade;
            } else if (!isManutObraEvento && !ts.includes('manut') && !ts.includes('manutenção')) {
                if (equipamento.includes('OBRA')) {
                    if (['STD OBRA', 'LX OBRA', 'EXL OBRA', 'GUARITA INDIVIDUAL OBRA', 'PBII OBRA', 'PBIII OBRA', 'CHUVEIRO OBRA', 'HIDRÁULICO OBRA'].includes(equipamento)) {
                        cargaVeic = quantidade;
                    } else if (['GUARITA DUPLA OBRA', 'PCD OBRA'].includes(equipamento)) {
                        cargaVeic = 2 * quantidade;
                    } else if (equipamento === 'MICTÓRIO OBRA') {
                        let calc = Math.ceil(quantidade * 0.3333);
                        cargaVeic = (calc % 2 !== 0) ? calc + 1 : calc;
                    }
                } else if (equipamento.includes('EVENTO')) {
                    if (['STD EVENTO', 'LX EVENTO', 'EXL EVENTO', 'GUARITA INDIVIDUAL EVENTO', 'PIA II EVENTO', 'PIA III EVENTO', 'CHUVEIRO EVENTO', 'HIDRÁULICO EVENTO'].includes(equipamento)) {
                        cargaVeic = quantidade;
                    } else if (['GUARITA DUPLA EVENTO', 'PCD EVENTO'].includes(equipamento)) {
                        cargaVeic = 2 * quantidade;
                    } else if (equipamento === 'MICTÓRIO EVENTO') {
                        let calc = Math.ceil(quantidade * 0.3333);
                        cargaVeic = (calc % 2 !== 0) ? calc + 1 : calc;
                    } else {
                        cargaVeic = quantidade;
                    }
                }
            }

            if (ts.includes('manut') || ts.includes('manutenção') || ts.includes('retirada') || ts.includes('troca')) {
                if (equipamento.includes('EVENTO')) {
                    if (['STD EVENTO', 'LX EVENTO', 'EXL EVENTO', 'PCD EVENTO', 'CHUVEIRO EVENTO', 'HIDRÁULICO EVENTO'].includes(equipamento)) {
                        cargaTanq = 5 * quantidade;
                    } else if (equipamento === 'MICTÓRIO EVENTO') {
                        cargaTanq = 10 * quantidade;
                    } else if (['PIA II EVENTO', 'PIA III EVENTO'].includes(equipamento)) {
                        cargaTanq = 1 * quantidade;
                    } else {
                        cargaTanq = quantidade;
                    }
                } else if (equipamento.includes('OBRA') || equipamento.includes('AVULSA')) {
                    if (['STD OBRA', 'LX OBRA', 'EXL OBRA', 'PBII OBRA', 'PBIII OBRA', 'CHUVEIRO OBRA', 'HIDRÁULICO OBRA'].includes(equipamento)) {
                        cargaTanq = 1 * quantidade;
                    } else if (equipamento === 'MICTÓRIO OBRA') {
                        cargaTanq = 4 * quantidade;
                    } else {
                        cargaTanq = quantidade;
                    }
                } else {
                    cargaTanq = quantidade;
                }
            }

            totalCargaVeiculo += cargaVeic;
            totalCargaTanque += cargaTanq;
        }

        let valTanque = '', valCarroceria = '', valCarretinha = '';
        if (ts.includes('manut') || ts.includes('manutenção')) {
            valTanque = totalCargaTanque > 0 ? String(totalCargaTanque) : '';
            valCarroceria = '';
            valCarretinha = '';
        } else {
            if (totalCargaVeiculo <= 12) {
                valCarroceria = totalCargaVeiculo > 0 ? String(totalCargaVeiculo) : '';
                valCarretinha = '';
            } else {
                valCarroceria = '';
                valCarretinha = String(totalCargaVeiculo);
            }
            if (ts.includes('retirada') || ts.includes('troca')) {
                valTanque = totalCargaTanque > 0 ? String(totalCargaTanque) : '';
            } else {
                valTanque = '';
            }
        }

        let baseMin = (ts.includes('manutencao') || ts.includes('manutenção')) ? 0 : 10;
        const totalItens = produtosArr.reduce((acc, p) => acc + (parseInt(p.qtd) || 0), 0);
        const totalMin = baseMin + (5 * totalItens);
        const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const mm = String(totalMin % 60).padStart(2, '0');
        const valTempoServico = `${hh}:${mm}`;
        // --- FIM: Cálculo Dinâmico de Cargas e Tempo de Serviço ---

        // B: Endereço completo
        const endereco = [r.endereco, r.complemento, r.cep ? `CEP: ${r.cep}` : ''].filter(Boolean).join(', ');

        // ── Coluna H: Anotações2 ──────────────────────────────────────────
        // Linha 1: 📸 Vídeo: [link] — apenas se a OS tiver link_video
        const linkVideoRaw = r.link_video || '';
        let videoLinks = [];
        if (linkVideoRaw) {
            try {
                const parsed = JSON.parse(linkVideoRaw);
                videoLinks = Array.isArray(parsed) ? parsed : [linkVideoRaw];
            } catch(e) {
                videoLinks = linkVideoRaw.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        const videoLinhas = videoLinks.map(link => {
            const full = link.startsWith('http') ? link : window.location.origin + link;
            return `📸 Vídeo: ${full}`;
        });

        // Helper para remover o prefixo do nome do cliente da observação
        function stripClientPrefix(text, clientName) {
            let t = (text || '').trim().toUpperCase();
            const c = (clientName || '').trim().toUpperCase();
            if (!t || !c) return t;
            if (t.startsWith(c)) return t.substring(c.length).replace(/^[\s:-]+/, '').trim();
            const firstWord = c.split(' ')[0];
            if (firstWord && firstWord.length > 2 && t.startsWith(firstWord)) {
                const match = t.match(/^[^:\-]*[:\-]/);
                if (match && match[0].length <= firstWord.length + 15) {
                    return t.substring(match[0].length).trim();
                }
            }
            return t;
        }

        // Linha 2: Ícones das variáveis + OBSERVAÇÕES (em maiúscula, sem nome do cliente)
        let obsStr = stripClientPrefix(r.observacoes, r.cliente);
        let obsIntStr = stripClientPrefix(r.observacoes_internas, r.cliente);
        
        let obsComIcone = '';
        let combinacaoObs = [obsStr].filter(Boolean).join(' | ');

        if (combinacaoObs || icVar) {
            // Adiciona todos os ícones de variáveis (icVar) na frente
            obsComIcone = (icVar ? icVar + ' ' : '') + combinacaoObs;
        }

        // Linha 3: NOME DO SERVIÇO — sem ícone para Entrega e Manutenção Recorrente
        const isEntrega = ts.includes('entrega');
        const isManutRecorr = (ts.includes('manut') || ts.includes('manutenção')) && !ts.includes('avulsa');
        let iconeServico = '';
        if (!isEntrega && !isManutRecorr) {
            iconeServico = pipelineGetIconServico(r.tipo_servico);
        }
        const nomeServico = ((iconeServico ? iconeServico + ' ' : '') + (r.tipo_servico || '').trim().toUpperCase());

        // Linha 4: PRODUTOS — "QTD NOME" (sem ícone do produto, a pedido do usuário)
        const prodStr = produtosArr.map(p => {
            const desc = (p.desc || '').trim().toUpperCase();
            return `${p.qtd} ${desc}`;
        }).join('\n');

        // Linha 5: Quantidade de manutenções - DIAS DA SEMANA
        const numDias = (mostrarDias && diasArr.length) ? diasArr.length : 0;
        const diasAbbr = mostrarDias ? abreviarDias(diasArr) : '';
        const diasComFreq = (mostrarDias && diasAbbr) ? `${numDias}X - ${diasAbbr}` : '';

        // Monta a célula H: cada parte em linha separada, linhas vazias omitidas
        const partesH = [
            ...videoLinhas,
            obsComIcone,
            nomeServico,
            prodStr,
            diasComFreq
        ].filter(Boolean);
        const anotacoes = partesH.join('\n');

        // H/I: Latitude e Longitude separadas
        let lat = r.latitude || r.lat || '';
        let lng = r.longitude || r.lng || '';
        if (!lat && r.lat_lng) {
            const pts = r.lat_lng.toString().split(',');
            lat = (pts[0] || '').trim();
            lng = (pts[1] || '').trim();
        }

        // K: Habilidades separadas por vírgula
        const habilidades = Array.isArray(r.habilidades) ? r.habilidades.join(', ') : (r.habilidades || '');

        const rowData = [
            (icVar ? icVar + ' ' : '') + obsIntStr, // A Obs Internas (com ícones tbm e sem nome do cliente)
            titulo,                  // B Titulo
            endereco,                // C Endereço completo
            valTanque,               // D Carga (Tanque)
            r.hora_inicio || '',     // E Janela de horário inicial
            r.hora_fim    || '',     // F Janela de horário final
            valTempoServico,         // G Tempo de serviço
            anotacoes,               // H Anotações2
            lat,                     // I Latitude
            lng,                     // J Longitude
            r.numero_os || '',       // K Identificação de referência
            habilidades,             // L Habilidade necessária
            '',                      // M Habilidade opcional — não preencher
            '',                      // N Telefone de contato — não preencher
            '',                      // O Pessoa de contato — não preencher
            '',                      // P Janela de horário inicial 2 — não preencher
            '',                      // Q Janela de horário final 2 — não preencher
            valCarroceria,           // R Capacidade 2 — Carroceria
            valCarretinha,           // S Capacidade 3 — Carretinha
            '',                      // T Prioridade — não preencher
            '',                      // U SMS — não preencher
            r.email || '',           // V Correio eletrônico de contato
            '',                      // W Carga pick — não preencher
            '',                      // X Carga pick 2 — não preencher
            '',                      // Y Não preencher
            '',                      // Z Data Agendamento — não preencher
            r.tipo_servico || ''     // AA Tipo de visita
        ];

        const row = worksheet.addRow(rowData);
        row.getCell(8).alignment = { wrapText: true }; // Quebra de linha nas anotações

        // Aplica cor da linha baseada no TIPO DE SERVIÇO
        let corHex = '';
        const isAvulso = ts.includes('avulso') || ts.includes('avulsa');
        const isManutRecorrente = ts.includes('manut') && !isAvulso;

        if (ts.includes('entrega'))        corHex = '#A6E3B7'; // verde
        else if (ts.includes('retirada')) corHex = '#FDE49B'; // amarelo
        else if (isManutRecorrente)        corHex = '#E2E8F0'; // cinza claro
        // avulsos e demais: sem cor (branco)

        if (corHex) {
            const argb = 'FF' + corHex.substring(1).toUpperCase();
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: argb }
                };
            });
        }
    });

    const dataDe  = document.getElementById('pipe-filtro-data-de')?.value || '';
    const dataAte = document.getElementById('pipe-filtro-data-ate')?.value || '';
    const nomePlanilha = [dataDe, dataAte].filter(Boolean).join('_a_') || 'Pipeline';

    // Ajusta largura das colunas
    worksheet.columns.forEach(col => { col.width = 25; });

    // Salva arquivo XLSX em vez de CSV
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    if (typeof saveAs !== 'undefined') {
        saveAs(blob, `SimpliRoute_${nomePlanilha}.xlsx`);
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SimpliRoute_${nomePlanilha}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

let _pipelineDebounceTimer;
function buscarPipelineDebounced() {
    clearTimeout(_pipelineDebounceTimer);
    _pipelineDebounceTimer = setTimeout(() => buscarPipeline(), 300);
}

// ── Helpers dos filtros em botão ────────────────────────────────────────
function _pipeActivarBtn(groupPrefix, val, activeStyle) {
    document.querySelectorAll(`[id^="${groupPrefix}"]`).forEach(b => {
        b.style.background = 'white';
        b.style.color = b.dataset.cor || b.style.borderColor || '#475569';
        b.style.borderWidth = '1.5px';
    });
    const active = document.getElementById(`${groupPrefix}${val||'todos'}`);
    if (active && activeStyle) {
        active.style.background = activeStyle.bg;
        active.style.color = activeStyle.text;
    }
}

const _DIA_CORES = {'':'#64748b','Segunda':'#ef4444','Terça':'#f97316','Quarta':'#ca8a04','Quinta':'#16a34a','Sexta':'#3b82f6','Sábado':'#8b5cf6','Domingo':'#ec4899'};
function _pipeFiltrarDia(val, somenteVisual = false) {
    const hidden = document.getElementById('pipe-filtro-dia');
    if (hidden) hidden.value = val;
    const cor = _DIA_CORES[val] || '#64748b';
    document.querySelectorAll('[id^="pipe-dia-"]').forEach(b => {
        const bcor = _DIA_CORES[b.id.replace('pipe-dia-','').replace('todos','')] || '#64748b';
        b.style.background = 'white'; b.style.color = bcor;
    });
    const ab = document.getElementById(`pipe-dia-${val||'todos'}`);
    if (ab) { ab.style.background = cor; ab.style.color = 'white'; }
    if (!somenteVisual) { _pipelineSalvarFiltros(); buscarPipeline(); }
}
function _pipeFiltrarTipo(val, somenteVisual = false) {
    const hidden = document.getElementById('pipe-filtro-tipo-os');
    if (hidden) hidden.value = val;
    const cores = {'':'#64748b','obra':'#3b82f6','evento':'#8b5cf6'};
    const cor = cores[val] || '#64748b';
    document.querySelectorAll('[id^="pipe-tipo-"]').forEach(b => { b.style.background='white'; b.style.color='#475569'; b.style.borderColor='#cbd5e1'; });
    const ab = document.getElementById(`pipe-tipo-${val||'todos'}`);
    if (ab) { ab.style.background = cor; ab.style.color = 'white'; ab.style.borderColor = cor; }
    if (!somenteVisual) { _pipelineSalvarFiltros(); buscarPipeline(); }
}
function _pipeFiltrarTurno(val, somenteVisual = false) {
    const hidden = document.getElementById('pipe-filtro-turno');
    if (hidden) hidden.value = val;
    const cores = {'':'#64748b','Diurno':'#f59e0b','Noturno':'#1e293b'};
    const cor = cores[val] || '#64748b';
    document.querySelectorAll('[id^="pipe-turno-"]').forEach(b => { b.style.background='white'; b.style.color='#475569'; b.style.borderColor='#cbd5e1'; });
    const ab = document.getElementById(`pipe-turno-${val||'todos'}`);
    if (ab) { ab.style.background = cor; ab.style.color = 'white'; ab.style.borderColor = cor; }
    if (!somenteVisual) { _pipelineSalvarFiltros(); buscarPipeline(); }
}

// ── Seleção de OS para exportação parcial ────────────────────────────────
// Map de ID → registro completo (evita inconsistência de encoding ao exportar)
const _pipelineSelecionados = new Map();

function pipelineToggleSelecionar(event, osId) {
    event.stopPropagation(); // não abre o modal da OS
    if (_pipelineSelecionados.has(osId)) {
        _pipelineSelecionados.delete(osId);
    } else {
        // Busca o registro na _pipelineDados para armazenar completo
        const todosReg = Object.values(_pipelineDados || {}).flat();
        const reg = todosReg.find(r => r.id == osId);
        _pipelineSelecionados.set(osId, reg || { id: osId });
    }
    // Atualiza visual do card
    const card = document.querySelector(`.pipe-card[data-os-id="${osId}"]`);
    if (card) {
        const cb = card.querySelector('.pipe-sel-cb');
        if (_pipelineSelecionados.has(osId)) {
            card.style.outline = '2.5px solid #f59e0b';
            card.style.outlineOffset = '-2px';
            if (cb) { cb.textContent = '✔'; cb.style.background = '#f59e0b'; cb.style.color = '#fff'; cb.style.borderColor = '#f59e0b'; }
        } else {
            card.style.outline = 'none';
            if (cb) { cb.textContent = ''; cb.style.background = 'white'; cb.style.color = 'transparent'; cb.style.borderColor = '#cbd5e1'; }
        }
    }
    // Atualiza badge e botão
    const n = _pipelineSelecionados.size;
    const btnTxt = document.getElementById('pipeline-btn-simpli-txt');
    const btn = document.getElementById('pipeline-btn-simpli');
    if (btnTxt) btnTxt.textContent = n > 0 ? `Exportar (${n})` : 'SimpliRoute';
    if (btn) btn.style.background = n > 0 ? '#f59e0b' : '#16a34a';
}

function pipelineLimparSelecao() {
    _pipelineSelecionados.clear();
    document.querySelectorAll('.pipe-card').forEach(card => {
        card.style.outline = 'none';
        const cb = card.querySelector('.pipe-sel-cb');
        if (cb) { cb.textContent = ''; cb.style.background = 'white'; cb.style.color = 'transparent'; cb.style.borderColor = '#cbd5e1'; }
    });
    const btnTxt = document.getElementById('pipeline-btn-simpli-txt');
    const btn = document.getElementById('pipeline-btn-simpli');
    if (btnTxt) btnTxt.textContent = 'SimpliRoute';
    if (btn) btn.style.background = '#16a34a';
}

// Exportação inteligente: selecionados se houver, todos caso contrário
async function pipelineExportarInteligente() {
    if (_pipelineSelecionados.size > 0) {
        // Usa os registros armazenados diretamente (encoding preservado)
        const filtrados = Array.from(_pipelineSelecionados.values());
        await pipelineExportarExcel(filtrados);
    } else {
        await pipelineExportarExcel();
    }
}

// Estado persistente dos filtros — sobrevive à troca de abas
const _pipelineFiltros = {
    os: '', contrato: '', dataDe: '', dataAte: '',
    dia: '', tipoOs: '', turno: '', endereco: '', cliente: '', servico: ''
};

window.pipelineLimparTodasOS = async function() {
    if (!confirm('ATENÇÃO: Você tem certeza que deseja APAGAR TODAS as OS registradas no sistema? Esta ação é irreversível!')) return;
    if (!confirm('Tem absoluta certeza? Todas as Ordens de Serviço serão excluídas permanentemente!')) return;

    const tok = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    try {
        const res = await fetch('/api/logistica/pipeline/limpar', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + tok }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao apagar OS');
        
        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(data.message);
        else alert(data.message);
        
        pipelineLimparSelecao();
        buscarPipeline();
    } catch (e) {
        if (typeof mostrarToastErro === 'function') mostrarToastErro(e.message);
        else alert('Erro: ' + e.message);
    }
};

function _pipelineSalvarFiltros() {
    const el = id => document.getElementById(id);
    if (el('pipe-filtro-os'))        _pipelineFiltros.os        = el('pipe-filtro-os').value;
    if (el('pipe-filtro-contrato'))  _pipelineFiltros.contrato  = el('pipe-filtro-contrato').value;
    if (el('pipe-filtro-data-de'))   _pipelineFiltros.dataDe    = el('pipe-filtro-data-de').value;
    if (el('pipe-filtro-data-ate'))  _pipelineFiltros.dataAte   = el('pipe-filtro-data-ate').value;
    if (el('pipe-filtro-dia'))       _pipelineFiltros.dia       = el('pipe-filtro-dia').value;
    if (el('pipe-filtro-tipo-os'))   _pipelineFiltros.tipoOs    = el('pipe-filtro-tipo-os').value;
    if (el('pipe-filtro-turno'))     _pipelineFiltros.turno     = el('pipe-filtro-turno').value;
    if (el('pipe-filtro-endereco'))  _pipelineFiltros.endereco  = el('pipe-filtro-endereco').value;
    if (el('pipe-filtro-cliente'))   _pipelineFiltros.cliente   = el('pipe-filtro-cliente').value;
    if (el('pipe-filtro-servico'))   _pipelineFiltros.servico   = el('pipe-filtro-servico').value;
}

function _pipelineRestaurarFiltros(hoje, nextYear) {
    const el = (id) => document.getElementById(id);
    if (el('pipe-filtro-os'))       el('pipe-filtro-os').value       = _pipelineFiltros.os;
    if (el('pipe-filtro-contrato')) el('pipe-filtro-contrato').value = _pipelineFiltros.contrato;
    if (el('pipe-filtro-data-de'))  el('pipe-filtro-data-de').value  = _pipelineFiltros.dataDe  || hoje;
    if (el('pipe-filtro-data-ate')) el('pipe-filtro-data-ate').value = _pipelineFiltros.dataAte || nextYear;
    if (el('pipe-filtro-dia'))      el('pipe-filtro-dia').value      = _pipelineFiltros.dia;
    if (el('pipe-filtro-tipo-os'))  el('pipe-filtro-tipo-os').value  = _pipelineFiltros.tipoOs;
    if (el('pipe-filtro-turno'))    el('pipe-filtro-turno').value    = _pipelineFiltros.turno;
    if (el('pipe-filtro-endereco')) el('pipe-filtro-endereco').value = _pipelineFiltros.endereco;
    if (el('pipe-filtro-cliente'))  el('pipe-filtro-cliente').value  = _pipelineFiltros.cliente;
    if (el('pipe-filtro-servico'))  el('pipe-filtro-servico').value  = _pipelineFiltros.servico;

    // Restaurar visual dos botões (sem disparar nova busca — apenas aparência)
    if (_pipelineFiltros.dia)     setTimeout(() => _pipeFiltrarDia(_pipelineFiltros.dia, true), 0);
    if (_pipelineFiltros.tipoOs)  setTimeout(() => _pipeFiltrarTipo(_pipelineFiltros.tipoOs, true), 0);
    if (_pipelineFiltros.turno)   setTimeout(() => _pipeFiltrarTurno(_pipelineFiltros.turno, true), 0);
}

function renderPipelinePage() {
    const container = document.getElementById('pipeline-container');
    if (!container) return;
    
    // Evitar recarregar/limpar a tela se o DOM já estiver montado (navegação de abas)
    if (container.innerHTML.trim() !== '') {
        return;
    }
    
    const hoje = new Date();
    // Usa data LOCAL (evita UTC que avança 1 dia à noite no fuso Brasil)
    const pad = n => String(n).padStart(2, '0');
    const today = `${hoje.getFullYear()}-${pad(hoje.getMonth()+1)}-${pad(hoje.getDate())}`;

    // Data "Até" = +1 ano (local)
    const umAno = new Date(hoje.getFullYear()+1, hoje.getMonth(), hoje.getDate());
    const nextYear = `${umAno.getFullYear()}-${pad(umAno.getMonth()+1)}-${pad(umAno.getDate())}`;

    // Salvar filtros atuais antes de recriar o HTML (caso o container já exista)
    _pipelineSalvarFiltros();

    container.innerHTML = `
    <div style="font-family:'Inter',sans-serif;background:#f1f5f9;min-height:100vh;">

      <!-- HEADER BRANCO fixo no topo -->
      <div id="pipeline-header-bar" style="position: sticky; top: 60px; z-index: 100; display: flex; gap: 1rem; align-items: center; background: white; padding: 0.8rem 1.5rem; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1rem;">
        <span style="color:#1e293b;font-size:1.1rem;font-weight:800;margin-right:8px;">Pipeline OS</span>

        <!-- OS -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">OS:</label>
          <input type="text" id="pipe-filtro-os" placeholder="OS"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:85px;background:white;color:#1e293b;outline:none;"
            oninput="_pipelineSalvarFiltros();buscarPipelineDebounced()">
        </div>
        <!-- Cliente -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Cliente:</label>
          <input type="text" id="pipe-filtro-cliente" placeholder="Cliente"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:240px;background:white;color:#1e293b;outline:none;"
            oninput="_pipelineSalvarFiltros();buscarPipelineDebounced()">
        </div>
        <!-- Contrato -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Contrato:</label>
          <input type="text" id="pipe-filtro-contrato" placeholder="Contrato"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:95px;background:white;color:#1e293b;outline:none;"
            oninput="_pipelineSalvarFiltros();buscarPipelineDebounced()">
        </div>
        <!-- Servico -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Serviço:</label>
          <input type="text" id="pipe-filtro-servico" placeholder="Ex: VAC, Bomba"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:110px;background:white;color:#1e293b;outline:none;"
            oninput="_pipelineSalvarFiltros();buscarPipelineDebounced()">
        </div>
        <!-- Data De / Até -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">De:</label>
          <input type="date" id="pipe-filtro-data-de" value="${today}"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;"
            onchange="_pipelineSalvarFiltros();buscarPipeline()">
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Até:</label>
          <input type="date" id="pipe-filtro-data-ate" value="${nextYear}"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;"
            onchange="_pipelineSalvarFiltros();buscarPipeline()">
        </div>

        <div style="flex-basis: 100%; height: 0; margin: 0;"></div> <!-- QUEBRA DE LINHA -->

        <!-- Endereço -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Endereço:</label>
          <input type="text" id="pipe-filtro-endereco" placeholder="Endereço"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:300px;background:white;color:#1e293b;outline:none;"
            oninput="_pipelineSalvarFiltros();buscarPipelineDebounced()">
        </div>
        <!-- Tipo OS -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Tipo:</label>
          <div style="display:flex;gap:3px;">
            ${[['','Todos'],['obra','🔵 Obra'],['evento','🟣 Evento']].map(([val,label])=>`<button type="button" onclick="_pipeFiltrarTipo('${val}')" id="pipe-tipo-${val||'todos'}" style="border:1.5px solid #cbd5e1;border-radius:20px;padding:3px 9px;font-size:0.75rem;font-weight:700;cursor:pointer;background:white;color:#475569;transition:all 0.15s;">${label}</button>`).join('')}
          </div>
          <input type="hidden" id="pipe-filtro-tipo-os" value="">
        </div>
        <!-- Turno -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Turno:</label>
          <div style="display:flex;gap:3px;">
            ${[['','Todos'],['Diurno','☀️ Diurno'],['Noturno','🌘 Noturno']].map(([val,label])=>`<button type="button" onclick="_pipeFiltrarTurno('${val}')" id="pipe-turno-${val||'todos'}" style="border:1.5px solid #cbd5e1;border-radius:20px;padding:3px 9px;font-size:0.75rem;font-weight:700;cursor:pointer;background:white;color:#475569;transition:all 0.15s;">${label}</button>`).join('')}
          </div>
          <input type="hidden" id="pipe-filtro-turno" value="">
        </div>
        <!-- Dia: pílulas coloridas (Oculto) -->
        <div style="display:none;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Dia:</label>
          <div id="pipe-filtro-dia-group" style="display:flex;gap:3px;flex-wrap:wrap;">
            ${[['','Todos','#64748b'],['Segunda','Seg','#ef4444'],['Terça','Ter','#f97316'],['Quarta','Qua','#ca8a04'],['Quinta','Qui','#16a34a'],['Sexta','Sex','#3b82f6'],['Sábado','Sáb','#8b5cf6'],['Domingo','Dom','#ec4899']].map(([val,label,cor])=>`<button type="button" onclick="_pipeFiltrarDia('${val}')" id="pipe-dia-${val||'todos'}" style="border:1.5px solid ${cor};border-radius:20px;padding:3px 9px;font-size:0.75rem;font-weight:700;cursor:pointer;background:white;color:${cor};transition:all 0.15s;">${label}</button>`).join('')}
          </div>
          <input type="hidden" id="pipe-filtro-dia" value="">
        </div>

        <!-- Botões à direita -->
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span id="pipeline-total-badge" style="background:#e2e8f0;color:#475569;border-radius:20px;padding:3px 12px;font-size:0.78rem;font-weight:700;">—</span>
          <button id="pipeline-btn-simpli" onclick="pipelineExportarInteligente()" title="Exportar SimpliRoute"
            style="background:#16a34a;border:none;border-radius:7px;padding:6px 14px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;display:flex;align-items:center;gap:5px;">
            <i class="ph ph-file-xls" style="font-size:1rem;"></i> <span id="pipeline-btn-simpli-txt">SimpliRoute</span>
          </button>
          <button onclick="pipelineAbrirModalImportar()" title="Importar OS via Excel"
            style="display:none;background:#6366f1;border:none;border-radius:7px;padding:6px 14px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;align-items:center;gap:5px;">
            <i class="ph ph-upload-simple" style="font-size:1rem;"></i> Importar OS
          </button>
          <button onclick="pipelineExcluirSelecionadas()" title="Excluir OS(s) selecionada(s) permanentemente"
            style="display:none;background:#eab308;border:none;border-radius:7px;padding:6px 14px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;align-items:center;gap:5px;">
            <i class="ph ph-trash" style="font-size:1rem;"></i> Excluir
          </button>
          <button onclick="buscarPipeline()" title="Atualizar pipeline com os filtros atuais"
            style="background:#3b82f6;border:none;border-radius:7px;padding:6px 14px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;display:flex;align-items:center;gap:5px;">
            <i class="ph ph-arrows-clockwise" style="font-size:1rem;"></i> Atualizar
          </button>
          <button onclick="pipelineLimparFiltros()" title="Limpar filtros"
            style="background:white;border:1px solid #cbd5e1;border-radius:7px;padding:6px 12px;color:#ef4444;font-weight:700;cursor:pointer;font-size:0.82rem;">
            ✕
          </button>
        </div>
      </div>

      <!-- KANBAN BOARD -->
      <div id="pipeline-kanban" style="display:flex;padding:0 1.2rem 1rem 1.2rem;gap:14px;align-items:flex-start;">
        <div style="width:100%;text-align:center;padding:4rem;color:#94a3b8;">
          <i class="ph ph-kanban" style="font-size:3rem;"></i>
          <p style="margin-top:1rem;">Carregando Pipeline...</p>
        </div>
      </div>
    </div>`;

    // CSS para os cards
    const style = document.createElement('style');
    style.id = 'pipeline-style';
    if (!document.getElementById('pipeline-style')) {
        style.textContent = `.pipe-card {
            background: #fff;
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 8px;
            cursor: pointer;
            border: 1px solid rgba(0,0,0,0.07);
            box-shadow: 0 2px 6px rgba(0,0,0,0.06);
            transition: transform 0.18s ease, box-shadow 0.18s ease;
            border-left: 3px solid transparent;
        }`;
        document.head.appendChild(style);
    }

    // Restaurar filtros salvos e recarregar resultados
    _pipelineRestaurarFiltros(today, nextYear);
    setTimeout(() => buscarPipeline(), 80);

    setTimeout(() => {
        const headerEl = document.getElementById('pipeline-header-bar');
        if (headerEl && window.ResizeObserver) {
            const obs = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const h = entry.borderBoxSize ? entry.borderBoxSize[0].blockSize : entry.contentRect.height;
                    document.documentElement.style.setProperty('--pipe-header-height', (h + 65) + 'px');
                }
            });
            obs.observe(headerEl);
        }
    }, 200);
}

// Função para alterar o tipo de contrato clicando no ícone do card
window.pipelineEditarTipoContrato = async function(event, osId, tipoServicoAtual) {
    if(event) event.stopPropagation(); // Evita abrir a modal da OS
    
    const isObra = tipoServicoAtual.toLowerCase().includes('obra');
    const isEvento = tipoServicoAtual.toLowerCase().includes('evento');
    
    const { value: novoTipo } = await Swal.fire({
        title: 'Alterar Tipo de Contrato',
        text: 'Selecione a classificação do contrato:',
        input: 'select',
        inputOptions: {
            'Obra': 'Obra',
            'Evento': 'Evento'
        },
        inputPlaceholder: 'Selecione o tipo',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Salvar',
        inputValue: isObra ? 'Obra' : (isEvento ? 'Evento' : '')
    });
    
    if (novoTipo) {
        try {
            // Primeiro precisamos buscar a OS atual para não sobrescrever outros campos vazios
            const resGet = await fetch(`/api/logistica/os/${osId}`);
            if (!resGet.ok) throw new Error('Falha ao buscar OS');
            const osData = await resGet.json();
            
            let novoStr = (osData.tipo_servico || '').trim();
            
            // Remove as palavras obra ou evento
            novoStr = novoStr.replace(/obra/ig, '').replace(/evento/ig, '').replace(/\s+/g, ' ').trim();
            // Acrescenta a nova no final
            novoStr = novoStr + ' ' + novoTipo.toUpperCase();
            
            osData.tipo_servico = novoStr;
            
            // Salvar
            const resPut = await fetch(`/api/logistica/os/${osId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osData)
            });
            
            if (resPut.ok) {
                Swal.fire({
                    title: 'Salvo!',
                    text: 'O tipo de contrato foi atualizado com sucesso.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                buscarPipeline(); // Atualiza os cards
            } else {
                throw new Error('Falha ao salvar OS');
            }
        } catch (e) {
            console.error('Erro ao atualizar tipo de contrato:', e);
            Swal.fire('Erro', 'Ocorreu um erro ao tentar alterar o tipo de contrato.', 'error');
        }
    }
};

window.pipelineEditarObsMotorista = async function(e, id) {
    e.stopPropagation(); // Evita abrir o modal da OS

    let osData = null;
    for (const key of ['manutencao','entrega','retirada','avulso']) {
        const found = (_pipelineDados[key] || []).find(o => o.id === id);
        if (found) { osData = found; break; }
    }
    
    if (!osData) return;

    const currentObs = typeof _fixMojibake === 'function' ? _fixMojibake(osData.observacoes || '') : (osData.observacoes || '');

    const { value: novaObs, isConfirmed } = await Swal.fire({
        title: 'Observação do Motorista',
        input: 'textarea',
        inputValue: currentObs,
        inputPlaceholder: 'Digite a observação...',
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2d9e5f'
    });

    if (!isConfirmed) return;

    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    try {
        const resp = await fetch('/api/logistica/os/'+id+'/observacoes', {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token 
            },
            body: JSON.stringify({ observacoes: novaObs })
        });
        
        const data = await resp.json();
        if (data.ok) {
            osData.observacoes = novaObs;
            if (typeof pipelineRenderKanban === 'function') pipelineRenderKanban(_pipelineDados);
            if (typeof showToast === 'function') showToast('Observação salva!', 'success');
        } else {
            throw new Error(data.error || 'Erro desconhecido');
        }
    } catch(err) {
        console.error('[Pipeline] Erro ao salvar observação:', err);
        if (typeof showToast === 'function') showToast('Erro ao salvar: ' + err.message, 'error');
    }
};

// IMPORTACAO EM MASSA VIA EXCEL
function pipelineAbrirModalImportar() {
    const old = document.getElementById('modal-importar-os');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-importar-os';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:white;border-radius:16px;padding:2rem;width:500px;max-width:95vw;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">' +
        '<h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#1e293b;">Importar OS via Excel</h3>' +
        '<button onclick="document.getElementById(\'modal-importar-os\').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;">X</button>' +
        '</div>' +
        '<div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;padding:1.5rem;text-align:center;margin-bottom:1.2rem;">' +
        '<p style="margin:0 0 1rem;color:#475569;font-size:0.88rem;">Selecione a planilha Excel (aba OS) do sistema legado.</p>' +
        '<input type="file" id="importar-os-file" accept=".xlsx,.xls" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px 12px;font-size:0.85rem;width:100%;box-sizing:border-box;">' +
        '</div>' +
        '<div style="margin-bottom:1.2rem;">' +
        '<label style="font-size:0.82rem;font-weight:700;color:#475569;display:block;margin-bottom:6px;">Turno das OSs importadas:</label>' +
        '<div style="display:flex;gap:8px;">' +
        '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.88rem;"><input type="radio" name="importar-turno" value="Diurno"> Diurno</label>' +
        '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.88rem;"><input type="radio" name="importar-turno" value="Noturno" checked> Noturno</label>' +
        '</div></div>' +
        '<div id="importar-os-progress" style="display:none;margin-bottom:1rem;">' +
        '<div style="background:#e2e8f0;border-radius:999px;height:8px;">' +
        '<div id="importar-os-bar" style="background:#6366f1;border-radius:999px;height:8px;width:0%;transition:width 0.3s;"></div>' +
        '</div><p id="importar-os-status" style="margin:6px 0 0;font-size:0.82rem;color:#475569;text-align:center;">Processando...</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'modal-importar-os\').remove()" style="background:white;border:1px solid #cbd5e1;border-radius:8px;padding:8px 20px;font-weight:600;cursor:pointer;color:#475569;">Cancelar</button>' +
        '<button onclick="pipelineImportarExcel()" style="background:#6366f1;border:none;border-radius:8px;padding:8px 22px;font-weight:700;cursor:pointer;color:white;">Importar</button>' +
        '</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

async function pipelineImportarExcel() {
    const fileInput = document.getElementById('importar-os-file');
    const turnoRadio = document.querySelector("input[name='importar-turno']:checked");
    const progressDiv = document.getElementById('importar-os-progress');
    const bar = document.getElementById('importar-os-bar');
    const status = document.getElementById('importar-os-status');
    if (!fileInput || !fileInput.files[0]) {
        if (typeof showToast === 'function') showToast('Selecione um arquivo Excel.', 'error');
        return;
    }
    const turno = turnoRadio ? turnoRadio.value : 'Noturno';
    if (progressDiv) progressDiv.style.display = 'block';
    if (bar) bar.style.width = '10%';
    if (status) status.textContent = 'Enviando...';
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('turno', turno);
        if (bar) bar.style.width = '30%';
        if (status) status.textContent = 'Processando no servidor...';
        const resp = await fetch('/api/logistica/importar-excel', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
        if (bar) bar.style.width = '80%';
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Erro no servidor');
        if (bar) bar.style.width = '100%';
        if (status) status.textContent = data.inseridos + ' OSs importadas! (' + data.erros + ' erros)';
        setTimeout(function() {
            const m = document.getElementById('modal-importar-os');
            if (m) m.remove();
            buscarPipeline();
            if (typeof showToast === 'function') showToast(data.inseridos + ' OSs importadas!', 'success');
        }, 1800);
    } catch(err) {
        if (bar) { bar.style.width = '100%'; bar.style.background = '#ef4444'; }
        if (status) status.textContent = 'Erro: ' + err.message;
        console.error('[Pipeline] Erro ao importar:', err);
    }
}

async function pipelineExcluirSelecionadas() {
    if (_pipelineSelecionados.size === 0) {
        if (typeof showToast === 'function') showToast('Selecione pelo menos uma OS para excluir.', 'error');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir PERMANENTEMENTE as ' + _pipelineSelecionados.size + ' OS(s) selecionada(s)? Essa acao nao pode ser desfeita.')) return;

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const ids = Array.from(_pipelineSelecionados.keys());
        const resp = await fetch('/api/logistica/pipeline/excluir-selecionadas', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Erro no servidor');
        
        if (typeof showToast === 'function') showToast(data.message, 'success');
        pipelineLimparSelecao();
        buscarPipeline();
    } catch (err) {
        if (typeof showToast === 'function') showToast('Erro ao excluir: ' + err.message, 'error');
        console.error('[Pipeline] Erro ao excluir OSs:', err);
    }
}
