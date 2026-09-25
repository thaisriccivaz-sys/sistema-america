// comercial_comissao.js — Módulo Comissão Comercial
// América Rental — gerado automaticamente
(function () {
    'use strict';

    let _mes  = new Date().getMonth() + 1;
    let _ano  = new Date().getFullYear();
    let _dadosComissao = [];
    let _dadosPropostas = [];
    let _totais = {};
    let _dadosGestor = null;
    let _metricasGestor = {};
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
        _controlarBotaoMetricas();
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
      <button id="cc-btn-metricas" style="padding:6px 12px;background:#f8fafc;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;display:none;" onclick="window._comercialComissao._abrirMetricas()">
        <i class="ph ph-sliders"></i> Alterar Métricas
      </button>
    </div>
  </div>

  <!-- Uploads -->
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;align-items:center;">
    <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px dashed #a5b4fc;border-radius:10px;cursor:pointer;background:#f0f0ff;color:#4338ca;font-size:.85rem;font-weight:600;">
      <i class="ph ph-file-xls" style="font-size:1.1rem;"></i> Upload Planilha de Comissão (.xlsm/.xlsx)
      <input id="cc-upload-comissao" type="file" accept=".xlsx,.xlsm" style="display:none;">
    </label>
    <button id="cc-btn-eye-comissao" onclick="window._comercialComissao._downloadPlanilha('comissao')" title="Baixar planilha de comissão deste mês" style="display:none;align-items:center;gap:6px;padding:9px 13px;background:#4338ca;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:.85rem;font-weight:600;">&#128065;</button>
    <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px dashed #6ee7b7;border-radius:10px;cursor:pointer;background:#f0fff8;color:#065f46;font-size:.85rem;font-weight:600;">
      <i class="ph ph-file-xls" style="font-size:1.1rem;"></i> Upload Relatório de Propostas (.xlsx)
      <input id="cc-upload-propostas" type="file" accept=".xlsx" style="display:none;">
    </label>
    <button id="cc-btn-eye-propostas" onclick="window._comercialComissao._downloadPlanilha('propostas')" title="Baixar relatório de propostas deste mês" style="display:none;align-items:center;gap:6px;padding:9px 13px;background:#065f46;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:.85rem;font-weight:600;">&#128065;</button>
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

<!-- Modal Métricas -->
<div id="cc-modal-metricas" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:16px;width:520px;max-width:96%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);">
    <div style="padding:18px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#1e293b;">Métricas de Comissão</h3>
      <button onclick="document.getElementById('cc-modal-metricas').style.display='none'"
              style="background:none;border:none;font-size:1.4rem;color:#9ca3af;cursor:pointer;">×</button>
    </div>
    <div style="padding:20px 24px;overflow-y:auto;flex:1;">
      <div style="font-size:.8rem;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Vendedores</div>
      <div id="cc-metricas-form" style="display:flex;flex-direction:column;gap:12px;"></div>
      <div style="margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;">
        <div style="font-size:.8rem;font-weight:700;color:#3730a3;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">&#128081; Gestor</div>
        <div id="cc-metricas-gestor-form" style="display:flex;flex-direction:column;gap:12px;"></div>
      </div>
      <div style="margin-top:24px;text-align:right;flex-shrink:0;">
        <button id="cc-btn-salvar-metricas" onclick="window._comercialComissao._salvarMetricas()" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;">Salvar e Recalcular</button>
      </div>
    </div>
  </div>
</div>

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
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes, { headers: { 'Authorization': 'Bearer ' + token } });
            const d = await r.json();
            _spinner(false);
            if (!d.ok) { _mostrarVazioComissao(); _mostrarVazioPropostas(); return; }
            _dadosComissao  = d.colaboradores || [];
            _dadosGestor    = d.gestor || null;
            _totais         = d.totais || {};
            _renderizarResumoCom();
            _renderizarTabelaCom();
            // Buscar propostas
            const r2 = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/propostas', { headers: { 'Authorization': 'Bearer ' + token } });
            const d2 = await r2.json();
            _dadosPropostas = d2.propostas || [];
            _renderizarTabelaProp();
            _carregarBotoesPlanilhas();
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
            maxima: { label: 'Máxima', bg: '#dcfce7', color: '#15803d' }, // Verde
            media:  { label: 'Média',  bg: '#dbeafe', color: '#1d4ed8' }, // Azul
            minima: { label: 'Mínima', bg: '#fef9c3', color: '#854d0e' }, // Amarelo
        };
        if (!met || !map[met]) return '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:600;">Sem meta</span>'; // Vermelho
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
            var fotoHtml = c.foto_url 
                ? '<img src="' + c.foto_url + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:8px;border:1px solid #e2e8f0;flex-shrink:0;">' 
                : '<div style="width:28px;height:28px;border-radius:50%;background:#e2e8f0;display:inline-flex;align-items:center;justify-content:center;margin-right:8px;font-size:.8rem;font-weight:700;color:#64748b;flex-shrink:0;">' + (c.colaborador_nome[0] || '').toUpperCase() + '</div>';

            tr.innerHTML =
                '<td style="padding:10px 12px;font-weight:600;color:#1e293b;">' +
                    '<div style="display:flex;align-items:center;">' + prim + fotoHtml + '<span>' + c.colaborador_nome + '</span></div>' +
                '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + c.contratos_brutos + '</td>' +
                '<td style="padding:10px 8px;text-align:center;color:' + (c.contratos_estorno > 0 ? '#dc2626' : '#9ca3af') + ';">' + c.contratos_estorno + '</td>' +
                '<td style="padding:10px 8px;text-align:center;font-weight:700;">' + c.contratos_liquidos + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + _badgeMetrica(c.metrica) + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + (c.valor_unitario > 0 ? FMT(c.valor_unitario) : '<span style="color:#9ca3af;">—</span>') + '</td>' +
                '<td style="padding:10px 8px;text-align:right;">' + FMT(c.comissao_bruta) + '</td>' +
                '<td style="padding:10px 8px;text-align:' + (c.bonus_primeiro > 0 ? 'right' : 'center') + ';color:#16a34a;font-weight:600;">' + (c.bonus_primeiro > 0 ? FMT(c.bonus_primeiro) : '<span style="color:#9ca3af;">—</span>') + '</td>' +
                '<td style="padding:10px 8px;text-align:right;font-weight:700;color:#1d4ed8;">' + FMT(c.liquido) + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + (c.propostas_total != null ? c.propostas_total : '—') + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + (c.propostas_aprovadas != null ? c.propostas_aprovadas : '—') + '</td>' +
                '<td style="padding:10px 8px;text-align:center;font-weight:600;color:#7c3aed;">' + taxa + '</td>' +
                '<td style="padding:10px 8px;text-align:center;"><button id="cc-btn-detalhe-' + c.id + '" onclick="window._comercialComissao._abrirDetalhe(' + c.id + ', decodeURIComponent(this.dataset.nome))" data-nome="' + nomeEsc + '" style="' + (c.email_enviado_em ? 'background:#dcfce7;border:1px solid #22c55e;color:#15803d;' : 'background:none;border:1px solid #d1d5db;color:#374151;') + 'padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.8rem;">🔍 Detalhe</button></td>';
            return tr.outerHTML;
        }).join('');

        // ── Linha do Gestor ──────────────────────────────────────────────
        if (_dadosGestor) {
            var g = _dadosGestor;
            var mapMetaG = {
                alta:   { label: 'Meta Alta',   bg: '#dcfce7', color: '#15803d' },
                media:  { label: 'Meta Media',  bg: '#dbeafe', color: '#1d4ed8' },
                minima: { label: 'Meta Minima', bg: '#fef9c3', color: '#854d0e' }
            };
            var metaGData = g.meta ? (mapMetaG[g.meta] || null) : null;
            var badgeGestor = metaGData
                ? '<span style="background:' + metaGData.bg + ';color:' + metaGData.color + ';padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:600;">' + metaGData.label + '</span>'
                : '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:600;">Sem meta</span>';

            var bonusPartes = [];
            if (g.bonus_equipe > 0) bonusPartes.push('Bonus equipe: ' + FMT(g.bonus_equipe));
            if (g.bonus_meta220 > 0) bonusPartes.push('Meta 220: ' + FMT(g.bonus_meta220));
            var totalBonus = (g.bonus_equipe || 0) + (g.bonus_meta220 || 0);
            var bonusCelula = totalBonus > 0
                ? '<span title="' + bonusPartes.join(' + ') + '" style="color:#16a34a;font-weight:600;">' + FMT(totalBonus) + '</span>'
                : '<span style="color:#9ca3af;display:block;text-align:center;">—</span>';

                        var infoEquipe =
                (g.todos_na_maxima 
                    ? '<span style="color:#16a34a;font-weight:700;">&#10003; Todos na maxima</span>' 
                    : '<span style="color:#dc2626;font-weight:700;">&#10007; Equipe nao unanime</span>') +
                ' &nbsp;|&nbsp; ' +
                (g.meta_220_atingida 
                    ? '<span style="color:#16a34a;font-weight:700;">&#10003; 220+ contratos</span>' 
                    : '<span style="color:#dc2626;font-weight:700;">&#10007; Faltam ' + Math.max(0, 220 - g.contratos_liquidos) + ' p/ bonus 220</span>');

            var nomeG = g.nome || 'Gestor (equipe)';
            var fotoGHtml = g.foto_url 
                ? '<img src="' + g.foto_url + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:8px;border:1px solid #c7d2fe;flex-shrink:0;">' 
                : '<div style="width:28px;height:28px;border-radius:50%;background:#e0e7ff;display:inline-flex;align-items:center;justify-content:center;margin-right:8px;font-size:.8rem;font-weight:700;color:#3730a3;flex-shrink:0;">' + (nomeG[0] || '').toUpperCase() + '</div>';

            var trG = document.createElement('tr');
            trG.style.cssText = 'background:#f0f4ff;border-top:3px solid #6366f1;';
            trG.innerHTML =
                '<td style="padding:10px 12px;font-weight:700;color:#3730a3;" title="Gestor(a) do Comercial">' +
                    '<div style="display:flex;align-items:center;"><span style="margin-right:4px;">\uD83D\uDC51</span>' + fotoGHtml + '<span>' + nomeG + '</span></div>' +
                '</td>' +
                '<td style="padding:10px 8px;text-align:center;font-weight:700;">' + g.contratos_brutos + '</td>' +
                '<td style="padding:10px 8px;text-align:center;color:#dc2626;font-weight:700;">' + g.contratos_estornos_gestor + '</td>' +
                '<td style="padding:10px 8px;text-align:center;font-weight:700;">' + g.contratos_liquidos + '</td>' +
                '<td style="padding:10px 8px;text-align:center;">' + badgeGestor + '</td>' +
                '<td style="padding:10px 8px;text-align:center;color:#9ca3af;">—</td>' +
                '<td style="padding:10px 8px;text-align:right;font-weight:700;">' + FMT(g.valor_meta) + '</td>' +
                '<td style="padding:10px 8px;text-align:right;">' + bonusCelula + '</td>' +
                '<td style="padding:10px 8px;text-align:right;font-weight:700;color:#3730a3;">' + FMT(g.total) + '</td>' +
                '<td colspan="4" style="padding:10px 8px;text-align:center;font-size:.78rem;color:#6b7280;">' + infoEquipe + '</td>';
            tbody.innerHTML += trG.outerHTML;
        }
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
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/upload-comissao', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            const d = await r.json();
            _spinner(false);
            if (d.ok) {
                setTimeout(_carregarBotoesPlanilhas, 1000);
                const dups = d.duplicatas || { intra: [], inter: [] };
                const temDup = dups.intra.length > 0 || dups.inter.length > 0;
                if (temDup) {
                    _abrirModalDuplicatas(dups, d.mes, d.ano, d.colaboradores.length);
                } else {
                    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Planilha importada!', text: d.colaboradores.length + ' colaborador(es) processado(s). Nenhum contrato duplicado encontrado.', timer: 3000, showConfirmButton: false });
                    buscar();
                }
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
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/upload-propostas', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            const d = await r.json();
            _spinner(false);
            if (d.ok) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Relatório importado!', text: d.total_linhas + ' propostas | Taxa geral: ' + d.taxa_geral, timer: 2500, showConfirmButton: false });
                buscar();
                _setAba('propostas');
                setTimeout(_carregarBotoesPlanilhas, 1000);
            } else {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: d.error || 'Erro ao processar planilha.' });
            }
        } catch (e) {
            _spinner(false);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha na comunicação com o servidor.' });
        }
    }

    async function _abrirDetalhe(id, nome) {
        const { mes, ano } = _getMesAno();
        const modal = document.getElementById('cc-modal');
        const titulo = document.getElementById('cc-modal-titulo');
        const body   = document.getElementById('cc-modal-body');
        titulo.textContent = nome + ' — Detalhes';
        body.innerHTML = '<p style="color:#6b7280;text-align:center;padding:20px;">Carregando...</p>';
        modal.style.display = 'flex';

        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/detalhe-id/' + id, { headers: { 'Authorization': 'Bearer ' + token } });
            const d = await r.json();
            if (!d.ok) { body.innerHTML = '<p style="color:#dc2626;text-align:center;">Erro ao carregar dados.</p>'; return; }

            const contratos = d.detalhe_contratos || [];
            const estornos  = d.detalhe_estornos  || [];
            const _fmtDataHora = (iso) => {
                if (!iso) return '';
                const d = new Date(iso);
                const pad = (n) => String(n).padStart(2, '0');
                return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2) + ' às ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
            };
            const FMT2 = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            // Formata data para DD/MM/AA
            const fmtData = (d) => {
                if (!d || d === '—') return '—';
                const s = String(d).trim();
                const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (isoMatch) return isoMatch[3] + '/' + isoMatch[2] + '/' + isoMatch[1].slice(2);
                const parts = s.split('/');
                if (parts.length === 3) return parts[0].padStart(2,'0') + '/' + parts[1].padStart(2,'0') + '/' + (parts[2].length === 4 ? parts[2].slice(2) : parts[2]);
                return s;
            };

            let html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">'+
            '<div style="background:#f8fafc;border-radius:10px;padding:12px;"><div style="font-size:.7rem;color:#6b7280;font-weight:600;text-transform:uppercase;">Contratos Líquidos</div><div style="font-size:1.4rem;font-weight:700;color:#1e293b;">'+ d.contratos_liquidos +'</div></div>'+
            '<div style="background:#f8fafc;border-radius:10px;padding:12px;"><div style="font-size:.7rem;color:#6b7280;font-weight:600;text-transform:uppercase;">Métrica</div><div style="font-size:1.1rem;font-weight:700;color:#374151;">'+ (d.metrica||'—') +'</div></div>'+
            '<div style="background:#f8fafc;border-radius:10px;padding:12px;"><div style="font-size:.7rem;color:#6b7280;font-weight:600;text-transform:uppercase;">R$/Contrato</div><div style="font-size:1.1rem;font-weight:700;color:#047857;">'+ FMT2(d.valor_unitario||0) +'</div></div>'+
            '<div style="background:#eff6ff;border-radius:10px;padding:12px;"><div style="font-size:.7rem;color:#6b7280;font-weight:600;text-transform:uppercase;">Valor Líquido</div><div style="font-size:1.4rem;font-weight:700;color:#1d4ed8;">'+ FMT2(d.liquido) +'</div></div></div>';

            // Tabela contratos
            const contratosValidos = contratos.filter(c => !c.excluido);
            html += '<h4 style="margin:0 0 8px;font-size:.9rem;color:#374151;">Contratos Entregues (' + contratosValidos.length + (contratos.length !== contratosValidos.length ? ' <span style=\'font-size:.75rem;color:#9ca3af;font-weight:400;\'>(+' + (contratos.length - contratosValidos.length) + ' excluído(s))</span>' : '') + ')</h4>';
            if (contratos.length) {
                html += '<div style="overflow-x:auto;margin-bottom:20px;"><table style="width:100%;border-collapse:collapse;font-size:.8rem;">';
                html += '<thead><tr style="background:#f1f5f9;"><th style="padding:8px 10px;text-align:left;">Nº</th><th style="padding:8px 10px;">Data</th><th style="padding:8px 10px;">Contrato</th><th style="padding:8px 10px;text-align:right;">Valor</th></tr></thead><tbody>';
                html += contratos.map(c => {
                    const excluido = c.excluido;
                    const aditivo = c.aditivo;
                    const numDisplay = (aditivo ? '<span style="color:#6d28d9;font-weight:700;">(A)</span> ' : '') + (c.numero||'—');
                    const style = excluido ? 'color:#9ca3af;text-decoration:line-through;background:#f9fafb;' : '';
                    const tag = excluido ? '<span style="font-size:.7rem;background:#fee2e2;color:#991b1b;padding:1px 5px;border-radius:4px;margin-left:4px;">excluído</span>' : (aditivo ? '<span style="font-size:.7rem;background:#ede9fe;color:#5b21b6;padding:1px 5px;border-radius:4px;margin-left:4px;">' + (c.aditivo_texto || 'Adtivo') + '</span>' : '');
                    return '<tr style="border-bottom:1px solid #f1f5f9;' + style + '"><td style="padding:7px 10px;">' + c.seq + '</td><td style="padding:7px 10px;text-align:center;">' + fmtData(c.data) + '</td><td style="padding:7px 10px;text-align:center;font-family:monospace;">' + numDisplay + tag + '</td><td style="padding:7px 10px;text-align:right;">' + (excluido ? '<span style="color:#9ca3af;">—</span>' : FMT2(d.valor_unitario||0)) + '</td></tr>';
                }).join('');
                html += '</tbody></table></div>';
            } else { html += '<p style="color:#9ca3af;font-size:.85rem;">Nenhum contrato.</p>'; }

            // Tabela estornos
            html += '<h4 style="margin:0 0 8px;font-size:.9rem;color:#374151;">Estornos (' + estornos.length + ')</h4>';
            if (estornos.length) {
                html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.8rem;">';
                html += '<thead><tr style="background:#fef2f2;"><th style="padding:8px 10px;text-align:left;">Nº</th><th style="padding:8px 10px;">Data</th><th style="padding:8px 10px;">Contrato</th><th style="padding:8px 10px;">Motivo</th></tr></thead><tbody>';
                html += estornos.map(e => '<tr style="border-bottom:1px solid #fee2e2;"><td style="padding:7px 10px;">' + e.seq + '</td><td style="padding:7px 10px;text-align:center;">' + fmtData(e.data) + '</td><td style="padding:7px 10px;text-align:center;font-family:monospace;">' + (e.numero||'—') + '</td><td style="padding:7px 10px;color:#dc2626;">' + (e.motivo_nome||'—') ).join('');
                html += '</tbody></table></div>';
            } else { html += '<p style="color:#9ca3af;font-size:.85rem;">Nenhum estorno.</p>'; }

            // Botão de enviar e-mail
            const _jaEnviado = d.email_enviado_em;
            const _btnBg = _jaEnviado ? '#16a34a' : '#1d4ed8';
            const _btnTxt = _jaEnviado ? '✅ E-mail enviado' : '📧 Enviar por e-mail para conferência';
            const _dataSent = _jaEnviado ? '<div style="margin-top:8px;font-size:.8rem;color:#6b7280;">Enviado em: ' + _fmtDataHora(d.email_enviado_em) + '<\/div>' : '';
            const _gestor = d.gestor_nome ? d.gestor_nome : '';
            const _emailBtn = '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;text-align:center;">'
                + '<button id="cc-btn-enviar-email" onclick="window._comercialComissao._enviarEmailConferencia(' + id + ')" style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;background:' + _btnBg + ';color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:.9rem;font-weight:600;">' + _btnTxt + '</button>' + _dataSent + '</div>';
            body.innerHTML = html + _emailBtn;
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
    
    let _metricas = [];
    
    async function _abrirMetricas() {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        try {
            const r = await fetch('/api/comercial/comissao/metricas', { headers: { 'Authorization': 'Bearer ' + token } });
            if (!r.ok) return;
            const d = await r.json();
            _metricas = d.metricas || [];
            
            const mapL = { maxima: 'Máxima', media: 'Média', minima: 'Mínima' };
            const bgMap = { maxima: '#f0fdf4', media: '#eff6ff', minima: '#fefce8' };
            const borderMap = { maxima: '#bbf7d0', media: '#bfdbfe', minima: '#fef08a' };
            const colorMap = { maxima: '#166534', media: '#1e40af', minima: '#713f12' };
            
            const mHtml = _metricas.map((m, i) => `
                <div style="background:${bgMap[m.label] || '#fff'};border:1px solid ${borderMap[m.label] || '#e2e8f0'};border-radius:8px;padding:12px;">
                    <div style="font-weight:600;margin-bottom:8px;color:${colorMap[m.label] || '#1e293b'};">Meta ${mapL[m.label] || m.label}</div>
                    <div style="display:flex;gap:8px;">
                        <div style="flex:1;">
                            <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:2px;">Contratos</label>
                            <input type="number" id="met-qtd-${i}" value="${m.qtd}" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:2px;">R$/Contrato</label>
                            <input type="number" id="met-val-${i}" value="${m.valor}" step="0.01" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:2px;">Bônus 1º (R$)</label>
                            <input type="number" id="met-bon-${i}" value="${m.bonus}" step="0.01" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">
                        </div>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('cc-metricas-form').innerHTML = mHtml;

            // Carregar e renderizar métricas do gestor
            const rG = await fetch('/api/comercial/comissao/metricas-gestor', { headers: { 'Authorization': 'Bearer ' + token } });
            if (rG.ok) { const dG = await rG.json(); _metricasGestor = dG.metricas || {}; }
            const mg = _metricasGestor;
            const gHtml =
                '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;">' +
                    '<div style="font-weight:600;color:#1e40af;margin-bottom:8px;">Meta M\u00ednima</div>' +
                    '<div style="display:flex;gap:8px;">' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Contratos</label>' +
                        '<input type="number" id="gest-min-qtd" value="' + (mg.minima ? mg.minima.qtd : 140) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Pr\u00eamio (R\u0024)</label>' +
                        '<input type="number" id="gest-min-val" value="' + (mg.minima ? mg.minima.valor : 300) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                    '</div></div>' +
                '<div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:12px;">' +
                    '<div style="font-weight:600;color:#713f12;margin-bottom:8px;">Meta M\u00e9dia</div>' +
                    '<div style="display:flex;gap:8px;">' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Contratos</label>' +
                        '<input type="number" id="gest-med-qtd" value="' + (mg.media ? mg.media.qtd : 180) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Pr\u00eamio (R\u0024)</label>' +
                        '<input type="number" id="gest-med-val" value="' + (mg.media ? mg.media.valor : 600) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                    '</div></div>' +
                '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">' +
                    '<div style="font-weight:600;color:#166534;margin-bottom:8px;">Meta Alta</div>' +
                    '<div style="display:flex;gap:8px;">' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Contratos</label>' +
                        '<input type="number" id="gest-alt-qtd" value="' + (mg.alta ? mg.alta.qtd : 200) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Pr\u00eamio (R\u0024)</label>' +
                        '<input type="number" id="gest-alt-val" value="' + (mg.alta ? mg.alta.valor : 800) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                    '</div></div>' +
                '<div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px;">' +
                    '<div style="font-weight:600;color:#6b21a8;margin-bottom:8px;">B\u00f4nus Equipe toda na M\u00e1xima</div>' +
                    '<div style="display:flex;gap:8px;">' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Pr\u00eamio (R\u0024)</label>' +
                        '<input type="number" id="gest-beq-val" value="' + (mg.bonus_equipe_max ? mg.bonus_equipe_max.valor : 250) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                    '</div></div>' +
                '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;">' +
                    '<div style="font-weight:600;color:#c2410c;margin-bottom:8px;">B\u00f4nus Meta Equipe</div>' +
                    '<div style="display:flex;gap:8px;">' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">M\u00edn. Contratos</label>' +
                        '<input type="number" id="gest-b220-qtd" value="' + (mg.bonus_meta_equipe ? mg.bonus_meta_equipe.qtd : 220) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                        '<div style="flex:1;"><label style="font-size:.75rem;color:#64748b;display:block;margin-bottom:2px;">Pr\u00eamio (R\u0024)</label>' +
                        '<input type="number" id="gest-b220-val" value="' + (mg.bonus_meta_equipe ? mg.bonus_meta_equipe.valor : 350) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;"></div>' +
                    '</div></div>';
            document.getElementById('cc-metricas-gestor-form').innerHTML = gHtml;
            document.getElementById('cc-modal-metricas').style.display = 'flex';
        } catch (e) { console.error(e); }
    }
    
    async function _salvarMetricas() {
        const btn = document.getElementById('cc-btn-salvar-metricas');
        btn.innerHTML = 'Salvando...';
        btn.disabled = true;
        
        const novas = _metricas.map((m, i) => ({
            label: m.label,
            qtd: parseInt(document.getElementById('met-qtd-' + i).value) || 0,
            valor: parseFloat(document.getElementById('met-val-' + i).value) || 0,
            bonus: parseFloat(document.getElementById('met-bon-' + i).value) || 0
        }));

        const novasGestor = {
            minima: { label: 'minima', qtd: parseInt(document.getElementById('gest-min-qtd').value) || 140, valor: parseFloat(document.getElementById('gest-min-val').value) || 300 },
            media:  { label: 'media',  qtd: parseInt(document.getElementById('gest-med-qtd').value) || 180, valor: parseFloat(document.getElementById('gest-med-val').value) || 600 },
            alta:   { label: 'alta',   qtd: parseInt(document.getElementById('gest-alt-qtd').value) || 200, valor: parseFloat(document.getElementById('gest-alt-val').value) || 800 },
            bonus_equipe_max:   { valor: parseFloat(document.getElementById('gest-beq-val').value) || 250 },
            bonus_meta_equipe:  { qtd: parseInt(document.getElementById('gest-b220-qtd').value) || 220, valor: parseFloat(document.getElementById('gest-b220-val').value) || 350 }
        };

        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        try {
            await fetch('/api/comercial/comissao/metricas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ metricas: novas })
            });
            await fetch('/api/comercial/comissao/metricas-gestor', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ metricas: novasGestor })
            });
            document.getElementById('cc-modal-metricas').style.display = 'none';
            if (typeof _dadosComissao !== 'undefined' && _dadosComissao && _dadosComissao.length > 0) {
                Swal.fire('Métricas salvas', 'Reenvie as planilhas para recalcular a comissão com os novos valores.', 'success');
            } else {
                Swal.fire({ icon: 'success', title: 'Salvo', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            }
        } catch (e) {
            Swal.fire('Erro', 'Não foi possível salvar.', 'error');
        }
        btn.innerHTML = 'Salvar e Recalcular';
        btn.disabled = false;
    }

    // Carregar botões de planilhas (👁) conforme mês/ano
    async function _carregarBotoesPlanilhas() {
        const { mes, ano } = _getMesAno();
        const btnC = document.getElementById('cc-btn-eye-comissao');
        const btnP = document.getElementById('cc-btn-eye-propostas');
        if (!btnC || !btnP) return;
        btnC.style.display = 'none';
        btnP.style.display = 'none';
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/planilhas', { headers: { 'Authorization': 'Bearer ' + token } });
            const d = await r.json();
            if (d.ok && d.planilhas) {
                window._ccPlanilhasInfo = d.planilhas;
                if (d.planilhas.comissao && d.planilhas.comissao.r2_key) btnC.style.display = 'inline-flex';
                if (d.planilhas.propostas && d.planilhas.propostas.r2_key) btnP.style.display = 'inline-flex';
            }
        } catch (e) { /* silencioso */ }
    }

    // Download de planilha do R2
    function _downloadPlanilha(tipo) {
        const { mes, ano } = _getMesAno();
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const url = '/api/comercial/comissao/' + ano + '/' + mes + '/download-planilha/' + tipo;
        // Abre download com token via link temporário
        const a = document.createElement('a');
        a.href = url;
        let ext = 'xlsx';
        if (window._ccPlanilhasInfo && window._ccPlanilhasInfo[tipo] && window._ccPlanilhasInfo[tipo].nome_arquivo) {
            const parts = window._ccPlanilhasInfo[tipo].nome_arquivo.split('.');
            if (parts.length > 1) ext = parts.pop();
        }
        const hj = new Date();
        const dma = String(hj.getDate()).padStart(2, '0') + '_' + String(hj.getMonth()+1).padStart(2, '0') + '_' + hj.getFullYear();
        const fname = tipo === 'comissao' ? 'Planilha_Comissão_' + dma + '.' + ext : 'Relatório_Propostas_' + dma + '.' + ext;
        a.setAttribute('download', fname);
        // Para endpoints autenticados, precisamos de fetch + blob
        fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(function(r) { return r.blob(); })
            .then(function(blob) {
                const burl = URL.createObjectURL(blob);
                a.href = burl;
                a.click();
                setTimeout(function() { URL.revokeObjectURL(burl); }, 5000);
            })
            .catch(function() {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível baixar a planilha.' });
            });
    }

    // Enviar e-mail de conferência para o colaborador
    async function _enviarEmailConferencia(colaboradorId) {
        const { mes, ano } = _getMesAno();
        const btn = document.getElementById('cc-btn-enviar-email');
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Enviando...'; }
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/enviar-conferencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ colaborador_id: colaboradorId })
            });
            const d = await r.json();
            if (d.ok) {
                // Atualizar botão para verde + mostrar hora do envio
                if (btn) { btn.style.background = '#16a34a'; btn.innerHTML = '✅ E-mail enviado'; btn.disabled = false; }
                const _divBtn = btn && btn.parentElement;
                if (_divBtn && d.email_enviado_em) {
                    let _infoEl = _divBtn.querySelector('.cc-email-info');
                    if (!_infoEl) { _infoEl = document.createElement('div'); _infoEl.className = 'cc-email-info'; _infoEl.style.cssText = 'margin-top:8px;font-size:.8rem;color:#6b7280;text-align:center;'; _divBtn.appendChild(_infoEl); }
                    const _dS = new Date(d.email_enviado_em); const _pad = (n) => String(n).padStart(2,'0');
                    _infoEl.textContent = 'Enviado em: ' + _pad(_dS.getDate())+'/'+_pad(_dS.getMonth()+1)+'/'+String(_dS.getFullYear()).slice(2)+' às '+_pad(_dS.getHours())+':'+_pad(_dS.getMinutes());
                }
                
                // Atualizar botão Detalhe na tabela principal
                const btnDetalhe = document.getElementById('cc-btn-detalhe-' + colaboradorId);
                if (btnDetalhe) {
                    btnDetalhe.style.background = '#dcfce7';
                    btnDetalhe.style.borderColor = '#22c55e';
                    btnDetalhe.style.color = '#15803d';
                }
                
                // Atualizar _dadosComissao em memoria para persistir no re-render
                if (typeof _dadosComissao !== 'undefined') {
                    const idx = _dadosComissao.findIndex(x => x.id === colaboradorId);
                    if (idx !== -1) _dadosComissao[idx].email_enviado_em = d.email_enviado_em;
                }
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'E-mail enviado!', text: 'Enviado para: ' + d.enviado_para, timer: 3000, showConfirmButton: false });
            } else {
                if (btn) { btn.disabled = false; btn.innerHTML = '📧 Enviar por e-mail para conferência'; }
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro ao enviar', text: d.error || 'Tente novamente.' });
            }
        } catch (e) {
            if (btn) { btn.disabled = false; btn.innerHTML = '📧 Enviar por e-mail para conferência'; }
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha na comunicação com o servidor.' });
        }
    }

    // ─── Modal de Duplicatas ─────────────────────────────────────────────
    function _abrirModalDuplicatas(dups, mes, ano, totalColabs) {
        let modal = document.getElementById('cc-modal-duplicatas');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cc-modal-duplicatas';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 0;';
            document.body.appendChild(modal);
        }

        let rowsHtml = '';
        let rowIdx = 0;

        // Seção 1 — Intra-colaborador (amarelo): cada ocorrência separada
        if (dups.intra.length > 0) {
            rowsHtml += '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:10px;padding:16px;margin-bottom:16px;">';
            rowsHtml += '<h3 style="margin:0 0 12px;font-size:.95rem;color:#92400e;font-weight:700;">⚠️ Contratos duplicados no mesmo colaborador</h3>';
            rowsHtml += '<p style="margin:0 0 10px;font-size:.82rem;color:#78350f;">O mesmo número de contrato aparece mais de uma vez na aba do colaborador. Decida separadamente para cada ocorrência.</p>';
            rowsHtml += '<table style="width:100%;border-collapse:collapse;font-size:.82rem;">';
            rowsHtml += '<thead><tr style="background:#fef3c7;"><th style="padding:7px 8px;text-align:left;">Colaborador</th><th style="padding:7px 8px;text-align:left;">Nº Contrato</th><th style="padding:7px 8px;text-align:center;">Ocorrência</th><th style="padding:7px 8px;text-align:center;">Data</th><th style="padding:7px 8px;text-align:center;">Ação *</th><th style="padding:7px 8px;text-align:left;">Justificativa</th></tr></thead><tbody>';
            dups.intra.forEach(function(d) {
                const ri = rowIdx++;
                rowsHtml += '<tr style="border-bottom:1px solid #fde68a;">';
                rowsHtml += '<td style="padding:7px 8px;font-weight:600;">' + d.colaborador_nome + '</td>';
                rowsHtml += '<td style="padding:7px 8px;font-family:monospace;font-weight:700;">' + d.numero + '</td>';
                rowsHtml += '<td style="padding:7px 8px;text-align:center;color:#92400e;font-weight:700;">' + d.occurrence_num + '/' + d.total_occurrences + '</td>';
                rowsHtml += '<td style="padding:7px 8px;text-align:center;">' + (d.data || '—') + '</td>';
                rowsHtml += '<td style="padding:7px 8px;text-align:center;">';
                rowsHtml += '<select id="cc-dup-acao-' + ri + '" class="cc-dup-sel" data-tipo="intra" data-colab="' + d.colaborador_nome.replace(/"/g,'&quot;') + '" data-numero="' + d.numero + '" data-seq="' + d.seq + '" data-ri="' + ri + '" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.8rem;">';
                rowsHtml += '<option value="excluir">🗑️ Excluir</option><option value="aditivo">📝 Justificar</option></select>';
                rowsHtml += '</td>';
                rowsHtml += '<td style="padding:7px 8px;"><input id="cc-dup-txt-' + ri + '" type="text" value="Adtivo" style="display:none;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.8rem;width:120px;"></td>';
                rowsHtml += '</tr>';
            });
            rowsHtml += '</tbody></table></div>';
        }

        // Seção 2 — Inter-colaboradores (laranja): Excluir ou Aditivo (sem Manter)
        if (dups.inter.length > 0) {
            rowsHtml += '<div style="background:#fff7ed;border:1px solid #fb923c;border-radius:10px;padding:16px;margin-bottom:16px;">';
            rowsHtml += '<h3 style="margin:0 0 12px;font-size:.95rem;color:#9a3412;font-weight:700;">🔴 Contratos duplicados entre colaboradores</h3>';
            rowsHtml += '<p style="margin:0 0 10px;font-size:.82rem;color:#7c2d12;">O mesmo número de contrato aparece em abas de colaboradores diferentes. Decida para cada colaborador separadamente.</p>';
            dups.inter.forEach(function(d) {
                rowsHtml += '<div style="background:#ffedd5;border-radius:8px;padding:10px 12px;margin-bottom:10px;">';
                rowsHtml += '<div style="font-size:.85rem;font-weight:700;color:#9a3412;margin-bottom:8px;">📄 Contrato nº <span style="font-family:monospace;">' + d.numero + '</span> — aparece em ' + d.colaboradores.length + ' colaboradores</div>';
                rowsHtml += '<table style="width:100%;border-collapse:collapse;font-size:.82rem;">';
                rowsHtml += '<thead><tr style="background:#fed7aa;"><th style="padding:6px 8px;text-align:left;">Colaborador</th><th style="padding:6px 8px;text-align:center;">Ação *</th><th style="padding:6px 8px;text-align:left;">Justificativa</th></tr></thead><tbody>';
                d.colaboradores.forEach(function(colab) {
                    const ri = rowIdx++;
                    rowsHtml += '<tr style="border-bottom:1px solid #fdba74;">';
                    rowsHtml += '<td style="padding:6px 8px;font-weight:600;">' + colab + '</td>';
                    rowsHtml += '<td style="padding:6px 8px;text-align:center;">';
                    rowsHtml += '<select id="cc-dup-acao-' + ri + '" class="cc-dup-sel" data-tipo="inter" data-colab="' + colab.replace(/"/g,'&quot;') + '" data-numero="' + d.numero + '" data-ri="' + ri + '" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.8rem;">';
                    rowsHtml += '<option value="excluir">🗑️ Excluir</option><option value="aditivo">📝 Justificar</option></select>';
                    rowsHtml += '</td>';
                    rowsHtml += '<td style="padding:6px 8px;"><input id="cc-dup-txt-' + ri + '" type="text" value="Adtivo" style="display:none;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.8rem;width:120px;"></td>';
                    rowsHtml += '</tr>';
                });
                rowsHtml += '</tbody></table></div>';
            });
            rowsHtml += '</div>';
        }

        const totalRows = rowIdx;
        modal.innerHTML = '<div style="background:#fff;border-radius:14px;padding:28px;max-width:800px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
            '<h2 style="margin:0;font-size:1.1rem;color:#1e293b;">⚠️ Contratos Duplicados Detectados</h2>' +
            '<span style="font-size:.82rem;color:#6b7280;">' + totalColabs + ' colaborador(es) processado(s)</span>' +
            '</div>' +
            '<p style="margin:0 0 16px;font-size:.82rem;color:#dc2626;font-weight:600;">* É obrigatório escolher Excluir ou Justificar para cada contrato duplicado.</p>' +
            rowsHtml +
            '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;display:flex;gap:10px;justify-content:flex-end;">' +
            '<button id="cc-dup-btn-confirmar" style="padding:9px 22px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;">✅ Confirmar decisões</button>' +
            '</div>' +
            '</div>';
        modal.style.display = 'flex';
        // Event delegation — mostrar/ocultar input de justificativa
        modal.querySelectorAll('select.cc-dup-sel').forEach(function(sel) {
            sel.addEventListener('change', function() {
                const ri = this.dataset.ri;
                const txtEl = document.getElementById('cc-dup-txt-' + ri);
                if (txtEl) txtEl.style.display = this.value === 'aditivo' ? 'block' : 'none';
            });
        });
        // Botão confirmar
        var btnConfirmar = document.getElementById('cc-dup-btn-confirmar');
        var _capMes = mes; var _capAno = ano; var _capRows = totalRows;
        if (btnConfirmar) btnConfirmar.onclick = function() { _confirmarDuplicatas(_capMes, _capAno, _capRows); };
    }

    async function _confirmarDuplicatas(mes, ano, totalRows) {
        const resolucoes = [];
        for (let i = 0; i < totalRows; i++) {
            const sel = document.getElementById('cc-dup-acao-' + i);
            if (!sel) continue;
            const acao = sel.value; // 'excluir' ou 'aditivo' — sem 'manter'
            const colaborador_nome = sel.dataset.colab;
            const numero = sel.dataset.numero;
            const tipo = sel.dataset.tipo || 'inter';
            const seq = sel.dataset.seq || null; // presente para intra
            const txtEl = document.getElementById('cc-dup-txt-' + i);
            const texto = (txtEl ? txtEl.value : '') || 'Adtivo';
            resolucoes.push({ colaborador_nome, numero, seq, acao, texto, tipo });
        }
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const modal = document.getElementById('cc-modal-duplicatas');
        try {
            const r = await fetch('/api/comercial/comissao/' + ano + '/' + mes + '/resolver-duplicatas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ resolucoes })
            });
            const d = await r.json();
            if (modal) modal.style.display = 'none';
            if (d.ok) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Duplicatas resolvidas!', text: 'Os dados foram atualizados com suas decisões.', timer: 2500, showConfirmButton: false });
                buscar();
            } else {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: d.error || 'Erro ao resolver duplicatas.' });
            }
        } catch(e) {
            if (modal) modal.style.display = 'none';
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha na comunicação com o servidor.' });
        }
    }

        function _controlarBotaoMetricas() {
        const btn = document.getElementById('cc-btn-metricas');
        if (!btn) return;
        const u = window.currentUser || JSON.parse(localStorage.getItem('erp_user') || '{}');
        const username = (u.username || '').toLowerCase();
        const depto = (u.departamento || '').toLowerCase();
        const perms = window.activeUserPerms || {};
        const temPermComissao = !!perms['comercial-comissao'];
        const ehThais = username === 'thais.ricci';
        const ehProcessos = depto.includes('processo') || depto === 'processos';
        if (ehThais || (temPermComissao && ehProcessos)) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    }

    window._comercialComissao = { init, buscar, _setAba, _abrirDetalhe, _fecharModal, _abrirMetricas, _salvarMetricas, _downloadPlanilha, _enviarEmailConferencia, _abrirModalDuplicatas, _confirmarDuplicatas };

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
