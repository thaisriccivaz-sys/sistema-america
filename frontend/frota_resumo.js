/* ═══════════════════════════════════════════════════════════════
   MÓDULO: RESUMO DE FROTA
   ═══════════════════════════════════════════════════════════════ */

const FROTA_EQUIPAMENTOS = {
    'STD OBRA':             { icone: '💙', codigo: 'STD O' },
    'STD EVENTO':           { icone: '💜', codigo: 'STD E' },
    'LX OBRA':              { icone: '🟦', codigo: 'LX O' },
    'LX EVENTO':            { icone: '🟪', codigo: 'LX E' },
    'ELX OBRA':             { icone: '🔵', codigo: 'ELX O' },
    'ELX EVENTO':           { icone: '🟣', codigo: 'ELX E' },
    'PCD OBRA':             { icone: '♿', codigo: 'PCD O' },
    'PCD EVENTO':           { icone: '🧑🏾‍🦽', codigo: 'PCD E' },
    'CHUVEIRO OBRA':        { icone: '🚿', codigo: 'CHUVEIRO O' },
    'CHUVEIRO EVENTO':      { icone: '🚿', codigo: 'CHUVEIRO E' },
    'HIDRAULICO OBRA':      { icone: '🚽', codigo: 'HIDRAULICO O' },
    'HIDRAULICO EVENTO':    { icone: '🚽', codigo: 'HIDRAULICO E' },
    'MICTORIO OBRA':        { icone: '💦', codigo: 'MICTORIO O' },
    'MICTORIO EVENTO':      { icone: '💦', codigo: 'MICTORIO E' },
    'PBII OBRA':            { icone: '🧼', codigo: 'PIA II O' },
    'PBII EVENTO':          { icone: '🧼', codigo: 'PIA II E' },
    'PBIII OBRA':           { icone: '🧼', codigo: 'PIA III O' },
    'PBIII EVENTO':         { icone: '🧼', codigo: 'PIA III E' },
    'GUARITA INDIVIDUAL OBRA':  { icone: '⬜', codigo: 'GUARITA INDIVIDUAL O' },
    'GUARITA INDIVIDUAL EVENTO':{ icone: '⬜', codigo: 'GUARITA INDIVIDUAL E' },
    'GUARITA DUPLA OBRA':   { icone: '⚪', codigo: 'GUARITA DUPLA O' },
    'GUARITA DUPLA EVENTO': { icone: '⚪', codigo: 'GUARITA DUPLA E' },
    'LIMPA FOSSA':          { icone: '💧', codigo: 'LIMPA FOSSA' },
    'VISITA TECNICA':       { icone: '⚙️', codigo: 'VISITA TECNICA' },
};

const FROTA_VARIAVEIS = {
    'AVULSO':               '❗',
    'LEVAR CARRINHO':       '🛒',
    'LEVAR EXTENSORA':      '🌀',
    'VAC':                  '🏗️',
    'CARRETINHA':           '🔗',
    'INFORMACOES IMPORTANTES': '🚨',
    'ATENCAO AO HORARIO':   '⏰',
    'LEVAR EPI':            '🦺',
    'TROCA DE CABINE':      '♻️',
    'INTEGRACAO':           '👷',
    'APOIO DE SUCCAO':      '💧',
    'TROCA DE EQUIPAMENTO': '♻️',
    'NOTURNO':              '🌙',
};

const DEPOSITO_LAT = -23.433792162004327;
const DEPOSITO_LNG = -46.4201440193509;

let frotaMaps = {}; // Leaflet map instances keyed by veiculo

function renderFrotaResumo() {
    const container = document.getElementById('frota-resumo-container');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
    <div style="font-family:'Inter',sans-serif; background:#f1f5f9; min-height:100vh; padding:1.5rem;">
      <!-- HEADER -->
      <div style="background:linear-gradient(135deg,#1e3a5f,#2d9e5f); border-radius:14px; padding:1.5rem 2rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 20px rgba(0,0,0,0.15);">
        <div>
          <h1 style="margin:0; color:white; font-size:1.5rem; font-weight:800;">🚛 Resumo de Frota</h1>
          <p style="margin:4px 0 0; color:rgba(255,255,255,0.75); font-size:0.85rem;">Agrupamento por veículo com exportação para SimpliRoute</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <input type="date" id="frota-data-filtro" value="${today}" style="padding:8px 12px; border:none; border-radius:8px; font-size:0.9rem; font-weight:600; outline:none; cursor:pointer;">
          <button id="btn-frota-buscar" onclick="buscarFrota()" style="background:#2d9e5f; color:white; border:none; border-radius:8px; padding:9px 18px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.88rem;">
            <i class="ph ph-magnifying-glass"></i> Buscar
          </button>
          <button id="btn-frota-exportar" onclick="exportarSimpliroute()" style="background:#f59e0b; color:white; border:none; border-radius:8px; padding:9px 18px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.88rem;" title="Exportar planilha para SimpliRoute">
            <i class="ph ph-file-xls"></i> Exportar SimpliRoute
          </button>
        </div>
      </div>

      <!-- STATS BAR -->
      <div id="frota-stats" style="display:none; gap:12px; margin-bottom:1.5rem; flex-wrap:wrap;"></div>

      <!-- CARDS -->
      <div id="frota-cards" style="display:flex; flex-direction:column; gap:1.5rem;">
        <div style="text-align:center; padding:4rem; color:#94a3b8;">
          <i class="ph ph-truck" style="font-size:3rem;"></i>
          <p style="margin-top:1rem; font-size:1rem;">Selecione uma data e clique em Buscar para carregar os veículos do dia.</p>
        </div>
      </div>
    </div>`;

    // Auto-busca desabilitada aqui - use o botão Buscar
}

let frotaDados = {}; // cache global para exportação

async function buscarFrota() {
    const data = document.getElementById('frota-data-filtro')?.value;
    if (!data) return;

    const cards = document.getElementById('frota-cards');
    const stats = document.getElementById('frota-stats');
    if (!cards) return;

    cards.innerHTML = `<div style="text-align:center;padding:3rem;color:#64748b;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><p>Carregando frota...</p></div>`;
    if (stats) stats.style.display = 'none';

    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    try {
        const resp = await fetch(`/api/logistica/frota?data=${encodeURIComponent(data)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(await resp.text());
        const dados = await resp.json();
        frotaDados = dados;
        renderFrotaCards(dados, data);
    } catch (e) {
        cards.innerHTML = `<div style="text-align:center;padding:3rem;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p>${e.message}</p></div>`;
    }
}

function getCorServico(tipo) {
    const t = (tipo || '').toUpperCase();
    if (t.includes('ENTREGA')) return { bg: '#bbf7d0', text: '#166534', icon: '🟢' };
    if (t.includes('RETIRADA')) return { bg: '#fef9c3', text: '#854d0e', icon: '🟡' };
    if (t.includes('LIMPA FOSSA')) return { bg: '#bfdbfe', text: '#1e40af', icon: '💧' };
    if (t.includes('REPARO')) return { bg: '#fed7aa', text: '#9a3412', icon: '🔧' };
    if (t.includes('VISITA')) return { bg: '#fde68a', text: '#92400e', icon: '⚙️' };
    if (t.includes('VAC')) return { bg: '#e2e8f0', text: '#334155', icon: '🏗️' };
    if (t.includes('MANUTENCAO') || t.includes('MANUTENÇÃO')) return { bg: '#e2e8f0', text: '#334155', icon: '🔩' };
    return { bg: '#f1f5f9', text: '#475569', icon: '📋' };
}

function getEmoji(tipoServico) {
    const t = (tipoServico || '').toUpperCase();
    if (t.includes('ENTREGA')) return '🟢';
    if (t.includes('RETIRADA')) return '🔴';
    if (t.includes('LIMPA FOSSA')) return '💧';
    if (t.includes('REPARO')) return '🔧';
    if (t.includes('VISITA')) return '⚙️';
    if (t.includes('VAC')) return '🏗️';
    if (t.includes('MANUTENCAO') || t.includes('MANUTENÇÃO')) return '🔩';
    return '📋';
}

function construirAnotacoes(rotas) {
    const lines = [];

    // Variáveis únicas
    const varSet = new Set();
    rotas.forEach(r => {
        (r.variaveis || []).forEach(v => {
            const vUp = v.trim().toUpperCase().replace(/[^A-Z\s]/g, '').trim();
            for (const [key, em] of Object.entries(FROTA_VARIAVEIS)) {
                if (vUp === key) { varSet.add(`${em} ${v.trim()}`); break; }
            }
        });
    });
    if (varSet.size > 0) {
        lines.push([...varSet].join('\n'));
        lines.push('-----------------------');
    }

    // Produtos agrupados por tipo de serviço
    const agrupado = {};
    rotas.forEach(r => {
        const tipo = (r.tipo_servico || 'NÃO INFORMADO').toUpperCase();
        (r.produtos || []).forEach(p => {
            const desc = (p.desc || '').trim().toUpperCase();
            if (!desc) return;
            const qtd = parseInt(p.qtd) || 1;
            if (!agrupado[tipo]) agrupado[tipo] = {};
            agrupado[tipo][desc] = (agrupado[tipo][desc] || 0) + qtd;
        });
    });

    const categorias = ['ENTREGA', 'RETIRADA', 'MANUTENCAO', 'LIMPA FOSSA', 'REPARO', 'VISITA', 'VAC', 'OUTROS'];
    categorias.forEach(cat => {
        Object.entries(agrupado).forEach(([tipo, prods]) => {
            const pertence = cat === 'OUTROS'
                ? !['ENTREGA','RETIRADA','MANUTENCAO','LIMPA FOSSA','REPARO','VISITA','VAC'].some(x => tipo.includes(x))
                : tipo.includes(cat);
            if (!pertence) return;
            const emoji = getEmoji(tipo);
            Object.entries(prods).forEach(([desc, qtd]) => {
                const icProd = FROTA_EQUIPAMENTOS[desc]?.icone || '';
                lines.push(`${icProd ? icProd + ' ' : ''}${emoji} ${tipo} - ${qtd} × ${desc}`);
            });
            lines.push('-----------------------');
        });
    });

    // Motorista/Ajudante (usa primeiro registro)
    const mot = (rotas[0]?.responsavel || '').trim();
    if (mot) lines.push(`Motorista: ${mot}`);

    return lines.join('\n');
}

function renderFrotaCards(dados, data) {
    const cards = document.getElementById('frota-cards');
    const stats = document.getElementById('frota-stats');
    if (!cards) return;

    // Cleanup old maps
    Object.values(frotaMaps).forEach(m => { try { m.remove(); } catch(e) {} });
    frotaMaps = {};

    const veiculos = Object.keys(dados);
    if (veiculos.length === 0) {
        cards.innerHTML = `<div style="text-align:center;padding:4rem;color:#94a3b8;"><i class="ph ph-truck" style="font-size:3rem;"></i><p>Nenhuma OS encontrada para ${data}.</p></div>`;
        return;
    }

    // Stats
    if (stats) {
        const totalOs = veiculos.reduce((a, v) => a + dados[v].rotas.length, 0);
        const totalProd = veiculos.reduce((a, v) => a + dados[v].totalQtd, 0);
        stats.style.display = 'flex';
        stats.innerHTML = `
            <div style="background:white;border-radius:10px;padding:12px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:10px;">
                <i class="ph ph-truck" style="font-size:1.5rem;color:#2d9e5f;"></i>
                <div><div style="font-size:0.72rem;color:#64748b;">Veículos</div><div style="font-size:1.4rem;font-weight:800;">${veiculos.length}</div></div>
            </div>
            <div style="background:white;border-radius:10px;padding:12px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:10px;">
                <i class="ph ph-clipboard-text" style="font-size:1.5rem;color:#3b82f6;"></i>
                <div><div style="font-size:0.72rem;color:#64748b;">Total OS</div><div style="font-size:1.4rem;font-weight:800;">${totalOs}</div></div>
            </div>
            <div style="background:white;border-radius:10px;padding:12px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:10px;">
                <i class="ph ph-package" style="font-size:1.5rem;color:#f59e0b;"></i>
                <div><div style="font-size:0.72rem;color:#64748b;">Total Produtos</div><div style="font-size:1.4rem;font-weight:800;">${totalProd}</div></div>
            </div>`;
    }

    // Cores por veículo
    const paleta = ['#FFEBEE','#E3F2FD','#E8F5E9','#FFF8E1','#F3E5F5','#E0F7FA','#FBE9E7','#EDE7F6'];

    cards.innerHTML = veiculos.map((veiculo, idx) => {
        const d = dados[veiculo];
        const cor = paleta[idx % paleta.length];
        const mapId = `frota-map-${idx}`;

        const servicosBadges = Object.entries(d.servicosContagem).map(([tipo, qtd]) => {
            const c = getCorServico(tipo);
            return `<span style="background:${c.bg};color:${c.text};padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;white-space:nowrap;">${c.icon} ${tipo}: ${qtd}</span>`;
        }).join('');

        const prodRows = Object.entries(d.produtosContagem).map(([desc, qtd]) => {
            const icone = FROTA_EQUIPAMENTOS[desc]?.icone || '📦';
            return `<tr>
                <td style="padding:4px 8px;font-size:0.8rem;">${icone} ${desc}</td>
                <td style="padding:4px 8px;text-align:center;font-size:0.8rem;font-weight:700;">${qtd}</td>
            </tr>`;
        }).join('');

        const osRows = d.rotas.map(r => {
            const c = getCorServico(r.tipo_servico);
            return `<div style="background:${c.bg};border-radius:6px;padding:6px 10px;margin-bottom:4px;font-size:0.78rem;">
                <span style="font-weight:700;">${r.numero_os}</span> — ${r.cliente}
                <span style="float:right;font-size:0.7rem;color:${c.text};">${c.icon} ${r.tipo_servico || '—'}</span>
            </div>`;
        }).join('');

        return `
        <div style="background:${cor};border-radius:14px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.05);">
            <!-- Cabeçalho veículo -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="background:#1e3a5f;color:white;border-radius:8px;padding:6px 14px;font-size:1rem;font-weight:800;letter-spacing:1px;">🚛 ${veiculo}</span>
                    <span style="background:#2d9e5f;color:white;border-radius:20px;padding:3px 10px;font-size:0.75rem;font-weight:700;">${d.rotas.length} OS · ${d.totalQtd} produtos</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">${servicosBadges}</div>
            </div>

            <!-- Corpo: 3 colunas -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:1rem;">
                <!-- Col 1: Produtos -->
                <div style="background:white;border-radius:10px;padding:1rem;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                    <p style="margin:0 0 8px;font-size:0.78rem;font-weight:700;color:#475569;text-transform:uppercase;">📦 Produtos</p>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr>
                            <th style="padding:4px 8px;text-align:left;font-size:0.7rem;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Descrição</th>
                            <th style="padding:4px 8px;text-align:center;font-size:0.7rem;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Qtd</th>
                        </tr></thead>
                        <tbody>${prodRows || '<tr><td colspan="2" style="text-align:center;color:#94a3b8;font-size:0.78rem;padding:10px;">Sem produtos</td></tr>'}</tbody>
                    </table>
                </div>

                <!-- Col 2: OSs do veículo -->
                <div style="background:white;border-radius:10px;padding:1rem;box-shadow:0 1px 4px rgba(0,0,0,0.06);overflow-y:auto;max-height:300px;">
                    <p style="margin:0 0 8px;font-size:0.78rem;font-weight:700;color:#475569;text-transform:uppercase;">📋 Ordens de Serviço</p>
                    ${osRows}
                </div>

                <!-- Col 3: Mapa -->
                <div style="border-radius:10px;overflow:hidden;position:relative;min-height:240px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
                    <div id="${mapId}" style="height:100%;min-height:240px;"></div>
                    <button onclick="frotaZoom('${mapId}',1)" style="position:absolute;right:10px;bottom:48px;z-index:1000;background:white;border:1px solid #e2e8f0;border-radius:4px;width:28px;height:28px;cursor:pointer;font-weight:bold;font-size:1rem;">+</button>
                    <button onclick="frotaZoom('${mapId}',-1)" style="position:absolute;right:10px;bottom:16px;z-index:1000;background:white;border:1px solid #e2e8f0;border-radius:4px;width:28px;height:28px;cursor:pointer;font-weight:bold;font-size:1rem;">−</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Inicializa mapas Leaflet após render
    setTimeout(() => {
        veiculos.forEach((veiculo, idx) => {
            const d = dados[veiculo];
            const mapId = `frota-map-${idx}`;
            const el = document.getElementById(mapId);
            if (!el) return;

            const pontos = d.rotas
                .filter(r => r.lat && r.lng)
                .map(r => [parseFloat(r.lat), parseFloat(r.lng)]);

            const centro = pontos.length > 0 ? pontos[0] : [DEPOSITO_LAT, DEPOSITO_LNG];

            const map = L.map(mapId, { zoomControl: false }).setView(centro, 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OSM', maxZoom: 19
            }).addTo(map);
            frotaMaps[mapId] = map;

            // Depósito
            L.circleMarker([DEPOSITO_LAT, DEPOSITO_LNG], { color: '#1e3a5f', fillColor: '#1e3a5f', fillOpacity: 1, radius: 8 })
                .addTo(map).bindPopup('🏭 Depósito (Saída/Retorno)');

            // Markers por OS
            d.rotas.filter(r => r.lat && r.lng).forEach((r, i) => {
                const c = getCorServico(r.tipo_servico);
                const icon = L.divIcon({
                    className: '',
                    html: `<div style="background:${c.bg};color:${c.text};border:2px solid ${c.text};border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;">${i + 1}</div>`,
                    iconSize: [26, 26], iconAnchor: [13, 13]
                });
                L.marker([parseFloat(r.lat), parseFloat(r.lng)], { icon })
                    .addTo(map)
                    .bindPopup(`<b>OS ${r.numero_os}</b><br>${r.cliente}<br>${r.tipo_servico || '—'}`);
            });

            // Polyline
            if (pontos.length > 1) {
                const allPts = [[DEPOSITO_LAT, DEPOSITO_LNG], ...pontos, [DEPOSITO_LAT, DEPOSITO_LNG]];
                L.polyline(allPts, { color: '#2d9e5f', weight: 3, opacity: 0.8, dashArray: '6,4' }).addTo(map);
                map.fitBounds(L.latLngBounds(allPts), { padding: [20, 20] });
            }
        });
    }, 300);
}

function frotaZoom(mapId, delta) {
    const map = frotaMaps[mapId];
    if (map) map.setZoom(map.getZoom() + delta);
}

// ─────────────────────────────────────────────
// EXPORTAÇÃO para SimpliRoute (xlsx)
// ─────────────────────────────────────────────
function exportarSimpliroute() {
    if (!frotaDados || Object.keys(frotaDados).length === 0) {
        alert('Busque os dados antes de exportar.');
        return;
    }

    // Monta CSV (SimpliRoute aceita CSV ou XLSX)
    const cabecalho = [
        'Título', 'Endereço', 'Carga',
        'Janela de horário inicial', 'Janela de horário final', 'Tempo de serviço',
        'Anotações', 'Latitude', 'Longitude',
        'Habilidade necessária', 'Habilidade opcional',
        'Pessoa de contato', 'Telefone de contato',
        'Janela de horário inicial 2', 'Janela de horário final 2',
        'Capacidade 2', 'Capacidade 3', 'SMS', 'Correio eletrônico de contato',
        'Carga pick', 'Carga pick 2', 'Carga pick 3',
        'Data Agendamento', 'Tipo de visita'
    ];

    const linhas = [cabecalho];
    let endCounter = 1;

    const veiculos = Object.keys(frotaDados);
    veiculos.forEach(veiculo => {
        const d = frotaDados[veiculo];
        const anotacoes = construirAnotacoes(d.rotas);
        const carga = d.totalQtd;
        const habs = [...new Set(d.rotas.flatMap(r => r.habilidades || []))].join(', ');
        const contato = d.rotas[0]?.responsavel || '';
        const tel = d.rotas[0]?.telefone || '';

        // Linha Saída
        linhas.push([
            `${veiculo} - Saída`, endCounter, carga,
            '', '', '',
            anotacoes,
            DEPOSITO_LAT, DEPOSITO_LNG,
            habs, '', contato, tel,
            '', '', '', '', tel, '',
            '', '', '', '', ''
        ]);

        // Linha Retorno
        linhas.push([
            `${veiculo} - Retorno`, endCounter, '',
            '', '', '',
            '',
            DEPOSITO_LAT, DEPOSITO_LNG,
            '', '', '', '',
            '', '', '', '', '', '',
            '', '', '', '', ''
        ]);

        endCounter++;
    });

    // Gera CSV com BOM para Excel reconhecer UTF-8
    const csvContent = '\uFEFF' + linhas.map(row =>
        row.map(c => {
            const val = (c === null || c === undefined) ? '' : String(c);
            return '"' + val.replace(/"/g, '""') + '"';
        }).join(';')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const data = document.getElementById('frota-data-filtro')?.value || 'frota';
    a.href = url;
    a.download = `SimpliRoute_${data}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// renderFrotaResumo() is triggered by app.js navigateTo hook
