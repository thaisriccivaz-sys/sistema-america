/* ════════════════════════════════════════════════════════════════════════════
   MÓDULO: ROTA REDONDA (ORDENS DE SERVIÇO)
   ════════════════════════════════════════════════════════════════════════════ */

let osState = {
    loadedId: null,
    produtos: [],
    tiposServico: new Set(),
    acoes: new Set(),
    tempoTotal: 10,
    qtdTanques: 0,
    clienteConfirmado: true,
    clienteNome: '',
    enderecoSelecionado: '',
    tipoOs: '',                   // 'Obra' ou 'Evento' — libera o corpo do formulário
    coordenadasConfirmadas: false, // Passo 1: Botão G aplicado
    agendaVerificada: false,       // Passo 2: Botão Agenda clicado
    enderecoObrigatorio: false,    // Ativado ao clicar em + ou Colar OS
};

// ── DICIONÁRIO DE EQUIPAMENTOS (do Flutter: equipamentosDict) ───────────────
const EQUIPAMENTOS_DICT = {
    'STD OBRA':               { icone: '💙', codigo: 'STD O' },
    'STD EVENTO':             { icone: '💜', codigo: 'STD E' },
    'LX OBRA':                { icone: '🟦', codigo: 'LX O' },
    'LX EVENTO':              { icone: '🟣', codigo: 'LX E' },
    'ELX OBRA':               { icone: '🔵', codigo: 'ELX O' },
    'ELX EVENTO':             { icone: '🟣', codigo: 'ELX E' },
    'PCD OBRA':               { icone: '♿',  codigo: 'PCD O' },
    'PCD EVENTO':             { icone: '♿', codigo: 'PCD E' },
    'CHUVEIRO OBRA':          { icone: '🚿', codigo: 'CHUVEIRO O' },
    'CHUVEIRO EVENTO':        { icone: '🚿', codigo: 'CHUVEIRO E' },
    'HIDRÁULICO OBRA':        { icone: '🚽', codigo: 'HIDRÁULICO O' },
    'HIDRÁULICO EVENTO':      { icone: '🚽', codigo: 'HIDRÁULICO E' },
    'MICTÓRIO OBRA':          { icone: '💦', codigo: 'MICTÓRIO O' },
    'MICTÓRIO EVENTO':        { icone: '💦', codigo: 'MICTÓRIO E' },
    'PBII OBRA':              { icone: '🧼', codigo: 'PIA II O' },
    'PBII EVENTO':            { icone: '🧼', codigo: 'PIA II E' },
    'PBIII OBRA':             { icone: '🧼', codigo: 'PIA III O' },
    'PBIII EVENTO':           { icone: '🧼', codigo: 'PIA III E' },
    'GUARITA INDIVIDUAL OBRA':  { icone: '⬜', codigo: 'GUARITA INDIVIDUAL O' },
    'GUARITA INDIVIDUAL EVENTO':{ icone: '⬜', codigo: 'GUARITA INDIVIDUAL E' },
    'GUARITA DUPLA OBRA':     { icone: '⚪', codigo: 'GUARITA DUPLA O' },
    'GUARITA DUPLA EVENTO':   { icone: '⚪', codigo: 'GUARITA DUPLA E' },
    'LIMPA FOSSA OBRA':       { icone: '💧', codigo: 'LIMPA FOSSA OBRA' },
    'LIMPA FOSSA EVENTO':     { icone: '💧', codigo: 'LIMPA FOSSA EVENTO' },
    'CARRINHO':               { icone: '🛤', codigo: 'CARRINHO' },
    'CAIXA DAGUA':            { icone: '🧊', codigo: 'CAIXA DAGUA' },
};

function getProdutosPorTipo(tipoOs) {
    return Object.entries(EQUIPAMENTOS_DICT)
        .filter(([nome]) =>
            tipoOs === 'Obra'  ? nome.includes('OBRA')   :
            tipoOs === 'Evento'? nome.includes('EVENTO') : true
        )
        .map(([nome, v]) => ({ nome, ...v }));
}

// ── POPUP SELEÇÃO OBRA / EVENTO (mostrarLightboxSelecaoTipoOs do Flutter) ─────
function abrirPopupTipoOs(onSelecionar) {
    document.getElementById('rr-popup-tipo-os')?.remove();
    const popup = document.createElement('div');
    popup.id = 'rr-popup-tipo-os';
    popup.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = `
        <div style="background:#E0F8F5;border-radius:16px;padding:1.5rem 2rem;box-shadow:0 8px 32px rgba(0,0,0,0.2);text-align:center;min-width:280px;">
            <p style="font-weight:700;font-size:1.1rem;color:#00251A;margin:0 0 1.2rem;">Selecione o tipo de OS</p>
            <div style="display:flex;gap:1.5rem;justify-content:center;">
                <button id="rr-btn-obra" style="width:120px;height:130px;background:#156EB6;border:none;border-radius:12px;color:white;font-weight:700;font-size:1rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;transition:background 0.2s;">
                    <img src="assets/obra.png" style="height:65px; object-fit:contain;" alt="Obra">OBRA
                </button>
                <button id="rr-btn-evento" style="width:120px;height:130px;background:#8E24AA;border:none;border-radius:12px;color:white;font-weight:700;font-size:1rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;transition:background 0.2s;">
                    <img src="assets/evento.png" style="height:65px; object-fit:contain;" alt="Evento">EVENTO
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#rr-btn-obra').onclick = () => { popup.remove(); onSelecionar('Obra'); };
    popup.querySelector('#rr-btn-evento').onclick = () => { popup.remove(); onSelecionar('Evento'); };
    // clique fora fecha sem selecionar
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
}

const TIPOS_SERVICO_OS = [
    'ENTREGA OBRA', 'RETIRADA OBRA TOTAL', 'RETIRADA OBRA PARCIAL', 'MANUTENCAO OBRA', 'MANUTENCAO AVULSA OBRA',
    'REPARO EQUIPAMENTO OBRA', 'VISITA TECNICA OBRA', 'LIMPA FOSSA OBRA',
    'ENTREGA EVENTO', 'RETIRADA EVENTO TOTAL', 'RETIRADA EVENTO PARCIAL', 'MANUTENCAO EVENTO', 'MANUTENCAO AVULSA EVENTO', 'SUCCAO EVENTO',
    'REPARO EQUIPAMENTO EVENTO', 'VISITA TECNICA EVENTO', 'LIMPA FOSSA EVENTO'
];
const HABILIDADES = ['TANQUE', 'CARGA', 'VAC', 'UTILITARIO', 'TECNICO', 'CARRETINHA', 'CARROCERIA', 'TANQUE GRANDE'];
const ACOES_DICT = {
    'LEVAR CARRINHO': '🛒',
    'ATENÇÃO AO HORÁRIO': '⏰',
    'TROCA DE EQUIPAMENTO': '♻️',
    'LEVAR EXTENSORA': '🌀',
    'APOIO DE SUCÇÃO': '💧',
    'INFORMAÇÕES IMPORTANTES': '🚨',
    'CARRETINHA': '🔗',
    'LEVAR EPI': '🦺',
    'INTEGRAÇÃO': '👷',
    'BANHEIRO ITINERANTE': '🔛'
};
const ACOES = Object.keys(ACOES_DICT);

// ── CÁLCULO DE TEMPO (espelho do calcularTipoDeServico() do Flutter) ──────────
function calcularTempo() {
    const tipoServico = (document.getElementById('rr-tipo-servico')?.value || '').trim().toUpperCase();

    // Base: 10 min para entregas/retiradas/visitas, 0 para manutenção
    let baseMin = 10;
    if (tipoServico.includes('MANUTENCAO')) baseMin = 0;

    // Soma total de quantidades (igual ao Flutter: int totalItens = 0; for produto in produtosLogistica)
    const totalItens = osState.produtos.reduce((acc, p) => acc + (parseInt(p.qtd) || 0), 0);

    // Fórmula: base + 5min × totalItens
    const totalMin = baseMin + (5 * totalItens);
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    const resultado = `${hh}:${mm}`;

    const el = document.getElementById('rr-tempo-total');
    if (el) el.value = resultado;

    // Após tempo, recalcula carga também (igual ao Flutter que chama calcularCargaTotalFromLista())
    calcularCargaTotalFromLista();

    return resultado;
}

// ── CARGA PROPORCIONAL (Mictório) — regra de 33.33%, arredonda para par ────────
function calcularCargaProporcional(quantidade) {
    const proporcional = quantidade * 0.3333;
    let carga = Math.ceil(proporcional);
    if (carga % 2 !== 0) carga++;
    return carga;
}

// ── CÁLCULO DE CARGA (espelho do calcularCargaTotalFromLista() do Flutter) ────
function calcularCargaTotalFromLista() {
    const tipoServico = (document.getElementById('rr-tipo-servico')?.value || '')
        .replace(/  /g, ' ').trim().toUpperCase();
    const isManutencao = tipoServico.includes('MANUTENCAO');

    let totalCargaVeiculo = 0;
    let totalCargaTanque = 0;

    for (const produto of osState.produtos) {
        const equipamento = (produto.desc || '').trim().toUpperCase();
        const quantidade = parseInt(produto.qtd) || 0;
        if (!equipamento) continue;

        let cargaVeic = 0;
        let cargaTanq = 0;

        if (equipamento.includes('LIMPA FOSSA')) {
            cargaTanq = 33 * quantidade;
            cargaVeic = 0;
            osState.tiposServico.add('TANQUE GRANDE');
            totalCargaVeiculo += cargaVeic;
            totalCargaTanque += cargaTanq;
            continue;
        }

        if (!isManutencao) {
            if (equipamento.includes('OBRA')) {
                switch (equipamento) {
                    case 'STD OBRA': case 'LX OBRA': case 'ELX OBRA':
                    case 'GUARITA INDIVIDUAL OBRA': case 'PBII OBRA': case 'PBIII OBRA':
                    case 'CHUVEIRO OBRA': case 'HIDRÁULICO OBRA':
                        cargaVeic = quantidade; break;
                    case 'GUARITA DUPLA OBRA': case 'PCD OBRA':
                        cargaVeic = 2 * quantidade; break;
                    case 'MICTÓRIO OBRA':
                        cargaVeic = calcularCargaProporcional(quantidade); break;
                    default:
                        cargaVeic = 0;
                }
            } else if (equipamento.includes('EVENTO')) {
                switch (equipamento) {
                    case 'STD EVENTO': case 'LX EVENTO': case 'ELX EVENTO':
                    case 'GUARITA INDIVIDUAL EVENTO': case 'PIA II EVENTO': case 'PIA III EVENTO':
                    case 'CHUVEIRO EVENTO': case 'HIDRÁULICO EVENTO':
                        cargaVeic = quantidade; break;
                    case 'GUARITA DUPLA EVENTO': case 'PCD EVENTO':
                        cargaVeic = 2 * quantidade; break;
                    case 'MICTÓRIO EVENTO':
                        cargaVeic = calcularCargaProporcional(quantidade); break;
                    default:
                        cargaVeic = quantidade;
                }
            }
        }

        if (isManutencao || tipoServico.includes('RETIRADA') || tipoServico.includes('TROCA')) {
            if (equipamento.includes('EVENTO')) {
                switch (equipamento) {
                    case 'STD EVENTO': case 'LX EVENTO': case 'ELX EVENTO':
                    case 'PCD EVENTO': case 'CHUVEIRO EVENTO': case 'HIDRÁULICO EVENTO':
                        cargaTanq = 5 * quantidade; break;
                    case 'MICTÓRIO EVENTO':
                        cargaTanq = 10 * quantidade; break;
                    case 'PIA II EVENTO': case 'PIA III EVENTO':
                        cargaTanq = 1 * quantidade; break;
                    default:
                        cargaTanq = quantidade;
                }
            } else if (equipamento.includes('OBRA') || equipamento.includes('AVULSA')) {
                switch (equipamento) {
                    case 'STD OBRA': case 'LX OBRA': case 'ELX OBRA':
                    case 'PBII OBRA': case 'PBIII OBRA':
                    case 'CHUVEIRO OBRA': case 'HIDRÁULICO OBRA':
                        cargaTanq = 1 * quantidade; break;
                    case 'MICTÓRIO OBRA':
                        cargaTanq = 4 * quantidade; break;
                    default:
                        cargaTanq = quantidade;
                }
            } else {
                cargaTanq = quantidade;
            }
        }

        totalCargaVeiculo += cargaVeic;
        totalCargaTanque += cargaTanq;
    }

    let tanque = '', carroceria = '', carretinha = '';
    
    if (isManutencao) {
        tanque = totalCargaTanque > 0 ? String(totalCargaTanque) : '0';
    } else {
        if (totalCargaVeiculo <= 12) {
            carroceria = totalCargaVeiculo > 0 ? String(totalCargaVeiculo) : '0';
            carretinha = '0';
        } else {
            carroceria = '0';
            carretinha = String(totalCargaVeiculo);
        }
        
        if (tipoServico.includes('RETIRADA') || tipoServico.includes('TROCA')) {
            tanque = totalCargaTanque > 0 ? String(totalCargaTanque) : '0';
        }
    }

    // Atualiza cada badge separadamente (igual ao Flutter)
    const elTanquesF     = document.getElementById('rr-total-tanques');
    const elCarroceriasF = document.getElementById('rr-total-carrocerias');
    const elCarretinhasF = document.getElementById('rr-total-carretinhas');
    if (elTanquesF)     elTanquesF.innerText     = tanque     || '0';
    if (elCarroceriasF) elCarroceriasF.innerText = carroceria || '0';
    if (elCarretinhasF) elCarretinhasF.innerText = carretinha || '0';

    // Guarda no estado para usar ao Gerar OS
    osState.tanque     = tanque;
    osState.carroceria = carroceria;
    osState.carretinha = carretinha;
    osState.totalCarga = totalCargaVeiculo; // Bugfix

    // Regra da Carretinha: se > 12 de carga veículo, adiciona habilidade Carretinha
    if (totalCargaVeiculo > 12) {
        osState.tiposServico.add('CARRETINHA');
    } else {
        osState.tiposServico.delete('CARRETINHA');
    }
    atualizarUI();
}

// ── CALCULAR CAMPOS POR PRODUTO (espelho do Flutter) ──────────────────────
// Chamado ao adicionar produto; ao final chama calcularTempo() que
// recalcula tudo do zero via calcularCargaTotalFromLista()
function calcularCamposPorProduto(produtoAdicionado) {
    try {
        const tipoServico = (document.getElementById('rr-tipo-servico')?.value || '').trim().toUpperCase();
        const isManutencao = tipoServico === 'MANUTENCAO AVULSA' ||
            tipoServico === 'MANUTENCAO OBRA' ||
            tipoServico === 'MANUTENCAO EVENTO';

        const equipamento = (produtoAdicionado.desc || '').trim().toUpperCase();
        const quantidade  = parseInt(produtoAdicionado.qtd) || 0;
        if (!equipamento) { calcularTempo(); return; }

        let cargaTanque = 0, cargaCarretinha = 0;

        if (isManutencao) {
            if (tipoServico.includes('EVENTO')) {
                switch (equipamento) {
                    case 'STD EVENTO': case 'LX EVENTO': case 'ELX EVENTO':
                    case 'ELX EVENTO': case 'PCD EVENTO': case 'CHUVEIRO EVENTO':
                    case 'HIDRÁULICO EVENTO':
                        cargaTanque = 5 * quantidade; break;
                    case 'MICTÓRIO EVENTO':
                        cargaTanque = 10 * quantidade; break;
                    case 'PIA II EVENTO': case 'PIA III EVENTO':
                        cargaTanque = 1 * quantidade; break;
                    default: cargaTanque = quantidade;
                }
            } else if (tipoServico.includes('OBRA') || tipoServico.includes('AVULSA')) {
                switch (equipamento) {
                    case 'STD OBRA': case 'LX OBRA': case 'ELX OBRA': case 'ELX OBRA':
                    case 'PBII OBRA': case 'PBIII OBRA': case 'CHUVEIRO OBRA':
                    case 'HIDRÁULICO OBRA':
                        cargaTanque = 1 * quantidade; break;
                    case 'MICTÓRIO OBRA':
                        cargaTanque = 4 * quantidade; break;
                    default: cargaTanque = quantidade;
                }
            } else {
                cargaTanque = quantidade;
            }
        } else {
            if (equipamento.includes('OBRA')) {
                switch (equipamento) {
                    case 'STD OBRA': case 'LX OBRA': case 'ELX OBRA': case 'ELX OBRA':
                    case 'GUARITA INDIVIDUAL OBRA': case 'PIA II OBRA': case 'PIA III OBRA':
                    case 'HIDRÁULICO OBRA': case 'CHUVEIRO OBRA': case 'PBII OBRA': case 'PBIII OBRA':
                        cargaTanque = quantidade; break;
                    case 'GUARITA DUPLA OBRA': case 'PCD OBRA':
                        cargaCarretinha = 2 * quantidade; break;
                    case 'MICTÓRIO OBRA':
                        cargaCarretinha = quantidade <= 6 ? 2 : quantidade <= 12 ? 4 : 6; break;
                }
            } else if (equipamento.includes('EVENTO')) {
                switch (equipamento) {
                    case 'STD EVENTO': case 'LX EVENTO': case 'ELX EVENTO': case 'ELX EVENTO':
                    case 'GUARITA INDIVIDUAL EVENTO': case 'PIA II EVENTO': case 'PIA III EVENTO':
                    case 'HIDRÁULICO EVENTO': case 'CHUVEIRO EVENTO':
                        cargaTanque = quantidade; break;
                    case 'GUARITA DUPLA EVENTO': case 'PCD EVENTO':
                        cargaCarretinha = 2 * quantidade; break;
                    case 'MICTÓRIO EVENTO':
                        cargaCarretinha = quantidade <= 6 ? 2 : quantidade <= 12 ? 4 : 6; break;
                    default: cargaTanque = quantidade;
                }
            }
        }

        // Recalcula tudo do zero (igual ao Flutter que chama calcularTipoDeServico no final)
        calcularTempo();
    } catch(e) {
        console.error('❌ calcularCamposPorProduto:', e);
        calcularTempo();
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// MAPA INTERATIVO — Leaflet.js + OpenStreetMap + Nominatim (100% gratuito)
// ══════════════════════════════════════════════════════════════════════════════

let _leafletMap    = null; // instância única do mapa
let _leafletMarker = null; // marcador atual

function inicializarMapa() {
    if (_leafletMap) return; // já inicializado
    const el = document.getElementById('rr-mapa-leaflet');
    if (!el || typeof L === 'undefined') return;

    _leafletMap = L.map('rr-mapa-leaflet', {
        center: [-23.5505, -46.6333], // São Paulo como centro inicial
        zoom: 11,
        zoomControl: true,
        attributionControl: true
    });

    // Tile layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(_leafletMap);

    // Clique no mapa → geocodificação reversa (lat/lng → endereço)
    _leafletMap.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        posicionarMarcador(lat, lng);
        preencherLatLng(lat, lng);
        // Geocodificação reversa via Nominatim (clique no mapa)
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`, {
                headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'AmericaRentalSistema/1.0' }
            });
            const d = await r.json();
            if (d.display_name) {
                const endInput = document.getElementById('rr-input-endereco');
                // Só preenche se o campo estiver vazio (não sobrescreve o que o usuário digitou)
                if (endInput && !endInput.value.trim()) {
                    endInput.value = d.display_name;
                    endInput.style.background = '#f0fdf4';
                }
            }
        } catch (_) {}
    });
}

function posicionarMarcador(lat, lng) {
    if (!_leafletMap) return;
    const icon = L.divIcon({
        html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
        className: '', iconAnchor: [7, 7]
    });
    if (_leafletMarker) _leafletMarker.remove();
    _leafletMarker = L.marker([lat, lng], { icon }).addTo(_leafletMap);
    _leafletMap.setView([lat, lng], 16, { animate: true });
}

function extractCoordinates(coordStr) {
    if (!coordStr) return null;
    const matches = coordStr.match(/-?\d+([.,]\d+)?/g);
    if (matches && matches.length >= 2) {
        const lat = parseFloat(matches[0].replace(',', '.'));
        const lng = parseFloat(matches[1].replace(',', '.'));
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }
    return null;
}

function preencherLatLng(lat, lng) {
    const coordInput = document.getElementById('rr-input-coord');
    if (coordInput) { 
        coordInput.value = `${lat.toFixed(7)}, ${lng.toFixed(7)}`; 
        coordInput.style.background = '#f0fdf4'; 
    }
    osState.lat = lat;
    osState.lng = lng;
}

async function reverseGeocodeEndereco() {
    const coordInput = document.getElementById('rr-input-coord');
    const endInput = document.getElementById('rr-input-endereco');
    const btn      = document.getElementById('btn-geocode-coord');
    const placeholder = document.getElementById('rr-mapa-placeholder');

    if (!coordInput?.value) { coordInput?.focus(); return; }

    // Parse lat lng
    const coords = extractCoordinates(coordInput.value);
    
    if (!coords) {
        alert("Por favor, digite coordenadas válidas separadas por espaço ou vírgula.");
        coordInput.focus();
        return;
    }

    const { lat, lng } = coords;

    if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data && data.display_name) {
            // Mostra o mapa e oculta placeholder
            if (placeholder) placeholder.style.display = 'none';
            const mapaDiv = document.getElementById('rr-mapa-leaflet');
            if (mapaDiv) mapaDiv.style.display = 'block';

            // Inicializa mapa se ainda não foi feito
            inicializarMapa();

            // Aguarda o mapa estar pronto e posiciona
            setTimeout(() => {
                if (_leafletMap) _leafletMap.invalidateSize();
                posicionarMarcador(lat, lng);
            }, 50);
            
            // Preenche o endereço
            if (endInput) {
                if (endInput.value.trim() !== '') {
                    // Modal de comparação customizado
                    document.getElementById('rr-modal-coord-confirm')?.remove();
                    const cm = document.createElement('div');
                    cm.id = 'rr-modal-coord-confirm';
                    cm.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
                    const endAtual = endInput.value;
                    const endNovo  = data.display_name;
                    cm.innerHTML = `<div style="background:white;border-radius:14px;width:560px;max-width:96vw;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                        <div style="background:#b45309;color:white;padding:1rem 1.25rem;display:flex;align-items:center;gap:10px;">
                            <i class="ph ph-warning" style="font-size:1.5rem;"></i>
                            <div>
                                <p style="margin:0;font-weight:700;font-size:0.95rem;">Substituir endereço?</p>
                                <p style="margin:0;font-size:0.72rem;opacity:0.85;">Coordenada encontrou um endereço diferente do atual</p>
                            </div>
                        </div>
                        <div style="padding:1.25rem;display:flex;flex-direction:column;gap:12px;">
                            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;">
                                <p style="margin:0 0 4px;font-size:0.68rem;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">📌 Endereço atual</p>
                                <p style="margin:0;font-size:0.85rem;color:#1e293b;font-weight:600;">${endAtual}</p>
                            </div>
                            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;">
                                <p style="margin:0 0 4px;font-size:0.68rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">📍 Endereço encontrado pela coordenada</p>
                                <p style="margin:0;font-size:0.85rem;color:#1e293b;font-weight:600;">${endNovo}</p>
                            </div>
                            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
                                <button id="btn-coord-nao" style="padding:8px 22px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;font-size:0.85rem;cursor:pointer;">Não, manter atual</button>
                                <button id="btn-coord-sim" style="padding:8px 22px;background:#2d9e5f;color:white;border:none;border-radius:6px;font-weight:600;font-size:0.85rem;cursor:pointer;">Sim, substituir</button>
                            </div>
                        </div>
                    </div>`;
                    document.body.appendChild(cm);
                    cm.querySelector('#btn-coord-sim').onclick = () => {
                        endInput.value = endNovo;
                        endInput.style.background = '#f0fdf4';
                        cm.remove();
                    };
                    cm.querySelector('#btn-coord-nao').onclick = () => cm.remove();
                    cm.addEventListener('click', e => { if (e.target === cm) cm.remove(); });
                } else {
                    endInput.value = data.display_name;
                    endInput.style.background = '#f0fdf4';
                }
            }
            
            osState.lat = lat;
            osState.lng = lng;
            if (coordInput) coordInput.style.background = '#f0fdf4';
        } else {
            alert('Não foi possível encontrar um endereço para estas coordenadas.');
        }
    } catch (e) {
        console.error('Erro no reverse geocoding', e);
        alert('Erro ao consultar endereço. Tente novamente mais tarde.');
    } finally {
        if (btn) btn.innerHTML = '<i class="ph ph-map-pin"></i>';
    }
}

async function geocodeEndereco() {
    const endInput   = document.getElementById('rr-input-endereco');
    const btn        = document.getElementById('btn-geocode-endereco');
    const placeholder = document.getElementById('rr-mapa-placeholder');

    const endereco = endInput?.value?.trim();
    if (!endereco) { endInput?.focus(); return; }

    if (btn) { btn.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 1s linear infinite;"></i>'; btn.disabled = true; }

    const headers = { 'Accept-Language': 'pt-BR', 'User-Agent': 'AmericaRentalSistema/1.0' };

    // ── Extrai partes do endereco ──────────────────────────────────────────────
    const cepMatch    = endereco.match(/\b(\d{5})-?(\d{3})\b/);
    const cep         = cepMatch ? `${cepMatch[1]}-${cepMatch[2]}` : '';
    const temCidade   = /s[ao]o paulo|guarulhos|campinas|mogi|osasco/i.test(endereco);
    const enderecoCompleto = !!cep && temCidade;

    // Numero: primeiro grupo de digitos apos virgula/espaco
    const numeroMatch  = endereco.match(/(?:,\s*|\s+)(\d+[A-Za-z]?)(?:\s*[,\-\/]|\s|$)/);
    const numeroOriginal = numeroMatch ? numeroMatch[1].trim() : '';

    // Extrai nome da rua (antes do 1o separador significativo)
    const ruaMatch = endereco.match(/^([^,\d]+?)(?:,|\s+\d)/);
    const nomRua   = ruaMatch ? ruaMatch[1].trim() : '';

    // Cidade / estado
    const cidadeMatch = endereco.match(/(?:,\s*)(S[ao]o Paulo|Guarulhos|Campinas|Osasco|[A-Z][a-zA-Z\s]+)(?:\s*[,\-\/]|$)/i);
    const cidade = cidadeMatch ? cidadeMatch[1].trim() : 'Sao Paulo';

    // ── Monta lista de queries em cascata ─────────────────────────────────────
    // Prioridade: 1) Query estruturada (rua + numero + cep) — mais precisa
    //             2) Query estruturada sem numero
    //             3) Query livre normalizada
    //             4) Busca pelo CEP puro
    //             5) Fallback com cidade
    const queries = [];

    // 1. Query ESTRUTURADA com street=numero+rua, postalcode=cep (Nominatim interpreta melhor)
    if (nomRua && numeroOriginal && cep) {
        queries.push(
            `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(numeroOriginal + ' ' + nomRua)}&city=${encodeURIComponent(cidade)}&postalcode=${encodeURIComponent(cep)}&country=Brazil&format=json&limit=5&addressdetails=1&accept-language=pt-BR`
        );
    }
    // 2. Query estruturada sem numero mas com CEP
    if (nomRua && cep) {
        queries.push(
            `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(nomRua)}&city=${encodeURIComponent(cidade)}&postalcode=${encodeURIComponent(cep)}&country=Brazil&format=json&limit=5&addressdetails=1&accept-language=pt-BR`
        );
    }
    // 3. Query estruturada rua + numero + cidade (sem CEP obrigatorio)
    if (nomRua && numeroOriginal) {
        queries.push(
            `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(numeroOriginal + ' ' + nomRua)}&city=${encodeURIComponent(cidade)}&country=Brazil&format=json&limit=5&addressdetails=1&accept-language=pt-BR`
        );
    }
    // 4. Query livre normalizada
    let enderecoQuery = endereco
        .replace(/(\d)\.(\d{3})\b/g, '$1$2')
        .replace(/\|\s*CEP[:\s-]*\d{5}-?\d{3}\b/gi, '')
        .replace(/\s*\/\s*[A-Z]{2}\b/gi, '')
        .replace(/\s*\|\s*/g, ', ')
        .replace(/\s*-\s*(?=[a-zA-Z])/g, ', ')
        .replace(/\s{2,}/g, ' ').trim();
    queries.push(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoQuery)}&format=json&limit=5&accept-language=pt-BR&countrycodes=br`);
    // 5. Busca pelo CEP puro
    if (cep) {
        queries.push(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cep + ', Brasil')}&format=json&limit=3&accept-language=pt-BR`);
    }
    // 6. Fallback com cidade adicionada
    if (!temCidade) {
        queries.push(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoQuery + ', Sao Paulo, SP, Brasil')}&format=json&limit=5&accept-language=pt-BR`);
    }

    try {
        let data = null;
        for (const url of queries) {
            const resp   = await fetch(url, { headers });
            const result = await resp.json();
            if (result && result.length > 0) { data = result; break; }
            await new Promise(r => setTimeout(r, 300));
        }

        if (!data || data.length === 0) {
            mostrarToastAviso('\u274c Endere\u00e7o n\u00e3o encontrado. Tente: "Rua X, 123, Cidade/SP" ou inclua o CEP.');
            return;
        }

        // Deduplica por CEP + rua
        const vistos = new Set();
        data = data.filter(d => {
            const cepM = d.display_name.match(/\b\d{5}[- ]?\d{3}\b/);
            const cepD = cepM ? cepM[0].replace(/\s/, '-') : '';
            const rua  = d.display_name.split(',')[0].trim().toLowerCase();
            const chave = cepD ? `${rua}||${cepD}` : `${rua}||${d.lat.substring(0,7)}||${d.lon.substring(0,7)}`;
            if (vistos.has(chave)) return false;
            vistos.add(chave); return true;
        });

        // Formata display para mostrar: Rua, Numero, Bairro, Cidade - UF, CEP
        const formatarDisplay = (d) => {
            const a = d.address || {};
            const partes = [];
            const logr = a.road || a.pedestrian || a.path || d.display_name.split(',')[0].trim();
            partes.push(logr);
            if (numeroOriginal) partes.push(numeroOriginal);
            if (a.suburb || a.neighbourhood || a.quarter) partes.push(a.suburb || a.neighbourhood || a.quarter);
            if (a.city || a.town || a.municipality) partes.push(a.city || a.town || a.municipality);
            const uf = a.state ? (a.state.length === 2 ? a.state : '') : '';
            const cepD = a.postcode || '';
            let linha = partes.join(', ');
            if (uf)  linha += ` - ${uf}`;
            if (cepD) linha += `, ${cepD}`;
            return linha || d.display_name;
        };

        const montarEnderecoComNumero = (d) => formatarDisplay(d);

        const aplicarGeoResult = (item, enderecoFinal) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (placeholder) placeholder.style.display = 'none';
            const mapaDiv = document.getElementById('rr-mapa-leaflet');
            if (mapaDiv) mapaDiv.style.display = 'block';
            inicializarMapa();
            setTimeout(() => {
                _leafletMap.invalidateSize();
                posicionarMarcador(lat, lng);
                preencherLatLng(lat, lng);
                if (endInput && enderecoFinal) endInput.value = enderecoFinal;
                if (endInput) endInput.style.background = '#f0fdf4';
                osState.enderecoConfirmado = true;
                atualizarBloqueio();
            }, 50);
        };

        if (!enderecoCompleto && data.length > 1) {
            document.getElementById('rr-modal-geo-select')?.remove();
            const geoModal = document.createElement('div');
            geoModal.id = 'rr-modal-geo-select';
            geoModal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
            const itens = data.map((d, idx) => {
                const endFinal = montarEnderecoComNumero(d);
                const parts = endFinal.split(',');
                const titulo = parts.slice(0,2).join(',').trim();
                const detalhe = parts.slice(2).join(',').trim();
                return `<div onclick="window._geoSelect(${idx})" style="cursor:pointer;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;background:#f8fafc;transition:background 0.15s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#f8fafc'">
                    <div style="font-weight:600;color:#1e293b;font-size:0.85rem;">&#128205; ${titulo}</div>
                    <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">${detalhe}</div>
                </div>`;
            }).join('');
            geoModal.innerHTML = `<div style="background:white;border-radius:12px;width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,0.25);overflow:hidden;">
                <div style="background:#0369a1;color:white;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div>
                        <p style="margin:0;font-weight:700;font-size:0.95rem;">&#128506;&#65039; Múltiplos endereços encontrados</p>
                        <p style="margin:0;font-size:0.72rem;opacity:0.85;">Clique no endereço correto para confirmar</p>
                    </div>
                    <button onclick="document.getElementById('rr-modal-geo-select').remove()" style="background:transparent;border:none;color:white;font-size:1.3rem;cursor:pointer;">\u2715</button>
                </div>
                <div style="padding:1rem;overflow-y:auto;flex:1;">${itens}</div>
            </div>`;
            document.body.appendChild(geoModal);
            geoModal.addEventListener('click', e => { if (e.target === geoModal) geoModal.remove(); });
            window._geoSelect = (idx) => { geoModal.remove(); aplicarGeoResult(data[idx], montarEnderecoComNumero(data[idx])); };
        } else {
            aplicarGeoResult(data[0], montarEnderecoComNumero(data[0]));
        }

    } catch (err) {
        console.error('[Nominatim]', err);
        mostrarToastAviso('\u274c Erro ao buscar endereço. Verifique sua conexão.');
    } finally {
        if (btn) { btn.innerHTML = '<i class="ph ph-magnifying-glass"></i>'; btn.disabled = false; }
    }
}

// ── MODAL GOOGLE MAPS ─────────────────────────────────────────────────────────
function colarUrlGoogleMaps() {
      const endereco = document.getElementById('rr-input-endereco')?.value?.trim();
      if (!endereco) {
          mostrarToastAviso('Preencha o campo de endereço antes de clicar no botão do Google Maps.');
          document.getElementById('rr-input-endereco')?.focus();
          return;
      }
    // Abre Google Maps em nova aba com o endereço atual
    const mapsUrl = 'https://www.google.com/maps/search/' + encodeURIComponent(endereco || 'São Paulo, Brasil');
    window.open(mapsUrl, '_blank');
    // Reutiliza o popup centralizado de lat/lng
    _abrirPopupCoordenadas(mapsUrl);
}


window._aplicarUrlGoogleMaps = function() {
    let lat = null, lng = null;

    // Tenta primeiro o campo de lat/lng direto
    const coordRaw = document.getElementById('rr-gmaps-coord-input')?.value?.trim();
    if (coordRaw) {
        const m = coordRaw.match(/(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)/);
        if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
    }

    // Se não encontrou, tenta a URL
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const url = document.getElementById('rr-gmaps-url-input')?.value?.trim();
        if (url) {
            const patterns = [
                /@(-?\d+\.\d+),(-?\d+\.\d+)/,
                /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
                /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
                /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
                /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
            ];
            for (const pat of patterns) {
                const m = url.match(pat);
                if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); break; }
            }
        }
    }

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        mostrarToastAviso('\u274c N\u00e3o foi poss\u00edvel extrair coordenadas. Use a URL completa do Google Maps ou informe Lat, Lng diretamente.');
        return;
    }

    document.getElementById('rr-gmaps-modal')?.remove();
    const placeholder = document.getElementById('rr-mapa-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    const mapaDiv = document.getElementById('rr-mapa-leaflet');
    if (mapaDiv) mapaDiv.style.display = 'block';
    inicializarMapa();
    setTimeout(() => {
        _leafletMap.invalidateSize();
        posicionarMarcador(lat, lng);
        preencherLatLng(lat, lng);
        // Coordenadas confirmadas via Google Maps: desbloqueia a tela diretamente
        osState.coordenadasConfirmadas = true;
        osState.enderecoConfirmado = true;
        atualizarBloqueio();
    }, 50);
    mostrarToastAviso('\u2705 Coordenadas aplicadas! O formulário foi desbloqueado.');
};

function mostrarToastAviso(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:0.75rem 1rem;border-radius:8px;font-size:0.78rem;max-width:380px;box-shadow:0 4px 12px rgba(0,0,0,0.15);line-height:1.5;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 9000);
}

// Atualiza o badge de link do Google Maps ao lado do label Endereço
function atualizarLinkMapsBadge(url) {
    const badge = document.getElementById('rr-link-maps-badge');
    if (!badge) return;
    if (!url) {
        badge.style.display = 'none';
        badge.innerHTML = '';
        return;
    }
    const urlCurta = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    // Guarda a URL no estado global para uso no modal de coordenadas
    osState.linkGoogleMaps = url;

    badge.style.display = 'inline-flex';
    badge.innerHTML = `<i class="ph ph-map-pin" style="font-size:0.85rem;"></i>
        <a href="${url}" target="_blank" style="color:#f97316;text-decoration:none;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${url}">${urlCurta}</a>
        <button id="btn-abrir-link-maps" title="Abrir no Maps e informar coordenadas" style="background:none;border:none;cursor:pointer;padding:0 2px;color:#f97316;display:flex;align-items:center;">
            <i class="ph ph-arrow-square-out" style="font-size:0.9rem;"></i>
        </button>`;

    // Ao clicar no botão de abrir: abre o Maps e mostra o popup de lat/lng (igual ao botão G)
    badge.querySelector('#btn-abrir-link-maps')?.addEventListener('click', () => {
        window.open(url, '_blank');
        // Reutiliza exatamente o mesmo modal do botão G
        _abrirPopupCoordenadas(url);
    });
}

// ── UPLOAD DE VÍDEO ──────────────────────────────────────────────────────────
// Armazena tanto o link longo (interno) quanto o link curto (para compartilhar)
function rrExibirLinkVideo(linkLongo, linkCurto) {
    const hidden  = document.getElementById('rr-input-video');
    const display = document.getElementById('rr-video-link-display');
    const anchor  = document.getElementById('rr-video-link-anchor');
    if (!hidden) return;
    if (!linkLongo) {
        hidden.value = '';
        if (display) { display.style.display = 'none'; }
        return;
    }
    hidden.value = linkLongo;
    // short_link fica em data-short para o botão de copia
    if (display) display.dataset.shortLink = linkCurto || linkLongo;
    if (display && anchor) {
        const fullShort = (linkCurto || linkLongo).startsWith('http')
            ? (linkCurto || linkLongo)
            : window.location.origin + (linkCurto || linkLongo);
        anchor.href  = fullShort;
        anchor.textContent = '📸 Vídeo do local';
        anchor.title = fullShort;
        display.style.display = 'inline-flex';
    }
}

async function rrFazerUploadVideo(input) {
    const file = input.files[0];
    if (!file) return;
    const progress = document.getElementById('rr-video-upload-progress');
    const btn = document.getElementById('btn-upload-video-os');
    if (progress) { progress.style.display = 'inline'; progress.textContent = '⏳ Enviando...'; }
    if (btn) btn.disabled = true;

    const osId = document.getElementById('rr-input-os')?.value?.trim() || '';
    const formData = new FormData();
    formData.append('video', file);
    formData.append('numero_os', osId);

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        const resp = await fetch('/api/logistica/os/upload-video', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || 'Erro no upload');
        // Usa o link curto (/v/abc123) se disponível, senão o longo
        rrExibirLinkVideo(json.link, json.short_link || json.link);
        mostrarToastAviso('✅ Vídeo enviado! Link curto pronto para copiar.');
        if (progress) progress.style.display = 'none';
    } catch(e) {
        mostrarToastAviso('❌ Erro ao enviar vídeo: ' + e.message);
        if (progress) { progress.style.display = 'inline'; progress.textContent = '❌ Falha no envio.'; }
    } finally {
        if (btn) btn.disabled = false;
        input.value = '';
    }
}

function rrAbrirLinkVideo() {
    const display = document.getElementById('rr-video-link-display');
    const hidden  = document.getElementById('rr-input-video');
    const linkParaCopiar = display?.dataset.shortLink || hidden?.value || '';
    if (!linkParaCopiar) return;
    
    let links = [];
    try { links = JSON.parse(linkParaCopiar); }
    catch(e) { links = linkParaCopiar.split(',').filter(Boolean); }
    if (!Array.isArray(links)) links = [links];
    
    links.forEach(l => {
        const fullLink = l.startsWith('http') ? l : window.location.origin + l;
        window.open(fullLink, '_blank');
    });
}

async function rrExcluirLinkVideo() {
    if (!confirm('Deseja excluir o vídeo desta OS? Esta ação não pode ser desfeita.')) return;
    const osNum = document.getElementById('rr-input-os')?.value?.trim() || '';
    if (!osNum) { mostrarToastAviso('Salve a OS antes de excluir o vídeo.'); return; }
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    try {
        const resp = await fetch(`/api/logistica/os/${encodeURIComponent(osNum)}/link-video`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error((await resp.json()).error || 'Erro ao excluir vídeo');
        // Limpa UI
        const hidden  = document.getElementById('rr-input-video');
        const display = document.getElementById('rr-video-link-display');
        if (hidden)  hidden.value = '';
        if (display) display.style.display = 'none';
        mostrarToastAviso('✅ Vídeo excluído com sucesso!');
    } catch(e) {
        mostrarToastAviso('❌ Erro ao excluir vídeo: ' + e.message);
    }
}

function _abrirPopupCoordenadas(urlOrigem) {
    document.getElementById('rr-gmaps-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'rr-gmaps-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:12px;width:380px;max-width:95vw;box-shadow:0 16px 48px rgba(0,0,0,0.28);overflow:hidden;">
            <div style="background:#15803d;color:white;padding:0.9rem 1.2rem;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700;font-size:0.95rem;">&#127758; Google Maps aberto</div>
                    <div style="font-size:0.72rem;opacity:0.85;margin-top:2px;">Confirme o pin correto e cole as coordenadas abaixo</div>
                </div>
                <button onclick="document.getElementById('rr-gmaps-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">&#10005;</button>
            </div>
            <div style="padding:1.2rem;">
                <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:6px;">&#128205; Latitude, Longitude</label>
                <input id="rr-gmaps-coord-input" type="text" placeholder="Ex: -23.5236807, -46.7391688"
                    style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;margin-bottom:0.3rem;"
                    onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#cbd5e1'"
                    onkeydown="if(event.key==='Enter') _aplicarUrlGoogleMaps()">
                <div style="font-size:0.68rem;color:#6b7280;margin-bottom:1rem;">Cole as coordenadas do Google Maps. Ex: <strong>-23.5236807, -46.7391688</strong></div>
                <input id="rr-gmaps-url-input" type="hidden">
                <button onclick="_aplicarUrlGoogleMaps()" style="width:100%;background:#15803d;color:white;border:none;border-radius:7px;padding:9px;font-size:0.85rem;font-weight:700;cursor:pointer;transition:background 0.15s;"
                    onmouseover="this.style.background='#166534'" onmouseout="this.style.background='#15803d'">&#10003; Aplicar coordenadas no mapa</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    setTimeout(() => document.getElementById('rr-gmaps-coord-input')?.focus(), 150);
}


function exibirModalSucessoOS(osId, payload) {
    document.getElementById('rr-modal-sucesso-os')?.remove();

    const diasStr = (payload.dias_semana || []).join(', ') || '—';
    const prodStr = (payload.produtos || []).length > 0
        ? payload.produtos.map(p => `${p.qtd}x ${p.desc}`).join(', ')
        : '—';
    const imgIcon = payload.tipo_os === 'Obra' ? 'assets/obra.png' : payload.tipo_os === 'Evento' ? 'assets/evento.png' : '';
    const iconHtml = imgIcon ? `<img src="${imgIcon}" style="height:28px; object-fit:contain;" alt="${payload.tipo_os}">` : `<span style="font-size:1.3rem;">📋</span>`;

    const modal = document.createElement('div');
    modal.id = 'rr-modal-sucesso-os';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:14px;width:500px;max-width:95vw;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.25);">
            <!-- Cabeçalho verde -->
            <div style="background:linear-gradient(135deg,#2d9e5f,#1a7a40);color:white;padding:1.25rem 1.5rem;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-check-circle" style="font-size:1.8rem;"></i>
                    <div>
                        <p style="margin:0;font-size:0.72rem;opacity:0.8;">Ordem de Serviço salva com sucesso</p>
                        <p style="margin:0;font-weight:800;font-size:1.1rem;">OS #${osId} gerada!</p>
                    </div>
                </div>
                <button id="btn-fechar-sucesso-os" style="background:transparent;border:none;color:white;font-size:1.2rem;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <!-- Corpo -->
            <div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.6rem;">
                <div style="display:flex;gap:8px;align-items:center;background:#f0fdf4;border-radius:8px;padding:0.6rem 0.8rem;">
                    ${iconHtml}
                    <div>
                        <p style="margin:0;font-size:0.68rem;color:#64748b;">Cliente · ${payload.tipo_os}</p>
                        <p style="margin:0;font-weight:700;font-size:0.9rem;color:#1e293b;">${payload.cliente}</p>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.75rem;">
                    <div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;">
                        <p style="margin:0;color:#64748b;font-size:0.65rem;">Endereço</p>
                        <p style="margin:0;font-weight:600;color:#334155;">${payload.endereco || '—'}</p>
                    </div>
                    <div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;">
                        <p style="margin:0;color:#64748b;font-size:0.65rem;">Serviço</p>
                        <p style="margin:0;font-weight:600;color:#334155;">${payload.tipo_servico || '—'}</p>
                    </div>
                    <div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;">
                        <p style="margin:0;color:#64748b;font-size:0.65rem;">Turno · Horário</p>
                        <p style="margin:0;font-weight:600;color:#334155;">${payload.turno} · ${payload.hora_inicio} às ${payload.hora_fim}</p>
                    </div>
                    <div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;">
                        <p style="margin:0;color:#64748b;font-size:0.65rem;">Dias da Semana</p>
                        <p style="margin:0;font-weight:600;color:#334155;">${diasStr}</p>
                    </div>
                    <div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;grid-column:1/-1;">
                        <p style="margin:0;color:#64748b;font-size:0.65rem;">Produtos / Equipamentos</p>
                        <p style="margin:0;font-weight:600;color:#334155;">${prodStr}</p>
                    </div>
                </div>
            </div>
            <!-- Rodapé -->
            <div style="display:flex;gap:8px;justify-content:flex-end;padding:0.75rem 1.5rem;background:#f8fafc;">
                <button id="btn-duplicar-os-sim" style="background:#8b5cf6;color:white;border:none;border-radius:6px;padding:6px 18px;font-size:0.78rem;font-weight:700;cursor:pointer;"><i class="ph ph-copy"></i> Duplicar</button>
                
                <button id="btn-fechar-sucesso-os-2" style="background:#e2e8f0;color:#334155;border:none;border-radius:6px;padding:6px 18px;font-size:0.78rem;font-weight:600;cursor:pointer;">Fechar</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    const fecharSomenteModal = () => modal.remove();
    
    const limparEFechar = () => {
        fecharSomenteModal();
        osState.produtos = []; 
        osState.tiposServico = new Set();
        osState.acoes = new Set(); 
        osState.clienteConfirmado = true;
        osState.clienteNome = ''; 
        osState.enderecoSelecionado = ''; 
        osState.tipoOs = '';
        osState.modoDuplicado = false;
        
        const c = document.getElementById('rota-redonda-container');
        if (c) c.innerHTML = '';
        renderRotaRedonda();
    };

    modal.querySelector('#btn-fechar-sucesso-os')?.addEventListener('click', limparEFechar);
    modal.querySelector('#btn-fechar-sucesso-os-2')?.addEventListener('click', limparEFechar);
    modal.addEventListener('click', e => { if (e.target === modal) limparEFechar(); });

    // Duplicar: carrega tudo de volta EXCETO data e tipo_servico
    modal.querySelector('#btn-duplicar-os-sim')?.addEventListener('click', () => {
        fecharSomenteModal();
        duplicarOsNaTela(payload);
    });
}

// ── DUPLICAR OS NA TELA: carrega payload mas limpa Data e Tipo de Serviço ──
function duplicarOsNaTela(payload) {
    // Preserva produtos e tipo de OS no state
    osState.tipoOs = payload.tipo_os || '';
    osState.produtos = (payload.produtos || []).map(p => ({ ...p, id: Date.now() + Math.random() }));
    osState.tiposServico = new Set(); // Limpa o tipo de serviço
    const vars = Array.isArray(payload.variaveis) ? payload.variaveis : (typeof payload.variaveis === 'string' ? JSON.parse(payload.variaveis || '[]') : []);
    osState.acoes = new Set(vars); // Preserva ações/variáveis atreladas ao serviço
    osState.clienteConfirmado = true;
    osState.clienteNome = payload.cliente || '';
    osState.enderecoSelecionado = payload.endereco || '';
    osState.modoDuplicado = true;
    osState.agendaVerificada = false; // reativa a trava da agenda

    // Re-renderiza a tela
    const c = document.getElementById('rota-redonda-container');
    if (c) c.innerHTML = '';
    renderRotaRedonda();

    // Aguarda render e preenche os campos
    setTimeout(() => {
        const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };

        // OS — mantém o mesmo número
        set('rr-input-os', payload.numero_os);
        // Cliente — mantém
        const clienteEl = document.getElementById('rr-input-cliente');
        if (clienteEl) { clienteEl.value = payload.cliente || ''; clienteEl.dataset.nomeBase = ''; }
        // Endereço — mantém
        set('rr-input-endereco', payload.endereco);
        set('rr-input-complemento', payload.complemento);
        // Coordenadas — mantém
        if (payload.lat && payload.lng) set('rr-input-coord', `${payload.lat}, ${payload.lng}`);
        // Contrato — mantém
        if (payload.contrato) {
            const contEl = document.getElementById('rr-input-contrato');
            if (contEl) contEl.value = payload.contrato;
        }
        // Data — LIMPA (não preenche)
        const dataEl = document.getElementById('rr-input-data');
        if (dataEl) dataEl.value = '';
        // Responsável, telefone, email — mantém
        set('rr-input-responsavel', payload.responsavel);
        set('rr-input-sms', payload.telefone);
        set('rr-input-email', payload.email);
        // Obs / vídeo — mantém
        set('rr-input-obs', payload.observacoes);
        rrExibirLinkVideo(payload.link_video || '');
        // Turno e horário — mantém
        const diurno = document.getElementById('rr-chk-diurno');
        const noturno = document.getElementById('rr-chk-noturno');
        if (payload.turno === 'Diurno' && diurno) { diurno.checked = true; if (noturno) noturno.checked = false; }
        if (payload.turno === 'Noturno' && noturno) { noturno.checked = true; if (diurno) diurno.checked = false; }
        set('rr-input-hora-inicio', payload.hora_inicio);
        set('rr-input-hora-fim', payload.hora_fim);
        // Dias da semana — LIMPA (para o usuário selecionar os dias do novo ciclo)
        const diasMap = { 'Seg': 'rr-chk-seg', 'Ter': 'rr-chk-ter', 'Qua': 'rr-chk-qua', 'Qui': 'rr-chk-qui', 'Sex': 'rr-chk-sex', 'Sáb': 'rr-chk-sab', 'Dom': 'rr-chk-dom' };
        Object.entries(diasMap).forEach(([d, id]) => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
        // Tipo de serviço — LIMPA
        const tipoServEl = document.getElementById('rr-tipo-servico');
          if (tipoServEl) tipoServEl.value = '';
          const tipoServSearch = document.getElementById('rr-tipo-servico-search');
          if (tipoServSearch) tipoServSearch.value = '';
        // Atualiza UI (produtos, tipo OS, ícones)
        atualizarDropdownProdutos();
        atualizarIconesCliente();
        atualizarUI();
        // Toast confirmando
        mostrarToastAviso('✅ OS duplicada! Preencha o novo Tipo de Serviço e a Data antes de gerar.');
    }, 150);
}



async function buscarAgendaEndereco() {
    const endInput = document.getElementById('rr-input-endereco');
    const coordInput = document.getElementById('rr-input-coord');
    const btn = document.getElementById('btn-agenda-endereco');

    const endereco = endInput?.value?.trim();
    if (!endereco) { mostrarToastAviso('Preencha o campo de Endereço antes de verificar a agenda.'); return; }

    const params = new URLSearchParams({ endereco });
    if (coordInput?.value) {
        const coords = extractCoordinates(coordInput.value);
        if (coords) {
            params.set('lat', coords.lat);
            params.set('lng', coords.lng);
        }
    }

    if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch(`/api/logistica/os/agenda-endereco?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        exibirModalAgendaEndereco(data, endereco);

        const contSug = document.getElementById('rr-sugestoes-dias-container');
        if (contSug) {
            contSug.style.display = 'block';
            if (data.dias_sugeridos_2km && data.dias_sugeridos_2km.length > 0) {
                const dias = data.dias_sugeridos_2km.map(d => d.dia).join(', ');
                contSug.innerHTML = `<span style="color:#1d4ed8;font-size:0.65rem;font-weight:600;"><i class="ph ph-check-circle"></i> Sugeridos (≤1km): <b>${dias}</b></span>`;
            } else if (data.dias_sugeridos_5km && data.dias_sugeridos_5km.length > 0) {
                const dias = data.dias_sugeridos_5km.map(d => d.dia).join(', ');
                contSug.innerHTML = `<span style="color:#b45309;font-size:0.65rem;font-weight:600;"><i class="ph ph-warning"></i> Sugeridos (1-3km): <b>${dias}</b></span>`;
            } else {
                contSug.style.display = 'none';
                contSug.innerHTML = '';
            }
        }
    } catch(e) {
        console.error('[Agenda Endereço]', e);
        mostrarToastAviso('Erro ao buscar agenda. Tente novamente.');
    } finally {
        if (btn) btn.innerHTML = '<i class="ph ph-calendar-check"></i>';
    }
}

// ── CARREGAR OS PELO NÚMERO (Enter no campo OS) ──────────────────────────────
async function carregarOsPorNumero(numOs) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const btn = document.getElementById('rr-input-os');
    if (btn) btn.style.background = '#fef3c7';

    try {
        const resp = await fetch(`/api/logistica/os/buscar?numero_os=${encodeURIComponent(numOs)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            if (resp.status === 404) {
                  // Nenhuma OS com esse número
                  btn.style.background = '';
                  const btnPlus = document.getElementById('btn-add-os-tipo');
                  if (btnPlus) {
                      btnPlus.click();
                  } else {
                      mostrarToastAviso(`OS "${numOs}" não encontrada. Preencha os campos para criar uma nova.`);
                  }
                  return;
              }
            throw new Error(`HTTP ${resp.status}`);
        }
        const registros = await resp.json(); // array de OS com esse número
        if (!registros || registros.length === 0) {
            btn.style.background = '';
            if (numOs) mostrarToastAviso(`OS "${numOs}" não encontrada. Preencha os campos para criar uma nova.`);
            else mostrarToastAviso(`Nenhuma visita cadastrada no sistema.`);
            return;
        }

        if (registros.length === 1 && numOs) {
            // Se só tem 1 e buscou específica, carrega direto
            carregarRegistroNaTela(registros[0]);
            mostrarToastAviso(`✅ OS "${numOs}" carregada.`);
        } else {
            // Mais de 1, abre o modal
            btn.style.background = '#f0fdf4';
            abrirModalListaOS(numOs || 'Todas as Visitas', registros);
        }
    } catch(e) {
        console.error('[Carregar OS]', e);
        mostrarToastAviso('Erro ao buscar OS. Verifique a conexão.');
        if (btn) btn.style.background = '';
    }
}

// ── MODAL COM LISTA DE SERVIÇOS DA OS ─────────────────────────────────────────
function abrirModalListaOS(numOs, registros) {
    document.getElementById('rr-modal-lista-os')?.remove();

    const tbody = registros.map(r => {
        let prod = '—'; let prodData = '';
        try {
            const parsedProd = JSON.parse(r.produtos);
            if (Array.isArray(parsedProd) && parsedProd.length > 0) {
                prodData = parsedProd.map(p => (p.desc||'').toLowerCase()).join(' | ');
                prod = parsedProd.map(p => {
                    const prodInfo = EQUIPAMENTOS_DICT[p.desc.trim()];
                    const icone = prodInfo?.icone ? `${prodInfo.icone} ` : '';
                    return `<span style="background:#1e40af;color:white;padding:2px 6px;border-radius:12px;margin-right:4px;display:inline-block;white-space:nowrap;margin-bottom:2px;">${icone}${p.desc} (${p.qtd})</span>`;
                }).join('');
            }
        } catch(e) {}

        const colorMap = { 'Seg':'#ef4444', 'Ter':'#f97316', 'Qua':'#ca8a04', 'Qui':'#16a34a', 'Sex':'#3b82f6', 'Sáb':'#8b5cf6', 'Dom':'#ec4899' };
        // Dias da semana só aparecem em tipos recorrentes: manutenção (obra/evento) e manutenção avulsa (obra/evento)
        const tServUp = (r.tipo_servico || '').toUpperCase();
        const isRecorrente = (tServUp.includes('MANUTEN') || tServUp.includes('VAC'));
        let dSemana = '—';
        if (isRecorrente) {
            try { dSemana = JSON.parse(r.dias_semana).map(d => `<span style="background:${colorMap[d]||'#2563eb'};color:white;padding:2px 6px;border-radius:4px;margin-right:4px;">${d}</span>`).join('') || '—'; } catch(e) {}
        }

        let hab = '—';
        try { 
            const h = JSON.parse(r.habilidades);
            if(h && h.length) hab = h.join(', ');
        } catch(e) { if(r.habilidades) hab = r.habilidades; }

        let varis = '—';
        try { 
            const v = JSON.parse(r.variaveis);
            if(v && v.length) varis = v.join(', ');
        } catch(e) { if(r.variaveis) varis = r.variaveis; }

        const dataFormatada = r.data_os ? r.data_os.split('-').reverse().join('/') : '—';
          
          let bgColor = 'transparent';
          let hoverColor = '#f1f5f9';
          const tServ = (r.tipo_servico || '').toUpperCase();
          if (tServ.includes('ENTREGA')) { bgColor = '#bbf7d0'; hoverColor = '#86efac'; }
          else if (tServ.includes('RETIRADA')) { bgColor = '#fef9c3'; hoverColor = '#fef08a'; }
          else if (tServ.includes('LIMPA FOSSA')) { bgColor = '#bfdbfe'; hoverColor = '#93c5fd'; }
          else if ((tServ.includes('MANUTEN') || tServ.includes('VAC')) && !tServ.includes('AVULSA')) { bgColor = '#e2e8f0'; hoverColor = '#cbd5e1'; }
          else { bgColor = '#ffffff'; hoverColor = '#f8fafc'; }
          
          return `
              <tr class="rr-os-row" data-cliente="${(r.cliente||'').toLowerCase()}" data-endereco="${(r.endereco||'').toLowerCase()}" data-tipo="${(r.tipo_servico||'').toLowerCase()}" data-data="${r.data_os||''}" data-produto="${prodData}" style="border-bottom:1px solid #e2e8f0; background:${bgColor}; transition:background 0.2s;" onmouseover="this.style.background='${hoverColor}'" onmouseout="this.style.background='${bgColor}'">
                <td style="padding:0.75rem 0.5rem;white-space:nowrap;">${r.numero_os}</td>
                <td style="padding:0.75rem 0.5rem;font-weight:600;cursor:pointer;" onclick='window._carregarRegistroNaTela(${JSON.stringify(r)})'>${r.cliente}</td>
                <td style="padding:0.75rem 0.5rem;">${r.endereco}</td>
                <td style="padding:0.75rem 0.5rem;">${r.tipo_servico || '—'}</td>
                <td style="padding:0.75rem 0.5rem;">${dataFormatada}</td>
                <td style="padding:0.75rem 0.5rem;">${dSemana}</td>
                <td style="padding:0.75rem 0.5rem;">${hab}</td>
                <td style="padding:0.75rem 0.5rem;">${varis}</td>
                <td style="padding:0.75rem 0.5rem;">${prod}</td>
                <td style="padding:0.75rem 0.5rem;white-space:nowrap;">
                    <button style="background:transparent;border:none;cursor:pointer;padding:4px;" onclick='window._carregarRegistroNaTela(${JSON.stringify(r)})' title="Editar"><i class="ph ph-pencil-simple" style="color:#f59e0b;font-size:1.2rem;"></i></button>
                    <button style="background:transparent;border:none;cursor:pointer;padding:4px;" onclick='window._excluirOsLista(${r.id})' title="Excluir"><i class="ph ph-trash" style="color:#ef4444;font-size:1.2rem;"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'rr-modal-lista-os';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;width:100vw;height:100vh;max-width:100vw;max-height:100vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:none;">
            <div style="background:#475569;color:white;padding:1.25rem 1.5rem;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h3 style="margin:0;font-size:1.2rem;font-weight:700;">Resultados da Busca</h3>
                    <p style="margin:0;font-size:0.8rem;opacity:0.9;">Serviços vinculados à busca "${numOs}". Clique no botão Editar para carregar as informações.</p>
                </div>
                <button id="btn-fechar-modal-lista-os" style="background:transparent;border:none;color:white;font-size:1.5rem;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <!-- Filtros -->
            <div style="padding:0.6rem 1.5rem; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <input type="text" id="rr-filter-cliente" placeholder="🔍 Cliente..." style="flex:1; min-width:120px; padding:7px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem; outline:none;">
                <input type="text" id="rr-filter-endereco" placeholder="🔍 Endereço..." style="flex:1; min-width:120px; padding:7px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem; outline:none;">
                <input type="text" id="rr-filter-tipo" placeholder="🔍 Tipo de Serviço..." style="flex:1; min-width:140px; padding:7px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem; outline:none;">
                <input type="date" id="rr-filter-data" style="padding:7px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem; outline:none;" title="Filtrar por data">
                <select id="rr-filter-produto" style="flex:1; min-width:120px; padding:7px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem; outline:none;"><option value="">🔍 Produto...</option></select>
                <button onclick="['rr-filter-cliente','rr-filter-endereco','rr-filter-tipo','rr-filter-data','rr-filter-produto'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.querySelectorAll('.rr-os-row').forEach(r=>r.style.display='');" style="padding:7px 12px; background:#64748b; color:white; border:none; border-radius:4px; font-size:0.78rem; cursor:pointer; white-space:nowrap;">✖ Limpar Filtros</button>
                <div style="flex-grow:1;"></div>
                <button onclick="if(confirm('🚨 CUIDADO: Isso apagará DEFINITIVAMENTE todas as OS (tabela os_logistica) e vídeos de teste do sistema! Nenhuma outra informação será apagada.\\n\\nTem certeza que deseja APAGAR TUDO?')) { fetch('/api/limpar-os-teste').then(r=>r.json()).then(d => { alert('✅ ' + d.message); document.getElementById('rr-modal-lista-os')?.remove(); document.getElementById('btn-buscar-os')?.click(); }).catch(e => alert('Erro ao apagar OS: ' + e.message)); }" style="padding:7px 12px; background:#dc2626; color:white; border:none; border-radius:4px; font-size:0.78rem; font-weight:700; cursor:pointer; white-space:nowrap; display:none; align-items:center; gap:4px;"><i class="ph ph-trash"></i> Apagar Tudo (Testes)</button>
            </div>
            <div style="overflow-y:auto;padding:1rem;flex:1;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;text-align:left;">
                    <thead>
                        <tr style="background:#2d9e5f;color:white;">
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Número OS</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Cliente</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Endereço</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Tipo Serviço</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Data</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Dias da Semana</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Habilidades</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Variáveis</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;">Produtos Logística</th>
                            <th style="padding:0.75rem 0.5rem;font-weight:600;width:80px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        </div>`;
    
    document.body.appendChild(modal);
    modal.querySelector('#btn-fechar-modal-lista-os')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Populate product dropdown
    const prodSelMain = document.getElementById('rr-filter-produto');
    if (prodSelMain) {
        const allProdsMain = new Set();
        registros.forEach(r => {
            try { const pp = JSON.parse(r.produtos); if(Array.isArray(pp)) pp.forEach(p => { if(p.desc) allProdsMain.add(p.desc); }); } catch(e) {}
        });
        allProdsMain.forEach(nome => {
            const info = typeof EQUIPAMENTOS_DICT !== 'undefined' ? EQUIPAMENTOS_DICT[nome?.trim()] : null;
            const ic = info?.icone ? info.icone + ' ' : '';
            const opt = document.createElement('option');
            opt.value = nome.toLowerCase();
            opt.textContent = ic + nome;
            prodSelMain.appendChild(opt);
        });
    }

    // Double-click on row loads the OS
    modal.querySelectorAll('.rr-os-row td:nth-child(2)').forEach(td => {
        td.style.cursor = 'pointer';
        td.title = 'Duplo clique para carregar esta OS';
        td.addEventListener('dblclick', () => {
            const row = td.closest('tr');
            if (!row) return;
            const rIdx = parseInt(row.dataset.idx || '-1');
            if (rIdx >= 0 && registros[rIdx]) window._carregarRegistroNaTela(registros[rIdx]);
        });
    });


    window._excluirOsLista = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) return;
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            const resp = await fetch(`/api/logistica/os/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(txt || 'Erro ao excluir');
            }
            if (typeof showToast === 'function') showToast('OS excluída com sucesso!', 'success');
            modal.remove(); // Fecha o modal e obriga recarregar se buscar de novo
        } catch (e) {
            console.error(e);
            alert(`Erro ao excluir OS: ${e.message}`);
        }
    };

    // Lógica de Filtro

    const filterData = () => {
        const fCli  = (document.getElementById('rr-filter-cliente')?.value  || '').toLowerCase();
        const fEnd  = (document.getElementById('rr-filter-endereco')?.value || '').toLowerCase();
        const fTipo = (document.getElementById('rr-filter-tipo')?.value     || '').toLowerCase();
        const fData = (document.getElementById('rr-filter-data')?.value     || '');
        const fProd = (document.getElementById('rr-filter-produto')?.value  || '').toLowerCase();
        document.querySelectorAll('.rr-os-row').forEach(row => {
            const ok = (row.dataset.cliente  || '').includes(fCli)
                    && (row.dataset.endereco || '').includes(fEnd)
                    && (row.dataset.tipo     || '').includes(fTipo)
                    && (!fData || (row.dataset.data || '') === fData)
                    && (!fProd || (row.dataset.produto || '').includes(fProd));
            row.style.display = ok ? '' : 'none';
        });
    };
    ['rr-filter-cliente','rr-filter-endereco','rr-filter-tipo'].forEach(id => document.getElementById(id)?.addEventListener('input', filterData));
    ['rr-filter-data','rr-filter-produto'].forEach(id => document.getElementById(id)?.addEventListener('change', filterData));
}

function parseJsonFront(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;          // já é array (vindo do pipeline por ID)
    try { return JSON.parse(val); } catch { return typeof val === 'string' ? [val] : []; }
}

window._carregarRegistroNaTela = function(os) {
    // Fecha qualquer modal de lista/pesquisa aberto
    document.getElementById('rr-modal-lista-os')?.remove();
    document.getElementById('rr-modal-os-cliente')?.remove();
    carregarRegistroNaTela(os);
    mostrarToastAviso(`✅ Serviço carregado.`);
};

function carregarRegistroNaTela(os) {
    osState.loadedId = os.id;
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };

    // Número da OS e Contrato (campos críticos que faltavam)
    set('rr-input-os',       os.numero_os);
    set('rr-input-contrato', os.contrato || '');

    set('rr-input-cliente', os.cliente);
    set('rr-input-patrimonio', os.patrimonio);
    if (document.getElementById('rr-input-cliente')) {
        document.getElementById('rr-input-cliente').dataset.nomeBase = '';
    }
    set('rr-input-endereco', os.endereco);
    set('rr-input-complemento', os.complemento);
    set('rr-input-responsavel', os.responsavel);
    set('rr-input-sms', os.telefone);
    set('rr-input-email', os.email);
    set('rr-input-obs', os.observacoes);
    set('rr-input-obs-internas', os.observacoes_internas);
    set('rr-input-video', os.link_video);
    rrExibirLinkVideo(os.link_video || '');
    set('rr-tipo-servico', os.tipo_servico);
    const tsSearch = document.getElementById('rr-tipo-servico-search');
    if (tsSearch && os.tipo_servico) tsSearch.value = os.tipo_servico;

    // Data intencionalmente não preenchida ao abrir OS existente (usuário deve informar a data do atendimento)
    const dataEl = document.getElementById('rr-input-data');
    if (dataEl) dataEl.value = '';

    if (os.lat && os.lng) set('rr-input-coord', `${os.lat}, ${os.lng}`);

    // Garante osState completo ANTES de qualquer chamada que trave campos (atualizarBloqueio)
    osState.tipoOs = '';
    const _to = (os.tipo_os || '').toUpperCase();
    const _ts = (os.tipo_servico || '').toUpperCase();
    if (_to.includes('OBRA') || _ts.includes('OBRA')) osState.tipoOs = 'Obra';
    else if (_to.includes('EVENTO') || _ts.includes('EVENTO')) osState.tipoOs = 'Evento';
    
    osState.clienteNome          = os.cliente  || '';
    osState.clienteConfirmado    = true;
    osState.enderecoSelecionado  = os.endereco || '';
    osState.enderecoConfirmado   = true;
    osState.enderecoObrigatorio  = false;
    osState.produtos             = parseJsonFront(os.produtos).map(p => ({ ...p, id: Date.now() + Math.random() }));
    osState.tiposServico         = new Set(parseJsonFront(os.habilidades));
    osState.acoes                = new Set(parseJsonFront(os.variaveis));

    atualizarDropdownProdutos();
    atualizarIconesCliente();

    // Turno e horário
    const diurno  = document.getElementById('rr-chk-diurno');
    const noturno = document.getElementById('rr-chk-noturno');
    if (os.turno === 'Diurno'  && diurno)  { diurno.checked  = true; if (noturno) noturno.checked = false; }
    if (os.turno === 'Noturno' && noturno) { noturno.checked = true; if (diurno)  diurno.checked  = false; }
    set('rr-input-hora-inicio', os.hora_inicio);
    set('rr-input-hora-fim',    os.hora_fim);

    // Dias da semana
    const diasSalvosRaw = parseJsonFront(os.dias_semana);
    const mNormalizar = { 'seg':'Seg','ter':'Ter','qua':'Qua','qui':'Qui','sex':'Sex','sab':'Sáb','sáb':'Sáb','dom':'Dom' };
    const diasSalvosNorm = diasSalvosRaw.map(d => mNormalizar[(d||'').toLowerCase().substring(0,3)] || d);
    
    const diasMap = { 'Seg': 'rr-chk-seg', 'Ter': 'rr-chk-ter', 'Qua': 'rr-chk-qua', 'Qui': 'rr-chk-qui', 'Sex': 'rr-chk-sex', 'Sáb': 'rr-chk-sab', 'Dom': 'rr-chk-dom' };
    Object.entries(diasMap).forEach(([d, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = diasSalvosNorm.includes(d) || diasSalvosRaw.includes(d);
    });

    const btnDuplicar = document.getElementById('btn-duplicar-os-form');
    if (btnDuplicar) btnDuplicar.style.display = 'block';

    atualizarUI();
    atualizarBloqueio();
}

function parseDiasFront(diasJson) {
    if (!diasJson) return [];
    try { return JSON.parse(diasJson); } catch { return typeof diasJson === 'string' ? [diasJson] : []; }
}

function exibirModalAgendaEndereco(data, enderecoAtual) {
    document.getElementById('rr-modal-agenda-end')?.remove();
    const DIAS_ALL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b', 'Dom'];
    const colorMap = { 'Seg':'#ef4444', 'Ter':'#f97316', 'Qua':'#ca8a04', 'Qui':'#16a34a', 'Sex':'#3b82f6', 'S\u00e1b':'#8b5cf6', 'Dom':'#ec4899' };

    const modoCoord = data.modo === 'coordenadas';
    const exatos    = data.exatos   || [];
    const proximos  = data.proximos || [];

    // Faixas: \u22641km verde, 1-3km amarelo
    const proximos1km = proximos.filter(o => o.distancia_km <= 1);
    const proximos3km = proximos.filter(o => o.distancia_km > 1 && o.distancia_km <= 3);

    const tem1km = data.dias_sugeridos_2km && data.dias_sugeridos_2km.length > 0;
    const tem3km = data.dias_sugeridos_5km && data.dias_sugeridos_5km.length > 0;
    const COR_1KM = '#2563eb'; // azul para ≤1km
    const COR_3KM = '#ca8a04'; // amarelo para 1-3km

    // Menor dist\u00e2ncia por dia (para pills)
    const distanciaPorDia = {};
    [...exatos.map(o => ({...o, distancia_km: o.distancia_km ?? 0})), ...proximos].forEach(os => {
        const dias = parseDiasFront(os.dias_semana);
        const dist = parseFloat(os.distancia_km ?? 0);
        dias.forEach(d => {
            if (distanciaPorDia[d] === undefined || dist < distanciaPorDia[d]) distanciaPorDia[d] = dist;
        });
    });

    const corDistancia = (km) => km < 0.1 ? '#16a34a' : km <= 1 ? '#2563eb' : km <= 3 ? '#ca8a04' : '#ef4444';

    // Calcula o total de atendimentos por dia para o grafico
    const totaisPorDia = { 'Seg':0, 'Ter':0, 'Qua':0, 'Qui':0, 'Sex':0, 'Sáb':0, 'Dom':0 };
    // Normaliza variações de acento/capitalização para as chaves do mapa
    const normalizarDia = (d) => {
        const m = { 'seg':'Seg','ter':'Ter','qua':'Qua','qui':'Qui','sex':'Sex','sab':'Sáb','sáb':'Sáb','dom':'Dom' };
        return m[(d||'').toLowerCase().substring(0,3)] || null;
    };
    [...exatos.map(o => ({...o, distancia_km: o.distancia_km ?? 0})), ...proximos].forEach(os => {
        const dias = parseDiasFront(os.dias_semana);
        dias.forEach(d => {
            const chave = normalizarDia(d);
            if (chave && totaisPorDia[chave] !== undefined) totaisPorDia[chave]++;
        });
    });


    const maxCount = Math.max(1, ...Object.values(totaisPorDia));

    let chartHtml = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1.5rem 1rem 1rem 1rem; margin-bottom:0.5rem; display:flex; flex-direction:column; gap:1.2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <p style="margin:0; font-weight:800; color:#1e293b; font-size:0.95rem; text-align:center;"><i class="ph ph-chart-bar" style="color:#0ea5e9; font-size:1.1rem; vertical-align:middle;"></i> Volume de Atendimentos na Região (3km)</p>
          <div style="display:flex; justify-content:center; align-items:flex-end; height:140px; gap:24px; padding: 0 10px; border-bottom: 2px solid #e2e8f0;">
      `;
      
      DIAS_ALL.forEach(d => {
          const count = totaisPorDia[d];
          if (count === 0) return;
          const cor = colorMap[d];
          // Altura em pixels baseada em 100px para aparecer direito no flex container
          const barHeight = Math.max(4, Math.round((count / maxCount) * 100));
          const heightStyle = count === 0 ? 'height: 4px; opacity: 0.2;' : `height: ${barHeight}px; box-shadow: 0 -4px 12px ${cor}40;`;
          
          chartHtml += `
              <div style="display:flex; flex-direction:column; align-items:center; gap:6px; min-width: 50px;">
                  <div style="font-size:0.8rem; font-weight:800; color:${count > 0 ? cor : '#94a3b8'};">${count}</div>
                  <div style="width:100%; max-width:48px; ${heightStyle} background:${cor}; border-radius:6px 6px 0 0; transition:height 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                  <div style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase; margin-top:4px;">${d}</div>
              </div>
          `;
      });
      chartHtml += `
          </div>
      </div>
      `;

    let msgSugestao = chartHtml;



    const renderTabela = (lista, cor, semDist = false) => {
        if (!lista.length) return '';
        return lista.map(os => {
            const diasRaw = parseDiasFront(os.dias_semana);
            const dias = diasRaw.map(normalizarDia).filter(Boolean);
            const pills = DIAS_ALL.map(d => {
                const dNorm = normalizarDia(d) || d;
                const ativo = dias.includes(dNorm) || diasRaw.includes(d);
                return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:22px;border-radius:5px;font-size:0.65rem;font-weight:700;background:${ativo?(colorMap[d]||cor):'#f1f5f9'};color:${ativo?'white':'#94a3b8'};margin:1px;">${d}</span>`;
            }).join('');
            const distCell = os.distancia_km !== undefined
                ? `<td style="padding:5px 8px;font-size:0.72rem;font-weight:700;color:${corDistancia(os.distancia_km)};">${os.distancia_km < 0.1 ? '<0.1' : os.distancia_km}km</td>`
                : '<td></td>';
            return `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:5px 8px;font-size:0.72rem;font-weight:700;color:${cor};">${os.numero_os||'-'}</td>
                <td style="padding:5px 8px;font-size:0.72rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${os.cliente||'-'}</td>
                ${distCell}
                <td style="padding:5px 8px;font-size:0.7rem;color:#64748b;">${os.tipo_servico||'-'}</td>
                <td style="padding:5px 8px;">${pills}</td>
            </tr>`;
        }).join('');
    };

    const cabDist = `<tr style="background:#f8fafc;"><th style="padding:5px 8px;font-size:0.7rem;color:#64748b;text-align:left;">OS</th><th style="padding:5px 8px;font-size:0.7rem;color:#64748b;text-align:left;">Cliente</th><th style="padding:5px 8px;font-size:0.7rem;color:#64748b;text-align:left;">Dist.</th><th style="padding:5px 8px;font-size:0.7rem;color:#64748b;text-align:left;">Tipo</th><th style="padding:5px 8px;font-size:0.7rem;color:#64748b;text-align:left;">Dias</th></tr>`;

    const labelExatos = modoCoord
        ? `<i class="ph ph-crosshair"></i> No mesmo local \u2014 \u22640.1km (${exatos.length})`
        : `<i class="ph ph-map-pin"></i> OS neste endere\u00e7o \u2014 texto (${exatos.length})`;

    const modoLabel = modoCoord
        ? '<span style="font-size:0.7rem;background:rgba(255,255,255,0.25);border-radius:4px;padding:1px 6px;margin-left:6px;">\ud83d\udccd por coordenadas</span>'
        : '<span style="font-size:0.7rem;background:rgba(255,255,255,0.25);border-radius:4px;padding:1px 6px;margin-left:6px;">\ud83d\udd24 por endere\u00e7o</span>';

    const endLabel = enderecoAtual.length > 60 ? enderecoAtual.substring(0, 60) + '\u2026' : enderecoAtual;
    const modal = document.createElement('div');
    modal.id = 'rr-modal-agenda-end';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:white;border-radius:14px;width:960px;max-width:98vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 16px 56px rgba(0,0,0,0.25);overflow:hidden;">
            <div style="background:#2d9e5f;color:white;padding:0.9rem 1.2rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div>
                    <div style="font-weight:700;font-size:0.95rem;display:flex;align-items:center;gap:6px;"><i class="ph ph-calendar-check"></i> Agenda de Manuten\u00e7\u00f5es${modoLabel}</div>
                    <div style="font-size:0.72rem;opacity:0.85;margin-top:2px;"><i class="ph ph-map-pin"></i> ${endLabel}</div>
                </div>
                <button id="btn-fechar-modal-agenda" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
            </div>
            <div style="overflow-y:auto;padding:1.2rem;display:flex;flex-direction:column;gap:1rem;">
                ${msgSugestao}
                ${exatos.length > 0 ? `<div>
                    <p style="font-size:0.78rem;font-weight:700;color:#334155;margin:0 0 6px;">${labelExatos}</p>
                    <table style="width:100%;border-collapse:collapse;"><thead>${cabDist}</thead><tbody>${renderTabela(exatos, '#2d9e5f')}</tbody></table>
                </div>` : ''}
                ${proximos1km.length > 0 ? `<div>
                    <p style="font-size:0.78rem;font-weight:700;color:#1d4ed8;margin:0 0 6px;"><i class="ph ph-circles-three"></i> Pr\u00f3ximos \u2014 at\u00e9 1km \ud83d\udd35 (${proximos1km.length}):</p>
                    <table style="width:100%;border-collapse:collapse;"><thead>${cabDist}</thead><tbody>${renderTabela(proximos1km, '#2563eb')}</tbody></table>
                </div>` : ''}
                ${proximos3km.length > 0 ? `<div>
                    <p style="font-size:0.78rem;font-weight:700;color:#92400e;margin:0 0 6px;"><i class="ph ph-circles-three"></i> Pr\u00f3ximos \u2014 1 a 3km \ud83d\udfe1 (${proximos3km.length}):</p>
                    <table style="width:100%;border-collapse:collapse;"><thead>${cabDist}</thead><tbody>${renderTabela(proximos3km, '#ca8a04')}</tbody></table>
                </div>` : ''}
                ${exatos.length === 0 && proximos.length === 0 ? '<p style="text-align:center;color:#94a3b8;font-size:0.82rem;padding:1.5rem 0;"><i class="ph ph-empty"></i> Nenhuma manuten\u00e7\u00e3o encontrada em raio de 3km.</p>' : ''}
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#btn-fechar-modal-agenda')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    const containerSugestoes = document.getElementById('rr-sugestoes-dias-container');
    if (containerSugestoes) containerSugestoes.style.display = 'none';
}

// CSS: spinner + fix Leaflet z-index dentro do layout

if (!document.getElementById('rr-keyframes')) {
    const s = document.createElement('style');
    s.id = 'rr-keyframes';
    s.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        #rr-mapa-leaflet .leaflet-control { z-index: 1; }
        #rr-mapa-leaflet { background: #e8f4f8; }
    `;
    document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════════════════════
// PARSER DE TEXTO LIVRE DE OS (Colar OS)
// ══════════════════════════════════════════════════════════════════════════════

function parseOsText(texto) {
    texto = texto.replace(/\t/g, '\n');
    const lines = texto.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l);
    const resultado = {
        numOs: '', cliente: '', contrato: '', tipoOs: '',
        responsavel: '', telefone: '', endereco: '', email: '',
        dataEntrega: '', rawProdutos: '', observacoes: '', observacoesInternas: '',
        linkGoogleMaps: '',
        ambiguidades: [], avisos: []
    };

    const eVazio = (v) => !v || /^[\s\-–—*]*$/.test(v);
    const extrairValor = (linha, regex) => linha.replace(regex, '').replace(/^[\s\-–—:]+/, '').trim();

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const lu = l.toUpperCase();

        if (lu.startsWith('OS')) {
            const match = lu.match(/OS\s*[:\-]?\s*(\d+)/);
            if (match) resultado.numOs = match[1];
            else if (i + 1 < lines.length && /^\d+$/.test(lines[i + 1])) resultado.numOs = lines[i + 1];
        }
        
        if (lu.includes('DATA CADASTRO') || lu.includes('DATA')) {
            let v = extrairValor(l, /DATA(?: CADASTRO)?/i);
            if (eVazio(v) && i + 1 < lines.length) v = lines[i + 1];
            
            const datasEncontradas = [...v.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)];
            if (datasEncontradas.length > 0) {
                const [, d, m, a] = datasEncontradas[0];
                const ano = a ? (a.length === 2 ? '20' + a : a) : new Date().getFullYear();
                resultado.dataEntrega = `${ano}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
            }
        }

        if (lu.startsWith('CLIENTE')) {
            let v = extrairValor(l, /CLIENTE/i);
            if (!eVazio(v)) resultado.cliente = v;
            else if (i + 1 < lines.length) {
                 if (/^\d+$/.test(lines[i + 1])) {
                     if (i + 2 < lines.length) resultado.cliente = lines[i + 2];
                 } else {
                     resultado.cliente = lines[i + 1];
                 }
            }
        }

        if (lu.startsWith('CONTRATO')) {
            let c = extrairValor(l, /CONTRATO/i);
            if (eVazio(c) && i + 1 < lines.length) c = lines[i + 1];
            const matchNum = c.match(/^(\d+)/);
            if (matchNum) resultado.contrato = matchNum[1];
        }

        if (lu.startsWith('CONTATO')) {
            let v = extrairValor(l, /CONTATO/i);
            if (eVazio(v) && i + 1 < lines.length) {
                if (/^\d+$/.test(lines[i+1].trim()) && i + 2 < lines.length) {
                    v = lines[i+2];
                } else {
                    v = lines[i+1];
                }
            }
            if (!eVazio(v)) {
                // Captura telefones com ou sem formatação: (11) 96769-1742, 11967691742, etc.
                const telMatch = v.match(/\(?\d{2}\)?[\s\-]?\d{4,5}[\s\-]?\d{4}/) || v.match(/\b\d{10,11}\b/);
                if (telMatch) {
                    resultado.responsavel = v.replace(telMatch[0], '').replace(/[\-:\s]+$/, '').trim();
                    const tel = telMatch[0].replace(/[^\d]/g, '');
                    resultado.telefone = tel.length === 11
                        ? `(${tel.slice(0,2)}) ${tel.slice(2,7)}-${tel.slice(7)}`
                        : tel.length === 10
                        ? `(${tel.slice(0,2)}) ${tel.slice(2,6)}-${tel.slice(6)}`
                        : tel;
                } else {
                    resultado.responsavel = v.replace(/[-:]+$/, '').trim();
                }
            }
        }
        if (lu.includes('TIPO E SITUAÇÃO DO CONTRATO') || lu.includes('TIPO DE CONTRATO')) {
            let val = l;
            if (val.length < 30 && i + 1 < lines.length) val += ' ' + lines[i + 1];
            val = val.toUpperCase();
            if (val.includes('OBRA')) resultado.tipoOs = 'Obra';
            else if (val.includes('EVENTO')) resultado.tipoOs = 'Evento';
        }

        if (l.includes('📞Contato') || l.includes('Contato de instalação:')) {
            let v = extrairValor(l, /📞?Contato de instala[cç][aã]o:/i);
            if (eVazio(v) && i + 1 < lines.length) v = lines[i + 1];
            if (!eVazio(v)) {
                // Captura telefones com ou sem formatação: (11) 96769-1742, 11967691742, etc.
                const telMatch = v.match(/\(?\d{2}\)?[\s\-]?\d{4,5}[\s\-]?\d{4}/) || v.match(/\b\d{10,11}\b/);
                if (telMatch) {
                    resultado.responsavel = v.replace(telMatch[0], '').replace(/[\-:\s]+$/, '').trim();
                    const tel = telMatch[0].replace(/[^\d]/g, '');
                    resultado.telefone = tel.length === 11
                        ? `(${tel.slice(0,2)}) ${tel.slice(2,7)}-${tel.slice(7)}`
                        : tel.length === 10
                        ? `(${tel.slice(0,2)}) ${tel.slice(2,6)}-${tel.slice(6)}`
                        : tel;
                } else {
                    resultado.responsavel = v.replace(/[-:]+$/, '').trim();
                }
            }
        }


        if (l.includes('📍Endereço') || l.includes('Endereço de entrega:')) {
            let v = extrairValor(l, /📍?Endere[cç]o de entrega:/i);
            if (eVazio(v) && i + 1 < lines.length) v = lines[i + 1];
            if (!eVazio(v)) resultado.endereco = v.replace(/- campo.*/i, '').trim();
        }

        // 📨 E-mail recebimento OS:
        else if (l.includes('📨 E-mail') || l.includes('E-mail recebimento OS:')) {
            const v = extrairValor(l, /📨?\s*E-mail recebimento OS:/i);
            const emMatch = v.match(/[\w.\-+]+@[\w.\-]+\.\w{2,}/);
            if (emMatch) resultado.email = emMatch[0].toLowerCase();
        }

        // 👉Entrega: 24/04/2026
        else if (l.includes('👉Entrega:') || l.includes('Entrega:')) {
            const v = extrairValor(l, /👉?Entrega:/i);
            const datasEncontradas = [...v.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)];
            if (datasEncontradas.length > 0) {
                const [, d, m, a] = datasEncontradas[0];
                const ano = a ? (a.length === 2 ? '20' + a : a) : new Date().getFullYear();
                resultado.dataEntrega = `${ano}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
            }
        }

        // 💩Produto: 10 STD 1 PCD
        else if (l.includes('💩Produto:') || l.includes('Produto:')) {
            const v = extrairValor(l, /💩?Produto:/i);
            if (!eVazio(v)) resultado.rawProdutos = v.replace(/-.*(produto|icone).*/i, '').trim();
        }

        // 💡Observações:--
        else if (l.includes('💡Observações:') || l.includes('Observações:')) {
            let v = extrairValor(l, /💡?Observa[cç][õo]es:/i);
            if (!eVazio(v) && v !== '--') {
                v = v.replace(/Ignorar.*/i, '').replace(/-.*campo.*/i, '').trim();
                // Remove nome do cliente antigo ex: "QUALITY: INTEGRACAO..." vira "INTEGRACAO..."
                const idx = v.indexOf(':');
                if (idx !== -1) {
                    v = v.substring(idx + 1).trim();
                }
                resultado.observacoesInternas = v;
            }
        }
    }

    // Extrai link do Google Maps de qualquer parte do texto (posição variável)
    const urlGoogleMatch = texto.match(/https?:\/\/(?:maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps)[^\s]*/i);
    if (urlGoogleMatch) {
        resultado.linkGoogleMaps = urlGoogleMatch[0].trim();
        // Remove o link do endereço caso tenha sido capturado junto
        if (resultado.endereco) {
            resultado.endereco = resultado.endereco.replace(resultado.linkGoogleMaps, '').replace(/\s+$/, '').trim();
        }
    }

    return resultado;
}

// ── EXTRAÇÃO DE PRODUTOS ───────────────────────────────────────────────────
function parseProdutosString(rawStr, tipoOs) {
    const prods = [];
    if (!rawStr || !tipoOs) return prods;
    
    // Suporta "01 guarita individual / 01 STD"
    // Pega o número e o texto seguinte (com ou sem espaços, ignorando pontuações iniciais)
    const prodRegex = /(\d+)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;
    let match;
    while ((match = prodRegex.exec(rawStr)) !== null) {
        let qtd = parseInt(match[1], 10);
        let nomeStr = match[2].toUpperCase().trim();
        
        const MAP_PROD = {
            'STD': 'STD', 'STANDARD': 'STD', 'STANDARDS': 'STD',
            'LX': 'LX', 'ELX': 'ELX', 'EXL': 'ELX', 'SLX': 'ELX',
            'PCD': 'PCD', 'PCDS': 'PCD',
            'CHUVEIRO': 'CHUVEIRO', 'CHUVEIROS': 'CHUVEIRO',
            'HIDRAULICO': 'HIDRÁULICO', 'HIDRAULICOS': 'HIDRÁULICO', 'HIDRAU': 'HIDRÁULICO',
            'MICTORIO': 'MICTÓRIO', 'MICTORIOS': 'MICTÓRIO', 'MICT': 'MICTÓRIO',
            'PBII': 'PBII', 'PIA': 'PBII', 'PIAS': 'PBII', 'LAVATORIO': 'PBII', 'LAVATORIOS': 'PBII',
            'CARRINHO': 'CARRINHO', 'CARRINHOS': 'CARRINHO',
            'CAIXA': 'CAIXA DAGUA', 'CAIXAS': 'CAIXA DAGUA',
            'GUARITA INDIVIDUAL': 'GUARITA INDIVIDUAL', 'GUARITAS INDIVIDUAIS': 'GUARITA INDIVIDUAL',
            'GUARITA DUPLA': 'GUARITA DUPLA', 'GUARITAS DUPLAS': 'GUARITA DUPLA',
            'GUARITA IND': 'GUARITA INDIVIDUAL', 'GUARITAS IND': 'GUARITA INDIVIDUAL',
            'GUARITA DUP': 'GUARITA DUPLA', 'GUARITAS DUP': 'GUARITA DUPLA',
            'GUARITA': 'GUARITA INDIVIDUAL', 'GUARITAS': 'GUARITA INDIVIDUAL' // fallback
        };
        
        let base = nomeStr;
        // Procura a chave correspondente (da mais longa para a mais curta para não ter match errado)
        for (const [chave, valor] of Object.entries(MAP_PROD).sort((a,b) => b[0].length - a[0].length)) {
            if (nomeStr.includes(chave)) { base = valor; break; }
        }

        const nomeProdutoCompleto = `${base} ${tipoOs === 'Obra' ? 'OBRA' : 'EVENTO'}`;
        const produtoExiste = Object.keys(EQUIPAMENTOS_DICT).find(k => k === nomeProdutoCompleto);
        if (produtoExiste) {
            prods.push({ desc: nomeProdutoCompleto, qtd: qtd, icone: EQUIPAMENTOS_DICT[nomeProdutoCompleto].icone });
        }
    }
    return prods;
}

// ── MODAL COLAR OS ─────────────────────────────────────────────────────────
function abrirModalColarOS() {
    document.getElementById('rr-modal-colar-os')?.remove();
    const modal = document.createElement('div');
    modal.id = 'rr-modal-colar-os';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:12px;padding:1.5rem;width:560px;max-width:95vw;box-shadow:0 8px 40px rgba(0,0,0,0.25);display:flex;flex-direction:column;gap:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <p style="font-weight:700;font-size:1rem;color:#1e293b;margin:0;">📋 Colar texto da OS</p>
                    <p style="font-size:0.75rem;color:#64748b;margin:2px 0 0;">Cole o texto do pedido abaixo. O sistema interpretará os campos automaticamente.</p>
                </div>
                <button id="rr-colar-fechar" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;">✕</button>
            </div>
            <textarea id="rr-textarea-os" style="width:100%;height:180px;border:1px solid #cbd5e1;border-radius:6px;padding:0.75rem;font-size:0.8rem;font-family:monospace;resize:vertical;box-sizing:border-box;" placeholder="Cole aqui o texto do pedido (WhatsApp, e-mail, etc)..."></textarea>
            <div id="rr-colar-preview" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:0.75rem;font-size:0.75rem;max-height:180px;overflow-y:auto;"></div>
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
                <button id="rr-colar-analisar" style="background:#2d9e5f;color:white;border:none;padding:0 1rem;height:32px;border-radius:6px;font-weight:600;cursor:pointer;">🔍 Analisar</button>
                <button id="rr-colar-confirmar" style="background:#0ea5e9;color:white;border:none;padding:0 1rem;height:32px;border-radius:6px;font-weight:600;cursor:pointer;display:none;">✅ Preencher formulário</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let dadosExtraidos = null;

    modal.querySelector('#rr-colar-fechar').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Botão Analisar
    modal.querySelector('#rr-colar-analisar').onclick = async () => {
        const texto = document.getElementById('rr-textarea-os').value.trim();
        if (!texto) return;
        
        const btnAnalisar = document.getElementById('rr-colar-analisar');
        const origText = btnAnalisar.innerHTML;
        btnAnalisar.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
        
        dadosExtraidos = parseOsText(texto);

        // Verifica se a OS já existe
        if (dadosExtraidos.numOs) {
            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/buscar?numero_os=${encodeURIComponent(dadosExtraidos.numOs)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resp.ok) {
                    const registros = await resp.json();
                    if (registros && registros.length > 0) {
                        dadosExtraidos.osExiste = true;
                        dadosExtraidos.tipoOsDB = registros[0].tipo_os; // Usa o tipo da base de dados!
                    }
                }
            } catch(e) { console.error('Erro ao checar OS colada', e); }
        }
        btnAnalisar.innerHTML = origText;

        const preview = document.getElementById('rr-colar-preview');
        preview.style.display = 'block';

        const linha = (label, val, cor) => val
            ? `<div style="display:flex;gap:0.5rem;padding:2px 0;border-bottom:1px solid #f1f5f9;">
                 <span style="min-width:140px;color:#64748b;font-weight:600;">${label}</span>
                 <span style="color:${cor||'#1e293b'};">${val}</span>
               </div>` : '';

        let html = '';
        if (dadosExtraidos.osExiste) {
            html += `<div style="color:#b91c1c;background:#fef2f2;padding:6px 10px;border-radius:4px;margin-bottom:8px;font-weight:bold;border:1px solid #f87171;">
                        ⚠️ Esta OS (${dadosExtraidos.numOs}) já existe no sistema! Tipo identificado: ${dadosExtraidos.tipoOsDB || 'Desconhecido'}.
                     </div>`;
        }

        // Renderiza Preview dos Produtos identificados NO TOPO
        const tipoProvisorio = (dadosExtraidos.tipoOsDB || dadosExtraidos.tipoOs || '').toUpperCase().includes('OBRA') ? 'Obra' : 'Evento';
        const parsedProds = parseProdutosString(dadosExtraidos.rawProdutos, tipoProvisorio);
        if (parsedProds.length > 0) {
            let prodHtml = `<div style="margin-bottom:12px;padding:10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;">
                <p style="margin:0 0 8px 0;font-weight:700;color:#0369a1;font-size:0.8rem;display:flex;align-items:center;gap:4px;">
                    <i class="ph ph-package"></i> Produtos Identificados na OS
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">`;
            parsedProds.forEach(p => {
                prodHtml += `<div style="background:white;padding:4px 8px;border-radius:4px;border:1px solid #7dd3fc;font-weight:600;color:#0c4a6e;display:flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <span style="font-size:1.1rem;">${p.icone || '📦'}</span>
                    <span>${p.qtd}x ${p.desc}</span>
                </div>`;
            });
            prodHtml += `</div></div>`;
            html += prodHtml;
        } else if (dadosExtraidos.rawProdutos) {
            html += `<div style="color:#b91c1c;background:#fef2f2;padding:6px 10px;border-radius:4px;margin-bottom:12px;font-size:0.75rem;border:1px solid #fca5a5;">
                        ⚠️ Atenção: O texto contém produtos (${dadosExtraidos.rawProdutos}), mas nenhum foi reconhecido com os nomes padrões (ex: STD, Guarita). Eles não serão inseridos automaticamente.
                     </div>`;
        }
        
        // Renderização dos campos texto...
        html += linha('🔢 OS', dadosExtraidos.numOs);
        html += linha('📅 Data', dadosExtraidos.dataEntrega);
        html += linha('👤 Cliente', dadosExtraidos.cliente);
        html += linha('📜 Contrato', dadosExtraidos.contrato);
        html += linha('🏢 Tipo OS', dadosExtraidos.tipoOsDB || dadosExtraidos.tipoOs);
        html += linha('👷 Responsável', dadosExtraidos.responsavel);
        html += linha('📞 Telefone', dadosExtraidos.telefone);
        html += linha('📍 Endereço', dadosExtraidos.endereco);
        if (dadosExtraidos.linkGoogleMaps) {
            html += `<div style="display:flex;gap:0.5rem;padding:2px 0;border-bottom:1px solid #f1f5f9;">
                       <span style="min-width:140px;color:#64748b;font-weight:600;">🗺️ Link Maps</span>
                       <span><a href="${dadosExtraidos.linkGoogleMaps}" target="_blank" style="color:#16a34a;font-size:0.8rem;word-break:break-all;">${dadosExtraidos.linkGoogleMaps}</a></span>
                     </div>`;
        }
        html += linha('📧 Email', dadosExtraidos.email);
        html += linha('📝 Obs Motorista', dadosExtraidos.observacoes);
        html += linha('🔒 Obs Internas', dadosExtraidos.observacoesInternas);


        // Avisos
        dadosExtraidos.avisos.forEach(a => {
            html += `<div style="color:#b45309;background:#fef3c7;padding:4px 8px;border-radius:4px;margin-top:4px;">${a}</div>`;
        });
        dadosExtraidos.ambiguidades.forEach(amb => {
            html += `<div style="color:#b45309;background:#fef3c7;padding:4px 8px;border-radius:4px;margin-top:4px;">⚠️ ${amb.aviso}</div>`;
        });

        preview.innerHTML = html || '<p style="color:#94a3b8;margin:0;">Nenhum campo reconhecido.</p>';
        const btnConfirmar = document.getElementById('rr-colar-confirmar');
        btnConfirmar.style.display = 'block';
        if (dadosExtraidos.osExiste) {
            btnConfirmar.disabled = true;
            btnConfirmar.style.opacity = '0.5';
            btnConfirmar.style.cursor = 'not-allowed';
            btnConfirmar.title = "Esta OS já existe no sistema";
        } else {
            btnConfirmar.disabled = false;
            btnConfirmar.style.opacity = '1';
            btnConfirmar.style.cursor = 'pointer';
            btnConfirmar.title = "";
        }
    };

    // Botão Confirmar → preenche o formulário
    modal.querySelector('#rr-colar-confirmar').onclick = () => {
        if (!dadosExtraidos) return;
        const continuar = (tOs) => {
            modal.remove();
            preencherFormularioComDados(dadosExtraidos, tOs);
        };
        // Se já existe na base, força o tipo da base
        if (dadosExtraidos.osExiste && dadosExtraidos.tipoOsDB) {
            osState.tipoOs = dadosExtraidos.tipoOsDB;
            continuar(dadosExtraidos.tipoOsDB);
        } else if (dadosExtraidos.tipoOs) {
            osState.tipoOs = dadosExtraidos.tipoOs;
            continuar(dadosExtraidos.tipoOs);
        } else if (!osState.tipoOs) {
            abrirPopupTipoOs(t => { osState.tipoOs = t; continuar(t); });
        } else {
            continuar(osState.tipoOs);
        }
    };
}

function preencherFormularioComDados(dados, tipoOs) {
    // Apaga os dados anteriores
    osState.produtos = [];
    osState.tiposServico = new Set();
      osState.acoes = new Set();
    document.querySelectorAll('#rota-redonda-tab input:not([type="radio"]), #rota-redonda-tab textarea').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else if (el.id !== 'rr-input-obs-internas') { el.value = ''; el.style.background = 'transparent'; }
    });

    // Desbloqueia o formulário e ativa obrigatoriedade do endereço
    osState.clienteConfirmado = true;
    osState.enderecoObrigatorio = true;     // Colar OS exige G + Agenda
    osState.coordenadasConfirmadas = false;
    osState.agendaVerificada = false;
    osState.enderecoConfirmado = false;
    atualizarBloqueio();

    // Preenche os campos
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) { el.value = val; el.style.background = '#f0fdf4'; }
    };

    set('rr-input-os',          dados.numOs);
    set('rr-input-cliente',     dados.cliente);
    // Se tiver link do Google Maps, coloca apenas o endereço limpo no campo e atualiza o badge
    if (dados.linkGoogleMaps) {
        set('rr-input-endereco', dados.endereco);
        osState.linkGoogleMaps = dados.linkGoogleMaps;
        atualizarLinkMapsBadge(dados.linkGoogleMaps);
    } else {
        set('rr-input-endereco', dados.endereco);
        osState.linkGoogleMaps = '';
        atualizarLinkMapsBadge('');
    }

    set('rr-input-responsavel', dados.responsavel);
    set('rr-input-sms',    dados.telefone);
    set('rr-input-email',       dados.email);
    set('rr-input-obs',         dados.observacoes);
    // rr-input-obs-internas NÃO é preenchido via Colar OS (campo manual)


    if (dados.dataEntrega) {
        const dateEl = document.getElementById('rr-input-data');
        if (dateEl) { dateEl.value = dados.dataEntrega; dateEl.style.background = '#f0fdf4'; }
    }

    if (dados.contrato) {
        const contEl = document.getElementById('rr-input-contrato');
        if (contEl) { contEl.value = dados.contrato; contEl.style.background = '#f0fdf4'; }
    }

    // Atualiza estado do cliente
    osState.clienteNome = dados.cliente;

    // Processa Produtos (ex: "10 STD 1 PCD" ou "01 guarita individual")
    if (dados.rawProdutos && tipoOs) {
        atualizarDropdownProdutos();
        const parsedProds = parseProdutosString(dados.rawProdutos, tipoOs);
        
        parsedProds.forEach(p => {
            osState.produtos.push({ id: Date.now() + Math.random(), desc: p.desc, qtd: p.qtd });
            calcularCamposPorProduto({ desc: p.desc, qtd: p.qtd });
        });
        
        if (parsedProds.length > 0) {
            aplicarHabilidadesDoServico();
            atualizarUI();
            atualizarIconesCliente();
        }
    }

    // Destaca campos ambíguos em amarelo
    dados.ambiguidades.forEach(amb => {
        if (amb.campo === 'Produto') {
            const prodInput = document.getElementById('rr-prod-desc');
            if (prodInput) {
                prodInput.style.background = '#fef3c7';
                prodInput.style.borderColor = '#f59e0b';
                prodInput.title = amb.aviso;
                prodInput.placeholder = amb.aviso;
            }
        }
    });

    // Avisos como toast rápido
    if (dados.avisos.length || dados.ambiguidades.length) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:0.75rem 1rem;border-radius:8px;font-size:0.8rem;max-width:340px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
        toast.innerHTML = [...dados.avisos, ...dados.ambiguidades.map(a => '⚠️ ' + a.aviso)].join('<br>');
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    }

    // Atualiza ícones com base nas infos pré-carregadas
    atualizarIconesCliente();
}

document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'view-logistica-rota-redonda' && mutation.target.classList.contains('active')) {
                const c = document.getElementById('rota-redonda-container');
                if (c && !c.innerHTML.trim()) {
                    renderRotaRedonda();
                }
            }
        });
    });

    const view = document.getElementById('view-logistica-rota-redonda');
    if (view) observer.observe(view, { attributes: true, attributeFilter: ['class'] });

    // Event Delegation
    document.addEventListener('keydown', async (e) => {
        if (!document.getElementById('view-logistica-rota-redonda')?.classList.contains('active')) return;
        if (e.target.id === 'rr-input-os' && e.key === 'Enter') {
            e.preventDefault();
            const numOs = e.target.value.trim() || '';
            await carregarOsPorNumero(numOs);
        }
    });

    
    // Intercepta qualquer clique ou foco nos campos antes de validar o +
    ['focusin', 'mousedown'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            if (!document.getElementById('view-logistica-rota-redonda')?.classList.contains('active')) return;
            
            // Verifica se é um campo interativo dentro do form de Rota Redonda
            const target = e.target;
            const inContainer = target.closest('#rota-redonda-container');
            if (!inContainer) return;

            const isInteractive = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA' || target.closest('.rr-tipo-opt');
            
            // Exceções que podem ser clicadas sem validar o +
            const allowedIds = ['rr-input-os', 'btn-add-os-tipo', 'btn-colar-os', 'btn-limpar-os', 'btn-pesq-cliente-os'];
            const isAllowed = allowedIds.includes(target.id) || target.closest('#btn-add-os-tipo') || target.closest('#btn-colar-os') || target.closest('#btn-limpar-os') || target.closest('#btn-pesq-cliente-os');

            if (isInteractive && !isAllowed) {
                const numOs = document.getElementById('rr-input-os')?.value?.trim();
                // Se digitou número da OS mas não validou o tipo (Obra/Evento)
                if (numOs && !osState.tipoOs) {
                    e.preventDefault();
                    e.stopPropagation();
                    target.blur();
                    
                    mostrarToastAviso('Você digitou um número de OS. Valide o tipo clicando no botão [+] primeiro!');
                    
                    const btnPlus = document.getElementById('btn-add-os-tipo');
                    if (btnPlus) {
                        btnPlus.style.transition = 'transform 0.1s, box-shadow 0.1s';
                        btnPlus.style.transform = 'scale(1.3)';
                        btnPlus.style.boxShadow = '0 0 10px 4px #0284c7';
                        setTimeout(() => { btnPlus.style.transform = ''; btnPlus.style.boxShadow = ''; }, 600);
                    }
                }
            }
        }, true); // Use capture to intercept before other handlers
    });

    // Event Delegation
    document.addEventListener('change', (e) => {
        if (!document.getElementById('view-logistica-rota-redonda')?.classList.contains('active')) return;

        if (e.target.id === 'rr-chk-diurno') {
            const isChecked = e.target.checked;
            const noturno = document.getElementById('rr-chk-noturno');
            const horaInicio = document.getElementById('rr-input-hora-inicio');
            const horaFim = document.getElementById('rr-input-hora-fim');
            if (isChecked) {
                if (noturno) noturno.checked = false;
                if (horaInicio) { horaInicio.value = '07:00'; horaInicio.style.background = '#f0fdf4'; }
                if (horaFim) { horaFim.value = '18:00'; horaFim.style.background = '#f0fdf4'; }
                // ATENÇÃO AO HORÁRIO só auto-seleciona quando o usuário editar o horário manualmente
                // (tratado no listener de 'change' nos campos rr-input-hora-inicio / rr-input-hora-fim)
            }
        }
        if (e.target.id === 'rr-chk-noturno') {
            const isChecked = e.target.checked;
            const diurno = document.getElementById('rr-chk-diurno');
            const horaInicio = document.getElementById('rr-input-hora-inicio');
            const horaFim = document.getElementById('rr-input-hora-fim');
            if (isChecked) {
                if (diurno) diurno.checked = false;
                if (horaInicio) { horaInicio.value = '20:00'; horaInicio.style.background = '#fefce8'; }
                if (horaFim)    { horaFim.value    = '23:00'; horaFim.style.background    = '#fefce8'; }
            }
        }
        // Auto-seleciona ATENÇÃO AO HORÁRIO apenas quando o usuário editar o horário após marcar Diurno
        if ((e.target.id === 'rr-input-hora-inicio' || e.target.id === 'rr-input-hora-fim')
            && document.getElementById('rr-chk-diurno')?.checked) {
            const btnAH = document.querySelector('.btn-acao-azul[data-acao="ATENÇÃO AO HORÁRIO"]');
            if (btnAH && !osState.acoes.has('ATENÇÃO AO HORÁRIO')) {
                osState.acoes.add('ATENÇÃO AO HORÁRIO');
                btnAH.style.background = '#0284c7';
                btnAH.style.color = 'white';
                mostrarToastAviso('⏰ ATENÇÃO AO HORÁRIO selecionado. Preencha as observações ao motorista.');
            }
        }
    });

    // Auto-seleção por obs ao digitar + autocomplete de endereço
    let _endAutoTimer = null;
    document.addEventListener('input', (e) => {
        if (!document.getElementById('view-logistica-rota-redonda')?.classList.contains('active')) return;
        if (e.target.id === 'rr-input-obs') autoSelecionarPorObs();

        // Endereço sempre em maiúsculas
        if (e.target.id === 'rr-input-endereco') {
            const pos = e.target.selectionStart;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(pos, pos);
        }
        if (e.target.id === 'rr-input-endereco') {
            const q = e.target.value.trim();
            const sugg = document.getElementById('rr-endereco-suggestions');
            if (!sugg) return;
            if (q.length < 4) { sugg.style.display = 'none'; return; }
            clearTimeout(_endAutoTimer);
            _endAutoTimer = setTimeout(async () => {
                try {
                    const headers = { 'Accept-Language': 'pt-BR', 'User-Agent': 'AmericaRentalSistema/1.0' };

                    // Extrair número do texto digitado (ex: "rua salto da divisa, 97" -> num=97)
                    const numMatch = q.match(/,?\s*(\d+)\s*$/);
                    const numDigitado = numMatch ? numMatch[1] : '';
                    const ruaBase = numDigitado ? q.replace(/,?\s*\d+\s*$/, '').trim() : q;

                    // Montar URL Nominatim com query estruturada quando há número
                    let apiUrl;
                    if (numDigitado) {
                        apiUrl = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(numDigitado + ' ' + ruaBase)}&countrycodes=br&format=json&limit=8&addressdetails=1&accept-language=pt-BR`;
                    } else {
                        apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' Brasil')}&format=json&limit=8&addressdetails=1&accept-language=pt-BR&countrycodes=br`;
                    }

                    const res  = await fetch(apiUrl, { headers });
                    const data = await res.json();
                    if (!data || data.length === 0) { sugg.style.display = 'none'; return; }

                    // Deduplica por rua + CEP
                    const vistos = new Set();
                    let uniq = data.filter(d => {
                        const cepM = d.display_name.match(/\b\d{5}[- ]?\d{3}\b/);
                        const cep  = cepM ? cepM[0].replace(/\s/, '-') : '';
                        const rua  = d.display_name.split(',')[0].trim().toLowerCase();
                        const ch   = cep ? `${rua}||${cep}` : `${rua}||${d.lat.substring(0, 6)}`;
                        if (vistos.has(ch)) return false; vistos.add(ch); return true;
                    });

                    // Ordenar por distância do ponto de referência (empresa)
                    const refLat = -23.433822823875342, refLng = -46.42008224178194;
                    const dist = (d) => {
                        const dLat = parseFloat(d.lat) - refLat;
                        const dLng = parseFloat(d.lon) - refLng;
                        return dLat * dLat + dLng * dLng;
                    };
                    uniq.sort((a, b) => dist(a) - dist(b));

                    sugg.innerHTML = uniq.map((d, i) => {
                        const a = d.address || {};
                        const logr   = a.road || a.pedestrian || d.display_name.split(',')[0].trim();
                        const num    = a.house_number || numDigitado || '';
                        const bairro = a.suburb || a.neighbourhood || a.quarter || '';
                        const city   = a.city || a.town || a.municipality || '';
                        const uf     = (a.state || '').length === 2 ? a.state : '';
                        const cep    = a.postcode || '';
                        const linha1 = [logr, num].filter(Boolean).join(', ');
                        const linha2 = [bairro, city, uf ? `- ${uf}` : ''].filter(Boolean).join(', ') + (cep ? `, ${cep}` : '');
                        return `<div data-idx="${i}" style="padding:7px 11px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:0.78rem;transition:background 0.1s;"
                            onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''"
                            onclick="window._endSuggSelect(${i})">
                            <div style="font-weight:600;color:#1e293b;">&#128205; ${linha1 || d.display_name.split(',')[0]}</div>
                            <div style="color:#64748b;font-size:0.71rem;">${linha2}</div>
                        </div>`;
                    }).join('');

                    window._endSuggData = uniq;
                    window._endSuggSelect = (idx) => {
                        const d = window._endSuggData[idx];
                        const a = d.address || {};
                        const logr   = a.road || a.pedestrian || d.display_name.split(',')[0].trim();
                        const num    = a.house_number || numDigitado || '';
                        const bairro = a.suburb || a.neighbourhood || a.quarter || '';
                        const city   = a.city || a.town || a.municipality || '';
                        const uf     = (a.state || '').length === 2 ? a.state : '';
                        const cep    = a.postcode || '';
                        const endFinal = [logr, num, bairro, city, uf ? `- ${uf}` : '', cep].filter(Boolean).join(', ');
                        e.target.value = endFinal;
                        sugg.style.display = 'none';
                        // Atualiza mapa (sem desbloquear — desbloqueio é só via G + Agenda)
                        const placeholder = document.getElementById('rr-mapa-placeholder');
                        if (placeholder) placeholder.style.display = 'none';
                        const mapaDiv = document.getElementById('rr-mapa-leaflet');
                        if (mapaDiv) mapaDiv.style.display = 'block';
                        inicializarMapa();
                        const lat = parseFloat(d.lat), lng = parseFloat(d.lon);
                        setTimeout(() => {
                            _leafletMap.invalidateSize();
                            posicionarMarcador(lat, lng);
                            preencherLatLng(lat, lng);
                            e.target.style.background = '#f0fdf4';
                            // NÃO define enderecoConfirmado aqui
                            // Desbloqueio real só ao usar botão G + Agenda
                        }, 50);
                    };
                    sugg.style.display = 'block';
                } catch(_) { /* silencioso */ }
            }, 450);
        }
    });

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (ev) => {
        const sugg = document.getElementById('rr-endereco-suggestions');
        if (sugg && !sugg.contains(ev.target) && ev.target.id !== 'rr-input-endereco') {
            sugg.style.display = 'none';
        }
    });


    // Event Delegation
    document.addEventListener('click', async (e) => {
        if (!document.getElementById('view-logistica-rota-redonda')?.classList.contains('active')) return;

        // Botão + Tipo de OS (Obra/Evento)
        const btnAddOsTipo = e.target.closest('#btn-add-os-tipo');
        if (btnAddOsTipo) {
            const numOs = document.getElementById('rr-input-os')?.value?.trim() || '';

            const originalHtml = btnAddOsTipo.innerHTML;
            btnAddOsTipo.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/buscar?numero_os=${encodeURIComponent(numOs)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                
                if (resp.status === 404 && numOs) {
                    // Nova OS manual — libera formulário até o passo de endereço
                    const numSalvo = numOs;
                    osState.produtos = []; osState.tiposServico = new Set();
      osState.acoes = new Set();
                    osState.clienteConfirmado = true;   // desbloqueia bloco principal
                    osState.enderecoConfirmado = false;  // mantém bloqueio do endereço
                    osState.clienteNome = ''; osState.enderecoSelecionado = ''; osState.tipoOs = '';
                    const c = document.getElementById('rota-redonda-container');
                    if (c) c.innerHTML = '';
                    renderRotaRedonda();

                    setTimeout(() => {
                        const inputOs = document.getElementById('rr-input-os');
                        if (inputOs) inputOs.value = numSalvo;

                        abrirPopupTipoOs((tipo) => {
                            osState.tipoOs = tipo;
                            // Ativa a obrigatoriedade do endereço (2 etapas)
                            osState.enderecoObrigatorio = true;
                            osState.coordenadasConfirmadas = false;
                            osState.agendaVerificada = false;
                            osState.enderecoConfirmado = false;
                            atualizarDropdownProdutos();
                            atualizarIconesCliente();
                            atualizarBloqueio();
                            mostrarToastAviso(`Nova OS iniciada. Tipo: ${tipo}. Use o botão G para confirmar o endereço.`);
                        });

                    }, 50);

                } else if (resp.ok) {
                    const registros = await resp.json();
                    if (!registros || registros.length === 0) {
                        if (numOs) mostrarToastAviso(`OS "${numOs}" não encontrada.`);
                        else mostrarToastAviso(`Nenhuma visita cadastrada no sistema.`);
                        return;
                    }

                    if (registros.length === 1 && numOs) {
                        carregarRegistroNaTela(registros[0]);
                        mostrarToastAviso(`✅ OS "${numOs}" carregada.`);
                    } else {
                        abrirModalListaOS(numOs || 'Todas as Visitas', registros);
                    }
                }
            } catch(err) {
                console.error(err);
                mostrarToastAviso('Erro ao buscar OS.');
            } finally {
                btnAddOsTipo.innerHTML = originalHtml;
            }
            return;
        }

        // Botão de buscar OS por Patrimônio
        const btnBuscarPatrimonio = e.target.closest('#btn-buscar-patrimonio');
        if (btnBuscarPatrimonio) {
            const numPatr = document.getElementById('rr-input-patrimonio')?.value?.trim();
            if (!numPatr) {
                mostrarToastAviso('Digite o número do patrimônio primeiro.');
                return;
            }
            const originalHtml = btnBuscarPatrimonio.innerHTML;
            btnBuscarPatrimonio.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/buscar?patrimonio=${encodeURIComponent(numPatr)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resp.ok) {
                    const registros = await resp.json();
                    if (registros && registros.length > 0) {
                        abrirModalListaOS('Patrimônio: ' + numPatr, registros);
                    } else {
                        mostrarToastAviso('Nenhuma OS encontrada para este patrimônio.');
                    }
                } else {
                    mostrarToastAviso('Erro ao buscar OS do patrimônio.');
                }
            } catch (err) {
                console.error(err);
                mostrarToastAviso('Falha na comunicação.');
            } finally {
                btnBuscarPatrimonio.innerHTML = originalHtml;
            }
            return;
        }

        // Botão de buscar OS por Contrato
        const btnBuscarContrato = e.target.closest('#btn-buscar-contrato');
        if (btnBuscarContrato) {
            const numContrato = document.getElementById('rr-input-contrato')?.value?.trim();
            if (!numContrato) {
                mostrarToastAviso('Digite o número do contrato primeiro.');
                return;
            }
            const originalHtml = btnBuscarContrato.innerHTML;
            btnBuscarContrato.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/buscar?contrato=${encodeURIComponent(numContrato)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resp.ok) {
                    const registros = await resp.json();
                    if (registros && registros.length > 0) {
                        abrirModalListaOS('Contrato ' + numContrato, registros);
                    } else {
                        mostrarToastAviso('Nenhuma OS encontrada para este contrato.');
                    }
                } else {
                    mostrarToastAviso('Erro ao buscar contrato.');
                }
            } catch (err) {
                console.error(err);
                mostrarToastAviso('Falha na comunicação com o servidor.');
            } finally {
                btnBuscarContrato.innerHTML = originalHtml;
            }
            return;
        }

        // Botão Duplicar OS no formulário
        const btnDuplicarForm = e.target.closest('#btn-duplicar-os-form');
        if (btnDuplicarForm) {
            osState.loadedId = null;
            osState.modoDuplicado = true;
            osState.tiposServico = new Set();
            
            // Limpa o input de tipo
            const tipoServEl = document.getElementById('rr-tipo-servico');
            if (tipoServEl) tipoServEl.value = '';
            const tipoServSearch = document.getElementById('rr-tipo-servico-search');
            if (tipoServSearch) tipoServSearch.value = '';
            
            // Limpa o input de data
            const dataEl = document.getElementById('rr-input-data');
            if (dataEl) dataEl.value = '';

            // Renderiza novamente para mostrar o badge 'Modo: Duplicada'
            const container = document.getElementById('rota-redonda-container');
            if (container) {
                // Guarda valores atuais dos outros campos (exceto data e tipo) para restaurar
                const payloadForm = {
                    numero_os: document.getElementById('rr-input-os')?.value,
                    cliente: document.getElementById('rr-input-cliente')?.value,
                    endereco: document.getElementById('rr-input-endereco')?.value,
                    complemento: document.getElementById('rr-input-complemento')?.value,
                    lat: (() => { const raw = document.getElementById('rr-input-coord')?.value?.trim(); if (!raw) return osState.lat; const m = raw.match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/); return m ? parseFloat(m[1]) : osState.lat; })(),
                    lng: (() => { const raw = document.getElementById('rr-input-coord')?.value?.trim(); if (!raw) return osState.lng; const m = raw.match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/); return m ? parseFloat(m[2]) : osState.lng; })(),
                    contrato: document.getElementById('rr-input-contrato')?.value,
                    responsavel: document.getElementById('rr-input-responsavel')?.value,
                    telefone: document.getElementById('rr-input-sms')?.value,
                    email: document.getElementById('rr-input-email')?.value,
                    observacoes: document.getElementById('rr-input-obs')?.value,
                    turno: document.getElementById('rr-chk-diurno')?.checked ? 'Diurno' : (document.getElementById('rr-chk-noturno')?.checked ? 'Noturno' : ''),
                    hora_inicio: document.getElementById('rr-input-hora-inicio')?.value,
                    hora_fim: document.getElementById('rr-input-hora-fim')?.value,
                    dias_semana: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].filter(d => {
                        const m = { 'Seg': 'seg', 'Ter': 'ter', 'Qua': 'qua', 'Qui': 'qui', 'Sex': 'sex', 'Sáb': 'sab', 'Dom': 'dom' };
                        return document.getElementById(`rr-chk-${m[d]}`)?.checked;
                    }),
                    produtos: [...osState.produtos],
                    tipo_os: osState.tipoOs,
                    habilidades: [],
                    variaveis: [...osState.acoes]
                };

                // Usa a mesma função de duplicar
                duplicarOsNaTela(payloadForm);
            }
            return;
        }

        // Botão Colar OS
        const btnColarOs = e.target.closest('#btn-colar-os');
        if (btnColarOs) { abrirModalColarOS(); return; }

        // Botão Gerar OS (validação)
        const btnGerarOsFinal = e.target.closest('#btn-gerar-os-final');
        if (btnGerarOsFinal) {
            // Validação: se a OS foi digitada mas o + não foi clicado
            const numOsVal = document.getElementById('rr-input-os')?.value?.trim();
            if (numOsVal && !osState.tipoOs) {
                mostrarToastAviso('⚠️ Número de OS preenchido: clique no botão <+> ao lado do campo OS para confirmar antes de salvar.');
                const btnPlus = document.getElementById('btn-add-os-tipo');
                if (btnPlus) {
                    btnPlus.style.transition = 'transform 0.1s, box-shadow 0.1s';
                    btnPlus.style.transform = 'scale(1.3)';
                    btnPlus.style.boxShadow = '0 0 10px 4px #334155';
                    setTimeout(() => { btnPlus.style.transform = ''; btnPlus.style.boxShadow = ''; }, 600);
                }
                return;
            }

            if (osState.enderecoObrigatorio && !osState.enderecoConfirmado) {
                mostrarToastAviso('Confirme o endereço: selecione um da lista de sugestões ou use o botão G para colar as coordenadas do Google Maps.');
                // Destaca o botão G
                const btnG = document.getElementById('btn-colar-gmaps');
                if (btnG) {
                    btnG.style.transition = 'transform 0.1s, box-shadow 0.1s';
                    btnG.style.transform = 'scale(1.3)';
                    btnG.style.boxShadow = '0 0 12px 4px #16a34a';
                    setTimeout(() => { btnG.style.transform = 'scale(1)'; btnG.style.boxShadow = 'none'; }, 600);
                }
                return;
            }

            // Validação: se tiver obs de motorista, ao menos uma habilidade ou variável deve estar selecionada
            const obsMotorista = document.getElementById('rr-input-obs')?.value?.trim() || '';
            if (obsMotorista) {
                const habSel  = document.querySelectorAll('.btn-tipo-servico[style*="background: rgb(45, 158, 95)"], .btn-tipo-servico[style*="background:#2d9e5f"], .btn-tipo-servico[style*="background: #2d9e5f"]').length;
                const acaoSel = osState.acoes.size;
                if (habSel === 0 && acaoSel === 0) {
                    mostrarToastAviso('⚠️ Obs. Motoristas preenchida: selecione ao menos uma Habilidade ou Variável antes de salvar a OS.');
                    // Destaca a seção de habilidades
                    const habSection = document.querySelector('.btn-tipo-servico')?.closest('div');
                    if (habSection) {
                        habSection.style.outline = '2px solid #f59e0b';
                        habSection.style.borderRadius = '6px';
                        setTimeout(() => { habSection.style.outline = ''; }, 2500);
                    }
                    return;
                }
            }

            const diurno = document.getElementById('rr-chk-diurno');
            const noturno = document.getElementById('rr-chk-noturno');
            const horaInicio = document.getElementById('rr-input-hora-inicio');
            const horaFim = document.getElementById('rr-input-hora-fim');

            if (!diurno?.checked && !noturno?.checked) {
                mostrarToastAviso("Selecione um turno: Diurno ou Noturno.");
                return;
            }
            if (!horaInicio?.value || !horaFim?.value) {
                mostrarToastAviso("Preencha os dois horários: início e fim.");
                return;
            }

            // Coleta todos os campos do formulário
            const coordStr = document.getElementById('rr-input-coord')?.value?.trim() || '';
            const coords = extractCoordinates(coordStr);
            const lat = coords ? coords.lat : null;
            const lng = coords ? coords.lng : null;

            // Coleta dias da semana selecionados
            const diasSelecionados = [];
            const diasMap = { 'rr-chk-seg': 'Seg', 'rr-chk-ter': 'Ter', 'rr-chk-qua': 'Qua', 'rr-chk-qui': 'Qui', 'rr-chk-sex': 'Sex', 'rr-chk-sab': 'Sáb', 'rr-chk-dom': 'Dom' };
            Object.entries(diasMap).forEach(([id, label]) => {
                if (document.getElementById(id)?.checked) diasSelecionados.push(label);
            });

            // Resgata Habilidades e Variaveis
            const habilidadesSelecionadas = Array.from(osState.tiposServico);
            const variaveisSelecionadas = Array.from(osState.acoes);

            // Monta o PAYLOAD
            const payload = {
                numero_os: document.getElementById('rr-input-os')?.value?.trim() || '',
                tipo_os: osState.tipoOs || '',
                patrimonio: document.getElementById('rr-input-patrimonio')?.value?.trim() || '',
                cliente: (document.getElementById('rr-input-cliente')?.dataset?.nomeBase || document.getElementById('rr-input-cliente')?.value || '').trim(),
                endereco: document.getElementById('rr-input-endereco')?.value?.trim() || '',
                complemento: document.getElementById('rr-input-complemento')?.value?.trim() || '',
                cep: document.getElementById('rr-input-cep')?.value?.trim() || '',
                lat: isNaN(lat) ? null : lat,
                lng: isNaN(lng) ? null : lng,
                contrato: document.getElementById('rr-input-contrato')?.value?.trim() || '',
                data_os: document.getElementById('rr-input-data')?.value || '',
                responsavel: document.getElementById('rr-input-responsavel')?.value?.trim() || '',
                telefone: document.getElementById('rr-input-sms')?.value?.trim() || '',
                email: document.getElementById('rr-input-email')?.value?.trim() || '',
                tipo_servico: document.getElementById('rr-tipo-servico')?.value || '',
                hora_inicio: horaInicio?.value || '',
                hora_fim: horaFim?.value || '',
                turno: diurno?.checked ? 'Diurno' : 'Noturno',
                dias_semana: diasSelecionados,
                produtos: osState.produtos || [],
                observacoes: document.getElementById('rr-input-obs')?.value?.trim() || '',
                observacoes_internas: document.getElementById('rr-input-obs-internas')?.value?.trim() || '',
                habilidades: habilidadesSelecionadas,
                variaveis: variaveisSelecionadas,
                link_video: document.getElementById('rr-input-video')?.value?.trim() || '',
            };

            // Validação estrita de preenchimento
            if (payload.habilidades.includes('CARRETINHA') && !payload.observacoes) {
                mostrarToastAviso('É obrigatório preencher a Observação do Motorista quando a habilidade CARRETINHA estiver selecionada.');
                return;
            }
            // Variáveis que exigem obs do motorista (excluindo 'LEVAR CARRINHO' que é automático por produto)
            const VARS_EXIGEM_OBS = new Set(['ATENÇÃO AO HORÁRIO', 'INFORMAÇÕES IMPORTANTES', 'LEVAR EPI', 'LEVAR EXTENSORA', 'APOIO DE SUCÇÃO', 'INTEGRAÇÃO', 'BANHEIRO ITINERANTE']);
            const temVarManual = payload.variaveis.some(v => VARS_EXIGEM_OBS.has(v));
            if (temVarManual && !payload.observacoes) {
                mostrarToastAviso('É obrigatório preencher a Observação do Motorista quando uma Variável estiver selecionada.');
                return;
            }

            if (!payload.cliente) { mostrarToastAviso('Preencha o nome do cliente.'); return; }
            if (!payload.tipo_os) { mostrarToastAviso('Defina o tipo de OS (Obra ou Evento) clicando no botão +.'); return; }
            if (!payload.numero_os) { mostrarToastAviso('Preencha o número da OS.'); return; }
            if (!payload.contrato) { mostrarToastAviso('Preencha o Contrato.'); return; }
            if (!payload.data_os) { mostrarToastAviso('Preencha a Data da OS.'); return; }
            if (!payload.endereco) { mostrarToastAviso('Preencha o Endereço.'); return; }
            if (payload.lat === null || payload.lng === null) { mostrarToastAviso('Latitude e Longitude são obrigatórios. Use o botão G para verificar.'); return; }
            if (!payload.responsavel) { mostrarToastAviso('Preencha o Responsável.'); return; }
            if (!payload.telefone) { mostrarToastAviso('Preencha o Telefone.'); return; }
            if (!payload.turno) { mostrarToastAviso('Selecione Diurno ou Noturno.'); return; }
            if (!payload.tipo_servico) { mostrarToastAviso('Selecione o Tipo de Serviço.'); return; }
            if (osState.produtos.length === 0) { mostrarToastAviso('Adicione pelo menos um Produto.'); return; }

            // Bloqueia Manutencao para Guarita/Chuveiro/Hidraulico
            if (payload.tipo_servico.toUpperCase().includes('MANUTENCAO')) {
                const pProibidos = osState.produtos.filter(p => {
                    const d = p.desc.toUpperCase();
                    return d.includes('GUARITA') || d.includes('CHUVEIRO') || d.includes('HIDRÁULICO') || d.includes('HIDRAULICO');
                });
                if (pProibidos.length > 0) {
                    mostrarToastAviso('O equipamento selecionado (' + pProibidos[0].desc + ') não permite manutenção.');
                    return;
                }
            }

            const isManut = (payload.tipo_servico || '').toUpperCase().includes('MANUTENCAO');
            const isAvulsa = (payload.tipo_servico || '').toUpperCase().includes('AVULSA');
            const clicouAgenda = document.getElementById('rr-chk-agenda-clicado')?.value === '1';

            if (isManut && !isAvulsa) {
                if (!clicouAgenda && !osState.loadedId) {
                    mostrarToastAviso("Para serviços de Manutenção, é obrigatório clicar no botão Agenda.");
                    return;
                }
                if (payload.dias_semana.length === 0) {
                    mostrarToastAviso("Para serviços de Manutenção recorrente, é obrigatório selecionar pelo menos um dia da semana.");
                    return;
                }
            }

            // Desabilita botão durante o save
            btnGerarOsFinal.disabled = true;
            btnGerarOsFinal.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando…';

            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                
                let payloadsParaEnviar = [];
                const nomeBase = document.getElementById('rr-input-cliente')?.dataset?.nomeBase || document.getElementById('rr-input-cliente')?.value || '';

                if (osState.loadedId) {
                    payload.cliente = document.getElementById('rr-input-cliente')?.value?.trim() || `${gerarPrefixoIcones()} ${nomeBase}`.trim();
                    payloadsParaEnviar.push(payload);
                } else if (payload.tipo_servico.includes('TROCA DE EQUIPAMENTO')) {
                    const tipoOsSuffix = payload.tipo_os.toUpperCase(); // OBRA ou EVENTO
                    
                    const payloadE = { ...payload };
                    payloadE.tipo_servico = `ENTREGA ${tipoOsSuffix}`;
                    payloadE.cliente = `♻️ ${gerarPrefixoIcones('ENTREGA')} ${nomeBase}`.trim();
                    payloadsParaEnviar.push(payloadE);

                    const payloadR = { ...payload };
                    payloadR.tipo_servico = `RETIRADA ${tipoOsSuffix} PARCIAL`;
                    payloadR.cliente = `♻️ ${gerarPrefixoIcones('RETIRADA')} ${nomeBase}`.trim();
                    payloadsParaEnviar.push(payloadR);
                } else {
                    payload.cliente = document.getElementById('rr-input-cliente')?.value?.trim() || `${gerarPrefixoIcones()} ${nomeBase}`.trim();
                    payloadsParaEnviar.push(payload);
                }

                let salvosComSucesso = 0;
                let errorMsgs = [];
                let firstId = null;

                for (const p of payloadsParaEnviar) {
                    let resp;
                    if (osState.loadedId && payloadsParaEnviar.length === 1) {
                        resp = await fetch(`/api/logistica/os/${osState.loadedId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(p)
                        });
                    } else {
                        resp = await fetch('/api/logistica/os', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(p)
                        });
                    }
                    const result = await resp.json();

                    if (resp.ok && (result.ok || result.id)) {
                        salvosComSucesso++;
                        if (!firstId) firstId = result.id;
                    } else if (resp.status === 409) {
                        errorMsgs.push(`Conflito (${p.tipo_servico})`);
                    } else {
                        errorMsgs.push(`Erro (${p.tipo_servico})`);
                    }
                }

                if (salvosComSucesso === payloadsParaEnviar.length) {
                    if (payloadsParaEnviar.length > 1) {
                        mostrarToastAviso('✅ Ambas as OS da Troca foram salvas (Entrega e Retirada)!');
                    }
                    exibirModalSucessoOS(firstId, payloadsParaEnviar[0]);
                    // Atualiza histórico automaticamente
                    if (typeof window._rrRecarregarHistorico === 'function') window._rrRecarregarHistorico();
                } else if (salvosComSucesso > 0) {
                    mostrarToastAviso(`Atenção: Salvo parcialmente. Falhas: ${errorMsgs.join(', ')}`);
                } else {
                    mostrarToastAviso(`Erro ao salvar OS: ${errorMsgs.join(', ') || 'Erro desconhecido.'}`);
                }
            } catch(err) {
                console.error('[Gerar OS]', err);
                mostrarToastAviso('Falha de conexão ao salvar a OS. Tente novamente.');
            } finally {
                btnGerarOsFinal.disabled = false;
                btnGerarOsFinal.innerHTML = '<i class="ph ph-check-circle"></i> Salvar';
            }
            return;
        }


        // Botão Geocode (buscar endereço → lat/lng + mapa)
        const btnGeocode = e.target.closest('#btn-geocode-endereco');
        if (btnGeocode) { geocodeEndereco(); return; }

        // Botão Colar URL Google Maps
        const btnColarGmaps = e.target.closest('#btn-colar-gmaps');
        if (btnColarGmaps) { colarUrlGoogleMaps(); return; }

        // Botão Geocode Coord (buscar lat/lng → endereço + mapa)
        const btnGeocodeCoord = e.target.closest('#btn-geocode-coord');
        if (btnGeocodeCoord) { reverseGeocodeEndereco(); return; }

        // Botão Agenda Endereço — Passo 2 do desbloqueio
        const btnAgendaEnd = e.target.closest('#btn-agenda-endereco');
        if (btnAgendaEnd) {
            await buscarAgendaEndereco();
            // Marca agenda como verificada e libera a tela
            osState.agendaVerificada = true;
            osState.enderecoConfirmado = true;
            atualizarBloqueio();
            return;
        }

        // Pesquisar OS por endereço
        const btnBuscarEndOs = e.target.closest('#btn-buscar-endereco-os');
        if (btnBuscarEndOs) {
            const endereco = document.getElementById('rr-input-endereco')?.value.trim();
            if (!endereco) { mostrarToastAviso('Digite parte do endereço antes de pesquisar.'); return; }
            
            const originalHtml = btnBuscarEndOs.innerHTML;
            btnBuscarEndOs.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/buscar?endereco=${encodeURIComponent(endereco)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resp.ok) {
                    const registros = await resp.json();
                    if (registros && registros.length > 0) {
                        abrirModalListaOS('Endereço: ' + endereco, registros);
                    } else {
                        mostrarToastAviso('Nenhuma OS encontrada para este endereço.');
                    }
                } else {
                    mostrarToastAviso('Erro ao buscar OS.');
                }
            } catch (err) {
                console.error(err);
                mostrarToastAviso('Falha na comunicação.');
            } finally {
                btnBuscarEndOs.innerHTML = originalHtml;
            }
            return;
        }

        // Botão Limpar OS
        const btnLimpar = e.target.closest('#btn-limpar-os');
        if (btnLimpar) {
            osState.loadedId = null;
            osState.modoDuplicado = false;
            osState.produtos = []; osState.tiposServico = new Set();
      osState.acoes = new Set(); osState.clienteConfirmado = true;
            osState.enderecoConfirmado = false;
            osState.coordenadasConfirmadas = false; osState.agendaVerificada = false;
            osState.enderecoObrigatorio = false;
            osState.clienteNome = ''; osState.enderecoSelecionado = ''; osState.tipoOs = '';
            const c = document.getElementById('rota-redonda-container');
            if (c) c.innerHTML = '';
            renderRotaRedonda();
            return;
        }

        // Toggle Tipo Serviço (Habilidades)
        const btnTipo = e.target.closest('.btn-tipo-servico');
        if (btnTipo) {
            const tipo = btnTipo.dataset.tipo;
            if (osState.tiposServico.has(tipo)) osState.tiposServico.delete(tipo);
            else osState.tiposServico.add(tipo);
            atualizarUI();
            atualizarIconesCliente();
            return;
        }

        // Toggle Ação
        const btnAcao = e.target.closest('.btn-acao-azul');
        if (btnAcao) {
            const acao = btnAcao.dataset.acao;
            if (osState.acoes.has(acao)) osState.acoes.delete(acao);
            else osState.acoes.add(acao);
            atualizarUI();
            atualizarIconesCliente();
            return;
        }

        // Adicionar Produto — abre popup OBRA/EVENTO se ainda não definido
        const btnAddProd = e.target.closest('#btn-add-produto');
        if (btnAddProd) {
            const adicionarProduto = () => {
                const descRaw = document.getElementById('rr-prod-desc')?.value.trim().toUpperCase();
                const qtd = parseInt(document.getElementById('rr-prod-qtd')?.value) || 1;
                if (!descRaw) return;
                
                // Remove ícones se vieram do dropdown
                let descLimpa = descRaw;
                for (const key in EQUIPAMENTOS_DICT) {
                    if (descRaw.includes(key)) {
                        descLimpa = key;
                        break;
                    }
                }
                
                const jaExiste = osState.produtos.find(p => p.desc.trim().toUpperCase() === descLimpa.trim().toUpperCase());
                if (jaExiste) {
                    mostrarToastAviso(`⚠️ O produto "${descLimpa}" já foi adicionado! Edite a quantidade na tabela se necessário.`);
                    document.getElementById('rr-prod-desc').value = '';
                    document.getElementById('rr-prod-qtd').value = '';
                    return;
                }

                osState.produtos.push({ id: Date.now(), desc: descLimpa, qtd });
                document.getElementById('rr-prod-desc').value = '';
                document.getElementById('rr-prod-qtd').value = '';
                atualizarUI();
                atualizarIconesCliente();
                // Recalcula tempo e carga com a lista inteira
                calcularTempo();
                // Recalcula habilidades (preserva manuais ao adicionar produto)
                aplicarHabilidadesDoServico(false);
                // Atualiza badge tipo OS na tela
                const badge = document.getElementById('rr-badge-tipo-os');
                if (badge) badge.textContent = osState.tipoOs;
            };

            if (!osState.tipoOs) {
                // Ainda não definiu Obra ou Evento — exibe popup
                abrirPopupTipoOs((tipo) => {
                    osState.tipoOs = tipo;
                    atualizarDropdownProdutos();
                    adicionarProduto();
                });
            } else {
                adicionarProduto();
            }
            return;
        }

        const btnRemProd = e.target.closest('.btn-rem-prod');
        if (btnRemProd) {
            const id = Number(btnRemProd.dataset.id);
            osState.produtos = osState.produtos.filter(p => p.id !== id);
            atualizarUI();
            atualizarIconesCliente();
            calcularTempo(); // recalcula ao remover
            aplicarHabilidadesDoServico(false); // recalcula habilidades mantendo manuais
            return;
        }

        // Editar Produto
        const btnEditProd = e.target.closest('.btn-edit-prod');
        if (btnEditProd) {
            const id = Number(btnEditProd.dataset.id);
            const p = osState.produtos.find(x => x.id === id);
            if (p) {
                // Preenche os campos
                const inputDesc = document.getElementById('rr-prod-desc');
                const inputQtd = document.getElementById('rr-prod-qtd');
                if (inputDesc) inputDesc.value = p.desc;
                if (inputQtd) inputQtd.value = p.qtd;
                // Remove da lista
                osState.produtos = osState.produtos.filter(x => x.id !== id);
                atualizarUI();
                atualizarIconesCliente();
                calcularTempo();
                aplicarHabilidadesDoServico(false);
            }
            return;
        }
        
        // (Limpar OS já tratado acima pelo novo handler)

        // Pesquisar OS do cliente
        const btnPesqCliente = e.target.closest('#btn-pesq-cliente-os');
        if (btnPesqCliente) {
            let nome = document.getElementById('rr-input-cliente')?.value.trim();
            if (!nome) { alert('Digite o nome do cliente antes de pesquisar.'); return; }
            nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🔴🟢]+/u, '').trim();
            abrirModalOSCliente(nome);
            return;
        }

        // Pesquisar endereço do cliente
        const btnBuscarEndereco = e.target.closest('#btn-buscar-endereco');
        if (btnBuscarEndereco) {
            const nome = document.getElementById('rr-input-cliente')?.value.trim();
            if (!nome) { alert('Digite o nome do cliente antes de pesquisar o endereço.'); return; }
            abrirModalEnderecos(nome);
            return;
        }

        // Confirmar endereço no modal
        const btnConfEnd = e.target.closest('.btn-confirmar-endereco');
        if (btnConfEnd) {
            osState.clienteConfirmado = true;
            osState.clienteNome = btnConfEnd.dataset.nome;
            osState.enderecoSelecionado = btnConfEnd.dataset.endereco;
            const inp = document.getElementById('rr-input-endereco');
            if (inp) inp.value = btnConfEnd.dataset.endereco;
            document.getElementById('rr-modal-enderecos')?.remove();
            // atualizarBloqueio();
            return;
        }

        // Fechar modal endereços com X — libera o formulário mesmo sem selecionar
        const btnFecharModal = e.target.closest('#btn-fechar-modal-end');
        if (btnFecharModal) {
            document.getElementById('rr-modal-enderecos')?.remove();
            osState.clienteConfirmado = true; // Libera o formulário
            // atualizarBloqueio();
            return;
        }

        // Fechar modal OS do cliente
        const btnFecharModalOS = e.target.closest('#btn-fechar-modal-os');
        if (btnFecharModalOS) {
            document.getElementById('rr-modal-os-cliente')?.remove();
            return;
        }
    });
});

// ── BLOQUEIO PROGRESSIVO ──────────────────────────────────────────────────
// ── BLOQUEIO PROGRESSIVO ──────────────────────────────────────────────────
function atualizarBloqueio() {
    const overlayOS  = document.getElementById('rr-overlay-bloqueio');
    const overlayEnd = document.getElementById('rr-overlay-bloqueio-endereco');

    if (osState.loadedId) {
        // OS existente: remove os overlays mas NÃO retorna — continua para liberar os dias
        if (overlayOS) overlayOS.style.display = 'none';
        if (overlayEnd) overlayEnd.style.display = 'none';
        // Se ainda não marcou agenda verificada, libera de qualquer forma para OS existentes
        if (!osState.agendaVerificada) osState.agendaVerificada = true;
    } else {
        // Bloqueio principal: cobre o bloco inferior até definir Obra/Evento
        if (overlayOS) {
            overlayOS.style.display = osState.tipoOs ? 'none' : 'flex';
        }
    }

    // Controle de bloqueio dos dias da semana (desabilita até validar agenda)
    const idsDias = ['rr-chk-seg', 'rr-chk-ter', 'rr-chk-qua', 'rr-chk-qui', 'rr-chk-sex', 'rr-chk-sab', 'rr-chk-dom'];
    idsDias.forEach(id => {
        const chk = document.getElementById(id);
        const lbl = document.getElementById(`lbl-${id}`);
        if (chk) {
            chk.disabled = !osState.agendaVerificada;
            if (!osState.agendaVerificada) {
                chk.checked = false;
                if (lbl) {
                    lbl.style.background = 'transparent';
                    lbl.style.opacity = '0.4';
                    lbl.style.color = lbl.dataset.cor || '';
                }
            } else {
                if (lbl) {
                    lbl.style.opacity = '1';
                    lbl.style.background = chk.checked ? (lbl.dataset.cor || '') : 'transparent';
                    lbl.style.color = chk.checked ? 'white' : (lbl.dataset.cor || '');
                }
            }
        }
    });

    if (osState.loadedId) return; // OS existente: overlays já tratados, dias liberados — encerra aqui

    if (!overlayEnd) return;

    // Se o tipoOs ainda não foi definido, o endereço nem deve ter overlay (pois o principal já cobre)
    if (!osState.tipoOs) {
        overlayEnd.style.display = 'none';
        return;
    }

    // Desbloqueado: G concluído
    if (osState.enderecoConfirmado || osState.coordenadasConfirmadas) {
        overlayEnd.style.display = 'none';

    // Passo 0: aguardando botão G
    } else {
        overlayEnd.style.display = 'flex';
        overlayEnd.innerHTML = `
            <div style="text-align:center;padding:1.2rem;">
                <div style="font-size:1.6rem;margin-bottom:0.4rem;">&#127758;</div>
                <div style="font-weight:700;font-size:0.85rem;color:#1e293b;margin-bottom:0.3rem;">Confirme o endereço no mapa</div>
                <div style="font-size:0.75rem;color:#475569;">Use o botão <strong style="color:#16a34a;">G</strong> para abrir o Google Maps e confirmar as coordenadas do endereço.</div>
            </div>`;
        overlayEnd.style.background = 'rgba(248,250,252,0.90)';
        overlayEnd.style.cursor = 'pointer';
    }
}

// ── ATUALIZA LISTA DE PRODUTOS FILTRADA POR OBRA/EVENTO ───────────────────

// ── FILTRO DO DROPDOWN DE TIPO DE SERVIÇO ─────────────────────────────────
window.filtrarTiposServico = function(texto) {
    const q = texto.trim().toLowerCase();
    // Filtra por categoria (Obra/Evento) e pelo texto digitado
    const categoria = (osState.tipoOs || '').toUpperCase(); // 'OBRA', 'EVENTO' ou ''
    document.querySelectorAll('.rr-tipo-opt').forEach(el => {
        const val = el.dataset.val.toUpperCase();
        const matchCategoria = !categoria || val.includes(categoria);
        const matchTexto     = !q || val.toLowerCase().includes(q);
        el.style.display = (matchCategoria && matchTexto) ? 'block' : 'none';
    });
    document.getElementById('rr-tipo-dropdown').style.display = 'block';
};
window.selecionarTipoServico = function(val) {
    const search = document.getElementById('rr-tipo-servico-search');
    const hidden = document.getElementById('rr-tipo-servico');
    const drop   = document.getElementById('rr-tipo-dropdown');
    if (search) search.value = val;
    if (hidden) { hidden.value = val; hidden.dispatchEvent(new Event('change')); }
    if (drop)   drop.style.display = 'none';
};

// ── AUTO-SELEÇÃO DE HABILIDADES/VARIÁVEIS POR PALAVRAS-CHAVE NA OBS ────────
window.autoSelecionarPorObs = function() {
    const obs = (document.getElementById('rr-input-obs')?.value || '').toLowerCase();

    // Mapeamento palavra-chave → habilidade
    const habKeywords = [
        { keys: ['vac'],                                              hab: 'VAC' },
        { keys: ['strada','utilitario','utiliário','courrier','pequeno'], hab: 'UTILITARIO' },
        { keys: ['carretinha'],                                       hab: 'CARRETINHA' },
    ];
    habKeywords.forEach(({ keys, hab }) => {
        const match = keys.some(k => obs.includes(k));
        const btn = document.querySelector(`.btn-tipo-servico[data-tipo="${hab}"]`);
        if (!btn) return;
        if (match && !osState.tiposServico.has(hab)) {
            osState.tiposServico.add(hab);
            btn.style.background = '#2d9e5f';
            btn.style.color = 'white';
        }
        // Nota: não remove automaticamente ao apagar o texto
    });

    // Mapeamento palavra-chave → variável
    const acaoKeywords = [
        { keys: ['troca', 'trocar'], acao: 'TROCA DE EQUIPAMENTO' },
        { keys: ['carrinho'],               acao: 'LEVAR CARRINHO' },
        { keys: ['extensora'],              acao: 'LEVAR EXTENSORA' },
        { keys: ['apoio'],                  acao: 'APOIO DE SUCCÃO' },
        { keys: ['epi'],                    acao: 'LEVAR EPI' },
        { keys: ['integração','integracao'], acao: 'INTEGRAÇÃO' },
        { keys: ['itinerante'],             acao: 'BANHEIRO ITINERANTE' },
    ];
    acaoKeywords.forEach(({ keys, acao }) => {
        const match = keys.some(k => obs.includes(k));
        const btn = document.querySelector(`.btn-acao-azul[data-acao="${acao}"]`);
        if (!btn) return;
        if (match && !osState.acoes.has(acao)) {
            osState.acoes.add(acao);
            btn.style.background = '#0284c7';
            btn.style.color = 'white';
        }
        // Nota: não remove automaticamente ao apagar o texto
    });

    atualizarIconesCliente();
};

window.onChangeTipoServico = function() {
    const val = (document.getElementById('rr-tipo-servico')?.value || '').toUpperCase();
    if (val.includes('VAC')) {
        osState.tiposServico.add('VAC');
    } else {
        osState.tiposServico.delete('VAC');
    }
    // Aplica habilidades automáticas do serviço. Como mudou o serviço, desabilita as que não fazem parte (wipeManuals=true)
    aplicarHabilidadesDoServico(true);
    atualizarUI();
    calcularTempo();
    atualizarIconesCliente();
};

// ── HABILIDADES AUTOMÁTICAS POR TIPO DE SERVIÇO (espelho do recalcularHabilidadesAutomaticas do Flutter) ──
function aplicarHabilidadesDoServico(wipeManuals = false) {
    const tipoServico = (document.getElementById('rr-tipo-servico')?.value || '').trim().toUpperCase();

    // ─ habilidadesDict (igual ao Flutter)
    const HABILIDADES_DICT = {
        'LIMPA FOSSA OBRA':          'TANQUE GRANDE',
        'LIMPA FOSSA EVENTO':        'TANQUE GRANDE',
        'ENTREGA OBRA':              'CARGA',
        'ENTREGA EVENTO':            'CARGA',
        'RETIRADA OBRA':             'CARGA, TANQUE',
        'RETIRADA EVENTO':           'CARGA, TANQUE',
        'RETIRADA OBRA TOTAL':       'CARGA, TANQUE',
        'RETIRADA EVENTO TOTAL':     'CARGA, TANQUE',
        'RETIRADA OBRA PARCIAL':     'CARGA, TANQUE',
        'RETIRADA EVENTO PARCIAL':   'CARGA, TANQUE',
        'MANUTENCAO OBRA':           'TANQUE',
        'MANUTENCAO EVENTO':         'TANQUE',
        'MANUTENCAO AVULSA OBRA':    'TANQUE',
        'MANUTENCAO AVULSA EVENTO':  'TANQUE',
        'MANUTENCAO AVULSA':         'TANQUE',
        'TROCA DE EQUIPAMENTO OBRA': 'CARGA, TANQUE',
        'TROCA DE EQUIPAMENTO EVENTO': 'CARGA, TANQUE',
        'VAC OBRA':                  'VAC',
        'VAC EVENTO':                'VAC',
        'SUCCAO EVENTO':             'TANQUE GRANDE',
        'REPARO EQUIPAMENTO OBRA':   '',
        'REPARO EQUIPAMENTO EVENTO': '',
    };

    // ─ ProdutosDict (variáveis automáticas por produto)
    const PRODUTOS_DICT = {
        'HIDRÁULICO OBRA':    'LEVAR CARRINHO',
        'HIDRÁULICO EVENTO':  'LEVAR CARRINHO',
        'CHUVEIRO OBRA':      'LEVAR CARRINHO',
        'CHUVEIRO EVENTO':    'LEVAR CARRINHO',
        'ELX OBRA':           'LEVAR CARRINHO',
        'ELX EVENTO':         'LEVAR CARRINHO',
    };

    // 1) Habilidades base do serviço
    const habilidadesBase = new Set();
    const habStr = HABILIDADES_DICT[tipoServico] || '';
    habStr.split(',').map(h => h.trim()).filter(Boolean).forEach(h => {
        habilidadesBase.add(h);
    });

    // 1b) Para retiradas: remover TANQUE se TODOS os produtos forem do grupo que não precisa de tanque
    //     (hidráulico, chuveiro, guarita individual, guarita dupla, PBII, mictório)
    const isRetirada = tipoServico.includes('RETIRADA');
    if (isRetirada && habilidadesBase.has('TANQUE') && osState.produtos.length > 0) {
        const PRODS_SEM_TANQUE = new Set([
            'HIDRÁULICO OBRA', 'HIDRÁULICO EVENTO', 'HIDRAULICO OBRA', 'HIDRAULICO EVENTO',
            'CHUVEIRO OBRA', 'CHUVEIRO EVENTO',
            'GUARITA INDIVIDUAL OBRA', 'GUARITA INDIVIDUAL EVENTO',
            'GUARITA DUPLA OBRA', 'GUARITA DUPLA EVENTO',
            'PBII OBRA', 'PBII EVENTO',
            'MICTORIO OBRA', 'MICTÓRIO OBRA', 'MICTORIO EVENTO', 'MICTÓRIO EVENTO',
        ]);
        const todosSemTanque = osState.produtos.every(p =>
            PRODS_SEM_TANQUE.has((p.desc || '').trim().toUpperCase())
        );
        if (todosSemTanque) {
            habilidadesBase.delete('TANQUE');
            console.log('[Habilidades] Retirada sem TANQUE: todos os produtos são do grupo sem-tanque.');
        }
    }

        // 2) Habilidades automáticas por produto (via ProdutosDict)
    const habProdutos = new Set();
    const acoesProdutos = new Set();
    const isEntregaRetirada = tipoServico.includes('ENTREGA') || tipoServico.includes('RETIRADA');

    osState.produtos.forEach(p => {
        const desc = (p.desc || '').trim().toUpperCase();
        const hab = PRODUTOS_DICT[desc];
        if (hab) {
            if (hab === 'LEVAR CARRINHO') {
                if (isEntregaRetirada) acoesProdutos.add('LEVAR CARRINHO');
            } else {
                habProdutos.add(hab);
            }
        }
    });

    // 3) Preserva manuais se não for para limpar (wipeManuals)
    let manuais = new Set();
    if (!wipeManuals) {
        const TODAS_AUTO = new Set([...habilidadesBase, ...habProdutos]);
        manuais = new Set([...osState.tiposServico].filter(h => !TODAS_AUTO.has(h)));
    }

    // 4) Reconstrói o conjunto final
    osState.tiposServico = new Set([...habilidadesBase, ...habProdutos, ...manuais]);
    
    // 5) Mescla Ações Automáticas
    acoesProdutos.forEach(acao => osState.acoes.add(acao));

    console.log('[Habilidades] Tipo:', tipoServico, '| Selecionadas:', [...osState.tiposServico], '| wipeManuals:', wipeManuals);
}

function atualizarDropdownProdutos() {
    const datalist = document.getElementById('rr-prod-list');
    const badge = document.getElementById('rr-badge-tipo-os');
    if (!datalist) return;

    const descAdicionadas = osState.produtos.map(p => p.desc.trim().toUpperCase());
      const produtos = getProdutosPorTipo(osState.tipoOs).filter(p => !descAdicionadas.includes(p.nome.trim().toUpperCase()));
      datalist.innerHTML = produtos.map(p =>
          `<option value="${p.icone} ${p.nome}"></option>`
      ).join('');

    if (badge) {
        badge.textContent = osState.tipoOs || '';
        badge.style.background = osState.tipoOs === 'Obra' ? '#156EB6' : osState.tipoOs === 'Evento' ? '#8E24AA' : '#94a3b8';
        badge.style.display = osState.tipoOs ? 'inline-flex' : 'none';
    }
    const imgTipo = document.getElementById('rr-img-tipo-os');
    if (imgTipo) {
        if (osState.tipoOs === 'Obra') {
            imgTipo.src = 'assets/obra.png';
            imgTipo.style.display = 'block';
        } else if (osState.tipoOs === 'Evento') {
            imgTipo.src = 'assets/evento.png';
            imgTipo.style.display = 'block';
        } else {
            imgTipo.style.display = 'none';
        }
    }

    // Filtra o dropdown de Tipo de Serviço pelo tipo selecionado (Obra/Evento)
    // rr-tipo-servico agora é um hidden input — filtra as opções do dropdown customizado
    if (osState.tipoOs) {
        const filtro = osState.tipoOs.toUpperCase(); // 'OBRA' ou 'EVENTO'
        document.querySelectorAll('.rr-tipo-opt').forEach(opt => {
            if (!opt.dataset.val) return;
            opt.style.display = opt.dataset.val.toUpperCase().includes(filtro) ? 'block' : 'none';
        });
    }
}

function gerarPrefixoIcones(tipoOverride = null) {
    const tipoServico = (tipoOverride || document.getElementById('rr-tipo-servico')?.value || '').toUpperCase();

    // Coleta ícones dos produtos selecionados
    const iconesProdutos = [];
    osState.produtos.forEach(p => {
        const prod = EQUIPAMENTOS_DICT[p.desc.trim()];
        if (prod?.icone && !iconesProdutos.includes(prod.icone)) {
            iconesProdutos.push(prod.icone);
        }
    });

    let iconeServico = '';
    if (tipoServico.includes('RETIRADA')) {
        if (tipoServico.includes('TOTAL')) {
            iconeServico = '⭕';
        } else {
            iconeServico = '🔶'; // Parcial
        }
    } else if (tipoServico.includes('SUCCAO')) {
        iconeServico = '💧';
    } else if (tipoServico.includes('LIMPA FOSSA')) {
        iconeServico = '💦';
    } else if (tipoServico.includes('REPARO')) {
        iconeServico = '🔧';
    } else if (tipoServico.includes('VISITA TÉCNICA') || tipoServico.includes('VISITA TECNICA')) {
        iconeServico = '⚙️';
    } else if (tipoServico.includes('MANUTENCAO')) {
        iconeServico = tipoServico.includes('AVULSA') ? '❗' : '';
    } else if (tipoServico.includes('VAC')) {
        iconeServico = '🏗️';
    } else if (tipoServico.includes('TROCA')) {
        iconeServico = '♻️';
    }

    const iconesVariaveis = [];
    document.querySelectorAll('.btn-acao-azul').forEach(btn => {
        const acao = btn.dataset.acao;
        if (osState.acoes.has(acao) && ACOES_DICT[acao]) {
            iconesVariaveis.push(ACOES_DICT[acao]);
        }
    });

    // Ícones extras das Habilidades
    if (osState.tiposServico.has('VAC') && !iconesVariaveis.includes('🏗️')) iconesVariaveis.push('🏗️');
    if (osState.tiposServico.has('CARRETINHA') && !iconesVariaveis.includes('🔗')) iconesVariaveis.push('🔗');
    if (osState.tiposServico.has('UTILITARIO') && !iconesVariaveis.includes('🛻')) iconesVariaveis.push('🛻');

    // Mostrar ícones dos produtos APENAS para serviços de ENTREGA
    const isEntrega = tipoServico.includes('ENTREGA');

    let todosIcones = [];
    if (isEntrega) {
        todosIcones = [...new Set([iconeServico, ...iconesProdutos, ...iconesVariaveis].filter(Boolean))];
    } else {
        todosIcones = [...new Set([iconeServico, ...iconesVariaveis].filter(Boolean))];
    }
    
    // Se for Noturno, adiciona 🌘 na frente de tudo!
    if (document.getElementById('rr-chk-noturno')?.checked) {
        todosIcones.unshift('🌘');
    }
    
    return todosIcones.join('');
}

// Atualiza os ícones de produtos/serviços no nome do cliente
function atualizarIconesCliente() {
    const clienteInput = document.getElementById('rr-input-cliente');
    if (!clienteInput) return;

    let nomeBase = clienteInput.dataset.nomeBase;
    if (!nomeBase) {
        nomeBase = clienteInput.value.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊]+/u, '').trim();
        clienteInput.dataset.nomeBase = nomeBase || clienteInput.value.trim();
    }

    const prefixo = gerarPrefixoIcones();
    clienteInput.value = `${prefixo} ${nomeBase}`.trim();
}


async function abrirModalOSCliente(nomeCliente) {
    document.getElementById('rr-modal-os-cliente')?.remove();

    // Loading spinner modal
    const loadingEl = document.createElement('div');
    loadingEl.id = 'rr-modal-os-cliente';
    loadingEl.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;';
    loadingEl.innerHTML = `<div style="background:white;border-radius:10px;padding:2rem 3rem;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
        <i class="ph ph-spinner ph-spin" style="font-size:2rem;color:#2d9e5f;"></i>
        <p style="margin-top:0.75rem;font-size:0.9rem;color:#475569;">Buscando OS de <b>${nomeCliente}</b>...</p>
    </div>`;
    document.body.appendChild(loadingEl);

    let registros = [];
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        // Mantém acentos e caracteres especiais do português na pesquisa
        const nomeClean = nomeCliente.trim();
        const resp = await fetch(`/api/logistica/os/buscar?cliente=${encodeURIComponent(nomeClean)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) registros = await resp.json();
    } catch(e) { console.error('Erro ao buscar OS por cliente', e); }

    loadingEl.remove();

    const gerarLinhas = (regs) => regs.map((r, i) => {
        let prod = '—'; let prodData = '';
        try {
            const pp = JSON.parse(r.produtos);
            if (Array.isArray(pp) && pp.length > 0) {
                prodData = pp.map(p => (p.desc||'').toLowerCase()).join(' | ');
                prod = pp.map(p => {
                    const info = typeof EQUIPAMENTOS_DICT !== 'undefined' ? EQUIPAMENTOS_DICT[p.desc?.trim()] : null;
                    const ic = info?.icone ? `${info.icone} ` : '';
                    return `<span style="background:#1e40af;color:white;padding:2px 5px;border-radius:10px;margin-right:3px;font-size:0.68rem;">${ic}${p.desc} (${p.qtd})</span>`;
                }).join('');
            }
        } catch(e) {}
        let dSemana = '—';
        try { dSemana = JSON.parse(r.dias_semana).map(d => `<span style="background:#2563eb;color:white;padding:2px 5px;border-radius:4px;margin-right:3px;font-size:0.68rem;">${d}</span>`).join(''); } catch(e) {}
        let hab = '—';
        try { const h = JSON.parse(r.habilidades); if(h && h.length) hab = h.join(', '); } catch(e) { if(r.habilidades) hab = r.habilidades; }
        let varis = '—';
        try { const v = JSON.parse(r.variaveis); if(v && v.length) varis = v.join(', '); } catch(e) { if(r.variaveis) varis = r.variaveis; }
        const dataFormatada = r.data_os ? r.data_os.split('-').reverse().join('/') : '—';
        
        let bgColor = 'transparent';
        let hoverColor = '#f1f5f9';
        const tServ = (r.tipo_servico || '').toUpperCase();
        if (tServ.includes('ENTREGA')) { bgColor = '#bbf7d0'; hoverColor = '#86efac'; }
        else if (tServ.includes('RETIRADA')) { bgColor = '#fef9c3'; hoverColor = '#fef08a'; }
        else if (tServ.includes('LIMPA FOSSA')) { bgColor = '#bfdbfe'; hoverColor = '#93c5fd'; }
        else if ((tServ.includes('MANUTEN') || tServ.includes('VAC')) && !tServ.includes('AVULSA')) { bgColor = '#e2e8f0'; hoverColor = '#cbd5e1'; }
        else { bgColor = '#ffffff'; hoverColor = '#f8fafc'; }

        return `
            <tr class="rr-os-row-cli" data-idx="${i}" data-cliente="${(r.cliente||'').toLowerCase()}" data-endereco="${(r.endereco||'').toLowerCase()}" data-tipo="${(r.tipo_servico||'').toLowerCase()}" data-data="${r.data_os||''}" data-produto="${prodData}" style="border-bottom:1px solid #e2e8f0;background:${bgColor};transition:background 0.2s;" onmouseover="this.style.background='${hoverColor}'" onmouseout="this.style.background='${bgColor}'">
                <td style="padding:0.6rem 0.5rem;white-space:nowrap;font-weight:700;color:#2d9e5f;">${r.numero_os}</td>
                <td style="padding:0.6rem 0.5rem;font-weight:600;cursor:pointer;" onclick='window._carregarRegistroNaTela(${JSON.stringify(r)})' title="Clique para carregar">${r.cliente}</td>
                <td style="padding:0.6rem 0.5rem;font-size:0.78rem;">${r.endereco||'—'}</td>
                <td style="padding:0.6rem 0.5rem;font-size:0.78rem;">${r.tipo_servico||'—'}</td>
                <td style="padding:0.6rem 0.5rem;white-space:nowrap;">${dataFormatada}</td>
                <td style="padding:0.6rem 0.5rem;">${dSemana}</td>
                <td style="padding:0.6rem 0.5rem;font-size:0.78rem;">${hab}</td>
                <td style="padding:0.6rem 0.5rem;">${prod}</td>
                <td style="padding:0.6rem 0.5rem;white-space:nowrap;">
                    <button style="background:transparent;border:none;cursor:pointer;padding:4px;" onclick='window._carregarRegistroNaTela(${JSON.stringify(r)})' title="Editar"><i class="ph ph-pencil-simple" style="color:#f59e0b;font-size:1.1rem;"></i></button>
                    <button style="background:transparent;border:none;cursor:pointer;padding:4px;" onclick='window._excluirOsLista(${r.id})' title="Excluir"><i class="ph ph-trash" style="color:#ef4444;font-size:1.1rem;"></i></button>
                </td>
            </tr>`;
    }).join('');

    const totalLabel = registros.length > 0 ? `${registros.length} registro(s)` : 'Nenhuma OS encontrada';
    const modal = document.createElement('div');
    modal.id = 'rr-modal-os-cliente';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;width:100vw;height:100vh;max-width:100vw;max-height:100vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:none;">
            <div style="background:#2d9e5f;color:white;padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div>
                    <h3 style="margin:0;font-size:1.1rem;font-weight:700;"><i class="ph ph-clipboard-text"></i> OS de ${nomeCliente}</h3>
                    <p style="margin:0;font-size:0.75rem;opacity:0.85;">${totalLabel}. Duplo clique no cliente para carregar.</p>
                </div>
                <button id="btn-fechar-modal-os" style="background:transparent;border:none;color:white;font-size:1.5rem;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:0.6rem 1rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;flex-shrink:0;">
                <input type="text" id="rr-filter-cli-os" placeholder="🔍 Cliente..." style="flex:1;min-width:110px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.8rem;outline:none;">
                <input type="text" id="rr-filter-end-os" placeholder="🔍 Endereço..." style="flex:1;min-width:110px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.8rem;outline:none;">
                <input type="text" id="rr-filter-tipo-os" placeholder="🔍 Tipo de Serviço..." style="flex:1;min-width:130px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.8rem;outline:none;">
                <input type="date" id="rr-filter-data-os" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.8rem;outline:none;" title="Filtrar por data">
                <select id="rr-filter-prod-os" style="flex:1;min-width:110px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.8rem;outline:none;"><option value="">🔍 Produto...</option></select>
                <button onclick="['rr-filter-cli-os','rr-filter-end-os','rr-filter-tipo-os','rr-filter-data-os','rr-filter-prod-os'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.querySelectorAll('.rr-os-row-cli').forEach(r=>r.style.display='');" style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:4px;font-size:0.78rem;cursor:pointer;white-space:nowrap;">✖ Limpar</button>
            </div>
            <div style="overflow-y:auto;flex:1;">
                <table style="width:100%;border-collapse:collapse;font-size:0.82rem;text-align:left;">
                    <thead style="position:sticky;top:0;z-index:1;">
                        <tr style="background:#2d9e5f;color:white;">
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Nº OS</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Cliente</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Endereço</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Tipo Serviço</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Data</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Dias Semana</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Habilidades</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;">Produtos</th>
                            <th style="padding:0.6rem 0.5rem;font-weight:600;width:70px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="rr-tbody-os-cli">${gerarLinhas(registros) || '<tr><td colspan="9" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhuma OS encontrada para este cliente.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#btn-fechar-modal-os')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Populate product dropdown with unique products from all registros
    const prodSelect = document.getElementById('rr-filter-prod-os');
    if (prodSelect) {
        const allProds = new Set();
        registros.forEach(r => {
            try {
                const pp = JSON.parse(r.produtos);
                if (Array.isArray(pp)) pp.forEach(p => { if(p.desc) allProds.add(p.desc); });
            } catch(e) {}
        });
        allProds.forEach(nome => {
            const info = typeof EQUIPAMENTOS_DICT !== 'undefined' ? EQUIPAMENTOS_DICT[nome?.trim()] : null;
            const ic = info?.icone ? info.icone + ' ' : '';
            const opt = document.createElement('option');
            opt.value = nome.toLowerCase();
            opt.textContent = ic + nome;
            prodSelect.appendChild(opt);
        });
    }

    // Double-click on client td loads the OS
    modal.querySelectorAll('.rr-os-row-cli td:nth-child(2)').forEach(td => {
        td.style.cursor = 'pointer';
        td.title = 'Duplo clique para editar';
        td.addEventListener('dblclick', () => {
            const row = td.closest('tr');
            if (!row) return;
            const idx = parseInt(row.dataset.idx);
            if (!isNaN(idx) && registros[idx]) {
                window._carregarRegistroNaTela(registros[idx]);
            }
        });
    });

    const filterCli = () => {
        const fCli  = (document.getElementById('rr-filter-cli-os')?.value  || '').toLowerCase();
        const fEnd  = (document.getElementById('rr-filter-end-os')?.value  || '').toLowerCase();
        const fTipo = (document.getElementById('rr-filter-tipo-os')?.value || '').toLowerCase();
        const fData = (document.getElementById('rr-filter-data-os')?.value || '');
        const fProd = (document.getElementById('rr-filter-prod-os')?.value || '').toLowerCase();
        document.querySelectorAll('.rr-os-row-cli').forEach(row => {
            const ok = (row.dataset.cliente  || '').includes(fCli)
                    && (row.dataset.endereco || '').includes(fEnd)
                    && (row.dataset.tipo     || '').includes(fTipo)
                    && (!fData || (row.dataset.data || '') === fData)
                    && (row.dataset.produto  || '').includes(fProd);
            row.style.display = ok ? '' : 'none';
        });
    };
    ['rr-filter-cli-os','rr-filter-end-os','rr-filter-tipo-os','rr-filter-data-os','rr-filter-prod-os']
        .forEach(id => document.getElementById(id)?.addEventListener('change', filterCli));
    ['rr-filter-cli-os','rr-filter-end-os','rr-filter-tipo-os'].forEach(id => document.getElementById(id)?.addEventListener('input', filterCli));
}

function abrirModalEnderecos(nomeCliente) {
    document.getElementById('rr-modal-enderecos')?.remove();
    // Futuramente: buscar endereços reais do backend
    const enderecosMock = [
        { endereco: 'Rua das Flores, 123 - Centro', lat: '-23.5', lng: '-46.6' },
        { endereco: 'Av. Paulista, 456 - Bela Vista', lat: '-23.56', lng: '-46.65' },
        { endereco: 'Rua Geral, 789 - Jardins', lat: '-23.57', lng: '-46.66' },
    ];
    const linhas = enderecosMock.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:0.8rem;color:#334155;"><i class="ph ph-map-pin" style="color:#2d9e5f;"></i> ${e.endereco}</span>
            <button class="btn-confirmar-endereco" data-endereco="${e.endereco}" data-nome="${nomeCliente}"
                style="background:#2d9e5f;color:white;border:none;border-radius:4px;padding:3px 10px;font-size:0.72rem;cursor:pointer;white-space:nowrap;margin-left:8px;">
                <i class="ph ph-check"></i> Selecionar
            </button>
        </div>
    `).join('');
    const modal = document.createElement('div');
    modal.id = 'rr-modal-enderecos';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:10px;width:520px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);overflow:hidden;">
            <div style="background:#2d9e5f;color:white;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;font-size:0.9rem;"><i class="ph ph-map-pin"></i> Endereços de <em>${nomeCliente}</em></span>
                <button id="btn-fechar-modal-end" style="background:transparent;border:none;color:white;font-size:1.1rem;cursor:pointer;" title="Fechar e liberar formulário"><i class="ph ph-x"></i></button>
            </div>
            <div style="max-height:260px;overflow-y:auto;">${linhas}</div>
            <div style="padding:0.5rem 0.75rem;background:#f8fafc;font-size:0.72rem;color:#94a3b8;text-align:center;">Selecione para preencher endereço automaticamente — ou feche (X) para preencher manualmente</div>
        </div>
    `;
    document.body.appendChild(modal);
    // Fechar ao clicar no backdrop (fora da caixa)
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    // Fechar ao clicar no botão X
    modal.querySelector('#btn-fechar-modal-end')?.addEventListener('click', () => modal.remove());
}
// ─────────────────────────────────────────────────────────────────────────────

function atualizarUI() {
    // Atualiza Tipos (Habilidades)
    document.querySelectorAll('.btn-tipo-servico').forEach(btn => {
        const tipo = btn.dataset.tipo;
        if (osState.tiposServico.has(tipo)) {
            btn.style.background = '#2d9e5f';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#2d9e5f';
        }
    });

    // Atualiza Ações
    document.querySelectorAll('.btn-acao-azul').forEach(btn => {
        const acao = btn.dataset.acao;
        if (osState.acoes.has(acao)) {
            btn.style.background = '#0284c7';
            btn.style.color = 'white';
        } else {
            btn.style.background = '#f0f9ff';
            btn.style.color = '#0284c7';
        }
    });

    // Atualiza Tabela Produtos
    const tbody = document.getElementById('rr-tbody-produtos');
    const totalItens = osState.produtos.reduce((acc, p) => acc + p.qtd, 0);
    
    if (osState.produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 1rem; color: #94a3b8; font-size:0.8rem;">Nenhum produto adicionado</td></tr>';
    } else {
        tbody.innerHTML = osState.produtos.map(p => {
            const icone = EQUIPAMENTOS_DICT[p.desc]?.icone || '📦';
            return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 0.3rem 0.5rem; font-size:0.75rem;"><span style="font-size:1.05rem; margin-right:4px;">${icone}</span> ${p.desc}</td>
                <td style="padding: 0.3rem 0.5rem; text-align:center; font-size:0.75rem; font-weight:600;">${p.qtd}</td>
                <td style="padding: 0.3rem 0.5rem; text-align:center; display:flex; gap:0.25rem; justify-content:center;">
                    <button class="btn-action btn-edit-prod" data-id="${p.id}" style="color:#3b82f6; background:transparent; border:none; padding:2px;" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-action btn-rem-prod" data-id="${p.id}" style="color:#ef4444; background:transparent; border:none; padding:2px;" title="Remover"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `}).join('');
    }

    // Atualiza Totais
    document.getElementById('rr-total-prod').innerText = totalItens;
}

function renderRotaRedonda() {
    const container = document.getElementById('rota-redonda-container');
    if (!container) return;

    // Ajuste global para esta view caber em notebooks
    container.parentElement.style.padding = '0.5rem';

    const inputStyle = 'background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; height: 26px; width: 100%; box-sizing: border-box;';
    const labelStyle = 'font-weight: 600; font-size: 0.7rem; color: #475569; display: block; margin-bottom: 2px; white-space: nowrap;';
    const btnStyle = 'border:none; color:white; border-radius:4px; width:26px; height:26px; cursor:pointer; flex-shrink:0;';

    const duplicateStyle = osState.modoDuplicado ? 'border: 3px solid #eab308; box-shadow: 0 0 15px rgba(234, 179, 8, 0.4);' : '';

    const html = `
    <div id="rota-redonda-content" style="background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; box-sizing: border-box; transition: all 0.3s ease; ${duplicateStyle}">
        
        <!-- HEADER FORM — Fixo no topo -->
        <div style="position: sticky; top: 60px; z-index: 20; display: flex; gap: 1rem; align-items: center; background: white; padding: 0.5rem 1.5rem; flex-shrink: 0; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; margin-top: -1.5rem; margin-left: -1.5rem; margin-right: -1.5rem; margin-bottom: 0.75rem;">
            
            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">OS</label>
                <div style="display: flex; align-items: center; gap: 2px;">
                    <img id="rr-img-tipo-os" src="" style="height: 28px; display: none; cursor: pointer; transition: transform 0.2s;" alt="Tipo OS" title="Clique para alterar Obra/Evento" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onclick="abrirPopupTipoOs(tipo => { osState.tipoOs = tipo; atualizarDropdownProdutos(); atualizarUI(); atualizarIconesCliente(); })">
                    <input type="text" id="rr-input-os" style="${inputStyle} border:1px solid #cbd5e1; width: 80px;" placeholder="Ex: 12345">
                    <button id="btn-add-os-tipo" style="${btnStyle} background:#0284c7;" title="Definir tipo de OS (Obra/Evento)"><i class="ph ph-plus"></i></button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
                <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Cliente</label>
                <div style="display:flex; gap:4px; align-items:center; width: 100%;">
                    <input type="text" id="rr-input-cliente" style="${inputStyle} border:1px solid #cbd5e1;" placeholder="Nome do Cliente" oninput="this.dataset.nomeBase = '';" onkeydown="if(event.key==='Enter') document.getElementById('btn-pesq-cliente-os').click();">
                    <button id="btn-pesq-cliente-os" style="${btnStyle} background:#0284c7;" title="Pesquisar cliente"><i class="ph ph-magnifying-glass"></i></button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Patr.</label>
                <div style="display:flex; position:relative;">
                    <input type="text" id="rr-input-patrimonio" style="${inputStyle} border:1px solid #cbd5e1; width: 70px; padding-right:26px;" placeholder="Patr." onkeydown="if(event.key==='Enter') document.getElementById('btn-buscar-patrimonio').click();">
                    <button id="btn-buscar-patrimonio" style="position:absolute; right:0; top:0; bottom:0; background:transparent; border:none; color:#64748b; cursor:pointer; width:26px; display:flex; align-items:center; justify-content:center;" title="Buscar OS deste patrimônio"><i class="ph ph-magnifying-glass"></i></button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Contrato</label>
                <div style="display:flex; position:relative;">
                    <input type="text" id="rr-input-contrato" style="${inputStyle} border:1px solid #cbd5e1; width: 100px; padding-right:26px;" placeholder="Nº Contrato" onkeydown="if(event.key==='Enter') document.getElementById('btn-buscar-contrato').click();">
                    <button id="btn-buscar-contrato" style="position:absolute; right:0; top:0; bottom:0; background:transparent; border:none; color:#64748b; cursor:pointer; width:26px; display:flex; align-items:center; justify-content:center;" title="Buscar OS deste contrato"><i class="ph ph-magnifying-glass"></i></button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">Data</label>
                <input type="date" id="rr-input-data" style="${inputStyle} border:1px solid #cbd5e1; width: 110px;">
            </div>

            <div style="display:flex; gap:0.5rem; margin-left: auto;">
                <button id="btn-colar-os" style="background:#f59e0b; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;" title="Colar texto da OS e preencher automaticamente"><i class="ph ph-clipboard-text"></i> Colar OS</button>
                <button id="btn-limpar-os" style="background:#ef4444; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-x"></i> Limpar</button>
                <button id="btn-duplicar-os-form" style="display:${osState.loadedId ? 'block' : 'none'}; background:#8b5cf6; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;" title="Duplicar esta OS para criar uma nova"><i class="ph ph-copy"></i> Duplicar OS</button>
                <button id="btn-modo-duplicado" style="display:${osState.modoDuplicado ? 'block' : 'none'}; background:#eab308; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:default; font-weight:600;" title="Você está criando uma nova OS baseada em uma existente"><i class="ph ph-copy"></i> Modo: Duplicada</button>
                <button id="btn-gerar-os-final" style="background:#14b8a6; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-check-circle"></i> Salvar</button>
            </div>
        </div>

        <!-- ÁREA SCROLLÁVEL -->
        <div style="flex: 1; padding: 0.75rem; box-sizing: border-box;">
        <!-- MAIN SPLIT -->
        <div style="display: flex; gap: 0.75rem; min-height: 500px;">
            
            <!-- FORM LEFT COL -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 2; min-width: 0; padding-right: 4px; position: relative;">
                <div style="display: flex; gap: 0.5rem; position: relative; z-index: 15;">
                    <div style="flex: 3;">
                        <label style="${labelStyle}; display:flex; align-items:center; gap:6px;">Endereço <span id="rr-link-maps-badge" style="display:none; align-items:center; gap:4px; font-size:0.72rem; font-weight:600; color:#f97316; cursor:pointer; border-radius:4px; padding:1px 5px; background:#fff7ed; border:1px solid #fed7aa; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></span></label>
                        <div style="display:flex; gap:2px; position:relative;">
                            <div style="flex:1; position:relative;">
                                <input type="text" id="rr-input-endereco" style="${inputStyle} width:100%;" placeholder="Ex: Rua das Flores, 123 - Bairro, Cidade/SP" autocomplete="off" onkeydown="if(event.key==='Enter') document.getElementById('btn-buscar-endereco-os').click();">
                                <div id="rr-endereco-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:300;background:white;border:1px solid #cbd5e1;border-radius:4px;max-height:220px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,0.13);"></div>
                            </div>
                            <button id="btn-geocode-endereco" style="display:none;" title="Buscar endereço"></button>
                            <button id="btn-buscar-endereco-os" style="background:#1e40af; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0;" title="Pesquisar OS neste endereço"><i class="ph ph-magnifying-glass"></i></button>
                            <button id="btn-colar-gmaps" style="background:#16a34a; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0; font-weight:700; font-size:0.75rem;" title="Colar link do Google Maps para importar coordenadas precisas">G</button>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Complem. / Referência</label>
                        <input type="text" id="rr-input-complemento" style="${inputStyle}" placeholder="Apto, Sala, Referência...">
                    </div>
                    <div style="flex: 0 0 200px;">
                        <label style="${labelStyle}">Latitude, Longitude</label>
                        <div style="display:flex; gap:2px;">
                            <input type="text" id="rr-input-coord" style="${inputStyle} font-size:0.65rem;" placeholder="-23.5505, -46.6333">
                            <button id="btn-geocode-coord" style="background:#0369a1; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0;" title="Buscar endereço pelas coordenadas"><i class="ph ph-map-pin"></i></button>
                        </div>
                    </div>
                </div>

                <!-- BLOCO INFERIOR COM OVERLAY DE ENDEREÇO -->
                <div style="position: relative; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; z-index: 10;">
                    <!-- OVERLAY DE BLOQUEIO OS -->
                    <div id="rr-overlay-bloqueio" style="position:absolute; inset:0; z-index:20; background:rgba(248,250,252,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:6px; backdrop-filter:blur(2px); cursor:pointer;" onclick="const btn = document.getElementById('btn-add-os-tipo'); btn.style.transition='transform 0.1s, box-shadow 0.1s'; btn.style.transform='scale(1.2)'; btn.style.boxShadow='0 0 10px 4px #334155'; setTimeout(() => { btn.style.transform='scale(1)'; btn.style.boxShadow='none'; }, 600);">
                        <i class="ph ph-lock" style="font-size:2rem; color:#94a3b8; margin-bottom:0.5rem;"></i>
                        <p style="font-size:0.82rem; font-weight:600; color:#64748b; margin:0;">Defina a OS primeiro</p>
                        <p style="font-size:0.72rem; color:#94a3b8; margin:4px 0 0; text-align:center;">Digite o número da OS no topo e clique no botão <b style="color:#334155">+</b><br>para criar ou carregar um serviço.</p>
                    </div>
                    <!-- OVERLAY DE BLOQUEIO ENDEREÇO -->
                    <div id="rr-overlay-bloqueio-endereco" style="position:absolute; inset:0; z-index:10; background:rgba(248,250,252,0.85); display:none; flex-direction:column; align-items:center; justify-content:center; border-radius:6px; backdrop-filter:blur(2px); cursor:pointer;" onclick="const btn = document.getElementById('btn-geocode-endereco'); btn.style.transition='transform 0.1s, box-shadow 0.1s'; btn.style.transform='scale(1.3)'; btn.style.boxShadow='0 0 12px 4px #0369a1'; setTimeout(() => { btn.style.transform='scale(1)'; btn.style.boxShadow='none'; }, 600);">
                        <i class="ph ph-map-pin" style="font-size:2rem; color:#94a3b8; margin-bottom:0.5rem;"></i>
                        <p style="font-size:0.82rem; font-weight:600; color:#64748b; margin:0;">Pesquise o Endereço</p>
                        <p style="font-size:0.72rem; color:#94a3b8; margin:4px 0 0; text-align:center;">Clique na Lupa azul acima para buscar e confirmar o endereço.</p>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <div style="flex: 1;">
                        <label style="${labelStyle}">Responsável</label>
                        <input type="text" id="rr-input-responsavel" style="${inputStyle}" placeholder="Nome do contato">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">SMS (Telefone)</label>
                        <input type="text" id="rr-input-sms" style="${inputStyle}" placeholder="(00) 00000-0000">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Email</label>
                        <input type="email" id="rr-input-email" style="${inputStyle}" placeholder="email@exemplo.com">
                    </div>
                </div>

                <!-- HORÁRIOS E DIAS -->
                <div style="display: flex; gap: 0.5rem; align-items: center; background: #f8fafc; padding: 0.4rem 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0; flex-wrap: wrap;">
                    <label style="display:flex; align-items:center; gap:2px; font-size:0.75rem; color:#475569; cursor:pointer;"><input type="checkbox" id="rr-chk-diurno"> Diurno</label>
                    <label style="display:flex; align-items:center; gap:2px; font-size:0.75rem; color:#475569; cursor:pointer;"><input type="checkbox" id="rr-chk-noturno" onchange="(function(chk){ atualizarIconesCliente(); if(chk.checked){ var hi=document.getElementById('rr-input-hora-inicio'); var hf=document.getElementById('rr-input-hora-fim'); if(hi) hi.value='20:00'; if(hf) hf.value='23:00'; } })(this)"> Noturno</label>
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                    <span style="font-size: 0.75rem; font-weight: 600; color:#475569;">Horário:</span>
                    <input type="time" id="rr-input-hora-inicio" style="${inputStyle} width: 75px;"> às 
                    <input type="time" id="rr-input-hora-fim" style="${inputStyle} width: 75px;">
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                    <button id="btn-agenda-endereco" style="background:#f59e0b; border:none; color:white; height:26px; width:26px; border-radius:4px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:0;" title="Verificar manutenções programadas para esta região" onclick="document.getElementById('rr-chk-agenda-clicado').value='1';"><i class="ph ph-calendar-check" style="font-size:1.1rem;"></i></button>
                    ${[
                        { d: 'Seg', id: 'rr-chk-seg', c: '#ef4444' },
                        { d: 'Ter', id: 'rr-chk-ter', c: '#f97316' },
                        { d: 'Qua', id: 'rr-chk-qua', c: '#ca8a04' },
                        { d: 'Qui', id: 'rr-chk-qui', c: '#16a34a' },
                        { d: 'Sex', id: 'rr-chk-sex', c: '#3b82f6' },
                        { d: 'Sáb', id: 'rr-chk-sab', c: '#8b5cf6' },
                        { d: 'Dom', id: 'rr-chk-dom', c: '#ec4899' }
                    ].map(item => `<label id="lbl-${item.id}" data-cor="${item.c}" style="display:flex; align-items:center; gap:2px; font-size:0.7rem; color:${item.c}; font-weight:700; cursor:pointer; padding:2px 6px; border-radius:4px; border:1.5px solid ${item.c}; transition:background 0.15s;"><input type="checkbox" id="${item.id}" onchange="(function(chk,lbl){lbl.style.background=chk.checked?lbl.dataset.cor:'transparent';lbl.style.color=chk.checked?'white':lbl.dataset.cor;})(this,this.closest('label'))"> ${item.d}</label>`).join('')}
                    
                    <div id="rr-sugestoes-dias-container" style="flex-basis: 100%; font-size: 0.75rem; padding: 2px 4px; display: none;"></div>
                    <input type="hidden" id="rr-chk-agenda-clicado" value="0">
                </div>

                <!-- TIPO SERVIÇO & HABILIDADES -->
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Tipo de Serviço</label>
                        <div style="position:relative;">
                            <input type="text" id="rr-tipo-servico-search" placeholder="Digite para filtrar..." autocomplete="off"
                                style="${inputStyle} width:100%; padding-right:22px;"
                                oninput="filtrarTiposServico(this.value)"
                                onfocus="document.getElementById('rr-tipo-dropdown').style.display='block'"
                                onblur="setTimeout(()=>document.getElementById('rr-tipo-dropdown').style.display='none',200)">
                            <i class="ph ph-caret-down" style="position:absolute;right:5px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:0.75rem;pointer-events:none;"></i>
                            <div id="rr-tipo-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;background:white;border:1px solid #cbd5e1;border-radius:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
                                ${TIPOS_SERVICO_OS.map(t => { let ic = ''; if(t.includes('RETIRADA')) ic = t.includes('TOTAL') ? '⭕' : '🔶'; else if(t.includes('SUCCAO')) ic = '💧'; else if(t.includes('LIMPA FOSSA')) ic = '💦'; else if(t.includes('REPARO')) ic = '🔧'; else if(t.includes('VISITA TECNICA')) ic = '⚙️'; else if(t.includes('MANUTENCAO')) ic = t.includes('AVULSA') ? '❗' : ''; else if(t.includes('VAC')) ic = '🏗️'; else if(t.includes('TROCA')) ic = '♻️'; return `<div class="rr-tipo-opt" data-val="${t}" onclick="selecionarTipoServico('${t}')" style="padding:5px 10px;cursor:pointer;font-size:0.8rem;color:#1e293b;transition:background 0.1s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''"><span style="margin-right:4px;">${ic}</span>${t}</div>`; }).join('')}
                            </div>
                        </div>
                        <input type="hidden" id="rr-tipo-servico" onchange="onChangeTipoServico();">
                    </div>
                    
                    <div style="flex: 2;">
                        <label style="${labelStyle}">Habilidades</label>
                        <div style="display: flex; gap: 4px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; margin-top: 2px;">
                            ${HABILIDADES.filter(s => s !== 'TECNICO').map(s => {
                                const ic = {'VAC':'🏗️', 'UTILITARIO':'🛻', 'CARRETINHA':'🔗'}[s] || '';
                                return `<button class="btn-tipo-servico" data-tipo="${s}" style="border: 1px solid #2d9e5f; color: #2d9e5f; background: transparent; border-radius: 99px; padding: 2px 10px; font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;">${ic ? `<span style="margin-right:3px;font-size:0.8rem;">${ic}</span>` : ''}${s}</button>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- OBSERVAÇÕES -->
                <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Obs. Internas</label>
                        <input type="text" id="rr-input-obs-internas" style="${inputStyle}" placeholder="Info interna">
                    </div>
                    <!-- Seta: copia Obs. Internas → Obs. Motoristas -->
                    <button type="button" title="Copiar para Obs. Motoristas"
                        onclick="(function(){
                            const src = document.getElementById('rr-input-obs-internas');
                            const dst = document.getElementById('rr-input-obs');
                            if(src && dst && src.value.trim()) {
                                dst.value = src.value;
                                dst.dispatchEvent(new Event('input', {bubbles:true}));
                            }
                        })()"
                        style="flex-shrink:0;height:26px;padding:0 10px;background:#2d9e5f;color:white;border:none;border-radius:4px;font-size:1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;margin-bottom:1px;" >›</button>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Obs. Motoristas</label>
                        <input type="text" id="rr-input-obs" style="${inputStyle}" placeholder="Info para motorista">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Vídeo OS</label>
                        <div style="display:flex; gap:2px; align-items:center; flex-wrap:wrap;">
                            <input type="file" id="rr-input-video-file" accept="video/*" style="display:none;" onchange="rrFazerUploadVideo(this)">
                            <button type="button" onclick="document.getElementById('rr-input-video-file').click()" id="btn-upload-video-os"
                                style="background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;padding:0 8px;height:26px;font-size:0.72rem;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0;">
                                <i class="ph ph-upload-simple"></i> Upload Vídeo
                            </button>
                            <input type="hidden" id="rr-input-video">
                            <span id="rr-video-link-display" style="display:none;align-items:center;gap:4px;font-size:0.7rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:2px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                <i class="ph ph-film-strip" style="color:#3b82f6;"></i>
                                <a id="rr-video-link-anchor" href="#" target="_blank" style="color:#1d4ed8;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;"></a>
                                <button id="btn-abrir-link-video" onclick="rrAbrirLinkVideo()" title="Abrir vídeo" style="background:none;border:none;cursor:pointer;padding:0;color:#3b82f6;display:flex;align-items:center;"><i class="ph ph-arrow-square-out" style="font-size:0.85rem;"></i></button>
                                <button id="btn-excluir-link-video" onclick="rrExcluirLinkVideo()" title="Excluir vídeo" style="background:none;border:none;cursor:pointer;padding:0;color:#ef4444;display:flex;align-items:center;"><i class="ph ph-trash" style="font-size:0.85rem;"></i></button>
                            </span>
                            <span id="rr-video-upload-progress" style="display:none;font-size:0.7rem;color:#6b7280;"></span>
                        </div>
                    </div>

                </div>

                <!-- PRODUTOS LOGISTICA -->
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span id="rr-badge-tipo-os" style="display:none; background:#94a3b8; color:white; font-size:0.65rem; font-weight:700; padding:2px 8px; border-radius:99px; white-space:nowrap; align-items:center;"></span>
                        <input type="text" id="rr-prod-desc" list="rr-prod-list" style="${inputStyle} flex: 2;" placeholder="Selecione o produto...">
                        <datalist id="rr-prod-list"></datalist>
                        <input type="number" id="rr-prod-qtd" style="${inputStyle} width: 60px;" placeholder="Qtd" min="1">
                        <button id="btn-add-produto" style="background: #3b82f6; color: white; width:26px; height:26px; border:none; border-radius:4px; cursor:pointer;" title="Adicionar produto"><i class="ph ph-plus"></i></button>
                        
                        <div style="display: flex; gap: 0.75rem; font-size: 0.7rem; color: #64748b; margin-left: auto; align-items: center;">
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-package"></i> Produtos: <strong id="rr-total-prod">0</strong></span>
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; display:flex; align-items:center; gap:2px;"><i class="ph ph-clock"></i> Tempo: <input id="rr-tempo-total" value="00:10" style="width:42px; background:transparent; border:none; border-bottom:1px dashed #94a3b8; font-weight:bold; color:#0f172a; text-align:center; padding:0; outline:none; font-size:0.7rem;"></span>
                            <span style="background:#dbeafe; padding:2px 6px; border-radius:4px;" title="Tanque"><i class="ph ph-fill-tray"></i> Tanque: <strong id="rr-total-tanques">0</strong></span>
                            <span style="background:#dcfce7; padding:2px 6px; border-radius:4px;" title="Carroceria"><i class="ph ph-truck"></i> Carroceria: <strong id="rr-total-carrocerias">0</strong></span>
                            <span style="background:#fef9c3; padding:2px 6px; border-radius:4px;" title="Carretinha"><i class="ph ph-link"></i> Carretinha: <strong id="rr-total-carretinhas">0</strong></span>
                        </div>
                    </div>
                    
                    <!-- TABELA PRODUTOS (tamanho reduzido) -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow-y: auto; max-height: 100px; background: white;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.7rem; color: #64748b;">Descrição</th>
                                    <th style="padding: 0.3rem 0.5rem; text-align: center; font-size: 0.7rem; color: #64748b; width: 50px;">Qtd</th>
                                    <th style="padding: 0.3rem 0.5rem; text-align: center; font-size: 0.7rem; color: #64748b; width: 50px;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="rr-tbody-produtos">
                                <!-- Preenchido pelo atualizarUI -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- BOTÕES DE AÇÃO (AZUIS) -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: auto; padding-top: 0.5rem;">
                    ${ACOES.filter(s => s !== 'CARRETINHA').map(s => 
                        `<button class="btn-acao-azul" data-acao="${s}" style="font-size:0.65rem; font-weight: 700; border: 1px solid #bae6fd; background: #f0f9ff; color: #0284c7; padding: 0.2rem; border-radius: 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; min-height: 40px; transition: all 0.2s; line-height: 1.1; text-align: center;">
                            <span style="font-size:0.85rem; margin-bottom:1px;">${ACOES_DICT[s]}</span> ${s}
                        </button>`
                    ).join('')}
                </div>

                </div> <!-- FIM BLOCO INFERIOR COM OVERLAY -->

            </div>

            <!-- MAPA E RESUMO RIGHT COL -->
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                <div id="rr-mapa-container" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; height: 100%; display: flex; flex-direction: column; position: relative; overflow: hidden;">
                    <!-- Header do Mapa (botões ocultos por padrão) -->
                    <div style="background: rgba(255,255,255,0.97); padding: 0.4rem 0.5rem; display: none; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; flex-shrink:0;">
                        <span style="font-size:0.75rem; font-weight:700; color:#475569; display:flex; align-items:center; gap:4px;"><i class="ph ph-map-pin" style="color:#0ea5e9;"></i> Localização <span style="font-size:0.65rem; background:#f0fdf4; color:#16a34a; border-radius:4px; padding:1px 5px; font-weight:600; margin-left:4px;">OpenStreetMap</span></span>
                        <button onclick="if(window.osState?.lat&&window.osState?.lng)window.open('https://www.openstreetmap.org/?mlat='+osState.lat+'&mlon='+osState.lng+'#map=17/'+osState.lat+'/'+osState.lng,'_blank');" style="background:#3b82f6; color:white; padding:2px 8px; font-size:0.7rem; border-radius:4px; border:none; cursor:pointer; font-weight:600;">
                            <i class="ph ph-arrows-out"></i> Ampliar
                        </button>
                    </div>
                    <!-- Placeholder (visível antes de buscar) -->
                    <div id="rr-mapa-placeholder" style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:0.5rem; color:#94a3b8; padding:1rem; text-align:center;">
                        <i class="ph ph-map-trifold" style="font-size:2.5rem; color:#cbd5e1;"></i>
                        <p style="font-size:0.75rem; margin:0; font-weight:500;">Digite o endereço e clique em 🔍<br>para carregar o mapa e obter as coordenadas</p>
                        <span style="font-size:0.65rem; color:#b0bec5; margin-top:4px;">🌍 Mapa gratuito via OpenStreetMap</span>
                    </div>
                    <!-- DIV do Leaflet (oculto até busca) -->
                    <div id="rr-mapa-leaflet" style="display:none; flex:1; width:100%; min-height:200px;"></div>
                </div>
            </div>

        </div>
        </div><!-- fim área scrollável -->
    </div>
    `;

    container.innerHTML = html;
    atualizarUI();
    atualizarBloqueio();
    _rrMontarDrawerHistorico();
}

// ══════════════════════════════════════════════════════════════════════════════
// DRAWER DE HISTÓRICO DE OS
// ══════════════════════════════════════════════════════════════════════════════
function _rrMontarDrawerHistorico() {
    // Remove instâncias anteriores para evitar duplicação
    document.getElementById('rr-hist-wrapper')?.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'rr-hist-wrapper';
    wrapper.style.cssText = [
        'position:fixed',
        'bottom:32px',          /* fica ACIMA da barra verde "Caminho" (≈32px) */
        'left:60px',            /* respeita a sidebar */
        'right:0',
        'z-index:9500',         /* sempre por cima de tudo */
        'display:flex',
        'flex-direction:column',
        'align-items:flex-start',
    ].join(';');

    wrapper.innerHTML = `
        <!-- BOTÃO SETA -->
        <div id="rr-hist-btn-row" style="padding:0 0 0 12px;">
            <button id="rr-hist-toggle-btn"
                title="Histórico de OS"
                style="
                    display:flex; align-items:center; gap:6px;
                    background:#f1f5f9; border:1.5px solid #cbd5e1;
                    border-bottom:none; border-radius:8px 8px 0 0;
                    padding:4px 14px; cursor:pointer;
                    color:#64748b; font-size:0.75rem; font-weight:600;
                    box-shadow:0 -2px 8px rgba(0,0,0,0.06);
                    transition:background 0.15s, color 0.15s;
                "
                onmouseenter="this.style.background='#e2e8f0'; this.style.color='#334155';"
                onmouseleave="this.style.background='#f1f5f9'; this.style.color='#64748b';"
                onclick="window._rrToggleHistorico()"
            >
                <i id="rr-hist-icon" class="ph ph-caret-up-bold" style="font-size:0.9rem;"></i>
                Histórico de OS
                <span id="rr-hist-count" style="background:#e2e8f0; border-radius:99px; padding:1px 7px; font-size:0.68rem;"></span>
            </button>
        </div>

        <!-- PAINEL DE HISTÓRICO -->
        <div id="rr-hist-panel"
            style="
                width:100%; background:#fff;
                box-shadow:0 -4px 20px rgba(0,0,0,0.12);
                max-height:0; overflow:hidden;
                transition:max-height 0.32s cubic-bezier(.4,0,.2,1);
                display:flex; flex-direction:column;
                order:-1;
            "
        >
            <!-- Header do painel -->
            <div style="display:flex; align-items:center; gap:10px; padding:8px 16px; border-bottom:1px solid #f1f5f9; flex-shrink:0; background:#f8fafc;">
                <i class="ph ph-clock-counter-clockwise" style="color:#16a34a; font-size:1rem;"></i>
                <span style="font-weight:700; font-size:0.82rem; color:#1e293b;">Histórico de Ordens de Serviço</span>
                <input id="rr-hist-search" type="text" placeholder="Buscar por OS, cliente, endereço..."
                    style="margin-left:auto; border:1px solid #e2e8f0; border-radius:6px; padding:4px 10px; font-size:0.75rem; width:240px; height:26px; outline:none; color:#334155;"
                    oninput="window._rrFiltrarHistorico(this.value)"
                />
            </div>
            <!-- Tabela -->
            <div id="rr-hist-table-wrap" style="overflow-y:auto; max-height:280px; flex:1;">
                <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
                    <thead>
                        <tr style="background:#f1f5f9; position:sticky; top:0; z-index:2;">
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700; white-space:nowrap;">OS</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Data</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Tipo</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Cliente</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Endereço</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Serviço</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Turno</th>
                            <th style="padding:6px 10px; text-align:left; color:#475569; font-weight:700;">Dias</th>
                        </tr>
                    </thead>
                    <tbody id="rr-hist-tbody">
                        <tr><td colspan="7" style="text-align:center; padding:20px; color:#94a3b8;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);

    // ── Estado ────────────────────────────────────────────────────────────────
    let _aberto = false;
    let _dados = [];

    // ── Renderiza linhas da tabela ─────────────────────────────────────────────
    function _renderLinhas(filtro) {
        const tbody = document.getElementById('rr-hist-tbody');
        if (!tbody) return;
        const term = (filtro || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const lista = term
            ? _dados.filter(os => {
                const t = [os.numero_os, os.cliente, os.endereco, os.tipo_servico, os.contrato]
                    .filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return t.includes(term);
              })
            : _dados;

        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:16px; color:#94a3b8;">Nenhuma OS encontrada.</td></tr>`;
            return;
        }

        const ESTILO_SVC = svc => {
            const u = (svc || '').toUpperCase();
            if (u.includes('ENTREGA'))                          return { bg: '#dcfce7', text: '#15803d' };  // Verde
            if (u.includes('RETIRADA'))                         return { bg: '#fef9c3', text: '#a16207' };  // Amarelo
            if (u.includes('MANUTENCAO') || u.includes('MANUTENÇÃO')) {
                if (u.includes('AVULSA') || u.includes('AVULSO')) return { bg: '#fff', text: '#64748b' };  // Branco/avulso
                return { bg: '#f1f5f9', text: '#64748b' };                                                 // Cinza/recorrente
            }
            return { bg: '#fff', text: '#64748b' };                                                        // Branco/demais
        };
        const fmtData = ds => { if (!ds) return '—'; const [y,m,d] = ds.split('-'); return (d&&m&&y) ? `${d}/${m}/${y}` : ds; };
        
        const fmtTipo = t => {
            const up = (t || '').toUpperCase();
            if (up === 'OBRA') return `<span style="background:#156EB6; color:white; padding:2px 8px; border-radius:12px; font-weight:600; font-size:0.75rem;">Obra</span>`;
            if (up === 'EVENTO') return `<span style="background:#8E24AA; color:white; padding:2px 8px; border-radius:12px; font-weight:600; font-size:0.75rem;">Evento</span>`;
            return t || '—';
        };
        
        const turnoIco = t => t === 'noturno' ? '🌙 Noturno' : t === 'diurno' ? '☀️ Diurno' : (t || '—');
        
        const _DIA_C = {'Seg':'#ef4444','Ter':'#f97316','Qua':'#ca8a04','Qui':'#16a34a','Sex':'#3b82f6','Sáb':'#8b5cf6','Dom':'#ec4899'};
        const fmtDias = diasRaw => {
            if (!diasRaw) return '—';
            let dias = [];
            if (Array.isArray(diasRaw)) dias = diasRaw;
            else {
                try { dias = JSON.parse(diasRaw); } catch(e) {}
            }
            if (!Array.isArray(dias) || dias.length === 0) return '—';
            return `<div style="display:flex; gap:2px; flex-wrap:wrap;">` + dias.map(d => {
                const cor = _DIA_C[d] || '#64748b';
                return `<span style="background:${cor}; color:white; border-radius:4px; padding:2px 4px; font-size:0.65rem; font-weight:bold;">${d.substring(0,3)}</span>`;
            }).join('') + `</div>`;
        };

        // Correção de encoding: converte mojibake Latin-1→UTF-8 (problema recorrente no banco)
        const _fc = s => {
            if (!s || typeof s !== 'string') return s || '';
            try { return decodeURIComponent(escape(s)); } catch(e) { return s; }
        };

        tbody.innerHTML = lista.map((os, i) => {
            const est = ESTILO_SVC(os.tipo_servico);
            const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
            const cli = _fc(os.cliente || '—');
            const end = _fc(os.endereco || '—');
            const svc = _fc(os.tipo_servico || '—');
            const tur = _fc(os.turno || '');
            const tip = _fc(os.tipo_os || '');
            return `<tr style="background:${bgRow}; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.1s;"
                onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='${bgRow}'"
                title="Clique para carregar no formulário"
                onclick="window._rrCarregarOsDrawer(${os.id})"
            >
                <td style="padding:5px 10px; font-weight:700; color:#1e293b; white-space:nowrap;">${os.numero_os || '—'}</td>
                <td style="padding:5px 10px; color:#64748b; white-space:nowrap;">${fmtData(os.data_os)}</td>
                <td style="padding:5px 10px; white-space:nowrap;">${fmtTipo(tip)}</td>
                <td style="padding:5px 10px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${cli}">${cli}</td>
                <td style="padding:5px 10px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#475569;" title="${end}">${end}</td>
                <td style="padding:5px 10px; white-space:nowrap;">
                    <span style="background:${est.bg}; color:${est.text}; border:1px solid ${est.text}22; border-radius:4px; padding:2px 8px; font-weight:700; font-size:0.72rem;">${svc}</span>
                </td>
                <td style="padding:5px 10px; white-space:nowrap; color:#475569;">${turnoIco(tur)}</td>
                <td style="padding:5px 10px; white-space:nowrap;">${fmtDias(os.dias_semana)}</td>
            </tr>`;
        }).join('');
    }

    // ── Carrega dados da API ───────────────────────────────────────────────────
    async function _carregar() {
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch('/api/logistica/os/buscar', { headers: { Authorization: `Bearer ${token}` } });
            _dados = await res.json();
            if (!Array.isArray(_dados)) _dados = [];
            const count = document.getElementById('rr-hist-count');
            if (count) count.textContent = _dados.length;
            _renderLinhas(document.getElementById('rr-hist-search')?.value || '');
        } catch {
            const tbody = document.getElementById('rr-hist-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:#ef4444;">Erro ao carregar.</td></tr>`;
        }
    }

    // ── Toggle público ────────────────────────────────────────────────────────
    window._rrToggleHistorico = function() {
        const panel = document.getElementById('rr-hist-panel');
        const icon  = document.getElementById('rr-hist-icon');
        if (!panel) return;
        _aberto = !_aberto;
        panel.style.maxHeight = _aberto ? '360px' : '0';
        if (icon) icon.className = _aberto ? 'ph ph-caret-down-bold' : 'ph ph-caret-up-bold';
        if (_aberto && _dados.length === 0) _carregar();
    };

    // ── Recarrega dados sem fechar (chamado automaticamente ao salvar OS) ─────
    window._rrRecarregarHistorico = function() {
        _carregar(); // atualiza cache e re-renderiza
    };

    window._rrFiltrarHistorico = filtro => _renderLinhas(filtro);

    // ── Fechar ao clicar fora do drawer ───────────────────────────────────────
    document.addEventListener('mousedown', function _rrClickFora(e) {
        if (!_aberto) return;
        const wrapper = document.getElementById('rr-hist-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            // Clicou fora: fechar
            const panel = document.getElementById('rr-hist-panel');
            const icon  = document.getElementById('rr-hist-icon');
            if (panel) panel.style.maxHeight = '0';
            if (icon) icon.className = 'ph ph-caret-up-bold';
            _aberto = false;
        }
    });
}

window._rrCarregarOsDrawer = async function(id) {
    // Fecha o drawer
    const panel = document.getElementById('rr-hist-panel');
    const icon  = document.getElementById('rr-hist-icon');
    if (panel) panel.style.maxHeight = '0';
    if (icon) icon.className = 'ph ph-caret-up-bold';

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/logistica/os/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const os = await res.json();
        if (!os || !os.id) throw new Error('OS não encontrada');

        // Carrega direto no formulário, sem modal e sem bloqueio do geocode
        if (typeof window._carregarRegistroNaTela === 'function') {
            window._carregarRegistroNaTela(os);
        }
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso(`✅ OS ${os.numero_os} carregada.`);

    } catch(e) {
        console.error('[Drawer] Erro ao carregar OS:', e);
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('Erro ao carregar OS. Tente novamente.');
    }
};



setInterval(() => {
    const w = document.getElementById('rr-hist-wrapper');
    if (!w) return;
    const viewRota = document.getElementById('view-logistica-rota-redonda');
    const viewPipe = document.getElementById('view-logistica-pipeline');
    const isRotaAtiva = viewRota && viewRota.offsetParent !== null;
    const isPipeAtiva = viewPipe && viewPipe.offsetParent !== null;
    if (isRotaAtiva || isPipeAtiva) {
        if (w.style.display === 'none') w.style.display = 'block';
    } else {
        if (w.style.display !== 'none') w.style.display = 'none';
    }
}, 500);
