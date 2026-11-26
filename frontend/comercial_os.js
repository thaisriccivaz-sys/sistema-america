/**
 * ============================================================================
 * MÓDULO: COMERCIAL → OS
 * Tela de Ordem de Serviço dentro do Comercial com todos os campos de
 * preenchimento da tela de OS da Logística (isolada para ajustes iniciais,
 * sem associação externa por enquanto).
 * ============================================================================
 */
(function () {
    'use strict';

    const COS_EQUIPAMENTOS_DICT = {
        'STD OBRA':                  { icone: '💙', codigo: 'STD O' },
        'STD EVENTO':                { icone: '💜', codigo: 'STD E' },
        'LX OBRA':                   { icone: '🟦', codigo: 'LX O' },
        'LX EVENTO':                 { icone: '🟣', codigo: 'LX E' },
        'EXL OBRA':                  { icone: '🔵', codigo: 'EXL O' },
        'EXL EVENTO':                { icone: '🟣', codigo: 'EXL E' },
        'ELX OBRA':                  { icone: '🔵', codigo: 'EXL O' },
        'ELX EVENTO':                { icone: '🟣', codigo: 'EXL E' },
        'PCD OBRA':                  { icone: '♿', codigo: 'PCD O' },
        'PCD EVENTO':                { icone: '♿', codigo: 'PCD E' },
        'CHUVEIRO OBRA':             { icone: '🚿', codigo: 'CHUVEIRO O' },
        'CHUVEIRO EVENTO':           { icone: '🚿', codigo: 'CHUVEIRO E' },
        'HIDRÁULICO OBRA':           { icone: '🚽', codigo: 'HIDRÁULICO O' },
        'HIDRÁULICO EVENTO':         { icone: '🚽', codigo: 'HIDRÁULICO E' },
        'MICTÓRIO OBRA':             { icone: '💦', codigo: 'MICTÓRIO O' },
        'MICTÓRIO EVENTO':           { icone: '💦', codigo: 'MICTÓRIO E' },
        'PBII OBRA':                 { icone: '🧼', codigo: 'PIA II O' },
        'PBII EVENTO':               { icone: '🧼', codigo: 'PIA II E' },
        'PBIII OBRA':                { icone: '🧼', codigo: 'PIA III O' },
        'PBIII EVENTO':              { icone: '🧼', codigo: 'PIA III E' },
        'GUARITA INDIVIDUAL OBRA':   { icone: '⬜', codigo: 'GUARITA INDIVIDUAL O' },
        'GUARITA INDIVIDUAL EVENTO': { icone: '⬜', codigo: 'GUARITA INDIVIDUAL E' },
        'GUARITA DUPLA OBRA':        { icone: '⚪', codigo: 'GUARITA DUPLA O' },
        'GUARITA DUPLA EVENTO':      { icone: '⚪', codigo: 'GUARITA DUPLA E' },
        'LIMPA FOSSA OBRA':          { icone: '💧', codigo: 'LIMPA FOSSA OBRA' },
        'LIMPA FOSSA EVENTO':        { icone: '💧', codigo: 'LIMPA FOSSA EVENTO' },
        'CARRINHO':                  { icone: '🛤', codigo: 'CARRINHO' },
        'CAIXA DAGUA':               { icone: '🧊', codigo: 'CAIXA DAGUA' }
    };

    const COS_TIPOS_SERVICO = [
        'ENTREGA OBRA', 'RETIRADA OBRA TOTAL', 'RETIRADA OBRA PARCIAL', 'MANUTENCAO OBRA', 'MANUTENCAO AVULSA OBRA',
        'REPARO EQUIPAMENTO OBRA', 'VISITA TECNICA OBRA', 'LIMPA FOSSA OBRA',
        'ENTREGA EVENTO', 'RETIRADA EVENTO TOTAL', 'RETIRADA EVENTO PARCIAL', 'MANUTENCAO EVENTO', 'MANUTENCAO AVULSA EVENTO', 'SUCCAO EVENTO',
        'REPARO EQUIPAMENTO EVENTO', 'VISITA TECNICA EVENTO', 'LIMPA FOSSA EVENTO',
        'COMPRAS AMERICA'
    ];

    const COS_HABILIDADES_ATEND = ['TANQUE', 'CARGA', 'VAC', 'UTILITARIO', 'CARRETINHA', 'CARROCERIA', 'TANQUE GRANDE'];

    const COS_HABILIDADES_EQUIPE = [
        'Caminhão Carroceria', 'Caminhão Tanque', 'Carretinha Caminhonete', 'Carretinha Utilitário',
        'VAC', 'Reparos', 'Montagem', 'Desmontagem', 'Visita técnica'
    ];

    const COS_ACOES_DICT = {
        'LEVAR CARRINHO': '🛒',
        'ATENÇÃO AO HORÁRIO': '⏰',
        'TROCA DE EQUIPAMENTO': '♻️',
        'LEVAR EXTENSORA': '🌀',
        'APOIO DE SUCÇÃO': '💧',
        'INFORMAÇÕES IMPORTANTES': '🚨',
        'LEVAR EPI': '🦺',
        'INTEGRAÇÃO': '👷',
        'BANHEIRO ITINERANTE': '🔛'
    };

    const cosState = {
        tipoOs: '', // 'Obra' | 'Evento'
        produtos: [],
        habAtend: new Set(),
        habEquipe: new Set(),
        acoes: new Set(),
        lat: null,
        lng: null,
        leafletMap: null,
        leafletMarker: null
    };

    function normStr(s) {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getProdutosFiltradosPorTipoOs() {
        return Object.entries(COS_EQUIPAMENTOS_DICT)
            .filter(([nome]) =>
                cosState.tipoOs === 'Obra' ? nome.includes('OBRA') || nome === 'CARRINHO' || nome === 'CAIXA DAGUA' :
                cosState.tipoOs === 'Evento' ? nome.includes('EVENTO') || nome === 'CARRINHO' || nome === 'CAIXA DAGUA' :
                true
            )
            .map(([nome, v]) => ({ nome, ...v }));
    }

    function calcularCargaProporcional(qtd) {
        let carga = Math.ceil(qtd * 0.3333);
        if (carga % 2 !== 0) carga++;
        return carga;
    }

    function recalcularTotaisProdutos() {
        const tipoServico = (document.getElementById('cos-tipo-servico')?.value || document.getElementById('cos-tipo-servico-search')?.value || '').trim().toUpperCase();
        const isManutencao = tipoServico.includes('MANUTENCAO');
        const totalItens = cosState.produtos.reduce((acc, p) => acc + (parseInt(p.qtd, 10) || 0), 0);

        let baseMin = 10;
        if (tipoServico.includes('MANUTENCAO') || tipoServico.includes('COMPRAS')) baseMin = 0;
        const totalMin = baseMin + (5 * totalItens);
        const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const mm = String(totalMin % 60).padStart(2, '0');

        const elTotalProd = document.getElementById('cos-total-prod');
        if (elTotalProd) elTotalProd.textContent = String(totalItens);

        const elTempo = document.getElementById('cos-tempo-total');
        if (elTempo) elTempo.value = `${hh}:${mm}`;

        let totalCargaVeiculo = 0;
        let totalCargaTanque = 0;

        cosState.produtos.forEach(p => {
            const eq = (p.desc || '').trim().toUpperCase().replace(/\b(ELX|SLX)\b/g, 'EXL');
            const qtd = parseInt(p.qtd, 10) || 0;
            if (!eq || !qtd) return;

            if (eq.includes('LIMPA FOSSA')) {
                totalCargaTanque += 33 * qtd;
                return;
            }
            if (!isManutencao) {
                if (eq.includes('GUARITA DUPLA') || eq.includes('PCD')) totalCargaVeiculo += 2 * qtd;
                else if (eq.includes('MICTÓRIO')) totalCargaVeiculo += calcularCargaProporcional(qtd);
                else totalCargaVeiculo += qtd;
            }
            if (isManutencao || tipoServico.includes('RETIRADA') || tipoServico.includes('TROCA')) {
                if (eq.includes('EVENTO')) {
                    if (eq.includes('MICTÓRIO')) totalCargaTanque += 10 * qtd;
                    else if (eq.includes('PBII') || eq.includes('PBIII') || eq.includes('PIA')) totalCargaTanque += 1 * qtd;
                    else totalCargaTanque += 5 * qtd;
                } else {
                    if (eq.includes('MICTÓRIO')) totalCargaTanque += 4 * qtd;
                    else totalCargaTanque += 1 * qtd;
                }
            }
        });

        const tanque = (isManutencao || tipoServico.includes('RETIRADA') || tipoServico.includes('TROCA')) ? totalCargaTanque : 0;
        const carroceria = (!isManutencao && totalCargaVeiculo <= 12) ? totalCargaVeiculo : 0;
        const carretinha = (!isManutencao && totalCargaVeiculo > 12) ? totalCargaVeiculo : 0;

        const elTanq = document.getElementById('cos-total-tanques');
        const elCarr = document.getElementById('cos-total-carrocerias');
        const elCarret = document.getElementById('cos-total-carretinhas');
        if (elTanq) elTanq.textContent = String(tanque);
        if (elCarr) elCarr.textContent = String(carroceria);
        if (elCarret) elCarret.textContent = String(carretinha);
    }

    function renderTabelaProdutos() {
        const tbody = document.getElementById('cos-tbody-produtos');
        if (!tbody) return;

        if (cosState.produtos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="padding:10px; text-align:center; font-size:0.75rem; color:#94a3b8;">Nenhum produto adicionado.</td></tr>`;
        } else {
            tbody.innerHTML = cosState.produtos.map(p => {
                const info = COS_EQUIPAMENTOS_DICT[p.desc] || {};
                const ic = info.icone || '📦';
                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:4px 8px; font-size:0.75rem; font-weight:600; color:#1e293b;">${ic} ${escHtml(p.desc)}</td>
                        <td style="padding:4px 8px; text-align:center; font-size:0.75rem; font-weight:700; color:#0f172a;">
                            <input type="number" min="1" value="${p.qtd}" onchange="window._comercialOS.alterarQtdProduto(${p.id}, this.value)"
                                style="width:52px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:1px 4px; font-size:0.75rem;">
                        </td>
                        <td style="padding:4px 8px; text-align:center;">
                            <button type="button" onclick="window._comercialOS.removerProduto(${p.id})"
                                style="background:#fee2e2; color:#dc2626; border:none; border-radius:4px; width:22px; height:22px; cursor:pointer;" title="Remover">
                                <i class="ph ph-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        recalcularTotaisProdutos();
    }

    function abrirPopupTipoOsComercial(onSelect) {
        document.getElementById('cos-popup-tipo-os')?.remove();
        const popup = document.createElement('div');
        popup.id = 'cos-popup-tipo-os';
        popup.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;';
        popup.innerHTML = `
            <div style="background:#E0F8F5;border-radius:16px;padding:1.5rem 2rem;box-shadow:0 8px 32px rgba(0,0,0,0.2);text-align:center;min-width:280px;">
                <p style="font-weight:700;font-size:1.05rem;color:#00251A;margin:0 0 1.2rem;">Selecione o tipo de OS</p>
                <div style="display:flex;gap:1.5rem;justify-content:center;">
                    <button type="button" id="cos-btn-obra" style="width:120px;height:130px;background:#156EB6;border:none;border-radius:12px;color:white;font-weight:700;font-size:1rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
                        <img src="assets/obra.png" style="height:65px;object-fit:contain;" alt="Obra">OBRA
                    </button>
                    <button type="button" id="cos-btn-evento" style="width:120px;height:130px;background:#8E24AA;border:none;border-radius:12px;color:white;font-weight:700;font-size:1rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
                        <img src="assets/evento.png" style="height:65px;object-fit:contain;" alt="Evento">EVENTO
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        popup.querySelector('#cos-btn-obra').onclick = () => { popup.remove(); onSelect('Obra'); };
        popup.querySelector('#cos-btn-evento').onclick = () => { popup.remove(); onSelect('Evento'); };
        popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
    }

    function atualizarBadgeETipoOsUI() {
        const badge = document.getElementById('cos-badge-tipo-os');
        if (badge) {
            badge.textContent = cosState.tipoOs || '';
            badge.style.background = cosState.tipoOs === 'Obra' ? '#156EB6' : cosState.tipoOs === 'Evento' ? '#8E24AA' : '#94a3b8';
            badge.style.display = cosState.tipoOs ? 'inline-flex' : 'none';
        }
        const imgTipo = document.getElementById('cos-img-tipo-os');
        if (imgTipo) {
            if (cosState.tipoOs === 'Obra') {
                imgTipo.src = 'assets/obra.png';
                imgTipo.style.display = 'block';
            } else if (cosState.tipoOs === 'Evento') {
                imgTipo.src = 'assets/evento.png';
                imgTipo.style.display = 'block';
            } else {
                imgTipo.style.display = 'none';
            }
        }
    }

    function renderTelaComercialOS() {
        const container = document.getElementById('view-comercial-os');
        if (!container) return;

        const inputStyle = 'background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; height: 26px; width: 100%; box-sizing: border-box; text-transform: none;';
        const labelStyle = 'font-weight: 600; font-size: 0.7rem; color: #475569; display: block; margin-bottom: 2px; white-space: nowrap;';
        const btnStyle = 'border:none; color:white; border-radius:4px; width:26px; height:26px; cursor:pointer; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center;';

        container.innerHTML = `
            <div id="comercial-os-content" style="background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; box-sizing: border-box;">
                <!-- HEADER FORM — Fixo no topo (idêntico à OS da Logística) -->
                <div style="position: sticky; top: 60px; z-index: 20; display: flex; gap: 1rem; align-items: center; background: white; padding: 0.5rem 1.25rem; flex-shrink: 0; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">OS</label>
                        <div style="display: flex; align-items: center; gap: 2px;">
                            <img id="cos-img-tipo-os" src="" style="height: 28px; display: none; cursor: pointer;" alt="Tipo OS" title="Clique para alterar Obra/Evento" onclick="window._comercialOS.selecionarTipoOsModal()">
                            <input type="text" id="cos-input-os" style="${inputStyle} width: 85px;" placeholder="Ex: 12345">
                            <button type="button" id="cos-btn-add-os-tipo" onclick="window._comercialOS.selecionarTipoOsModal()" style="${btnStyle} background:#0284c7;" title="Definir tipo de OS (Obra/Evento)"><i class="ph ph-plus"></i></button>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 200px;">
                        <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Cliente</label>
                        <div style="display:flex; gap:4px; align-items:center; width: 100%; position:relative;">
                            <input type="text" id="cos-input-cliente" style="${inputStyle}" placeholder="Nome do Cliente"
                                oninput="window._comercialOS.filtrarClientesDropdown(this.value)"
                                onfocus="window._comercialOS.filtrarClientesDropdown(this.value)">
                            <button type="button" onclick="window._comercialOS.filtrarClientesDropdown(document.getElementById('cos-input-cliente')?.value || '', true)" style="${btnStyle} background:#0284c7;" title="Pesquisar cliente"><i class="ph ph-magnifying-glass"></i></button>
                            <div id="cos-cliente-dropdown" style="display:none; position:absolute; top:100%; left:0; right:30px; z-index:350; background:#fff; border:1px solid #cbd5e1; border-radius:6px; max-height:220px; overflow-y:auto; box-shadow:0 8px 24px rgba(15,23,42,0.15); margin-top:2px;"></div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Patr.</label>
                        <div style="display:flex; position:relative;">
                            <input type="text" id="cos-input-patrimonio" style="${inputStyle} width: 75px; padding-right:24px;" placeholder="Patr.">
                            <button type="button" style="position:absolute; right:0; top:0; bottom:0; background:transparent; border:none; color:#64748b; cursor:pointer; width:24px; display:flex; align-items:center; justify-content:center;" title="Patrimônio"><i class="ph ph-magnifying-glass"></i></button>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Contrato</label>
                        <div style="display:flex; position:relative;">
                            <input type="text" id="cos-input-contrato" style="${inputStyle} width: 100px; padding-right:24px;" placeholder="Nº Contrato">
                            <button type="button" style="position:absolute; right:0; top:0; bottom:0; background:transparent; border:none; color:#64748b; cursor:pointer; width:24px; display:flex; align-items:center; justify-content:center;" title="Contrato"><i class="ph ph-magnifying-glass"></i></button>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Data</label>
                        <input type="date" id="cos-input-data" style="${inputStyle} width: 118px;">
                    </div>

                    <div style="display:flex; gap:0.5rem; margin-left: auto;">
                        <button type="button" onclick="window._comercialOS.colarTextoOS()" style="background:#f59e0b; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-clipboard-text"></i> Colar OS</button>
                        <button type="button" onclick="window._comercialOS.limparFormulario()" style="background:#ef4444; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-x"></i> Limpar</button>
                        <button type="button" onclick="window._comercialOS.salvarRascunhoLocal()" style="background:#14b8a6; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-check-circle"></i> Salvar</button>
                    </div>
                </div>

                <!-- CORPO PRINCIPAL (2 COLUNAS: FORMULÁRIO + MAPA) -->
                <div style="flex: 1; padding: 0.75rem 1.25rem 1.25rem; box-sizing: border-box;">
                    <div style="display: flex; gap: 0.75rem; min-height: 500px; flex-wrap: wrap;">
                        <!-- COLUNA ESQUERDA: TODOS OS CAMPOS DA OS DA LOGÍSTICA -->
                        <div style="display: flex; flex-direction: column; gap: 0.55rem; flex: 2; min-width: 340px; padding-right: 4px;">
                            <!-- Endereço / Complemento / Latitude, Longitude -->
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <div style="flex: 3; min-width: 220px;">
                                    <label style="${labelStyle}">Endereço</label>
                                    <div style="display:flex; gap:2px; position:relative;">
                                        <input type="text" id="cos-input-endereco" style="${inputStyle}" placeholder="Ex: Rua das Flores, 123 - Bairro, Cidade/SP" autocomplete="off">
                                        <button type="button" onclick="window._comercialOS.buscarEnderecoNoMapa()" style="background:#1e40af; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0;" title="Localizar endereço no mapa"><i class="ph ph-magnifying-glass"></i></button>
                                        <button type="button" onclick="window._comercialOS.colarLinkGoogleMaps()" style="background:#16a34a; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0; font-weight:700; font-size:0.75rem;" title="Colar link ou coordenadas do Google Maps">G</button>
                                    </div>
                                </div>
                                <div style="flex: 1; min-width: 140px;">
                                    <label style="${labelStyle}">Complem. / Referência</label>
                                    <input type="text" id="cos-input-complemento" style="${inputStyle}" placeholder="Apto, Sala, Referência...">
                                </div>
                                <div style="flex: 0 0 200px;">
                                    <label style="${labelStyle}">Latitude, Longitude</label>
                                    <div style="display:flex; gap:2px;">
                                        <input type="text" id="cos-input-coord" style="${inputStyle} font-size:0.68rem;" placeholder="-23.5505, -46.6333">
                                        <button type="button" onclick="window._comercialOS.aplicarCoordenadasMapa()" style="background:#0369a1; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0;" title="Posicionar no mapa pelas coordenadas"><i class="ph ph-map-pin"></i></button>
                                    </div>
                                </div>
                            </div>

                            <!-- Responsável / SMS (Telefone) / Email -->
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="${labelStyle}">Responsável</label>
                                    <input type="text" id="cos-input-responsavel" style="${inputStyle}" placeholder="Nome do contato">
                                </div>
                                <div style="flex: 1; min-width: 140px;">
                                    <label style="${labelStyle}">SMS (Telefone)</label>
                                    <input type="text" id="cos-input-sms" style="${inputStyle}" placeholder="(00) 00000-0000">
                                </div>
                                <div style="flex: 1; min-width: 160px;">
                                    <label style="${labelStyle}">Email</label>
                                    <input type="email" id="cos-input-email" style="${inputStyle}" placeholder="email@exemplo.com">
                                </div>
                            </div>

                            <!-- Horários e Dias da Semana -->
                            <div style="display: flex; gap: 0.5rem; align-items: center; background: #f8fafc; padding: 0.4rem 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0; flex-wrap: wrap;">
                                <label style="display:flex; align-items:center; gap:3px; font-size:0.75rem; color:#475569; cursor:pointer;">
                                    <input type="checkbox" id="cos-chk-diurno" onchange="window._comercialOS.onToggleTurno('diurno', this.checked)"> Diurno
                                </label>
                                <label style="display:flex; align-items:center; gap:3px; font-size:0.75rem; color:#475569; cursor:pointer;">
                                    <input type="checkbox" id="cos-chk-noturno" onchange="window._comercialOS.onToggleTurno('noturno', this.checked)"> Noturno
                                </label>
                                <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                                <span style="font-size: 0.75rem; font-weight: 600; color:#475569;">Horário:</span>
                                <input type="time" id="cos-input-hora-inicio" style="${inputStyle} width: 82px;"> às
                                <input type="time" id="cos-input-hora-fim" style="${inputStyle} width: 82px;">
                                <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                                <button type="button" style="background:#f59e0b; border:none; color:white; height:26px; width:26px; border-radius:4px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:0;" title="Verificar manutenções programadas para esta região">
                                    <i class="ph ph-calendar-check" style="font-size:1.1rem;"></i>
                                </button>
                                ${[
                                    { d: 'Seg', id: 'cos-chk-seg', c: '#ef4444' },
                                    { d: 'Ter', id: 'cos-chk-ter', c: '#f97316' },
                                    { d: 'Qua', id: 'cos-chk-qua', c: '#ca8a04' },
                                    { d: 'Qui', id: 'cos-chk-qui', c: '#16a34a' },
                                    { d: 'Sex', id: 'cos-chk-sex', c: '#3b82f6' },
                                    { d: 'Sáb', id: 'cos-chk-sab', c: '#8b5cf6' },
                                    { d: 'Dom', id: 'cos-chk-dom', c: '#ec4899' }
                                ].map(item => `
                                    <label id="lbl-${item.id}" data-cor="${item.c}" style="display:flex; align-items:center; gap:2px; font-size:0.7rem; color:${item.c}; font-weight:700; cursor:pointer; padding:2px 6px; border-radius:4px; border:1.5px solid ${item.c}; transition:background 0.15s;">
                                        <input type="checkbox" id="${item.id}" onchange="(function(chk,lbl){lbl.style.background=chk.checked?lbl.dataset.cor:'transparent';lbl.style.color=chk.checked?'white':lbl.dataset.cor;})(this,this.closest('label'))"> ${item.d}
                                    </label>
                                `).join('')}
                            </div>

                            <!-- Bloquear Manutenção + Manutenção Quinzenal -->
                            <div style="display: flex; gap: 0.5rem; align-items: stretch;">
                                <div style="display: flex; align-items: center; background: #fef2f2; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 4px; flex-shrink: 0;">
                                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: #dc2626; cursor: pointer; margin: 0;">
                                        <input type="checkbox" id="cos-chk-bloquear-manutencao" style="accent-color: #dc2626; cursor: pointer;">
                                        Bloquear Manutenção
                                    </label>
                                </div>
                                <div style="display: flex; flex: 1; gap: 1rem; align-items: center; background: #fffbeb; border: 1px solid #fde68a; padding: 6px 12px; border-radius: 4px; flex-wrap: wrap;">
                                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: #b45309; cursor: pointer; margin: 0;">
                                        <input type="checkbox" id="cos-chk-quinzenal" onchange="document.getElementById('cos-data-quinzenal-container').style.display = this.checked ? 'flex' : 'none';">
                                        Manutenção Quinzenal
                                    </label>
                                    <div id="cos-data-quinzenal-container" style="display: none; align-items: center; gap: 6px;">
                                        <label style="font-size: 0.75rem; font-weight: 600; color: #b45309;">1ª Manutenção:</label>
                                        <input type="date" id="cos-input-primeira-manutencao" style="font-size: 0.75rem; padding: 2px 6px; border: 1px solid #fcd34d; border-radius: 4px; outline: none; color: #92400e; background: #fff;">
                                    </div>
                                </div>
                            </div>

                            <!-- Tipo de Serviço / Habilidade Atendimento / Habilidade da Equipe -->
                            <div style="display: flex; gap: 0.75rem; align-items: flex-start; flex-wrap: wrap;">
                                <!-- Tipo de Serviço -->
                                <div style="flex: 1; min-width: 180px;">
                                    <label style="${labelStyle}">Tipo de Serviço</label>
                                    <div style="position:relative;">
                                        <input type="text" id="cos-tipo-servico-search" placeholder="Digite para filtrar..." autocomplete="off"
                                            style="${inputStyle} padding-right:22px;"
                                            oninput="window._comercialOS.filtrarTiposServico(this.value)"
                                            onfocus="document.getElementById('cos-tipo-dropdown').style.display='block'">
                                        <i class="ph ph-caret-down" style="position:absolute;right:5px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:0.75rem;pointer-events:none;"></i>
                                        <div id="cos-tipo-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:250;background:white;border:1px solid #cbd5e1;border-radius:4px;max-height:240px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
                                            ${COS_TIPOS_SERVICO.map(t => {
                                                let ic = '';
                                                if (t.includes('RETIRADA')) ic = t.includes('TOTAL') ? '⭕' : '🔶';
                                                else if (t.includes('SUCCAO')) ic = '💧';
                                                else if (t.includes('LIMPA FOSSA')) ic = '💦';
                                                else if (t.includes('REPARO')) ic = '🔧';
                                                else if (t.includes('VISITA TECNICA')) ic = '⚙️';
                                                else if (t.includes('MANUTENCAO')) ic = t.includes('AVULSA') ? '❗' : '';
                                                return `<div class="cos-tipo-opt" data-val="${escHtml(t)}" onclick="window._comercialOS.selecionarTipoServico('${escHtml(t)}')"
                                                    style="padding:5px 10px;cursor:pointer;font-size:0.78rem;color:#1e293b;"
                                                    onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''">
                                                    <span style="margin-right:4px;">${ic}</span>${escHtml(t)}
                                                </div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                    <input type="hidden" id="cos-tipo-servico">
                                </div>

                                <!-- Habilidade Atendimento -->
                                <div style="flex: 1.5; min-width: 190px; position: relative;">
                                    <label style="${labelStyle}">Habilidade Atendimento</label>
                                    <div id="cos-hab-atend-wrapper" style="position:relative;">
                                        <div id="cos-hab-atend-display" onclick="window._comercialOS.toggleDropdown('cos-hab-atend-dropdown')"
                                            style="display:flex; align-items:center; gap:4px; min-height:26px; border:1px solid #cbd5e1; border-radius:4px; padding:2px 6px; font-size:0.7rem; cursor:pointer; background:white; flex-wrap:wrap; user-select:none;">
                                            <span id="cos-hab-atend-placeholder" style="color:#94a3b8; font-size:0.7rem;">Selecionar...</span>
                                        </div>
                                        <div id="cos-hab-atend-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:300; background:white; border:1px solid #cbd5e1; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.12); padding:6px 0;">
                                            ${COS_HABILIDADES_ATEND.map(s => {
                                                const ic = { 'VAC': '🏗️', 'UTILITARIO': '🛻', 'CARRETINHA': '🔗' }[s] || '';
                                                return `<label style="display:flex; align-items:center; gap:8px; padding:4px 10px; cursor:pointer; font-size:0.75rem; color:#1e293b;">
                                                    <input type="checkbox" class="cos-hab-atend-chk" value="${escHtml(s)}" onchange="window._comercialOS.onHabAtendChange()">
                                                    ${ic ? `<span>${ic}</span>` : ''}<span>${escHtml(s)}</span>
                                                </label>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>

                                <!-- Habilidade da Equipe -->
                                <div style="flex: 1.5; min-width: 190px; position: relative;">
                                    <label style="${labelStyle}">Habilidade da Equipe</label>
                                    <div id="cos-hab-equipe-wrapper" style="position:relative;">
                                        <div id="cos-hab-equipe-display" onclick="window._comercialOS.toggleDropdown('cos-hab-equipe-dropdown')"
                                            style="display:flex; align-items:center; gap:4px; min-height:26px; border:1px solid #cbd5e1; border-radius:4px; padding:2px 6px; font-size:0.7rem; cursor:pointer; background:white; flex-wrap:wrap; user-select:none;">
                                            <span id="cos-hab-equipe-placeholder" style="color:#94a3b8; font-size:0.7rem;">Selecionar...</span>
                                        </div>
                                        <div id="cos-hab-equipe-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:300; background:white; border:1px solid #cbd5e1; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.12); padding:6px 0;">
                                            ${COS_HABILIDADES_EQUIPE.map(sk => `
                                                <label style="display:flex; align-items:center; gap:8px; padding:4px 10px; cursor:pointer; font-size:0.75rem; color:#1e293b;">
                                                    <input type="checkbox" class="cos-hab-equipe-chk" value="${escHtml(sk)}" onchange="window._comercialOS.onHabEquipeChange()">
                                                    <span>${escHtml(sk)}</span>
                                                </label>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Observações Internas / Obs. Motoristas / Vídeo OS -->
                            <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="${labelStyle}">Obs. Internas</label>
                                    <input type="text" id="cos-input-obs-internas" style="${inputStyle}" placeholder="Info interna">
                                </div>
                                <button type="button" title="Copiar para Obs. Motoristas"
                                    onclick="(function(){ const s = document.getElementById('cos-input-obs-internas'); const d = document.getElementById('cos-input-obs'); if (s && d && s.value.trim()) d.value = s.value; })()"
                                    style="flex-shrink:0;height:26px;padding:0 10px;background:#2d9e5f;color:white;border:none;border-radius:4px;font-size:1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;">›</button>
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="${labelStyle}">Obs. Motoristas</label>
                                    <input type="text" id="cos-input-obs" style="${inputStyle}" placeholder="Info para motorista">
                                </div>
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="${labelStyle}">Vídeo OS</label>
                                    <div style="display:flex; gap:4px; align-items:center;">
                                        <input type="file" id="cos-input-video-file" accept="video/*" style="display:none;">
                                        <button type="button" onclick="document.getElementById('cos-input-video-file').click()"
                                            style="background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;padding:0 8px;height:26px;font-size:0.72rem;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;">
                                            <i class="ph ph-upload-simple"></i> Upload Vídeo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Produtos da OS e Contadores (Produtos, Tempo, Tanque, Carroceria, Carretinha) -->
                            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                                    <span id="cos-badge-tipo-os" style="display:none; background:#94a3b8; color:white; font-size:0.65rem; font-weight:700; padding:2px 8px; border-radius:99px; white-space:nowrap;"></span>
                                    <div style="flex: 2; min-width: 210px; position: relative;">
                                        <input type="text" id="cos-prod-desc" style="${inputStyle}" placeholder="Selecione ou digite o produto..." autocomplete="off"
                                            onfocus="window._comercialOS.filtrarProdutosDropdown(this.value, true)"
                                            oninput="window._comercialOS.filtrarProdutosDropdown(this.value, true)">
                                        <div id="cos-prod-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:320; background:#fff; border:1px solid #cbd5e1; border-radius:6px; max-height:220px; overflow-y:auto; box-shadow:0 8px 20px rgba(15,23,42,0.15); margin-top:2px;"></div>
                                    </div>
                                    <input type="number" id="cos-prod-qtd" style="${inputStyle} width: 65px;" placeholder="Qtd" min="1" value="1">
                                    <button type="button" onclick="window._comercialOS.adicionarProduto()" style="background: #3b82f6; color: white; width:26px; height:26px; border:none; border-radius:4px; cursor:pointer;" title="Adicionar produto"><i class="ph ph-plus"></i></button>

                                    <div style="display: flex; gap: 0.55rem; font-size: 0.7rem; color: #64748b; margin-left: auto; align-items: center; flex-wrap: wrap;">
                                        <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-package"></i> Produtos: <strong id="cos-total-prod">0</strong></span>
                                        <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; display:flex; align-items:center; gap:2px;"><i class="ph ph-clock"></i> Tempo: <input id="cos-tempo-total" value="00:10" style="width:42px; background:transparent; border:none; border-bottom:1px dashed #94a3b8; font-weight:bold; color:#0f172a; text-align:center; padding:0; outline:none; font-size:0.7rem;"></span>
                                        <span style="background:#dbeafe; padding:2px 6px; border-radius:4px;" title="Tanque"><i class="ph ph-fill-tray"></i> Tanque: <strong id="cos-total-tanques">0</strong></span>
                                        <span style="background:#dcfce7; padding:2px 6px; border-radius:4px;" title="Carroceria"><i class="ph ph-truck"></i> Carroceria: <strong id="cos-total-carrocerias">0</strong></span>
                                        <span style="background:#fef9c3; padding:2px 6px; border-radius:4px;" title="Carretinha"><i class="ph ph-link"></i> Carretinha: <strong id="cos-total-carretinhas">0</strong></span>
                                    </div>
                                </div>

                                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow-y: auto; max-height: 115px; background: white;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                            <tr>
                                                <th style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.7rem; color: #64748b;">Descrição</th>
                                                <th style="padding: 0.3rem 0.5rem; text-align: center; font-size: 0.7rem; color: #64748b; width: 65px;">Qtd</th>
                                                <th style="padding: 0.3rem 0.5rem; text-align: center; font-size: 0.7rem; color: #64748b; width: 55px;">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody id="cos-tbody-produtos"></tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Botões de Ação / Variáveis Azuis (idênticos à OS da Logística) -->
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: auto; padding-top: 0.4rem;">
                                ${Object.entries(COS_ACOES_DICT).map(([acao, icone]) => {
                                    const ativo = cosState.acoes.has(acao);
                                    return `<button type="button" class="cos-btn-acao" data-acao="${escHtml(acao)}"
                                        onclick="window._comercialOS.toggleAcao('${escHtml(acao)}', this)"
                                        style="font-size:0.66rem; font-weight: 700; border: 1px solid #bae6fd; background: ${ativo ? '#0284c7' : '#f0f9ff'}; color: ${ativo ? '#fff' : '#0284c7'}; padding: 0.25rem; border-radius: 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; min-height: 40px; transition: all 0.15s; line-height: 1.1; text-align: center;">
                                        <span style="font-size:0.88rem; margin-bottom:1px;">${icone}</span> ${escHtml(acao)}
                                    </button>`;
                                }).join('')}
                            </div>
                        </div>

                        <!-- COLUNA DIREITA: MAPA OPENSTREETMAP -->
                        <div style="display: flex; flex-direction: column; flex: 1; min-width: 280px;">
                            <div id="cos-mapa-container" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; height: 100%; min-height: 420px; display: flex; flex-direction: column; position: relative; overflow: hidden;">
                                <div id="cos-mapa-placeholder" style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:0.5rem; color:#94a3b8; padding:1rem; text-align:center;">
                                    <i class="ph ph-map-trifold" style="font-size:2.5rem; color:#cbd5e1;"></i>
                                    <p style="font-size:0.75rem; margin:0; font-weight:500;">Digite o endereço e clique em 🔍<br>para carregar o mapa e obter as coordenadas</p>
                                    <span style="font-size:0.65rem; color:#b0bec5; margin-top:4px;">🌍 Mapa gratuito via OpenStreetMap</span>
                                </div>
                                <div id="cos-mapa-leaflet" style="display:none; flex:1; width:100%; min-height:380px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        atualizarBadgeETipoOsUI();
        renderTabelaProdutos();
    }

    window._comercialOS = {
        init() {
            renderTelaComercialOS();
        },

        selecionarTipoOsModal() {
            abrirPopupTipoOsComercial((tipo) => {
                cosState.tipoOs = tipo;
                atualizarBadgeETipoOsUI();
            });
        },

        async filtrarClientesDropdown(termo, forcarAbrir = false) {
            const dd = document.getElementById('cos-cliente-dropdown');
            if (!dd) return;
            if (!Array.isArray(window._clientesCache) || window._clientesCache.length === 0) {
                try {
                    if (typeof window.apiGet === 'function') {
                        window._clientesCache = await window.apiGet('/clientes');
                    }
                } catch (_) {}
            }
            const lista = Array.isArray(window._clientesCache) ? window._clientesCache : [];
            const q = normStr(termo);
            const filtrados = (q ? lista.filter(c => normStr(c.nome_razao_social).includes(q) || normStr(c.nome_fantasia).includes(q) || normStr(c.cpf_cnpj).includes(q)) : lista).slice(0, 35);
            if (!filtrados.length) {
                dd.style.display = 'none';
                return;
            }
            dd.innerHTML = filtrados.map(c => {
                const nomeBase = c.nome_razao_social || c.nome_fantasia || '';
                const nomeComIcone = typeof window.formatarNomeClienteComIcone === 'function'
                    ? window.formatarNomeClienteComIcone(nomeBase, c.grupo_clientes || c.classificacao)
                    : nomeBase;
                const escVal = nomeComIcone.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarCliente('${escVal}')"
                    style="padding:6px 10px; font-size:0.78rem; color:#1e293b; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                    onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='#fff'">
                    <strong>${escHtml(nomeComIcone)}</strong>
                </div>`;
            }).join('');
            if (q || forcarAbrir) dd.style.display = 'block';
        },

        selecionarCliente(nomeFmt) {
            const inp = document.getElementById('cos-input-cliente');
            const dd = document.getElementById('cos-cliente-dropdown');
            if (inp) inp.value = nomeFmt;
            if (dd) dd.style.display = 'none';
        },

        onToggleTurno(turno, checked) {
            const diurno = document.getElementById('cos-chk-diurno');
            const noturno = document.getElementById('cos-chk-noturno');
            const hi = document.getElementById('cos-input-hora-inicio');
            const hf = document.getElementById('cos-input-hora-fim');
            if (turno === 'diurno' && checked) {
                if (noturno) noturno.checked = false;
                if (hi) hi.value = '07:00';
                if (hf) hf.value = '18:00';
            } else if (turno === 'noturno' && checked) {
                if (diurno) diurno.checked = false;
                if (hi) hi.value = '20:00';
                if (hf) hf.value = '23:00';
            }
        },

        filtrarTiposServico(termo) {
            const dd = document.getElementById('cos-tipo-dropdown');
            if (!dd) return;
            dd.style.display = 'block';
            const q = normStr(termo);
            dd.querySelectorAll('.cos-tipo-opt').forEach(el => {
                const v = normStr(el.getAttribute('data-val') || '');
                const okTipoOs = !cosState.tipoOs || v.includes(normStr(cosState.tipoOs)) || v.includes('compras');
                el.style.display = (okTipoOs && (!q || v.includes(q))) ? 'block' : 'none';
            });
        },

        selecionarTipoServico(val) {
            const inpS = document.getElementById('cos-tipo-servico-search');
            const inpH = document.getElementById('cos-tipo-servico');
            const dd = document.getElementById('cos-tipo-dropdown');
            if (inpS) inpS.value = val;
            if (inpH) inpH.value = val;
            if (dd) dd.style.display = 'none';
            recalcularTotaisProdutos();
        },

        toggleDropdown(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        },

        onHabAtendChange() {
            cosState.habAtend.clear();
            document.querySelectorAll('.cos-hab-atend-chk:checked').forEach(c => cosState.habAtend.add(c.value));
            const disp = document.getElementById('cos-hab-atend-display');
            if (!disp) return;
            if (cosState.habAtend.size === 0) {
                disp.innerHTML = `<span style="color:#94a3b8; font-size:0.7rem;">Selecionar...</span>`;
            } else {
                disp.innerHTML = Array.from(cosState.habAtend).map(h =>
                    `<span style="background:#dcfce7; color:#15803d; padding:1px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">${escHtml(h)}</span>`
                ).join('');
            }
        },

        onHabEquipeChange() {
            cosState.habEquipe.clear();
            document.querySelectorAll('.cos-hab-equipe-chk:checked').forEach(c => cosState.habEquipe.add(c.value));
            const disp = document.getElementById('cos-hab-equipe-display');
            if (!disp) return;
            if (cosState.habEquipe.size === 0) {
                disp.innerHTML = `<span style="color:#94a3b8; font-size:0.7rem;">Selecionar...</span>`;
            } else {
                disp.innerHTML = Array.from(cosState.habEquipe).map(h =>
                    `<span style="background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">${escHtml(h)}</span>`
                ).join('');
            }
        },

        filtrarProdutosDropdown(termo, abrir = true) {
            const dd = document.getElementById('cos-prod-dropdown');
            if (!dd) return;
            const q = normStr(termo);
            const prods = getProdutosFiltradosPorTipoOs().filter(p => !q || normStr(p.nome).includes(q));
            if (!prods.length) {
                dd.style.display = 'none';
                return;
            }
            dd.innerHTML = prods.map(p => `
                <div onmousedown="event.preventDefault(); window._comercialOS.selecionarProdutoInput('${escHtml(p.nome)}')"
                    style="padding:5px 10px; font-size:0.78rem; color:#1e293b; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                    onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='#fff'">
                    ${p.icone} <strong>${escHtml(p.nome)}</strong>
                </div>
            `).join('');
            if (abrir) dd.style.display = 'block';
        },

        selecionarProdutoInput(nomeProd) {
            const inp = document.getElementById('cos-prod-desc');
            const dd = document.getElementById('cos-prod-dropdown');
            if (inp) inp.value = nomeProd;
            if (dd) dd.style.display = 'none';
        },

        adicionarProduto() {
            const adicionar = () => {
                const inpDesc = document.getElementById('cos-prod-desc');
                const inpQtd = document.getElementById('cos-prod-qtd');
                let descRaw = (inpDesc?.value || '').trim().toUpperCase();
                const qtd = Math.max(1, parseInt(inpQtd?.value, 10) || 1);
                if (!descRaw) return;

                let descLimpa = descRaw.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE00-\uFEFF\s]+/gu, '').trim();
                if (!COS_EQUIPAMENTOS_DICT[descLimpa]) {
                    const keys = Object.keys(COS_EQUIPAMENTOS_DICT).sort((a, b) => b.length - a.length);
                    for (const k of keys) {
                        if (descRaw.includes(k)) { descLimpa = k; break; }
                    }
                }
                const existente = cosState.produtos.find(p => p.desc === descLimpa);
                if (existente) {
                    existente.qtd += qtd;
                } else {
                    cosState.produtos.push({ id: Date.now(), desc: descLimpa, qtd });
                }
                if (inpDesc) inpDesc.value = '';
                if (inpQtd) inpQtd.value = '1';
                renderTabelaProdutos();
            };

            if (!cosState.tipoOs) {
                abrirPopupTipoOsComercial((tipo) => {
                    cosState.tipoOs = tipo;
                    atualizarBadgeETipoOsUI();
                    adicionar();
                });
            } else {
                adicionar();
            }
        },

        alterarQtdProduto(id, novaQtd) {
            const item = cosState.produtos.find(p => p.id === id);
            if (item) {
                item.qtd = Math.max(1, parseInt(novaQtd, 10) || 1);
                recalcularTotaisProdutos();
            }
        },

        removerProduto(id) {
            cosState.produtos = cosState.produtos.filter(p => p.id !== id);
            renderTabelaProdutos();
        },

        toggleAcao(acao, btnEl) {
            if (cosState.acoes.has(acao)) {
                cosState.acoes.delete(acao);
                if (btnEl) { btnEl.style.background = '#f0f9ff'; btnEl.style.color = '#0284c7'; }
            } else {
                cosState.acoes.add(acao);
                if (btnEl) { btnEl.style.background = '#0284c7'; btnEl.style.color = '#fff'; }
            }
        },

        exibirMapaComCoord(lat, lng) {
            if (isNaN(lat) || isNaN(lng)) return;
            cosState.lat = lat;
            cosState.lng = lng;
            const ph = document.getElementById('cos-mapa-placeholder');
            const mapDiv = document.getElementById('cos-mapa-leaflet');
            if (ph) ph.style.display = 'none';
            if (mapDiv) mapDiv.style.display = 'block';
            if (typeof L === 'undefined') return;
            if (!cosState.leafletMap) {
                cosState.leafletMap = L.map('cos-mapa-leaflet').setView([lat, lng], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(cosState.leafletMap);
            } else {
                cosState.leafletMap.setView([lat, lng], 16);
                setTimeout(() => cosState.leafletMap.invalidateSize(), 60);
            }
            if (cosState.leafletMarker) {
                cosState.leafletMarker.setLatLng([lat, lng]);
            } else {
                cosState.leafletMarker = L.marker([lat, lng]).addTo(cosState.leafletMap);
            }
        },

        async buscarEnderecoNoMapa() {
            const end = (document.getElementById('cos-input-endereco')?.value || '').trim();
            if (!end) return;
            try {
                const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(end + ' Brasil')}&format=json&limit=1&countrycodes=br`);
                const d = await r.json();
                if (Array.isArray(d) && d[0]) {
                    const lat = parseFloat(d[0].lat);
                    const lng = parseFloat(d[0].lon);
                    const inpCoord = document.getElementById('cos-input-coord');
                    if (inpCoord) inpCoord.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    this.exibirMapaComCoord(lat, lng);
                }
            } catch (_) {}
        },

        aplicarCoordenadasMapa() {
            const raw = (document.getElementById('cos-input-coord')?.value || '').trim();
            const m = raw.match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/);
            if (m) {
                this.exibirMapaComCoord(parseFloat(m[1]), parseFloat(m[2]));
            }
        },

        async colarLinkGoogleMaps() {
            const val = prompt('Cole o link ou as coordenadas (Latitude, Longitude) do Google Maps:');
            if (!val) return;
            const m = val.match(/(-?\d{1,2}\.\d{3,})\s*[,;\s/@]+\s*(-?\d{1,3}\.\d{3,})/);
            if (m) {
                const lat = parseFloat(m[1]);
                const lng = parseFloat(m[2]);
                const inpCoord = document.getElementById('cos-input-coord');
                if (inpCoord) inpCoord.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                this.exibirMapaComCoord(lat, lng);
            }
        },

        colarTextoOS() {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Colar OS',
                    input: 'textarea',
                    inputPlaceholder: 'Cole aqui o texto da OS...',
                    showCancelButton: true,
                    confirmButtonText: 'Aplicar',
                    cancelButtonText: 'Cancelar'
                }).then(res => {
                    if (res.isConfirmed && res.value) {
                        const obs = document.getElementById('cos-input-obs-internas');
                        if (obs) obs.value = String(res.value).trim();
                    }
                });
            }
        },

        limparFormulario() {
            cosState.tipoOs = '';
            cosState.produtos = [];
            cosState.habAtend.clear();
            cosState.habEquipe.clear();
            cosState.acoes.clear();
            cosState.lat = null;
            cosState.lng = null;
            cosState.leafletMap = null;
            cosState.leafletMarker = null;
            renderTelaComercialOS();
        },

        salvarRascunhoLocal() {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Dados Preenchidos na Tela de OS (Comercial)',
                    text: 'Os campos da OS Comercial estão prontos para os próximos ajustes e definições.',
                    timer: 2200,
                    showConfirmButton: false
                });
            }
        }
    };

    document.addEventListener('click', (ev) => {
        const closeIfOutside = (ddId, wrapSelectors) => {
            const dd = document.getElementById(ddId);
            if (!dd || dd.style.display === 'none') return;
            const inside = wrapSelectors.some(sel => ev.target.closest(sel));
            if (!inside) dd.style.display = 'none';
        };
        closeIfOutside('cos-cliente-dropdown', ['#cos-input-cliente', '#cos-cliente-dropdown']);
        closeIfOutside('cos-tipo-dropdown', ['#cos-tipo-servico-search', '#cos-tipo-dropdown']);
        closeIfOutside('cos-hab-atend-dropdown', ['#cos-hab-atend-wrapper']);
        closeIfOutside('cos-hab-equipe-dropdown', ['#cos-hab-equipe-wrapper']);
        closeIfOutside('cos-prod-dropdown', ['#cos-prod-desc', '#cos-prod-dropdown']);
    });

    window.renderTelaOSComercial = function () {
        window._comercialOS.init();
    };
})();
