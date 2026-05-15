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
    'PBII O':    { nome: 'PBII OBRA',         icon: '🧼' },
    'PBII E':    { nome: 'PBII EVENTO',       icon: '🧼' },
    'PBIII O':   { nome: 'PBIII OBRA',        icon: '🧼' },
    'PBIII E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
    'PB II O':    { nome: 'PBII OBRA',         icon: '🧼' },
    'PB II E':    { nome: 'PBII EVENTO',       icon: '🧼' },
    'PB III O':   { nome: 'PBIII OBRA',        icon: '🧼' },
    'PB III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
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
    const original = (codigo || '').trim().toUpperCase();
    const c = original.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (RR_EQ[c]) return RR_EQ[c];
    for (const [k, v] of Object.entries(RR_EQ)) {
        if (c.startsWith(k)) return v;
    }
    return { nome: original, icon: '' };
}

function _rrTipoServico(s) {
    const u = (s || '').toUpperCase();
    if (u.includes('ENTREGA'))   return 'ENTREGA';
    if (u.includes('RETIRADA'))  return 'RETIRADA';
    if (u.includes('MANUTENCAO AVULSA') || u.includes('MANUTENÇÃO AVULSA')) return 'AVULSA';
    if (u.includes('MANUTENCAO') || u.includes('MANUTENÇÃO')) return 'MANUTENCAO';
    if (u.includes('COMPRAS'))   return 'COMPRAS';
    return 'OUTROS';
}

function _rrParseProduto(p) {
    const m = (p || '').trim().match(/^(\d+)\s+(.+)/);
    if (m) return { qtd: parseInt(m[1]), codigo: m[2].trim() };
    return null;
}

function _rrParseNotas(notas) {
    // Formato real do SimpliRoute:
    // Linha 1: Observação livre (ex: "IR DE CARRETINHA")
    // Linha 2: Tipo de serviço (ex: "ENTREGA EVENTO" / "⭕ RETIRADA EVENTO TOTAL")
    // Linha 3: Produto com qtd (ex: "18 STD EVENTO")
    // Pode haver múltiplas linhas de produto

    // Normaliza quebras de linha (\r\r\n → \n)
    const normalizado = (notas || '')
        .replace(/\r\r\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    const linhas = normalizado.split('\n').map(l => l.trim()).filter(Boolean);

    let servico  = '';
    let obs      = '';
    const prodParts = [];

    for (const linha of linhas) {
        const upLinha = linha.toUpperCase();

        // Linha de tipo de serviço
        if (upLinha.includes('ENTREGA')  || upLinha.includes('RETIRADA') ||
            upLinha.includes('MANUTENCAO') || upLinha.includes('MANUTENÇÃO') ||
            upLinha.includes('COMPRAS')  ||
            upLinha.includes('VISITA')   || upLinha.includes('LIMPA FOSSA') ||
            upLinha.includes('SUCCAO')   || upLinha.includes('SUCÇÃO')) {
            if (!servico) servico = linha;
            continue;
        }

        // Linha de produto: começa com número(s) seguido de espaço e texto
        // Ex: "18 STD EVENTO", "1 LX O", "22 STD EVENTO"
        if (/^\d+\s+\S/.test(linha)) {
            prodParts.push(linha);
            continue;
        }

        // Ignorar linha de dias da semana do Pipeline (ex: "2X - TER, SEX")
        if (/^\d+X\s*-/.test(upLinha)) {
            continue;
        }

        // Resto é observação livre
        if (!obs) obs = linha;
    }

    return {
        servico,
        produto:  prodParts[0] || '',
        produtos: prodParts,
        obs,
    };
}

function _rrAgruparProdutos(lista) {
    const ag = {};
    lista.forEach(os => {
        // Suporta array de produtos (novo) ou produto único (retrocompativel)
        const prods = (os.produtos && os.produtos.length > 0) ? os.produtos : [os.produto];
        prods.forEach(prodStr => {
            const prod = _rrParseProduto(prodStr);
            if (!prod) return;
            const eq = _rrEquip(prod.codigo);
            const nome = eq.nome || prod.codigo;
            if (!ag[nome]) ag[nome] = { qtd: 0, icon: eq.icon };
            ag[nome].qtd += prod.qtd;
        });
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
        let icon = _rrObsIcon(os.obs);
                let nome = (os.cliente || '').trim();
        
        // Remove os emojis do nome do cliente para que o texto fique limpo
        nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🔸]+/gu, '').trim();
        
        nome = nome.substring(0, 25).trim();
        
        // Remove também do os.obs caso já venha com emojis como 🛒 no início
        let obsLimpa = os.obs.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🛒]+/gu, '').trim().toUpperCase();
        
        obsLinhas.push(`${icon ? icon + ' ' : ''}${nome}: ${obsLimpa}`);
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
            lines.push(`   ${qtd} ${nome}`);
        lines.push('');
    }

        // 4. OUTROS E AVULSA
    const avulsas = v.os.filter(o => o.tipo === 'AVULSA');
    if (avulsas.length) {
        const ag = _rrAgruparProdutos(avulsas);
        lines.push('❗ MANUTENCAO AVULSA ' + _rrTipoObraEvento(avulsas) + ':');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push('   ' + qtd + ' × ' + nome);
        lines.push('');
    }

    const outros = v.os.filter(o => o.tipo === 'OUTROS');
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
            lines.push(`   ${qtd} × ${nome}`);
        lines.push('');
    }

    // 6. COMPRAS (sem produto / sem capacidade)
    const compras = v.os.filter(o => o.tipo === 'COMPRAS');
    if (compras.length) {
        lines.push('💳Compras América:');
        compras.forEach(o => {
            const cliente = (o.cliente || '').substring(0, 25).trim();
            if (cliente) lines.push(`   ${cliente}`);
        });
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
window._rrColabFotoMap       = {};
window._rrColabNomes         = [];

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
            <button id="rr-btn-limpar-resumo" onclick="window.rrLimparResumo()"
                style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;" title="Limpa o resumo atual da tela">
                <i class="ph ph-eraser"></i> Limpar
            </button>
            <button id="rr-btn-salvar" onclick="window.rrSalvarResumo()"
                style="background:#2563eb;color:#fff;border:1px solid #1d4ed8;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(37,99,235,0.4);">
                <i class="ph ph-floppy-disk"></i> Salvar
            </button>
            <button id="rr-btn-exportar" onclick="window.rrExportarExcel()"
                style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-microsoft-excel-logo"></i> Exportar Resumo
            </button>
            <button id="rr-btn-baixar-original" onclick="window.rrBaixarOriginal()"
                style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-file-xls"></i> Baixar Rota Original
            </button>
            <button onclick="window.rrAbrirHistoricoAlteracoes()"
                style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;">
                <i class="ph ph-clock-counter-clockwise"></i> Histórico de Alterações
            </button>
        </div>
    </div>
    <div id="rr-corpo" style="padding:20px;"></div>`;

    if (!document.getElementById('rr-colabs-list')) {
        const dl = document.createElement('datalist');
        dl.id = 'rr-colabs-list';
        document.body.appendChild(dl);
    }
    if (!window._rrColabNomes.length) {
        window._rrCarregarDicionarioColaboradores();
    } else {
        window._rrAtualizarDatalistColabs();
    }

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
        window._rrDataRotaAtual = null;
        _rrRenderCorpo();
        const btnSalvar = document.getElementById('rr-btn-salvar');
        if (btnSalvar) btnSalvar.style.display = 'none';
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

        // Limpa disponibilidade antiga (pode estar desatualizada se o resumo é de outro dia)
        _rrVeiculos.forEach(v => { v._dispMotorista = null; v._dispAjudante = null; });

        // Tenta extrair a data do nome (formato "DD-MM-YYYY ...") para re-consultar disponibilidade
        const nomeResumo = data.nome || '';
        const mData = nomeResumo.match(/(\d{2})-(\d{2})-(\d{4})/);
        const dataHistorico = mData ? `${mData[3]}-${mData[2]}-${mData[1]}` : null;
        window._rrDataRotaAtual = dataHistorico;

        _rrCurrentId = data.id;
        _rrRenderCorpo(); // renderiza sem disp (limpo)
        const btnSalvar = document.getElementById('rr-btn-salvar');
        if (btnSalvar) btnSalvar.style.display = 'flex';
        if (btnExportar) btnExportar.style.display = 'flex';
        if (btnOrig) btnOrig.style.display = window._rrOriginalFileBase64 ? 'flex' : 'none';

        // Re-consulta disponibilidade em background se tiver data detectada
        if (dataHistorico) {
            const nomesRota = new Set();
            _rrVeiculos.forEach(v => {
                if (v.motorista && v.motorista.trim()) nomesRota.add(v.motorista.trim());
                if (v.ajudante  && v.ajudante.trim())  nomesRota.add(v.ajudante.trim());
            });
            if (nomesRota.size > 0) {
                try {
                    const nomesParam = Array.from(nomesRota).join(',');
                    const resDisp = await fetch(
                        `/api/logistica/disponibilidade-rota?data=${dataHistorico}&nomes=${encodeURIComponent(nomesParam)}`,
                        { headers: _rrAuthHeaders() }
                    );
                    if (resDisp.ok) {
                        const dispMap = await resDisp.json();
                        _rrVeiculos.forEach(v => {
                            const motKey = (v.motorista || '').trim().toLowerCase();
                            const ajuKey = (v.ajudante  || '').trim().toLowerCase();
                            v._dispMotorista = dispMap[motKey] || null;
                            v._dispAjudante  = dispMap[ajuKey] || null;
                        });
                        _rrRenderCorpo(); // re-renderiza com disponibilidade atualizada
                    }
                } catch(e) {
                    console.warn('[RR] Não foi possível verificar disponibilidade no histórico:', e.message);
                }
            }
        }

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
// Limpa o resumo atual sem recarregar a página
window.rrLimparResumo = function() {
    _rrVeiculos  = [];
    _rrCurrentId = null;
    window._rrOriginalFileBase64 = null;
    window._rrOriginalFileName   = null;
    _rrRenderCorpo();
    const btnSalvar = document.getElementById('rr-btn-salvar');
    const btnExp  = document.getElementById('rr-btn-exportar');
    const btnOrig = document.getElementById('rr-btn-baixar-original');
    if (btnSalvar) btnSalvar.style.display = 'none';
    if (btnExp)  btnExp.style.display  = 'none';
    if (btnOrig) btnOrig.style.display = 'none';
    const sel = document.getElementById('rr-historico-select');
    if (sel) sel.value = '';
    showToast('Resumo limpo.', 'success');
};

window.rrImportarPlanilha = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // Limpa o resumo atual antes de carregar a nova planilha
    _rrVeiculos  = [];
    _rrCurrentId = null;
    window._rrOriginalFileBase64 = null;
    window._rrOriginalFileName   = null;
    _rrRenderCorpo(); // mostra estado vazio enquanto processa

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
        // ExcelJS row.values é 1-based
        // Col 7  = Veículo
        // Col 5  = Motorista
        // Col 6  = Co-pilotos (Ajudante)
        // Col 8  = Título (cliente / nome da OS)
        // Col 29 = Observações
        // Col 36 = Notas (tipo de serviço + produto)
        const veiculo   = (r[7]  || '').toString().trim();
        if (!veiculo) return;
        const motorista = (r[5]  || '').toString().replace(/^[\p{Emoji}\u{1F300}-\u{1FFFF}\u2600-\u26FF\u2700-\u27BF\s]+/u, '').trim();
        const ajudante  = (r[6]  || '').toString().replace(/^[\p{Emoji}\u{1F300}-\u{1FFFF}\u2600-\u26FF\u2700-\u27BF\s]+/u, '').trim();
        const cliente   = (r[8]  || '').toString().trim();
        const obsCol    = (r[29] || '').toString().trim();
        const notas     = (r[36] || '').toString().trim();

        if (!map[veiculo]) map[veiculo] = { veiculo, motorista, ajudante, os: [] };
        // Atualiza motorista se estiver vazio (primeiras linhas podem ter emoji diferente)
        if (!map[veiculo].motorista && motorista) map[veiculo].motorista = motorista;
        if (!map[veiculo].ajudante  && ajudante)  map[veiculo].ajudante  = ajudante;

        const p = _rrParseNotas(notas);
        if (!p.servico && !p.produtos.length && !p.obs) return; // linha sem info relevante
        map[veiculo].os.push({
            cliente,
            tipo:    _rrTipoServico(p.servico),
            servico: p.servico,
            produto: p.produto,
            produtos: p.produtos,
            obs:     obsCol || p.obs,
        });
    });

    _rrVeiculos  = Object.values(map).sort((a, b) => (a.veiculo || '').localeCompare(b.veiculo || '', 'pt-BR', { sensitivity: 'base' }));
    _rrCurrentId = null;

    // --- DETECTAR DATA DA ROTA (col 4 = Coluna D, ou col 25 = "Data agendada") ---
    let _rrDataRota = null;
    for (const r of rows) {
        // Tenta Coluna D (r[4]) primeiro, depois Coluna Y (r[25])
        const dataCells = [r[4], r[25]];
        for (const dataCell of dataCells) {
            if (dataCell) {
                let dt = null;
                if (dataCell instanceof Date) {
                    dt = dataCell.toISOString().split('T')[0];
                } else {
                    const s = String(dataCell).trim();
                    // Pode vir com hora junto: 15/05/2026 08:00 ou 2026-05-15 08:00
                    const dataParte = s.split(' ')[0]; 
                    
                    const m = dataParte.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
                    if (m) dt = `${m[3]}-${m[2]}-${m[1]}`;
                    else if (/^\d{4}-\d{2}-\d{2}$/.test(dataParte)) dt = dataParte;
                }
                if (dt) { 
                    _rrDataRota = dt; 
                    break; 
                }
            }
        }
        if (_rrDataRota) break;
    }
    // Se não achou na planilha, usa data de hoje
    if (!_rrDataRota) {
        const hoje = new Date();
        _rrDataRota = hoje.toISOString().split('T')[0];
    }

    // --- CARREGAR FOTOS E CAPACIDADES EM PARALELO ---
    let frotaMap = {}; // placa_norm -> capacidade_carga
    let fotoMap  = {}; // nome_lower -> foto_base64
    try {
        const [resFrota, resColab] = await Promise.all([
            fetch('/api/frota/veiculos',      { headers: _rrAuthHeaders() }),
            fetch('/api/colaboradores/resumo', { headers: _rrAuthHeaders() }),
        ]);
        if (resFrota.ok) {
            const list = await resFrota.json();
            list.forEach(item => {
                const placaNorm = (item.placa || '').replace(/[-\s]/g, '').toUpperCase();
                frotaMap[placaNorm] = { carga: parseInt(item.capacidade_carga) || 0, temCadastro: item.capacidade_carga !== null && item.capacidade_carga !== '' };
            });
        }
        if (resColab.ok) {
            const list = await resColab.json();
            // Usa URL do endpoint de foto (suporta foto_base64 E foto_path)
            list.forEach(c => { fotoMap[(c.nome_completo || '').toLowerCase().trim()] = `/api/colaboradores/foto/${c.id}`; });
        }
    } catch(e) {
        console.error('[RR] Erro ao buscar dados para insights', e);
    }

    // Salvar foto e capacidade nos objetos de veículo
    _rrVeiculos.forEach(v => {
        // Fotos dos tripulantes
        v._fotoMotorista = fotoMap[(v.motorista || '').toLowerCase().trim()] || null;
        v._fotoAjudante  = fotoMap[(v.ajudante  || '').toLowerCase().trim()] || null;

        // Capacidade
        const placaNorm = (v.veiculo || '').split(' ')[0].replace(/[-\s]/g, '').toUpperCase();
        const info = frotaMap[placaNorm];
        v._maxCarga = info ? info.carga : null;
        v._temCadastroCarga = info ? info.temCadastro : false;
    });

    // --- INSIGHT 1: CAPACIDADE DE CARGA ---
    // Helper: soma todos os produtos de uma OS
    function _rrSomaProdutos(os) {
        const prods = (os.produtos && os.produtos.length > 0) ? os.produtos : [os.produto];
        let total = 0;
        prods.forEach(prodStr => { const p = _rrParseProduto(prodStr); if (p) total += p.qtd; });
        return total;
    }

    _rrVeiculos.forEach(v => {
        if (!v._temCadastroCarga) return; // Sem capacidade cadastrada no sistema, sem verificação

        let totalEntregas = 0;
        v.os.forEach(os => {
            // COMPRAS não ocupa capacidade e não gera tempo de serviço
            if (os.tipo === 'COMPRAS') return;
            if (os.tipo === 'ENTREGA') totalEntregas += _rrSomaProdutos(os);
        });

        let cargaAtual = totalEntregas;
        let sobrecarga = false;
        let erroAtingido = 0;

        if (cargaAtual > v._maxCarga) { sobrecarga = true; erroAtingido = cargaAtual; }

        v.os.forEach(os => {
            if (sobrecarga) return;
            const qtd = _rrSomaProdutos(os);
            if (!qtd) return;
            if (os.tipo === 'ENTREGA') {
                cargaAtual -= qtd;
            } else if (os.tipo === 'RETIRADA') {
                cargaAtual += qtd;
                if (cargaAtual > v._maxCarga) { sobrecarga = true; erroAtingido = cargaAtual; }
            }
        });

        if (sobrecarga) {
            v.alertaCarga = `Capacidade excedida! Este veículo suporta ${v._maxCarga} banheiros, mas a rota projeta ${erroAtingido} simultâneos. Verifique a rota.`;
        }
    });


    // Nome sugerido
    let isNoturno = false;
    _rrVeiculos.forEach(v => v.os.forEach(o => {
        if (o.obs && _rrObsIcon(o.obs) === '🌘') isNoturno = true;
    }));
    const dateStr = (_rrDataRota
        ? new Date(_rrDataRota + 'T12:00:00').toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR')).replace(/\//g, '-');
    window._rrDefaultNomeResumo = dateStr + ' ' + (isNoturno ? 'NOTURNO' : 'PADRÃO');
    window._rrDataRotaAtual = _rrDataRota;

    // --- INSIGHT 2: DISPONIBILIDADE DE COLABORADORES ---
    // Coletar todos os nomes únicos de motoristas e ajudantes
    const nomesRota = new Set();
    _rrVeiculos.forEach(v => {
        if (v.motorista && v.motorista.trim()) nomesRota.add(v.motorista.trim());
        if (v.ajudante  && v.ajudante.trim())  nomesRota.add(v.ajudante.trim());
    });

    if (nomesRota.size > 0 && _rrDataRota) {
        const nomesParam = Array.from(nomesRota).join(',');
        try {
            const resDisp = await fetch(
                `/api/logistica/disponibilidade-rota?data=${_rrDataRota}&nomes=${encodeURIComponent(nomesParam)}`,
                { headers: _rrAuthHeaders() }
            );
            if (resDisp.ok) {
                const dispMap = await resDisp.json();
                // Armazenar disponibilidade em cada veículo
                _rrVeiculos.forEach(v => {
                    const motKey = (v.motorista || '').trim().toLowerCase();
                    const ajuKey = (v.ajudante  || '').trim().toLowerCase();
                    v._dispMotorista = dispMap[motKey] || null;
                    v._dispAjudante  = dispMap[ajuKey] || null;
                });
            }
        } catch(e) {
            console.warn('[RR] Não foi possível verificar disponibilidade:', e.message);
        }
    }

    _rrRenderCorpo();
    const btnSalvar = document.getElementById('rr-btn-salvar');
    if (btnSalvar) btnSalvar.style.display = 'flex';
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

    // Mostrar data da rota detectada
    const dataRota = window._rrDataRotaAtual;
    const dataRotaLabel = dataRota
        ? `<div style="background:#e0f2fe;color:#0369a1;padding:8px 20px;font-size:0.83rem;font-weight:600;display:flex;align-items:center;gap:8px;border-bottom:1px solid #bae6fd;">
               <i class="ph ph-calendar-check"></i> Data da rota detectada: <b>${new Date(dataRota + 'T12:00:00').toLocaleDateString('pt-BR', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</b>
               — Verificando disponibilidade dos colaboradores para este dia
           </div>`
        : '';

    corpo.innerHTML = dataRotaLabel + _rrVeiculos.map((v, i) => {
        const colA   = `${v.veiculo} - Saída`;
        const colB   = v.colBEditado || _rrMontarColB(v);
        const total  = v.os.length;
        const nLines = (colB.match(/\n/g) || []).length + 2;
        const h      = Math.max(120, nLines * 20);
        
        // Helper de avatar (foto ou inicial)
        const _avatar = (foto, nome) => foto
            ? `<img src="${foto}" title="${nome||''}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.6);">`
            : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:#fff;border:1px dashed rgba(255,255,255,0.5);">${(nome&&nome.trim()) ? nome.trim()[0].toUpperCase() : '+'}</div>`;

        // Helper de input editável inline (sempre visível, inclusive se vazio) com datalist
        const _inp = (campo, val, placeholder) =>
            `<input value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}" list="rr-colabs-list"
                style="font-size:0.78rem;color:#fff;background:rgba(0,0,0,0.12);border:none;border-bottom:1px dashed rgba(255,255,255,0.5);outline:none;width:150px;padding:2px 5px;border-radius:3px;"
                onfocus="this.style.background='rgba(0,0,0,0.25)'"
                onblur="this.style.background='rgba(0,0,0,0.12)'"
                onchange="window._rrAtualizarVeiculo(${i},'${campo}',this.value)"
                title="Editar ${placeholder}">`;

        const fotosMot = `<div style="display:flex;align-items:center;gap:6px;" title="Motorista">
            <span id="rr-avatar-mot-${i}">${_avatar(v._fotoMotorista, v.motorista)}</span>
            ${_inp('motorista', v.motorista, 'Motorista...')}</div>`;
        const fotosAju = `<div style="display:flex;align-items:center;gap:6px;" title="Ajudante">
            <span id="rr-avatar-aju-${i}">${_avatar(v._fotoAjudante, v.ajudante)}</span>
            ${_inp('ajudante', v.ajudante, 'Ajudante...')}</div>`;
        const fotosDiv = `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">${fotosMot}${fotosAju}</div>`;

        // Badge de capacidade
        let capacidadeBadge = '';
        if (v._temCadastroCarga) {
            // Mostra a capacidade cadastrada, inclusive se for 0 (não carrega nada)
            capacidadeBadge = `<span style="background:rgba(255,255,255,0.15);border-radius:6px;padding:3px 10px;font-size:0.8rem;color:#fff;"><i class="ph ph-truck"></i> Carga máx: ${v._maxCarga}</span>`;
        } else {
            capacidadeBadge = `<span style="background:rgba(255,165,0,0.3);border-radius:6px;padding:3px 10px;font-size:0.8rem;color:#ffe0a0;" title="Cadastre a capacidade na tela Frota"><i class="ph ph-warning"></i> Cap. não cadastrada</span>`;
        }

        const badgeAlerta = v.alertaCarga 
            ? `<div style="background:#fef2f2;color:#dc2626;padding:10px 18px;border-bottom:1px solid #fecaca;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:8px;">
                 <i class="ph ph-warning" style="font-size:1.1rem;"></i> ${v.alertaCarga}
               </div>` 
            : '';

        // Badge de disponibilidade por colaborador
        const _dispInfo = (disp, nome) => {
            if (!disp || !nome || !nome.trim()) return null;
            const { status, motivo } = disp;
            if (status === 'disponivel') return null; // só alerta se indisponível
            const label = {
                'ferias':   'Férias',
                'afastado': 'Afastado',
                'falta':    'Falta',
                'folga':    'Folga',
                'aso':      'ASO Agendado',
            }[status] || status;
            return `<div style="background:#fef2f2;color:#dc2626;padding:8px 16px;border-bottom:1px solid #fecaca;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-warning-circle" style="font-size:1rem;"></i>
                <span><b>${nome}</b> — ${label}${motivo && motivo !== label ? ': ' + motivo : ''}</span>
            </div>`;
        };

        const _motDisp = _dispInfo(v._dispMotorista, v.motorista);
        const _ajuDisp = _dispInfo(v._dispAjudante,  v.ajudante);
        const badgeDisp = [_motDisp, _ajuDisp].filter(Boolean).join('');

        // Badges de Aviso da Agenda Logística
        const _avisoInfo = (disp, nome) => {
            if (!disp || !nome || !nome.trim()) return null;
            const avisos = disp.avisos || [];
            if (!avisos.length) return null;
            return avisos.map(titulo => `<div style="background:#fef2f2;color:#dc2626;padding:8px 16px;border-bottom:1px solid #fecaca;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-warning-circle" style="font-size:1rem;"></i>
                <span><b>${nome}</b> — Aviso: ${titulo}</span>
            </div>`).join('');
        };
        const _motAviso = _avisoInfo(v._dispMotorista, v.motorista);
        const _ajuAviso = _avisoInfo(v._dispAjudante,  v.ajudante);
        const badgeAviso = [_motAviso, _ajuAviso].filter(Boolean).join('');

        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:#2d9e5f;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-truck" style="color:rgba(255,255,255,0.7);font-size:0.9rem;"></i>
                        <input value="${v.veiculo.replace(/"/g,'&quot;')}"
                            style="color:#fff;font-weight:700;font-size:1rem;background:transparent;border:none;border-bottom:1px dashed rgba(255,255,255,0.4);outline:none;min-width:120px;max-width:240px;"
                            onfocus="this.style.borderBottomColor='rgba(255,255,255,0.9)'"
                            onblur="this.style.borderBottomColor='rgba(255,255,255,0.4)'"
                            onchange="window._rrAtualizarVeiculo(${i},'veiculo',this.value)"
                            title="Editar placa / veículo">
                        <span style="color:rgba(255,255,255,0.6);font-size:0.9rem;">- Saída</span>
                    </div>
                    ${fotosDiv}
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    ${capacidadeBadge}
                    <div style="background:rgba(255,255,255,0.2);border-radius:6px;padding:4px 12px;color:#fff;font-size:0.85rem;">${total} OS</div>
                </div>
            </div>
            ${badgeAlerta}
            ${badgeDisp}
            ${badgeAviso}
            <div style="display:flex;gap:0;border-top:1px solid #e2e8f0;">
                <div style="flex:1 1 40%;padding:14px 18px;background:#f8fafc;border-right:1px solid #e2e8f0;">
                    <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Resumo da Rota</div>
                    <textarea class="rr-textarea-edit" data-index="${i}" spellcheck="false"
                        style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:monospace;resize:vertical;outline:none;box-sizing:border-box;"
                        onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'"
                        onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'"
                    >${colB}</textarea>
                </div>
                <div style="flex:0 0 30%;max-width:30%;padding:14px 14px;background:#fff;border-right:1px solid #e2e8f0;">
                    <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Observações do Roteirizador <span style="color:#dc2626;">*</span></div>
                    <textarea class="rr-textarea-obs" data-index="${i}" spellcheck="false"
                        placeholder="Digite as observações do roteirizador (obrigatório)..."
                        style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:sans-serif;resize:vertical;outline:none;box-sizing:border-box;background:#fefce8;"
                        onfocus="this.style.borderColor='#ca8a04';this.style.boxShadow='0 0 0 3px rgba(202,138,4,0.1)'"
                        onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'; window._rrAtualizarVeiculo(${i}, 'obsRoteirizador', this.value);"
                        required
                    >${v.obsRoteirizador || ''}</textarea>
                </div>
                <div style="flex:0 0 30%;max-width:30%;padding:14px 14px;background:#fff;">
                    <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Observações de Alterações</div>
                    <textarea class="rr-textarea-alt" data-index="${i}" spellcheck="false"
                        placeholder="Observações de alterações (opcional)..."
                        style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:sans-serif;resize:vertical;outline:none;box-sizing:border-box;background:#f8fafc;"
                        onfocus="this.style.borderColor='#3b82f6';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'"
                        onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'; window._rrAtualizarVeiculo(${i}, 'obsAlteracoes', this.value);"
                    >${v.obsAlteracoes || ''}</textarea>
                </div>
            </div>
        `;
    }).join('');
}

// ── Atualiza veiculo/motorista/ajudante diretamente na estrutura de dados ──────
window._rrAtualizarVeiculo = function(idx, campo, valor) {
    if (!_rrVeiculos[idx]) return;
    _rrVeiculos[idx][campo] = valor;

    if (campo === 'motorista' || campo === 'ajudante') {
        const fotoKey = campo === 'motorista' ? '_fotoMotorista' : '_fotoAjudante';
        const spanId  = campo === 'motorista' ? `rr-avatar-mot-${idx}` : `rr-avatar-aju-${idx}`;
        const nomeLower = (valor || '').trim().toLowerCase();
        
        // Atualiza a foto se houver correspondência exata no datalist
        if (window._rrColabFotoMap && window._rrColabFotoMap[nomeLower]) {
            _rrVeiculos[idx][fotoKey] = window._rrColabFotoMap[nomeLower];
        } else {
            _rrVeiculos[idx][fotoKey] = null; // Remove foto se apagou ou não achou
        }

        // Atualiza o DOM do avatar diretamente (preserva foco/tab)
        const spanEl = document.getElementById(spanId);
        if (spanEl) {
            const f = _rrVeiculos[idx][fotoKey];
            const n = valor;
            spanEl.innerHTML = f 
                ? `<img src="${f}" title="${n||''}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.6);">`
                : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:#fff;border:1px dashed rgba(255,255,255,0.5);">${(n&&n.trim()) ? n.trim()[0].toUpperCase() : '+'}</div>`;
        }

        // Sincroniza no textarea de colB
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${idx}"]`);
        if (ta) {
            const label  = campo === 'motorista' ? 'Motorista' : 'Ajudante';
            const regex  = new RegExp(`^${label}: .+$`, 'm');
            let txt = ta.value;
            if (regex.test(txt)) {
                txt = valor
                    ? txt.replace(regex, `${label}: ${valor}`)
                    : txt.replace(regex, '').replace(/\n{3,}/g, '\n\n');
            } else if (valor) {
                txt = txt.trimEnd() + `\n${label}: ${valor}`;
            }
            ta.value = txt;
            _rrVeiculos[idx].colBEditado = txt;
        }
    }
};

window._rrCarregarDicionarioColaboradores = async function() {
    try {
        const res = await fetch('/api/colaboradores/resumo', { headers: _rrAuthHeaders() });
        if (!res.ok) return;
        const list = await res.json();
        window._rrColabNomes = [];
        window._rrColabFotoMap = {};
        list.forEach(c => {
            const nome = (c.nome_completo || '').trim();
            if (nome) {
                window._rrColabNomes.push(nome);
                window._rrColabFotoMap[nome.toLowerCase()] = `/api/colaboradores/foto/${c.id}`;
            }
        });
        window._rrAtualizarDatalistColabs();
    } catch(e) {
        console.error('[RR] Erro ao carregar dicionário de colaboradores globais', e);
    }
};

window._rrAtualizarDatalistColabs = function() {
    const dl = document.getElementById('rr-colabs-list');
    if (!dl) return;
    dl.innerHTML = '';
    window._rrColabNomes.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        dl.appendChild(opt);
    });
};

// ══════════════════════════════════════════════════════════════
//  EXPORTAR EXCEL E SALVAR NO HISTÓRICO
// ══════════════════════════════════════════════════════════════
window.rrExportarExcel = async function() {
    if (!_rrVeiculos.length) {
        showToast('Importe uma planilha primeiro.', 'error');
        return;
    }

    // Captura edições manuais e valida campos obrigatórios
    let faltouObs = false;
    _rrVeiculos.forEach((v, i) => {
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${i}"]`);
        if (ta) v.colBEditado = ta.value;
        const to = document.querySelector(`.rr-textarea-obs[data-index="${i}"]`);
        if (to) {
            v.obsRoteirizador = to.value;
            if (!v.obsRoteirizador || !v.obsRoteirizador.trim()) {
                faltouObs = true;
                to.style.borderColor = '#dc2626';
            } else {
                to.style.borderColor = '#cbd5e1';
            }
        }
        const taAlt = document.querySelector(`.rr-textarea-alt[data-index="${i}"]`);
        if (taAlt) v.obsAlteracoes = taAlt.value;
    });

    if (faltouObs) {
        showToast('Preencha as Observações do Roteirizador para todas as saídas!', 'error');
        return;
    }

    // ── Se já veio do histórico, apenas baixa sem pedir nome ou salvar ──
    if (_rrCurrentId) {
        await _rrGerarExcel();
        return;
    }

    // ── Novo importe: verifica nome duplicado ─────────────────────────
    const nomeDefault = window._rrDefaultNomeResumo || 'Resumo de Rota';
    const nomeExistente = _rrHistoricoList.find(h => h.nome === nomeDefault);

    let nomeFinal;
    if (nomeExistente) {
        const { value, isConfirmed } = await Swal.fire({
            title: 'Nome já utilizado',
            html: `Já existe um resumo salvo com o nome <b>"${nomeDefault}"</b>.<br>Deseja salvar com um nome diferente?`,
            input: 'text',
            inputValue: nomeDefault + ' (2)',
            showCancelButton: true,
            confirmButtonText: 'Salvar com novo nome',
            cancelButtonText: 'Só baixar (sem salvar)',
            confirmButtonColor: '#2d9e5f',
        });
        if (!isConfirmed) { await _rrGerarExcel(); return; }
        nomeFinal = value || nomeDefault + ' (2)';
    } else {
        const { value, isConfirmed } = await Swal.fire({
            title: 'Salvar Resumo de Rota',
            input: 'text',
            inputLabel: 'Nome do resumo',
            inputValue: nomeDefault,
            showCancelButton: true,
            confirmButtonText: 'Exportar & Salvar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2d9e5f',
        });
        if (!isConfirmed) return;
        nomeFinal = value || nomeDefault;
    }

    // Salvar no banco
    try {
        const payload = {
            nome: nomeFinal,
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
            window.rrListarHistorico();
            showToast('Resumo salvo no histórico com sucesso!', 'success');
        } else {
            showToast('Erro ao salvar resumo.', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Erro de conexão ao salvar resumo.', 'error');
    }

    await _rrGerarExcel();
};

window.rrSalvarResumo = async function() {
    // Captura snapshot antes de ler os textareas (para detectar mudanças)
    window._rrCapturarSnapshot();
    if (!_rrVeiculos.length) {
        showToast('Importe uma planilha primeiro.', 'error');
        return;
    }

    // Captura edições manuais e valida campos obrigatórios
    let faltouObs = false;
    _rrVeiculos.forEach((v, i) => {
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${i}"]`);
        if (ta) v.colBEditado = ta.value;
        const to = document.querySelector(`.rr-textarea-obs[data-index="${i}"]`);
        if (to) {
            v.obsRoteirizador = to.value;
            if (!v.obsRoteirizador || !v.obsRoteirizador.trim()) {
                faltouObs = true;
                to.style.borderColor = '#dc2626';
            } else {
                to.style.borderColor = '#cbd5e1';
            }
        }
        const taAlt = document.querySelector(`.rr-textarea-alt[data-index="${i}"]`);
        if (taAlt) v.obsAlteracoes = taAlt.value;
    });

    if (faltouObs) {
        showToast('Preencha as Observações do Roteirizador para todas as saídas!', 'error');
        return;
    }

    let nomeFinal = window._rrDefaultNomeResumo || 'Resumo de Rota';

    // Se é um resumo novo
    if (!_rrCurrentId) {
        const nomeExistente = _rrHistoricoList.find(h => h.nome === nomeFinal);
        if (nomeExistente) {
            const { value, isConfirmed } = await Swal.fire({
                title: 'Nome já utilizado',
                html: `Já existe um resumo salvo com o nome <b>"${nomeFinal}"</b>.<br>Deseja salvar com um nome diferente?`,
                input: 'text',
                inputValue: nomeFinal + ' (2)',
                showCancelButton: true,
                confirmButtonText: 'Salvar com novo nome',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2d9e5f',
            });
            if (!isConfirmed) return;
            nomeFinal = value || nomeFinal + ' (2)';
        } else {
            const { value, isConfirmed } = await Swal.fire({
                title: 'Salvar Resumo de Rota',
                input: 'text',
                inputLabel: 'Nome do resumo',
                inputValue: nomeFinal,
                showCancelButton: true,
                confirmButtonText: 'Salvar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2d9e5f',
            });
            if (!isConfirmed) return;
            nomeFinal = value || nomeFinal;
        }
    }

    try {
        const payload = {
            id: _rrCurrentId,
            nome: nomeFinal,
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
            await window._rrRegistrarAlteracoes(nomeFinal);
            const sel = document.getElementById('rr-historico-select');
            if (sel) sel.value = _rrCurrentId;
            const btnOrig = document.getElementById('rr-btn-baixar-original');
            if (btnOrig) btnOrig.style.display = window._rrOriginalFileBase64 ? 'flex' : 'none';
        }
    } catch (e) {
        console.error('[RR] Erro ao salvar resumo:', e);
        showToast('Aviso: não foi possível salvar no histórico.', 'error');
    }

    await _rrGerarExcel();
};

// ── Gera e baixa o arquivo Excel ──────────────
async function _rrGerarExcel() {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'América Rental';
    const ws = wb.addWorksheet('Resumo de Rota');

    // ─── Cabeçalhos exatos da nova planilha de exemplo (26 colunas) ──────────
    const SR_HEADERS = [
        "Titulo*    Solicitado", "endereço completo*    Solicitado", "Carga",
        "Janela de horário inicial", "Janela de horário final", "Tempo de serviço",
        "Anotações", "Latitude", "Longitude", "Identificação de referência",
        "Habilidade necessária", "Habilidade opcional", "Pessoa de contato",
        "Telefone de contato", "Janela de horário inicial 2", "Janela de horário final 2",
        "Capacidade 2", "Capacidade 3", "Prioridade", "SMS", "Correio eletrônico de contato",
        "Carga pick", "Carga pick 2", "Carga pick 3", "Data agendada", "Tipo de visita"
    ];
    const ANOTACOES_COL = 7; // 1-based index of "Anotações" = column G
    const LAT_COL = 8;       // 1-based index of "Latitude" = column H
    const LON_COL = 9;       // 1-based index of "Longitude" = column I

    const darkGreen = { argb: 'FF1A3C2E' };
    const lightGreen = { argb: 'FFF0FBF4' };
    const borderThin = { style: 'thin', color: { argb: 'FFCBD5E1' } };
    const borderStyle = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

    // Adiciona os cabeçalhos na linha 1
    const hdr1 = ws.addRow(SR_HEADERS);
    SR_HEADERS.forEach((_, ci) => {
        const cell = hdr1.getCell(ci + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: darkGreen };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = borderStyle;
    });
    hdr1.height = 22;

    // Ordena veículos em ordem alfabética na planilha
    const veiculosOrdenados = [..._rrVeiculos].sort((a, b) => (a.veiculo || '').localeCompare(b.veiculo || '', 'pt-BR', { sensitivity: 'base' }));

    veiculosOrdenados.forEach((v, i) => {
        const colB = v.colBEditado || _rrMontarColB(v);
        const nLines = (colB.match(/\n/g) || []).length + 1;
        const rowH   = Math.max(20, nLines * 14);
        const zebra  = i % 2 === 0 ? lightGreen : null;
        const enderecoBase = `Rua Salto da Divisa, ${97 + i} - Pq. Alvorada - Guarulhos`;

        // --- Saída ---
        const dataSaida = new Array(26).fill('');
        dataSaida[0] = `${v.veiculo} - Saída`; // Coluna A (Titulo)
        dataSaida[1] = enderecoBase;                    // Coluna B
        dataSaida[ANOTACOES_COL - 1] = colB;            // Coluna G
        dataSaida[LAT_COL - 1] = '-23.433853765885214'; // Coluna H
        dataSaida[LON_COL - 1] = '-46.42011440858504';  // Coluna I

        const rowSaida = ws.addRow(dataSaida);
        rowSaida.getCell(1).font = { bold: true, size: 9 };
        rowSaida.getCell(ANOTACOES_COL).alignment = { vertical: 'top', wrapText: true };
        rowSaida.height = rowH;
        if (zebra) {
            [1, 2, ANOTACOES_COL, LAT_COL, LON_COL].forEach(c => {
                rowSaida.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: zebra };
            });
        }
        [1, 2, ANOTACOES_COL, LAT_COL, LON_COL].forEach(c => { rowSaida.getCell(c).border = borderStyle; });

        // --- Retorno ---
        const dataRetorno = new Array(26).fill('');
        dataRetorno[0] = `${v.veiculo} - Retorno`;
        dataRetorno[1] = enderecoBase;                    // Coluna B
        dataRetorno[LAT_COL - 1] = '-23.433853765885214'; // Coluna H
        dataRetorno[LON_COL - 1] = '-46.42011440858504';  // Coluna I

        const rowRetorno = ws.addRow(dataRetorno);
        rowRetorno.getCell(1).font = { bold: true, size: 9 };
        rowRetorno.height = 30;
        if (zebra) {
            [1, 2, LAT_COL, LON_COL].forEach(c => {
                rowRetorno.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: zebra };
            });
        }
        [1, 2, LAT_COL, LON_COL].forEach(c => { rowRetorno.getCell(c).border = borderStyle; });
    });

    // Larguras
    ws.getColumn(1).width = 38;  // A: Titulo
    ws.getColumn(2).width = 20;  // B: endereço completo
    ws.getColumn(3).width = 15;  // C: Carga
    ws.getColumn(4).width = 15;  // D: Janela inicial
    ws.getColumn(5).width = 15;  // E: Janela final
    ws.getColumn(6).width = 15;  // F: Tempo de serviço
    ws.getColumn(ANOTACOES_COL).width = 70; // G: Anotações/Resumo
    ws.getColumn(LAT_COL).width = 20; // H: Latitude
    ws.getColumn(LON_COL).width = 20; // I: Longitude
    
    // Demais colunas com largura padrão
    for (let c = 10; c <= 26; c++) {
        ws.getColumn(c).width = 12;
    }

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    saveAs(blob, `Resumo_Rota_${hoje}.xlsx`);
    showToast('✅ Planilha exportada e salva no histórico!', 'success');
}

