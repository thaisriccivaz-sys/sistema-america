const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

// 1. Update _recibosSelecoes default structure in tbody.innerHTML
code = code.replace(
  /const s    = _recibosSelecoes\[c\.id\] \|\| \{ selecionado:false, diasTrabalhados:0, diasVR:0, faltas:0, folgas:0, diasExtra:0, pontoStatus:null \};/g,
  'const s    = _recibosSelecoes[c.id] || { selecionado:false, diasTrabalhados:0, diasVR:0, faltas:0, folgas:0, diasExtra:0, pontoStatus:null, folgasVT:0, faltasVT:0, folgasVR:0, faltasVR:0 };'
);

// 2. Update Headers
const oldHeaders = `            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;display:none;" title="Dias > 6h (Base VR)" onclick="window.ordenarRecibos('vr')">VR <i class="ph \${_recibosSortCol==='vr'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='vr'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Dias > 3h extra" onclick="window.ordenarRecibos('jantar')">Jantar <i class="ph \${_recibosSortCol==='jantar'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='jantar'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Folgas/DSR/Feriados" onclick="window.ordenarRecibos('folgas')">Folgas <i class="ph \${_recibosSortCol==='folgas'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgas'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Faltas com e sem atestado" onclick="window.ordenarRecibos('faltas')">Faltas <i class="ph \${_recibosSortCol==='faltas'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltas'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>`;

const newHeaders = `            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Folgas VT" onclick="window.ordenarRecibos('folgasVT')">Folgas VT <i class="ph \${_recibosSortCol==='folgasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgasVT'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Falta Transporte" onclick="window.ordenarRecibos('faltasVT')">Falta Transp. <i class="ph \${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVT'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Dias > 3h extra" onclick="window.ordenarRecibos('jantar')">Jantar <i class="ph \${_recibosSortCol==='jantar'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='jantar'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Folgas/DSR/Feriados VR" onclick="window.ordenarRecibos('folgasVR')">Folgas VR <i class="ph \${_recibosSortCol==='folgasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgasVR'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Faltas com e sem atestado VR" onclick="window.ordenarRecibos('faltasVR')">Faltas VR <i class="ph \${_recibosSortCol==='faltasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVR'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>`;

code = code.replace(oldHeaders, newHeaders);

// Also update static headers around line 440
const oldStaticHeaders = `            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Dias > 6h (Base VR)" onclick="window.ordenarRecibos('vr')">VR <i class="ph \${_recibosSortCol==='vr'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='vr'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Dias > 3h extra" onclick="window.ordenarRecibos('jantar')">Jantar <i class="ph \${_recibosSortCol==='jantar'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='jantar'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Faltas com e sem atestado" onclick="window.ordenarRecibos('faltas')">Faltas <i class="ph \${_recibosSortCol==='faltas'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltas'?'1':'0.3'}"></i></th>`;

const newStaticHeaders = `            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Folgas VT" onclick="window.ordenarRecibos('folgasVT')">Folgas VT <i class="ph \${_recibosSortCol==='folgasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgasVT'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Falta Transporte" onclick="window.ordenarRecibos('faltasVT')">Falta Transp. <i class="ph \${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVT'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Dias > 3h extra" onclick="window.ordenarRecibos('jantar')">Jantar <i class="ph \${_recibosSortCol==='jantar'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='jantar'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Folgas/DSR/Feriados VR" onclick="window.ordenarRecibos('folgasVR')">Folgas VR <i class="ph \${_recibosSortCol==='folgasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgasVR'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;" title="Faltas com e sem atestado VR" onclick="window.ordenarRecibos('faltasVR')">Faltas VR <i class="ph \${_recibosSortCol==='faltasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVR'?'1':'0.3'}"></i></th>`;

code = code.replace(oldStaticHeaders, newStaticHeaders);

// Update colspan
code = code.replace(/colspan="7"/g, 'colspan="8"');

// 3. Update Table Row inputs
const oldInputs = `          <td style="padding:.45rem .4rem;text-align:center;display:none;">
            <input type="number" min="0" max="35" value="\${(s.diasVR != null && s.diasVR > 0) ? s.diasVR : s.diasTrabalhados}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${dtrabColor};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'diasVR',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.diasExtra||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${s.diasExtra>0?'#8b5cf6':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'diasExtra',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.folgas||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.folgas||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas/DSR/Feriados"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgas',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.faltas||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${faltaColor};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltas',this.value)">
          </td>`;

const newInputs = `          <td style="padding:.45rem .4rem;text-align:center;">
            \${(!_isVT(m) && m !== '') ? '<span style="color:#94a3b8;font-weight:600;">-</span>' : \`
            <input type="number" min="0" max="35" value="\${s.folgasVT||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.folgasVT||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas VT"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgasVT',this.value)">\`}
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.faltasVT||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.faltasVT||0)>0?'#ef4444':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVT',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.diasExtra||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${s.diasExtra>0?'#8b5cf6':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'diasExtra',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.folgasVR||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.folgasVR||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas VR"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgasVR',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="\${s.faltasVR||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:\${(s.faltasVR||0)>0?'#ef4444':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVR',this.value)">
          </td>`;

code = code.replace(oldInputs, newInputs);

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Headers and Inputs updated!');
