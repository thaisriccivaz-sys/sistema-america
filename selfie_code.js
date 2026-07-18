window.abrirAssinaturaEpi = async function (fichaId) {
    const { fichas, colabId } = window._epiProntuarioData || {};
    const ficha = (fichas || []).find(f => f.id === fichaId);
    if (!ficha) return;

    const epis = ficha.snapshot_epis || [];
    const termo = ficha.snapshot_termo || '';
    const nomeColab = viewedColaborador?.nome_completo || '';

    // Remove popup anterior se existir
    const old = document.getElementById('epi-assinatura-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'epi-assinatura-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column;';

    const hoje = new Date();
    const hojeDD = String(hoje.getDate()).padStart(2, '0');
    const hojeM = String(hoje.getMonth() + 1).padStart(2, '0');
    const hojeStr = hojeDD + '/' + hojeM + '/' + hoje.getFullYear();

    overlay.innerHTML = `
        <div style="background:#1e3a5f;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <i class="ph ph-pen" style="color:#93c5fd;font-size:1.4rem;"></i>
                <div>
                    <p style="margin:0;color:#f1f5f9;font-weight:700;font-size:1rem;">Registro de Entrega de EPI</p>
                    <p style="margin:0;color:#93c5fd;font-size:0.8rem;">${nomeColab} &mdash; ${ficha.grupo}</p>
                </div>
            </div>
            <button onclick="window._fecharOverlayEpi()"
                    style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">&times;</button>
        </div>
        <!-- Step indicators: 4 passos -->
        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:0.6rem 1.5rem;display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
            <div id="step-ind-1" style="display:flex;align-items:center;gap:5px;font-size:0.82rem;font-weight:700;color:#1e3a5f;white-space:nowrap;">
                <span id="step-badge-1" style="background:#1e3a5f;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;">1</span>
                Selecionar
            </div>
            <div style="flex:1;height:2px;background:#e2e8f0;"></div>
            <div id="step-ind-selfie" style="display:flex;align-items:center;gap:5px;font-size:0.82rem;font-weight:700;color:#94a3b8;white-space:nowrap;">
                <span id="step-badge-selfie" style="background:#cbd5e1;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;">­ƒôÀ</span>
                Selfie
            </div>
            <div style="flex:1;height:2px;background:#e2e8f0;"></div>
            <div id="step-ind-2" style="display:flex;align-items:center;gap:5px;font-size:0.82rem;font-weight:700;color:#94a3b8;white-space:nowrap;">
                <span id="step-badge-2" style="background:#cbd5e1;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;">3</span>
                Assinar
            </div>
            <div style="flex:1;height:2px;background:#e2e8f0;"></div>
            <div id="step-ind-3" style="display:flex;align-items:center;gap:5px;font-size:0.82rem;font-weight:700;color:#94a3b8;white-space:nowrap;">
                <span id="step-badge-3" style="background:#cbd5e1;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;">4</span>
                Confirmar
            </div>
        </div>
        <div id="epi-assin-body" style="flex:1;overflow-y:auto;padding:1.5rem 2rem;">

            <!-- PASSO 1: Selecionar EPIs -->
            <div id="epi-step-1">
                <div style="display:flex;align-items:flex-end;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap;">
                    <div>
                        <label style="display:block;font-size:0.85rem;font-weight:700;color:#374151;margin-bottom:4px;">Data de Entrega:</label>
                        <input type="date" id="epi-data-entrega"
                               style="border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.9rem;font-size:0.9rem;outline:none;cursor:pointer;">
                    </div>
                    <div style="flex:1;min-width:180px;">
                        <label style="display:block;font-size:0.85rem;font-weight:700;color:#374151;margin-bottom:4px;">Pesquisar:</label>
                        <div style="position:relative;">
                            <i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;pointer-events:none;"></i>
                            <input type="text" id="epi-busca" placeholder="Filtrar EPIs..."
                                   oninput="window._filtrarEpis(this.value)"
                                   style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.85rem 0.5rem 2.2rem;font-size:0.88rem;outline:none;box-sizing:border-box;">
                        </div>
                    </div>
                </div>
                <p style="font-size:0.82rem;color:#64748b;margin:0 0 0.75rem;">Ajuste a <strong>quantidade</strong> desejada de cada EPI:</p>
                <div id="epi-lista-botoes" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;"></div>
                <p id="epi-select-warn" style="color:#dc2626;font-size:0.85rem;margin:0.75rem 0 0;display:none;">&#9888; Defina quantidade &gt; 0 em pelo menos um EPI.</p>
            </div>

            <!-- PASSO SELFIE -->
            <div id="epiov-step-selfie" style="display:none;max-width:520px;margin:0 auto;">
                <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#eff6ff;border-radius:10px;border-left:4px solid #2563eb;margin-bottom:1.25rem;">
                    <i class="ph ph-camera" style="font-size:1.5rem;color:#2563eb;"></i>
                    <div>
                        <div style="font-weight:700;font-size:0.95rem;color:#1e40af;">Passo 2 de 4 &mdash; Selfie do Colaborador</div>
                        <div style="font-size:0.8rem;color:#3b82f6;">Posicione o rosto do colaborador e clique em &quot;Tirar Foto&quot;</div>
                    </div>
                </div>

                <div style="position:relative;border-radius:12px;overflow:hidden;background:#0f172a;aspect-ratio:4/3;">
                    <video id="epi-assin-selfie-video" autoplay playsinline muted
                           style="width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1);"></video>
                    <canvas id="epi-assin-selfie-canvas"
                            style="display:none;width:100%;height:100%;object-fit:cover;"></canvas>
                    <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 10px;background:linear-gradient(transparent,rgba(0,0,0,0.8));pointer-events:none;">
                        <div id="epi-assin-selfie-info1" style="font-size:0.72rem;color:#fbbf24;font-weight:600;margin-bottom:2px;"></div>
                        <div id="epi-assin-selfie-info2" style="font-size:0.7rem;color:#e2e8f0;"></div>
                        <div id="epi-assin-selfie-dt" style="font-size:0.65rem;color:#94a3b8;"></div>
                    </div>
                </div>

                <div id="epi-assin-selfie-status" style="font-size:0.8rem;color:#6b7280;text-align:center;margin:0.6rem 0;"></div>

                <div style="display:flex;flex-direction:column;gap:0.6rem;margin-top:0.5rem;">
                    <button id="btn-epi-assin-tirar" type="button" onclick="window._epiAssinTirarFoto()"
                            style="padding:0.75rem;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <i class="ph ph-camera"></i> Tirar Foto
                    </button>
                    <button id="btn-epi-assin-refazer" type="button" onclick="window._epiAssinRefazerFoto()"
                            style="padding:0.65rem;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;border-radius:10px;font-weight:600;font-size:0.85rem;cursor:pointer;display:none;align-items:center;justify-content:center;gap:6px;">
                        <i class="ph ph-arrow-counter-clockwise"></i> Refazer Foto
                    </button>
                    <button id="btn-epi-assin-confirmar" type="button" onclick="window._epiAssinConfirmarFoto()"
                            style="padding:0.75rem;background:#16a34a;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;display:none;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 6px -1px rgba(22,163,74,0.3);">
                        <i class="ph ph-check-circle"></i> Confirmar e Assinar
                    </button>
                </div>
            </div>

            <!-- PASSO 2: Assinatura (agora passo 3) -->
            <div id="epi-step-2" style="display:none; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <!-- Esquerda: EPIs, selfie thumb e Termo -->
                <div style="display:flex;flex-direction:column;min-width:0;">
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:0.85rem 1rem;margin-bottom:0.75rem;">
                        <p style="font-size:0.85rem;font-weight:700;color:#166534;margin:0 0 6px;">EPIs para entrega em <strong id="epi-data-display"></strong>:</p>
                        <ul id="epi-lista-selecionada" style="margin:0;padding-left:1.25rem;font-size:0.85rem;color:#15803d;column-count:1;"></ul>
                    </div>
                    <!-- Selfie thumbnail -->
                    <div id="epi-assin-selfie-thumb-box" style="display:none;border-radius:8px;border:2px solid #bbf7d0;background:#f0fdf4;padding:8px;display:flex;align-items:center;gap:8px;margin-bottom:0.75rem;">
                        <canvas id="epi-assin-selfie-thumb" style="width:64px;height:48px;border-radius:6px;flex-shrink:0;"></canvas>
                        <div style="font-size:0.78rem;color:#166534;">
                            <div style="font-weight:700;"><i class="ph ph-shield-check"></i> Selfie registrada</div>
                            <div id="epi-assin-selfie-thumb-dt" style="color:#4ade80;font-size:0.7rem;"></div>
                        </div>
                    </div>
                    <p style="font-size:0.85rem;font-weight:700;color:#374151;margin:0 0 6px;">Termo de Responsabilidade:</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.9rem;font-size:0.82rem;color:#374151;overflow-y:auto;line-height:1.6;white-space:pre-wrap;flex:1;">${termo}</div>
                </div>
                <!-- Direita: Assinatura -->
                <div style="display:flex;flex-direction:column;min-width:0;">
                    <p style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 6px;"><i class="ph ph-pen" style="color:#1e3a5f;"></i> Assinatura do Colaborador:</p>
                    <p style="font-size:0.8rem;color:#64748b;margin:0 0 8px;">Assine abaixo. Ser&aacute; aplicada em todos os itens entregues.</p>
                    <div style="border:2px dashed #94a3b8;border-radius:10px;background:#fafafa;position:relative;flex:1;display:flex;">
                        <canvas id="epi-signature-canvas" width="900" height="450"
                                style="width:100%;height:100%;min-height:220px;border-radius:8px;touch-action:none;cursor:crosshair;display:block;"></canvas>
                        <button onclick="window._limparAssinatura()"
                                style="position:absolute;top:8px;right:8px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:4px 12px;font-size:0.78rem;color:#475569;cursor:pointer;">Limpar</button>
                    </div>
                    <p id="epi-assin-warn" style="color:#dc2626;font-size:0.82rem;margin:0.5rem 0 0;display:none;">A assinatura &eacute; obrigat&oacute;ria.</p>
                </div>
            </div>

            <!-- PASSO 3: Sucesso -->
            <div id="epi-step-3" style="display:none;text-align:center;padding:4rem 1rem;">
                <i class="ph ph-check-circle" style="font-size:5rem;color:#16a34a;display:block;margin-bottom:1rem;"></i>
                <p style="font-weight:700;font-size:1.2rem;color:#15803d;margin:0 0 6px;">Entrega registrada com sucesso!</p>
                <p style="font-size:0.9rem;color:#64748b;">EPIs e assinatura salvos na ficha.</p>
            </div>
        </div>
        <div id="epi-assin-footer" style="border-top:1px solid #e2e8f0;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0;">
            <button id="btn-assin-back" onclick="window._assinBackStep()"
                    style="display:none;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.65rem 1.5rem;font-weight:600;font-size:0.9rem;cursor:pointer;color:#475569;">
                <i class="ph ph-arrow-left"></i> Voltar
            </button>
            <div></div>
            <button id="btn-assin-next" onclick="window._assinNextStep()" class="btn btn-primary"
                    style="padding:0.65rem 2rem;font-weight:700;font-size:0.95rem;display:flex;align-items:center;gap:8px;">
                Pr&oacute;ximo <i class="ph ph-arrow-right"></i>
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    window._assinCurrentStep = 1;
    window._assinFichaId = fichaId;
    window._assinColabId = colabId;
    window._assinEpisDisponiveis = epis;
    window._assinQtds = {};
    window._assinSelfieBase64 = null;
    window._assinSelfieTs = null;
    window._assinSelfieStream = null;

    // Fechar overlay parando c├ómera
    window._fecharOverlayEpi = function() {
        if (window._assinSelfieStream) {
            window._assinSelfieStream.getTracks().forEach(t => t.stop());
            window._assinSelfieStream = null;
        }
        const ov = document.getElementById('epi-assinatura-overlay');
        if (ov) ov.remove();
    };

    // Inicia c├ómera do passo selfie
    window._epiAssinIniciarCamera = async function() {
        const statusEl = document.getElementById('epi-assin-selfie-status');
        try {
            window._assinSelfieStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            const video = document.getElementById('epi-assin-selfie-video');
            if (video) { video.srcObject = window._assinSelfieStream; video.style.display = 'block'; }
            document.getElementById('epi-assin-selfie-canvas').style.display = 'none';
            document.getElementById('btn-epi-assin-tirar').style.display = 'flex';
            document.getElementById('btn-epi-assin-refazer').style.display = 'none';
            document.getElementById('btn-epi-assin-confirmar').style.display = 'none';
            if (statusEl) statusEl.textContent = 'C├ómera pronta. Posicione o rosto do colaborador.';
        } catch(err) {
            console.error('[EPI Selfie]', err);
            if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626;"><i class="ph ph-warning"></i> C├ómera n├úo acess├¡vel. Verifique as permiss├Áes.</span>';
            document.getElementById('btn-epi-assin-tirar').style.display = 'none';
        }
    };

    window._epiAssinTirarFoto = function() {
        const video = document.getElementById('epi-assin-selfie-video');
        const canvas = document.getElementById('epi-assin-selfie-canvas');
        if (!video || !window._assinSelfieStream) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        window._assinSelfieTs = new Date();
        const dtStr = window._assinSelfieTs.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
        const entregadorNome = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.nome || currentUser.username || 'Usu├írio') : 'Usu├írio';
        // overlay de texto na foto
        const overlayH = 56;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px Arial';
        ctx.fillText('Entregue por: ' + entregadorNome, 8, canvas.height - overlayH + 16);
        ctx.fillStyle = '#e2e8f0'; ctx.font = '12px Arial';
        ctx.fillText('Colaborador: ' + nomeColab, 8, canvas.height - overlayH + 32);
        ctx.fillStyle = '#94a3b8'; ctx.font = '11px Arial';
        ctx.fillText(dtStr, 8, canvas.height - overlayH + 48);
        window._assinSelfieBase64 = canvas.toDataURL('image/jpeg', 0.88);
        video.style.display = 'none';
        canvas.style.display = 'block';
        document.getElementById('btn-epi-assin-tirar').style.display = 'none';
        document.getElementById('btn-epi-assin-refazer').style.display = 'flex';
        document.getElementById('btn-epi-assin-confirmar').style.display = 'flex';
        const statusEl = document.getElementById('epi-assin-selfie-status');
        if (statusEl) statusEl.innerHTML = '<span style="color:#16a34a;"><i class="ph ph-check-circle"></i> Foto tirada! Confirme ou refa├ºa.</span>';
    };

    window._epiAssinRefazerFoto = function() {
        window._assinSelfieBase64 = null; window._assinSelfieTs = null;
        const video = document.getElementById('epi-assin-selfie-video');
        const canvas = document.getElementById('epi-assin-selfie-canvas');
        video.style.display = 'block'; canvas.style.display = 'none';
        document.getElementById('btn-epi-assin-tirar').style.display = 'flex';
        document.getElementById('btn-epi-assin-refazer').style.display = 'none';
        document.getElementById('btn-epi-assin-confirmar').style.display = 'none';
        const statusEl = document.getElementById('epi-assin-selfie-status');
        if (statusEl) statusEl.textContent = 'C├ómera pronta. Posicione o rosto do colaborador.';
    };

    window._epiAssinConfirmarFoto = function() {
        if (!window._assinSelfieBase64) return;
        // Para c├ómera
        if (window._assinSelfieStream) { window._assinSelfieStream.getTracks().forEach(t => t.stop()); window._assinSelfieStream = null; }
        // Thumb no passo de assinatura
        const srcC = document.getElementById('epi-assin-selfie-canvas');
        const thumb = document.getElementById('epi-assin-selfie-thumb');
        if (srcC && thumb) {
            const tctx = thumb.getContext('2d'); thumb.width = srcC.width; thumb.height = srcC.height;
            tctx.drawImage(srcC, 0, 0);
        }
        const thumbBox = document.getElementById('epi-assin-selfie-thumb-box');
        if (thumbBox) thumbBox.style.display = 'flex';
        const thumbDt = document.getElementById('epi-assin-selfie-thumb-dt');
        if (thumbDt && window._assinSelfieTs) {
            thumbDt.textContent = window._assinSelfieTs.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        }
        // Ir para assinatura
        window._assinGoToStep2();
    };

    // Navegar para o passo de assinatura (step 2)
    window._assinGoToStep2 = function() {
        document.getElementById('epiov-step-selfie').style.display = 'none';
        const s2 = document.getElementById('epi-step-2');
        s2.style.display = 'grid';
        window._assinCurrentStep = 2;
        // Atualiza badges
        ['1','selfie','2','3'].forEach((s, i) => {
            const badge = document.getElementById('step-badge-' + s);
            const ind = document.getElementById('step-ind-' + s);
            if (!badge || !ind) return;
            const done = i < 2; const active = i === 2;
            badge.style.background = done ? '#16a34a' : active ? '#1e3a5f' : '#cbd5e1';
            badge.innerHTML = done ? 'Ô£ô' : (s === 'selfie' ? '­ƒôÀ' : (i + 1));
            ind.style.color = (done || active) ? (done ? '#16a34a' : '#1e3a5f') : '#94a3b8';
        });
        const btnBack = document.getElementById('btn-assin-back');
        if (btnBack) btnBack.style.display = 'flex';
        const btnNext = document.getElementById('btn-assin-next');
        if (btnNext) { btnNext.style.display = 'flex'; btnNext.innerHTML = 'Confirmar Entrega <i class="ph ph-check"></i>'; }
        setTimeout(() => { window._initSignatureCanvas(); }, 100);
    };

    // Voltar do step selfie ou assinatura
    window._assinBackStep = function() {
        if (window._assinCurrentStep === 'selfie') {
            if (window._assinSelfieStream) { window._assinSelfieStream.getTracks().forEach(t => t.stop()); window._assinSelfieStream = null; }
            window._assinStep(1);
        } else if (window._assinCurrentStep === 2) {
            // voltar para selfie
            document.getElementById('epi-step-2').style.display = 'none';
            const selfieDiv = document.getElementById('epiov-step-selfie');
            selfieDiv.style.display = 'block';
            window._assinCurrentStep = 'selfie';
            ['1','selfie','2','3'].forEach((s, i) => {
                const badge = document.getElementById('step-badge-' + s);
                const ind = document.getElementById('step-ind-' + s);
                if (!badge || !ind) return;
                const done = i < 1; const active = i === 1;
                badge.style.background = done ? '#16a34a' : active ? '#1e3a5f' : '#cbd5e1';
                badge.innerHTML = done ? 'Ô£ô' : (s === 'selfie' ? '­ƒôÀ' : (active ? '­ƒôÀ' : (i + 1)));
                ind.style.color = (done || active) ? (done ? '#16a34a' : '#1e3a5f') : '#94a3b8';
            });
            const btnBack = document.getElementById('btn-assin-back');
            if (btnBack) btnBack.style.display = 'flex';
            const btnNext = document.getElementById('btn-assin-next');
            if (btnNext) { btnNext.style.display = 'none'; }
            // Reiniciar c├ómera se necess├írio
            if (!window._assinSelfieBase64) { window._epiAssinIniciarCamera(); }
        } else {
            window._assinStep(1);
        }
    };

    setTimeout(() => {
        window._initSignatureCanvas();
        const today = new Date();
        const di = document.getElementById('epi-data-entrega');
        if (di) { di.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'); }
        window._renderEpiGrid('');
        // Preencher infos do overlay da selfie
        const entregadorNome = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.nome || currentUser.username || 'Usu├írio') : 'Usu├írio';
        const el1 = document.getElementById('epi-assin-selfie-info1');
        if (el1) el1.textContent = 'Entregue por: ' + entregadorNome;
        const el2 = document.getElementById('epi-assin-selfie-info2');
        if (el2) el2.textContent = 'Colaborador: ' + nomeColab;
        // Clock no overlay
        const dtEl = document.getElementById('epi-assin-selfie-dt');
        if (dtEl) {
            const tick = () => { dtEl.textContent = new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }); };
            tick(); clearInterval(window._epiAssinClock);
            window._epiAssinClock = setInterval(() => {
                const sv = document.getElementById('epiov-step-selfie');
                if (!sv || sv.style.display === 'none') { clearInterval(window._epiAssinClock); } else { tick(); }
            }, 1000);
        }
    }, 100);
};

window._renderEpiGrid = function (filtro) {
    const epis = window._assinEpisDisponiveis || [];
    const c2 = document.getElementById('epi-lista-botoes');
    if (!c2) return;
    const f = (filtro || '').toLowerCase().trim();
    const filtered = f ? epis.filter(e => e.toLowerCase().includes(f)) : epis;
    c2.innerHTML = '';
    filtered.forEach(epi => {
        const qty = window._assinQtds[epi] || 0;
        const card = document.createElement('div');
        card.setAttribute('data-epi-card', epi);
        card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.65rem 1rem;border:2px solid ' + (qty > 0 ? '#16a34a' : '#e2e8f0') + ';border-radius:10px;background:' + (qty > 0 ? '#f0fdf4' : '#fff') + ';box-shadow:0 1px 3px rgba(0,0,0,0.06);';
        const lbl = document.createElement('span'); lbl.style.cssText = 'font-size:0.88rem;color:#0f172a;font-weight:600;flex:1;margin-right:0.5rem;line-height:1.3;'; lbl.textContent = epi;
        const ctrl = document.createElement('div'); ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';
        const btnM = document.createElement('button'); btnM.textContent = 'ÔêÆ'; btnM.style.cssText = 'background:' + (qty > 0 ? '#1e3a5f' : '#e2e8f0') + ';color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnM.addEventListener('click', () => window._setEpiQty(epi, Math.max(0, (window._assinQtds[epi] || 0) - 1)));
        const inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.value = qty; inp.style.cssText = 'width:48px;text-align:center;border:1.5px solid #e2e8f0;border-radius:6px;padding:4px;font-size:0.95rem;font-weight:700;color:#0f172a;';
        inp.addEventListener('input', () => window._setEpiQty(epi, Math.max(0, parseInt(inp.value) || 0)));
        const btnP = document.createElement('button'); btnP.textContent = '+'; btnP.style.cssText = 'background:#1e3a5f;color:#fff;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        btnP.addEventListener('click', () => window._setEpiQty(epi, (window._assinQtds[epi] || 0) + 1));
        ctrl.appendChild(btnM); ctrl.appendChild(inp); ctrl.appendChild(btnP);
        card.appendChild(lbl); card.appendChild(ctrl); c2.appendChild(card);
    });
};

window._requiresSize = function(epi) {
    const e = epi.toUpperCase();
    // Camiseta Branca tem tamanho ├║nico no estoque ÔÇö n├úo pede tamanho
    if (e.includes('CAMISETA') && e.includes('BRANCA')) return false;
    // Uniformes e roupas
    if (['CAMISETA', 'POLO', 'CAL├çA', 'BLUSA', 'JAQUETA', 'COLETE', 'BLUSAO', 'BLUS├âO', 'UNIFORME'].some(k => e.includes(k))) return 'roupa';
    // Botas
    if (e.includes('BOTA')) return 'bota';
    return false;
};
