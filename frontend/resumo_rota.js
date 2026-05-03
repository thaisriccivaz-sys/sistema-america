// ══════════════════════════════════════════════════════════════
//  RESUMO DE ROTA  –  Logística América Rental
//  Lê o relatório do SimpliRoute e gera resumo por veículo
// ══════════════════════════════════════════════════════════════

// Mapa de equipamentos: código_simpliRoute → { nome completo, ícone }
const RR_EQUIP = {
    'STD O':            { nome: 'STD OBRA',              icon: '💙' },
    'STD E':            { nome: 'STD EVENTO',             icon: '💜' },
    'LX O':             { nome: 'LX OBRA',               icon: '🟦' },
    'LX E':             { nome: 'LX EVENTO',             icon: '🟪' },
    'SLX O':            { nome: 'SLX OBRA',              icon: '🔵' },
    'SLX E':            { nome: 'SLX EVENTO',            icon: '🟣' },
    'EXL O':            { nome: 'EXL OBRA',              icon: '🔵' },
    'EXL E':            { nome: 'EXL EVENTO',            icon: '🟣' },
    'PCD O':            { nome: 'PCD OBRA',              icon: '♿' },
    'PCD E':            { nome: 'PCD EVENTO',            icon: '🧑🏾‍🦽' },
    'CHUVEIRO O':       { nome: 'CHUVEIRO OBRA',         icon: '🚿' },
    'CHUVEIRO E':       { nome: 'CHUVEIRO EVENTO',       icon: '🚿' },
    'HIDRAULICO O':     { nome: 'HIDRÁULICO OBRA',       icon: '🚽' },
    'HIDRAULICO E':     { nome: 'HIDRÁULICO EVENTO',     icon: '🚽' },
    'MICTORIO O':       { nome: 'MICTÓRIO OBRA',         icon: '💦' },
    'MICTORIO E':       { nome: 'MICTÓRIO EVENTO',       icon: '💦' },
    'PIA II O':         { nome: 'PBII OBRA',             icon: '🧼' },
    'PIA II E':         { nome: 'PBII EVENTO',           icon: '🧼' },
    'PIA III O':        { nome: 'PBIII OBRA',            icon: '🧼' },
    'PIA III E':        { nome: 'PBIII EVENTO',          icon: '🧼' },
    'GUARITA INDIVIDUAL O': { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
    'GUARITA INDIVIDUAL E': { nome: 'GUARITA INDIVIDUAL EVENTO', icon: '⬜' },
    'GUARITA DUPLA O':  { nome: 'GUARITA DUPLA OBRA',   icon: '⚪' },
    'GUARITA DUPLA E':  { nome: 'GUARITA DUPLA EVENTO', icon: '⚪' },
    'LIMPA FOSSA':      { nome: 'LIMPA FOSSA',           icon: '💧' },
    'VISITA TECNICA':   { nome: 'VISITA TÉCNICA',        icon: '⚙️' },
    'CARRINHO':         { nome: 'CARRINHO',              icon: '🛞' },
};

// Converte fração decimal do dia em HH:MM
function _rrFracToTime(v) {
    if (!v && v !== 0) return '';
    const h = Math.floor(v * 24);
    const m = Math.round((v * 24 - h) * 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Tenta encontrar info do equipamento pelo código do SimpliRoute
function _rrEquipInfo(codigo) {
    const c = (codigo || '').trim().toUpperCase();
    // busca exata
    if (RR_EQUIP[c]) return RR_EQUIP[c];
    // busca parcial (startsWith)
    for (const [key, val] of Object.entries(RR_EQUIP)) {
        if (c.startsWith(key)) return val;
    }
    return null;
}

// Parseia a coluna "Notas" do SimpliRoute:
// formato: "TIPO SERVICO | QTD PRODUTO | FREQ X DIAS | obs | ID: XXXX"
function _rrParseNotas(notas) {
    const parts = (notas || '').split('|').map(p => p.trim());
    return {
        servico: parts[0] || '',
        produto:  parts[1] || '',
        freq:     parts[2] || '',
        id_os:    (parts[4] || '').replace('ID:', '').trim(),
    };
}

// Estado do módulo
let _rrDados = []; // array de objetos por veículo

// ── Renderiza a tela ────────────────────────────────────────────
window.renderResumoRota = function() {
    const container = document.getElementById('resumo-rota-container');
    if (!container) return;

    container.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a3c2e 0%,#2d9e5f 100%);padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:14px;">
            <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;">
                <i class="ph ph-list-bullets" style="font-size:1.8rem;color:#fff;"></i>
            </div>
            <div>
                <h2 style="margin:0;color:#fff;font-size:1.4rem;font-weight:700;">Resumo de Rota</h2>
                <p style="margin:0;color:rgba(255,255,255,0.75);font-size:0.82rem;">Importe o relatório do SimpliRoute para gerar o resumo por veículo</p>
            </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label id="rr-btn-importar" style="background:#fff;color:#2d9e5f;border:none;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                <i class="ph ph-upload-simple"></i> Importar Planilha SimpliRoute
                <input type="file" id="rr-file-input" accept=".xlsx" style="display:none;" onchange="window.rrImportarPlanilha(this)">
            </label>
            <button id="rr-btn-exportar" onclick="window.rrExportarExcel()" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-microsoft-excel-logo"></i> Exportar Resumo
            </button>
        </div>
    </div>
    <div id="rr-corpo" style="padding:20px;"></div>`;
};

// ── Importa e processa a planilha ──────────────────────────────
window.rrImportarPlanilha = async function(input) {
    const file = input.files[0];
    if (!file) return;

    const buf = await file.arrayBuffer();
    const wb  = ExcelJS.Workbook ? null : null; // usamos a lib já carregada na página

    // Usa a lib xlsx se disponível, senão ExcelJS
    let rows = [];
    try {
        // Tenta via SheetJS (xlsx) via CDN global — não está disponível neste sistema.
        // Usamos ExcelJS que já está carregado no index.html
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buf);
        const ws = workbook.worksheets[0];
        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // pula header
            rows.push(row.values); // row.values é 1-indexed (index 0 é null)
        });
    } catch(e) {
        showToast('Erro ao ler planilha: ' + e.message, 'error');
        return;
    }

    if (!rows.length) {
        showToast('Planilha vazia ou formato inválido.', 'error');
        return;
    }

    // Índices das colunas do SimpliRoute (1-based porque ExcelJS usa row.values 1-indexed):
    // 1=ID visita, 2=TrackingID, 3=RefID(OS), 4=DataPrevista, 5=Motorista,
    // 6=Copilotos, 7=Veículo, 8=Título(cliente), 9=Endereço, 10=ETA, 11=ETD,
    // 12=Checkin,13=Checkout,14=Resp,15=TempoEst,16=TempoReal,17=Antec,18=Atraso,
    // 19=Lat,20=Lng,21=CheckoutLat,22=CheckoutLng,
    // 23=Load1,24=Load2,25=Load3,26=Load4,
    // 27=Estado,28=Comentários,29=Observações,30=Janela1Ini,31=Janela1Fim,
    // 32=Janela2Ini,33=Janela2Fim,34=HabNec,35=HabAd,36=Notas,...

    const veiculosMap = {};

    rows.forEach(r => {
        const veiculo   = (r[7]  || '').toString().trim();
        const motorista = (r[5]  || '').toString().trim(); // campo "Motorista"
        const copiloto  = (r[6]  || '').toString().trim(); // campo "Co-pilotos" (é quem dirige)
        const cliente   = (r[8]  || '').toString().trim();
        const endereco  = (r[9]  || '').toString().trim();
        const etaRaw    = r[10];
        const etdRaw    = r[11];
        const load1     = (r[23] || '').toString().trim();
        const load2     = (r[24] || '').toString().trim();
        const load3     = (r[25] || '').toString().trim();
        const load4     = (r[26] || '').toString().trim();
        const observ    = (r[29] || '').toString().trim();
        const notas     = (r[36] || '').toString().trim();
        const numOS     = (r[3]  || '').toString().trim();

        if (!veiculo && !copiloto) return;

        const placaKey = veiculo || 'SEM VEÍCULO';

        if (!veiculosMap[placaKey]) {
            veiculosMap[placaKey] = {
                veiculo:    placaKey,
                motorista:  motorista || copiloto, // quem dirige (campo motorista ou copiloto)
                ajudante:   motorista && copiloto ? motorista : '', // se ambos preenchidos, motorista é ajudante
                clientes:   [],
            };
        }

        const parsed = _rrParseNotas(notas);
        const eta    = typeof etaRaw === 'number' ? _rrFracToTime(etaRaw) : (etaRaw || '');
        const etd    = typeof etdRaw === 'number' ? _rrFracToTime(etdRaw) : (etdRaw || '');

        // Produto: pega da coluna Load (quantidade + código) ou das Notas
        let produtoStr = '';
        const loads = [load1, load2, load3, load4].filter(Boolean);
        if (loads.length) {
            produtoStr = loads.join(' / ');
        } else if (parsed.produto) {
            produtoStr = parsed.produto;
        }

        // Ícone do produto
        let prodIcon = '';
        if (produtoStr) {
            // tenta pegar o código depois do número
            const m = produtoStr.match(/^\d+\s+(.+)/);
            const codigo = m ? m[1].trim() : produtoStr;
            const eq = _rrEquipInfo(codigo);
            if (eq) prodIcon = eq.icon;
        }

        veiculosMap[placaKey].clientes.push({
            os:       numOS,
            cliente:  cliente,
            endereco: endereco,
            servico:  parsed.servico,
            produto:  produtoStr,
            prodIcon: prodIcon,
            freq:     parsed.freq,
            eta:      eta,
            etd:      etd,
            observ:   observ,
        });
    });

    _rrDados = Object.values(veiculosMap);
    _rrRenderCorpo();

    const btnExp = document.getElementById('rr-btn-exportar');
    if (btnExp) btnExp.style.display = 'flex';
    showToast(`✅ ${_rrDados.length} veículos carregados com sucesso!`, 'success');
};

// ── Renderiza os cards de veículos ─────────────────────────────
function _rrRenderCorpo() {
    const corpo = document.getElementById('rr-corpo');
    if (!corpo) return;

    if (!_rrDados.length) {
        corpo.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
            <i class="ph ph-list-bullets" style="font-size:3rem;"></i>
            <p style="margin-top:12px;font-size:1rem;">Nenhum dado carregado. Importe uma planilha do SimpliRoute.</p>
        </div>`;
        return;
    }

    corpo.innerHTML = _rrDados.map((v, vi) => {
        const totalOS = v.clientes.length;
        const linhas = v.clientes.map((c, ci) => {
            const obsCell = c.observ ? `<span style="color:#b45309;font-style:italic;">${c.observ}</span>` : '';
            const freqCell = c.freq ? `<span style="background:#e0f2fe;color:#0369a1;border-radius:4px;padding:2px 6px;font-size:0.75rem;font-weight:600;">${c.freq}</span>` : '';
            return `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:7px 10px;font-weight:600;color:#1e293b;white-space:nowrap;">${c.os || '-'}</td>
                <td style="padding:7px 10px;font-weight:600;color:#1e293b;max-width:200px;">${c.cliente}</td>
                <td style="padding:7px 10px;color:#475569;font-size:0.82rem;max-width:220px;">${c.endereco}</td>
                <td style="padding:7px 10px;color:#1e293b;font-size:0.85rem;">${c.servico}</td>
                <td style="padding:7px 10px;font-size:0.85rem;">${c.prodIcon} ${c.produto}</td>
                <td style="padding:7px 10px;">${freqCell}</td>
                <td style="padding:7px 10px;white-space:nowrap;color:#2d9e5f;font-weight:600;">${c.eta}${c.etd ? ' – '+c.etd : ''}</td>
                <td style="padding:7px 10px;font-size:0.8rem;">${obsCell}</td>
            </tr>`;
        }).join('');

        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:20px;overflow:hidden;border:1px solid #e2e8f0;">
            <!-- Cabeçalho do veículo -->
            <div style="background:linear-gradient(90deg,#1a3c2e,#2d9e5f);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:8px 12px;text-align:center;">
                        <i class="ph ph-truck" style="font-size:1.4rem;color:#fff;display:block;"></i>
                    </div>
                    <div>
                        <div style="color:#fff;font-size:1.1rem;font-weight:700;">${v.veiculo}</div>
                        <div style="color:rgba(255,255,255,0.85);font-size:0.85rem;">
                            <i class="ph ph-user"></i> ${v.motorista || '—'}
                            ${v.ajudante ? ` &nbsp;|&nbsp; <i class="ph ph-users"></i> Ajudante: ${v.ajudante}` : ''}
                        </div>
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:6px 16px;color:#fff;font-weight:700;font-size:1rem;">
                    ${totalOS} OS
                </div>
            </div>
            <!-- Tabela de clientes -->
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                        <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;white-space:nowrap;">OS</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">CLIENTE</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">ENDEREÇO</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">SERVIÇO</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">PRODUTO</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">FREQUÊNCIA</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">HORÁRIO</th>
                            <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;font-size:0.78rem;">OBSERVAÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

// ── Exporta planilha de resumo ─────────────────────────────────
window.rrExportarExcel = async function() {
    if (!_rrDados.length) {
        showToast('Importe a planilha do SimpliRoute primeiro.', 'error');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'América Rental';

    _rrDados.forEach(v => {
        // nome da aba: placa limitada a 31 chars (limite do Excel)
        const nomeAba = v.veiculo.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
        const ws = workbook.addWorksheet(nomeAba);

        // Linha de cabeçalho do veículo
        ws.addRow([`VEÍCULO: ${v.veiculo}`, `MOTORISTA: ${v.motorista}`, v.ajudante ? `AJUDANTE: ${v.ajudante}` : '']);
        ws.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
        ws.getRow(1).height = 22;

        // Linha em branco
        ws.addRow([]);

        // Cabeçalhos das colunas
        const header = ws.addRow(['OS', 'CLIENTE', 'ENDEREÇO', 'SERVIÇO', 'PRODUTO', 'FREQUÊNCIA', 'ETA', 'ETD', 'OBSERVAÇÕES']);
        header.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D9E5F' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Dados
        v.clientes.forEach(c => {
            const row = ws.addRow([
                c.os,
                c.cliente,
                c.endereco,
                c.servico,
                `${c.prodIcon ? c.prodIcon + ' ' : ''}${c.produto}`,
                c.freq,
                c.eta,
                c.etd,
                c.observ,
            ]);
            row.getCell(1).font = { bold: true };
        });

        // Larguras
        ws.getColumn(1).width = 10;
        ws.getColumn(2).width = 35;
        ws.getColumn(3).width = 40;
        ws.getColumn(4).width = 22;
        ws.getColumn(5).width = 20;
        ws.getColumn(6).width = 20;
        ws.getColumn(7).width = 8;
        ws.getColumn(8).width = 8;
        ws.getColumn(9).width = 35;
    });

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    saveAs(blob, `Resumo_Rota_${hoje}.xlsx`);
    showToast('✅ Planilha exportada com sucesso!', 'success');
};
