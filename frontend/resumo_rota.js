// ══════════════════════════════════════════════════════════════
//  RESUMO DE ROTA  –  Logística América Rental
//  Gera planilha única com 1 linha por veículo
// ══════════════════════════════════════════════════════════════

// ── Mapeamento de equipamentos (código SimpliRoute → nome completo + ícone) ──
const RR_EQ = {
    'STD O':  { nome: 'STD OBRA',              icon: '💙' },
    'STD E':  { nome: 'STD EVENTO',            icon: '💜' },
    'LX O':   { nome: 'LX OBRA',              icon: '🟦' },
    'LX E':   { nome: 'LX EVENTO',            icon: '🟪' },
    'ELX O':  { nome: 'ELX OBRA',             icon: '🔵' },
    'ELX E':  { nome: 'ELX EVENTO',           icon: '🟣' },
    'SLX O':  { nome: 'ELX OBRA',             icon: '🔵' },
    'SLX E':  { nome: 'ELX EVENTO',           icon: '🟣' },
    'PCD O':  { nome: 'PCD OBRA',             icon: '♿' },
    'PCD E':  { nome: 'PCD EVENTO',           icon: '🧑🏾‍🦽' },
    'CHUVEIRO O':  { nome: 'CHUVEIRO OBRA',   icon: '🚿' },
    'CHUVEIRO E':  { nome: 'CHUVEIRO EVENTO', icon: '🚿' },
    'HIDRAULICO O':{ nome: 'HIDRÁULICO OBRA', icon: '🚽' },
    'HIDRAULICO E':{ nome: 'HIDRÁULICO EVENTO',icon:'🚽' },
    'MICTORIO O':  { nome: 'MICTÓRIO OBRA',   icon: '💦' },
    'MICTORIO E':  { nome: 'MICTÓRIO EVENTO', icon: '💦' },
    'PIA II O':    { nome: 'PBII OBRA',        icon: '🧼' },
    'PIA II E':    { nome: 'PBII EVENTO',      icon: '🧼' },
    'PIA III O':   { nome: 'PBIII OBRA',       icon: '🧼' },
    'PIA III E':   { nome: 'PBIII EVENTO',     icon: '🧼' },
    'GUARITA INDIVIDUAL O': { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
    'GUARITA INDIVIDUAL E': { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
    'GUARITA DUPLA O': { nome: 'GUARITA DUPLA OBRA',   icon: '⚪' },
    'GUARITA DUPLA E': { nome: 'GUARITA DUPLA EVENTO', icon: '⚪' },
    'LIMPA FOSSA':    { nome: 'LIMPA FOSSA',    icon: '💧' },
    'VISITA TECNICA': { nome: 'VISITA TÉCNICA', icon: '⚙️' },
    'CARRINHO':       { nome: 'CARRINHO',       icon: '🛞' },
};

// ── Ícones de variáveis (obs) ──────────────────────────────────
const RR_VAR_ICONS = {
    'LEVAR CARRINHO':       '🛒',
    'NOTURNO':              '🌘',
    'INFORMACOES IMPORTANTES': '🚨',
    'INFORMAÇÕES IMPORTANTES': '🚨',
    'ATENCAO AO HORARIO':   '⏰',
    'ATENÇÃO AO HORÁRIO':   '⏰',
    'LEVAR EXTENSORA':      '🌀',
    'VAC':                  '🏗️',
    'CARRETINHA':           '🔗',
    'LEVAR EPI':            '🦺',
    'TROCA DE CABINE':      '♻️',
    'INTEGRACAO':           '👷',
    'INTEGRAÇÃO':           '👷',
    'APOIO DE SUCCAO':      '💧',
    'AVULSO':               '❗',
};

// ── Resolve ícone de obs a partir do texto da obs ou nome de variável ──
function _rrObsIcon(obsText) {
    const up = (obsText || '').toUpperCase();
    for (const [key, icon] of Object.entries(RR_VAR_ICONS)) {
        if (up.includes(key)) return icon;
    }
    return '';
}

// ── Resolve equipamento a partir do código do SimpliRoute ──────
function _rrEquip(codigo) {
    const c = (codigo || '').trim().toUpperCase();
    if (RR_EQ[c]) return RR_EQ[c];
    for (const [k, v] of Object.entries(RR_EQ)) {
        if (c.startsWith(k)) return v;
    }
    return { nome: c, icon: '' };
}

// ── Classifica tipo de serviço ─────────────────────────────────
function _rrTipoServico(notas) {
    const s = (notas || '').toUpperCase();
    if (s.includes('ENTREGA'))              return 'ENTREGA';
    if (s.includes('RETIRADA'))             return 'RETIRADA';
    if (s.includes('MANUTENCAO AVULSA') || s.includes('MANUTENÇÃO AVULSA')) return 'AVULSA';
    if (s.includes('MANUTENCAO') || s.includes('MANUTENÇÃO')) return 'MANUTENCAO';
    return 'OUTROS';
}

// ── Parseia produto da coluna Notas: "1  STD O" → { qtd:1, codigo:'STD O' } ──
function _rrParseProduto(prodStr) {
    const s = (prodStr || '').trim();
    const m = s.match(/^(\d+)\s+(.+)/);
    if (m) return { qtd: parseInt(m[1]), codigo: m[2].trim() };
    return null;
}

// ── Parseia coluna Notas: "TIPO | QTD PROD | FREQ | OBS | ID: X" ──
function _rrParseNotas(notas) {
    const parts = (notas || '').split('|').map(p => p.trim());
    return {
        servico: parts[0] || '',
        produto: parts[1] || '',
        freq:    parts[2] || '',
        obs:     parts[3] || '',
        id:      (parts[4] || '').replace('ID:', '').trim(),
    };
}

// ── Estado global ──────────────────────────────────────────────
let _rrVeiculos = [];
let _rrCurrentId = null;
let _rrHistoricoList = [];

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
                <div style="display:flex; gap:10px; align-items:center; margin-top:4px;">
                    <select id="rr-historico-select" onchange="window.rrCarregarHistorico(this.value)" style="padding:4px 8px; border-radius:4px; border:none; outline:none; font-size:0.85rem; color:#1e293b; background:#fff; cursor:pointer;">
                        <option value="">Carregando histórico...</option>
                    </select>
                </div>
            </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label style="background:#fff;color:#2d9e5f;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                <i class="ph ph-upload-simple"></i> Importar Nova Planilha
                <input type="file" accept=".xlsx" style="display:none;" onchange="window.rrImportarPlanilha(this)">
            </label>
            <button id="rr-btn-exportar" onclick="window.rrExportarExcel()" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-microsoft-excel-logo"></i> Exportar Resumo
            </button>
        </div>
    </div>
    <div id="rr-corpo" style="padding:20px;"></div>`;
    
    window.rrListarHistorico();
};

window.rrListarHistorico = async function() {
    try {
        const res = await fetch('/api/logistica/resumo-rota', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        if (!res.ok) throw new Error();
        _rrHistoricoList = await res.json();
        
        const sel = document.getElementById('rr-historico-select');
        if (!sel) return;
        
        sel.innerHTML = '<option value="">Selecione um resumo anterior...</option>';
        _rrHistoricoList.forEach(h => {
            sel.innerHTML += `<option value="${h.id}">${h.nome} (${h.usuario_nome || 'Auto'})</option>`;
        });
        if (_rrCurrentId) sel.value = _rrCurrentId;
    } catch (e) {
        console.error('Erro ao listar histórico', e);
    }
};

window.rrCarregarHistorico = async function(id) {
    if (!id) {
        _rrVeiculos = [];
        _rrCurrentId = null;
        _rrRenderCorpo();
        document.getElementById('rr-btn-exportar').style.display = 'none';
        return;
    }
    
    try {
        const res = await fetch('/api/logistica/resumo-rota/' + id, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        _rrVeiculos = JSON.parse(data.dados || '[]');
        _rrCurrentId = data.id;
        _rrRenderCorpo();
        document.getElementById('rr-btn-exportar').style.display = 'flex';
        showToast('Resumo carregado!', 'success');
    } catch (e) {
        showToast('Erro ao carregar resumo.', 'error');
    }
};

// ══════════════════════════════════════════════════════════════
//  IMPORTAR E PROCESSAR
// ══════════════════════════════════════════════════════════════
window.rrImportarPlanilha = async function(input) {
    const file = input.files[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    let rows = [];
    try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.worksheets[0];
        ws.eachRow((row, n) => { if (n > 1) rows.push(row.values); }); // 1-indexed
    } catch(e) {
        showToast('Erro ao ler planilha: ' + e.message, 'error');
        return;
    }
    if (!rows.length) { showToast('Planilha vazia.', 'error'); return; }

    // Colunas SimpliRoute (ExcelJS 1-indexed):
    // r[5]=Motorista(E), r[6]=Ajudante(F), r[7]=Veículo(G), r[8]=Cliente(H)
    // r[29]=Observações, r[36]=Notas

    const map = {};
    rows.forEach(r => {
        const veiculo   = (r[7]  || '').toString().trim();
        if (!veiculo) return;
        const motorista = (r[5]  || '').toString().trim();
        const ajudante  = (r[6]  || '').toString().trim();
        const cliente   = (r[8]  || '').toString().trim();
        const obsCol    = (r[29] || '').toString().trim(); // coluna Observações
        const notas     = (r[36] || '').toString().trim(); // coluna Notas

        if (!map[veiculo]) {
            map[veiculo] = { veiculo, motorista, ajudante, os: [] };
        }

        const p = _rrParseNotas(notas);
        // obs: tenta coluna Observações, senão parts[3] das Notas
        const obsText = obsCol || p.obs;

        map[veiculo].os.push({
            cliente,
            tipo:   _rrTipoServico(p.servico),
            servico: p.servico,
            produto: p.produto,
            obs:    obsText,
        });
    });

    _rrVeiculos = Object.values(map);
    
    // Determinar nome do histórico
    let isNoturno = false;
    _rrVeiculos.forEach(v => {
        v.os.forEach(o => {
            if (o.obs && _rrObsIcon(o.obs) === '🌘') isNoturno = true;
        });
    });
    
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeResumo = `${dateStr} ${isNoturno ? 'NOTURNO' : 'PADRÃO'}`;
    
    // Salvar no backend
    try {
        const res = await fetch('/api/logistica/resumo-rota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: JSON.stringify({ nome: nomeResumo, dados: _rrVeiculos })
        });
        const data = await res.json();
        if (data.success) {
            _rrCurrentId = data.id;
            await window.rrListarHistorico();
            const sel = document.getElementById('rr-historico-select');
            if (sel) sel.value = _rrCurrentId;
        }
    } catch (e) {
        console.error('Erro ao salvar resumo', e);
    }

    _rrRenderCorpo();
    const btn = document.getElementById('rr-btn-exportar');
    if (btn) btn.style.display = 'flex';
    showToast(`✅ ${_rrVeiculos.length} veículos carregados e salvos!`, 'success');
};

// ══════════════════════════════════════════════════════════════
//  MONTAR TEXTO DA COLUNA B (multi-linha por veículo)
// ══════════════════════════════════════════════════════════════
function _rrMontarColB(v) {
    const lines = [];

    // ── 1. OBS PARA MOTORISTA ──────────────────────────────────
    const obsLinhas = [];
    v.os.forEach(os => {
        if (!os.obs) return;
        const icon = _rrObsIcon(os.obs);
        const nomeAbrev = (os.cliente || '').substring(0, 15).trim();
        obsLinhas.push(`${icon ? icon + ' ' : ''}${nomeAbrev}: ${os.obs.toUpperCase()}`);
    });
    if (obsLinhas.length) {
        lines.push(...obsLinhas);
        lines.push('');
    }

    // ── 2. ENTREGAS ────────────────────────────────────────────
    const entregas = v.os.filter(o => o.tipo === 'ENTREGA');
    if (entregas.length) {
        // Agrupa por produto
        const agrupado = _rrAgruparProdutos(entregas);
        // Determina tipo (OBRA / EVENTO)
        const tipoStr = _rrTipoObraEvento(entregas);
        const iconEntrega = '💚';
        lines.push(`${iconEntrega} ENTREGA ${tipoStr}:`);
        for (const [nomeProd, { qtd, icon }] of Object.entries(agrupado)) {
            lines.push(`   ${icon}${qtd} ${nomeProd}`);
        }
        lines.push('');
    }

    // ── 3. RETIRADAS ───────────────────────────────────────────
    const retiradas = v.os.filter(o => o.tipo === 'RETIRADA');
    if (retiradas.length) {
        const agrupado = _rrAgruparProdutos(retiradas);
        const tipoStr = _rrTipoObraEvento(retiradas);
        lines.push(`⭕ RETIRADA ${tipoStr}:`);
        for (const [nomeProd, { qtd, icon }] of Object.entries(agrupado)) {
            lines.push(`   ${icon}${qtd} ${nomeProd}`);
        }
        lines.push('');
    }

    // ── 4. OUTROS SERVIÇOS (avulsa, reparo, visita, etc.) ──────
    const outros = v.os.filter(o => o.tipo === 'OUTROS' || o.tipo === 'AVULSA');
    if (outros.length) {
        outros.forEach(o => {
            lines.push(o.servico.toUpperCase());
        });
        lines.push('');
    }

    // ── 5. MANUTENÇÕES ─────────────────────────────────────────
    const manutencoes = v.os.filter(o => o.tipo === 'MANUTENCAO');
    if (manutencoes.length) {
        const agrupado = _rrAgruparProdutos(manutencoes);
        const tipoStr = _rrTipoObraEvento(manutencoes);
        lines.push(`MANUTENCAO ${tipoStr}:`);
        for (const [nomeProd, { qtd, icon }] of Object.entries(agrupado)) {
            lines.push(`   ${icon}${qtd} × ${nomeProd}`);
        }
        lines.push('');
    }

    // ── 6. MOTORISTA / AJUDANTE ────────────────────────────────
    if (v.motorista) lines.push(`Motorista: ${v.motorista}`);
    if (v.ajudante)  lines.push(`Ajudante: ${v.ajudante}`);

    return lines.join('\n');
}

// Agrupa produtos de uma lista de OS e soma qtd
function _rrAgruparProdutos(lista) {
    const ag = {};
    lista.forEach(os => {
        const prod = _rrParseProduto(os.produto);
        if (!prod) return;
        const eq   = _rrEquip(prod.codigo);
        const nome = eq.nome || prod.codigo;
        if (!ag[nome]) ag[nome] = { qtd: 0, icon: eq.icon };
        ag[nome].qtd += prod.qtd;
    });
    return ag;
}

// Retorna 'OBRA' ou 'EVENTO' com base no serviço
function _rrTipoObraEvento(lista) {
    const s = lista.map(o => (o.servico || '').toUpperCase()).join(' ');
    if (s.includes('EVENTO')) return 'EVENTO';
    return 'OBRA';
}

// ══════════════════════════════════════════════════════════════
//  RENDER PREVIEW NA TELA
// ══════════════════════════════════════════════════════════════
function _rrRenderCorpo() {
    const corpo = document.getElementById('rr-corpo');
    if (!corpo) return;
    if (!_rrVeiculos.length) {
        corpo.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;"><i class="ph ph-list-bullets" style="font-size:3rem;"></i><p>Nenhum dado. Importe a planilha do SimpliRoute ou selecione um histórico.</p></div>`;
        return;
    }

    corpo.innerHTML = _rrVeiculos.map((v, i) => {
        const colA = `${v.veiculo} - Saída`;
        const colB = _rrMontarColB(v);
        const total = v.os.length;
        
        // Ajusta a altura inicial do textarea baseado no número de linhas
        const numLinhas = (colB.match(/\n/g) || []).length + 2;
        const h = Math.max(120, numLinhas * 20);
        
        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:#2d9e5f;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:#fff;font-weight:700;font-size:1rem;">${colA}</div>
                <div style="background:rgba(255,255,255,0.2);border-radius:6px;padding:4px 12px;color:#fff;font-size:0.85rem;">${total} OS</div>
            </div>
            <div style="padding:14px 18px; background:#f8fafc;">
                <textarea class="rr-textarea-edit" data-index="${i}" spellcheck="false" style="width:100%; height:${h}px; border:1px solid #cbd5e1; border-radius:6px; padding:12px; font-size:0.85rem; color:#1e293b; line-height:1.7; font-family:monospace; resize:vertical; outline:none;" onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">${colB}</textarea>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════════
//  EXPORTAR EXCEL — PLANILHA ÚNICA, UMA LINHA POR VEÍCULO
// ══════════════════════════════════════════════════════════════
window.rrExportarExcel = async function() {
    if (!_rrVeiculos.length) {
        showToast('Importe a planilha do SimpliRoute primeiro.', 'error');
        return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'América Rental';
    const ws = wb.addWorksheet('Resumo de Rota');

    // Cabeçalho
    const hdr = ws.addRow(['PLACA / VEÍCULO', 'RESUMO']);
    hdr.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
    hdr.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
    hdr.height = 20;

    // Uma linha por veículo
    _rrVeiculos.forEach((v, i) => {
        const colA = `${v.veiculo} - Saída`;
        
        // Pega do textarea na tela (se existir) para pegar edições manuais
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${i}"]`);
        const colB = ta ? ta.value : _rrMontarColB(v);

        const row  = ws.addRow([colA, colB]);

        // Col A: placa
        row.getCell(1).font  = { bold: true };
        row.getCell(1).alignment = { vertical: 'top', wrapText: true };

        // Col B: resumo multi-linha
        row.getCell(2).alignment = { vertical: 'top', wrapText: true };

        // Altura proporcional ao número de linhas no resumo
        const numLinhas = (colB.match(/\n/g) || []).length + 1;
        row.height = Math.max(15, numLinhas * 15);

        // Zebra
        if (i % 2 === 0) {
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
        }

        // Bordas
        ['A','B'].forEach(col => {
            const cell = ws.getCell(`${col}${i + 2}`);
            cell.border = {
                top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
        });
    });

    // Larguras das colunas
    ws.getColumn(1).width = 35;
    ws.getColumn(2).width = 70;

    // Download
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    saveAs(blob, `Resumo_Rota_${hoje}.xlsx`);
    showToast('✅ Planilha exportada!', 'success');
};
