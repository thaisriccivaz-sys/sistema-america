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
    'VISITA TÉCNICA OBRA':    { icone: '⚙️',  codigo: 'VISITA TÉCNICA OBRA' },
    'VISITA TÉCNICA EVENTO':  { icone: '⚙️',  codigo: 'VISITA TÉCNICA EVENTO' },
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
    'ENTREGA OBRA', 'RETIRADA OBRA TOTAL', 'RETIRADA OBRA PARCIAL', 'TROCA DE EQUIPAMENTO OBRA', 'MANUTENCAO OBRA', 'MANUTENCAO AVULSA OBRA', 'SUCCAO OBRA',
    'REPARO EQUIPAMENTO OBRA', 'VISITA TECNICA OBRA', 'LIMPA FOSSA OBRA', 'VAC OBRA',
    'ENTREGA EVENTO', 'RETIRADA EVENTO TOTAL', 'RETIRADA EVENTO PARCIAL', 'TROCA DE EQUIPAMENTO EVENTO', 'MANUTENCAO EVENTO', 'MANUTENCAO AVULSA EVENTO', 'SUCCAO EVENTO',
    'REPARO EQUIPAMENTO EVENTO', 'VISITA TECNICA EVENTO', 'LIMPA FOSSA EVENTO', 'VAC EVENTO'
];
const HABILIDADES = ['TANQUE', 'CARGA', 'VAC', 'UTILITARIO', 'TECNICO', 'CARRETINHA', 'CARROCERIA', 'TANQUE GRANDE'];
const ACOES_DICT = {
    'LEVAR CARRINHO': '🛒',
    'ATENÇÃO AO HORÁRIO': '⏰',
    'TROCA DE CABINE': '♻️',
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
    if (el) el.innerText = resultado;

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

    let totalCarga = 0;

    for (const produto of osState.produtos) {
        const equipamento = (produto.desc || '').trim().toUpperCase();
        const quantidade = parseInt(produto.qtd) || 0;
        if (!equipamento) continue;

        let cargaCalculada = 0;

        if (isManutencao) {
            // ── MANUTENÇÃO EVENTO ─────────────────────────────────────────────
            if (tipoServico.includes('EVENTO')) {
                switch (equipamento) {
                    case 'STD EVENTO': case 'LX EVENTO': case 'ELX EVENTO':
                    case 'PCD EVENTO': case 'CHUVEIRO EVENTO': case 'HIDRÁULICO EVENTO':
                        cargaCalculada = 5 * quantidade; break;
                    case 'MICTÓRIO EVENTO':
                        cargaCalculada = 10 * quantidade; break;
                    case 'PIA II EVENTO': case 'PIA III EVENTO':
                        cargaCalculada = 1 * quantidade; break;
                    default:
                        cargaCalculada = quantidade;
                }
            // ── MANUTENÇÃO OBRA / AVULSA ──────────────────────────────────────
            } else if (tipoServico.includes('OBRA') || tipoServico.includes('AVULSA')) {
                switch (equipamento) {
                    case 'STD OBRA': case 'LX OBRA': case 'ELX OBRA':
                    case 'PBII OBRA': case 'PBIII OBRA':
                    case 'CHUVEIRO OBRA': case 'HIDRÁULICO OBRA':
                        cargaCalculada = 1 * quantidade; break;
                    case 'MICTÓRIO OBRA':
                        cargaCalculada = 4 * quantidade; break;
                    default:
                        cargaCalculada = quantidade;
                }
            } else {
                cargaCalculada = quantidade;
            }
        } else {
            // ── ENTREGA / RETIRADA / OUTROS ───────────────────────────────────
            if (equipamento.includes('OBRA')) {
                switch (equipamento) {
                    case 'STD OBRA': case 'LX OBRA': case 'ELX OBRA':
                    case 'GUARITA INDIVIDUAL OBRA': case 'PBII OBRA': case 'PBIII OBRA':
                    case 'CHUVEIRO OBRA': case 'HIDRÁULICO OBRA':
                        cargaCalculada = quantidade; break;
                    case 'GUARITA DUPLA OBRA': case 'PCD OBRA':
                        cargaCalculada = 2 * quantidade; break;
                    case 'MICTÓRIO OBRA':
                        cargaCalculada = calcularCargaProporcional(quantidade); break;
                    default:
                        cargaCalculada = 0;
                }
            } else if (equipamento.includes('EVENTO')) {
                switch (equipamento) {
                    case 'STD EVENTO': case 'LX EVENTO': case 'ELX EVENTO':
                    case 'GUARITA INDIVIDUAL EVENTO': case 'PIA II EVENTO': case 'PIA III EVENTO':
                    case 'CHUVEIRO EVENTO': case 'HIDRÁULICO EVENTO':
                        cargaCalculada = quantidade; break;
                    case 'GUARITA DUPLA EVENTO': case 'PCD EVENTO':
                        cargaCalculada = 2 * quantidade; break;
                    case 'MICTÓRIO EVENTO':
                        cargaCalculada = calcularCargaProporcional(quantidade); break;
                    default:
                        cargaCalculada = quantidade;
                }
            } else {
                cargaCalculada = 0;
            }
        }

        totalCarga += cargaCalculada;
    }

    // ── Decide qual veículo usa (Tanque / Carroceria / Carretinha) ─────────────
    // Regra do Flutter:
    //   Manutenção        → sempre TANQUE
    //   carga <= 6        → CARROCERIA
    //   carga > 6         → CARRETINHA
    let tanque = '', carroceria = '', carretinha = '';
    if (isManutencao) {
        tanque = totalCarga > 0 ? String(totalCarga) : '';
    } else if (totalCarga <= 6) {
        carroceria = totalCarga > 0 ? String(totalCarga) : '';
    } else {
        carretinha = String(totalCarga);
    }

    // Atualiza badge Tanques na UI
    const elTanques = document.getElementById('rr-total-tanques');
    if (elTanques) {
        if (tanque)      elTanques.innerText = `T: ${tanque}`;
        else if (carroceria) elTanques.innerText = `Car: ${carroceria}`;
        else if (carretinha) elTanques.innerText = `Crt: ${carretinha}`;
        else             elTanques.innerText = '0';
    }

    // Guarda no estado para usar ao Gerar OS
    osState.tanque     = tanque;
    osState.carroceria = carroceria;
    osState.carretinha = carretinha;
    osState.totalCarga = totalCarga;
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

    // Abre Google Maps em nova aba com o endereço atual
    const mapsUrl = 'https://www.google.com/maps/search/' + encodeURIComponent(endereco || 'São Paulo, Brasil');
    window.open(mapsUrl, '_blank');

    // Modal centralizado — apenas lat/lng
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
        // Passo 1 do desbloqueio: coordenadas confirmadas, aguarda agenda
        osState.coordenadasConfirmadas = true;
        osState.enderecoConfirmado = false; // ainda não desbloqueado
        atualizarBloqueio();
    }, 50);
    mostrarToastAviso('\u2705 Coordenadas aplicadas! Agora clique no botão \ud83d\udcc5 para verificar a agenda e liberar o formulário.');
};

function mostrarToastAviso(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:0.75rem 1rem;border-radius:8px;font-size:0.78rem;max-width:380px;box-shadow:0 4px 12px rgba(0,0,0,0.15);line-height:1.5;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 9000);
}

function exibirModalSucessoOS(osId, payload) {
    document.getElementById('rr-modal-sucesso-os')?.remove();

    const diasStr = (payload.dias_semana || []).join(', ') || '—';
    const prodStr = (payload.produtos || []).length > 0
        ? payload.produtos.map(p => `${p.qtd}x ${p.desc}`).join(', ')
        : '—';
    const tipoIcon = payload.tipo_os === 'Obra' ? '🏗️' : payload.tipo_os === 'Evento' ? '🎉' : '📋';

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
                    <span style="font-size:1.3rem;">${tipoIcon}</span>
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
                <button id="btn-nova-os-sucesso" style="background:#2d9e5f;color:white;border:none;border-radius:6px;padding:6px 18px;font-size:0.78rem;font-weight:700;cursor:pointer;"><i class="ph ph-plus"></i> Nova OS</button>
                <button id="btn-fechar-sucesso-os-2" style="background:#e2e8f0;color:#334155;border:none;border-radius:6px;padding:6px 18px;font-size:0.78rem;font-weight:600;cursor:pointer;">Fechar</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    const fechar = () => modal.remove();
    modal.querySelector('#btn-fechar-sucesso-os')?.addEventListener('click', fechar);
    modal.querySelector('#btn-fechar-sucesso-os-2')?.addEventListener('click', fechar);
    modal.addEventListener('click', e => { if (e.target === modal) fechar(); });

    // Duplicar: carrega tudo de volta EXCETO data e tipo_servico
    modal.querySelector('#btn-duplicar-os-sim')?.addEventListener('click', () => {
        fechar();
        duplicarOsNaTela(payload);
    });

    // Botão Nova OS: limpa tudo e começa do zero
    modal.querySelector('#btn-nova-os-sucesso')?.addEventListener('click', () => {
        fechar();
        osState.produtos = []; osState.tiposServico = new Set();
        osState.acoes = new Set(); osState.clienteConfirmado = true;
        osState.clienteNome = ''; osState.enderecoSelecionado = ''; osState.tipoOs = '';
        const c = document.getElementById('rota-redonda-container');
        if (c) c.innerHTML = '';
        renderRotaRedonda();
    });
}

// ── DUPLICAR OS NA TELA: carrega payload mas limpa Data e Tipo de Serviço ──
function duplicarOsNaTela(payload) {
    // Preserva produtos e tipo de OS no state
    osState.tipoOs = payload.tipo_os || '';
    osState.produtos = (payload.produtos || []).map(p => ({ ...p, id: Date.now() + Math.random() }));
    osState.tiposServico = new Set();
    osState.acoes = new Set();
    osState.clienteConfirmado = true;
    osState.clienteNome = payload.cliente || '';
    osState.enderecoSelecionado = payload.endereco || '';

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
        if (clienteEl) { clienteEl.value = payload.cliente || ''; clienteEl.dataset.nomeBase = payload.cliente || ''; }
        // Endereço — mantém
        set('rr-input-endereco', payload.endereco);
        set('rr-input-complemento', payload.complemento);
        // Coordenadas — mantém
        if (payload.lat && payload.lng) set('rr-input-coord', `${payload.lat}, ${payload.lng}`);
        // Contrato — mantém
        if (payload.contrato) {
            const contEl = document.querySelector('input[placeholder="Nº Contrato"]');
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
        set('rr-input-video', payload.link_video);
        // Turno e horário — mantém
        const diurno = document.getElementById('rr-chk-diurno');
        const noturno = document.getElementById('rr-chk-noturno');
        if (payload.turno === 'Diurno' && diurno) { diurno.checked = true; if (noturno) noturno.checked = false; }
        if (payload.turno === 'Noturno' && noturno) { noturno.checked = true; if (diurno) diurno.checked = false; }
        set('rr-input-hora-inicio', payload.hora_inicio);
        set('rr-input-hora-fim', payload.hora_fim);
        // Dias da semana — mantém
        const diasMap = { 'Seg': 'rr-chk-seg', 'Ter': 'rr-chk-ter', 'Qua': 'rr-chk-qua', 'Qui': 'rr-chk-qui', 'Sex': 'rr-chk-sex', 'Sáb': 'rr-chk-sab', 'Dom': 'rr-chk-dom' };
        Object.entries(diasMap).forEach(([d, id]) => {
            const el = document.getElementById(id);
            if (el) el.checked = (payload.dias_semana || []).includes(d);
        });
        // Tipo de serviço — LIMPA
        const tipoServEl = document.getElementById('rr-tipo-servico');
        if (tipoServEl) tipoServEl.value = '';
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
                contSug.innerHTML = `<span style="color:#166534;"><i class="ph ph-check-circle"></i> Sugeridos (até 2km): <b>${dias}</b></span>`;
            } else if (data.dias_sugeridos_5km && data.dias_sugeridos_5km.length > 0) {
                const dias = data.dias_sugeridos_5km.map(d => d.dia).join(', ');
                contSug.innerHTML = `<span style="color:#b45309;"><i class="ph ph-warning"></i> Sugeridos (até 5km): <b>${dias}</b></span>`;
            } else {
                contSug.innerHTML = `<span style="color:#b91c1c;"><i class="ph ph-x-circle"></i> Nenhuma rota sugerida (raio maior que 5km).</span>`;
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
                // Nenhuma OS com esse número — campo limpo para nova OS
                btn.style.background = '';
                mostrarToastAviso(`OS "${numOs}" não encontrada. Preencha os campos para criar uma nova.`);
                return;
            }
            throw new Error(`HTTP ${resp.status}`);
        }
        const registros = await resp.json(); // array de OS com esse número
        if (!registros || registros.length === 0) {
            btn.style.background = '';
            mostrarToastAviso(`OS "${numOs}" não encontrada. Preencha os campos para criar uma nova.`);
            return;
        }

        if (registros.length === 1) {
            // Se só tem 1, carrega direto
            carregarRegistroNaTela(registros[0]);
            mostrarToastAviso(`✅ OS "${numOs}" carregada.`);
        } else {
            // Mais de 1, abre o modal
            btn.style.background = '#f0fdf4';
            abrirModalListaOS(numOs, registros);
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
        let dSemana = '—';
        try { dSemana = JSON.parse(r.dias_semana).map(d => `<span style="background:${colorMap[d]||'#2563eb'};color:white;padding:2px 6px;border-radius:4px;margin-right:4px;">${d}</span>`).join(''); } catch(e) {}

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
        
        return `
            <tr class="rr-os-row" data-cliente="${(r.cliente||'').toLowerCase()}" data-endereco="${(r.endereco||'').toLowerCase()}" data-tipo="${(r.tipo_servico||'').toLowerCase()}" data-data="${r.data_os||''}" data-produto="${prodData}" style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
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
                <button onclick="['rr-filter-cliente','rr-filter-endereco','rr-filter-tipo','rr-filter-data','rr-filter-produto'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.querySelectorAll('.rr-os-row').forEach(r=>r.style.display='');" style="padding:7px 12px; background:#ef4444; color:white; border:none; border-radius:4px; font-size:0.78rem; cursor:pointer; white-space:nowrap;">✖ Limpar</button>
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
            const resp = await fetch(`/api/logistica/os/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
    try { return JSON.parse(val); } catch { return typeof val === 'string' ? [val] : []; }
}

window._carregarRegistroNaTela = function(os) {
    document.getElementById('rr-modal-lista-os')?.remove();
    carregarRegistroNaTela(os);
    mostrarToastAviso(`✅ Serviço carregado.`);
};

function carregarRegistroNaTela(os) {
    osState.loadedId = os.id;
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
    set('rr-input-cliente', os.cliente);
    set('rr-input-patrimonio', os.patrimonio);
    if (document.getElementById('rr-input-cliente')) {
        document.getElementById('rr-input-cliente').dataset.nomeBase = os.cliente || '';
    }
    set('rr-input-endereco', os.endereco);
    set('rr-input-complemento', os.complemento);
    set('rr-input-responsavel', os.responsavel);
    set('rr-input-sms', os.telefone);
    set('rr-input-email', os.email);
    set('rr-input-obs', os.observacoes);
    set('rr-input-obs-internas', os.observacoes_internas);
    set('rr-input-video', os.link_video);
    set('rr-tipo-servico', os.tipo_servico);
    // Preenche também o campo de busca visível do dropdown
    const tsSearch = document.getElementById('rr-tipo-servico-search');
    if (tsSearch && os.tipo_servico) tsSearch.value = os.tipo_servico;

    if (os.contrato) {
        const contEl = document.querySelector('input[placeholder="Nº Contrato"]');
        if (contEl) contEl.value = os.contrato;
    }
    if (os.data_os) {
        const dataEl = document.getElementById('rr-input-data');
        if (dataEl) dataEl.value = os.data_os;
    }

    if (os.lat && os.lng) set('rr-input-coord', `${os.lat}, ${os.lng}`);
    // Tipo de OS
    if (os.tipo_os) {
        osState.tipoOs = os.tipo_os;
        atualizarDropdownProdutos();
        atualizarIconesCliente();
    }
    // Turno e horário
    const diurno = document.getElementById('rr-chk-diurno');
    const noturno = document.getElementById('rr-chk-noturno');
    if (os.turno === 'Diurno' && diurno) { diurno.checked = true; if (noturno) noturno.checked = false; }
    if (os.turno === 'Noturno' && noturno) { noturno.checked = true; if (diurno) diurno.checked = false; }
    set('rr-input-hora-inicio', os.hora_inicio);
    set('rr-input-hora-fim', os.hora_fim);
    // Dias da semana
    const diasSalvos = parseJsonFront(os.dias_semana);
    const diasMap = { 'Seg': 'rr-chk-seg', 'Ter': 'rr-chk-ter', 'Qua': 'rr-chk-qua', 'Qui': 'rr-chk-qui', 'Sex': 'rr-chk-sex', 'Sáb': 'rr-chk-sab', 'Dom': 'rr-chk-dom' };
    Object.entries(diasMap).forEach(([d, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = diasSalvos.includes(d);
    });
    
    // Produtos
    osState.produtos = parseJsonFront(os.produtos).map(p => ({ ...p, id: Date.now() + Math.random() }));

    osState.clienteNome = os.cliente || '';
    atualizarUI();
    atualizarBloqueio();
}

function parseDiasFront(diasJson) {
    if (!diasJson) return [];
    try { return JSON.parse(diasJson); } catch { return typeof diasJson === 'string' ? [diasJson] : []; }
}

function exibirModalAgendaEndereco(data, enderecoAtual) {
    document.getElementById('rr-modal-agenda-end')?.remove();
    const DIAS_ALL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const colorMap = { 'Seg':'#ef4444', 'Ter':'#f97316', 'Qua':'#ca8a04', 'Qui':'#16a34a', 'Sex':'#3b82f6', 'Sáb':'#8b5cf6', 'Dom':'#ec4899' };
    
    const exatos = data.exatos || [];
    const proximos = data.proximos || [];

    let msgSugestao = '';
    const renderPills = (diasArr) => diasArr.map(d => `<span style="background:${colorMap[d.dia]||'#2563eb'};color:white;border:none;border-radius:4px;padding:2px 10px;font-size:0.72rem;font-weight:700;margin:2px;box-shadow: 0 1px 2px rgba(0,0,0,0.2);">${d.dia} <small style="opacity:0.9;">(${d.ocorrencias}x)</small></span>`).join('');

    if (data.dias_sugeridos_2km && data.dias_sugeridos_2km.length > 0) {
        msgSugestao = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.75rem;">
                <p style="margin:0 0 0.5rem 0; font-weight:700; color:#166534; font-size:0.85rem;"><i class="ph ph-check-square"></i> Dias com manutenção já programada nesta área (até 2km):</p>
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:0.5rem;">
                    ${renderPills(data.dias_sugeridos_2km)}
                </div>
                <p style="margin:0; font-size:0.7rem; color:#15803d;"><i class="ph ph-lightning"></i> Recomendamos agendar nestes mesmos dias para otimizar a logística.</p>
            </div>
        `;
    } else if (data.dias_sugeridos_5km && data.dias_sugeridos_5km.length > 0) {
        msgSugestao = `
            <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:0.75rem;">
                <p style="margin:0 0 0.5rem 0; font-weight:700; color:#854d0e; font-size:0.85rem;"><i class="ph ph-warning"></i> Dias com manutenção programada nesta região (até 5km):</p>
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:0.5rem;">
                    ${renderPills(data.dias_sugeridos_5km)}
                </div>
                <p style="margin:0; font-size:0.7rem; color:#a16207;"><i class="ph ph-info"></i> Considere agendar nestes dias se não houver outra opção mais próxima.</p>
            </div>
        `;
    } else {
        msgSugestao = `
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:0.75rem;">
                <p style="margin:0; font-weight:700; color:#b91c1c; font-size:0.85rem;"><i class="ph ph-warning-circle"></i> Nenhuma manutenção programada em um raio de 5km.</p>
                <p style="margin:0.25rem 0 0 0; font-size:0.7rem; color:#991b1b;">Não há sugestões de dias baseados em proximidade.</p>
            </div>
        `;
    }

    const linhasExatos = exatos.map(os => {
        const dias = parseDiasFront(os.dias_semana);
        const pills = DIAS_ALL.map(d => `<span style="display:inline-block;width:26px;height:20px;line-height:20px;text-align:center;border-radius:4px;font-size:0.6rem;font-weight:700;background:${dias.includes(d)?(colorMap[d]||'#2563eb'):'#f1f5f9'};color:${dias.includes(d)?'white':'#94a3b8'};">${d}</span>`).join('');
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 6px;font-size:0.7rem;font-weight:600;color:#2d9e5f;">${os.numero_os||'-'}</td>
            <td style="padding:4px 6px;font-size:0.7rem;">${os.cliente||'-'}</td>
            <td style="padding:4px 6px;font-size:0.68rem;color:#64748b;">${os.tipo_servico||'-'}</td>
            <td style="padding:4px 6px;">${pills}</td></tr>`;
    }).join('');

    const linhasProximos = proximos.map(os => {
        const dias = parseDiasFront(os.dias_semana);
        const pills = DIAS_ALL.map(d => `<span style="display:inline-block;width:26px;height:20px;line-height:20px;text-align:center;border-radius:4px;font-size:0.6rem;font-weight:700;background:${dias.includes(d)?(colorMap[d]||'#f59e0b'):'#f1f5f9'};color:${dias.includes(d)?'white':'#94a3b8'};">${d}</span>`).join('');
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 6px;font-size:0.7rem;font-weight:600;color:#f59e0b;">${os.numero_os||'-'}</td>
            <td style="padding:4px 6px;font-size:0.7rem;">${os.cliente||'-'}</td>
            <td style="padding:4px 6px;font-size:0.68rem;color:#64748b;">${os.distancia_km} km</td>
            <td style="padding:4px 6px;font-size:0.68rem;color:#64748b;">${os.tipo_servico||'-'}</td>
            <td style="padding:4px 6px;">${pills}</td></tr>`;
    }).join('');

    const endLabel = enderecoAtual.length > 50 ? enderecoAtual.substring(0,50) + '…' : enderecoAtual;
    const modal = document.createElement('div');
    modal.id = 'rr-modal-agenda-end';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:12px;width:700px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,0.2);overflow:hidden;">
            <div style="background:#2d9e5f;color:white;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <span style="font-weight:700;font-size:0.88rem;"><i class="ph ph-calendar-check"></i> Agenda de Manutenções — ${endLabel}</span>
                <button id="btn-fechar-modal-agenda" style="background:transparent;border:none;color:white;font-size:1.1rem;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <div style="overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:1rem;">
                ${msgSugestao}
                ${exatos.length > 0 ? `<div>
                    <p style="font-size:0.75rem;font-weight:700;color:#334155;margin:0 0 6px;"><i class="ph ph-map-pin"></i> OS neste endereço (${exatos.length}):</p>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f8fafc;">
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">OS</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Cliente</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Serviço</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Dias</th>
                        </tr></thead><tbody>${linhasExatos}</tbody></table></div>` : ''}
                ${proximos.length > 0 ? `<div>
                    <p style="font-size:0.75rem;font-weight:700;color:#92400e;margin:0 0 6px;"><i class="ph ph-circles-three"></i> Endereços próximos com manutenção — até 5km (${proximos.length}):</p>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#fffbeb;">
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">OS</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Cliente</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Dist.</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Serviço</th>
                            <th style="padding:4px 6px;font-size:0.68rem;color:#64748b;text-align:left;">Dias</th>
                        </tr></thead><tbody>${linhasProximos}</tbody></table></div>` : ''}
                ${exatos.length === 0 && proximos.length === 0 ? '<p style="text-align:center;color:#94a3b8;font-size:0.78rem;padding:1rem 0;">Nenhuma manutenção encontrada neste endereço ou num raio de 5km.</p>' : ''}
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#btn-fechar-modal-agenda')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Atualiza a sugestão abaixo dos botões de dia da semana na tela principal
    const containerSugestoes = document.getElementById('rr-sugestoes-dias-container');
    if (containerSugestoes) {
        if (data.dias_sugeridos_2km && data.dias_sugeridos_2km.length > 0) {
            const diasText = data.dias_sugeridos_2km.map(d => d.dia).join(', ');
            containerSugestoes.innerHTML = `<span style="color:#166534; font-weight:600;"><i class="ph ph-check-square"></i> Sugestão (Até 2km): ${diasText}</span>`;
            containerSugestoes.style.display = 'block';
        } else if (data.dias_sugeridos_5km && data.dias_sugeridos_5km.length > 0) {
            const diasText = data.dias_sugeridos_5km.map(d => d.dia).join(', ');
            containerSugestoes.innerHTML = `<span style="color:#854d0e; font-weight:600;"><i class="ph ph-warning"></i> Sugestão (Até 5km): ${diasText}</span>`;
            containerSugestoes.style.display = 'block';
        } else {
            containerSugestoes.innerHTML = `<span style="color:#b91c1c;"><i class="ph ph-warning-circle"></i> Nenhuma rota sugerida (raio maior que 5km).</span>`;
            containerSugestoes.style.display = 'block';
        }
    }
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
            const v = extrairValor(l, /💡?Observa[cç][õo]es:/i);
            if (!eVazio(v) && v !== '--') {
                resultado.observacoesInternas = v.replace(/Ignorar.*/i, '').replace(/-.*campo.*/i, '').trim();
            }
        }
    }

    return resultado;
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
        
        html += linha('🔢 OS', dadosExtraidos.numOs);
        html += linha('📅 Data', dadosExtraidos.dataEntrega);
        html += linha('👤 Cliente', dadosExtraidos.cliente);
        html += linha('📜 Contrato', dadosExtraidos.contrato);
        html += linha('🏢 Tipo OS', dadosExtraidos.tipoOsDB || dadosExtraidos.tipoOs);
        html += linha('👷 Responsável', dadosExtraidos.responsavel);
        html += linha('📞 Telefone', dadosExtraidos.telefone);
        html += linha('📍 Endereço', dadosExtraidos.endereco);
        html += linha('📧 Email', dadosExtraidos.email);
        html += linha('📦 Produtos', dadosExtraidos.rawProdutos);
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
    set('rr-input-endereco',    dados.endereco);
    set('rr-input-responsavel', dados.responsavel);
    set('rr-input-sms',    dados.telefone);
    set('rr-input-email',       dados.email);
    set('rr-input-obs',         dados.observacoes);
    set('rr-input-obs-internas',dados.observacoesInternas);

    if (dados.dataEntrega) {
        const dateEl = document.getElementById('rr-input-data');
        if (dateEl) { dateEl.value = dados.dataEntrega; dateEl.style.background = '#f0fdf4'; }
    }

    if (dados.contrato) {
        const contEl = document.querySelector('input[placeholder="Nº Contrato"]');
        if (contEl) { contEl.value = dados.contrato; contEl.style.background = '#f0fdf4'; }
    }

    // Atualiza estado do cliente
    osState.clienteNome = dados.cliente;

    // Processa Produtos (ex: "10 STD 1 PCD")
    if (dados.rawProdutos && tipoOs) {
        atualizarDropdownProdutos();
        // Extrai pares de "numero palavra"
        const prodRegex = /(\d+)\s+([A-Za-z]+)/g;
        let match;
        while ((match = prodRegex.exec(dados.rawProdutos)) !== null) {
            let qtd = parseInt(match[1], 10);
            let nomeStr = match[2].toUpperCase();
            
            // Map básico para encontrar nome
            const MAP_PROD = {
                'STD': 'STD', 'STANDARD': 'STD', 'LX': 'LX', 'ELX': 'ELX',
                'PCD': 'PCD', 'CHUVEIRO': 'CHUVEIRO', 'HIDRAULICO': 'HIDRÁULICO',
                'HIDRAU': 'HIDRÁULICO', 'MICTORIO': 'MICTÓRIO', 'MICT': 'MICTÓRIO',
                'PBII': 'PBII', 'PIA': 'PBII', 'CARRINHO': 'CARRINHO', 'CAIXA': 'CAIXA DAGUA'
            };
            let base = nomeStr;
            for (const [chave, valor] of Object.entries(MAP_PROD)) {
                if (nomeStr.includes(chave)) { base = valor; break; }
            }

            const nomeProdutoCompleto = `${base} ${tipoOs === 'Obra' ? 'OBRA' : 'EVENTO'}`;
            const produtoExiste = Object.keys(EQUIPAMENTOS_DICT).find(k => k === nomeProdutoCompleto);
            if (produtoExiste) {
                osState.produtos.push({ id: Date.now() + Math.random(), desc: nomeProdutoCompleto, qtd: qtd });
            }
        }
        atualizarUI();
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
                // Sempre limpa e re-renderiza ao abrir a tela (equivale ao limparCampos() do Flutter)
                osState.produtos = [];
                osState.tiposServico = new Set();
                osState.acoes = new Set();
                osState.clienteConfirmado = false;
                osState.clienteNome = '';
                osState.enderecoSelecionado = '';
                osState.tipoOs = ''; // reseta escolha Obra/Evento
                // Remove conteudo anterior e renderiza do zero
                const c = document.getElementById('rota-redonda-container');
                if (c) c.innerHTML = '';
                renderRotaRedonda();
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
            const numOs = e.target.value.trim();
            if (!numOs) { alert('Digite o número da OS primeiro.'); return; }
            await carregarOsPorNumero(numOs);
        }
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
                if (horaInicio) { horaInicio.value = ''; horaInicio.style.background = ''; }
                if (horaFim) { horaFim.value = ''; horaFim.style.background = ''; }
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
            const numOs = document.getElementById('rr-input-os')?.value?.trim();
            if (!numOs) {
                mostrarToastAviso('Digite o número da OS primeiro.');
                return;
            }

            const originalHtml = btnAddOsTipo.innerHTML;
            btnAddOsTipo.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/buscar?numero_os=${encodeURIComponent(numOs)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                
                if (resp.status === 404) {
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
                    if (registros && registros.length > 0) {
                        abrirModalListaOS(numOs, registros);
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
            const numContrato = document.querySelector('input[placeholder="Nº Contrato"]')?.value?.trim() || document.getElementById('rr-input-contrato')?.value?.trim();
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

        // Botão Criar Novo
        const btnCriarNovo = e.target.closest('#btn-criar-novo');
        if (btnCriarNovo) {
            osState.loadedId = null;
            document.getElementById('btn-gerar-os-final')?.click();
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

            const isManut = (document.getElementById('rr-tipo-servico')?.value || '').toUpperCase().includes('MANUTENCAO');
            const clicouAgenda = document.getElementById('rr-chk-agenda-clicado')?.value === '1';

            if (isManut) {
                if (!clicouAgenda && !osState.loadedId) {
                    mostrarToastAviso("Para serviços de Manutenção, é obrigatório clicar no botão Agenda para verificar as rotas na região.");
                    return;
                }
                if (diasSelecionados.length === 0) {
                    mostrarToastAviso("Para serviços de Manutenção, é obrigatório selecionar pelo menos um dia da semana sugerido.");
                    return;
                }
            }

            const habilidadesSelecionadas = Array.from(document.querySelectorAll('.btn-tipo-servico.ativo')).map(b => b.dataset.tipo);
            const variaveisSelecionadas = Array.from(document.querySelectorAll('.btn-acao.ativo')).map(b => b.dataset.acao);

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
                contrato: document.querySelector('input[placeholder="Nº Contrato"]')?.value?.trim() || '',
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

            // Validação básica
            if (!payload.cliente) { mostrarToastAviso('Preencha o nome do cliente antes de gerar a OS.'); return; }
            if (!payload.tipo_os) { mostrarToastAviso('Defina o tipo de OS (Obra ou Evento) clicando no botão +.'); return; }

            // Desabilita botão durante o save
            btnGerarOsFinal.disabled = true;
            btnGerarOsFinal.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando…';

            try {
                const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                
                let payloadsParaEnviar = [];
                const nomeBase = document.getElementById('rr-input-cliente')?.dataset?.nomeBase || document.getElementById('rr-input-cliente')?.value || '';

                if (payload.tipo_servico.includes('TROCA DE EQUIPAMENTO')) {
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
                const desc = document.getElementById('rr-prod-desc')?.value.trim();
                const qtd = parseInt(document.getElementById('rr-prod-qtd')?.value) || 1;
                if (!desc) return;
                osState.produtos.push({ id: Date.now(), desc, qtd });
                document.getElementById('rr-prod-desc').value = '';
                document.getElementById('rr-prod-qtd').value = '';
                atualizarUI();
                atualizarIconesCliente();
                calcularTempo();
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
            const id = parseInt(btnRemProd.dataset.id);
            osState.produtos = osState.produtos.filter(p => p.id !== id);
            atualizarUI();
            atualizarIconesCliente();
            calcularTempo(); // recalcula ao remover
            return;
        }
        
        // (Limpar OS já tratado acima pelo novo handler)

        // Pesquisar OS do cliente
        const btnPesqCliente = e.target.closest('#btn-pesq-cliente-os');
        if (btnPesqCliente) {
            let nome = document.getElementById('rr-input-cliente')?.value.trim();
            if (!nome) { alert('Digite o nome do cliente antes de pesquisar.'); return; }
            nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s🔴🟢]+/u, '').trim();
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
        if (overlayOS) overlayOS.style.display = 'none';
        if (overlayEnd) overlayEnd.style.display = 'none';
        return;
    }

    // Bloqueio principal: cobre o bloco inferior até definir Obra/Evento
    if (overlayOS) {
        overlayOS.style.display = osState.tipoOs ? 'none' : 'flex';
    }

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
        } else if (!match && osState.tiposServico.has(hab)) {
            // Desseleciona se palavra foi removida
            osState.tiposServico.delete(hab);
            btn.style.background = 'transparent';
            btn.style.color = '#2d9e5f';
        }
    });

    // Mapeamento palavra-chave → variável
    const acaoKeywords = [
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
        } else if (!match && osState.acoes.has(acao)) {
            osState.acoes.delete(acao);
            btn.style.background = '#f0f9ff';
            btn.style.color = '#0284c7';
        }
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
    atualizarUI();
    calcularTempo();
    atualizarIconesCliente();
};

function atualizarDropdownProdutos() {
    const datalist = document.getElementById('rr-prod-list');
    const badge = document.getElementById('rr-badge-tipo-os');
    if (!datalist) return;

    const produtos = getProdutosPorTipo(osState.tipoOs);
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
        iconeServico = '⚙️';
    } else if (tipoServico.includes('VISITA TECNICA')) {
        iconeServico = '📋';
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

    // Mostrar os icones dos produtos apenas quando o serviço for o de entrega
    let todosIcones = [];
    if (tipoServico.includes('ENTREGA') || (!tipoOverride && tipoServico.includes('TROCA'))) {
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
        nomeBase = clienteInput.value.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘]+/u, '').trim();
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
        const nomeClean = nomeCliente.replace(/[^\w\s]/g, '').trim();
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
        return `
            <tr class="rr-os-row-cli" data-idx="${i}" data-cliente="${(r.cliente||'').toLowerCase()}" data-endereco="${(r.endereco||'').toLowerCase()}" data-tipo="${(r.tipo_servico||'').toLowerCase()}" data-data="${r.data_os||''}" data-produto="${prodData}" style="border-bottom:1px solid #e2e8f0;transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <td style="padding:0.6rem 0.5rem;white-space:nowrap;font-weight:700;color:#2d9e5f;">${r.numero_os}</td>
                <td style="padding:0.6rem 0.5rem;font-weight:600;">${r.cliente}</td>
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
        tbody.innerHTML = osState.produtos.map(p => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 0.3rem 0.5rem; font-size:0.75rem;">${p.desc}</td>
                <td style="padding: 0.3rem 0.5rem; text-align:center; font-size:0.75rem; font-weight:600;">${p.qtd}</td>
                <td style="padding: 0.3rem 0.5rem; text-align:center;">
                    <button class="btn-action btn-rem-prod" data-id="${p.id}" style="color:#ef4444; background:transparent; border:none; padding:2px;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
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

    const html = `
    <div id="rota-redonda-content" style="background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; box-sizing: border-box;">
        
        <!-- HEADER FORM — Fixo no topo -->
        <div style="position: sticky; top: 60px; z-index: 20; display: flex; gap: 1rem; align-items: center; background: white; padding: 0.5rem 1.5rem; flex-shrink: 0; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; margin-top: -1.5rem; margin-left: -1.5rem; margin-right: -1.5rem; margin-bottom: 0.75rem;">
            
            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: #475569; white-space: nowrap; margin: 0;">OS</label>
                <div style="display: flex; align-items: center; gap: 2px;">
                    <img id="rr-img-tipo-os" src="" style="height: 28px; display: none;" alt="Tipo OS">
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
                <button id="btn-criar-novo" style="display:none; background:#0284c7; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;" title="Criar nova OS com os dados carregados"><i class="ph ph-copy"></i> Criar Novo</button>
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
                        <label style="${labelStyle}">Endereço</label>
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
                    <label style="display:flex; align-items:center; gap:2px; font-size:0.75rem; color:#475569; cursor:pointer;"><input type="checkbox" id="rr-chk-noturno" onchange="atualizarIconesCliente()"> Noturno</label>
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                    <span style="font-size: 0.75rem; font-weight: 600; color:#475569;">Horário:</span>
                    <input type="time" id="rr-input-hora-inicio" style="${inputStyle} width: 75px;"> às 
                    <input type="time" id="rr-input-hora-fim" style="${inputStyle} width: 75px;">
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                    <button id="btn-agenda-endereco" style="background:#f59e0b; border:none; color:white; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; gap:4px; padding:0 8px; font-weight:600; font-size:0.7rem;" title="Verificar manutenções programadas para esta região" onclick="document.getElementById('rr-chk-agenda-clicado').value='1';"><i class="ph ph-calendar-check" style="font-size:0.9rem;"></i> Agenda</button>
                    ${[
                        { d: 'Seg', id: 'rr-chk-seg', c: '#ef4444' },
                        { d: 'Ter', id: 'rr-chk-ter', c: '#f97316' },
                        { d: 'Qua', id: 'rr-chk-qua', c: '#ca8a04' },
                        { d: 'Qui', id: 'rr-chk-qui', c: '#16a34a' },
                        { d: 'Sex', id: 'rr-chk-sex', c: '#3b82f6' },
                        { d: 'Sáb', id: 'rr-chk-sab', c: '#8b5cf6' },
                        { d: 'Dom', id: 'rr-chk-dom', c: '#ec4899' }
                    ].map(item => `<label id="lbl-${item.id}" style="display:flex; align-items:center; gap:2px; font-size:0.7rem; color:${item.c}; font-weight:700; cursor:pointer; padding:2px 6px; border-radius:4px; border:1.5px solid ${item.c}; transition:background 0.15s;"><input type="checkbox" id="${item.id}" onchange="(function(chk,lbl,cor){lbl.style.background=chk.checked?cor:'transparent';lbl.style.color=chk.checked?'white':cor;})(this,this.closest('label'),'${item.c}')"> ${item.d}</label>`).join('')}
                    
                    <div id="rr-sugestoes-dias-container" style="flex-basis: 100%; font-size: 0.75rem; padding: 2px 4px; display: none;"></div>
                    <input type="hidden" id="rr-chk-agenda-clicado" value="0">
                </div>

                <!-- TIPO SERVIÇO (searchable) -->
                <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                    <div style="flex: 2;">
                        <label style="${labelStyle}">Tipo de Serviço</label>
                        <div style="position:relative;">
                            <input type="text" id="rr-tipo-servico-search" placeholder="Digite para filtrar..." autocomplete="off"
                                style="${inputStyle} width:100%; padding-right:22px;"
                                oninput="filtrarTiposServico(this.value)"
                                onfocus="document.getElementById('rr-tipo-dropdown').style.display='block'"
                                onblur="setTimeout(()=>document.getElementById('rr-tipo-dropdown').style.display='none',200)">
                            <i class="ph ph-caret-down" style="position:absolute;right:5px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:0.75rem;pointer-events:none;"></i>
                            <div id="rr-tipo-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;background:white;border:1px solid #cbd5e1;border-radius:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
                                ${TIPOS_SERVICO_OS.map(t => { let ic = ''; if(t.includes('RETIRADA')) ic = t.includes('TOTAL') ? '⭕' : '🔶'; else if(t.includes('SUCCAO')) ic = '💧'; else if(t.includes('LIMPA FOSSA')) ic = '💦'; else if(t.includes('REPARO')) ic = '⚙️'; else if(t.includes('VISITA TECNICA')) ic = '📋'; else if(t.includes('MANUTENCAO')) ic = t.includes('AVULSA') ? '❗' : ''; else if(t.includes('VAC')) ic = '🏗️'; else if(t.includes('TROCA')) ic = '♻️'; return `<div class="rr-tipo-opt" data-val="${t}" onclick="selecionarTipoServico('${t}')" style="padding:5px 10px;cursor:pointer;font-size:0.8rem;color:#1e293b;transition:background 0.1s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''"><span style="margin-right:4px;">${ic}</span>${t}</div>`; }).join('')}
                            </div>
                        </div>
                        <input type="hidden" id="rr-tipo-servico" onchange="onChangeTipoServico();">
                    </div>
                </div>

                <!-- HABILIDADES (pills: TANQUE, CARGA, VAC...) -->
                <div>
                    <label style="${labelStyle}">Habilidades</label>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${HABILIDADES.filter(s => s !== 'TECNICO').map(s =>
                            `<button class="btn-tipo-servico" data-tipo="${s}" style="border: 1px solid #2d9e5f; color: #2d9e5f; background: transparent; border-radius: 99px; padding: 2px 10px; font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">${s}</button>`
                        ).join('')}
                    </div>
                </div>

                <!-- OBSERVAÇÕES -->
                <div style="display: flex; gap: 0.5rem;">
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Obs. Motoristas</label>
                        <input type="text" id="rr-input-obs" style="${inputStyle}" placeholder="Info para motorista">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Obs. Internas</label>
                        <input type="text" id="rr-input-obs-internas" style="${inputStyle}" placeholder="Info interna">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Link Vídeo</label>
                        <div style="display: flex; gap: 2px;">
                            <input type="text" id="rr-input-video" style="${inputStyle}" placeholder="Link YouTube/Drive">
                            <button style="background:#3b82f6; color:white; width:26px; height:26px; border:none; border-radius:4px; cursor:pointer;"><i class="ph ph-video-camera"></i></button>
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
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-clock"></i> Tempo: <strong id="rr-tempo-total">00:10</strong></span>
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-truck"></i> Tanques: <strong id="rr-total-tanques">0</strong></span>
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
                    ${ACOES.filter(s => s !== 'TROCA DE CABINE' && s !== 'CARRETINHA').map(s => 
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
                    <!-- Header do Mapa -->
                    <div style="background: rgba(255,255,255,0.97); padding: 0.4rem 0.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; flex-shrink:0;">
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
}
