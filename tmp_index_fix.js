const fs = require('fs');

let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const startStr = '<td style="padding:.55rem .75rem;text-align:center;">${transpBadge}</td>';
const endStr = '        </tr>`;';

const startIdx = code.indexOf(startStr);
if (startIdx === -1) {
    console.error('Start string not found!');
    process.exit(1);
}

const endIdx = code.indexOf(endStr, startIdx);
if (endIdx === -1) {
    console.error('End string not found!');
    process.exit(1);
}

const newCells = `<td style="padding:.55rem .75rem;text-align:center;background:#e0f2fe;">\${transpBadge}</td>
          <td style="padding:.45rem .4rem;text-align:center;background:#e0f2fe;">
            \${(!window._isVT((c.meio_transporte||'').toLowerCase()) && (c.meio_transporte||'') !== '') ? '<span style="color:#94a3b8;font-weight:600;">-</span>' : \`
            <input type="number" min="0" max="35" value="\${s.folgasVT||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.folgasVT||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas VT"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgasVT',this.value)">\`}
          </td>
          <td style="padding:.45rem .4rem;text-align:center;background:#e0f2fe;">
            <input type="number" min="0" max="35" value="\${s.faltasVT||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.faltasVT||0)>0?'#ef4444':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVT',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;background:#dcfce7;">
            <input type="number" min="0" max="35" value="\${s.diasExtra||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${s.diasExtra>0?'#8b5cf6':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'diasExtra',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;background:#dcfce7;">
            <input type="number" min="0" max="35" value="\${s.folgasVR||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.folgasVR||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas VR"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgasVR',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;background:#dcfce7;">
            <input type="number" min="0" max="35" value="\${s.faltasVR||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.faltasVR||0)>0?'#ef4444':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVR',this.value)">
          </td>
`;

code = code.substring(0, startIdx) + newCells + code.substring(endIdx);
fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Successfully replaced cells using exact index approach.');
