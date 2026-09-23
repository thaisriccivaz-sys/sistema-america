// comercial_comissao.js — Módulo Comissão Comercial
// América Rental — gerado automaticamente
(function () {
    'use strict';

    let _mes  = new Date().getMonth() + 1;
    let _ano  = new Date().getFullYear();
    let _dadosComissao = [];
    let _dadosPropostas = [];
    let _totais = {};
    let _abaAtiva = 'comissao'; // 'comissao' | 'propostas'

    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const FMT   = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const PCT   = (v) => v != null ? v + '%' : '—';

    function init() {
        const view = document.getElementById('view-comercial-comissao');
        if (!view) return;
        _renderLayout(view);
        _bindEvents();
        buscar();
    }

    function _renderLayout(view) {
        const hoje = new Date();
        _mes = hoje.getMonth() + 1;
        _ano = hoje.getFullYear();

        view.innerHTML = `
<div class="pm-container" style="padding:18px 22px;">
  <!-- Cabeçalho -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#1e293b;">
      <i class="ph ph-currency-circle-dollar" style="color:#6366f1;margin-right:6px;"></i>Comissão Comercial
    </h2>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <select id="cc-sel-mes" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:.85rem;">
        ${MESES.map((m,i) => '<option value="'+(i+1)+'"'+(i+1===_mes?' selected':'')+'>'+m+'</option>').join('')}
      </select>
      <input id="cc-inp-ano" type="number" value="${_ano}" min="2020" max="2099"
             style="width:80px;padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:.85rem;">
      <button id="cc-btn-buscar" style="padding:6px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;">
        <i class="ph ph-magnifying-glass"></i> Buscar
      </button>
    </div>
  </div>

  <!-- Uploads -->
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
    <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px dashed #a5b4fc;border-radius:10px;cursor:pointer;background:#f0f0ff;color:#4338ca;font-size:.85rem;font-weight:600;">
      <i class="ph ph-file-xls" style="font-size:1.1rem;"></i> Upload Planilha de Comissão (.xlsm/.xlsx)
      <input id="cc-upload-comissao" type="file" accept=".xlsx,.xlsm" style="display:none;">
    </label>
    <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px dashed #6ee7b7;border-radius:10px;cursor:pointer;background:#f0fff8;color:#065f46;font-size:.85rem;font-weight:600;">
      <i class="ph ph-file-xls" style="font-size:1.1rem;"></i> Upload Relatório de Propostas (.xlsx)
      <input id="cc-upload-propostas" type="file" accept=".xlsx" style="display:none;">
    </label>
  </div>

  <!-- Spinner -->
  <div id="cc-spinner" style="display:none;text-align:center;padding:24px;">
    <i class="ph ph-spinner" style="font-size:2rem;color:#6366f1;animation:spin 1s linear infinite;"></i>
    <p style="color:#6b7280;margin-top:8px;font-size:.875rem;">Processando...</p>
  </div>

  <!-- Resumo Cards -->
  <div id="cc-resumo" style="display:none;margin-bottom:18px;">
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <div class="cc-card" style="flex:1;min-width:150px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;">
        <div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Comissão Bruta</div>
        <div id="cc-res-bruto" style="font-size:1.3rem;font-weight:700;color:#1e293b;margin-top:4px;">R$ 0,00</div>
      </div>
      <div class="cc-card" style="flex:1;min-width:150px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;">
        <div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Bônus 1º Lugar</div>
        <div id="cc-res-bonus" style="font-size:1.3rem;font-weight:700;color:#16a34a;margin-top:4px;">R$ 0,00</div>
      </div>
      <div class="cc-card" style="flex:1;min-width:150px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;">
        <div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Total Estornos</div>
        <div id="cc-res-estorno" style="font-size:1.3rem;font-weight:700;color:#dc2626;margin-top:4px;">R$ 0,00</div>
      </div>
      <div class="cc-card" style="flex:1;min-width:150px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 18px;">
        <div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Total Líquido</div>
        <div id="cc-res-liquido" style="font-size:1.3rem;font-weight:700;color:#1d4ed8;margin-top:4px;">R$ 0,00</div>
      </div>
      <div class="cc-card" style="flex:1;min-width:150px;background:#fdf4ff;border:1px solid #e9d5ff;border-radius:12px;padding:14px 18px;">
        <div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Taxa de Conversão Geral</div>
        <div id="cc-res-taxa" style="font-size:1.3rem;font-weight:700;color:#7c3aed;margin-top:4px;">—</div>
      </div>
    </div>
  </div>

  <!-- Abas -->
  <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:14px;">
    <button id="cc-tab-comissao" onclick="window._comercialComissao._setAba('comissao')"
            style="padding:8px 20px;border:none;background:none;font-weight:600;font-size:.875rem;color:#6366f1;border-bottom:2px solid #6366f1;margin-bottom:-2px;cursor:pointer;">
      Comissões
    </button>
    <button id="cc-tab-propostas" onclick="window._comercialComissao._setAba('propostas')"
            style="padding:8px 20px;border:none;background:none;font-weight:600;font-size:.875rem;color:#94a3b8;cursor:pointer;">
      Propostas
    </button>
  </div>

  <!-- Tabela de Comissões -->
  <div id="cc-area-comissao">
    <div id="cc-vazio-comissao" style="text-align:center;padding:40px;color:#9ca3af;font-size:.95rem;">
      <i class="ph ph-currency-circle-dollar" style="font-size:2.5rem;display:block;margin-bottom:8px;"></i>
      Selecione o mês e clique em Buscar, ou faça upload da planilha de comissão.
    </div>
    <div id="cc-wrap-comissao" style="display:none;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
        <thead>
          <tr style="background:#f1f5f9;text-align:center;">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Colaborador</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Brutos</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Estornos</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Líquidos</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Métrica</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">R$/Contrato</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Comissão Bruta</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Bônus</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Líquido Final</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Propostas</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Aprovadas</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Conversão</th>
            <th style="padding:10px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;"></th>
          </tr>
        </thead>
        <tbody id="cc-tbody-comissao"></tbody>
      </table>
    </div>
  </div>

  <!-- Tabela de Propostas -->
  <div id="cc-area-propostas" style="display:none;">
    <div id="cc-vazio-propostas" style="text-align:center;padding:40px;color:#9ca3af;font-size:.95rem;">
      <i class="ph ph-file-xls" style="font-size:2.5rem;display:block;margin-bottom:8px;"></i>
      Faça upload do Relatório de Propostas para visualizar a taxa de conversão.
    </div>
    <div id="cc-wrap-propostas" style="display:none;overflow-x:auto;">
      <div id="cc-rodape-taxa" style="margin-bottom:10px;font-size:.85rem;color:#374151;font-weight:600;"></div>
      <table style="width:100%;border-collapse:collapse;font-size:.8rem;">
        <thead>
          <tr style="background:#f1f5f9;text-align:center;">
            <th style="padding:9px 10px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Proposta</th>
            <th style="padding:9px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Fase</th>
            <th style="padding:9px 8px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Cliente</th>
            <th style="padding:9px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Representante</th>
            <th style="padding:9px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Data Cadastro</th>
            <th style="padding:9px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Contrato</th>
            <th style="padding:9px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Tipo</th>
            <th style="padding:9px 8px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;">Valor</th>
          </tr>
        </thead>
        <tbody id="cc-tbody-propostas"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal Detalhe Colaborador -->
<div id="cc-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:16px;max-width:820px;width:95%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);">
    <div style="padding:18px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
      <h3 id="cc-modal-titulo" style="margin:0;font-size:1.1rem;font-weight:700;color:#1e293b;"></h3>
      <button onclick="window._comercialComissao._fecharModal()"
              style="background:none;border:none;font-size:1.4rem;color:#9ca3af;cursor:pointer;">×</button>
    </div>
    <div id="cc-modal-body" style="padding:20px 24px;overflow-y:auto;flex:1;"></div>
  </div>
</div>

<style>
@keyframes spin { to { transform: rotate(360deg); } }
.cc-card { transition: box-shadow .2s; }
.cc-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
#cc-tab-comissao, #cc-tab-propostas { transition: color .2s, border-color .2s; }
</style>
`;
    }

    function _bindEvents() {
        document.getElementById('cc-btn-buscar').onclick = buscar;
        document.getElementById('cc-upload-comissao').onchange = function() { _uploadComissao(this); };
        document.getElementById('cc-upload-propostas').onchange = function() { _uploadPropostas(this); };
    }

    function _setAba(aba) {
        _abaAtiva = aba;
        const tabC = document.getElementById('cc-tab-comissao');
        const tabP = document.getElementById('cc-tab-propostas');
        const areaC = document.getElementById('cc-area-comissao');
        const areaP = document.getElementById('cc-area-propostas');
        if (aba === 'comissao') {
            tabC.style.color = '#6366f1'; tabC.style.borderBottomColor = '#6366f1'; tabC.style.marginBottom = '-2px';
            tabP.style.color = '#94a3b8'; tabP.style.borderBottom = 'none'; tabP.style.marginBottom = '';
            areaC.style.display = ''; areaP.style.display = 'none';
        } else {
            tabP.style.color = '#6366f1'; tabP.style.borderBottom = '2px solid #6366f1'; tabP.style.marginBottom = '-2px';
            tabC.style.color = '#94a3b8'; tabC.style.borderBottom = 'none'; tabC.style.marginBottom = '';
            areaC.style.display = 'none'; areaP.style.display = '';
        }
    }

    function _getMesAno() {
        const mes = parseInt(document.getElementById('cc-sel-mes').value);
        const ano = parseInt(document.getElementById('cc-inp-ano').value);
        return { mes, ano };
    }

    function _spinner(show) {
        const s = document.getElementById('cc-spinner');
        if (s) s.style.display = show ? 'block' : 'none';
    }

    async function buscar() {
        const { mes, ano } = _getMesAno();
        _mes = mes; _ano = ano;
        _spinner(true);
        try {
            const token = localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes, { headers: { 'Authorization': 'Bearer ' + token } });
            const d = await r.json();
            _spinner(false);
            if (!d.ok) { _mostrarVazioComissao(); _mostrarVazioPropostas(); return; }
            _dadosComissao  = d.colaboradores || [];
            _totais         = d.totais || {};
            _renderizarResumoCom();
            _renderizarTabelaCom();
            // Buscar propostas
            const r2 = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/propostas', { headers: { 'Authorization': 'Bearer ' + token } });
            const d2 = await r2.json();
            _dadosPropostas = d2.propostas || [];
            _renderizarTabelaProp();
        } catch (e) {
            _spinner(false);
            console.error('[Comissao] buscar:', e);
        }
    }

    function _mostrarVazioComissao() {
        document.getElementById('cc-vazio-comissao').style.display = '';
        document.getElementById('cc-wrap-comissao').style.display  = 'none';
        document.getElementById('cc-resumo').style.display = 'none';
    }

    function _mostrarVazioPropostas() {
        document.getElementById('cc-vazio-propostas').style.display = '';
        document.getElementById('cc-wrap-propostas').style.display  = 'none';
    }

    function _renderizarResumoCom() {
        const res = document.getElementById('cc-resumo');
        if (!_dadosComissao.length) { res.style.display = 'none'; return; }
        res.style.display = '';
        document.getElementById('cc-res-bruto').textContent    = FMT(_totais.total_bruto);
        document.getElementById('cc-res-bonus').textContent    = FMT(_totais.total_bonus);
        document.getElementById('cc-res-estorno').textContent  = FMT(_totais.total_estorno);
        document.getElementById('cc-res-liquido').textContent  = FMT(_totais.total_liquido);
        document.getElementById('cc-res-taxa').textContent     = _totais.taxa_conversao_geral || '—';
    }

    function _badgeMetrica(met) {
        const map = {
            maxima: { label: 'Máxima', bg: '#dcfce7', color: '#15803d' },
            media:  { label: 'Média',  bg: '#fef9c3', color: '#854d0e' },
            minima: { label: 'Mínima', bg: '#dbeafe', color: '#1d4ed8' },
        };
        if (!met || !map[met]) return '<span style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:6px;font-size:.75rem;">Sem meta</span>';
        const m = map[met];
        return '<span style="background:' + m.bg + ';color:' + m.color + ';padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:600;">' + m.label + '</span>';
    }

    function _badgeFase(fase) {
        const f = (fase || '').toUpperCase();
        if (f === 'PROPOSTA APROVADA')  return '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:6px;font-size:.73rem;white-space:nowrap;">APROVADA</span>';
        if (f === 'PROPOSTA ENVIADA')   return '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:6px;font-size:.73rem;white-space:nowrap;">ENVIADA</span>';
        if (f === 'PROPOSTA RECUSADA')  return '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:6px;font-size:.73rem;white-space:nowrap;">RECUSADA</span>';
        if (f === 'SEM RESPOSTA')       return '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:6px;font-size:.73rem;white-space:nowrap;">SEM RESPOSTA</span>';
        return '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:6px;font-size:.73rem;">' + (fase || '—') + '</span>';
    }

    function _renderizarTabelaCom() {
        const vazio = document.getElementById('cc-vazio-comissao');
        const wrap  = document.getElementById('cc-wrap-comissao');
        const tbody = document.getElementById('cc-tbody-comissao');
        if (!_dadosComissao.length) { vazio.style.display = ''; wrap.style.display = 'none'; return; }
        vazio.style.display = 'none'; wrap.style.display = '';
        tbody.innerHTML = _dadosComissao.map(function(c) {
            var prim = c.primeiro_lugar ? '<span title="1º Lugar" style="margin-right:4px;">🏆</span>' : '';
            var taxa = c.taxa_conversao || '—';
            var tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid #f1f5f9;transition:background .15s;';
            tr.addEventListener('mouseover', function(){ this.style.background='#f8fafc'; });
            tr.addEventListener('mouseout', function(){ this.style.background=''; });
            var nomeEsc = encodeURIComponent(c.colaborador_nome);
            tr.innerHTML =
                '<td style="padding:10px 12px;font-weight:600;color:#1e293b;">' + prim + c.colaborador_nome + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + c.contratos_brutos + '</td>' +
                '<td style="padding:10px 8px;text-align:center;color:' + (c.contratos_estorno > 0 ? '#dc2626' : '#9ca3af') + ';">' + c.contratos_estorno + '</td>' +
                '<td style="padding:10px 8px;text-align:center;font-weight:700;">' + c.contratos_liquidos + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + _badgeMetrica(c.metrica) + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + (c.valor_unitario > 0 ? FMT(c.valor_unitario) : '—') + '</td>' +
                '<td style="padding:10px 8px;text-align:right;">' + FMT(c.comissao_bruta) + '</td>' +
                '<td style="padding:10px 8px;text-align:right;color:#16a34a;font-weight:600;">' + (c.bonus_primeiro > 0 ? FMT(c.bonus_primeiro) : '—') + '</td>' +
                '<td style="padding:10px 8px;text-align:right;font-weight:700;color:#1d4ed8;">' + FMT(c.liquido) + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + (c.propostas_total != null ? c.propostas_total : '—') + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + (c.propostas_aprovadas != null ? c.propostas_aprovadas : '—') + '</td>' +
                '<td style="padding:10px 8px;text-align:center;font-weight:600;color:#7c3aed;">' + taxa + '</td>' +
                '<td style="padding:10px 8px;text-align:center;"><button onclick="window._comercialComissao._abrirDetalhe(decodeURIComponent(this.dataset.nome))" data-nome="' + nomeEsc + '" style="background:none;border:1px solid #d1d5db;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.8rem;color:#374151;">🔍 Detalhe</button></td>';
            return tr.outerHTML;
        }).join('');
    }

    function _renderizarTabelaProp() {
        const vazio = document.getElementById('cc-vazio-propostas');
        const wrap  = document.getElementById('cc-wrap-propostas');
        const tbody = document.getElementById('cc-tbody-propostas');
        const rodape = document.getElementById('cc-rodape-taxa');
        if (!_dadosPropostas.length) { vazio.style.display = ''; wrap.style.display = 'none'; return; }
        vazio.style.display = 'none'; wrap.style.display = '';

        // Calcular totais de conversão no frontend
        const totalP = _dadosPropostas.length;
        const aprovP = _dadosPropostas.filter(p => (p.fase||'').toUpperCase() === 'PROPOSTA APROVADA').length;
        rodape.innerHTML = 'Taxa de conversão geral: <strong>' + (totalP > 0 ? ((aprovP/totalP)*100).toFixed(1)+'%' : '—') +
            '</strong> &nbsp;|&nbsp; Total: <strong>' + totalP + '</strong> propostas &nbsp;|&nbsp; Aprovadas: <strong>' + aprovP + '</strong>';

        tbody.innerHTML = _dadosPropostas.map(p => {
            const aprClass = (p.fase||'').toUpperCase() === 'PROPOSTA APROVADA' ? ';background:#f0fdf4' : '';
            return '<tr style="border-bottom:1px solid #f1f5f9' + aprClass + '">' +
                '<td style="padding:8px 10px;font-family:monospace;">' + (p.proposta_num || '') + '</td>' +
                '<td style="padding:8px 8px;text-align:center;">' + _badgeFase(p.fase) + '</td>' +
                '<td style="padding:8px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (p.cliente_nome||'') + '">' + (p.cliente_nome || '—') + '</td>' +
                '<td style="padding:8px 8px;text-align:center;font-weight:600;">' + (p.representante || '—') + '</td>' +
                '<td style="padding:8px 8px;text-align:center;">' + (p.data_cadastro || '—') + '</td>' +
                '<td style="padding:8px 8px;text-align:center;font-family:monospace;">' + (p.contrato || '—') + '</td>' +
                '<td style="padding:8px 8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (p.tipo||'') + '">' + (p.tipo || '—') + '</td>' +
                '<td style="padding:8px 8px;text-align:right;">' + (p.valor > 0 ? FMT(p.valor) : '—') + '</td>' +
                '</tr>';
        }).join('');
    }

    async function _uploadComissao(input) {
        if (!input.files || !input.files[0]) return;
        const { mes, ano } = _getMesAno();
        _spinner(true);
        const fd = new FormData();
        fd.append('arquivo', input.files[0]);
        fd.append('mes', mes);
        fd.append('ano', ano);
        input.value = '';
        try {
            const token = localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/upload-comissao', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            const d = await r.json();
            _spinner(false);
            if (d.ok) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Planilha importada!', text: d.colaboradores.length + ' colaborador(es) processado(s).', timer: 2500, showConfirmButton: false });
                buscar();
            } else {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: d.error || 'Erro ao processar planilha.' });
            }
        } catch (e) {
            _spinner(false);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha na comunicação com o servidor.' });
        }
    }

    async function _uploadPropostas(input) {
        if (!input.files || !input.files[0]) return;
        const { mes, ano } = _getMesAno();
        _spinner(true);
        const fd = new FormData();
        fd.append('arquivo', input.files[0]);
        fd.append('mes', mes);
        fd.append('ano', ano);
        input.value = '';
        try {
            const token = localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/upload-propostas', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            const d = await r.json();
            _spinner(false);
            if (d.ok) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Relatório importado!', text: d.total_linhas + ' propostas | Taxa geral: ' + d.taxa_geral, timer: 2500, showConfirmButton: false });
                buscar();
                _setAba('propostas');
            } else {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: d.error || 'Erro ao processar planilha.' });
            }
        } catch (e) {
            _spinner(false);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha na comunicação com o servidor.' });
        }
    }

    async function _abrirDetalhe(nomeEnc) {
        const nome = decodeURIComponent(nomeEnc);
        const { mes, ano } = _getMesAno();
        const modal = document.getElementById('cc-modal');
        const titulo = document.getElementById('cc-modal-titulo');
        const body   = document.getElementById('cc-modal-body');
        titulo.textContent = nome + ' — Detalhes';
        body.innerHTML = '<p style="color:#6b7280;text-align:center;padding:20px;">Carregando...</p>';
        modal.style.display = 'flex';

        try {
            const token = localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/detalhe/' + nomeEnc, { headers: { 'Authorization': 'Bearer ' + token } });
            const d = await r.json();
            if (!d.ok) { body.innerHTML = '<p style="color:#dc2626;text-align:center;">Erro ao carregar dados.</p>'; return; }

            const contratos = d.detalhe_contratos || [];
            const estornos  = d.detalhe_estornos  || [];
            const FMT2 = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">';
            html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;"><div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;">Contratos Líquidos</div><div style="font-size:1.5rem;font-weight:700;color:#1e293b;">' + d.contratos_liquidos + '</div></div>';
            html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;"><div style="font-size:.75rem;color:#6b7280;font-weight:600;text-transform:uppercase;">Valor Líquido</div><div style="font-size:1.5rem;font-weight:700;color:#1d4ed8;">' + FMT2(d.liquido) + '</div></div>';
            html += '</div>';

            // Tabela contratos
            html += '<h4 style="margin:0 0 8px;font-size:.9rem;color:#374151;">Contratos Entregues (' + contratos.length + ')</h4>';
            if (contratos.length) {
                html += '<div style="overflow-x:auto;margin-bottom:20px;"><table style="width:100%;border-collapse:collapse;font-size:.8rem;">';
                html += '<thead><tr style="background:#f1f5f9;"><th style="padding:8px 10px;text-align:left;">Nº</th><th style="padding:8px 10px;">Data</th><th style="padding:8px 10px;">Contrato</th><th style="padding:8px 10px;text-align:right;">Valor</th></tr></thead><tbody>';
                html += contratos.map(c => '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:7px 10px;">' + c.seq + '</td><td style="padding:7px 10px;text-align:center;">' + (c.data||'—') + '</td><td style="padding:7px 10px;text-align:center;font-family:monospace;">' + (c.numero||'—') + '</td><td style="padding:7px 10px;text-align:right;">' + FMT2(c.valor) + '</td></tr>').join('');
                html += '</tbody></table></div>';
            } else { html += '<p style="color:#9ca3af;font-size:.85rem;">Nenhum contrato.</p>'; }

            // Tabela estornos
            html += '<h4 style="margin:0 0 8px;font-size:.9rem;color:#374151;">Estornos (' + estornos.length + ')</h4>';
            if (estornos.length) {
                html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.8rem;">';
                html += '<thead><tr style="background:#fef2f2;"><th style="padding:8px 10px;text-align:left;">Nº</th><th style="padding:8px 10px;">Data</th><th style="padding:8px 10px;">Contrato</th><th style="padding:8px 10px;">Motivo</th><th style="padding:8px 10px;text-align:right;">Valor</th></tr></thead><tbody>';
                html += estornos.map(e => '<tr style="border-bottom:1px solid #fee2e2;"><td style="padding:7px 10px;">' + e.seq + '</td><td style="padding:7px 10px;text-align:center;">' + (e.data||'—') + '</td><td style="padding:7px 10px;text-align:center;font-family:monospace;">' + (e.numero||'—') + '</td><td style="padding:7px 10px;color:#dc2626;">' + (e.motivo_nome||'—') + '</td><td style="padding:7px 10px;text-align:right;color:#dc2626;">' + FMT2(e.valor) + '</td></tr>').join('');
                html += '</tbody></table></div>';
            } else { html += '<p style="color:#9ca3af;font-size:.85rem;">Nenhum estorno.</p>'; }

            body.innerHTML = html;
        } catch (e) {
            body.innerHTML = '<p style="color:#dc2626;text-align:center;">Falha na comunicação com o servidor.</p>';
        }
    }

    function _fecharModal() {
        document.getElementById('cc-modal').style.display = 'none';
    }

    // Fechar modal ao clicar fora
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('cc-modal');
        if (modal && e.target === modal) _fecharModal();
    });

    // Expor API pública
    window._comercialComissao = { init, buscar, _setAba, _abrirDetalhe, _fecharModal };

    // Hook de navegação
    if (window.navigateTo) {
        const _origNav = window.navigateTo;
        window.navigateTo = function(target) {
            _origNav.call(this, target);
            if (target === 'comercial-comissao') {
                setTimeout(function() { if (window._comercialComissao) window._comercialComissao.init(); }, 50);
            }
        };
    }
})();
