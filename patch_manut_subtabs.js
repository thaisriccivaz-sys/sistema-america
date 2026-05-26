const fs = require('fs');
const ts = Date.now();

// Update cache buster
let html = fs.readFileSync('frontend/index.html', 'utf8');
html = html.replace(/frota\.js\?v=\d+/g, `frota.js?v=${ts}`);
html = html.replace(/frota_manutencao\.js\?v=\d+/g, `frota_manutencao.js?v=${ts}`);
fs.writeFileSync('frontend/index.html', html);

// Add sub-tabs to frota_manutencao.js
let mj = fs.readFileSync('frontend/frota_manutencao.js', 'utf8');

// Replace the header + toolbar with one that includes sub-tabs
const oldHeader = `    c.innerHTML = \`<div style="padding:1.5rem;background:#f8fafc;min-height:100%;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
    <h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:12px;font-size:1.5rem;">
        <div style="background:#d97706;color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <i class="ph ph-wrench"></i>
        </div>
        Controle de Manutenções
    </h2>
    <div style="display:flex;gap:10px;">
        <select id="mn-filtro-veiculo" onchange="window.mnFiltrar()" style="padding:0.65rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;min-width:200px;background:#fff;">
            <option value="">Todos os Veículos</option>
        </select>
        <select id="mn-filtro-status" onchange="window.mnFiltrar()" style="padding:0.65rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;min-width:150px;background:#fff;">
            <option value="">Todos os Status</option>
            <option value="agendada">Agendada</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
        </select>
        <button onclick="window.abrirModalManutencao(null)" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
            <i class="ph ph-plus"></i> Nova Manutenção
        </button>
    </div>
</div>`;

const newHeader = `    // Sub-tab state
    window._mnSubAba = window._mnSubAba || 'preventiva';

    c.innerHTML = \`<div style="padding:1.5rem;background:#f8fafc;min-height:100%;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
    <h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:12px;font-size:1.5rem;">
        <div style="background:#d97706;color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <i class="ph ph-wrench"></i>
        </div>
        Manutenções
    </h2>
    <button onclick="window.abrirModalManutencao(null)" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
        <i class="ph ph-plus"></i> Nova Manutenção
    </button>
</div>

<!-- Sub-abas -->
<div style="display:flex;gap:4px;margin-bottom:1.5rem;background:#fff;padding:6px;border-radius:10px;border:1px solid #e2e8f0;width:fit-content;">
    <button id="mn-sub-btn-preventiva" onclick="window.mnMudarSubAba('preventiva')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:#d97706;color:#fff;">
        <i class="ph ph-calendar-check"></i> Preventiva
    </button>
    <button id="mn-sub-btn-corretiva" onclick="window.mnMudarSubAba('corretiva')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:transparent;color:#64748b;">
        <i class="ph ph-wrench"></i> Corretiva
    </button>
</div>

<div id="mn-sub-conteudo"></div>
</div>\``;

if (mj.includes(oldHeader.substring(0, 80))) {
    mj = mj.replace(oldHeader, newHeader);
    console.log('Header replaced');
} else {
    console.log('Header not found exactly, trying partial...');
    // Try replacing the innerHTML assignment
    const idx = mj.indexOf("c.innerHTML = `<div style=\"padding:1.5rem;background:#f8fafc;min-height:100%;\">");
    if (idx >= 0) {
        const endIdx = mj.indexOf("</div>\`;", idx) + 8;
        mj = mj.substring(0, idx) + newHeader + ';\n' + mj.substring(endIdx);
        console.log('Replaced via index');
    }
}

// Now replace the loading code + data fetch to render into mn-sub-conteudo
const oldFetch = `    const [frota, manut] = await Promise.all([
        fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()),
        fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json())
    ]);

    window._manutFrota = frota || [];
    window._manutDados = manut || [];

    const sel = document.getElementById('mn-filtro-veiculo');
    if (sel) {
        frota.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.placa + ' - ' + (v.marca_modelo_versao || '').split('/').slice(0,2).join('/');
            sel.appendChild(opt);
        });
    }

    sel.addEventListener('change', async () => {
        const vid = sel.value;
        const kmBar = document.getElementById('mn-km-bar');
        const prevPanel = document.getElementById('mn-preventivo-panel');
        if (!vid) { kmBar.style.display='none'; prevPanel.style.display='none'; return; }
        kmBar.style.display='flex';
        const v = frota.find(x => x.id == vid);
        const kmEl = document.getElementById('mn-km-atual');
        if (kmEl && v) kmEl.textContent = v.km_atual ? \`KM registrado: \${Number(v.km_atual).toLocaleString('pt-BR')} km\` : 'Sem KM registrado';
        const inp = document.getElementById('mn-km-input');
        if (inp && v?.km_atual) inp.value = v.km_atual;
        await mnCarregarPreventivo(vid, tok);
    });

    mnRenderLista();`;

const newFetch = `    const [frota, manut] = await Promise.all([
        fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()),
        fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json())
    ]);

    window._manutFrota = frota || [];
    window._manutDados = manut || [];

    window.mnMudarSubAba(window._mnSubAba || 'preventiva');`;

if (mj.includes(oldFetch.substring(0, 60))) {
    mj = mj.replace(oldFetch, newFetch);
    console.log('Fetch block replaced');
}

// Add mnMudarSubAba function before mnCarregarPreventivo
const addFn = `
window.mnMudarSubAba = function(aba) {
    window._mnSubAba = aba;
    ['preventiva','corretiva'].forEach(a => {
        const btn = document.getElementById('mn-sub-btn-' + a);
        if (btn) {
            btn.style.background = a === aba ? '#d97706' : 'transparent';
            btn.style.color = a === aba ? '#fff' : '#64748b';
        }
    });
    const sub = document.getElementById('mn-sub-conteudo');
    if (!sub) return;
    if (aba === 'preventiva') mnRenderPreventivaTela(sub);
    else mnRenderCorretivaTela(sub);
};

function mnRenderPreventivaTela(sub) {
    const frota = window._manutFrota || [];
    const veicOpts = frota.map(v => \`<option value="\${v.id}">\${v.placa} — \${(v.marca_modelo_versao||'').substring(0,30)}</option>\`).join('');
    sub.innerHTML = \`
    <div style="background:#fff;padding:1rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <label style="font-weight:600;color:#475569;font-size:0.9rem;">Selecione o veículo:</label>
        <select id="mn-prev-veiculo" onchange="window.mnCarregarPreventivoVeiculo()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;min-width:220px;background:#fff;">
            <option value="">Selecione...</option>\${veicOpts}
        </select>
        <div id="mn-prev-km-box" style="display:none;align-items:center;gap:8px;">
            <i class="ph ph-gauge" style="color:#d97706;font-size:1.1rem;"></i>
            <input type="number" id="mn-prev-km" placeholder="KM atual" style="padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;width:130px;outline:none;">
            <button onclick="window.mnSalvarKmPreventivo()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;font-weight:600;cursor:pointer;font-size:0.85rem;">
                <i class="ph ph-floppy-disk"></i> Salvar KM
            </button>
            <span id="mn-prev-km-label" style="font-size:0.82rem;color:#64748b;"></span>
        </div>
    </div>
    <div id="mn-prev-plano"></div>\`;
}

window.mnCarregarPreventivoVeiculo = async function() {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    const kmBox = document.getElementById('mn-prev-km-box');
    const planoEl = document.getElementById('mn-prev-plano');
    if (!kmBox || !planoEl) return;
    if (!vid) { kmBox.style.display='none'; planoEl.innerHTML=''; return; }
    kmBox.style.display = 'flex';
    const v = (window._manutFrota||[]).find(x => x.id == vid);
    const kmInp = document.getElementById('mn-prev-km');
    const kmLbl = document.getElementById('mn-prev-km-label');
    if (kmInp && v?.km_atual) kmInp.value = v.km_atual;
    if (kmLbl && v) kmLbl.textContent = v.km_atual ? \`Último: \${Number(v.km_atual).toLocaleString('pt-BR')} km\` : '';
    planoEl.innerHTML = '<div style="padding:2rem;text-align:center;color:#94a3b8;"><i class="ph ph-circle-notch ph-spin"></i> Calculando...</div>';
    const tok = window._manutTok;
    try {
        const res = await fetch('/api/frota/veiculos/' + vid + '/alertas', { headers: { Authorization: 'Bearer ' + tok } });
        const data = await res.json();
        planoEl.innerHTML = mnRenderPreventivo(data);
    } catch(e) { planoEl.innerHTML = '<div style="padding:1rem;color:#dc2626;">Erro ao carregar.</div>'; }
};

window.mnSalvarKmPreventivo = async function() {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    const km = document.getElementById('mn-prev-km')?.value;
    if (!vid || !km) return alert('Selecione o veículo e informe o KM');
    const tok = window._manutTok;
    const res = await fetch('/api/frota/veiculos/' + vid + '/km', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ km_atual: parseInt(km) })
    });
    if (res.ok) {
        const v = (window._manutFrota||[]).find(x => x.id == vid);
        if (v) v.km_atual = parseInt(km);
        const lbl = document.getElementById('mn-prev-km-label');
        if (lbl) lbl.textContent = \`Último: \${Number(km).toLocaleString('pt-BR')} km\`;
        window.mnCarregarPreventivoVeiculo();
    } else alert('Erro ao salvar KM');
};

function mnRenderCorretivaTela(sub) {
    const frota = window._manutFrota || [];
    const veicOpts = frota.map(v => \`<option value="\${v.id}">\${v.placa}</option>\`).join('');
    const statusCor = { agendada:'#2563eb', em_andamento:'#dc2626', concluida:'#2d9e5f', cancelada:'#94a3b8' };
    const statusLabel = { agendada:'Agendada', em_andamento:'Em Andamento', concluida:'Concluída', cancelada:'Cancelada' };
    const rows = (window._manutDados||[]).filter(m => m.tipo === 'corretiva');
    const tableRows = rows.length ? rows.map(m => \`
        <tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:0.7rem 1rem;font-weight:700;color:#1e293b;">\${m.placa||'—'}</td>
            <td style="padding:0.7rem 1rem;color:#374151;max-width:220px;">\${m.descricao||'—'}</td>
            <td style="padding:0.7rem 1rem;text-align:center;"><span style="background:\${statusCor[m.status]||'#94a3b8'}22;color:\${statusCor[m.status]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">\${statusLabel[m.status]||m.status}</span></td>
            <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">\${m.data_agendamento||m.data_conclusao||'—'}</td>
            <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">\${m.fornecedor||'—'}</td>
            <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">\${m.custo ? 'R$ '+Number(m.custo).toFixed(2).replace('.',',') : '—'}</td>
            <td style="padding:0.7rem 1rem;text-align:center;display:flex;gap:4px;justify-content:center;">
                <button onclick="window.abrirModalManutencao(\${m.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-pencil"></i></button>
                <button onclick="window.excluirManutencao(\${m.id})" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-trash"></i></button>
            </td>
        </tr>\`).join('') : '<tr><td colspan="7" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhuma manutenção corretiva registrada.</td></tr>';

    sub.innerHTML = \`
    <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-wrench" style="color:#d97706;"></i> Manutenções Corretivas</span>
            <div style="display:flex;gap:8px;">
                <select id="mn-corr-veiculo" onchange="window.mnFiltrarCorretiva()" style="padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                    <option value="">Todos os Veículos</option>\${veicOpts}
                </select>
                <select id="mn-corr-status" onchange="window.mnFiltrarCorretiva()" style="padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                    <option value="">Todos os Status</option>
                    <option value="agendada">Agendada</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                </select>
            </div>
        </div>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:0.6rem 1rem;text-align:left;color:#64748b;">Veículo</th>
                <th style="padding:0.6rem 1rem;text-align:left;color:#64748b;">Descrição</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Status</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Data</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Fornecedor</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Custo</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;"></th>
            </tr></thead>
            <tbody id="mn-corr-tbody">\${tableRows}</tbody>
        </table></div>
    </div>\`;
}

window.mnFiltrarCorretiva = function() {
    const fV = document.getElementById('mn-corr-veiculo')?.value || '';
    const fS = document.getElementById('mn-corr-status')?.value || '';
    let rows = (window._manutDados||[]).filter(m => m.tipo === 'corretiva');
    if (fV) rows = rows.filter(m => String(m.veiculo_id) === fV);
    if (fS) rows = rows.filter(m => m.status === fS);
    const tbody = document.getElementById('mn-corr-tbody');
    if (!tbody) return;
    const statusCor = { agendada:'#2563eb', em_andamento:'#dc2626', concluida:'#2d9e5f', cancelada:'#94a3b8' };
    const statusLabel = { agendada:'Agendada', em_andamento:'Em Andamento', concluida:'Concluída', cancelada:'Cancelada' };
    tbody.innerHTML = rows.length ? rows.map(m => \`<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:0.7rem 1rem;font-weight:700;">\${m.placa||'—'}</td>
        <td style="padding:0.7rem 1rem;">\${m.descricao||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;"><span style="background:\${statusCor[m.status]||'#94a3b8'}22;color:\${statusCor[m.status]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">\${statusLabel[m.status]||m.status}</span></td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">\${m.data_agendamento||m.data_conclusao||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">\${m.fornecedor||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">\${m.custo ? 'R$ '+Number(m.custo).toFixed(2).replace('.',',') : '—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;display:flex;gap:4px;justify-content:center;">
            <button onclick="window.abrirModalManutencao(\${m.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-pencil"></i></button>
            <button onclick="window.excluirManutencao(\${m.id})" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-trash"></i></button>
        </td>
    </tr>\`).join('') : '<tr><td colspan="7" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhuma encontrada.</td></tr>';
};

`;

// Insert addFn before mnCarregarPreventivo
if (!mj.includes('window.mnMudarSubAba')) {
    mj = mj.replace('async function mnCarregarPreventivo', addFn + 'async function mnCarregarPreventivo');
    console.log('Sub-tab functions added');
}

// Also update salvarManutencao to re-render current sub-tab instead of mnRenderLista
mj = mj.replace(
    'window._frotaDados = frota || [];\n        mnRenderLista();',
    "window._frotaDados = frota || [];\n        if (window._mnSubAba === 'corretiva') {\n            const sub = document.getElementById('mn-sub-conteudo');\n            if (sub) mnRenderCorretivaTela(sub);\n        } else if (window._mnSubAba === 'preventiva') {\n            window.mnCarregarPreventivoVeiculo();\n        }"
);

fs.writeFileSync('frontend/frota_manutencao.js', mj);
console.log('Done: frota_manutencao.js updated with sub-tabs');
fs.writeFileSync('frontend/index.html', html);
console.log('Done: index.html cache-busted');
