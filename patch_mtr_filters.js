const fs = require('fs');

// 1. PATCH INDEX.HTML
let html = fs.readFileSync('frontend/index.html', 'utf8');

const oldSearchBlock = `<div class="mb-3" style="position:relative;">
                            <i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                            <input type="search" autocomplete="off" name="mtr_busca" spellcheck="false" placeholder="Pesquisar MTR por número, OS ou gerador..." oninput="window.filtrarMTR(this.value)" style="width:100%;padding:0.55rem 0.75rem 0.55rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                        </div>`;

const newFiltersBlock = `<div class="filter-group mb-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Número MTR</label>
                                <input type="text" id="filtro-mtr-numero" autocomplete="off" oninput="window.filtrarMTR()" placeholder="Ex: 2600..." style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Gerador (Cliente)</label>
                                <input type="text" id="filtro-mtr-gerador" autocomplete="off" oninput="window.filtrarMTR()" placeholder="Nome da empresa..." style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Destinador</label>
                                <input type="text" id="filtro-mtr-destinador" autocomplete="off" oninput="window.filtrarMTR()" placeholder="Nome do destinador..." style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Data Início</label>
                                <input type="date" id="filtro-mtr-data-ini" onchange="window.filtrarMTR()" style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Data Fim</label>
                                <input type="date" id="filtro-mtr-data-fim" onchange="window.filtrarMTR()" style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;">
                            </div>
                        </div>`;

if (html.includes('name="mtr_busca"')) {
    html = html.replace(oldSearchBlock, newFiltersBlock);
    fs.writeFileSync('frontend/index.html', html);
    console.log('INDEX OK');
} else {
    console.log('INDEX FAIL: old search block not found');
}

// 2. PATCH MTR.JS
let js = fs.readFileSync('frontend/mtr.js', 'utf8');

// Update filtrarMTR function
const oldFiltrar = /window\.filtrarMTR = function \((?:termo)?\) \{[\s\S]*?\n\};/;
const newFiltrar = `window.filtrarMTR = function () {
  const num = (document.getElementById('filtro-mtr-numero')?.value || '').toLowerCase();
  const ger = (document.getElementById('filtro-mtr-gerador')?.value || '').toLowerCase();
  const dest = (document.getElementById('filtro-mtr-destinador')?.value || '').toLowerCase();
  const dtIni = document.getElementById('filtro-mtr-data-ini')?.value;
  const dtFim = document.getElementById('filtro-mtr-data-fim')?.value;

  const filtrado = _mtrListaCache.filter(m => {
    let match = true;
    if (num && !(m.numero_mtr || '').toLowerCase().includes(num)) match = false;
    if (ger && !(m.gerador_nome || '').toLowerCase().includes(ger)) match = false;
    
    // Destinador is stored inside payload_json in DB (m.payload_json). We parse it if we need to search it.
    if (dest) {
        let destNome = '';
        try {
            const p = JSON.parse(m.payload_json || '{}');
            const d = p.respostaApiwsManifestoDTO?.[0]?.destinador || p.objetoResposta?.[0]?.destinador || p.objetoResposta?.destinador;
            if (d && d.razaoSocial) destNome = d.razaoSocial;
        } catch(e) {}
        if (!destNome.toLowerCase().includes(dest)) match = false;
    }

    if (dtIni || dtFim) {
        const dtStr = (m.data_geracao || '').split('T')[0];
        if (dtStr) {
            if (dtIni && dtStr < dtIni) match = false;
            if (dtFim && dtStr > dtFim) match = false;
        } else {
            match = false;
        }
    }

    return match;
  });
  renderTabelaMTR(filtrado);
};`;

if (oldFiltrar.test(js)) {
    js = js.replace(oldFiltrar, newFiltrar);
} else {
    // If we can't find it with regex, maybe the parameter is different
    const match = js.match(/window\.filtrarMTR = function.*\{[\s\S]*?renderTabelaMTR\(.*?\);\s*\n\};/);
    if(match) {
        js = js.replace(match[0], newFiltrar);
    } else {
        console.log("Could not find window.filtrarMTR in frontend/mtr.js");
    }
}

// Update renderTabelaMTR to highlight row if 'América Rental' is Gerador
const oldRender = /return `<tr(.*?)>\s*<td><strong>(.*?)<\/strong><\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/g;

// Instead of regex replacing the whole tr, let's parse the renderTabelaMTR function and rewrite it carefully.
const renderRegex = /function renderTabelaMTR\(lista\) \{[\s\S]*?\}\)\.join\(''\);\s*\n\}/;
const newRender = `function renderTabelaMTR(lista) {
  const tbody = document.getElementById('tabela-mtrs-body');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhuma MTR encontrada.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(m => {
    const statusColor = {
      'Ativo': '#10b981', 'Recebido': '#3b82f6', 'Cancelado': '#ef4444', 'Pendente': '#f59e0b'
    }[m.status] || '#64748b';
    
    let isAmerica = false;
    if (m.gerador_nome && m.gerador_nome.toLowerCase().includes('america rental')) {
        isAmerica = true;
    }
    
    const rowStyle = isAmerica ? 'background-color: #dcfce7;' : ''; // light green

    return \`<tr style="\${rowStyle}">
      <td><strong>\${m.numero_mtr || '-'}</strong></td>
      <td>\${m.data_geracao ? new Date(m.data_geracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td><span style="background:\${statusColor}22;color:\${statusColor};padding:2px 8px;border-radius:999px;font-size:0.78rem;font-weight:600;">\${m.status || 'Pendente'}</span></td>
      <td>\${m.residuo_nome || '-'}</td>
      <td>\${m.gerador_nome || '-'}</td>
      <td style="text-align:right;">
        \${m.numero_mtr ? \`<button onclick="window.downloadMTR(\${m.id})" class="btn btn-secondary" style="padding:3px 10px;font-size:0.78rem;margin-right:4px;"><i class="ph ph-download-simple"></i> PDF</button>\` : ''}
        \${m.status === 'Ativo' ? \`<button onclick="window.abrirReceberMTR(\${m.id})" class="btn btn-primary" style="padding:3px 10px;font-size:0.78rem;background:#3b82f6;"><i class="ph ph-check-circle"></i> Receber</button>\` : ''}
      </td>
    </tr>\`;
  }).join('');
}`;

if (renderRegex.test(js)) {
    js = js.replace(renderRegex, newRender);
    fs.writeFileSync('frontend/mtr.js', js);
    console.log('MTR JS OK');
} else {
    console.log('MTR JS FAIL: could not find renderTabelaMTR');
}
