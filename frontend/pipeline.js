/* ═══════════════════════════════════════════════════════════════
   MÓDULO: PIPELINE OS (Kanban de Ordens de Serviço)
   ═══════════════════════════════════════════════════════════════ */

const PIPELINE_COLS = [
    { key: 'manutencao', label: 'Manutenção',    cor: '#607D8B', icon: '👤' },
    { key: 'entrega',    label: 'Entrega',         cor: '#2d9e5f', icon: '🚛' },
    { key: 'retirada',   label: 'Retirada',        cor: '#e67700', icon: '↩' },
    { key: 'avulso',     label: 'Avulso',          cor: '#9C27B0', icon: '⚡' },
];

const PIPELINE_VARS_CORES = {
    'NOTURNO':              { bg:'#1e3a5f', text:'#fff', icon:'🌙' },
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
    const ic   = PIPELINE_EQ_ICONS[desc] || '📦';
    return `<span style="background:#dbeafe;color:#1d4ed8;border-radius:6px;padding:2px 9px;font-size:0.68rem;font-weight:600;">${ic} ${desc} (${qtd})</span>`;
}

function pipelineRenderCard(os) {
    const dias  = Array.isArray(os.dias_semana) ? os.dias_semana : [];
    const vars  = Array.isArray(os.variaveis) ? os.variaveis.filter(v => v.trim()) : [];
    const prods = Array.isArray(os.produtos) ? os.produtos : [];
    const corCard = pipelineGetCorCard(os.tipo_servico);

    const endFull = [os.endereco, os.complemento, os.cep ? `CEP: ${os.cep}` : ''].filter(Boolean).join(', ');

    const diasHtml = dias.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px;">
        ${dias.map(d => `<span style="background:#dcfce7;color:#166534;border-radius:6px;padding:2px 8px;font-size:0.68rem;font-weight:600;">${d}</span>`).join('')}
        </div>` : '';

    const varsHtml = vars.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">
        ${vars.map(v => pipelineRenderVar(v)).join('')}
        </div>` : '';

    const prodsHtml = prods.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;">
        ${prods.map(p => pipelineRenderProd(p)).join('')}
        </div>` : '';

    const obsHtml = (os.observacoes_internas || '').trim()
        ? `<div style="margin-top:5px;background:#fef9c3;border-radius:5px;padding:3px 8px;font-size:0.68rem;color:#854d0e;">📝 ${os.observacoes_internas}</div>` : '';

    return `
    <div class="pipe-card" data-os-id="${os.id}"
         onclick="pipelineAbrirOS(${os.id},'${(os.numero_os||'').replace(/'/g,"\\'")}')">
        <!-- OS número -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:800;font-size:0.82rem;color:#1e3a5f;">OS: ${os.numero_os||'—'}</span>
        </div>
        <!-- Cliente -->
        <div style="font-size:0.73rem;font-weight:700;color:#1e293b;margin-bottom:2px;">${os.cliente||'—'}</div>
        <!-- Endereço completo -->
        <div style="font-size:0.68rem;color:#475569;line-height:1.4;margin-bottom:2px;">${endFull || '—'}</div>
        <!-- Tipo de serviço -->
        <div style="font-size:0.68rem;color:#64748b;">Serviço: <b>${(os.tipo_servico||'').toUpperCase()}</b></div>
        <!-- Data -->
        ${os.data_os ? `<div style="font-size:0.68rem;color:#94a3b8;">Data: ${os.data_os}</div>` : ''}
        ${diasHtml}${varsHtml}${prodsHtml}${obsHtml}
    </div>`;
}

function pipelineRenderKanban(dados) {
    const container = document.getElementById('pipeline-kanban');
    if (!container) return;

    const total = PIPELINE_COLS.reduce((a, c) => a + (dados[c.key]||[]).length, 0);
    const badge = document.getElementById('pipeline-total-badge');
    if (badge) badge.textContent = `${total} OS`;

    container.innerHTML = `
    <div style="display:flex;gap:14px;min-height:calc(100vh - 170px);padding:1rem 1.5rem;overflow-x:auto;box-sizing:border-box;">
    ${PIPELINE_COLS.map(col => {
        const lista = dados[col.key] || [];
        return `
        <div style="flex:1;min-width:260px;display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:#f8fafc;box-shadow:0 2px 10px rgba(0,0,0,0.07);">
            <!-- Header coluna -->
            <div style="background:${col.cor};padding:10px 14px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:1rem;">${col.icon}</span>
                <span style="color:white;font-weight:800;font-size:0.9rem;flex:1;">${col.label}</span>
                <span style="background:rgba(255,255,255,0.22);color:white;border-radius:20px;padding:1px 10px;font-size:0.8rem;font-weight:700;">${lista.length}</span>
            </div>
            <!-- Cards -->
            <div style="flex:1;overflow-y:auto;padding:8px;">
                ${lista.length === 0
                    ? `<div style="text-align:center;padding:2rem;color:#94a3b8;font-size:0.78rem;"><i class="ph ph-clipboard-text" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhuma OS</div>`
                    : lista.map(os => pipelineRenderCard(os)).join('')}
            </div>
        </div>`;
    }).join('')}
    </div>`;

    // Hover effect
    document.querySelectorAll('.pipe-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-3px)';
            card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
        });
    });
}

let _pipelineDados = {};

async function buscarPipeline() {
    const data     = document.getElementById('pipe-filtro-data')?.value    || '';
    const os       = document.getElementById('pipe-filtro-os')?.value      || '';
    const cliente  = document.getElementById('pipe-filtro-cliente')?.value || '';
    const endereco = document.getElementById('pipe-filtro-endereco')?.value|| '';

    const container = document.getElementById('pipeline-kanban');
    if (container) container.innerHTML = `<div style="text-align:center;padding:4rem;color:#64748b;width:100%;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><p style="margin-top:1rem;">Carregando Pipeline...</p></div>`;

    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const params = new URLSearchParams();
    if (data) params.set('data', data);
    if (os) params.set('os', os);
    if (cliente) params.set('cliente', cliente);
    if (endereco) params.set('endereco', endereco);

    try {
        const resp = await fetch(`/api/logistica/pipeline?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(await resp.text());
        _pipelineDados = await resp.json();

        // Filtro por dia (client-side)
        const dia = document.getElementById('pipe-filtro-dia')?.value || '';
        if (dia) {
            ['manutencao','entrega','retirada','avulso'].forEach(key => {
                _pipelineDados[key] = (_pipelineDados[key] || []).filter(os => {
                    const d = Array.isArray(os.dias_semana) ? os.dias_semana : [];
                    return d.some(x => x.toLowerCase().includes(dia.toLowerCase()));
                });
            });
        }

        pipelineRenderKanban(_pipelineDados);
    } catch(e) {
        if (container) container.innerHTML = `<div style="text-align:center;padding:3rem;color:#ef4444;width:100%;">${e.message}</div>`;
    }
}

function pipelineLimparFiltros() {
    ['pipe-filtro-data','pipe-filtro-os','pipe-filtro-cliente','pipe-filtro-endereco'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const dia = document.getElementById('pipe-filtro-dia');
    if (dia) dia.value = '';
    buscarPipeline();
}

function pipelineAbrirOS(id, numeroOs) {
    if (typeof navigateTo === 'function') navigateTo('logistica-rota-redonda');

    // Aguarda a página renderizar e tenta carregar a OS com retry
    let tentativas = 0;
    const maxTentativas = 15;
    const intervalo = setInterval(() => {
        tentativas++;
        // Verifica se o container da Rota Redonda já foi renderizado
        const containerReady = document.getElementById('rr-input-os') || document.getElementById('rota-redonda-content');
        if (containerReady) {
            clearInterval(intervalo);
            if (typeof carregarOsPorNumero === 'function') {
                carregarOsPorNumero(numeroOs);
            } else if (typeof pesquisarOsParaEdicao === 'function') {
                pesquisarOsParaEdicao(numeroOs);
            }
        } else if (tentativas >= maxTentativas) {
            clearInterval(intervalo);
            console.warn('[Pipeline] Timeout ao aguardar página Rota Redonda carregar para OS:', numeroOs);
        }
    }, 200);
}

function pipelineExportarCSV() {
    if (!_pipelineDados || Object.keys(_pipelineDados).length === 0) { alert('Busque antes de exportar.'); return; }
    const ORDER = ['manutencao','entrega','retirada','avulso'];
    const cab = ['OS','Cliente','Endereço','CEP','Tipo Serviço','Data','Produtos','Variáveis','Turno','Habilidades','Responsável','Telefone'];
    const linhas = [cab.join(';')];
    ORDER.forEach(key => {
        (_pipelineDados[key]||[]).forEach(r => {
            linhas.push([
                r.numero_os, r.cliente, r.endereco, r.cep||'', r.tipo_servico,
                r.data_os, (r.produtos||[]).map(p=>`${p.qtd}x ${p.desc}`).join('|'),
                (r.variaveis||[]).join('|'), r.turno||'',
                (r.habilidades||[]).join('|'), r.responsavel||'', r.telefone||''
            ].map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(';'));
        });
    });
    const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Pipeline_${document.getElementById('pipe-filtro-data')?.value||'frota'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function renderPipelinePage() {
    const container = document.getElementById('pipeline-container');
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
    <div style="font-family:'Inter',sans-serif;background:#f1f5f9;min-height:100vh;">

      <!-- HEADER VERDE (igual ao sistema legado) -->
      <div style="background:#2d6a40;padding:8px 18px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;box-shadow:0 3px 10px rgba(0,0,0,0.2);">
        <span style="color:white;font-size:1.1rem;font-weight:800;margin-right:8px;">Pipeline OS</span>

        <!-- OS -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:white;font-size:0.78rem;font-weight:600;">OS:</label>
          <input type="text" id="pipe-filtro-os" placeholder="OS"
            style="border:1px solid rgba(255,255,255,0.4);border-radius:6px;padding:5px 10px;font-size:0.8rem;width:85px;background:rgba(255,255,255,0.9);outline:none;"
            oninput="const d=document.getElementById('pipe-filtro-data');if(this.value.trim()&&d)d.value='';"
            onkeydown="if(event.key==='Enter')buscarPipeline()">
        </div>
        <!-- Data -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:white;font-size:0.78rem;font-weight:600;">Data:</label>
          <input type="date" id="pipe-filtro-data" value="${today}"
            style="border:1px solid rgba(255,255,255,0.4);border-radius:6px;padding:5px 10px;font-size:0.8rem;background:rgba(255,255,255,0.9);outline:none;"
            onkeydown="if(event.key==='Enter')buscarPipeline()">
        </div>
        <!-- Dia dropdown -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:white;font-size:0.78rem;font-weight:600;">Dia:</label>
          <select id="pipe-filtro-dia"
            style="border:1px solid rgba(255,255,255,0.4);border-radius:6px;padding:5px 10px;font-size:0.8rem;background:rgba(255,255,255,0.9);outline:none;">
            <option value="">Dia</option>
            <option value="Segunda">Segunda</option>
            <option value="Terça">Terça</option>
            <option value="Quarta">Quarta</option>
            <option value="Quinta">Quinta</option>
            <option value="Sexta">Sexta</option>
            <option value="Sábado">Sábado</option>
            <option value="Domingo">Domingo</option>
          </select>
        </div>
        <!-- Endereço -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:white;font-size:0.78rem;font-weight:600;">Endereço:</label>
          <input type="text" id="pipe-filtro-endereco" placeholder="Endereço"
            style="border:1px solid rgba(255,255,255,0.4);border-radius:6px;padding:5px 10px;font-size:0.8rem;width:180px;background:rgba(255,255,255,0.9);outline:none;"
            onkeydown="if(event.key==='Enter')buscarPipeline()">
        </div>
        <!-- Cliente -->
        <div style="display:flex;align-items:center;gap:5px;">
          <label style="color:white;font-size:0.78rem;font-weight:600;">Cliente:</label>
          <input type="text" id="pipe-filtro-cliente" placeholder="Cliente"
            style="border:1px solid rgba(255,255,255,0.4);border-radius:6px;padding:5px 10px;font-size:0.8rem;width:180px;background:rgba(255,255,255,0.9);outline:none;"
            onkeydown="if(event.key==='Enter')buscarPipeline()">
        </div>
        <!-- Botões à direita -->
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
          <span id="pipeline-total-badge" style="background:rgba(0,0,0,0.25);color:white;border-radius:20px;padding:3px 12px;font-size:0.78rem;font-weight:700;">—</span>
          <button onclick="buscarPipeline()" title="Buscar"
            style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);border-radius:7px;padding:6px 14px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;">
            🔍 Buscar
          </button>
          <button onclick="pipelineExportarCSV()" title="Exportar CSV"
            style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);border-radius:7px;padding:6px 12px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;">
            ⬇️
          </button>
          <button onclick="pipelineLimparFiltros()" title="Limpar filtros"
            style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);border-radius:7px;padding:6px 12px;color:white;font-weight:700;cursor:pointer;font-size:0.82rem;">
            ✕
          </button>
        </div>
      </div>

      <!-- KANBAN BOARD -->
      <div id="pipeline-kanban" style="display:flex;padding:1rem 1.2rem;gap:14px;overflow-x:auto;min-height:calc(100vh - 58px);">
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
}
