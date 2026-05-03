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
    const servico = parts[0] || '';
    
    // Identificar quais parts são produtos (começa com número seguido de letras, ex: '1  STD O', '1  GUARITA INDIVIDUAL O')
    // e quais são frequência ('2 X SEGUNDA, QUINTA') ou observações
    const prodParts = [];
    let obs = '';
    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (!p) continue;
        // Frequência: '2 X SEGUNDA...' ou '1 X SEGUNDA'
        if (/^\d+\s+X\s+/i.test(p)) continue;
        // ID da OS
        if (/^ID:\s*/i.test(p)) continue;
        // Produto: começa com dígito(s) seguido de espaço e texto de produto
        if (/^\d+\s+\S/.test(p)) {
            prodParts.push(p);
        } else {
            // Observação livre
            if (!obs) obs = p;
        }
    }

    return {
        servico,
        produto:  prodParts[0] || '',
        produtos: prodParts,       // todos os produtos (pode ser mais de 1)
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
            produtos: p.produtos,
            obs:     obsCol || p.obs,
        });
    });

    _rrVeiculos  = Object.values(map);
    _rrCurrentId = null;

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
        v.os.forEach(os => { if (os.tipo === 'ENTREGA') totalEntregas += _rrSomaProdutos(os); });

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
        
        // Avatar helper
        const _avatar = (foto, nome) => foto
            ? `<img src="${foto}" title="${nome}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.6);">`
            : `<div title="${nome}" style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;border:2px solid rgba(255,255,255,0.4);">${(nome||'?')[0].toUpperCase()}</div>`;

        const fotosMot = v.motorista ? `<div style="display:flex;align-items:center;gap:6px;">${_avatar(v._fotoMotorista, v.motorista)}<span style="font-size:0.78rem;color:rgba(255,255,255,0.9);">${v.motorista}</span></div>` : '';
        const fotosAju = v.ajudante  ? `<div style="display:flex;align-items:center;gap:6px;">${_avatar(v._fotoAjudante,  v.ajudante)}<span style="font-size:0.78rem;color:rgba(255,255,255,0.9);">${v.ajudante}</span></div>` : '';
        const fotosDiv = (fotosMot || fotosAju) ? `<div style="display:flex;gap:12px;align-items:center;">${fotosMot}${fotosAju}</div>` : '';

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

        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:#2d9e5f;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="color:#fff;font-weight:700;font-size:1rem;">${colA}</div>
                    ${fotosDiv}
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    ${capacidadeBadge}
                    <div style="background:rgba(255,255,255,0.2);border-radius:6px;padding:4px 12px;color:#fff;font-size:0.85rem;">${total} OS</div>
                </div>
            </div>
            ${badgeAlerta}
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
            await window.rrListarHistorico();
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

// ── Gera e baixa o arquivo Excel ───────────────────────────────
async function _rrGerarExcel() {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'América Rental';
    const ws = wb.addWorksheet('Resumo de Rota');

    const hdr = ws.addRow(['PLACA / VEÍCULO', 'RESUMO']);
    hdr.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
    hdr.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C2E' } };
    hdr.height = 20;

    let currentRowIdx = 2;
    _rrVeiculos.forEach((v, i) => {
        // --- Linha 1: Saída ---
        const colA_saida = `${v.veiculo} - Saída`;
        const colB = v.colBEditado || _rrMontarColB(v);
        const rowSaida  = ws.addRow([colA_saida, colB]);

        rowSaida.getCell(1).font = { bold: true };
        rowSaida.getCell(1).alignment = { vertical: 'top', wrapText: true };
        rowSaida.getCell(2).alignment = { vertical: 'top', wrapText: true };
        rowSaida.height = Math.max(15, ((colB.match(/\n/g) || []).length + 1) * 15);

        // --- Linha 2: Retorno ---
        const colA_retorno = `${v.veiculo} - Retorno`;
        const rowRetorno = ws.addRow([colA_retorno, '']);
        
        rowRetorno.getCell(1).font = { bold: true };
        rowRetorno.getCell(1).alignment = { vertical: 'top', wrapText: true };
        rowRetorno.getCell(2).alignment = { vertical: 'top', wrapText: true };
        rowRetorno.height = 30; // Altura extra para observações de retorno escritas à mão

        // Zebra (por veículo)
        if (i % 2 === 0) {
            rowSaida.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
            rowSaida.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
            rowRetorno.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
            rowRetorno.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF4' } };
        }

        // Bordas
        ['A', 'B'].forEach(col => {
            ws.getCell(`${col}${currentRowIdx}`).border = {
                top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
            ws.getCell(`${col}${currentRowIdx + 1}`).border = {
                top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
        });

        currentRowIdx += 2;
    });

    ws.getColumn(1).width = 35;
    ws.getColumn(2).width = 70;

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    saveAs(blob, `Resumo_Rota_${hoje}.xlsx`);
    showToast('✅ Planilha exportada e salva no histórico!', 'success');
};
