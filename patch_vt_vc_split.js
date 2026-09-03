/**
 * patch_vt_vc_split.js
 * Implements VT/VC split columns + two search buttons in recibos.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'frontend', 'recibos.js');
let src = fs.readFileSync(FILE, 'utf8');
const before = src.length;

// ─── Helper ──────────────────────────────────────────────────────────────────
function replace(target, replacement, label) {
    if (!src.includes(target)) {
        console.error('NOT FOUND: ' + label);
        process.exit(1);
    }
    src = src.replace(target, replacement);
    console.log('OK: ' + label);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. STATE INIT — add VT fields
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `const s    = _recibosSelecoes[c.id] || { selecionado:false, diasTrabalhados:0, diasVR:0, faltas:0, folgas:0, diasExtra:0, pontoStatus:null, folgasVT:0, faltasVT:0, folgasVR:0, faltasVR:0 };`,
    `const s    = _recibosSelecoes[c.id] || { selecionado:false, diasTrabalhados:0, diasVR:0, faltas:0, folgas:0, diasExtra:0, pontoStatus:null, vtStatus:null, folgasVT:0, faltasVT:0, folgasVR:0, faltasVR:0, diasUteisVT:0, faltasVTN:0, extrasVT:0, valorVT:null };`,
    '1. State init — add VT fields'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BUTTONS — replace single "Buscar Ponto" with two buttons
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `        <button id="btn-buscar-ponto" onclick="window._recBuscarPontoSelecionados()"
          style="display:flex;align-items:center;gap:6px;padding:.46rem 1rem;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:.84rem;font-weight:600;cursor:pointer;white-space:nowrap;">
          <i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)
        </button>`,
    `        <div style="display:flex;flex-direction:column;gap:4px;">
          <button id="btn-buscar-vcvr" onclick="window._recBuscarVCVR()"
            style="display:flex;align-items:center;gap:6px;padding:.42rem .85rem;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap;">
            <i class="ph ph-fingerprint"></i> Buscar VC e VR
          </button>
          <button id="btn-buscar-vt" onclick="window._recBuscarVT()"
            style="display:flex;align-items:center;gap:6px;padding:.42rem .85rem;background:#be185d;color:#fff;border:none;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap;">
            <i class="ph ph-bus"></i> Buscar VT
          </button>
        </div>`,
    '2. Two buttons'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BADGE — add second badge span for VT
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `      <span id="rec-ponto-badge" style="font-size:.8rem;"></span>`,
    `      <div style="display:flex;flex-direction:column;gap:2px;font-size:.78rem;">
        <span id="rec-ponto-badge"></span>
        <span id="rec-vt-badge"></span>
      </div>`,
    '3. Two badge spans'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. THEAD — remove Meio Transp + old VT cols, add new VT (pink) + VC (blue) cols
// ═══════════════════════════════════════════════════════════════════════════════
const THEAD_TH_STYLE_BLUE  = `position:sticky;top:0;background:#8aa0fe;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;`;
const THEAD_TH_STYLE_PINK  = `position:sticky;top:0;background:#fbb6ce;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;`;

replace(
    `            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .75rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;white-space:nowrap;">Meio Transp.</th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Folgas VT" onclick="window.ordenarRecibos('folgasVT')">Folgas<br>VT <i class="ph \${_recibosSortCol==='folgasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgasVT'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Faltas VT" onclick="window.ordenarRecibos('faltasVT')">Faltas<br>Transp. <i class="ph \${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVT'?'1':'0.3'}"></i></th>`,
    `            <th style="${THEAD_TH_STYLE_BLUE}" title="Folgas VC" onclick="window.ordenarRecibos('folgasVT')">Folgas<br>VC <i class="ph \${_recibosSortCol==='folgasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='folgasVT'?'1':'0.3'}"></i></th>
            <th style="${THEAD_TH_STYLE_BLUE}" title="Faltas VC" onclick="window.ordenarRecibos('faltasVT')">Faltas<br>VC <i class="ph \${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVT'?'1':'0.3'}"></i></th>
            <th style="${THEAD_TH_STYLE_PINK}" title="Dias Úteis VT (26→25)" onclick="window.ordenarRecibos('diasUteisVT')">Dias<br>VT <i class="ph \${_recibosSortCol==='diasUteisVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='diasUteisVT'?'1':'0.3'}"></i></th>
            <th style="${THEAD_TH_STYLE_PINK}" title="Faltas VT (26→25)" onclick="window.ordenarRecibos('faltasVTN')">Faltas<br>VT <i class="ph \${_recibosSortCol==='faltasVTN'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='faltasVTN'?'1':'0.3'}"></i></th>
            <th style="${THEAD_TH_STYLE_PINK}" title="Dias extras VT (fora da escala)" onclick="window.ordenarRecibos('extrasVT')">Extras<br>VT <i class="ph \${_recibosSortCol==='extrasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='extrasVT'?'1':'0.3'}"></i></th>
            <th style="${THEAD_TH_STYLE_PINK}" title="Valor VT" onclick="window.ordenarRecibos('valorVT')">Valor<br>VT <i class="ph \${_recibosSortCol==='valorVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:\${_recibosSortCol==='valorVT'?'1':'0.3'}"></i></th>`,
    '4. Thead — new VT/VC columns'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ROW CELLS — remove badge Meio Transporte + old VT/VC cells, add new ones
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `          <td style="padding:.55rem .75rem;text-align:center;background:#8aa0fe;">\${transpBadge}</td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            \${window._isVT(m) ? \`
            <input type="number" min="0" max="35" value="\${s.folgasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.folgasVT) ? '#dc2626' : ((s.folgasVT||0)>0?'#0891b2':'#94a3b8')};"
              placeholder="0"
              title="Folgas VT"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgasVT',this.value)">\` : ''}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            \${(window._isVT(m) || window._isVC(m)) ? \`
            <input type="number" min="0" max="35" value="\${s.faltasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.faltasVT) ? '#dc2626' : ((s.faltasVT||0)>0?'#1e3a5f':'#94a3b8')};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVT',this.value)">\` : ''}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            \${(window._isVT(m) || window._isVC(m)) ? \`
            <input type="number" step="0.01" min="0" class="no-spin" id="inp-valvt-\${c.id}" value="\${s.valVTEdit != null ? s.valVTEdit.toFixed(2) : totais.totalFinalTransp.toFixed(2)}"
              style="width:58px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.valVTEdit != null) ? '#dc2626' : '#1e3a5f'};"
              onchange="window.atualizarValorEditado(\${c.id},'valVTEdit',this.value)">\` : ''}
          </td>`,
    `          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            \${window._isVC(m) ? \`
            <input type="number" min="0" max="35" value="\${s.folgasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.folgasVT) ? '#dc2626' : ((s.folgasVT||0)>0?'#0891b2':'#94a3b8')};"
              placeholder="0" title="Folgas VC"
              onchange="window.atualizarDadosReciboColab(\${c.id},'folgasVT',this.value)">\` : '<span style=\"color:#cbd5e1;font-size:.8rem;\">—</span>'}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            \${window._isVC(m) ? \`
            <input type="number" min="0" max="35" value="\${s.faltasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.faltasVT) ? '#dc2626' : ((s.faltasVT||0)>0?'#1e3a5f':'#94a3b8')};"
              placeholder="0" title="Faltas VC"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVT',this.value)">\` : '<span style=\"color:#cbd5e1;font-size:.8rem;\">—</span>'}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#fbb6ce;">
            \${window._isVT(m) ? \`
            <input type="number" min="0" max="35" value="\${s.diasUteisVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #f9a8d4;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.diasUteisVT) ? '#dc2626' : ((s.diasUteisVT||0)>0?'#be185d':'#94a3b8')};"
              placeholder="0" title="Dias Úteis VT (26→25)"
              onchange="window.atualizarDadosReciboColab(\${c.id},'diasUteisVT',this.value)">\` : '<span style=\"color:#cbd5e1;font-size:.8rem;\">—</span>'}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#fbb6ce;">
            \${window._isVT(m) ? \`
            <input type="number" min="0" max="35" value="\${s.faltasVTN||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #f9a8d4;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.faltasVTN) ? '#dc2626' : ((s.faltasVTN||0)>0?'#9f1239':'#94a3b8')};"
              placeholder="0" title="Faltas VT"
              onchange="window.atualizarDadosReciboColab(\${c.id},'faltasVTN',this.value)">\` : '<span style=\"color:#cbd5e1;font-size:.8rem;\">—</span>'}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#fbb6ce;">
            \${window._isVT(m) ? \`
            <input type="number" min="0" max="35" value="\${s.extrasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #f9a8d4;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.edited_fields && s.edited_fields.extrasVT) ? '#dc2626' : ((s.extrasVT||0)>0?'#15803d':'#94a3b8')};"
              placeholder="0" title="Extras VT (dias fora da escala)"
              onchange="window.atualizarDadosReciboColab(\${c.id},'extrasVT',this.value)">\` : '<span style=\"color:#cbd5e1;font-size:.8rem;\">—</span>'}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#fbb6ce;">
            \${window._isVT(m) ? \`
            <input type="number" step="0.01" min="0" class="no-spin" id="inp-valvt-\${c.id}"
              value="\${s.valorVT != null ? Number(s.valorVT).toFixed(2) : (s.valVTEdit != null ? s.valVTEdit.toFixed(2) : totais.totalFinalTransp.toFixed(2))}"
              style="width:58px;padding:.2rem .1rem;border:1px solid #f9a8d4;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:\${(s.valVTEdit != null) ? '#dc2626' : '#9f1239'};"
              onchange="window.atualizarValorEditado(\${c.id},'valVTEdit',this.value)">\` : '<span style=\"color:#cbd5e1;font-size:.8rem;\">—</span>'}
          </td>`,
    '5. Row cells — new VT/VC'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. STATUS ICON — add vtStatus icon alongside pontoStatus
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `        let pontoIcon = s.pontoStatus === 'ok'
            ? \`<i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;" title="Importado do RHID"></i>\`
            : s.pontoStatus === 'erro'
            ? \`<i class="ph ph-warning" style="color:#f59e0b;font-size:1.1rem;" title="Não encontrado no RHID — preencha manualmente"></i>\`
            : \`<i class="ph ph-minus-circle" style="color:#cbd5e1;font-size:1.1rem;" title="Ponto não buscado"></i>\`;`,
    `        let pontoIcon = s.pontoStatus === 'ok'
            ? \`<i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;" title="VC/VR: Importado do RHID"></i>\`
            : s.pontoStatus === 'erro'
            ? \`<i class="ph ph-warning" style="color:#f59e0b;font-size:1.1rem;" title="VC/VR: Não encontrado no RHID — preencha manualmente"></i>\`
            : \`<i class="ph ph-minus-circle" style="color:#cbd5e1;font-size:1.1rem;" title="VC/VR: Ponto não buscado"></i>\`;
        const vtIcon = s.vtStatus === 'ok'
            ? \`<i class="ph ph-check-circle" style="color:#be185d;font-size:1.1rem;" title="VT: Calculado"></i>\`
            : s.vtStatus === 'erro'
            ? \`<i class="ph ph-warning" style="color:#f97316;font-size:1.1rem;" title="VT: Sem dados de escala"></i>\`
            : \`<i class="ph ph-bus" style="color:#cbd5e1;font-size:1.1rem;" title="VT: Não buscado"></i>\`;`,
    '6. vtStatus icon'
);

// Also update where pontoIcon is rendered in the row to include vtIcon
replace(
    `          <td style="padding:.55rem .5rem;text-align:center;">\${pontoIcon}\${isFerias?'<br><span style=\"font-size:.65rem;color:#a855f7;\">Férias</span>':''}</td>`,
    `          <td style="padding:.55rem .5rem;text-align:center;">\${pontoIcon}\${vtIcon}\${isFerias?'<br><span style=\"font-size:.65rem;color:#a855f7;\">Férias</span>':''}</td>`,
    '6b. Row pontoIcon + vtIcon'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. RENAME buscarPonto → buscarVCVR (function name, btn id, badge id, btn text)
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `// ─── Buscar ponto RHID em lote ────────────────────────────────────────────────
// REGRA:
//   • CRÉDITO = dias de escala do MÊS SEGUINTE ao selecionado (M+1)
//     Ex: selecionando Maio → crédito para Junho (01/06 a 30/06)
//   • DESCONTO (faltas) = ponto da JANELA 28/(M-1) → 28/M
//     Ex: selecionando Maio → desconta faltas de 28/04 a 28/05
//   • CARTÃO DE PONTO = mesmo período do desconto (28/M-1 a 28/M)
window._recBuscarPontoSelecionados = async function () {`,
    `// ─── Buscar VC e VR (RHID) em lote ───────────────────────────────────────────
window._recBuscarVCVR = async function () {`,
    '7a. Rename function declaration'
);

replace(
    `    const badge = document.getElementById('rec-ponto-badge');
    const btn   = document.getElementById('btn-buscar-ponto');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando...'; }
    if (badge) {
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.8rem;font-weight:600;color:#1d4ed8;';
        badge.innerHTML = \`<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando \${sels.length} colaborador\${sels.length>1?'es':''}...\`;
    }`,
    `    const badge = document.getElementById('rec-ponto-badge');
    const btn   = document.getElementById('btn-buscar-vcvr');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando...'; }
    if (badge) {
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;color:#1d4ed8;';
        badge.innerHTML = \`<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando VC/VR \${sels.length} colaborador\${sels.length>1?'es':''}...\`;
    }`,
    '7b. btn id + badge buscarVCVR'
);

replace(
    `    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)'; }`,
    `    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-fingerprint"></i> Buscar VC e VR'; }
    if (badge) { badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;color:#059669;'; }`,
    '7c. btn restore text'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. INSERT buscarVT function + _vtIsFolga helper AFTER buscarVCVR closes
// ═══════════════════════════════════════════════════════════════════════════════
const VT_FUNCTIONS = `
// ─── Helper: determinar se um dia é folga para VT (replica getFolga do backend) ──
function _vtIsFolga(c, dateStr) {
    const escalaStr = (c.escala_tipo || '').toLowerCase();
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d)) return false;
    const dow = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

    // 12×36: ciclo alternado dia trabalha/dia folga
    if (escalaStr.includes('12x36')) {
        if (c.escala_ciclo_inicio) {
            const ciclo = new Date(c.escala_ciclo_inicio + 'T12:00:00');
            const diffDias = Math.round((d - ciclo) / 86400000);
            if (diffDias < 0) return false;
            return diffDias % 2 === 1; // par=trabalha, ímpar=folga
        }
        return false;
    }

    // Parse escala_folgas (JSON array ou CSV)
    let folgasExplicitas = [];
    const DIA_MAP = { dom:0, domingo:0, seg:1, segunda:1, ter:2, 'terça':2, terca:2,
                      qua:3, quarta:3, qui:4, quinta:4, sex:5, sexta:5,
                      'sáb':6, sab:6, sabado:6, 'sábado':6 };
    try {
        const parsed = JSON.parse(c.escala_folgas || '[]');
        folgasExplicitas = (Array.isArray(parsed) ? parsed : [parsed])
            .map(f => String(f).trim().toLowerCase());
    } catch(e) {
        folgasExplicitas = (c.escala_folgas || '').split(/[,;]+/)
            .map(f => f.trim().toLowerCase()).filter(Boolean);
    }
    const folgasDow = folgasExplicitas.map(f => DIA_MAP[f]).filter(v => v !== undefined);

    // Sábados alternados
    if (escalaStr.includes('sab_alternado') || escalaStr.includes('sabado_alternado')) {
        if (dow === 0) return true; // Dom sempre folga
        if (dow === 6 && c.escala_ciclo_inicio) {
            const sabRef = new Date(c.escala_ciclo_inicio + 'T12:00:00');
            const diffSem = Math.round((d - sabRef) / (86400000 * 7));
            if (diffSem < 0) return false;
            return diffSem % 2 === 1; // alternado
        }
        return false;
    }

    // Folgas explícitas do cadastro
    if (escalaStr.includes('uma_folga') || escalaStr.includes('duas_folgas') ||
        escalaStr.includes('escala_uma') || escalaStr.includes('escala_duas')) {
        if (folgasDow.length > 0) return folgasDow.includes(dow);
    }

    // Tipos padrão
    if (escalaStr.includes('seg_sexta') || escalaStr.includes('5x2') || escalaStr.includes('5 x 2')) {
        return dow === 0 || dow === 6;
    }
    if (escalaStr.includes('6x1') || escalaStr.includes('6 x 1') || escalaStr.includes('seg_sab') || escalaStr.includes('seg_sabado')) {
        return dow === 0;
    }

    // Folgas explícitas como fallback
    if (folgasDow.length > 0) return folgasDow.includes(dow);

    return dow === 0; // padrão: só domingo é folga
}

// ─── Buscar VT em lote (janela 26→25, baseado na escala) ─────────────────────
window._recBuscarVT = async function () {
    const sels = _recibosFiltrados.filter(c => _recibosSelecoes[c.id]?.selecionado && window._isVT((c.meio_transporte||'').toLowerCase()));
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Nenhum colaborador VT selecionado para buscar.', 'warning');
        return;
    }

    // Confirm se já tem dados VT
    const comVTPreenchido = sels.filter(c => {
        const sel = _recibosSelecoes[c.id];
        return sel && (sel.vtStatus === 'ok' || (sel.diasUteisVT > 0));
    });

    let manterEditadosVT = false;
    if (comVTPreenchido.length > 0) {
        const swalRes = await Swal.fire({
            icon: 'warning',
            title: 'Substituir dados de VT?',
            html: \`<p style="margin:0 0 0.5rem;color:#374151;">
                       <strong>\${comVTPreenchido.length}</strong> colaborador(es) já possuem dados de VT preenchidos.
                   </p>
                   <p style="margin:0;color:#6b7280;font-size:0.9rem;">
                       Deseja manter as edições manuais ou substituir tudo pelo cálculo da escala?
                   </p>\`,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="ph ph-arrow-clockwise"></i> Substituir TODOS',
            denyButtonText: 'Manter editados',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#be185d',
            denyButtonColor: '#059669',
            cancelButtonColor: '#64748b',
        });
        if (swalRes.isDismissed) return;
        if (swalRes.isDenied) manterEditadosVT = true;
    }

    const mes = parseInt(document.getElementById('rec-mes')?.value);
    const ano = parseInt(document.getElementById('rec-ano')?.value);
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

    // Janela VT: dia 26 do mês anterior → dia 25 do mês selecionado
    const mesPrevVT = mes === 1 ? 12 : mes - 1;
    const anoPrevVT = mes === 1 ? ano - 1 : ano;
    const janelaVTIni = new Date(anoPrevVT, mesPrevVT - 1, 26);
    const janelaVTFim = new Date(ano, mes - 1, 25);

    const btnVT  = document.getElementById('btn-buscar-vt');
    const badgeVT = document.getElementById('rec-vt-badge');

    if (btnVT)  { btnVT.disabled = true; btnVT.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Calculando VT...'; }
    if (badgeVT) {
        badgeVT.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;color:#be185d;';
        badgeVT.innerHTML = \`<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando VT \${sels.length} colaborador\${sels.length>1?'es':''}...\`;
    }

    let okVT = 0, erroVT = 0;
    const maxConcVT = 8;
    let iVT = 0;

    const workerVT = async () => {
        while (iVT < sels.length) {
            const c = sels[iVT++];
            const s = _recibosSelecoes[c.id];
            if (!s) continue;

            // Manter editados
            if (manterEditadosVT && s.edited_fields &&
                (s.edited_fields.diasUteisVT || s.edited_fields.faltasVTN || s.edited_fields.extrasVT)) {
                okVT++;
                continue;
            }

            const cpf = (c.cpf || '').replace(/\\D/g, '');
            if (!cpf || cpf.length < 8) {
                s.vtStatus = 'erro';
                erroVT++;
                continue;
            }

            try {
                // Buscar ponto dos dois meses que compõem a janela 26→25
                const [resMes, resMesAnt] = await Promise.all([
                    fetch(\`\${API_URL}/diretoria/controlid/ponto-colaborador?cpf=\${encodeURIComponent(cpf)}&mes=\${mes}&ano=\${ano}\`,
                          { headers: { 'Authorization': \`Bearer \${token}\` } }),
                    fetch(\`\${API_URL}/diretoria/controlid/ponto-colaborador?cpf=\${encodeURIComponent(cpf)}&mes=\${mesPrevVT}&ano=\${anoPrevVT}\`,
                          { headers: { 'Authorization': \`Bearer \${token}\` } })
                ]);

                const dataMes    = resMes.ok    ? await resMes.json()    : null;
                const dataMesAnt = resMesAnt.ok ? await resMesAnt.json() : null;

                // Unir todos os dias de ambos os meses
                const diasMes    = (dataMes    && dataMes.apuracao_diaria)    ? dataMes.apuracao_diaria    : [];
                const diasMesAnt = (dataMesAnt && dataMesAnt.apuracao_diaria) ? dataMesAnt.apuracao_diaria : [];
                const todosDias  = [...diasMesAnt, ...diasMes];

                // Filtrar apenas dias dentro da janela VT (26/M-1 → 25/M)
                const parseDt = (d) => {
                    if (!d) return null;
                    const ds = d.data || d.date || d.dia || d;
                    if (typeof ds !== 'string') return null;
                    const p = ds.split('T')[0];
                    const dt = new Date(p + 'T12:00:00');
                    return isNaN(dt) ? null : dt;
                };

                let diasUteisVT = 0;
                let faltasVTN   = 0;
                let extrasVT    = 0;

                todosDias.forEach(d => {
                    const dt = parseDt(d);
                    if (!dt) return;
                    if (dt < janelaVTIni || dt > janelaVTFim) return;

                    const dateStr = dt.toISOString().split('T')[0];
                    const isFolga   = _vtIsFolga(c, dateStr);
                    const horasTrab = d.totalHorasTrabalhadas || d.horasUteis || 0;
                    const trabalhou = horasTrab > 0;
                    const isFeriado = !!(d.idJustification && String(d.idJustification).toLowerCase().includes('feri'));
                    const isFalta   = !trabalhou && !isFolga && !isFeriado;

                    if (!isFolga && !isFeriado) {
                        // Era dia de trabalho previsto
                        diasUteisVT++;
                        if (isFalta) faltasVTN++;
                    } else if (isFolga && trabalhou) {
                        // Trabalhou num dia de folga = extra VT
                        extrasVT++;
                    }
                });

                // Se não veio nenhum dado do RHID, usar cálculo de escala puro
                if (todosDias.length === 0) {
                    // Calcular apenas com a escala (sem RHID)
                    const dt = new Date(janelaVTIni);
                    while (dt <= janelaVTFim) {
                        const dateStr = dt.toISOString().split('T')[0];
                        if (!_vtIsFolga(c, dateStr)) diasUteisVT++;
                        dt.setDate(dt.getDate() + 1);
                    }
                    faltasVTN = 0;
                    extrasVT  = 0;
                }

                const tarifaDiaria = (parseFloat(c.valor_transporte) || 0) * 2;
                const valorVT = Math.max(0, (diasUteisVT - faltasVTN + extrasVT)) * tarifaDiaria;

                s.diasUteisVT = diasUteisVT;
                s.faltasVTN   = faltasVTN;
                s.extrasVT    = extrasVT;
                s.valorVT     = valorVT;
                s.vtStatus    = 'ok';
                okVT++;

            } catch(e) {
                console.warn('Erro ao buscar VT para', c.nome_completo, e);
                s.vtStatus = 'erro';
                erroVT++;
            }
        }
    };

    await Promise.all(Array.from({ length: maxConcVT }, workerVT));
    _renderTabela();

    if (btnVT)  { btnVT.disabled = false; btnVT.innerHTML = '<i class="ph ph-bus"></i> Buscar VT'; }
    if (badgeVT) {
        const partes = [];
        if (okVT   > 0) partes.push(\`<span style="color:#be185d;"><i class="ph ph-check-circle"></i> \${okVT} VT calculado\${okVT>1?'s':''}</span>\`);
        if (erroVT > 0) partes.push(\`<span style="color:#f59e0b;"><i class="ph ph-warning"></i> \${erroVT} sem dados</span>\`);
        badgeVT.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;';
        badgeVT.innerHTML = partes.join(' &nbsp; ');
    }
};

`;

replace(
    `// ─── Geração em massa ─────────────────────────────────────────────────────────`,
    VT_FUNCTIONS + `// ─── Geração em massa ─────────────────────────────────────────────────────────`,
    '8. Insert _vtIsFolga + buscarVT'
);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. _calcTotaisRecibo — for VT: use s.valorVT if set, otherwise fall back
// ═══════════════════════════════════════════════════════════════════════════════
replace(
    `    // Transp — base 30 para todos os colaboradores (inclusive novatos).
    // Deduções (folgasVT, faltasVT) já são calculadas apenas a partir da data de admissão.
    let totalFinalTransp = 0;
    let valTransp = parseFloat(c.valor_transporte) || 0;
    if (_isVT(mTransp)) {
        valTransp = valTransp * 2;
        const diasVT = Math.max(0, 30 - (s.folgasVT || 0) - (s.faltasVT || 0));
        totalFinalTransp = diasVT * valTransp;
    } else if (_isVC(mTransp)) {
        const diariaVC = valTransp / 30;
        const descVC = (s.faltasVT || 0) * diariaVC;
        totalFinalTransp = Math.max(0, valTransp - descVC);
    }`,
    `    // Transp — VT usa s.valorVT (calculado por buscarVT, janela 26→25 + escala).
    // VC usa base 30 com folgas/faltas — sem mudança.
    let totalFinalTransp = 0;
    let valTransp = parseFloat(c.valor_transporte) || 0;
    if (_isVT(mTransp)) {
        // VT: usar valor já calculado por buscarVT (se disponível)
        if (s.valorVT != null) {
            totalFinalTransp = s.valorVT;
        } else {
            // Fallback: fórmula simples enquanto VT não foi buscado
            valTransp = valTransp * 2;
            const diasVT = Math.max(0, (s.diasUteisVT || 0) - (s.faltasVTN || 0) + (s.extrasVT || 0));
            totalFinalTransp = diasVT > 0 ? diasVT * valTransp : 0;
        }
    } else if (_isVC(mTransp)) {
        // VC: base 30, deduções de folgas e faltas — sem mudança
        const diariaVC = valTransp / 30;
        const descVC = (s.faltasVT || 0) * diariaVC;
        totalFinalTransp = Math.max(0, valTransp - descVC);
    }`,
    '9. _calcTotaisRecibo VT uses s.valorVT'
);

// ═══════════════════════════════════════════════════════════════════════════════
// Write output
// ═══════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(FILE, src, 'utf8');
console.log('');
console.log('File size before:', before, '→ after:', src.length);
console.log('DONE — run node --check to verify syntax.');
