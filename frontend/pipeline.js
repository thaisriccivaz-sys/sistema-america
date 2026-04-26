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
    'CHUVEIRO OBRA':'🚿','CHUVEIRO EVENTO':'🚿','HIDRAULICO OBRA':'🚽',
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
    return `<span style="background:#dbeafe;color:#1d4ed8;border-radius:6px;padding:2px 9px;font-size:0.68rem;font-weight:600;">${ic}${desc} (${qtd})</span>`;
}

function pipelineGetIconServico(tipoServico) {
    const t = (tipoServico || '').toLowerCase();
    if (t.includes('entrega'))             return '🚛';
    if (t.includes('retirada'))            return '↩️';
    if (t.includes('visita tecnica') || t.includes('visita técnica')) return '⚙️';
    if (t.includes('reparo'))              return '🔧';
    if (t.includes('limpa fossa'))         return '💧';
    if (t.includes('manutencao avulsa') || t.includes('manutenção avulsa')) return ''; // sem ícone para avulsa
    if (t.includes('manutencao') || t.includes('manutenção')) return '🔧';
    if (t.includes('vac'))                 return '🏗️';
    if (t.includes('succao') || t.includes('sucção')) return '💧';
    return '📋';
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

function pipelineRenderCard(os) {
    const dias  = Array.isArray(os.dias_semana) ? os.dias_semana : [];
    const vars  = Array.isArray(os.variaveis)   ? os.variaveis.filter(v => v.trim()) : [];
    const prods = Array.isArray(os.produtos)    ? os.produtos : [];
    const isRec = pipelineIsRecorrente(os.tipo_servico);

    const _t = (os.tipo_servico || '').toLowerCase();
    const bgCard     = _t.includes('obra')   ? '#dbeafe' : _t.includes('evento') ? '#e9d5ff' : '#ffffff';
    const borderCard = _t.includes('obra')   ? '#93c5fd' : _t.includes('evento') ? '#d8b4fe' : '#e2e8f0';

    const endFull = [os.endereco, os.complemento, os.cep ? `CEP: ${os.cep}` : ''].filter(Boolean).join(', ');

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

    const obsHtml = (os.observacoes_internas || '').trim()
        ? `<div style="margin-top:5px;background:#fef9c3;border-radius:5px;padding:3px 8px;font-size:0.68rem;color:#854d0e;">📝 ${os.observacoes_internas}</div>` : '';

    // 📦 compra interna ao lado do nome do cliente
    const isCompra = vars.some(v => v.trim().toUpperCase().includes('COMPRA'));
    const clienteLabel = `${isCompra ? '📦 ' : ''}${os.cliente || '—'}`;

    return `
    <div class="pipe-card" data-os-id="${os.id}"
         style="background:${bgCard};border-left:3px solid ${borderCard};"
         onclick="pipelineAbrirOS(${os.id},'${(os.numero_os||'').replace(/'/g,"\\'")}')">
        <!-- OS número -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:800;font-size:0.82rem;color:#1e3a5f;">OS: ${os.numero_os||'—'}</span>
        </div>
        <!-- Cliente (com 📦 se compra interna) -->
        <div style="font-size:0.73rem;font-weight:700;color:#1e293b;margin-bottom:2px;">${clienteLabel}</div>
        <!-- Endereço completo -->
        <div style="font-size:0.68rem;color:#475569;line-height:1.4;margin-bottom:2px;">${endFull || '—'}</div>
        ${(!_t.includes('entrega') && !_t.includes('retirada') && !(_t.includes('manutencao obra') || _t.includes('manutenção obra') || (_t.includes('vac') && _t.includes('obra')))) ? `
        <div style="font-size:0.68rem;color:#64748b;margin-bottom:2px;margin-top:3px;">
            ${pipelineGetIconServico(os.tipo_servico)} <b>${(os.tipo_servico||'').toUpperCase()}</b>
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

    const total = colunasExibidas.reduce((a, c) => a + (dados[c.key]||[]).length, 0);
    const badge = document.getElementById('pipeline-total-badge');
    if (badge) badge.textContent = `${total} OS`;

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
                <span style="background:rgba(0,0,0,0.08);color:${col.textCor};border-radius:20px;padding:1px 10px;font-size:0.8rem;font-weight:700;">${lista.length}</span>
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
    ['pipe-filtro-data-de','pipe-filtro-data-ate','pipe-filtro-os','pipe-filtro-contrato','pipe-filtro-cliente','pipe-filtro-endereco'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const dia = document.getElementById('pipe-filtro-dia');
    if (dia) dia.value = '';
    const tipoOs = document.getElementById('pipe-filtro-tipo-os');
    if (tipoOs) tipoOs.value = '';
    const turno = document.getElementById('pipe-filtro-turno');
    if (turno) turno.value = '';
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

function pipelineExportarExcel() {
    if (!_pipelineDados || Object.keys(_pipelineDados).length === 0) {
        alert('Busque antes de exportar.');
        return;
    }

    const ORDER = ['manutencao', 'entrega', 'retirada', 'avulso'];
    const registros = [];
    ORDER.forEach(key => {
        // Dentro de cada categoria: Noturno primeiro, Diurno depois
        const cat = (_pipelineDados[key] || []).slice().sort((a, b) => {
            const aN = (a.turno || '').toLowerCase() === 'noturno' ? 0 : 1;
            const bN = (b.turno || '').toLowerCase() === 'noturno' ? 0 : 1;
            return aN - bN;
        });
        cat.forEach(r => registros.push(r));
    });
    if (registros.length === 0) { alert('Nenhum registro para exportar.'); return; }

    // Abreviação dos dias da semana para coluna G
    const ABREV_DIA = {
        'segunda':'seg','terça':'ter','terca':'ter',
        'quarta':'qua','quinta':'qui','sexta':'sex',
        'sábado':'sab','sabado':'sab','domingo':'dom'
    };
    function abreviarDias(dias) {
        if (!Array.isArray(dias) || !dias.length) return '';
        return dias.map(d => ABREV_DIA[d.toLowerCase()] || d.toLowerCase().substring(0,3)).join(', ');
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

    const linhas = [HEADERS];

    registros.forEach(r => {
        const ts = (r.tipo_servico || '').toLowerCase();
        // Mostrar dias da semana apenas para manutenção obra/evento e avulsa obra/evento
        const isManutObraEvento  = (ts.includes('manut') && !ts.includes('avulsa')) && (ts.includes('obra') || ts.includes('evento'));
        const isAvulsaObraEvento = ts.includes('avulsa') && (ts.includes('obra') || ts.includes('evento'));
        const mostrarDias = isManutObraEvento || isAvulsaObraEvento;

        // A: Título — usa o nome do cliente exatamente como cadastrado (ícones já fazem parte do nome)
        const titulo = (r.cliente || '').trim();

        // B: Endereço completo
        const endereco = [r.endereco, r.complemento, r.cep ? `CEP: ${r.cep}` : ''].filter(Boolean).join(', ');

        // H: Anotações2
        // Produtos: "QTD NOME" (sem X — X fica na frequência)
        const prodStr = (r.produtos || []).map(p => `${p.qtd} ${p.desc}`).join(' - ');

        // Frequência semanal: NX + abreviação dos dias (apenas para manutenção)
        const numDias = (mostrarDias && Array.isArray(r.dias_semana)) ? r.dias_semana.length : 0;
        const diasAbbr = mostrarDias ? abreviarDias(r.dias_semana) : '';
        const diasComFreq = (mostrarDias && diasAbbr) ? `${numDias}X ${diasAbbr}` : '';

        // Linha principal: TIPO | PRODUTOS | NX DIAS
        const partesMain = [r.tipo_servico || '', prodStr, diasComFreq].filter(Boolean);
        const linhaMain  = partesMain.join(' | ').toUpperCase();

        // Observação do motorista em nova linha na mesma célula
        const obsStr  = (r.observacoes || '').trim().toUpperCase();
        const anotacoes = obsStr ? `${linhaMain}\n${obsStr}` : linhaMain;


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

        linhas.push([
            r.observacoes_internas || '', // A Obs Internas
            titulo,                  // B Titulo
            endereco,                // C Endereço completo
            r.tanque || r.carga || '',// D Carga
            r.hora_inicio || '',     // E Janela de horário inicial
            r.hora_fim    || '',     // F Janela de horário final
            r.tempo_servico || '',   // G Tempo de serviço
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
            r.carroceria || '',      // R Capacidade 2 — Carroceria
            r.carretinha || '',      // S Capacidade 3 — Carretinha
            '',                      // T Prioridade — não preencher
            '',                      // U SMS — não preencher
            r.email || '',           // V Correio eletrônico de contato
            '',                      // W Carga pick — não preencher
            '',                      // X Carga pick 2 — não preencher
            '',                      // Y Não preencher
            '',                      // Z Data Agendamento — não preencher
            r.tipo_servico || ''     // AA Tipo de visita
        ]);
    });

    const dataDe  = document.getElementById('pipe-filtro-data-de')?.value || '';
    const dataAte = document.getElementById('pipe-filtro-data-ate')?.value || '';
    const nomePlanilha = [dataDe, dataAte].filter(Boolean).join('_a_') || 'Pipeline';

    // Exporta como CSV com separador ; compatível com SimpliRoute
    const csvLinhas = linhas.map(row =>
        row.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(';')
    );
    const blob = new Blob(['\uFEFF' + csvLinhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `SimpliRoute_${nomePlanilha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

let _pipelineDebounceTimer;
function buscarPipelineDebounced() {
    clearTimeout(_pipelineDebounceTimer);
    _pipelineDebounceTimer = setTimeout(() => buscarPipeline(), 300);
}

function renderPipelinePage() {
    const container = document.getElementById('pipeline-container');
    if (!container) return;
    
    const hoje = new Date();
    const today = hoje.toISOString().split('T')[0];
    
    // Data "Até" = +1 ano
    const daquiUmAno = new Date(hoje.setFullYear(hoje.getFullYear() + 1));
    const nextYear = daquiUmAno.toISOString().split('T')[0];

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
            oninput="buscarPipelineDebounced()">
        </div>
        <!-- Contrato -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Contrato:</label>
          <input type="text" id="pipe-filtro-contrato" placeholder="Contrato"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:95px;background:white;color:#1e293b;outline:none;"
            oninput="buscarPipelineDebounced()">
        </div>
        <!-- Data De / Até -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">De:</label>
          <input type="date" id="pipe-filtro-data-de" value="${today}"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;"
            onchange="buscarPipeline()">
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Até:</label>
          <input type="date" id="pipe-filtro-data-ate" value="${nextYear}"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;"
            onchange="buscarPipeline()">
        </div>
        <!-- Dia dropdown -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Dia:</label>
          <select id="pipe-filtro-dia" onchange="buscarPipeline()"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;">
            <option value="">Todos</option>
            <option value="Segunda">Segunda</option>
            <option value="Terça">Terça</option>
            <option value="Quarta">Quarta</option>
            <option value="Quinta">Quinta</option>
            <option value="Sexta">Sexta</option>
            <option value="Sábado">Sábado</option>
            <option value="Domingo">Domingo</option>
          </select>
        </div>
        <!-- Tipo OS: Obra / Evento -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Tipo:</label>
          <select id="pipe-filtro-tipo-os" onchange="buscarPipeline()"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;">
            <option value="">Todos</option>
            <option value="obra">&#x1F535; Obra</option>
            <option value="evento">&#x1F7E3; Evento</option>
          </select>
        </div>
        <!-- Turno: Diurno / Noturno -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Turno:</label>
          <select id="pipe-filtro-turno" onchange="buscarPipeline()"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;background:white;color:#1e293b;outline:none;">
            <option value="">Todos</option>
            <option value="Diurno">☀️ Diurno</option>
            <option value="Noturno">🌙 Noturno</option>
          </select>
        </div>
        <!-- Endereco -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Endereço:</label>
          <input type="text" id="pipe-filtro-endereco" placeholder="Endereço"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:180px;background:white;color:#1e293b;outline:none;"
            oninput="buscarPipelineDebounced()">
        </div>
        <!-- Cliente -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:#475569;font-size:0.78rem;font-weight:600;">Cliente:</label>
          <input type="text" id="pipe-filtro-cliente" placeholder="Cliente"
            style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:0.8rem;width:180px;background:white;color:#1e293b;outline:none;"
            oninput="buscarPipelineDebounced()">
        </div>
        <!-- Botões à direita -->
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
          <span id="pipeline-total-badge" style="background:#e2e8f0;color:#475569;border-radius:20px;padding:3px 12px;font-size:0.78rem;font-weight:700;">—</span>
          <button onclick="pipelineExportarExcel()" title="Exportar SimpliRoute"
            style="background:#16a34a;border:none;border-radius:7px;padding:6px 14px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;display:flex;align-items:center;gap:5px;">
            ⬇️ SimpliRoute
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









