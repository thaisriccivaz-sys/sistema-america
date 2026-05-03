// ============================================================
// CLIENTES ITINERANTES — Frontend Module
// Exibe localização em tempo real de tags Google Maps
// via reverse-engineering do endpoint não-oficial do Google.
// ============================================================

window.renderItinerantesPage = function() {
    const container = document.getElementById('itinerantes-container');
    if (!container) return;

    container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:calc(100vh - 90px); background:#0f172a; overflow:hidden;">

        <!-- HEADER -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 20px;
                    background:linear-gradient(135deg, #1e3a2f 0%, #14532d 100%);
                    border-bottom:2px solid #22c55e33; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:38px;height:38px;border-radius:50%;background:#22c55e22;border:2px solid #22c55e;
                            display:flex;align-items:center;justify-content:center;">
                    <i class="ph ph-map-pin-line" style="color:#22c55e;font-size:1.3rem;"></i>
                </div>
                <div>
                    <h2 style="margin:0;color:#f0fdf4;font-size:1.1rem;font-weight:800;">📍 Clientes Itinerantes</h2>
                    <p style="margin:0;color:#86efac;font-size:0.75rem;">Rastreamento em tempo real via Google Location Sharing</p>
                </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
                <span id="itin-status-badge" style="font-size:0.72rem;padding:4px 12px;border-radius:20px;
                    background:#334155;color:#94a3b8;font-weight:600;">
                    ⚪ Desconectado
                </span>
                <button onclick="itinerantesAtualizarLocalizacoes()"
                    style="background:#22c55e;border:none;border-radius:8px;padding:7px 16px;
                           color:white;font-weight:700;cursor:pointer;font-size:0.82rem;
                           display:flex;align-items:center;gap:6px;transition:all 0.2s;"
                    onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">
                    <i class="ph ph-arrows-clockwise"></i> Atualizar
                </button>
                <button onclick="itinerantesAbrirConfiguracoes()"
                    style="background:#334155;border:none;border-radius:8px;padding:7px 14px;
                           color:#e2e8f0;font-weight:600;cursor:pointer;font-size:0.82rem;
                           display:flex;align-items:center;gap:6px;"
                    onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">
                    <i class="ph ph-gear"></i> Configurar Cookies
                </button>
            </div>
        </div>

        <!-- LAYOUT: sidebar de tags + mapa -->
        <div style="display:flex; flex:1; overflow:hidden;">

            <!-- SIDEBAR: lista de tags -->
            <div style="width:300px; flex-shrink:0; background:#1e293b; border-right:1px solid #334155;
                        display:flex; flex-direction:column; overflow:hidden;">
                <div style="padding:12px 16px; border-bottom:1px solid #334155;">
                    <input id="itin-search" type="text" placeholder="🔍 Buscar tag..."
                        oninput="itinerantesFiltrarLista(this.value)"
                        style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;
                               padding:7px 12px;color:#e2e8f0;font-size:0.82rem;outline:none;box-sizing:border-box;">
                </div>
                <div id="itin-lista" style="flex:1;overflow-y:auto;padding:8px;">
                    <div id="itin-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                             height:200px;color:#64748b;text-align:center;padding:20px;">
                        <i class="ph ph-map-pin" style="font-size:2.5rem;margin-bottom:10px;opacity:0.4;"></i>
                        <p style="margin:0;font-size:0.82rem;">Nenhuma tag encontrada.<br>Configure seus cookies e clique em <strong>Atualizar</strong>.</p>
                    </div>
                </div>
                <div style="padding:10px 16px;border-top:1px solid #334155;background:#0f172a;">
                    <p id="itin-info" style="margin:0;color:#64748b;font-size:0.72rem;text-align:center;">
                        Atualização automática a cada 5 min
                    </p>
                </div>
            </div>

            <!-- MAPA -->
            <div style="flex:1;position:relative;">
                <div id="itin-mapa" style="width:100%;height:100%;"></div>
                <!-- Overlay de instrução inicial -->
                <div id="itin-overlay" style="position:absolute;inset:0;background:#0f172a;
                     display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;">
                    <div style="text-align:center;max-width:420px;padding:30px;">
                        <div style="font-size:3.5rem;margin-bottom:16px;">🗺️</div>
                        <h3 style="color:#f0fdf4;margin-bottom:12px;font-size:1.3rem;">Bem-vindo ao Rastreamento</h3>
                        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin-bottom:24px;">
                            Para ver a localização dos seus clientes itinerantes, você precisa fornecer
                            os <strong style="color:#22c55e;">cookies da sua conta Google</strong>
                            que tem acesso ao compartilhamento de localização.
                        </p>
                        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;
                                    padding:16px;text-align:left;margin-bottom:20px;">
                            <p style="color:#f59e0b;font-size:0.8rem;font-weight:700;margin:0 0 8px;">
                                📋 Como obter seus Cookies:
                            </p>
                            <ol style="color:#94a3b8;font-size:0.78rem;margin:0;padding-left:18px;line-height:1.8;">
                                <li>Abra <strong style="color:#60a5fa;">maps.google.com</strong> no Chrome</li>
                                <li>Faça login na conta com as tags</li>
                                <li>Instale a extensão <strong style="color:#60a5fa;">EditThisCookie</strong></li>
                                <li>Exporte os cookies e cole abaixo</li>
                            </ol>
                        </div>
                        <button onclick="itinerantesAbrirConfiguracoes()"
                            style="background:#22c55e;border:none;border-radius:10px;padding:12px 28px;
                                   color:white;font-weight:800;cursor:pointer;font-size:0.95rem;
                                   display:inline-flex;align-items:center;gap:8px;">
                            <i class="ph ph-gear-six"></i> Configurar Cookies Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Carrega o Leaflet se ainda não estiver
    if (typeof L === 'undefined') {
        _itinerantesCarregarLeaflet(() => {
            _itinerantesIniciarMapa();
            _itinerantesVerificarConfigurado();
        });
    } else {
        _itinerantesIniciarMapa();
        _itinerantesVerificarConfigurado();
    }
};

// ── Leaflet lazy loader ──────────────────────────────────────────────
function _itinerantesCarregarLeaflet(callback) {
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = callback;
        document.head.appendChild(script);
    } else {
        callback();
    }
}

// ── Mapa Leaflet ─────────────────────────────────────────────────────
let _itinerantesMapObj = null;
let _itinerantesMarkers = {};
let _itinerantesTags = [];
let _itinerantesAutoRefreshInterval = null;

function _itinerantesIniciarMapa() {
    const el = document.getElementById('itin-mapa');
    if (!el || _itinerantesMapObj) {
        if (_itinerantesMapObj) _itinerantesMapObj.invalidateSize();
        return;
    }
    _itinerantesMapObj = L.map('itin-mapa', { zoomControl: true }).setView([-23.5505, -46.6333], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd', maxZoom: 19
    }).addTo(_itinerantesMapObj);
}

// ── Verificar se já configurado ─────────────────────────────────────
function _itinerantesVerificarConfigurado() {
    const cookies = localStorage.getItem('itin_google_cookies');
    if (cookies) {
        document.getElementById('itin-overlay').style.display = 'none';
        document.getElementById('itin-status-badge').innerHTML = '🟡 Configurado';
        document.getElementById('itin-status-badge').style.background = '#78350f';
        document.getElementById('itin-status-badge').style.color = '#fbbf24';
        itinerantesAtualizarLocalizacoes();
        // Auto-refresh a cada 5 minutos
        if (_itinerantesAutoRefreshInterval) clearInterval(_itinerantesAutoRefreshInterval);
        _itinerantesAutoRefreshInterval = setInterval(itinerantesAtualizarLocalizacoes, 5 * 60 * 1000);
    }
}

// ── Abrir modal de configuração de cookies ───────────────────────────
window.itinerantesAbrirConfiguracoes = function() {
    const saved = localStorage.getItem('itin_google_cookies') || '';
    const modal = document.createElement('div');
    modal.id = 'modal-itin-config';
    modal.style.cssText = `position:fixed;inset:0;background:#000a;z-index:9999;
        display:flex;align-items:center;justify-content:center;padding:20px;`;
    modal.innerHTML = `
    <div style="background:#1e293b;border-radius:16px;border:1px solid #334155;
                width:100%;max-width:620px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px #000a;">
        <div style="padding:20px 24px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;color:#f0fdf4;font-size:1.1rem;">⚙️ Configurar Cookies Google</h3>
                <p style="margin:4px 0 0;color:#64748b;font-size:0.75rem;">
                    Necessário para acessar o compartilhamento de localização da sua conta
                </p>
            </div>
            <button onclick="document.getElementById('modal-itin-config').remove()"
                style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.5rem;">✕</button>
        </div>
        <div style="padding:20px 24px;">
            <!-- Instruções -->
            <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #1e3a5f;">
                <p style="color:#60a5fa;font-size:0.82rem;font-weight:700;margin:0 0 10px;">
                    📥 Como exportar os cookies (método fácil):
                </p>
                <ol style="color:#94a3b8;font-size:0.78rem;margin:0;padding-left:18px;line-height:2;">
                    <li>No Chrome, abra <strong style="color:#60a5fa;">chrome://extensions</strong></li>
                    <li>Instale a extensão <strong style="color:#60a5fa;">"Export Cookie JSON File for Puppeteer"</strong></li>
                    <li>Vá para <strong style="color:#60a5fa;">maps.google.com</strong> logado na conta com as tags</li>
                    <li>Clique no ícone da extensão → <strong style="color:#60a5fa;">Export Cookies</strong></li>
                    <li>Abra o arquivo .json gerado, copie todo o conteúdo e cole abaixo</li>
                </ol>
            </div>
            <label style="color:#e2e8f0;font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">
                Cole o JSON de cookies aqui:
            </label>
            <textarea id="itin-cookies-input" rows="10"
                style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;
                       padding:12px;color:#e2e8f0;font-size:0.75rem;font-family:monospace;
                       resize:vertical;outline:none;box-sizing:border-box;"
                placeholder='[{"name":"SID","value":"...","domain":".google.com",...}, ...]'>${saved}</textarea>
            <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;">
                <button onclick="document.getElementById('modal-itin-config').remove()"
                    style="background:#334155;border:none;border-radius:8px;padding:9px 18px;
                           color:#e2e8f0;font-weight:600;cursor:pointer;font-size:0.82rem;">
                    Cancelar
                </button>
                <button onclick="itinerantesSalvarCookies()"
                    style="background:#22c55e;border:none;border-radius:8px;padding:9px 20px;
                           color:white;font-weight:700;cursor:pointer;font-size:0.82rem;">
                    💾 Salvar e Conectar
                </button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window.itinerantesSalvarCookies = function() {
    const raw = document.getElementById('itin-cookies-input').value.trim();
    if (!raw) { alert('Cole os cookies antes de salvar.'); return; }
    try {
        JSON.parse(raw); // valida JSON
        localStorage.setItem('itin_google_cookies', raw);
        document.getElementById('modal-itin-config').remove();
        document.getElementById('itin-overlay').style.display = 'none';
        if (typeof showToast === 'function') showToast('Cookies salvos! Buscando localizações...', 'success');
        _itinerantesVerificarConfigurado();
    } catch(e) {
        alert('JSON inválido. Verifique o conteúdo e tente novamente.\n\n' + e.message);
    }
};

// ── Atualizar localizações via API backend ───────────────────────────
window.itinerantesAtualizarLocalizacoes = async function() {
    const badge = document.getElementById('itin-status-badge');
    if (badge) { badge.innerHTML = '🔄 Buscando...'; badge.style.background = '#1e3a5f'; badge.style.color = '#60a5fa'; }

    const cookies = localStorage.getItem('itin_google_cookies');
    if (!cookies) {
        if (badge) { badge.innerHTML = '⚪ Desconectado'; badge.style.background = '#334155'; badge.style.color = '#94a3b8'; }
        return;
    }

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        const resp = await fetch('/api/itinerantes/localizacoes', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookies: JSON.parse(cookies) })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Erro ao buscar localizações');
        }

        const data = await resp.json();
        _itinerantesTags = data.tags || [];

        if (badge) {
            badge.innerHTML = '🟢 Conectado — ' + _itinerantesTags.length + ' tag(s)';
            badge.style.background = '#14532d'; badge.style.color = '#86efac';
        }

        const info = document.getElementById('itin-info');
        if (info) info.textContent = 'Última atualização: ' + new Date().toLocaleTimeString('pt-BR');

        _itinerantesRenderizarLista(_itinerantesTags);
        _itinerantesRenderizarMapa(_itinerantesTags);
        document.getElementById('itin-overlay').style.display = 'none';

    } catch(err) {
        console.error('[Itinerantes]', err);
        if (badge) { badge.innerHTML = '🔴 Erro: ' + err.message.substring(0, 40); badge.style.background = '#450a0a'; badge.style.color = '#fca5a5'; }
        if (typeof showToast === 'function') showToast('Erro ao buscar localizações: ' + err.message, 'error');
    }
};

// ── Renderizar lista de tags no sidebar ─────────────────────────────
function _itinerantesRenderizarLista(tags) {
    const lista = document.getElementById('itin-lista');
    const empty = document.getElementById('itin-empty');
    if (!lista) return;

    if (!tags || tags.length === 0) {
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    lista.innerHTML = tags.map((tag, i) => {
        const deltaMin = tag.timestamp ? Math.round((Date.now() - tag.timestamp) / 60000) : null;
        const tempoStr = deltaMin === null ? 'Desconhecido' : deltaMin < 1 ? 'Agora' : deltaMin + ' min atrás';
        const corStatus = deltaMin === null ? '#64748b' : deltaMin < 5 ? '#22c55e' : deltaMin < 30 ? '#f59e0b' : '#ef4444';

        return `
        <div class="itin-card" data-idx="${i}"
            onclick="itinerantesIrParaTag(${i})"
            style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;
                   padding:10px 12px;margin-bottom:8px;cursor:pointer;transition:all 0.18s;"
            onmouseover="this.style.borderColor='#22c55e44';this.style.background='#1e293b'"
            onmouseout="this.style.borderColor='#1e293b';this.style.background='#0f172a'">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:50%;background:${tag.photoUrl ? 'transparent' : '#1e3a5f'};
                            display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:2px solid ${corStatus};">
                    ${tag.photoUrl 
                        ? `<img src="${tag.photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'ph ph-user\\' style=\\'color:#60a5fa;font-size:1.1rem;\\'></i>'">`
                        : `<i class="ph ph-device-mobile" style="color:#60a5fa;font-size:1.1rem;"></i>`}
                </div>
                <div style="flex:1;min-width:0;">
                    <p style="margin:0;color:#f0fdf4;font-size:0.85rem;font-weight:700;
                               white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${tag.nome || 'Tag ' + (i+1)}
                    </p>
                    <p style="margin:2px 0 0;color:#64748b;font-size:0.72rem;
                               white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        📍 ${tag.endereco || (tag.lat ? tag.lat.toFixed(4) + ', ' + tag.lng.toFixed(4) : 'Sem localização')}
                    </p>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${corStatus};margin:0 auto 4px;"></div>
                    <span style="color:${corStatus};font-size:0.68rem;font-weight:600;">${tempoStr}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Filtrar lista ─────────────────────────────────────────────────────
window.itinerantesFiltrarLista = function(query) {
    const q = (query || '').toLowerCase();
    const filtered = _itinerantesTags.filter(t =>
        (t.nome || '').toLowerCase().includes(q) ||
        (t.endereco || '').toLowerCase().includes(q)
    );
    _itinerantesRenderizarLista(filtered);
};

// ── Renderizar marcadores no mapa ────────────────────────────────────
function _itinerantesRenderizarMapa(tags) {
    if (!_itinerantesMapObj) return;

    // Remove marcadores antigos
    Object.values(_itinerantesMarkers).forEach(m => m.remove());
    _itinerantesMarkers = {};

    const bounds = [];

    tags.forEach((tag, i) => {
        if (!tag.lat || !tag.lng) return;

        const markerHtml = `
            <div style="background:#1e293b;border:2.5px solid #22c55e;border-radius:50%;
                        width:36px;height:36px;display:flex;align-items:center;justify-content:center;
                        box-shadow:0 0 12px #22c55e88;overflow:hidden;">
                ${tag.photoUrl 
                    ? `<img src="${tag.photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
                    : `<span style="color:#22c55e;font-size:1rem;">📍</span>`}
            </div>`;

        const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });

        const deltaMin = tag.timestamp ? Math.round((Date.now() - tag.timestamp) / 60000) : null;
        const tempoStr = deltaMin === null ? 'Desconhecido' : deltaMin < 1 ? 'Agora mesmo' : `${deltaMin} min atrás`;

        const popup = `
            <div style="font-family:Inter,sans-serif;min-width:180px;">
                <p style="margin:0 0 4px;font-weight:800;font-size:0.92rem;">${tag.nome || 'Tag ' + (i+1)}</p>
                <p style="margin:0 0 4px;font-size:0.78rem;color:#64748b;">🕐 ${tempoStr}</p>
                ${tag.endereco ? `<p style="margin:0;font-size:0.78rem;color:#334155;">📍 ${tag.endereco}</p>` : ''}
                ${tag.bateria !== null && tag.bateria !== undefined ? `<p style="margin:4px 0 0;font-size:0.78rem;">🔋 ${tag.bateria}%</p>` : ''}
            </div>`;

        const marker = L.marker([tag.lat, tag.lng], { icon }).addTo(_itinerantesMapObj);
        marker.bindPopup(popup);
        _itinerantesMarkers[i] = marker;
        bounds.push([tag.lat, tag.lng]);
    });

    if (bounds.length > 0) {
        _itinerantesMapObj.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
}

// ── Ir para tag específica no mapa ───────────────────────────────────
window.itinerantesIrParaTag = function(idx) {
    const tag = _itinerantesTags[idx];
    if (!tag || !tag.lat || !_itinerantesMapObj) return;
    _itinerantesMapObj.setView([tag.lat, tag.lng], 16, { animate: true });
    if (_itinerantesMarkers[idx]) _itinerantesMarkers[idx].openPopup();
};
