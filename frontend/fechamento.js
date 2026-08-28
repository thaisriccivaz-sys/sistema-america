// ═══════════════════════════════════════════════════════════════════
// fechamento.js — Fechamento Mensal de Folha de Pagamento
// América Rental — versão 2.0 (2026-08-28) — Etapa 2
// ═══════════════════════════════════════════════════════════════════

window._fechamento = (function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────
    // ESTADO GLOBAL
    // ─────────────────────────────────────────────────────────────────
    let _dados = [];
    let _mes = null;
    let _ano = null;

    // ─────────────────────────────────────────────────────────────────
    // TABELA INSS 2026 (alíquota progressiva)
    // ─────────────────────────────────────────────────────────────────
    const FAIXAS_INSS = [
        { ate: 1412.00,    aliq: 0.075 },
        { ate: 2666.68,    aliq: 0.09  },
        { ate: 4000.03,    aliq: 0.12  },
        { ate: 7786.02,    aliq: 0.14  },
    ];
    const TETO_INSS = 7786.02;

    function calcINSS(salarioBruto) {
        let inss = 0;
        let base = Math.min(salarioBruto, TETO_INSS);
        let limite_ant = 0;
        for (const f of FAIXAS_INSS) {
            if (base <= limite_ant) break;
            const faixa = Math.min(base, f.ate) - limite_ant;
            inss += faixa * f.aliq;
            limite_ant = f.ate;
        }
        return Math.round(inss * 100) / 100;
    }

    // ─────────────────────────────────────────────────────────────────
    // TABELA IRRF 2026
    // ─────────────────────────────────────────────────────────────────
    const FAIXAS_IRRF = [
        { ate: 2259.20,  aliq: 0,     deducao: 0       },
        { ate: 2826.65,  aliq: 0.075, deducao: 169.44  },
        { ate: 3751.05,  aliq: 0.15,  deducao: 381.44  },
        { ate: 4664.68,  aliq: 0.225, deducao: 662.77  },
        { ate: Infinity, aliq: 0.275, deducao: 896.00  },
    ];

    function calcIRRF(baseCalculo) {
        if (baseCalculo <= 0) return 0;
        for (const f of FAIXAS_IRRF) {
            if (baseCalculo <= f.ate) {
                return Math.max(0, Math.round((baseCalculo * f.aliq - f.deducao) * 100) / 100);
            }
        }
        return 0;
    }

    // ─────────────────────────────────────────────────────────────────
    // CONVERSÃO DE HORAS
    // ─────────────────────────────────────────────────────────────────
    function horasParaFloat(str) {
        if (!str) return 0;
        const [h, m] = String(str).split(':').map(Number);
        return (h || 0) + (m || 0) / 60;
    }

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR VALORES DO COLABORADOR
    // ─────────────────────────────────────────────────────────────────
    function calcularColaborador(row) {
        const salario = parseFloat(row.salario) || 0;
        const insalubridade = parseInt(row.folha_insalubridade) === 1 ? (parseFloat(row.folha_insalubridade_valor) || 0) : 0;
        const periculosidade = parseInt(row.folha_periculosidade) === 1 ? (parseFloat(row.folha_periculosidade_valor) || 0) : 0;
        const plr = parseFloat(row.plr) || 0;
        const horasNormais = horasParaFloat(row.horas_normais) || 220;
        const extra60h = horasParaFloat(row.extra_60);
        const extra100h = horasParaFloat(row.extra_100);
        const valorHora = salario / horasNormais;
        const valorExtra60 = extra60h * valorHora * 1.6;
        const valorExtra100 = extra100h * valorHora * 2.0;
        const totalBruto = salario + insalubridade + periculosidade + plr
                         + valorExtra60 + valorExtra100 + parseFloat(row.comissao || 0)
                         + parseFloat(row.bonus_comissao || 0) + parseFloat(row.premio || 0);
        const inss = calcINSS(totalBruto);
        const baseIRRF = totalBruto - inss;
        const irrf = calcIRRF(baseIRRF);
        const diasMes = horasNormais / 8;
        const descontoFalta = (parseInt(row.dias_falta) || 0) > 0 ? (salario / diasMes) * (parseInt(row.dias_falta) || 0) : 0;
        const descontoAtraso = horasParaFloat(row.horas_atraso) * valorHora;
        const vt = parseFloat(row.vt) || 0;
        const farmacia = parseFloat(row.farmacia) || 0;
        const mercado = parseFloat(row.mercado) || 0;
        const outros = parseFloat(row.outros) || 0;
        const multas = parseFloat(row.multas) || 0;
        const academia = parseFloat(row.academia) || 0;
        const consignado = parseFloat(row.consignado) || 0;
        const adiantamento = (row.adiantamento_salarial === 'Sim' || row.adiantamento_salarial === '1')
                            ? (parseFloat(row.adiantamento_valor) || 0) : 0;
        let pensao = 0;
        if (row.folha_pensao_tipo && parseFloat(row.folha_pensao_pct) > 0) {
            const pct = parseFloat(row.folha_pensao_pct) / 100;
            if (row.folha_pensao_tipo === 'bruto') {
                pensao = Math.round(totalBruto * pct * 100) / 100;
            } else {
                pensao = Math.round((totalBruto - inss - irrf) * pct * 100) / 100;
            }
        }
        const sindical = parseInt(row.folha_mensalidade_sindical) === 1 ? (parseFloat(row.folha_mensalidade_sindical_valor) || 0) : 0;
        const totalDescontos = inss + irrf + descontoFalta + descontoAtraso
                             + vt + farmacia + mercado + outros + multas
                             + academia + consignado + adiantamento + pensao + sindical;
        const liquido = Math.max(0, totalBruto - totalDescontos);
        return {
            totalBruto: Math.round(totalBruto * 100) / 100,
            inss: Math.round(inss * 100) / 100,
            irrf: Math.round(irrf * 100) / 100,
            descontoFalta: Math.round(descontoFalta * 100) / 100,
            descontoAtraso: Math.round(descontoAtraso * 100) / 100,
            valorExtra60: Math.round(valorExtra60 * 100) / 100,
            valorExtra100: Math.round(valorExtra100 * 100) / 100,
            pensao: Math.round(pensao * 100) / 100,
            totalDescontos: Math.round(totalDescontos * 100) / 100,
            liquido: Math.round(liquido * 100) / 100,
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // FORMATAR MOEDA
    // ─────────────────────────────────────────────────────────────────
    function fmt(v) {
        return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getToken() {
        return window.currentToken || localStorage.getItem('erp_token') || '';
    }

    // ─────────────────────────────────────────────────────────────────
    // RENDERIZAR CONTAINER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────
    function renderizarTela() {
        const container = document.getElementById('fechamento-container');
        if (!container) return;
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        container.innerHTML = `
<div style="padding:1.5rem;max-width:100%;">

  <!-- HEADER: título + seletores -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
    <div>
      <h2 style="margin:0;color:#1e40af;font-size:1.4rem;">Fechamento Mensal de Folha</h2>
      <p style="margin:.2rem 0 0;color:#6b7280;font-size:.9rem;">Preencha os dados, faça uploads e gere a planilha para a contabilidade.</p>
    </div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
      <select id="fech-select-mes" style="padding:.45rem .7rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.9rem;">
        ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=>
          `<option value="${i+1}" ${i+1===mesAtual?'selected':''}>${m}</option>`
        ).join('')}
      </select>
      <select id="fech-select-ano" style="padding:.45rem .7rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.9rem;">
        ${[anoAtual-1,anoAtual,anoAtual+1].map(a=>`<option value="${a}" ${a===anoAtual?'selected':''}>${a}</option>`).join('')}
      </select>
      <button onclick="window._fechamento.buscar()" style="background:#1e40af;color:#fff;border:none;padding:.5rem 1rem;border-radius:.5rem;font-size:.9rem;cursor:pointer;">
        <i class="ph ph-magnifying-glass"></i> Buscar
      </button>
    </div>
  </div>

  <!-- TOOLBAR DE AÇÕES (aparece após buscar) -->
  <div id="fech-toolbar" style="display:none;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem 1rem;margin-bottom:1rem;display:none;flex-wrap:wrap;gap:.5rem;align-items:center;">
    <span style="font-weight:600;color:#374151;font-size:.85rem;margin-right:.5rem;">Ações:</span>

    <!-- Upload Farmácia -->
    <label style="background:#0891b2;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-upload-simple"></i> Farmácia (PDF)
      <input type="file" accept=".pdf" style="display:none;" onchange="window._fechamento.uploadFarmacia(this)">
    </label>

    <!-- Upload Consignado -->
    <label style="background:#7c3aed;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-upload-simple"></i> Consignado (XLSX)
      <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="window._fechamento.uploadConsignado(this)">
    </label>

    <!-- Colar Mercado -->
    <button onclick="window._fechamento.abrirModalMercado()" style="background:#d97706;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-shopping-cart"></i> Mercado (Texto)
    </button>

    <!-- Multas prontuário -->
    <button onclick="window._fechamento.carregarMultas()" style="background:#dc2626;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-warning"></i> Carregar Multas
    </button>

    <!-- PLR -->
    <button onclick="window._fechamento.carregarPLR()" style="background:#059669;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-trophy"></i> Calcular PLR
    </button>

    <div style="flex:1;min-width:20px;"></div>

    <!-- Salvar -->
    <button id="fech-btn-salvar" onclick="window._fechamento.salvarTudo()" style="background:#16a34a;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-floppy-disk"></i> Salvar
    </button>

    <!-- Gerar XLSX -->
    <button onclick="window._fechamento.gerarXlsx()" style="background:#1e40af;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-file-xls"></i> Gerar XLSX
    </button>

    <!-- Enviar Email -->
    <button onclick="window._fechamento.abrirModalEmail()" style="background:#1e293b;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-envelope"></i> Enviar Contabilidade
    </button>
  </div>

  <!-- Filtro por nome -->
  <div id="fech-filtro-wrap" style="margin-bottom:.75rem;display:none;">
    <input id="fech-busca-nome" type="text" placeholder="Filtrar por nome..." style="padding:.4rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;width:260px;font-size:.85rem;" oninput="window._fechamento.filtrar(this.value)">
  </div>

  <!-- Tabela principal -->
  <div id="fech-tabela-wrap" style="overflow-x:auto;display:none;">
    <table id="fech-tabela" style="width:100%;border-collapse:collapse;font-size:.8rem;min-width:1500px;">
      <thead>
        <tr style="background:#1e40af;color:#fff;">
          <th style="padding:.45rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;background:#1e40af;z-index:2;">Colaborador</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Cargo</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Salário</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;" title="Horas normais mensais">H.Normais</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;" title="Horas trabalhadas">H.Trab.</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Ext.60%</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Ext.100%</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">DSR</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Faltas</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Atrasos</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">VT</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;background:#0c4a6e;">Farmácia</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;background:#78350f;">Mercado</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;background:#7f1d1d;">Multas</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Academia</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;background:#4c1d95;">Consig.</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Comissão</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Bônus</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;background:#14532d;">PLR</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Prêmio</th>
          <th style="padding:.45rem .35rem;white-space:nowrap;">Outros</th>
          <th style="padding:.45rem .5rem;white-space:nowrap;background:#164e63;">Total Bruto</th>
          <th style="padding:.45rem .5rem;white-space:nowrap;background:#064e3b;">Líquido</th>
        </tr>
      </thead>
      <tbody id="fech-tbody"></tbody>
    </table>
  </div>

  <div id="fech-msg" style="text-align:center;color:#6b7280;padding:3rem;font-size:1rem;">
    <i class="ph ph-calendar-blank" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
    Selecione mês/ano e clique em Buscar.
  </div>
</div>

<!-- MODAL: Mercado -->
<div id="fech-modal-mercado" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:.75rem;padding:1.5rem;width:500px;max-width:95vw;box-shadow:0 20px 40px rgba(0,0,0,.3);">
    <h3 style="margin:0 0 .75rem;color:#92400e;"><i class="ph ph-shopping-cart"></i> Desconto Mercado</h3>
    <p style="margin:0 0 .75rem;color:#6b7280;font-size:.85rem;">Cole o texto da planilha no formato: <code>Nome R$valor</code> (uma linha por colaborador)</p>
    <textarea id="fech-mercado-texto" rows="10" style="width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.6rem;font-size:.82rem;font-family:monospace;box-sizing:border-box;" placeholder="Ex:\nJOÃO DA SILVA R$85,00\nMARIA SOUZA R$120,50"></textarea>
    <div style="display:flex;gap:.5rem;margin-top:1rem;justify-content:flex-end;">
      <button onclick="window._fechamento.fecharModalMercado()" style="padding:.45rem 1rem;border:1px solid #d1d5db;background:#fff;border-radius:.4rem;cursor:pointer;">Cancelar</button>
      <button onclick="window._fechamento.parseMercado()" style="padding:.45rem 1rem;background:#d97706;color:#fff;border:none;border-radius:.4rem;cursor:pointer;font-weight:600;">Aplicar</button>
    </div>
  </div>
</div>

<!-- MODAL: Email -->
<div id="fech-modal-email" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:.75rem;padding:1.5rem;width:480px;max-width:95vw;box-shadow:0 20px 40px rgba(0,0,0,.3);">
    <h3 style="margin:0 0 .75rem;color:#1e293b;"><i class="ph ph-envelope"></i> Enviar para Contabilidade</h3>
    <p style="margin:0 0 1rem;color:#6b7280;font-size:.85rem;">O arquivo XLSX de fechamento será enviado por email.</p>
    <div style="margin-bottom:.75rem;">
      <label style="display:block;font-weight:600;margin-bottom:.3rem;font-size:.85rem;">Email da Contabilidade:</label>
      <input id="fech-email-destino" type="email" placeholder="contabilidade@empresa.com" style="width:100%;padding:.5rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.9rem;box-sizing:border-box;">
    </div>
    <div id="fech-email-status" style="display:none;padding:.5rem .75rem;border-radius:.4rem;margin-bottom:.75rem;font-size:.85rem;"></div>
    <div style="display:flex;gap:.5rem;justify-content:flex-end;">
      <button onclick="window._fechamento.fecharModalEmail()" style="padding:.45rem 1rem;border:1px solid #d1d5db;background:#fff;border-radius:.4rem;cursor:pointer;">Cancelar</button>
      <button onclick="window._fechamento.enviarEmail()" id="fech-btn-enviar-email" style="padding:.45rem 1rem;background:#1e293b;color:#fff;border:none;border-radius:.4rem;cursor:pointer;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviar</button>
    </div>
  </div>
</div>`;
    }

    // ─────────────────────────────────────────────────────────────────
    // BUSCAR DADOS
    // ─────────────────────────────────────────────────────────────────
    async function buscar() {
        _mes = parseInt(document.getElementById('fech-select-mes').value);
        _ano = parseInt(document.getElementById('fech-select-ano').value);
        const msg = document.getElementById('fech-msg');
        const wrap = document.getElementById('fech-tabela-wrap');
        const toolbar = document.getElementById('fech-toolbar');
        const filtroWrap = document.getElementById('fech-filtro-wrap');
        if (msg) { msg.style.display = 'block'; msg.innerHTML = '<i class="ph ph-spinner"></i> Carregando...'; }
        if (wrap) wrap.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (filtroWrap) filtroWrap.style.display = 'none';

        try {
            const resp = await fetch(`/api/fechamento/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            _dados = await resp.json();
            renderizarTabela(_dados);
            if (wrap) wrap.style.display = 'block';
            if (msg) msg.style.display = 'none';
            if (toolbar) toolbar.style.display = 'flex';
            if (filtroWrap) filtroWrap.style.display = 'block';
        } catch (e) {
            if (msg) msg.innerHTML = `<span style="color:#dc2626;"><i class="ph ph-warning-circle"></i> Erro: ${e.message}</span>`;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // RENDERIZAR TABELA
    // ─────────────────────────────────────────────────────────────────
    function renderizarTabela(dados) {
        const tbody = document.getElementById('fech-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        dados.forEach((row, idx) => {
            const calc = calcularColaborador(row);
            const isAcad = row.academia_participa === 'Sim';
            const defaultAcad = isAcad ? (parseFloat(row.academia_desconto_valor) || 60) : 0;
            const defaultVT = row.meio_transporte === 'Vale Transporte' ? 1 : 0;
            // Preencher defaults no estado
            if (!_dados[idx].horas_normais) _dados[idx].horas_normais = '220:00';
            if (_dados[idx].vt == null) _dados[idx].vt = defaultVT;
            if (_dados[idx].academia == null) _dados[idx].academia = defaultAcad;

            const isFerias = (row.colab_status || '').toLowerCase().includes('férias');
            const bgRow = isFerias ? '#fff7ed' : '';

            const tr = document.createElement('tr');
            tr.style.cssText = `border-bottom:1px solid #e5e7eb;${bgRow ? 'background:' + bgRow + ';' : ''}`;
            tr.dataset.idx = idx;
            tr.innerHTML = `
<td style="padding:.35rem .5rem;white-space:nowrap;position:sticky;left:0;background:${bgRow||'#fff'};font-weight:600;min-width:140px;z-index:1;" title="${row.nome_completo||''}">${(row.nome_completo||'—').substring(0,20)}${isFerias?' 🏖️':''}</td>
<td style="padding:.35rem .3rem;white-space:nowrap;color:#6b7280;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${row.cargo||'—'}</td>
<td style="padding:.35rem .3rem;white-space:nowrap;">${fmt(row.salario)}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'horas_normais',row.horas_normais||'220:00')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'horas_trabalhadas',row.horas_trabalhadas||'')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'extra_60',row.extra_60||'')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'extra_100',row.extra_100||'')}</td>
<td style="padding:.35rem .3rem;">${inpDsr(idx, row.dsr)}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'dias_falta',row.dias_falta||0,'0')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'horas_atraso',row.horas_atraso||'')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'vt',_dados[idx].vt,'0','1')}</td>
<td style="padding:.35rem .3rem;background:#f0f9ff;" id="fech-cell-farmacia-${idx}">${inpNum(idx,'farmacia',row.farmacia||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#fffbeb;" id="fech-cell-mercado-${idx}">${inpNum(idx,'mercado',row.mercado||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#fff1f2;" id="fech-cell-multas-${idx}">${inpNum(idx,'multas',row.multas||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'academia',_dados[idx].academia,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#faf5ff;" id="fech-cell-consig-${idx}">${inpNum(idx,'consignado',row.consignado||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'comissao',row.comissao||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'bonus_comissao',row.bonus_comissao||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#f0fdf4;" id="fech-cell-plr-${idx}">${inpNum(idx,'plr',row.plr||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'premio',row.premio||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'outros',row.outros||0,'0.00','0.01')}</td>
<td style="padding:.35rem .4rem;text-align:right;font-weight:600;color:#0e4680;background:#eff6ff;" id="fech-bruto-${idx}">${fmt(calc.totalBruto)}</td>
<td style="padding:.35rem .4rem;text-align:right;font-weight:700;color:#065f46;background:#ecfdf5;" id="fech-liq-${idx}">${fmt(calc.liquido)}</td>`;
            tbody.appendChild(tr);
        });
    }

    function inpHora(idx, campo, val) {
        return `<input type="text" placeholder="00:00" value="${val||''}" style="width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;" oninput="window._fechamento.atualizar(${idx},'${campo}',this.value)">`;
    }
    function inpNum(idx, campo, val, placeholder, step) {
        return `<input type="number" step="${step||1}" min="0" value="${(val||val===0)?val:''}" placeholder="${placeholder||'0'}" style="width:68px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;" oninput="window._fechamento.atualizar(${idx},'${campo}',this.value)">`;
    }
    function inpDsr(idx, val) {
        return `<select style="width:45px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;font-size:.8rem;" onchange="window._fechamento.atualizar(${idx},'dsr',this.value)">
            <option value="Não" ${val!=='Sim'?'selected':''}>N</option>
            <option value="Sim" ${val==='Sim'?'selected':''}>S</option>
        </select>`;
    }

    // ─────────────────────────────────────────────────────────────────
    // ATUALIZAR E RECALCULAR
    // ─────────────────────────────────────────────────────────────────
    function atualizar(idx, campo, valor) {
        if (!_dados[idx]) return;
        _dados[idx][campo] = valor;
        const calc = calcularColaborador(_dados[idx]);
        const brutoEl = document.getElementById(`fech-bruto-${idx}`);
        const liqEl = document.getElementById(`fech-liq-${idx}`);
        if (brutoEl) brutoEl.textContent = fmt(calc.totalBruto);
        if (liqEl) liqEl.textContent = fmt(calc.liquido);
    }

    // ─────────────────────────────────────────────────────────────────
    // FILTRAR POR NOME
    // ─────────────────────────────────────────────────────────────────
    function filtrar(texto) {
        const rows = document.querySelectorAll('#fech-tbody tr');
        const t = texto.toLowerCase().trim();
        rows.forEach(tr => {
            const nome = (tr.querySelector('td')?.textContent || '').toLowerCase();
            tr.style.display = !t || nome.includes(t) ? '' : 'none';
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD FARMÁCIA (PDF)
    // ─────────────────────────────────────────────────────────────────
    async function uploadFarmacia(input) {
        if (!input.files[0]) return;
        const formData = new FormData();
        formData.append('pdf', input.files[0]);
        try {
            Swal.fire({ title: 'Processando PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/upload-farmacia', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            // Preencher coluna farmácia por CPF
            let atualizados = 0;
            _dados.forEach((row, idx) => {
                const cpf = (row.cpf || '').replace(/[.\-]/g, '');
                if (json.farmacia[cpf]) {
                    const val = json.farmacia[cpf].valor;
                    _dados[idx].farmacia = val;
                    // Atualizar input na tela
                    const cell = document.getElementById(`fech-cell-farmacia-${idx}`);
                    if (cell) cell.querySelector('input').value = val;
                    atualizar(idx, 'farmacia', val);
                    atualizados++;
                }
            });
            Swal.fire({ icon: 'success', title: `Farmácia processada!`, text: `${atualizados} colaboradores com desconto. Total de entradas: ${Object.keys(json.farmacia).length}.`, timer: 3000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro no PDF de Farmácia', text: e.message });
        }
        input.value = '';
    }

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD CONSIGNADO (XLSX)
    // ─────────────────────────────────────────────────────────────────
    async function uploadConsignado(input) {
        if (!input.files[0]) return;
        const formData = new FormData();
        formData.append('xlsx', input.files[0]);
        formData.append('mes', _mes);
        formData.append('ano', _ano);
        try {
            Swal.fire({ title: 'Processando XLSX...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/upload-consignado', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            // Preencher coluna consignado por CPF
            let atualizados = 0;
            _dados.forEach((row, idx) => {
                const cpf = (row.cpf || '').replace(/[.\-]/g, '');
                if (json.consignado[cpf]) {
                    const val = json.consignado[cpf].valor;
                    _dados[idx].consignado = val;
                    const cell = document.getElementById(`fech-cell-consig-${idx}`);
                    if (cell) cell.querySelector('input').value = val;
                    atualizar(idx, 'consignado', val);
                    atualizados++;
                }
            });
            Swal.fire({ icon: 'success', title: 'Consignado processado!', text: `${atualizados} colaboradores com desconto.`, timer: 3000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro no XLSX de Consignado', text: e.message });
        }
        input.value = '';
    }

    // ─────────────────────────────────────────────────────────────────
    // MODAL MERCADO
    // ─────────────────────────────────────────────────────────────────
    function abrirModalMercado() {
        const modal = document.getElementById('fech-modal-mercado');
        if (modal) modal.style.display = 'flex';
    }
    function fecharModalMercado() {
        const modal = document.getElementById('fech-modal-mercado');
        if (modal) modal.style.display = 'none';
    }
    function parseMercado() {
        const texto = document.getElementById('fech-mercado-texto').value || '';
        const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
        let atualizados = 0;
        const naoEncontrados = [];

        for (const linha of linhas) {
            // Formato: "NOME DO COLABORADOR R$150,00" ou "NOME R$ 150,00"
            const match = linha.match(/^(.+?)\s+R\$\s*([\d.,]+)\s*$/i);
            if (!match) continue;
            const nomeTexto = match[1].trim().toLowerCase();
            const valor = parseFloat(match[2].replace(',', '.')) || 0;

            // Buscar colaborador por nome (parcial)
            let melhorIdx = -1, melhorScore = 0;
            _dados.forEach((row, idx) => {
                const nomeColab = (row.nome_completo || '').toLowerCase();
                // Score: palavras do texto que aparecem no nome
                const palavras = nomeTexto.split(' ').filter(p => p.length > 2);
                const score = palavras.filter(p => nomeColab.includes(p)).length;
                if (score > melhorScore) { melhorScore = score; melhorIdx = idx; }
            });

            if (melhorIdx >= 0 && melhorScore >= 1) {
                _dados[melhorIdx].mercado = (_dados[melhorIdx].mercado || 0) + valor;
                const cell = document.getElementById(`fech-cell-mercado-${melhorIdx}`);
                if (cell) cell.querySelector('input').value = _dados[melhorIdx].mercado;
                atualizar(melhorIdx, 'mercado', _dados[melhorIdx].mercado);
                atualizados++;
            } else {
                naoEncontrados.push(nomeTexto);
            }
        }

        fecharModalMercado();
        let msg = `${atualizados} colaboradores atualizados.`;
        if (naoEncontrados.length) msg += `\n\nNão encontrados:\n• ${naoEncontrados.join('\n• ')}`;
        Swal.fire({ icon: atualizados > 0 ? 'success' : 'warning', title: 'Mercado processado', text: msg });
    }

    // ─────────────────────────────────────────────────────────────────
    // CARREGAR MULTAS DO PRONTUÁRIO
    // ─────────────────────────────────────────────────────────────────
    async function carregarMultas() {
        try {
            const resp = await fetch(`/api/fechamento/multas-prontuario/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const json = await resp.json();
            if (!Array.isArray(json)) throw new Error(json.error || 'Resposta inválida');
            if (json.length === 0) {
                Swal.fire({ icon: 'info', title: 'Sem multas', text: 'Nenhuma multa com desconto em folha para este mês.' });
                return;
            }
            json.forEach(item => {
                const idx = _dados.findIndex(r => r.id === item.colaborador_id || r.colaborador_id === item.colaborador_id);
                if (idx >= 0) {
                    _dados[idx].multas = item.valor_total;
                    const cell = document.getElementById(`fech-cell-multas-${idx}`);
                    if (cell) cell.querySelector('input').value = item.valor_total;
                    atualizar(idx, 'multas', item.valor_total);
                }
            });
            Swal.fire({ icon: 'success', title: 'Multas carregadas!', text: `${json.length} colaborador(es) com desconto de multas.`, timer: 2500, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao carregar multas', text: e.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR PLR
    // ─────────────────────────────────────────────────────────────────
    async function carregarPLR() {
        try {
            const resp = await fetch(`/api/fechamento/plr/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const json = await resp.json();
            if (!Array.isArray(json)) throw new Error(json.error || 'Resposta inválida');
            if (json.length === 0) {
                Swal.fire({ icon: 'info', title: 'PLR', text: 'Nenhum colaborador recebe PLR neste mês (PLR é pago em outubro e abril).' });
                return;
            }
            json.forEach(item => {
                const idx = _dados.findIndex(r => r.id === item.colaborador_id || r.colaborador_id === item.colaborador_id);
                if (idx >= 0) {
                    _dados[idx].plr = item.plr_valor;
                    const cell = document.getElementById(`fech-cell-plr-${idx}`);
                    if (cell) cell.querySelector('input').value = item.plr_valor;
                    atualizar(idx, 'plr', item.plr_valor);
                }
            });
            const total = json.reduce((s, i) => s + i.plr_valor, 0);
            Swal.fire({ icon: 'success', title: 'PLR calculado!', text: `${json.length} colaborador(es). Total: ${fmt(total)}.`, timer: 3000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao calcular PLR', text: e.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // GERAR XLSX
    // ─────────────────────────────────────────────────────────────────
    async function gerarXlsx() {
        try {
            Swal.fire({ title: 'Gerando planilha...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/gerar-xlsx', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano })
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || resp.statusText);
            }
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fechamento_${String(_mes).padStart(2,'0')}_${_ano}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            Swal.close();
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao gerar XLSX', text: e.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // MODAL EMAIL
    // ─────────────────────────────────────────────────────────────────
    function abrirModalEmail() {
        const modal = document.getElementById('fech-modal-email');
        if (modal) modal.style.display = 'flex';
        const statusEl = document.getElementById('fech-email-status');
        if (statusEl) statusEl.style.display = 'none';
    }
    function fecharModalEmail() {
        const modal = document.getElementById('fech-modal-email');
        if (modal) modal.style.display = 'none';
    }
    async function enviarEmail() {
        const emailDestino = document.getElementById('fech-email-destino').value.trim();
        if (!emailDestino || !emailDestino.includes('@')) {
            Swal.fire({ icon: 'warning', title: 'Email inválido', text: 'Informe um email válido.' });
            return;
        }
        const btn = document.getElementById('fech-btn-enviar-email');
        const statusEl = document.getElementById('fech-email-status');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner"></i> Enviando...';
        if (statusEl) { statusEl.style.display = 'none'; }
        try {
            const resp = await fetch('/api/fechamento/enviar-email', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano, email_destino: emailDestino })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            if (statusEl) {
                statusEl.style.cssText = 'display:block;background:#dcfce7;color:#166534;padding:.5rem .75rem;border-radius:.4rem;margin-bottom:.75rem;font-size:.85rem;';
                statusEl.innerHTML = `<i class="ph ph-check-circle"></i> ${json.mensagem}`;
            }
            btn.innerHTML = '<i class="ph ph-check"></i> Enviado!';
            setTimeout(() => fecharModalEmail(), 2500);
        } catch(e) {
            if (statusEl) {
                statusEl.style.cssText = 'display:block;background:#fee2e2;color:#991b1b;padding:.5rem .75rem;border-radius:.4rem;margin-bottom:.75rem;font-size:.85rem;';
                statusEl.innerHTML = `<i class="ph ph-warning-circle"></i> ${e.message}`;
            }
            btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar';
            btn.disabled = false;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // SALVAR TUDO
    // ─────────────────────────────────────────────────────────────────
    async function salvarTudo() {
        if (!_mes || !_ano) return;
        const btn = document.getElementById('fech-btn-salvar');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner"></i> Salvando...';

        const itens = _dados.map(row => {
            const calc = calcularColaborador(row);
            return {
                colaborador_id: row.id || row.colaborador_id,
                horas_normais: row.horas_normais,
                horas_trabalhadas: row.horas_trabalhadas,
                horas_noturnas: row.horas_noturnas,
                dias_falta: parseInt(row.dias_falta) || 0,
                data_faltas: row.data_faltas,
                horas_atraso: row.horas_atraso,
                extra_60: row.extra_60,
                extra_100: row.extra_100,
                dsr: row.dsr,
                vt: parseFloat(row.vt) || 0,
                farmacia: parseFloat(row.farmacia) || 0,
                mercado: parseFloat(row.mercado) || 0,
                outros: parseFloat(row.outros) || 0,
                multas: parseFloat(row.multas) || 0,
                academia: parseFloat(row.academia) || 0,
                consignado: parseFloat(row.consignado) || 0,
                comissao: parseFloat(row.comissao) || 0,
                bonus_comissao: parseFloat(row.bonus_comissao) || 0,
                premio: parseFloat(row.premio) || 0,
                plr: parseFloat(row.plr) || 0,
                insalubridade: parseFloat(row.folha_insalubridade_valor) || 0,
                periculosidade: parseFloat(row.folha_periculosidade_valor) || 0,
                pensao_pct: parseFloat(row.folha_pensao_pct) || 0,
                dias_intermitente: parseInt(row.dias_intermitente) || 0,
                status: 'rascunho',
            };
        });

        try {
            const resp = await fetch('/api/fechamento/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ mes: _mes, ano: _ano, itens })
            });
            const json = await resp.json();
            if (json.ok) {
                Swal.fire({ icon: 'success', title: 'Fechamento salvo!', timer: 2000, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Erro ao salvar', text: json.error });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────
    function init() {
        renderizarTela();
    }

    return {
        init, buscar, atualizar, filtrar, salvarTudo,
        uploadFarmacia, uploadConsignado,
        abrirModalMercado, fecharModalMercado, parseMercado,
        carregarMultas, carregarPLR,
        gerarXlsx, abrirModalEmail, fecharModalEmail, enviarEmail,
        calcularColaborador, calcINSS, calcIRRF
    };
})();

// Hook no navigateTo
(function () {
    const _origNav = window.navigateTo;
    window.navigateTo = function (target) {
        if (_origNav) _origNav(target);
        if (target === 'fechamento') {
            setTimeout(() => window._fechamento.init(), 50);
        }
    };
})();
