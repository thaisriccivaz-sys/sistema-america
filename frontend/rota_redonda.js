/* ════════════════════════════════════════════════════════════════════════════
   MÓDULO: ROTA REDONDA (ORDENS DE SERVIÇO)
   ════════════════════════════════════════════════════════════════════════════ */

let osState = {
    produtos: [],
    tiposServico: new Set(),
    acoes: new Set(),
    tempoTotal: 10,
    qtdTanques: 0,
    clienteConfirmado: true,
    clienteNome: '',
    enderecoSelecionado: '',
    tipoOs: '' // 'Obra' ou 'Evento' — definido no popup ao adicionar produto
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
    'PCD EVENTO':             { icone: '🧑🏾‍🦳', codigo: 'PCD E' },
    'CHUVEIRO OBRA':          { icone: '🚣', codigo: 'CHUVEIRO O' },
    'CHUVEIRO EVENTO':        { icone: '🚣', codigo: 'CHUVEIRO E' },
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
                <button id="rr-btn-obra" style="width:100px;height:100px;background:#156EB6;border:none;border-radius:12px;color:white;font-weight:700;font-size:1rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:background 0.2s;">
                    <span style="font-size:2rem">🏗️</span>OBRA
                </button>
                <button id="rr-btn-evento" style="width:100px;height:100px;background:#8E24AA;border:none;border-radius:12px;color:white;font-weight:700;font-size:1rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:background 0.2s;">
                    <span style="font-size:2rem">🎉</span>EVENTO
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
    '! AVULSO': '❗',
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
    // Accept standard coordinate formats like "lat, lng" or "lat lng"
    const coordStr = coordInput.value.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
    const parts = coordStr.split(' ');
    
    if (parts.length < 2) {
        alert("Por favor, digite a latitude e longitude separadas por espaço ou vírgula.");
        coordInput.focus();
        return;
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) {
        alert("Coordenadas inválidas.");
        coordInput.focus();
        return;
    }

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
                endInput.value = data.display_name;
                endInput.style.background = '#f0fdf4';
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
    const endInput = document.getElementById('rr-input-endereco');
    const btn      = document.getElementById('btn-geocode-endereco');
    const placeholder = document.getElementById('rr-mapa-placeholder');

    const endereco = endInput?.value?.trim();
    if (!endereco) { endInput?.focus(); return; }

    // Normaliza o endereço para a query do Nominatim (NÃO altera o campo na tela)
    let enderecoQuery = endereco
        .replace(/(\d)\.(\d{3})\b/g, '$1$2')            // 1.814 → 1814
        .replace(/\|\s*CEP[:\s-]*\d{5}-?\d{3}\b/gi, '') // Remove " | CEP: 07025-000" (confunde a API se ficar no final com pipe)
        .replace(/\s*\/\s*[A-Z]{2}\b/gi, '')            // Remove " /SP", " /RJ" (Nominatim não lida bem com barra)
        .replace(/\s*\|\s*/g, ', ')                     // Substitui pipes restantes por vírgula
        .replace(/\s*-\s*(?=[a-zA-Z])/g, ', ')          // Hífen solto por vírgula "VILA - GUARULHOS" → "VILA, GUARULHOS"
        .replace(/\s{2,}/g, ' ')                        // Remove espaços extras
        .trim();

    // Spinner no botão
    if (btn) { btn.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 1s linear infinite;"></i>'; btn.disabled = true; }

    const headers = { 'Accept-Language': 'pt-BR', 'User-Agent': 'AmericaRentalSistema/1.0' };

    // Extrai CEP do endereço original para busca direta (mais precisa)
    const cepMatch = endereco.match(/\b(\d{5})-?(\d{3})\b/);
    const temCidade = /são paulo|sp|guarulhos|campinas|mogi|abc|santo andr|osasco|rio de jan/i.test(endereco);

    // Estratégia em cascata com endereço NORMALIZADO (sem separador de milhar)
    const queries = [
        // 1ª: query normalizada com filtro Brasil
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoQuery)}&format=json&limit=1&accept-language=pt-BR&countrycodes=br`,
    ];

    // 2ª: se não tem cidade, adiciona "São Paulo, SP, Brasil"
    if (!temCidade) {
        queries.push(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoQuery + ', São Paulo, SP, Brasil')}&format=json&limit=1&accept-language=pt-BR`
        );
    }

    // 3ª: busca pelo CEP separado se tiver (mais precisa)
    if (cepMatch) {
        queries.push(
            `https://nominatim.openstreetmap.org/search?q=${cepMatch[1]}-${cepMatch[2]},Brasil&format=json&limit=1&accept-language=pt-BR`
        );
    }

    // 4ª: fallback global sem restrição
    queries.push(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoQuery + ' Brasil')}&format=json&limit=1&accept-language=pt-BR`
    );

    try {
        let data = null;
        for (const url of queries) {
            const resp = await fetch(url, { headers });
            const result = await resp.json();
            if (result && result.length > 0) { data = result; break; }
            // Respeita o rate limit do Nominatim (1 req/s)
            await new Promise(r => setTimeout(r, 300));
        }

        if (!data || data.length === 0) {
            mostrarToastAviso('❌ Endereço não encontrado. Tente: "Rua X, 123, Cidade/SP" ou inclua o CEP.');
            return;
        }

        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const nomeFormatado = data[0].display_name;

        // Mostra o mapa e oculta placeholder
        if (placeholder) placeholder.style.display = 'none';
        const mapaDiv = document.getElementById('rr-mapa-leaflet');
        if (mapaDiv) mapaDiv.style.display = 'block';

        // Inicializa mapa se ainda não foi feito
        inicializarMapa();

        // Aguarda o mapa estar pronto e posiciona
        setTimeout(() => {
            _leafletMap.invalidateSize();
            posicionarMarcador(lat, lng);
            preencherLatLng(lat, lng);
            // Mantém o endereço original do usuário — apenas destaca em verde
            if (endInput) endInput.style.background = '#f0fdf4';
            osState.enderecoConfirmado = true;
            atualizarBloqueio();
        }, 50);

    } catch (err) {
        console.error('[Nominatim]', err);
        mostrarToastAviso('❌ Erro ao buscar endereço. Verifique sua conexão.');
    } finally {
        if (btn) { btn.innerHTML = '<i class="ph ph-magnifying-glass"></i>'; btn.disabled = false; }
    }
}

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
                <!-- Pergunta de duplicação -->
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-copy" style="font-size:1.2rem;color:#d97706;"></i>
                        <p style="margin:0;font-size:0.78rem;font-weight:600;color:#92400e;">Deseja duplicar para um novo serviço desta OS?</p>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button id="btn-duplicar-os-sim" style="background:#d97706;color:white;border:none;border-radius:6px;padding:4px 14px;font-size:0.75rem;font-weight:700;cursor:pointer;">✔ Sim</button>
                        <button id="btn-duplicar-os-nao" style="background:#e2e8f0;color:#334155;border:none;border-radius:6px;padding:4px 14px;font-size:0.75rem;font-weight:600;cursor:pointer;">✖ Não</button>
                    </div>
                </div>
            </div>
            <!-- Rodapé -->
            <div style="display:flex;gap:8px;justify-content:flex-end;padding:0.75rem 1.5rem;background:#f8fafc;">
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

    // Não duplicar: fecha o painel de pergunta apenas
    modal.querySelector('#btn-duplicar-os-nao')?.addEventListener('click', () => {
        const panel = modal.querySelector('#btn-duplicar-os-sim')?.closest('div');
        if (panel) panel.style.display = 'none';
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
        const dataEl = document.querySelector('input[type="date"]');
        if (dataEl) dataEl.value = '';
        // Responsável, telefone, email — mantém
        set('rr-input-responsavel', payload.responsavel);
        set('rr-input-telefone', payload.telefone);
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
        const parts = coordInput.value.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').split(' ');
        if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
            params.set('lat', parts[0]);
            params.set('lng', parts[1]);
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
        let prod = '—';
        try {
            const parsedProd = JSON.parse(r.produtos);
            if (Array.isArray(parsedProd) && parsedProd.length > 0) {
                prod = parsedProd.map(p => {
                    const prodInfo = EQUIPAMENTOS_DICT[p.desc.trim()];
                    const icone = prodInfo?.icone ? `${prodInfo.icone} ` : '';
                    return `<span style="background:#1e40af;color:white;padding:2px 6px;border-radius:12px;margin-right:4px;display:inline-block;white-space:nowrap;margin-bottom:2px;">${icone}${p.desc} (${p.qtd})</span>`;
                }).join('');
            }
        } catch(e) {}

        let dSemana = '—';
        try { dSemana = JSON.parse(r.dias_semana).map(d => `<span style="background:#2563eb;color:white;padding:2px 6px;border-radius:4px;margin-right:4px;">${d}</span>`).join(''); } catch(e) {}

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
            <tr class="rr-os-row" data-cliente="${(r.cliente||'').toLowerCase()}" data-endereco="${(r.endereco||'').toLowerCase()}" style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
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
                    <p style="margin:0;font-size:0.8rem;opacity:0.9;">Serviços vinculados à OS #${numOs}. Clique no botão Editar para carregar as informações.</p>
                </div>
                <button id="btn-fechar-modal-lista-os" style="background:transparent;border:none;color:white;font-size:1.5rem;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <!-- Filtros -->
            <div style="padding:0.75rem 1.5rem; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; gap:10px;">
                <input type="text" id="rr-filter-cliente" placeholder="Filtrar por Cliente..." style="flex:1; padding:8px 12px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; outline:none;">
                <input type="text" id="rr-filter-endereco" placeholder="Filtrar por Endereço..." style="flex:1; padding:8px 12px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; outline:none;">
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

    window._excluirOsLista = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) return;
        try {
            const resp = await fetch(`/api/logistica/os/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!resp.ok) throw new Error('Erro ao excluir');
            if (typeof showToast === 'function') showToast('OS excluída com sucesso!', 'success');
            modal.remove(); // Fecha o modal e obriga recarregar se buscar de novo
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir OS.');
        }
    };

    // Lógica de Filtro
    const filterData = () => {
        const fCli = (document.getElementById('rr-filter-cliente')?.value || '').toLowerCase();
        const fEnd = (document.getElementById('rr-filter-endereco')?.value || '').toLowerCase();
        document.querySelectorAll('.rr-os-row').forEach(row => {
            const cli = row.dataset.cliente || '';
            const end = row.dataset.endereco || '';
            row.style.display = (cli.includes(fCli) && end.includes(fEnd)) ? '' : 'none';
        });
    };
    document.getElementById('rr-filter-cliente')?.addEventListener('input', filterData);
    document.getElementById('rr-filter-endereco')?.addEventListener('input', filterData);
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
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
    set('rr-input-cliente', os.cliente);
    if (document.getElementById('rr-input-cliente')) {
        document.getElementById('rr-input-cliente').dataset.nomeBase = os.cliente || '';
    }
    set('rr-input-endereco', os.endereco);
    set('rr-input-complemento', os.complemento);
    set('rr-input-responsavel', os.responsavel);
    set('rr-input-telefone', os.telefone);
    set('rr-input-email', os.email);
    set('rr-input-obs', os.observacoes);
    set('rr-input-obs-internas', os.observacoes_internas);
    set('rr-input-video', os.link_video);
    set('rr-tipo-servico', os.tipo_servico);
    if (os.contrato) {
        const contEl = document.querySelector('input[placeholder="Nº Contrato"]');
        if (contEl) contEl.value = os.contrato;
    }
    if (os.data_os) {
        const dataEl = document.querySelector('input[type="date"]');
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
    const diasSugeridos = data.dias_sugeridos || [];
    const exatos = data.exatos || [];
    const proximos = data.proximos || [];

    const pilulasSugeridos = diasSugeridos.length > 0
        ? diasSugeridos.map(d => `<span style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;margin:2px;">${d.dia} <small style="opacity:0.7;">(${d.ocorrencias}x)</small></span>`).join('')
        : '<span style="color:#94a3b8;font-size:0.75rem;">Nenhuma manutenção encontrada para este endereço exato.</span>';

    const linhasExatos = exatos.map(os => {
        const dias = parseDiasFront(os.dias_semana);
        const pills = DIAS_ALL.map(d => `<span style="display:inline-block;width:26px;height:20px;line-height:20px;text-align:center;border-radius:4px;font-size:0.6rem;font-weight:700;background:${dias.includes(d)?'#2d9e5f':'#f1f5f9'};color:${dias.includes(d)?'white':'#94a3b8'};">${d}</span>`).join('');
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 6px;font-size:0.7rem;font-weight:600;color:#2d9e5f;">${os.numero_os||'-'}</td>
            <td style="padding:4px 6px;font-size:0.7rem;">${os.cliente||'-'}</td>
            <td style="padding:4px 6px;font-size:0.68rem;color:#64748b;">${os.tipo_servico||'-'}</td>
            <td style="padding:4px 6px;">${pills}</td></tr>`;
    }).join('');

    const linhasProximos = proximos.map(os => {
        const dias = parseDiasFront(os.dias_semana);
        const pills = DIAS_ALL.map(d => `<span style="display:inline-block;width:26px;height:20px;line-height:20px;text-align:center;border-radius:4px;font-size:0.6rem;font-weight:700;background:${dias.includes(d)?'#f59e0b':'#f1f5f9'};color:${dias.includes(d)?'white':'#94a3b8'};">${d}</span>`).join('');
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
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:0.75rem;">
                    <p style="font-size:0.75rem;font-weight:700;color:#166534;margin:0 0 6px;">✅ Dias com manutenção já programada neste endereço:</p>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">${pilulasSugeridos}</div>
                    ${diasSugeridos.length > 0 ? '<p style="font-size:0.68rem;color:#166534;margin:6px 0 0;">💡 Recomendamos agendar nestes mesmos dias para otimizar a logística.</p>' : ''}
                </div>
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
    const lines = texto.replace(/\r/g, '').split('\n').map(l => l.trim());
    const resultado = {
        numOs: '', cliente: '', contrato: '', tipoOs: '',
        responsavel: '', telefone: '', endereco: '', email: '',
        dataEntrega: '', rawProdutos: '', observacoes: '', observacoesInternas: '',
        ambiguidades: [], avisos: []
    };

    const eVazio = (v) => !v || /^[\s\-–—*]*$/.test(v);
    const extrairValor = (linha, prefixo) => linha.replace(prefixo, '').replace(/^[\s\-–—:]+/, '').trim();

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const lu = l.toUpperCase();

        // OS -> Número na linha seguinte
        if (lu === 'OS' && i + 1 < lines.length) {
            resultado.numOs = lines[i + 1].trim();
        }
        
        // Data Cadastro -> Data (i+1)
        else if (lu === 'DATA CADASTRO' && i + 1 < lines.length) {
            const v = lines[i + 1].trim();
            const datasEncontradas = [...v.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)];
            if (datasEncontradas.length > 0) {
                const [, d, m, a] = datasEncontradas[0];
                const ano = a ? (a.length === 2 ? '20' + a : a) : new Date().getFullYear();
                resultado.dataEntrega = `${ano}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
            }
        }

        // Cliente -> ID (i+1), Nome (i+2)
        else if (lu === 'CLIENTE' && i + 2 < lines.length && /^\d+$/.test(lines[i + 1].trim())) {
            resultado.cliente = lines[i + 2].trim();
        }

        // Contato -> Contrato (i+1)
        else if (lu === 'CONTATO' && i + 1 < lines.length) {
            const c = lines[i + 1].trim();
            if (/^\d+$/.test(c)) resultado.contrato = c;
        }

        // Tipo e Situação do Contrato -> Obra ou Evento (i+1)
        else if (lu === 'TIPO E SITUAÇÃO DO CONTRATO' && i + 1 < lines.length) {
            const val = lines[i + 1].toUpperCase();
            if (val.includes('OBRA')) resultado.tipoOs = 'Obra';
            else if (val.includes('EVENTO')) resultado.tipoOs = 'Evento';
        }

        // 📞Contato de instalação:
        else if (l.includes('📞Contato') || l.includes('Contato de instalação:')) {
            const v = extrairValor(l, /📞?Contato de instala[cç][aã]o:/i);
            if (!eVazio(v)) {
                const parts = v.split('-');
                resultado.responsavel = parts[0].trim();
                if (parts.length > 1) {
                    const tel = parts[1].replace(/[^\d]/g, '');
                    if (tel.length >= 8) {
                        const t = tel;
                        resultado.telefone = t.length === 11 ? `(${t.slice(0,2)}) ${t.slice(2,7)}-${t.slice(7)}` : t;
                    }
                }
            }
        }

        // 📍Endereço de entrega:
        else if (l.includes('📍Endereço') || l.includes('Endereço de entrega:')) {
            const v = extrairValor(l, /📍?Endere[cç]o de entrega:/i);
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
            html += `<div style="color:#b45309;background:#fef3c7;padding:6px 10px;border-radius:4px;margin-bottom:8px;font-weight:bold;border:1px solid #f59e0b;">
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
        document.getElementById('rr-colar-confirmar').style.display = 'block';
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
    // Desbloqueia o formulário
    osState.clienteConfirmado = true;
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
    set('rr-input-telefone',    dados.telefone);
    set('rr-input-email',       dados.email);
    set('rr-input-obs',         dados.observacoes);
    set('rr-input-obs-internas',dados.observacoesInternas);

    if (dados.dataEntrega) {
        const dateEl = document.querySelector('input[type="date"]');
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

    // ─ Enter no campo OS: carrega dados de uma OS existente ─────────────────
    const inputOs = document.getElementById('rr-input-os');
    if (inputOs) {
        inputOs.addEventListener('keydown', async (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const numOs = inputOs.value.trim();
            if (!numOs) return;
            await carregarOsPorNumero(numOs);
        });
    }

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
                    // Nova OS
                    const numSalvo = numOs;
                    
                    // Limpa todas as informações preenchidas na tela
                    osState.produtos = []; osState.tiposServico = new Set();
                    osState.acoes = new Set(); osState.clienteConfirmado = true;
                    osState.clienteNome = ''; osState.enderecoSelecionado = ''; osState.tipoOs = '';
                    const c = document.getElementById('rota-redonda-container');
                    if (c) c.innerHTML = '';
                    renderRotaRedonda();
                    
                    setTimeout(() => {
                        const inputOs = document.getElementById('rr-input-os');
                        if (inputOs) inputOs.value = numSalvo;
                        
                        abrirPopupTipoOs((tipo) => {
                            osState.tipoOs = tipo;
                            atualizarDropdownProdutos();
                            atualizarIconesCliente();
                            atualizarBloqueio();
                            mostrarToastAviso(`Nova OS iniciada do zero. Tipo: ${tipo}.`);
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

        // Botão Colar OS
        const btnColarOs = e.target.closest('#btn-colar-os');
        if (btnColarOs) { abrirModalColarOS(); return; }

        // Botão Gerar OS (validação)
        const btnGerarOsFinal = e.target.closest('#btn-gerar-os-final');
        if (btnGerarOsFinal) {
            if (!osState.enderecoConfirmado) {
                mostrarToastAviso("Pesquise e confirme o endereço na Lupa azul antes de salvar.");
                // Anima o botão da lupa
                const btnGeo = document.getElementById('btn-geocode-endereco');
                if (btnGeo) {
                    btnGeo.style.transition = 'transform 0.1s, box-shadow 0.1s';
                    btnGeo.style.transform = 'scale(1.3)';
                    btnGeo.style.boxShadow = '0 0 12px 4px #0369a1';
                    setTimeout(() => { btnGeo.style.transform = 'scale(1)'; btnGeo.style.boxShadow = 'none'; }, 600);
                }
                return;
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
            const coordParts = coordStr.replace(/,/g, ' ').replace(/\s+/g, ' ').split(' ');
            const lat = coordParts.length >= 2 ? parseFloat(coordParts[0]) : null;
            const lng = coordParts.length >= 2 ? parseFloat(coordParts[1]) : null;

            // Coleta dias da semana selecionados
            const diasSelecionados = [];
            const diasMap = { 'rr-chk-seg': 'Seg', 'rr-chk-ter': 'Ter', 'rr-chk-qua': 'Qua', 'rr-chk-qui': 'Qui', 'rr-chk-sex': 'Sex', 'rr-chk-sab': 'Sáb', 'rr-chk-dom': 'Dom' };
            Object.entries(diasMap).forEach(([id, label]) => {
                if (document.getElementById(id)?.checked) diasSelecionados.push(label);
            });

            const habilidadesSelecionadas = Array.from(document.querySelectorAll('.btn-tipo-servico.ativo')).map(b => b.dataset.tipo);
            const variaveisSelecionadas = Array.from(document.querySelectorAll('.btn-acao.ativo')).map(b => b.dataset.acao);

            const payload = {
                numero_os: document.getElementById('rr-input-os')?.value?.trim() || '',
                tipo_os: osState.tipoOs || '',
                cliente: (document.getElementById('rr-input-cliente')?.dataset?.nomeBase || document.getElementById('rr-input-cliente')?.value || '').trim(),
                endereco: document.getElementById('rr-input-endereco')?.value?.trim() || '',
                complemento: document.getElementById('rr-input-complemento')?.value?.trim() || '',
                cep: document.getElementById('rr-input-cep')?.value?.trim() || '',
                lat: isNaN(lat) ? null : lat,
                lng: isNaN(lng) ? null : lng,
                contrato: document.querySelector('input[placeholder="Nº Contrato"]')?.value?.trim() || '',
                data_os: document.querySelector('input[type="date"]')?.value || '',
                responsavel: document.getElementById('rr-input-responsavel')?.value?.trim() || '',
                telefone: document.getElementById('rr-input-telefone')?.value?.trim() || '',
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
                    payloadE.cliente = `${gerarPrefixoIcones('ENTREGA')} ${nomeBase}`.trim();
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
                    const resp = await fetch('/api/logistica/os', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(p)
                    });
                    const result = await resp.json();

                    if (resp.ok && result.ok) {
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
                btnGerarOsFinal.innerHTML = '<i class="ph ph-check-circle"></i> Gerar OS';
            }
            return;
        }


        // Botão Geocode (buscar endereço → lat/lng + mapa)
        const btnGeocode = e.target.closest('#btn-geocode-endereco');
        if (btnGeocode) { geocodeEndereco(); return; }

        // Botão Geocode Coord (buscar lat/lng → endereço + mapa)
        const btnGeocodeCoord = e.target.closest('#btn-geocode-coord');
        if (btnGeocodeCoord) { reverseGeocodeEndereco(); return; }

        // Botão Agenda Endereço (verificar manutenções programadas)
        const btnAgendaEnd = e.target.closest('#btn-agenda-endereco');
        if (btnAgendaEnd) { buscarAgendaEndereco(); return; }

        // Botão Limpar OS
        const btnLimpar = e.target.closest('#btn-limpar-os');
        if (btnLimpar) {
            osState.produtos = []; osState.tiposServico = new Set();
            osState.acoes = new Set(); osState.clienteConfirmado = false;
            osState.enderecoConfirmado = false;
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

        // Remover Produto
        const btnRemProd = e.target.closest('.btn-rem-prod');
        if (btnRemProd) {
            const id = parseInt(btnRemProd.dataset.id);
            osState.produtos = osState.produtos.filter(p => p.id !== id);
            atualizarUI();
            calcularTempo(); // recalcula ao remover
            return;
        }
        
        // (Limpar OS já tratado acima pelo novo handler)

        // Pesquisar OS do cliente
        const btnPesqCliente = e.target.closest('#btn-pesq-cliente-os');
        if (btnPesqCliente) {
            const nome = document.getElementById('rr-input-cliente')?.value.trim();
            if (!nome) { alert('Digite o nome do cliente antes de pesquisar.'); return; }
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
    const overlayOS = document.getElementById('rr-overlay-bloqueio');
    const overlayEnd = document.getElementById('rr-overlay-bloqueio-endereco');
    
    if (overlayOS) {
        overlayOS.style.display = osState.tipoOs ? 'none' : 'flex';
    }
    if (overlayEnd) {
        // Só mostra o bloqueio de endereço SE a OS já estiver liberada
        overlayEnd.style.display = (osState.tipoOs && !osState.enderecoConfirmado) ? 'flex' : 'none';
    }
}

// ── ATUALIZA LISTA DE PRODUTOS FILTRADA POR OBRA/EVENTO ───────────────────
function atualizarDropdownProdutos() {
    const datalist = document.getElementById('rr-prod-list');
    const badge = document.getElementById('rr-badge-tipo-os');
    if (!datalist) return;

    const produtos = getProdutosPorTipo(osState.tipoOs);
    datalist.innerHTML = produtos.map(p =>
        `<option value="${p.nome}" label="${p.icone} ${p.nome}">${p.icone} ${p.nome}</option>`
    ).join('');

    if (badge) {
        badge.textContent = osState.tipoOs || '';
        badge.style.background = osState.tipoOs === 'Obra' ? '#156EB6' : osState.tipoOs === 'Evento' ? '#8E24AA' : '#94a3b8';
        badge.style.display = osState.tipoOs ? 'inline-flex' : 'none';
    }

    // Filtra o dropdown de Tipo de Serviço pelo tipo selecionado (Obra/Evento)
    const selectServico = document.getElementById('rr-tipo-servico');
    if (selectServico && osState.tipoOs) {
        const filtro = osState.tipoOs.toUpperCase(); // 'OBRA' ou 'EVENTO'
        Array.from(selectServico.options).forEach(opt => {
            if (opt.value === '') return; // mantém o placeholder
            opt.hidden = !opt.value.toUpperCase().includes(filtro);
        });
    }
}

function gerarPrefixoIcones(tipoOverride = null) {
    const tipoServico = (tipoOverride || document.getElementById('rr-tipo-servico')?.value || '').toUpperCase();

    // Coleta ícones dos produtos selecionados
    const iconesProdutos = [];
    document.querySelectorAll('.rr-produto-row').forEach(row => {
        const nomeInput = row.querySelector('input[type="text"]');
        if (!nomeInput?.value) return;
        const prod = EQUIPAMENTOS_DICT[nomeInput.value.trim()];
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
        iconeServico = ''; // Sem ícone
    } else if (tipoServico.includes('VAC')) {
        iconeServico = '🏗️';
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

    // Oculta ícones de produto se for Retirada Total/Parcial, conforme regra: "independentemente do produto... o icone é sempre o mesmo"
    // Mas se for uma TROCA virtual (antes de salvar), e o Override for "ENTREGA", incluimos os produtos!
    let todosIcones = [];
    if (tipoServico.includes('RETIRADA') || (tipoServico.includes('TROCA') && !tipoOverride)) {
        todosIcones = [iconeServico, ...iconesVariaveis];
    } else {
        todosIcones = [iconeServico, ...iconesProdutos, ...iconesVariaveis].filter(Boolean);
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


function abrirModalOSCliente(nomeCliente) {
    document.getElementById('rr-modal-os-cliente')?.remove();
    // Futuramente: buscar OS reais do backend pelo nome do cliente
    const osMock = [
        { os: '10234', data: '10/04/2025', tipo: 'MANUTENCAO OBRA', endereco: 'Rua das Flores, 123' },
        { os: '10198', data: '22/03/2025', tipo: 'ENTREGA OBRA',    endereco: 'Av. Paulista, 456' },
        { os: '10087', data: '01/02/2025', tipo: 'RETIRADA EVENTO', endereco: 'Rua Geral, 789' },
    ];
    const linhas = osMock.map(o => `
        <div style="display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0.75rem; border-bottom:1px solid #f1f5f9;">
            <span style="font-size:0.72rem; font-weight:700; color:#2d9e5f; width:55px;">OS ${o.os}</span>
            <span style="font-size:0.7rem; color:#64748b; width:80px;">${o.data}</span>
            <span style="font-size:0.7rem; color:#334155; flex:1;">${o.tipo}</span>
            <span style="font-size:0.7rem; color:#94a3b8; flex:1;">${o.endereco}</span>
        </div>
    `).join('');
    const modal = document.createElement('div');
    modal.id = 'rr-modal-os-cliente';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:10px;width:620px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);overflow:hidden;">
            <div style="background:#2d9e5f;color:white;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;font-size:0.9rem;"><i class="ph ph-clipboard-text"></i> OS de <em>${nomeCliente}</em></span>
                <button id="btn-fechar-modal-os" style="background:transparent;border:none;color:white;font-size:1.1rem;cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <div style="display:flex;gap:0.5rem;padding:0.4rem 0.75rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:0.68rem;font-weight:700;color:#64748b;width:55px;">OS</span>
                <span style="font-size:0.68rem;font-weight:700;color:#64748b;width:80px;">DATA</span>
                <span style="font-size:0.68rem;font-weight:700;color:#64748b;flex:1;">TIPO</span>
                <span style="font-size:0.68rem;font-weight:700;color:#64748b;flex:1;">ENDEREÇO</span>
            </div>
            <div style="max-height:280px;overflow-y:auto;">${linhas}</div>
            <div style="padding:0.5rem 0.75rem;background:#f8fafc;font-size:0.72rem;color:#94a3b8;text-align:center;">Histórico de OS — dados vindos do sistema</div>
        </div>
    `;
    document.body.appendChild(modal);
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
    <div id="rota-redonda-content" style="background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; height: calc(100vh - 65px); box-sizing: border-box; overflow: hidden;">
        
        <!-- HEADER FORM — Fixo no topo, fora do scroll -->
        <div style="position: relative; z-index: 100; display: flex; gap: 1rem; align-items: center; background: #2d9e5f; padding: 0.5rem 0.75rem; color: white; flex-shrink: 0; flex-wrap: wrap; border-radius: 6px 6px 0 0;">
            
            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: white; white-space: nowrap; margin: 0;">OS</label>
                <div style="display: flex; align-items: center; gap: 2px;">
                    <input type="text" id="rr-input-os" style="${inputStyle} border:none; width: 80px;" placeholder="Ex: 12345">
                    <button id="btn-add-os-tipo" style="${btnStyle} background:#1a7a40;" title="Definir tipo de OS (Obra/Evento)"><i class="ph ph-plus"></i></button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
                <label style="font-weight: 600; font-size: 0.75rem; color: white; white-space: nowrap; margin: 0;">Cliente</label>
                <div style="display:flex; gap:4px; align-items:center; width: 100%;">
                    <input type="text" id="rr-input-cliente" style="${inputStyle} border:none;" placeholder="Nome do Cliente">
                    <button id="btn-pesq-cliente-os" style="${btnStyle} background:#1a7a40;" title="Pesquisar cliente"><i class="ph ph-magnifying-glass"></i></button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: white; white-space: nowrap; margin: 0;">Contrato</label>
                <input type="text" style="${inputStyle} border:none; width: 100px;" placeholder="Nº Contrato">
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <label style="font-weight: 600; font-size: 0.75rem; color: white; white-space: nowrap; margin: 0;">Data</label>
                <input type="date" style="${inputStyle} border:none; width: 110px;">
            </div>

            <div style="display:flex; gap:0.5rem; margin-left: auto;">
                <button id="btn-colar-os" style="background:#f59e0b; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;" title="Colar texto da OS e preencher automaticamente"><i class="ph ph-clipboard-text"></i> Colar OS</button>
                <button id="btn-limpar-os" style="background:#ef4444; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-x"></i> Limpar</button>
                <button id="btn-gerar-os-final" style="background:#14b8a6; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-check-circle"></i> Salvar</button>
            </div>
        </div>

        <!-- ÁREA SCROLLÁVEL -->
        <div style="flex: 1; overflow-y: auto; padding: 0.75rem; box-sizing: border-box;">
        <!-- MAIN SPLIT -->
        <div style="display: flex; gap: 0.75rem; height: calc(100% - 0px); min-height: 500px;">
            
            <!-- FORM LEFT COL -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 2; min-width: 0; overflow-y: auto; padding-right: 4px; position: relative;">
                <!-- OVERLAY DE BLOQUEIO OS -->
                <div id="rr-overlay-bloqueio" style="position:absolute; inset:0; z-index:20; background:rgba(248,250,252,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:6px; backdrop-filter:blur(2px); cursor:pointer;" onclick="const btn = document.getElementById('btn-add-os-tipo'); btn.style.transition='transform 0.1s, box-shadow 0.1s'; btn.style.transform='scale(1.2)'; btn.style.boxShadow='0 0 10px 4px #1a7a40'; setTimeout(() => { btn.style.transform='scale(1)'; btn.style.boxShadow='none'; }, 600);">
                    <i class="ph ph-lock" style="font-size:2rem; color:#94a3b8; margin-bottom:0.5rem;"></i>
                    <p style="font-size:0.82rem; font-weight:600; color:#64748b; margin:0;">Defina a OS primeiro</p>
                    <p style="font-size:0.72rem; color:#94a3b8; margin:4px 0 0; text-align:center;">Digite o número da OS no topo e clique no botão <b style="color:#1a7a40">+</b><br>para criar ou carregar um serviço.</p>
                </div>
                
                <div style="display: flex; gap: 0.5rem; position: relative; z-index: 15;">
                    <div style="flex: 3;">
                        <label style="${labelStyle}">Endereço</label>
                        <div style="display:flex; gap:2px;">
                            <input type="text" id="rr-input-endereco" style="${inputStyle}" placeholder="Ex: Rua das Flores, 123 - Bairro, Cidade/SP">
                            <button id="btn-geocode-endereco" style="background:#0369a1; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0;" title="Buscar endereço no mapa e preencher latitude/longitude"><i class="ph ph-magnifying-glass"></i></button>
                            <button id="btn-agenda-endereco" style="background:#f59e0b; border:none; color:white; width:26px; height:26px; border-radius:4px; cursor:pointer; flex-shrink:0;" title="Verificar manutenções programadas para este endereço e arredores (5km)"><i class="ph ph-calendar-check"></i></button>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Complemento</label>
                        <input type="text" id="rr-input-complemento" style="${inputStyle}" placeholder="Apto, Sala, Bloco...">
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
                <div style="position: relative; display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
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
                    ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => `<label style="display:flex; align-items:center; gap:2px; font-size:0.7rem; color:#475569; cursor:pointer;"><input type="checkbox"> ${d}</label>`).join('')}
                </div>

                <!-- TIPO SERVIÇO (dropdown — igual ao Flutter: tipoServicoController) -->
                <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                    <div style="flex: 2;">
                        <label style="${labelStyle}">Tipo de Serviço</label>
                        <select id="rr-tipo-servico"
                            onchange="calcularTempo()"
                            style="${inputStyle} cursor:pointer;">
                            <option value="">Selecione o tipo de serviço...</option>
                            ${TIPOS_SERVICO_OS.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- HABILIDADES (pills: TANQUE, CARGA, VAC...) -->
                <div>
                    <label style="${labelStyle}">Habilidades</label>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${HABILIDADES.map(s =>
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
                    ${ACOES.map(s => 
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
