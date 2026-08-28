// ═══════════════════════════════════════════════════════════════════
// fechamento.js — Fechamento Mensal de Folha de Pagamento
// América Rental — versão 1.0 (2026-08-28)
// ═══════════════════════════════════════════════════════════════════

window._fechamento = (function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────
    // ESTADO GLOBAL
    // ─────────────────────────────────────────────────────────────────
    let _dados = [];          // array de colaboradores + dados do fechamento
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
        { ate: 2259.20,  aliq: 0,     deducao: 0        },
        { ate: 2826.65,  aliq: 0.075, deducao: 169.44   },
        { ate: 3751.05,  aliq: 0.15,  deducao: 381.44   },
        { ate: 4664.68,  aliq: 0.225, deducao: 662.77   },
        { ate: Infinity, aliq: 0.275, deducao: 896.00   },
    ];
    const DEDUCAO_DEPENDENTE_IRRF = 189.59;

    function calcIRRF(baseCalculo, numDependentes = 0) {
        const baseAjustada = baseCalculo - (numDependentes * DEDUCAO_DEPENDENTE_IRRF);
        if (baseAjustada <= 0) return 0;
        for (const f of FAIXAS_IRRF) {
            if (baseAjustada <= f.ate) {
                return Math.max(0, Math.round((baseAjustada * f.aliq - f.deducao) * 100) / 100);
            }
        }
        return 0;
    }

    // ─────────────────────────────────────────────────────────────────
    // CONVERSÃO DE HORAS "HH:MM" → float
    // ─────────────────────────────────────────────────────────────────
    function horasParaFloat(str) {
        if (!str) return 0;
        const [h, m] = String(str).split(':').map(Number);
        return (h || 0) + (m || 0) / 60;
    }

    function floatParaHoras(f) {
        if (!f || isNaN(f)) return '00:00';
        const h = Math.floor(f);
        const m = Math.round((f - h) * 60);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR VALORES DO COLABORADOR
    // ─────────────────────────────────────────────────────────────────
    function calcularColaborador(row) {
        const salario = parseFloat(row.salario) || 0;

        // Adicionais
        const insalubridade = parseFloat(row.insalubridade) || 0;
        const periculosidade = parseFloat(row.periculosidade) || 0;
        const plr = parseFloat(row.plr) || 0;

        // Horas extras
        const horasNormais = horasParaFloat(row.horas_normais) || 220; // carga horária padrão
        const horasTrabalhadas = horasParaFloat(row.horas_trabalhadas);
        const extra60h = horasParaFloat(row.extra_60);
        const extra100h = horasParaFloat(row.extra_100);
        const valorHora = salario / horasNormais;
        const valorExtra60 = extra60h * valorHora * 1.6;
        const valorExtra100 = extra100h * valorHora * 2.0;

        // Total bruto
        const totalBruto = salario + insalubridade + periculosidade + plr
                         + valorExtra60 + valorExtra100 + parseFloat(row.comissao||0)
                         + parseFloat(row.bonus_comissao||0) + parseFloat(row.premio||0);

        // INSS e IRRF sobre o bruto
        const inss = calcINSS(totalBruto);
        const baseIRRF = totalBruto - inss;
        const irrf = calcIRRF(baseIRRF, 0);

        // Descontos
        const descontoFalta = calcDescontoFalta(salario, row.dias_falta, horasNormais);
        const descontoAtraso = calcDescontoAtraso(salario, row.horas_atraso, horasNormais);
        const vt = parseFloat(row.vt) || 0;
        const farmacia = parseFloat(row.farmacia) || 0;
        const mercado = parseFloat(row.mercado) || 0;
        const outros = parseFloat(row.outros) || 0;
        const multas = parseFloat(row.multas) || 0;
        const academia = parseFloat(row.academia) || 0;
        const consignado = parseFloat(row.consignado) || 0;
        const adiantamento = (row.adiantamento_salarial === 'Sim' || row.adiantamento_salarial === '1')
                            ? (parseFloat(row.adiantamento_valor) || 0) : 0;

        // PENSÃO
        let pensao = parseFloat(row.pensao) || 0;
        if (row.folha_pensao_tipo && parseFloat(row.folha_pensao_pct) > 0) {
            const pct = parseFloat(row.folha_pensao_pct) / 100;
            if (row.folha_pensao_tipo === 'bruto') {
                pensao = Math.round(totalBruto * pct * 100) / 100;
            } else { // liquido
                const baseLiquida = totalBruto - inss - irrf;
                pensao = Math.round(baseLiquida * pct * 100) / 100;
            }
        }

        const totalDescontos = inss + irrf + descontoFalta + descontoAtraso
                             + vt + farmacia + mercado + outros + multas
                             + academia + consignado + adiantamento + pensao;

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

    function calcDescontoFalta(salario, diasFalta, horasNormais) {
        if (!diasFalta) return 0;
        const diasMes = horasNormais / 8; // aprox
        return (salario / diasMes) * diasFalta;
    }

    function calcDescontoAtraso(salario, horasAtraso, horasNormais) {
        const h = horasParaFloat(horasAtraso);
        if (!h) return 0;
        const valorHora = salario / horasNormais;
        return h * valorHora;
    }

    // ─────────────────────────────────────────────────────────────────
    // FORMATAR MOEDA
    // ─────────────────────────────────────────────────────────────────
    function fmt(v) {
        return 'R$ ' + (parseFloat(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
    <div>
      <h2 style="margin:0;color:#1e40af;font-size:1.4rem;">Fechamento Mensal de Folha</h2>
      <p style="margin:.2rem 0 0;color:#6b7280;font-size:.9rem;">Preencha os dados de ponto e adicionais de cada colaborador.</p>
    </div>
    <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;">
      <select id="fech-select-mes" style="padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.95rem;">
        ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=>
          `<option value="${i+1}" ${i+1===mesAtual?'selected':''}>${m}</option>`
        ).join('')}
      </select>
      <select id="fech-select-ano" style="padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.95rem;">
        ${[anoAtual-1,anoAtual,anoAtual+1].map(a=>`<option value="${a}" ${a===anoAtual?'selected':''}>${a}</option>`).join('')}
      </select>
      <button onclick="window._fechamento.buscar()" style="background:#1e40af;color:#fff;border:none;padding:.5rem 1.2rem;border-radius:.5rem;font-size:.95rem;cursor:pointer;">
        <i class="ph ph-magnifying-glass"></i> Buscar
      </button>
      <button onclick="window._fechamento.salvarTudo()" id="fech-btn-salvar" style="background:#059669;color:#fff;border:none;padding:.5rem 1.2rem;border-radius:.5rem;font-size:.95rem;cursor:pointer;display:none;">
        <i class="ph ph-floppy-disk"></i> Salvar
      </button>
    </div>
  </div>

  <!-- Filtro de busca -->
  <div style="margin-bottom:1rem;">
    <input id="fech-busca-nome" type="text" placeholder="Filtrar por nome..." style="padding:.45rem .8rem;border:1px solid #d1d5db;border-radius:.5rem;width:280px;font-size:.9rem;" oninput="window._fechamento.filtrar(this.value)">
  </div>

  <!-- Tabela -->
  <div id="fech-tabela-wrap" style="overflow-x:auto;display:none;">
    <table id="fech-tabela" style="width:100%;border-collapse:collapse;font-size:.82rem;min-width:1400px;">
      <thead>
        <tr style="background:#1e40af;color:#fff;">
          <th style="padding:.5rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;background:#1e40af;">Colaborador</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Cargo</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Salário</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;" title="Horas Normais mensais">H. Normais</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;" title="Horas efetivamente trabalhadas">H. Trabalhadas</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Extras 60%</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Extras 100%</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">DSR</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Faltas (dias)</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Atrasos (h)</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">VT (R$)</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Farmácia</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Mercado</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Multas</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Academia</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Consignado</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Comissão</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Bônus Com.</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Prêmio</th>
          <th style="padding:.5rem .4rem;white-space:nowrap;">Outros desc.</th>
          <th style="padding:.5rem .6rem;white-space:nowrap;background:#164e63;">Total Bruto</th>
          <th style="padding:.5rem .6rem;white-space:nowrap;background:#064e3b;">Líquido</th>
        </tr>
      </thead>
      <tbody id="fech-tbody"></tbody>
    </table>
  </div>
  <div id="fech-msg" style="text-align:center;color:#6b7280;padding:3rem;">Selecione mês/ano e clique em Buscar.</div>
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
        if (msg) msg.textContent = 'Carregando...';
        if (wrap) wrap.style.display = 'none';
        document.getElementById('fech-btn-salvar').style.display = 'none';

        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || '';
            const resp = await fetch(`/api/fechamento/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            _dados = await resp.json();
            renderizarTabela(_dados);
            if (wrap) wrap.style.display = 'block';
            if (msg) msg.style.display = 'none';
            document.getElementById('fech-btn-salvar').style.display = '';
        } catch (e) {
            if (msg) msg.textContent = 'Erro: ' + e.message;
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
            const isAcad = row.academia_participa === 'Sim' || row.academia_participa === '1';
            const defaultAcad = isAcad ? (parseFloat(row.academia_desconto_valor) || 60) : 0;
            const defaultVT = row.meio_transporte === 'Vale Transporte' ? (parseFloat(row.vt)||0) : 0;

            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid #e5e7eb;';
            tr.dataset.idx = idx;
            tr.innerHTML = `
<td style="padding:.4rem .6rem;white-space:nowrap;position:sticky;left:0;background:#fff;font-weight:600;min-width:160px;">${row.nome_completo || '—'}</td>
<td style="padding:.4rem;white-space:nowrap;color:#6b7280;">${row.cargo || '—'}</td>
<td style="padding:.4rem;white-space:nowrap;">${fmt(row.salario)}</td>
<td style="padding:.4rem;">${inpHora(idx,'horas_normais',row.horas_normais||'220:00')}</td>
<td style="padding:.4rem;">${inpHora(idx,'horas_trabalhadas',row.horas_trabalhadas||'')}</td>
<td style="padding:.4rem;">${inpHora(idx,'extra_60',row.extra_60||'')}</td>
<td style="padding:.4rem;">${inpHora(idx,'extra_100',row.extra_100||'')}</td>
<td style="padding:.4rem;">${inpDsr(idx, row.dsr)}</td>
<td style="padding:.4rem;">${inpNum(idx,'dias_falta',row.dias_falta||0,'0')}</td>
<td style="padding:.4rem;">${inpHora(idx,'horas_atraso',row.horas_atraso||'')}</td>
<td style="padding:.4rem;">${inpNum(idx,'vt',row.vt!=null?row.vt:defaultVT,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'farmacia',row.farmacia||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'mercado',row.mercado||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'multas',row.multas||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'academia',row.academia!=null?row.academia:defaultAcad,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'consignado',row.consignado||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'comissao',row.comissao||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'bonus_comissao',row.bonus_comissao||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'premio',row.premio||0,'0.00','0.01')}</td>
<td style="padding:.4rem;">${inpNum(idx,'outros',row.outros||0,'0.00','0.01')}</td>
<td style="padding:.4rem;text-align:right;font-weight:600;color:#0e4680;background:#eff6ff;" id="fech-bruto-${idx}">${fmt(calc.totalBruto)}</td>
<td style="padding:.4rem;text-align:right;font-weight:700;color:#065f46;background:#ecfdf5;" id="fech-liq-${idx}">${fmt(calc.liquido)}</td>`;
            tbody.appendChild(tr);

            // preencher _dados com defaults
            if (!_dados[idx].horas_normais) _dados[idx].horas_normais = '220:00';
            if (_dados[idx].vt == null) _dados[idx].vt = defaultVT;
            if (_dados[idx].academia == null) _dados[idx].academia = defaultAcad;
        });
    }

    function inpHora(idx, campo, val) {
        return `<input type="text" placeholder="00:00" value="${val||''}" style="width:60px;padding:.25rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;" oninput="window._fechamento.atualizar(${idx},'${campo}',this.value)">`;
    }

    function inpNum(idx, campo, val, placeholder, step) {
        return `<input type="number" step="${step||1}" min="0" value="${val||''}" placeholder="${placeholder||'0'}" style="width:70px;padding:.25rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;" oninput="window._fechamento.atualizar(${idx},'${campo}',this.value)">`;
    }

    function inpDsr(idx, val) {
        return `<select style="width:50px;padding:.25rem;border:1px solid #e5e7eb;border-radius:.3rem;" onchange="window._fechamento.atualizar(${idx},'dsr',this.value)">
            <option value="Não" ${val!=='Sim'?'selected':''}>Não</option>
            <option value="Sim" ${val==='Sim'?'selected':''}>Sim</option>
        </select>`;
    }

    // ─────────────────────────────────────────────────────────────────
    // ATUALIZAR VALOR E RECALCULAR LINHA
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
                insalubridade: calc.insalubridade || parseFloat(row.insalubridade) || 0,
                periculosidade: parseFloat(row.periculosidade) || 0,
                plr: parseFloat(row.plr) || 0,
                pensao: calc.pensao,
                dias_intermitente: parseInt(row.dias_intermitente) || 0,
                status: 'rascunho',
            };
        });

        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || '';
            const resp = await fetch('/api/fechamento/salvar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
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
    // INIT — chamado pelo navigateTo
    // ─────────────────────────────────────────────────────────────────
    function init() {
        renderizarTela();
    }

    return { init, buscar, atualizar, filtrar, salvarTudo, calcularColaborador, calcINSS, calcIRRF };
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
