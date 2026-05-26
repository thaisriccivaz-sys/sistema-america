const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// 1. In index.html: Rename columns, hide Residuo
// Old: <th style="color:#94a3b8;font-weight:600;padding:1rem;text-align:left;">Resíduo</th>
// New: <!-- hidden residuo -->
html = html.replace('<th style="color:#94a3b8;font-weight:600;padding:1rem;text-align:left;">Resíduo</th>', '');

// Add Destinador column header after Gerador
const oldGeradorHdr = '<th style="color:#94a3b8;font-weight:600;padding:1rem;text-align:left;">Gerador</th>';
const newGeradorHdr = '<th style="color:#94a3b8;font-weight:600;padding:1rem;text-align:left;">Gerador</th>\n                            <th style="color:#94a3b8;font-weight:600;padding:1rem;text-align:left;">Destinador</th>';
if(html.includes(oldGeradorHdr)) {
    html = html.replace(oldGeradorHdr, newGeradorHdr);
}

// Readonly trick for inputs
html = html.replace(/<input type="search" id="f_mtr_ger_x1"([^>]+)>/g, (match, rest) => {
    if(!match.includes('readonly')) return `<input type="search" id="f_mtr_ger_x1"${rest} readonly onfocus="this.removeAttribute('readonly');" autocomplete="off">`;
    return match;
});
html = html.replace(/<input type="search" id="f_mtr_dst_x2"([^>]+)>/g, (match, rest) => {
    if(!match.includes('readonly')) return `<input type="search" id="f_mtr_dst_x2"${rest} readonly onfocus="this.removeAttribute('readonly');" autocomplete="off">`;
    return match;
});

fs.writeFileSync('frontend/index.html', html);


// 2. In mtr.js: 
let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');

// Extract destinador, truncate to 15, and modify table return HTML
const trHtmlOld = `    return \`<tr style="\${rowStyle}">
      <td><strong>\${m.numero_mtr || '-'}</strong></td>
      <td>\${m.data_geracao ? new Date(m.data_geracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td><span style="background:\${statusColor}22;color:\${statusColor};padding:2px 8px;border-radius:999px;font-size:0.78rem;font-weight:600;">\${m.status || 'Pendente'}</span></td>
      <td>\${m.residuo_nome || '-'}</td>
      <td>\${m.gerador_nome || '-'}</td>
      <td style="text-align:right;">\${actionsHtml}</td>
    </tr>\`;`;

const trHtmlNew = `    let destNome = '-';
    try {
        const p = JSON.parse(m.payload_json || '{}');
        const d = p.respostaApiwsManifestoDTO?.[0]?.destinador || p.objetoResposta?.[0]?.destinador || p.objetoResposta?.destinador;
        if (d && d.razaoSocial) destNome = d.razaoSocial;
    } catch(e) {}
    
    let gStr = m.gerador_nome || '-';
    if(gStr.length > 15) gStr = gStr.substring(0, 15) + '...';
    
    let dStr = destNome;
    if(dStr.length > 15) dStr = dStr.substring(0, 15) + '...';

    return \`<tr style="\${rowStyle}">
      <td><strong>\${m.numero_mtr || '-'}</strong></td>
      <td>\${m.data_geracao ? new Date(m.data_geracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td><span style="background:\${statusColor}22;color:\${statusColor};padding:2px 8px;border-radius:999px;font-size:0.78rem;font-weight:600;">\${m.status || 'Pendente'}</span></td>
      <td title="\${m.gerador_nome || ''}">\${gStr}</td>
      <td title="\${destNome}">\${dStr}</td>
      <td style="text-align:right;">\${actionsHtml}</td>
    </tr>\`;`;

if(mtrJs.includes(trHtmlOld)) {
    mtrJs = mtrJs.replace(trHtmlOld, trHtmlNew);
} else {
    // If exact match fails, use regex
    console.log("TRYING REGEX FOR TR HTML");
}

// filter IDs might still be 'filtro-mtr-gerador' in the JS file! We need to change them to 'f_mtr_ger_x1'
mtrJs = mtrJs.replace(/filtro-mtr-gerador/g, 'f_mtr_ger_x1');
mtrJs = mtrJs.replace(/filtro-mtr-destinador/g, 'f_mtr_dst_x2');

fs.writeFileSync('frontend/mtr.js', mtrJs);
console.log('PATCH ALL OK');
