/**
 * pagamentos_massa.js
 * Módulo de Docs em Massa — RH
 *
 * Permite selecionar colaboradores ativos, definir tipo de pagamento,
 * valor/percentual, e exportar planilha para repasse à contabilidade.
 */

(function () {
    'use strict';

    // ───────────────────────────────────────────────────────────────
    // Estado global do módulo
    // ───────────────────────────────────────────────────────────────
    let _colaboradores = [];     // todos os colaboradores ativos
    let _selecionados  = new Set(); // ids selecionados

    // ───────────────────────────────────────────────────────────────
    // Ponto de entrada chamado pelo navigateTo('pagamentos-massa')
    // ───────────────────────────────────────────────────────────────
    window.renderPagamentosMassa = async function () {
        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = _buildShell();
        _bindEvents();
        await _carregarColaboradores();
    };

    // ───────────────────────────────────────────────────────────────
    // HTML estático do módulo
    // ───────────────────────────────────────────────────────────────
    function _buildShell() {
        return `
<div id="pm-root" style="
    display:flex; flex-direction:column; height:100%;
    font-family:'Inter',sans-serif; background:#f8fafc;
">

  <!-- ── CABEÇALHO ─────────────────────────────────────────────── -->
  <div style="
      background:#fff; border-bottom:1px solid #e2e8f0;
      padding:1rem 1.5rem; display:flex; align-items:center;
      justify-content:space-between; flex-shrink:0;
  ">
    <div style="display:flex;align-items:center;gap:1rem;">
      <div style="
          width:44px;height:44px;border-radius:12px;
          background:linear-gradient(135deg,#f503c5,#a855f7);
          display:flex;align-items:center;justify-content:center;
          font-size:1.3rem;color:#fff;
      "><i class="ph ph-currency-dollar"></i></div>
      <div>
        <h2 style="margin:0;font-size:1.15rem;color:#1e293b;font-weight:700;">
            Docs em Massa</h2>
        <p style="margin:0;font-size:0.8rem;color:#64748b;">
            Selecione colaboradores e defina os valores para repasse</p>
      </div>
    </div>

    <div style="display:flex;gap:0.5rem;">
      <button id="pm-btn-exportar" class="pm-btn pm-btn-success" disabled>
        <i class="ph ph-file-xls"></i> Exportar Planilha
      </button>
    </div>
  </div>

  <!-- ── PAINEL DE CONFIGURAÇÃO ─────────────────────────────────── -->
  <div style="
      background:#fff; border-bottom:1px solid #e2e8f0;
      padding:1rem 1.5rem; flex-shrink:0;
      display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1rem;
  ">

    <!-- Tipo de Pagamento -->
    <div>
      <label class="pm-label">Tipo de Pagamento</label>
      <select id="pm-tipo" class="pm-select">
        <option value="">-- Selecione --</option>
        <option value="VALE_ALIMENTACAO">Vale Alimentação</option>
        <option value="VALE_TRANSPORTE">Vale Transporte</option>
        <option value="ADIANTAMENTO">Adiantamento</option>
        <option value="BONUS">Bônus / Gratificação</option>
        <option value="HORA_EXTRA">Horas Extras</option>
        <option value="OUTRO">Outro</option>
      </select>
    </div>

    <!-- Competência -->
    <div>
      <label class="pm-label">Competência (Mês/Ano)</label>
      <input type="month" id="pm-competencia" class="pm-input"
             value="${_mesAtual()}" />
    </div>

    <!-- Modo de valor -->
    <div>
      <label class="pm-label">Modo de Valor</label>
      <select id="pm-modo-valor" class="pm-select">
        <option value="fixo">Valor fixo por colaborador</option>
        <option value="percentual">Percentual sobre salário</option>
        <option value="individual">Valor individual por colaborador</option>
      </select>
    </div>

    <!-- Valor global -->
    <div id="pm-div-valor-global">
      <label class="pm-label">Valor / Percentual Global</label>
      <input type="number" id="pm-valor-global" class="pm-input"
             min="0" step="0.01" placeholder="0,00" />
    </div>

  </div>

  <!-- ── FILTROS DA LISTA ────────────────────────────────────────── -->
  <div style="
      background:#f1f5f9; border-bottom:1px solid #e2e8f0;
      padding:0.6rem 1.5rem; display:flex; gap:0.75rem;
      align-items:center; flex-shrink:0; flex-wrap:wrap;
  ">
    <input type="search" id="pm-busca" class="pm-input" style="max-width:220px;"
           placeholder="🔍  Buscar colaborador..." />
    <select id="pm-filtro-dept" class="pm-select" style="max-width:200px;">
      <option value="">Todos os Departamentos</option>
    </select>
    <label style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#475569;cursor:pointer;">
      <input type="checkbox" id="pm-chk-todos" style="accent-color:#f503c5;width:16px;height:16px;">
      Selecionar todos
    </label>
    <span id="pm-contador" style="font-size:0.82rem;color:#64748b;white-space:nowrap;">
      0 selecionados
    </span>
  </div>

  <!-- ── TABELA ─────────────────────────────────────────────────── -->
  <div style="flex:1;overflow-y:auto;padding:0 1.5rem 1.5rem;">
    <table id="pm-tabela" class="pm-table">
      <thead>
        <tr>
          <th style="width:36px;"></th>
          <th>Colaborador</th>
          <th>Departamento</th>
          <th>Cargo</th>
          <th>Salário Base</th>
          <th id="pm-col-valor-label">Valor (R$)</th>
        </tr>
      </thead>
      <tbody id="pm-tbody">
        <tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">
          Carregando colaboradores…
        </td></tr>
      </tbody>
    </table>
  </div>

</div>

<style>
  .pm-btn {
    display:inline-flex;align-items:center;gap:6px;
    padding:0.5rem 1rem;border:none;border-radius:8px;
    font-size:0.875rem;font-weight:600;cursor:pointer;transition:all .2s;
  }
  .pm-btn:disabled { opacity:.5;cursor:not-allowed; }
  .pm-btn-success { background:#10b981;color:#fff; }
  .pm-btn-success:hover:not(:disabled) { background:#059669; }
  .pm-label {
    display:block;font-size:0.78rem;font-weight:600;
    color:#475569;margin-bottom:4px;
  }
  .pm-input, .pm-select {
    width:100%;padding:0.5rem 0.7rem;border:1px solid #e2e8f0;
    border-radius:8px;font-size:0.875rem;outline:none;
    transition:border-color .2s;box-sizing:border-box;
    background:#fff;
  }
  .pm-input:focus, .pm-select:focus { border-color:#f503c5; }
  .pm-table {
    width:100%;border-collapse:collapse;margin-top:1rem;
    font-size:0.875rem;
  }
  .pm-table thead th {
    background:#f1f5f9;color:#475569;font-weight:600;
    padding:0.6rem 0.75rem;border-bottom:2px solid #e2e8f0;
    text-align:left;position:sticky;top:0;z-index:1;
  }
  .pm-table tbody tr {
    border-bottom:1px solid #f1f5f9;transition:background .15s;
  }
  .pm-table tbody tr:hover { background:#fdf4ff; }
  .pm-table tbody tr.pm-selected { background:#fce4f8; }
  .pm-table td { padding:0.6rem 0.75rem;vertical-align:middle; }
  .pm-valor-input {
    width:120px;padding:0.35rem 0.5rem;border:1px solid #e2e8f0;
    border-radius:6px;font-size:0.875rem;text-align:right;
  }
  .pm-valor-input:focus { border-color:#f503c5;outline:none; }
</style>
`;
    }

    // ───────────────────────────────────────────────────────────────
    // Vincular eventos
    // ───────────────────────────────────────────────────────────────
    function _bindEvents() {
        document.getElementById('pm-busca')
            .addEventListener('input', _renderTabela);

        document.getElementById('pm-filtro-dept')
            .addEventListener('change', _renderTabela);

        document.getElementById('pm-modo-valor')
            .addEventListener('change', _onModoValorChange);

        document.getElementById('pm-valor-global')
            .addEventListener('input', _aplicarValorGlobal);

        document.getElementById('pm-chk-todos')
            .addEventListener('change', _toggleTodos);

        document.getElementById('pm-btn-exportar')
            .addEventListener('click', _exportarPlanilha);
    }

    // ───────────────────────────────────────────────────────────────
    // Carregar colaboradores do backend
    // ───────────────────────────────────────────────────────────────
    async function _carregarColaboradores() {
        try {
            const res = await fetch('/api/colaboradores', {
                headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            const data = await res.json();

            // Filtrar apenas ativos
            _colaboradores = (data.colaboradores || data || [])
                .filter(c => (c.status || '').toLowerCase() === 'ativo')
                .map(c => ({
                    id: c.id,
                    nome: c.nome || '',
                    departamento: c.departamento || c.setor || '',
                    cargo: c.cargo || '',
                    salario: parseFloat(c.salario || c.remuneracao || 0) || 0,
                    valor: 0   // valor a pagar neste lote
                }));

            _popularFiltros();
            _renderTabela();
        } catch (e) {
            document.getElementById('pm-tbody').innerHTML =
                `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">
                    Erro ao carregar colaboradores: ${e.message}
                </td></tr>`;
        }
    }

    // ───────────────────────────────────────────────────────────────
    // Popular select de departamentos
    // ───────────────────────────────────────────────────────────────
    function _popularFiltros() {
        const depts = [...new Set(_colaboradores.map(c => c.departamento).filter(Boolean))].sort();
        const sel = document.getElementById('pm-filtro-dept');
        depts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = d;
            sel.appendChild(opt);
        });
    }

    // ───────────────────────────────────────────────────────────────
    // Renderizar tabela conforme filtros
    // ───────────────────────────────────────────────────────────────
    function _renderTabela() {
        const busca = (document.getElementById('pm-busca').value || '').toLowerCase();
        const dept  = (document.getElementById('pm-filtro-dept').value || '');
        const modo  = document.getElementById('pm-modo-valor').value;

        const visíveis = _colaboradores.filter(c => {
            if (busca && !c.nome.toLowerCase().includes(busca)) return false;
            if (dept  && c.departamento !== dept) return false;
            return true;
        });

        const tbody = document.getElementById('pm-tbody');
        if (!visíveis.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">
                Nenhum colaborador encontrado.</td></tr>`;
            _atualizarContador();
            return;
        }

        tbody.innerHTML = visíveis.map(c => _buildRow(c, modo)).join('');

        // Vincular checkboxes de linha
        tbody.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', e => {
                const id = parseInt(e.target.dataset.id);
                if (e.target.checked) _selecionados.add(id);
                else                  _selecionados.delete(id);
                e.target.closest('tr').classList.toggle('pm-selected', e.target.checked);
                _atualizarContador();
            });
        });

        // Vincular inputs de valor individual
        if (modo === 'individual') {
            tbody.querySelectorAll('.pm-valor-input').forEach(inp => {
                inp.addEventListener('change', e => {
                    const id = parseInt(e.target.dataset.id);
                    const col = _colaboradores.find(c => c.id === id);
                    if (col) col.valor = parseFloat(e.target.value) || 0;
                });
            });
        }

        _atualizarContador();
    }

    // ───────────────────────────────────────────────────────────────
    // HTML de uma linha
    // ───────────────────────────────────────────────────────────────
    function _buildRow(c, modo) {
        const checked  = _selecionados.has(c.id) ? 'checked' : '';
        const selected = _selecionados.has(c.id) ? 'pm-selected' : '';

        let valorCell = '';
        if (modo === 'individual') {
            valorCell = `<input class="pm-valor-input" type="number" step="0.01" min="0"
                            data-id="${c.id}" value="${c.valor > 0 ? c.valor.toFixed(2) : ''}"
                            placeholder="0,00">`;
        } else {
            const v = _calcularValor(c);
            valorCell = `<span style="font-weight:600;color:#1e293b;">${_fmt(v)}</span>`;
        }

        return `<tr class="${selected}">
            <td>
              <input type="checkbox" data-id="${c.id}" ${checked}
                     style="accent-color:#f503c5;width:16px;height:16px;cursor:pointer;">
            </td>
            <td>
              <div style="font-weight:600;color:#1e293b;">${_esc(c.nome)}</div>
            </td>
            <td style="color:#475569;">${_esc(c.departamento)}</td>
            <td style="color:#475569;">${_esc(c.cargo)}</td>
            <td style="font-family:monospace;color:#475569;">${_fmt(c.salario)}</td>
            <td>${valorCell}</td>
        </tr>`;
    }

    // ───────────────────────────────────────────────────────────────
    // Calcular valor conforme modo
    // ───────────────────────────────────────────────────────────────
    function _calcularValor(c) {
        const modo  = document.getElementById('pm-modo-valor').value;
        const vGlob = parseFloat(document.getElementById('pm-valor-global').value) || 0;
        if (modo === 'fixo')       return vGlob;
        if (modo === 'percentual') return c.salario * (vGlob / 100);
        return c.valor; // individual
    }

    // ───────────────────────────────────────────────────────────────
    // Eventos de controle
    // ───────────────────────────────────────────────────────────────
    function _onModoValorChange() {
        const modo    = document.getElementById('pm-modo-valor').value;
        const divGlob = document.getElementById('pm-div-valor-global');
        const label   = document.getElementById('pm-col-valor-label');

        divGlob.style.display = (modo === 'individual') ? 'none' : '';
        label.textContent = (modo === 'percentual') ? 'Valor Calculado (R$)' : 'Valor (R$)';
        _renderTabela();
    }

    function _aplicarValorGlobal() {
        _renderTabela();
    }

    function _toggleTodos(e) {
        const visíveis = _colaboradoresVisiveis();
        if (e.target.checked) {
            visíveis.forEach(c => _selecionados.add(c.id));
        } else {
            visíveis.forEach(c => _selecionados.delete(c.id));
        }
        _renderTabela();
        // Manter estado do checkbox master
        document.getElementById('pm-chk-todos').checked = e.target.checked;
    }

    function _colaboradoresVisiveis() {
        const busca = (document.getElementById('pm-busca').value || '').toLowerCase();
        const dept  = (document.getElementById('pm-filtro-dept').value || '');
        return _colaboradores.filter(c => {
            if (busca && !c.nome.toLowerCase().includes(busca)) return false;
            if (dept  && c.departamento !== dept) return false;
            return true;
        });
    }

    function _atualizarContador() {
        const n = _selecionados.size;
        document.getElementById('pm-contador').textContent =
            n === 0 ? 'Nenhum selecionado' : `${n} colaborador${n > 1 ? 'es' : ''} selecionado${n > 1 ? 's' : ''}`;
        document.getElementById('pm-btn-exportar').disabled = (n === 0);
    }

    // ───────────────────────────────────────────────────────────────
    // Exportar planilha (XLSX via ExcelJS)
    // ───────────────────────────────────────────────────────────────
    async function _exportarPlanilha() {
        const tipo        = document.getElementById('pm-tipo').value;
        const tipoLabel   = document.getElementById('pm-tipo').selectedOptions[0].text;
        const competencia = document.getElementById('pm-competencia').value || _mesAtual();
        const modo        = document.getElementById('pm-modo-valor').value;

        if (!tipo) {
            Swal.fire({ icon:'warning', title:'Atenção', text:'Selecione o Tipo de Pagamento antes de exportar.' });
            return;
        }

        const selecionados = _colaboradores.filter(c => _selecionados.has(c.id));
        const linhas = selecionados.map(c => ({
            ...c,
            valor: _calcularValor(c)
        }));

        const total = linhas.reduce((s, l) => s + l.valor, 0);

        // Usar ExcelJS se disponível
        if (typeof ExcelJS !== 'undefined') {
            const wb = new ExcelJS.Workbook();
            wb.creator  = 'América Rental - Sistema RH';
            wb.created  = new Date();

            const ws = wb.addWorksheet('Pagamentos');

            // Cabeçalho de informações
            ws.addRow(['RELATÓRIO DE PAGAMENTOS EM MASSA — AMERICA RENTAL EQUIPAMENTOS LTDA']);
            ws.mergeCells('A1:F1');
            ws.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
            ws.getCell('A1').fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFf503c5' } };
            ws.getCell('A1').alignment = { horizontal:'center' };

            ws.addRow([`Tipo: ${tipoLabel}`, `Competência: ${competencia}`, '', '', '', `Total: ${_fmt(total)}`]);
            ws.getRow(2).font = { italic:true };
            ws.addRow([]); // linha em branco

            // Cabeçalhos da tabela
            const hRow = ws.addRow(['#', 'Nome do Colaborador', 'Departamento', 'Cargo', 'Salário Base (R$)', `${tipoLabel} (R$)`]);
            hRow.font = { bold:true, color:{ argb:'FF475569' } };
            hRow.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFf1f5f9' } };
            ws.columns = [
                { width:6  },
                { width:35 },
                { width:22 },
                { width:22 },
                { width:18 },
                { width:18 },
            ];

            linhas.forEach((c, idx) => {
                const row = ws.addRow([
                    idx + 1,
                    c.nome,
                    c.departamento,
                    c.cargo,
                    c.salario,
                    c.valor
                ]);
                // Formatar valores monetários
                ['E', 'F'].forEach(col => {
                    row.getCell(col).numFmt = '#,##0.00';
                });
            });

            // Linha de total
            ws.addRow([]);
            const totRow = ws.addRow(['', '', '', '', 'TOTAL', total]);
            totRow.font = { bold:true };
            totRow.getCell('F').numFmt = '#,##0.00';

            const buf  = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `pagamentos_${tipo}_${competencia}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Planilha exportada!',
                text: `${linhas.length} colaboradores · Total: ${_fmt(total)}`,
                timer: 3000, showConfirmButton: false
            });
        } else {
            // Fallback CSV
            const rows = [
                ['#', 'Nome', 'Departamento', 'Cargo', 'Salario Base', tipoLabel],
                ...linhas.map((c, i) => [i+1, c.nome, c.departamento, c.cargo, c.salario.toFixed(2), c.valor.toFixed(2)])
            ];
            const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `pagamentos_${tipo}_${competencia}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    // ───────────────────────────────────────────────────────────────
    // Utilitários
    // ───────────────────────────────────────────────────────────────
    function _mesAtual() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function _fmt(v) {
        return (v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    }

    function _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

})();
