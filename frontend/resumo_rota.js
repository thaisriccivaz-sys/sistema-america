// ══════════════════════════════════════════════════════════════
//  RESUMO DE ROTA  –  Logística América Rental
// ══════════════════════════════════════════════════════════════

const RR_EQ = {
    'STD O':  { nome: 'STD OBRA',              icon: '💙' },
    'STD E':  { nome: 'STD EVENTO',            icon: '💜' },
    'LX O':   { nome: 'LX OBRA',               icon: '🟦' },
    'LX E':   { nome: 'LX EVENTO',             icon: '🟪' },
    'ELX O':  { nome: 'ELX OBRA',              icon: '🔵' },
    'ELX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
    'SLX O':  { nome: 'ELX OBRA',              icon: '🔵' },
    'SLX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
    'PCD O':  { nome: 'PCD OBRA',              icon: '♿' },
    'PCD E':  { nome: 'PCD EVENTO',            icon: '🧑🏾‍🦽' },
    'CHUVEIRO O':  { nome: 'CHUVEIRO OBRA',    icon: '🚿' },
    'CHUVEIRO E':  { nome: 'CHUVEIRO EVENTO',  icon: '🚿' },
    'HIDRAULICO O':{ nome: 'HIDRÁULICO OBRA',  icon: '🚽' },
    'HIDRAULICO E':{ nome: 'HIDRÁULICO EVENTO',icon: '🚽' },
    'MICTORIO O':  { nome: 'MICTÓRIO OBRA',    icon: '💦' },
    'MICTORIO E':  { nome: 'MICTÓRIO EVENTO',  icon: '💦' },
    'PIA II O':    { nome: 'PBII OBRA',         icon: '🧼' },
    'PIA II E':    { nome: 'PBII EVENTO',       icon: '🧼' },
    'PIA III O':   { nome: 'PBIII OBRA',        icon: '🧼' },
    'PIA III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
    'GUARITA INDIVIDUAL O': { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
    'GUARITA INDIVIDUAL E': { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
    'GUARITA DUPLA O': { nome: 'GUARITA DUPLA OBRA',   icon: '⚪' },
    'GUARITA DUPLA E': { nome: 'GUARITA DUPLA EVENTO', icon: '⚪' },
    'LIMPA FOSSA':    { nome: 'LIMPA FOSSA',    icon: '💧' },
    'VISITA TECNICA': { nome: 'VISITA TÉCNICA', icon: '⚙️' },
    'CARRINHO':       { nome: 'CARRINHO',        icon: '🛞' },
};

const RR_VAR_ICONS = {
    'LEVAR CARRINHO':          '🛒',
    'NOTURNO':                 '🌘',
    'INFORMACOES IMPORTANTES': '🚨',
    'INFORMAÇÕES IMPORTANTES': '🚨',
    'ATENCAO AO HORARIO':      '⏰',
    'ATENÇÃO AO HORÁRIO':      '⏰',
    'LEVAR EXTENSORA':         '🌀',
    'VAC':                     '🏗️',
    'CARRETINHA':              '🔗',
    'LEVAR EPI':               '🦺',
    'TROCA DE CABINE':         '♻️',
    'INTEGRACAO':              '👷',
    'INTEGRAÇÃO':              '👷',
    'APOIO DE SUCCAO':         '💧',
    'AVULSO':                  '❗',
};

function _rrObsIcon(t) {
    const up = (t || '').toUpperCase();
    for (const [k, ic] of Object.entries(RR_VAR_ICONS)) {
        if (up.includes(k)) return ic;
    }
    return '';
}

function _rrEquip(codigo) {
    const c = (codigo || '').trim().toUpperCase();
    if (RR_EQ[c]) return RR_EQ[c];
    for (const [k, v] of Object.entries(RR_EQ)) {
        if (c.startsWith(k)) return v;
    }
    return { nome: c, icon: '' };
}

function _rrTipoServico(s) {
    const u = (s || '').toUpperCase();
    if (u.includes('ENTREGA'))   return 'ENTREGA';
    if (u.includes('RETIRADA'))  return 'RETIRADA';
    if (u.includes('MANUTENCAO AVULSA') || u.includes('MANUTENÇÃO AVULSA')) return 'AVULSA';
    if (u.includes('MANUTENCAO') || u.includes('MANUTENÇÃO')) return 'MANUTENCAO';
    return 'OUTROS';
}

function _rrParseProduto(p) {
    const m = (p || '').trim().match(/^(\d+)\s+(.+)/);
    if (m) return { qtd: parseInt(m[1]), codigo: m[2].trim() };
    return null;
}

function _rrParseNotas(notas) {
    const parts = (notas || '').split('|').map(p => p.trim());
    return {
        servico: parts[0] || '',
        produto: parts[1] || '',
        obs:     parts[3] || '',
    };
}

function _rrAgruparProdutos(lista) {
    const ag = {};
    lista.forEach(os => {
        const prod = _rrParseProduto(os.produto);
        if (!prod) return;
        const eq = _rrEquip(prod.codigo);
        const nome = eq.nome || prod.codigo;
        if (!ag[nome]) ag[nome] = { qtd: 0, icon: eq.icon };
        ag[nome].qtd += prod.qtd;
    });
    return ag;
}

function _rrTipoObraEvento(lista) {
    const s = lista.map(o => (o.servico || '').toUpperCase()).join(' ');
    if (s.includes('EVENTO')) return 'EVENTO';
    return 'OBRA';
}

function _rrMontarColB(v) {
    const lines = [];

    // 1. OBS
    const obsLinhas = [];
    v.os.forEach(os => {
        if (!os.obs) return;
        const icon = _rrObsIcon(os.obs);
        const nome = (os.cliente || '').substring(0, 15).trim();
        obsLinhas.push(`${icon ? icon + ' ' : ''}${nome}: ${os.obs.toUpperCase()}`);
    });
    if (obsLinhas.length) { lines.push(...obsLinhas); lines.push(''); }

    // 2. ENTREGAS
    const entregas = v.os.filter(o => o.tipo === 'ENTREGA');
    if (entregas.length) {
        const ag = _rrAgruparProdutos(entregas);
        lines.push(`ENTREGA ${_rrTipoObraEvento(entregas)}:`);
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push(`   ${icon}${qtd} ${nome}`);
        lines.push('');
    }

    // 3. RETIRADAS
    const retiradas = v.os.filter(o => o.tipo === 'RETIRADA');
    if (retiradas.length) {
        const ag = _rrAgruparProdutos(retiradas);
        lines.push(`⭕ RETIRADA ${_rrTipoObraEvento(retiradas)}:`);
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push(`   ${icon}${qtd} ${nome}`);
        lines.push('');
    }

    // 4. OUTROS
    const outros = v.os.filter(o => o.tipo === 'OUTROS' || o.tipo === 'AVULSA');
    if (outros.length) {
        outros.forEach(o => lines.push(o.servico.toUpperCase()));
        lines.push('');
    }

    // 5. MANUTENÇÕES
    const manut = v.os.filter(o => o.tipo === 'MANUTENCAO');
    if (manut.length) {
        const ag = _rrAgruparProdutos(manut);
        lines.push(`MANUTENCAO ${_rrTipoObraEvento(manut)}:`);
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push(`   ${icon}${qtd} × ${nome}`);
        lines.push('');
    }

    // 6. MOTORISTA / AJUDANTE
    if (v.motorista) lines.push(`Motorista: ${v.motorista}`);
    if (v.ajudante)  lines.push(`Ajudante: ${v.ajudante}`);

    return lines.join('\n');
}

// ── Estado global ──────────────────────────────────────────────
let _rrVeiculos        = [];
let _rrCurrentId       = null;
let _rrHistoricoList   = [];
window._rrOriginalFileBase64 = null;
window._rrOriginalFileName   = null;
window._rrDefaultNomeResumo  = '';

// ── Token helper ───────────────────────────────────────────────
function _rrAuthHeaders() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    return { 'Authorization': 'Bearer ' + token };
}

// ══════════════════════════════════════════════════════════════
//  RENDER DA TELA
// ══════════════════════════════════════════════════════════════
window.renderResumoRota = function() {
    const container = document.getElementById('resumo-rota-container');
    if (!container) return;
    container.innerHTML = `
    <div style="background:#2d9e5f;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:14px;">
            <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;">
                <i class="ph ph-list-bullets" style="font-size:1.8rem;color:#fff;"></i>
            </div>
            <div>
                <h2 style="margin:0;color:#fff;font-size:1.4rem;font-weight:700;">Resumo de Rota</h2>
                <select id="rr-historico-select" onchange="window.rrCarregarHistorico(this.value)"
                    style="margin-top:4px;padding:4px 10px;border-radius:4px;border:none;outline:none;font-size:0.85rem;color:#1e293b;background:#fff;cursor:pointer;min-width:220px;">
                    <option value="">Carregando histórico...</option>
                </select>
            </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label style="background:#fff;color:#2d9e5f;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                <i class="ph ph-upload-simple"></i> Importar Planilha
                <input type="file" accept=".xlsx" style="display:none;" onchange="window.rrImportarPlanilha(this)">
            </label>
            <button id="rr-btn-exportar" onclick="window.rrExportarExcel()"
                style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-microsoft-excel-logo"></i> Exportar Resumo
            </button>
            <button id="rr-btn-baixar-original" onclick="window.rrBaixarOriginal()"
                style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-file-xls"></i> Baixar Rota Original
            </button>
        </div>
    </div>
    <div id="rr-corpo" style="padding:20px;"></div>`;

    _rrRenderCorpo();
    window.rrListarHistorico();
};

// ══════════════════════════════════════════════════════════════
//  HISTÓRICO
// ══════════════════════════════════════════════════════════════
window.rrListarHistorico = async function() {
    const sel = document.getElementById('rr-historico-select');
    if (!sel) return;
    try {
        const res = await fetch('/api/logistica/resumo-rota', { headers: _rrAuthHeaders() });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _rrHistoricoList = await res.json();

        if (!_rrHistoricoList.length) {
            sel.innerHTML = '<option value="">Nenhum resumo salvo ainda</option>';
            return;
        }
        sel.innerHTML = '<option value="">Selecione um resumo anterior...</option>';
        _rrHistoricoList.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id;
            opt.textContent = h.nome + (h.usuario_nome ? ' (' + h.usuario_nome + ')' : '');
            sel.appendChild(opt);
        });
        if (_rrCurrentId) sel.value = _rrCurrentId;
    } catch (e) {
        console.error('[RR] Erro ao listar histórico:', e);
        sel.innerHTML = '<option value="">Erro ao carregar histórico</option>';
    }
};

window.rrCarregarHistorico = async function(id) {
    const btnExportar = document.getElementById('rr-btn-exportar');
    const btnOrig     = document.getElementById('rr-btn-baixar-original');

    if (!id) {
        _rrVeiculos  = [];
        _rrCurrentId = null;
        window._rrOriginalFileBase64 = null;
        window._rrOriginalFileName   = null;
        _rrRenderCorpo();
        if (btnExportar) btnExportar.style.display = 'none';
        if (btnOrig)     btnOrig.style.display = 'none';
        return;
    }

    try {
        const res = await fetch('/api/logistica/resumo-rota/' + id, { headers: _rrAuthHeaders() });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data || !data.dados) throw new Error('Sem dados');

        const dadosObj = JSON.parse(data.dados);
        if (Array.isArray(dadosObj)) {
            _rrVeiculos = dadosObj;
            window._rrOriginalFileBase64 = null;
            window._rrOriginalFileName   = null;
        } else {
            _rrVeiculos = dadosObj.veiculos || [];
            window._rrOriginalFileBase64 = dadosObj.originalFileBase64 || null;
            window._rrOriginalFileName   = dadosObj.originalFileName   || null;
        }

        _rrCurrentId = data.id;
        _rrRenderCorpo();
        if (btnExportar) btnExportar.style.display = 'flex';
        if (btnOrig) btnOrig.style.display = window._rrOriginalFileBase64 ? 'flex' : 'none';
        showToast('Resumo carregado!', 'success');
    } catch (e) {
        console.error('[RR] Erro ao carregar histórico:', e);
        showToast('Erro ao carregar resumo: ' + e.message, 'error');
    }
};

window.rrBaixarOriginal = function() {
    if (!window._rrOriginalFileBase64) {
        showToast('Planilha original não disponível neste resumo.', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href     = window._rrOriginalFileBase64;
    a.download = window._rrOriginalFileName || 'SimpliRoute_Original.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// ══════════════════════════════════════════════════════════════
//  IMPORTAR E PROCESSAR
// ══════════════════════════════════════════════════════════════
window.rrImportarPlanilha = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // Salvar Base64 do arquivo original para histórico
    const reader = new FileReader();
    reader.onload = e => {
        window._rrOriginalFileBase64 = e.target.result;
        window._rrOriginalFileName   = file.name;
    };
    reader.readAsDataURL(file);

    const buf = await file.arrayBuffer();
    let rows = [];
    try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.worksheets[0];
        ws.eachRow((row, n) => { if (n > 1) rows.push(row.values); });
    } catch(e) {
        showToast('Erro ao ler planilha: ' + e.message, 'error');
        return;
    }
    if (!rows.length) { showToast('Planilha vazia.', 'error'); return; }

    const map = {};
    rows.forEach(r => {
        const veiculo   = (r[7]  || '').toString().trim();
        if (!veiculo) return;
        const motorista = (r[5]  || '').toString().trim();
        const ajudante  = (r[6]  || '').toString().trim();
        const cliente   = (r[8]  || '').toString().trim();
        const obsCol    = (r[29] || '').toString().trim();
        const notas     = (r[36] || '').toString().trim();

        if (!map[veiculo]) map[veiculo] = { veiculo, motorista, ajudante, os: [] };

        const p = _rrParseNotas(notas);
        map[veiculo].os.push({
            cliente,
            tipo:    _rrTipoServico(p.servico),
            servico: p.servico,
            produto: p.produto,
            obs:     obsCol || p.obs,
        });
    });

    _rrVeiculos  = Object.values(map);
    _rrCurrentId = null;

    // Nome sugerido
    let isNoturno = false;
    _rrVeiculos.forEach(v => v.os.forEach(o => {
        if (o.obs && _rrObsIcon(o.obs) === '🌘') isNoturno = true;
    }));
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    window._rrDefaultNomeResumo = dateStr + ' ' + (isNoturno ? 'NOTURNO' : 'PADRÃO');

    _rrRenderCorpo();
    const btnExportar = document.getElementById('rr-btn-exportar');
    if (btnExportar) btnExportar.style.display = 'flex';
    const btnOrig = document.getElementById('rr-btn-baixar-original');
    if (btnOrig) btnOrig.style.display = 'none'; // só aparece após salvar

    showToast(`✅ ${_rrVeiculos.length} veículos carregados! Edite e clique em Exportar para salvar.`, 'success');
};

// ══════════════════════════════════════════════════════════════
//  RENDER PREVIEW
// ══════════════════════════════════════════════════════════════
function _rrRenderCorpo() {
    const corpo = document.getElementById('rr-corpo');
    if (!corpo) return;
    if (!_rrVeiculos.length) {
        corpo.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
            <i class="ph ph-list-bullets" style="font-size:3rem;"></i>
            <p>Importe uma planilha do SimpliRoute ou selecione um resumo no histórico acima.</p>
        </div>`;
        return;
    }

    corpo.innerHTML = _rrVeiculos.map((v, i) => {
        const colA   = `${v.veiculo} - Saída`;
        const colB   = v.colBEditado || _rrMontarColB(v);
        const total  = v.os.length;
        const nLines = (colB.match(/\n/g) || []).length + 2;
        const h      = Math.max(120, nLines * 20);
        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:#2d9e5f;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:#fff;font-weight:700;font-size:1rem;">${colA}</div>
                <div style="background:rgba(255,255,255,0.2);border-radius:6px;padding:4px 12px;color:#fff;font-size:0.85rem;">${total} OS</div>
            </div>
            <div style="padding:14px 18px;background:#f8fafc;">
                <textarea class="rr-textarea-edit" data-index="${i}" spellcheck="false"
                    style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:monospace;resize:vertical;outline:none;box-sizing:border-box;"
                    onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'"
                    onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'"
                >${colB}</textarea>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════════
//  EXPORTAR EXCEL E SALVAR NO HISTÓRICO
// ══════════════════════════════════════════════════════════════
window.rrExportarExcel = async function() {
    if (!_rrVeiculos.length) {
        showToast('Importe uma planilha primeiro.', 'error');
        return;
    }

    // Captura edições manuais
    _rrVeiculos.forEach((v, i) => {
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${i}"]`);
        if (ta) v.colBEditado = ta.value;
    });

    // Popup para nome
    const { value: nomeFinal, isConfirmed } = await Swal.fire({
        title: 'Salvar Resumo de Rota',
        input: 'text',
        inputLabel: 'Nome do resumo',
        inputValue: window._rrDefaultNomeResumo || 'Resumo de Rota',
        showCancelButton: true,
        confirmButtonText: 'Exportar & Salvar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2d9e5f',
    });
    if (!isConfirmed) return;

    // Salvar no banco
    try {
        const payload = {
            nome: nomeFinal || 'Resumo',
            dados: {
                veiculos: _rrVeiculos,
                originalFileBase64: window._rrOriginalFileBase64 || null,
                originalFileName:   window._rrOriginalFileName   || null,
            }
        };
        const res = await fetch('/api/logistica/resumo-rota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ..._rrAuthHeaders() },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            _rrCurrentId = data.id;
            await window.rrListarHistorico();
            const sel = document.getElementById('rr-historico-select');
            if (sel) sel.value = _rrCurrentId;
            const btnOrig = document.getElementById('rr-btn-baixar-original');
            if (btnOrig) btnOrig.style.display = window._rrOriginalFileBase64 ? 'flex' : 'none';
        } else {
            console.error('[RR] Erro ao salvar:', data);
        }
    } catch (e) {
        console.error('[RR] Erro ao salvar resumo:', e);
        showToast('Aviso: não foi possível salvar no histórico.', 'error');
    }

    // Gerar Excel
    const wb = new ExcelJS.Workbook();
    wb.creator = 'América Rental';
    const ws = wb.addWorksheet('Resumo de Rota');

    const hdr = ws.addRow(['PLACA / VEÍCULO', 'RESUMO']);
    hdr.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
    hdr.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
    hdr.height = 20;

    _rrVeiculos.forEach((v, i) => {
        const colA = `${v.veiculo} - Saída`;
        const colB = v.colBEditado || _rrMontarColB(v);
        const row  = ws.addRow([colA, colB]);

        row.getCell(1).font = { bold: true };
        row.getCell(1).alignment = { vertical: 'top', wrapText: true };
        row.getCell(2).alignment = { vertical: 'top', wrapText: true };
        row.height = Math.max(15, ((colB.match(/\n/g) || []).length + 1) * 15);

        if (i % 2 === 0) {
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
        }
        ['A', 'B'].forEach(col => {
            ws.getCell(`${col}${i + 2}`).border = {
                top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
        });
    });

    ws.getColumn(1).width = 35;
    ws.getColumn(2).width = 70;

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    saveAs(blob, `Resumo_Rota_${hoje}.xlsx`);
    showToast('✅ Planilha exportada e salva no histórico!', 'success');
};
