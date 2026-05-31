// ─────────────────────────────────────────────────────────────────────────────
// recibos.js — Tela de Recibos de Benefícios (VT, VC, VR)
// ─────────────────────────────────────────────────────────────────────────────

const VR_VALOR_DIA = 35.00; // Vale Refeição por dia trabalhado
const VR_VALOR_JANTAR = 35.00; // Jantar para dia com ≥ 3h extra

// ─── Init da tela (exposta globalmente para ser chamada pelo navigateTo) ──────
window.initRecibosView = async function () {
    const container = document.getElementById('recibos-container');
    if (!container) return;

    // Calcular mês/ano atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    container.innerHTML = `
        <div style="max-width:900px; margin:0 auto; padding:2rem;">

            <!-- CABEÇALHO -->
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:2rem;">
                <div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#1e3a5f,#2563eb);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="ph ph-receipt" style="font-size:1.8rem;color:#fff;"></i>
                </div>
                <div>
                    <h2 style="margin:0;font-size:1.5rem;color:#1e293b;font-weight:700;">Recibos de Benefícios</h2>
                    <p style="margin:4px 0 0;color:#64748b;font-size:0.92rem;">Gere recibos de Vale Transporte, Vale Combustível e Vale Refeição.</p>
                </div>
            </div>

            <!-- SELEÇÃO DE COLABORADOR E PERÍODO -->
            <div class="card" style="padding:1.5rem;margin-bottom:1.25rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
                <h3 style="margin:0 0 1.2rem;font-size:1rem;color:#374151;display:flex;align-items:center;gap:8px;">
                    <i class="ph ph-user-circle" style="color:#2563eb;font-size:1.2rem;"></i> Colaborador e Período
                </h3>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                    <div style="grid-column:1/-1;">
                        <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Colaborador</label>
                        <div style="position:relative;">
                            <input type="text" id="recibo-colab-busca" placeholder="Digite o nome do colaborador..."
                                style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.93rem;box-sizing:border-box;color:#1e293b;"
                                oninput="filtrarColaboradoresRecibo(this.value)" autocomplete="off">
                            <div id="recibo-colab-lista" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:999;max-height:220px;overflow-y:auto;"></div>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Mês</label>
                        <select id="recibo-mes" style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.93rem;color:#1e293b;">
                            ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                                .map((m, i) => `<option value="${i+1}" ${i+1===mesAtual?'selected':''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Ano</label>
                        <select id="recibo-ano" style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.93rem;color:#1e293b;">
                            ${[anoAtual-1, anoAtual, anoAtual+1].map(a => `<option value="${a}" ${a===anoAtual?'selected':''}>${a}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- DADOS DO COLABORADOR (card apareçe após seleção) -->
            <div id="recibo-colab-info" style="display:none;margin-bottom:1.25rem;">
                <div class="card" style="padding:1.25rem;border-radius:12px;border-left:4px solid #2563eb;box-shadow:0 1px 4px rgba(0,0,0,.06);">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;">
                        <div>
                            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Nome</div>
                            <div id="ri-nome" style="font-weight:600;color:#1e293b;margin-top:2px;"></div>
                        </div>
                        <div>
                            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Cargo</div>
                            <div id="ri-cargo" style="color:#374151;margin-top:2px;"></div>
                        </div>
                        <div>
                            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Departamento</div>
                            <div id="ri-depto" style="color:#374151;margin-top:2px;"></div>
                        </div>
                        <div>
                            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Meio de Transporte</div>
                            <div id="ri-transporte" style="margin-top:2px;"></div>
                        </div>
                        <div>
                            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Valor Cadastrado</div>
                            <div id="ri-valor-transporte" style="font-weight:600;color:#1e293b;margin-top:2px;"></div>
                        </div>
                        <div>
                            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Carga Horária / dia</div>
                            <div id="ri-carga" style="color:#374151;margin-top:2px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONFIGURAÇÃO DO PERÍODO -->
            <div id="recibo-periodo-card" style="display:none;margin-bottom:1.25rem;">
                <div class="card" style="padding:1.5rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
                    <h3 style="margin:0 0 1.2rem;font-size:1rem;color:#374151;display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-calendar-blank" style="color:#2563eb;font-size:1.2rem;"></i> Dados do Período
                    </h3>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
                        <div>
                            <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Dias úteis no mês <span style="color:#94a3b8;font-weight:400;">(seg-sáb)</span></label>
                            <input type="number" id="recibo-dias-uteis" min="1" max="27" value="26"
                                style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;font-weight:700;color:#1e293b;box-sizing:border-box;"
                                oninput="calcularRecibo()">
                        </div>
                        <div>
                            <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Dias trabalhados</label>
                            <input type="number" id="recibo-dias-trabalhados" min="0" max="27" value=""
                                placeholder="0"
                                style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;font-weight:700;color:#1e293b;box-sizing:border-box;"
                                oninput="calcularRecibo()">
                        </div>
                        <div>
                            <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Faltas <span style="color:#ef4444;font-size:.78rem;">(apenas faltas)</span></label>
                            <input type="number" id="recibo-faltas" min="0" max="27" value="0"
                                style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;font-weight:700;color:#1e293b;box-sizing:border-box;"
                                oninput="calcularRecibo()">
                        </div>
                        <div id="recibo-campo-jantar" style="display:none;">
                            <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Dias c/ hora extra <span style="color:#64748b;font-weight:400;">(≥ 3h)</span></label>
                            <input type="number" id="recibo-dias-extra" min="0" max="27" value="0"
                                style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;font-weight:700;color:#1e293b;box-sizing:border-box;"
                                oninput="calcularRecibo()">
                        </div>
                        <div id="recibo-campo-vc-valor" style="display:none;">
                            <label style="font-size:.82rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem;">Valor integral do benefício (VC) <span style="color:#64748b;font-size:.78rem;">R$</span></label>
                            <input type="number" id="recibo-vc-valor" min="0" step="0.01" value=""
                                placeholder="0,00"
                                style="width:100%;padding:.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;font-weight:700;color:#1e293b;box-sizing:border-box;"
                                oninput="calcularRecibo()">
                        </div>
                    </div>
                </div>
            </div>

            <!-- RESULTADO DO CÁLCULO -->
            <div id="recibo-resultado" style="display:none;margin-bottom:1.25rem;">
                <div class="card" style="padding:1.5rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
                    <h3 style="margin:0 0 1.2rem;font-size:1rem;color:#374151;display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-calculator" style="color:#059669;font-size:1.2rem;"></i> Resultado do Cálculo
                    </h3>
                    <div id="recibo-cards-calculo" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;"></div>
                </div>
            </div>

            <!-- BOTÕES DE GERAÇÃO -->
            <div id="recibo-botoes" style="display:none;display:flex;flex-wrap:wrap;gap:1rem;">
            </div>

        </div>
    `;

    // Carrega colaboradores para autocomplete
    await carregarColaboradoresRecibo();
}

// ─── Variável global do colaborador selecionado ───────────────────────────────
window._reciboColabSelecionado = null;
window._reciboColabLista = [];

// ─── Carrega lista de colaboradores ──────────────────────────────────────────
async function carregarColaboradoresRecibo() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/colaboradores?status=Ativo&limit=2000`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        window._reciboColabLista = Array.isArray(data) ? data : (data.colaboradores || []);
    } catch (e) {
        console.warn('[Recibos] Erro ao carregar colaboradores:', e.message);
    }
}

// ─── Filtro do autocomplete ───────────────────────────────────────────────────
window.filtrarColaboradoresRecibo = function (busca) {
    const lista = document.getElementById('recibo-colab-lista');
    if (!lista) return;
    if (!busca || busca.length < 2) { lista.style.display = 'none'; return; }

    const lower = busca.toLowerCase();
    const filtrados = (window._reciboColabLista || [])
        .filter(c => (c.nome || '').toLowerCase().includes(lower))
        .slice(0, 10);

    if (!filtrados.length) { lista.style.display = 'none'; return; }

    lista.innerHTML = filtrados.map(c => `
        <div onclick="selecionarColaboradorRecibo(${c.id})"
            style="padding:.7rem 1rem;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.93rem;color:#1e293b;"
            onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='#fff'">
            <strong>${c.nome}</strong>
            <span style="color:#64748b;font-size:.82rem;margin-left:.5rem;">${c.cargo || ''} · ${c.departamento || ''}</span>
        </div>
    `).join('');
    lista.style.display = 'block';
};

// ─── Seleciona colaborador ────────────────────────────────────────────────────
window.selecionarColaboradorRecibo = async function (id) {
    const lista = document.getElementById('recibo-colab-lista');
    if (lista) lista.style.display = 'none';

    const colab = (window._reciboColabLista || []).find(c => c.id == id);
    if (!colab) return;

    window._reciboColabSelecionado = colab;

    const input = document.getElementById('recibo-colab-busca');
    if (input) input.value = colab.nome;

    // Calcula carga horária diária em horas
    const entradaStr = colab.horario_entrada || '08:00';
    const saidaStr = colab.horario_saida || '17:00';
    const intradaStr = colab.intervalo_entrada || '12:00';
    const intsaidaStr = colab.intervalo_saida || '13:00';
    const cargaDiaria = calcularCargaDiaria(entradaStr, saidaStr, intradaStr, intsaidaStr);

    // Meio de transporte
    const meio = colab.meio_transporte || '';
    const badgeCor = meio.toLowerCase().includes('vt') ? '#2563eb' :
        meio.toLowerCase().includes('combustivel') || meio.toLowerCase().includes('combustível') ? '#f59e0b' : '#64748b';
    const badgeBg = meio.toLowerCase().includes('vt') ? '#eff6ff' :
        meio.toLowerCase().includes('combustivel') || meio.toLowerCase().includes('combustível') ? '#fffbeb' : '#f1f5f9';

    // Preenche o card de info
    document.getElementById('ri-nome').textContent = colab.nome;
    document.getElementById('ri-cargo').textContent = colab.cargo || '—';
    document.getElementById('ri-depto').textContent = colab.departamento || '—';
    document.getElementById('ri-transporte').innerHTML = meio
        ? `<span style="background:${badgeBg};color:${badgeCor};padding:2px 10px;border-radius:20px;font-size:.82rem;font-weight:600;">${meio}</span>`
        : '<span style="color:#94a3b8;">Não informado</span>';
    document.getElementById('ri-valor-transporte').textContent =
        colab.valor_transporte ? `R$ ${parseFloat(colab.valor_transporte).toFixed(2).replace('.', ',')}` : '—';
    document.getElementById('ri-carga').textContent = `${cargaDiaria.toFixed(1)}h/dia`;

    document.getElementById('recibo-colab-info').style.display = 'block';
    document.getElementById('recibo-periodo-card').style.display = 'block';

    // Calcula dias úteis do mês automaticamente
    const mes = parseInt(document.getElementById('recibo-mes').value);
    const ano = parseInt(document.getElementById('recibo-ano').value);
    const diasUteis = calcularDiasUteisDoMes(mes, ano);
    document.getElementById('recibo-dias-uteis').value = diasUteis;
    document.getElementById('recibo-dias-trabalhados').value = diasUteis;

    // Mostra campo de jantar (VR — sempre visível)
    document.getElementById('recibo-campo-jantar').style.display = 'block';

    // Campo VC só aparece para Vale Combustível
    const isVC = meio.toLowerCase().includes('combustivel') || meio.toLowerCase().includes('combustível');
    document.getElementById('recibo-campo-vc-valor').style.display = isVC ? 'block' : 'none';
    if (isVC && colab.valor_transporte) {
        document.getElementById('recibo-vc-valor').value = parseFloat(colab.valor_transporte).toFixed(2);
    }

    calcularRecibo();

    // Renderiza o botão de busca do ponto
    renderizarBotaoPonto();
};

// ─── Renderiza botão "Buscar do Ponto" ────────────────────────────────────────
function renderizarBotaoPonto() {
    const periodoCard = document.getElementById('recibo-periodo-card');
    if (!periodoCard) return;

    // Remove botão anterior se existir
    const btnAnterior = document.getElementById('btn-buscar-ponto');
    if (btnAnterior) btnAnterior.closest('.rhid-btn-wrapper')?.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'rhid-btn-wrapper';
    wrapper.style.cssText = 'margin-top:1rem;';
    wrapper.innerHTML = `
        <button id="btn-buscar-ponto" onclick="buscarPontoRHID()"
            style="display:inline-flex;align-items:center;gap:8px;padding:.6rem 1.2rem;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border:none;border-radius:8px;font-size:.88rem;font-weight:600;cursor:pointer;transition:opacity .2s;">
            <i class="ph ph-fingerprint" style="font-size:1.1rem;"></i>
            Buscar do Ponto (RHID)
        </button>
        <span id="rhid-ponto-badge" style="display:none;margin-left:10px;font-size:.8rem;font-weight:600;"></span>
    `;
    periodoCard.querySelector('.card')?.appendChild(wrapper);
}


// ─── Chama backend e preenche campos com dados do ponto ──────────────────────
window.buscarPontoRHID = async function () {
    const colab = window._reciboColabSelecionado;
    if (!colab) return;

    const cpf = (colab.cpf || '').replace(/\D/g, '');
    if (!cpf || cpf.length < 8) {
        Swal.fire('CPF não encontrado', 'Este colaborador não tem CPF cadastrado no sistema. Por favor, cadastre o CPF e tente novamente.', 'warning');
        return;
    }

    const mes = document.getElementById('recibo-mes')?.value;
    const ano = document.getElementById('recibo-ano')?.value;
    const btn = document.getElementById('btn-buscar-ponto');
    const badge = document.getElementById('rhid-ponto-badge');

    // Loading state
    if (btn) {
        btn.innerHTML = '<i class="ph ph-spinner" style="animation:spin 1s linear infinite;font-size:1.1rem;"></i> Consultando RHID...';
        btn.disabled = true;
    }
    if (badge) badge.style.display = 'none';

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/diretoria/controlid/ponto-colaborador?cpf=${encodeURIComponent(cpf)}&mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            // Não encontrado no RHID
            if (badge) {
                badge.style.display = 'inline-flex';
                badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-left:10px;font-size:.8rem;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;padding:3px 10px;border-radius:20px;';
                badge.innerHTML = `<i class="ph ph-warning"></i> ${data.message || 'Não encontrado no RHID'}`;
            }
            return;
        }

        // ── Preenche os campos ──────────────────────────────────────────────
        const campos = {
            'recibo-dias-uteis': data.diasUteis,
            'recibo-dias-trabalhados': data.diasTrabalhados,
            'recibo-faltas': data.faltas,
            'recibo-dias-extra': data.diasComHoraExtra,
        };

        let algumPreenchido = false;
        for (const [id, val] of Object.entries(campos)) {
            const el = document.getElementById(id);
            if (el && val !== null && val !== undefined) {
                el.value = val;
                el.style.borderColor = '#10b981';
                el.style.background = '#f0fdf4';
                setTimeout(() => { el.style.borderColor = ''; el.style.background = ''; }, 3000);
                algumPreenchido = true;
            }
        }

        // ── Badge de resultado ──────────────────────────────────────────────
        if (badge) {
            badge.style.display = 'inline-flex';
            if (data.aviso) {
                // Dados parciais ou não interpretáveis
                badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-left:10px;font-size:.8rem;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;padding:3px 10px;border-radius:20px;';
                badge.innerHTML = `<i class="ph ph-warning"></i> ${data.aviso}`;
                // Loga o raw para debug no console
                console.log('[RHID] apuracaoRaw:', data.apuracaoRaw);
            } else {
                badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-left:10px;font-size:.8rem;font-weight:600;color:#065f46;background:#d1fae5;border:1px solid #6ee7b7;padding:3px 10px;border-radius:20px;';
                badge.innerHTML = `<i class="ph ph-check-circle"></i> Dados importados do ponto (${data.nomeRHID || 'RHID'})`;
            }
        }

        // Recalcula com os novos dados
        calcularRecibo();

        // Se a resposta tem aviso (schema desconhecido), mostra o raw para ajuste
        if (data.aviso) {
            console.warn('[RHID] Resposta bruta da apuração:', JSON.stringify(data.apuracaoRaw, null, 2));
            Swal.fire({
                icon: 'info',
                title: 'Dados do RHID recebidos',
                html: `<p>Encontramos o colaborador no RHID (ID: <b>${data.idRHID}</b>), mas o formato da resposta da apuração de ponto ainda precisa de ajuste fino.</p>
                       <p style="font-size:.85rem;color:#64748b;margin-top:.5rem;">Verifique o console do navegador (F12) para ver os dados brutos recebidos e nos informe o formato para ajustarmos o sistema.</p>`,
                confirmButtonText: 'Entendi'
            });
        }

    } catch (e) {
        if (badge) {
            badge.style.display = 'inline-flex';
            badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;margin-left:10px;font-size:.8rem;font-weight:600;color:#991b1b;background:#fee2e2;border:1px solid #fca5a5;padding:3px 10px;border-radius:20px;';
            badge.innerHTML = `<i class="ph ph-x-circle"></i> Erro de conexão com RHID`;
        }
        console.error('[RHID] Erro:', e.message);
    } finally {
        if (btn) {
            btn.innerHTML = '<i class="ph ph-fingerprint" style="font-size:1.1rem;"></i> Buscar do Ponto (RHID)';
            btn.disabled = false;
        }
    }
};

// Adiciona animação de spin para o ícone de loading
if (!document.getElementById('rhid-spin-style')) {
    const style = document.createElement('style');
    style.id = 'rhid-spin-style';
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
}

// ─── Cálculo principal ────────────────────────────────────────────────────────
window.calcularRecibo = function () {
    const colab = window._reciboColabSelecionado;
    if (!colab) return;

    const diasUteis = parseInt(document.getElementById('recibo-dias-uteis')?.value) || 0;
    const diasTrabalhados = parseInt(document.getElementById('recibo-dias-trabalhados')?.value) || 0;
    const faltas = parseInt(document.getElementById('recibo-faltas')?.value) || 0;
    const diasExtra = parseInt(document.getElementById('recibo-dias-extra')?.value) || 0;
    const vcValorInput = parseFloat(document.getElementById('recibo-vc-valor')?.value) || 0;

    const meio = (colab.meio_transporte || '').toLowerCase();
    const isVT = meio.includes('vt') || meio.includes('vale transporte');
    const isVC = meio.includes('combustivel') || meio.includes('combustível');
    const valorTransporte = parseFloat(colab.valor_transporte) || 0;

    let cards = '';
    let botoes = '';

    // ── VR (sempre calculado) ─────────────────────────────────────────────────
    const totalVR = diasTrabalhados * VR_VALOR_DIA;
    const totalJantar = diasExtra * VR_VALOR_JANTAR;
    const totalVRFinal = totalVR + totalJantar;

    cards += `
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:10px;padding:1.25rem;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;">
                <i class="ph ph-fork-knife" style="color:#059669;font-size:1.3rem;"></i>
                <strong style="color:#065f46;font-size:.95rem;">Vale Refeição (VR)</strong>
            </div>
            <div style="font-size:1.6rem;font-weight:800;color:#047857;margin-bottom:.5rem;">
                R$ ${fmt(totalVRFinal)}
            </div>
            <div style="font-size:.8rem;color:#065f46;line-height:1.6;">
                <div>${diasTrabalhados} dias × R$ ${fmt(VR_VALOR_DIA)} = R$ ${fmt(totalVR)}</div>
                ${diasExtra > 0 ? `<div>+ ${diasExtra} jantares × R$ ${fmt(VR_VALOR_JANTAR)} = R$ ${fmt(totalJantar)}</div>` : '<div style="color:#86efac;">Sem jantares registrados</div>'}
            </div>
        </div>
    `;
    botoes += `<button class="btn btn-primary" onclick="gerarReciboVR()"
        style="display:flex;align-items:center;gap:8px;background:#059669;border-color:#059669;">
        <i class="ph ph-printer"></i> Gerar Recibo VR
    </button>`;

    // ── VT ────────────────────────────────────────────────────────────────────
    if (isVT) {
        const totalVT = diasTrabalhados * valorTransporte;
        cards += `
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:10px;padding:1.25rem;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;">
                    <i class="ph ph-bus" style="color:#1d4ed8;font-size:1.3rem;"></i>
                    <strong style="color:#1e3a8a;font-size:.95rem;">Vale Transporte (VT)</strong>
                </div>
                <div style="font-size:1.6rem;font-weight:800;color:#1d4ed8;margin-bottom:.5rem;">
                    R$ ${fmt(totalVT)}
                </div>
                <div style="font-size:.8rem;color:#1e40af;line-height:1.6;">
                    <div>${diasTrabalhados} dias × R$ ${fmt(valorTransporte)}/dia</div>
                    <div style="color:#3b82f6;margin-top:3px;">Valor/dia do cadastro do colaborador</div>
                </div>
            </div>
        `;
        botoes += `<button class="btn btn-primary" onclick="gerarReciboVT()"
            style="display:flex;align-items:center;gap:8px;">
            <i class="ph ph-printer"></i> Gerar Recibo VT
        </button>`;
    }

    // ── VC ────────────────────────────────────────────────────────────────────
    if (isVC) {
        const valorIntegral = vcValorInput || valorTransporte;
        const descontoFaltas = diasUteis > 0 ? (valorIntegral / diasUteis * faltas) : 0;
        const totalVC = Math.max(0, valorIntegral - descontoFaltas);

        cards += `
            <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:10px;padding:1.25rem;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;">
                    <i class="ph ph-gas-pump" style="color:#d97706;font-size:1.3rem;"></i>
                    <strong style="color:#78350f;font-size:.95rem;">Vale Combustível (VC)</strong>
                </div>
                <div style="font-size:1.6rem;font-weight:800;color:#b45309;margin-bottom:.5rem;">
                    R$ ${fmt(totalVC)}
                </div>
                <div style="font-size:.8rem;color:#92400e;line-height:1.6;">
                    <div>Valor integral: R$ ${fmt(valorIntegral)}</div>
                    ${faltas > 0
                        ? `<div style="color:#ef4444;">- ${faltas} falta(s) × R$ ${fmt(valorIntegral / diasUteis)} = -R$ ${fmt(descontoFaltas)}</div>`
                        : '<div>Sem faltas no período</div>'
                    }
                </div>
            </div>
        `;
        botoes += `<button class="btn btn-primary" onclick="gerarReciboVC()"
            style="display:flex;align-items:center;gap:8px;background:#d97706;border-color:#d97706;">
            <i class="ph ph-printer"></i> Gerar Recibo VC
        </button>`;
    }

    const resultadoEl = document.getElementById('recibo-resultado');
    const botoesEl = document.getElementById('recibo-botoes');
    const calcEl = document.getElementById('recibo-cards-calculo');

    if (resultadoEl) resultadoEl.style.display = 'block';
    if (calcEl) calcEl.innerHTML = cards;
    if (botoesEl) { botoesEl.style.display = 'flex'; botoesEl.innerHTML = botoes; }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(val) {
    return (parseFloat(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcularCargaDiaria(entrada, saida, intEntrada, intSaida) {
    try {
        const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
        const trabalhado = toMin(saida) - toMin(entrada) - (toMin(intSaida) - toMin(intEntrada));
        return Math.max(0, trabalhado / 60);
    } catch { return 8; }
}

function calcularDiasUteisDoMes(mes, ano) {
    // Conta seg a sáb no mês
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let count = 0;
    for (let d = 1; d <= diasNoMes; d++) {
        const diaSemana = new Date(ano, mes - 1, d).getDay();
        if (diaSemana !== 0) count++; // Exclui apenas domingo
    }
    return count;
}

function getNomeMes(num) {
    return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][num - 1] || '';
}

function getDadosPeriodo() {
    return {
        mes: parseInt(document.getElementById('recibo-mes')?.value),
        ano: parseInt(document.getElementById('recibo-ano')?.value),
        diasUteis: parseInt(document.getElementById('recibo-dias-uteis')?.value) || 0,
        diasTrabalhados: parseInt(document.getElementById('recibo-dias-trabalhados')?.value) || 0,
        faltas: parseInt(document.getElementById('recibo-faltas')?.value) || 0,
        diasExtra: parseInt(document.getElementById('recibo-dias-extra')?.value) || 0,
        vcValor: parseFloat(document.getElementById('recibo-vc-valor')?.value) || 0,
    };
}

// ─── Geração de PDF — VR ──────────────────────────────────────────────────────
window.gerarReciboVR = function () {
    const colab = window._reciboColabSelecionado;
    if (!colab) return;
    const p = getDadosPeriodo();
    const totalVR = p.diasTrabalhados * VR_VALOR_DIA;
    const totalJantar = p.diasExtra * VR_VALOR_JANTAR;
    const total = totalVR + totalJantar;
    const mesNome = getNomeMes(p.mes);

    const html = gerarHTMLRecibo({
        titulo: 'RECIBO DE VALE REFEIÇÃO',
        colab,
        mesNome,
        ano: p.ano,
        linhasCalculo: [
            ['Dias Trabalhados', `${p.diasTrabalhados} dias`],
            ['Vale Refeição', `${p.diasTrabalhados} × R$ ${fmt(VR_VALOR_DIA)} = R$ ${fmt(totalVR)}`],
            p.diasExtra > 0 ? ['Jantares (≥ 3h extra)', `${p.diasExtra} × R$ ${fmt(VR_VALOR_JANTAR)} = R$ ${fmt(totalJantar)}`] : null,
            ['TOTAL A RECEBER', `R$ ${fmt(total)}`],
        ].filter(Boolean),
        totalFormatado: `R$ ${fmt(total)}`,
        beneficioNome: 'Vale Refeição',
        observacao: p.diasExtra > 0 ? `Inclui ${p.diasExtra} jantar(es) por dias com 3h ou mais de hora extra.` : ''
    });
    abrirJanelaImpressao(html);
};

// ─── Geração de PDF — VT ──────────────────────────────────────────────────────
window.gerarReciboVT = function () {
    const colab = window._reciboColabSelecionado;
    if (!colab) return;
    const p = getDadosPeriodo();
    const valorDia = parseFloat(colab.valor_transporte) || 0;
    const total = p.diasTrabalhados * valorDia;
    const mesNome = getNomeMes(p.mes);

    const html = gerarHTMLRecibo({
        titulo: 'RECIBO DE VALE TRANSPORTE',
        colab,
        mesNome,
        ano: p.ano,
        linhasCalculo: [
            ['Meio de Transporte', colab.meio_transporte || '—'],
            ['Dias Trabalhados', `${p.diasTrabalhados} dias`],
            ['Valor por Dia', `R$ ${fmt(valorDia)}`],
            ['TOTAL A RECEBER', `R$ ${fmt(total)}`],
        ],
        totalFormatado: `R$ ${fmt(total)}`,
        beneficioNome: 'Vale Transporte',
        observacao: 'Conforme Decreto Nº 95.247/87. O desconto de até 6% do salário base pode ser aplicado conforme legislação.'
    });
    abrirJanelaImpressao(html);
};

// ─── Geração de PDF — VC ──────────────────────────────────────────────────────
window.gerarReciboVC = function () {
    const colab = window._reciboColabSelecionado;
    if (!colab) return;
    const p = getDadosPeriodo();
    const valorIntegral = p.vcValor || parseFloat(colab.valor_transporte) || 0;
    const descontoFaltas = p.diasUteis > 0 ? (valorIntegral / p.diasUteis * p.faltas) : 0;
    const total = Math.max(0, valorIntegral - descontoFaltas);
    const mesNome = getNomeMes(p.mes);

    const html = gerarHTMLRecibo({
        titulo: 'RECIBO DE VALE COMBUSTÍVEL',
        colab,
        mesNome,
        ano: p.ano,
        linhasCalculo: [
            ['Valor Integral do Benefício', `R$ ${fmt(valorIntegral)}`],
            ['Dias Úteis no Mês', `${p.diasUteis} dias`],
            ['Faltas no Período', `${p.faltas} dia(s)`],
            ['Desconto por Faltas', `R$ ${fmt(descontoFaltas)}`],
            ['TOTAL A RECEBER', `R$ ${fmt(total)}`],
        ],
        totalFormatado: `R$ ${fmt(total)}`,
        beneficioNome: 'Vale Combustível',
        observacao: 'O desconto é proporcional às faltas. Dias de folga não geram desconto.'
    });
    abrirJanelaImpressao(html);
};

// ─── Template HTML do recibo ──────────────────────────────────────────────────
function gerarHTMLRecibo({ titulo, colab, mesNome, ano, linhasCalculo, totalFormatado, beneficioNome, observacao }) {
    const hoje = new Date();
    const dataHoje = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;

    const linhasTbody = linhasCalculo.map(([label, val]) => {
        const isTotal = label.toUpperCase().includes('TOTAL');
        return `<tr style="${isTotal ? 'background:#1e3a5f;color:#fff;font-weight:700;font-size:1.05rem;' : ''}">
            <td style="padding:8px 12px;border:1px solid #ddd;font-weight:${isTotal?'700':'400'};">${label}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:${isTotal?'700':'400'};">${val}</td>
        </tr>`;
    }).join('');

    // Cria VIA única com linha de corte entre as duas cópias
    const via = (numero) => `
        <div style="padding:24px 32px; ${numero===2 ? 'padding-top:16px;' : ''}">
            <!-- Cabeçalho da empresa -->
            <table width="100%" style="border-collapse:collapse;margin-bottom:12px;">
                <tr>
                    <td style="padding:8px 12px;border:2px solid #1e3a5f;text-align:center;">
                        <div style="font-size:1.5rem;font-weight:900;color:#1e3a5f;letter-spacing:1px;">AMERICA RENTAL</div>
                        <div style="font-size:.7rem;color:#64748b;">Equipamentos e Serviços</div>
                    </td>
                    <td style="padding:8px 20px;border:2px solid #1e3a5f;text-align:center;min-width:160px;">
                        <div style="font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Mês de Referência</div>
                        <div style="font-size:1.05rem;font-weight:700;color:#1e3a5f;">${mesNome.toUpperCase()} / ${ano}</div>
                    </td>
                    <td style="padding:8px 20px;border:2px solid #1e3a5f;text-align:center;min-width:80px;">
                        <div style="font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">${numero}ª Via</div>
                        <div style="font-size:.7rem;color:#374151;">${numero === 1 ? 'Colaborador' : 'Empresa'}</div>
                    </td>
                </tr>
            </table>

            <!-- Título -->
            <div style="text-align:center;background:#1e3a5f;color:#fff;padding:8px;font-size:1rem;font-weight:700;letter-spacing:1px;margin-bottom:10px;border-radius:4px;">
                ${titulo}
            </div>

            <!-- Dados do Colaborador -->
            <table width="100%" style="border-collapse:collapse;margin-bottom:10px;font-size:.87rem;">
                <tr style="background:#f1f5f9;">
                    <td colspan="4" style="padding:5px 10px;border:1px solid #ddd;font-weight:700;font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Dados do Colaborador</td>
                </tr>
                <tr>
                    <td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;width:20%;font-size:.78rem;color:#475569;">Nome:</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;font-weight:700;" colspan="3">${colab.nome}</td>
                </tr>
                <tr>
                    <td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;font-size:.78rem;color:#475569;">CPF:</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;">${colab.cpf || '—'}</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;font-size:.78rem;color:#475569;">Matrícula:</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;">${colab.numero_registro || colab.id || '—'}</td>
                </tr>
                <tr>
                    <td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;font-size:.78rem;color:#475569;">Cargo:</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;">${colab.cargo || '—'}</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;font-weight:600;font-size:.78rem;color:#475569;">Departamento:</td>
                    <td style="padding:7px 10px;border:1px solid #ddd;">${colab.departamento || '—'}</td>
                </tr>
            </table>

            <!-- Cálculo -->
            <table width="100%" style="border-collapse:collapse;margin-bottom:10px;font-size:.9rem;">
                <thead>
                    <tr style="background:#e8edf5;">
                        <th style="padding:7px 12px;border:1px solid #ddd;text-align:left;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:#374151;">Descrição</th>
                        <th style="padding:7px 12px;border:1px solid #ddd;text-align:right;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:#374151;">Valor</th>
                    </tr>
                </thead>
                <tbody>${linhasTbody}</tbody>
            </table>

            ${observacao ? `<div style="font-size:.78rem;color:#64748b;background:#f8fafc;border-left:3px solid #94a3b8;padding:6px 10px;margin-bottom:10px;border-radius:0 4px 4px 0;">${observacao}</div>` : ''}

            <!-- Declaração -->
            <div style="font-size:.87rem;color:#374151;margin-bottom:16px;line-height:1.6;">
                Declaro que recebi da empresa <strong>AMERICA RENTAL</strong> o benefício de <strong>${beneficioNome}</strong>
                referente ao mês de <strong>${mesNome}/${ano}</strong>, no valor de <strong>${totalFormatado}</strong>.
            </div>

            <!-- Assinatura -->
            <table width="100%" style="border-collapse:collapse;">
                <tr>
                    <td style="width:55%;text-align:center;padding-top:36px;">
                        <div style="border-top:1px solid #000;padding-top:6px;font-size:.8rem;color:#374151;">Assinatura do Colaborador</div>
                        <div style="font-size:.75rem;color:#94a3b8;">${colab.nome}</div>
                    </td>
                    <td style="width:10%;"></td>
                    <td style="width:35%;text-align:center;padding-top:36px;">
                        <div style="border-top:1px solid #000;padding-top:6px;font-size:.8rem;color:#374151;">Data</div>
                        <div style="font-size:.75rem;color:#94a3b8;">${dataHoje}</div>
                    </td>
                </tr>
            </table>
        </div>
    `;

    return `<!DOCTYPE html><html lang="pt-BR"><head>
        <meta charset="UTF-8">
        <title>${titulo} — ${colab.nome}</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
            @media print {
                .no-print { display: none !important; }
                body { margin: 0; }
            }
        </style>
    </head><body>
        <div class="no-print" style="background:#1e3a5f;color:#fff;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:700;">${titulo} — ${colab.nome}</span>
            <button onclick="window.print()" style="background:#fff;color:#1e3a5f;border:none;padding:6px 20px;border-radius:6px;font-weight:700;cursor:pointer;">🖨 Imprimir</button>
        </div>

        ${via(1)}

        <div style="border-top:2px dashed #94a3b8;margin:0 32px;position:relative;">
            <span style="position:absolute;left:50%;transform:translateX(-50%);background:#fff;padding:0 12px;font-size:.75rem;color:#94a3b8;top:-9px;">✂ Cortar aqui</span>
        </div>

        ${via(2)}
    </body></html>`;
}

// ─── Abre janela de impressão ─────────────────────────────────────────────────
function abrirJanelaImpressao(html) {
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) { alert('Habilite pop-ups para gerar o recibo.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.focus(), 200);
}
