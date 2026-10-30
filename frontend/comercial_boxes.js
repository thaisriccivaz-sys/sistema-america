/* ══════════════════════════════════════════════════════════════════════
   BOXES DE MÍDIA — banners de imagem/vídeo em largura total para o modelo de proposta
   - Biblioteca: anexar, renomear, subir/descer, excluir (arquivos no Cloudflare R2)
   - Responsivo: cada box define como aparece no CELULAR
       mesma    → mesma mídia, largura total, altura proporcional
       arquivo  → outra imagem/vídeo exclusivo para o celular
       recorte  → enquadra a mídia numa proporção (1:1, 4:5, 9:16...) com ponto de foco
       ocultar  → não aparece no celular
   - Áreas clicáveis (hiperlink) desenhadas sobre a imagem, abrindo em nova página
   - window.boxRenderHtml(box, 'desktop'|'mobile') é reutilizável (preview e página pública)
   ══════════════════════════════════════════════════════════════════════ */
(function () {
    const esc = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const tok = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const MAX_MB = 120;
    const MODOS_MOBILE = [
        { v: 'mesma', t: 'Usar a mesma mídia (largura total, altura proporcional)' },
        { v: 'arquivo', t: 'Usar outra imagem/vídeo só para o celular' },
        { v: 'recorte', t: 'Recortar / enquadrar a mídia (proporção + ponto de foco)' },
        { v: 'ocultar', t: 'Não mostrar este box no celular' }
    ];
    const PROPORCOES = ['1:1', '4:5', '3:4', '9:16', '16:9', '3:2'];
    const ROTULO_MODO = { mesma: 'Celular: mesma mídia', arquivo: 'Celular: mídia própria', recorte: 'Celular: recortada', ocultar: 'Celular: oculto' };

    async function chamar(metodo, url, body) {
        const headers = { 'Authorization': 'Bearer ' + tok() };
        const opts = { method: metodo, headers };
        if (body instanceof FormData) opts.body = body;
        else if (body) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        const res = await fetch('/api' + url, opts);
        const txt = await res.text();
        try { return JSON.parse(txt); } catch (e) {
            return { error: res.status === 413 ? `Arquivo muito grande (limite ${MAX_MB} MB).` : 'O servidor devolveu uma resposta inesperada. Tente novamente.' };
        }
    }

    /* ── Renderização compartilhada (preview, editor e página pública) ───────────── */
    function midiaHtml(src, tipo, estilo) {
        if (!src) return '';
        if (tipo === 'video') {
            return `<video src="${esc(src)}" controls playsinline preload="metadata" style="${estilo}"></video>`;
        }
        return `<img src="${esc(src)}" alt="" style="${estilo}" draggable="false">`;
    }

    function hotspotsHtml(lista) {
        return (lista || []).map(h =>
            `<a href="${esc(h.url)}" target="_blank" rel="noopener noreferrer" title="${esc(h.titulo || h.url)}" ` +
            `style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; display:block; cursor:pointer;"></a>`
        ).join('');
    }

    /* Resolve como o box aparece em cada tela. Retorna null quando está oculto. */
    function resolverVisao(box, view) {
        if (view !== 'mobile') {
            return { src: box.url, tipo: box.tipo, hotspots: box.hotspots_desktop || [], recorte: false };
        }
        const modo = box.mobile_modo || 'mesma';
        if (modo === 'ocultar') return null;
        if (modo === 'arquivo' && box.mobile_url) {
            return { src: box.mobile_url, tipo: box.mobile_tipo || 'imagem', hotspots: box.hotspots_mobile || [], recorte: false };
        }
        if (modo === 'recorte') {
            return { src: box.url, tipo: box.tipo, hotspots: [], recorte: true };
        }
        return { src: box.url, tipo: box.tipo, hotspots: box.hotspots_desktop || [], recorte: false };
    }

    window.boxRenderHtml = function (box, view, opts) {
        opts = opts || {};
        const v = resolverVisao(box, view);
        if (!v) {
            return opts.mostrarOculto
                ? `<div style="background:#f1f5f9; color:#64748b; font-size:0.72rem; text-align:center; padding:10px; border-bottom:1px dashed #cbd5e1; line-height:1.3;">“${esc(box.nome)}” fica oculto no celular</div>`
                : '';
        }
        if (v.recorte) {
            const [a, b] = String(box.mobile_proporcao || '4:5').split(':').map(Number);
            const fx = Number(box.foco_x ?? 50), fy = Number(box.foco_y ?? 50);
            return `<div style="position:relative; width:100%; aspect-ratio:${a || 4} / ${b || 5}; overflow:hidden; line-height:0;">` +
                midiaHtml(v.src, v.tipo, `width:100%; height:100%; object-fit:cover; object-position:${fx}% ${fy}%; display:block;`) +
                `</div>`;
        }
        return `<div style="position:relative; width:100%; line-height:0;">` +
            midiaHtml(v.src, v.tipo, 'width:100%; height:auto; display:block;') +
            (v.tipo === 'video' ? '' : hotspotsHtml(v.hotspots)) +
            `</div>`;
    };

    /* ── Gerenciador (biblioteca) ──────────────────────────────────────────────────── */
    window._boxesLista = [];
    window._boxesViewPreview = 'desktop';

    window.abrirGerenciadorBoxes = async function () {
        const ant = document.getElementById('boxes-manager-overlay');
        if (ant) ant.remove();
        const ov = document.createElement('div');
        ov.id = 'boxes-manager-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:99990; display:flex; align-items:center; justify-content:center; font-family:Inter, sans-serif;';
        ov.innerHTML = `
        <div style="background:#f8fafc; width:min(1280px, 96vw); height:92vh; border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.35); display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:0.8rem 1.2rem; background:#fff; border-bottom:1px solid #e2e8f0; flex-wrap:wrap;">
                <div>
                    <div style="font-size:1.05rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:8px;"><i class="ph ph-image-square" style="color:#7048e8;"></i> Boxes (Banners de Imagem e Vídeo)</div>
                    <div style="font-size:0.74rem; color:#64748b;">Cada box ocupa a largura total da página, com altura proporcional à mídia. Use ▲ ▼ para definir a ordem.</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="window.abrirEditorBox(null)" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="ph ph-plus-circle"></i> Anexar Box</button>
                    <button onclick="document.getElementById('boxes-manager-overlay')?.remove()" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;">Fechar</button>
                </div>
            </div>
            <div style="flex:1; min-height:0; display:grid; grid-template-columns:minmax(380px, 0.9fr) 1.1fr; gap:0.9rem; padding:0.9rem;">
                <div style="display:flex; flex-direction:column; min-height:0;">
                    <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Biblioteca <span id="boxes-count" style="background:#ede9fe; color:#6d28d9; padding:1px 8px; border-radius:999px; margin-left:4px;">0</span></div>
                    <div id="boxes-lista" style="flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;"></div>
                </div>
                <div style="display:flex; flex-direction:column; min-height:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Pré-visualização da página</div>
                        <div id="boxes-toggle-view" style="display:inline-flex; background:#e2e8f0; border-radius:8px; padding:3px; gap:2px;"></div>
                    </div>
                    <div id="boxes-preview" style="flex:1; min-height:0; overflow-y:auto; background:#e2e8f0; border-radius:10px; border:1px solid #cbd5e1; padding:14px;"></div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(ov);
        await window.carregarBoxes();
    };

    window.carregarBoxes = async function () {
        const lista = document.getElementById('boxes-lista');
        if (lista && !window._boxesLista.length) lista.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2rem; font-size:0.85rem;">Carregando...</div>';
        const r = await apiGet('/comercial/boxes');
        window._boxesLista = Array.isArray(r) ? r : [];
        window._renderBoxesLista();
        window._renderBoxesPreview();
    };

    window._renderBoxesLista = function () {
        const el = document.getElementById('boxes-lista');
        const cnt = document.getElementById('boxes-count');
        if (cnt) cnt.textContent = String(window._boxesLista.length);
        if (!el) return;
        const lista = window._boxesLista;
        if (!lista.length) {
            el.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2.5rem 1rem; font-size:0.85rem; border:2px dashed #cbd5e1; border-radius:10px; background:#fff;">Nenhum box cadastrado.<br>Clique em <b>Anexar Box</b> para adicionar uma imagem ou vídeo.</div>';
            return;
        }
        el.innerHTML = lista.map((b, i) => {
            const thumb = b.tipo === 'video'
                ? `<video src="${esc(b.url)}#t=0.5" muted preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video>`
                : `<img src="${esc(b.url)}" alt="" style="width:100%; height:100%; object-fit:cover;">`;
            const nHot = (b.hotspots_desktop || []).length + (b.hotspots_mobile || []).length;
            return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:8px; display:flex; gap:10px; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <button title="Subir" ${i === 0 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'up')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === 0 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === 0 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-up"></i></button>
                    <button title="Descer" ${i === lista.length - 1 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'down')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === lista.length - 1 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === lista.length - 1 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-down"></i></button>
                </div>
                <div style="width:120px; height:72px; border-radius:7px; overflow:hidden; background:#0f172a; flex-shrink:0; position:relative;">
                    ${thumb}
                    ${b.tipo === 'video' ? '<span style="position:absolute; right:4px; bottom:4px; background:rgba(0,0,0,0.7); color:#fff; font-size:0.62rem; padding:1px 5px; border-radius:4px;">VÍDEO</span>' : ''}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:0.85rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><span style="color:#7048e8;">#${i + 1}</span> ${esc(b.nome)}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                        <span style="background:#f1f5f9; color:#475569; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${b.tipo === 'video' ? 'Vídeo' : 'Imagem'}</span>
                        <span style="background:#ede9fe; color:#6d28d9; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${esc(ROTULO_MODO[b.mobile_modo] || ROTULO_MODO.mesma)}</span>
                        ${nHot ? `<span style="background:#fef3c7; color:#b45309; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${nHot} link(s)</span>` : ''}
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button title="Editar" onclick="window.abrirEditorBox(${b.id})" style="width:32px; height:32px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-pencil-simple"></i></button>
                    <button title="Excluir" onclick="window.excluirBox(${b.id})" style="width:32px; height:32px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    };

    function togglePreviewHtml(atual, fnName) {
        const btn = (v, ico, txt) =>
            `<button onclick="${fnName}('${v}')" style="border:none; padding:5px 12px; border-radius:6px; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; background:${atual === v ? '#7048e8' : 'transparent'}; color:${atual === v ? '#fff' : '#475569'};"><i class="ph ${ico}"></i> ${txt}</button>`;
        return btn('desktop', 'ph-desktop', 'Desktop') + btn('mobile', 'ph-device-mobile', 'Celular');
    }

    function moldura(view, conteudo, vazio) {
        const inner = conteudo || `<div style="padding:2rem 1rem; text-align:center; color:#94a3b8; font-size:0.8rem; line-height:1.4;">${vazio}</div>`;
        if (view === 'mobile') {
            return `<div style="width:375px; max-width:100%; margin:0 auto; background:#fff; border:10px solid #1e293b; border-radius:30px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.25);">
                <div style="background:#1e293b; height:6px;"></div>${inner}</div>`;
        }
        return `<div style="width:100%; background:#fff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.08);">
            <div style="background:#e2e8f0; height:22px; display:flex; align-items:center; gap:5px; padding:0 8px;"><span style="width:8px; height:8px; border-radius:50%; background:#f87171;"></span><span style="width:8px; height:8px; border-radius:50%; background:#fbbf24;"></span><span style="width:8px; height:8px; border-radius:50%; background:#4ade80;"></span></div>${inner}</div>`;
    }

    window._setBoxesViewPreview = function (v) {
        window._boxesViewPreview = v === 'mobile' ? 'mobile' : 'desktop';
        window._renderBoxesPreview();
    };

    window._renderBoxesPreview = function () {
        const prev = document.getElementById('boxes-preview');
        const tog = document.getElementById('boxes-toggle-view');
        if (tog) tog.innerHTML = togglePreviewHtml(window._boxesViewPreview, 'window._setBoxesViewPreview');
        if (!prev) return;
        const view = window._boxesViewPreview;
        const html = window._boxesLista.map(b => window.boxRenderHtml(b, view, { mostrarOculto: true })).join('');
        prev.innerHTML = moldura(view, html, 'Os boxes aparecem aqui, empilhados na ordem da biblioteca.');
    };

    window.moverBox = async function (id, direcao) {
        const r = await chamar('POST', `/comercial/boxes/${id}/mover`, { direcao });
        if (r && r.error) { alert(r.error); return; }
        await window.carregarBoxes();
    };

    window.excluirBox = async function (id) {
        const b = window._boxesLista.find(x => x.id === id);
        if (!confirm(`Excluir o box "${b ? b.nome : ''}"? O arquivo será removido definitivamente.`)) return;
        const r = await chamar('DELETE', `/comercial/boxes/${id}`);
        if (r && r.error) { alert(r.error); return; }
        await window.carregarBoxes();
    };

    /* ── Editor do box (criador responsivo) ────────────────────────────────────────── */
    let ed = null;

    const tipoDe = (file) => (file && String(file.type).startsWith('video/')) ? 'video' : 'imagem';
    const edSrcDesktop = () => ed.localUrl || ed.url || '';
    const edTipoDesktop = () => ed.localUrl ? ed.localTipo : (ed.tipo || 'imagem');
    const edSrcMobile = () => ed.localMobileUrl || (ed.removerMobile ? '' : (ed.mobile_url || ''));
    const edTipoMobile = () => ed.localMobileUrl ? ed.localMobileTipo : (ed.mobile_tipo || 'imagem');

    /* Qual lista de áreas clicáveis está sendo editada agora (ou null se não é possível) */
    function edHotAtiva() {
        if (ed.view === 'desktop') return edTipoDesktop() === 'video' ? null : ed.hotspots_desktop;
        if (ed.mobile_modo === 'arquivo' && edSrcMobile() && edTipoMobile() !== 'video') return ed.hotspots_mobile;
        return null;
    }

    window.abrirEditorBox = function (id) {
        const b = id ? window._boxesLista.find(x => x.id === id) : null;
        ed = {
            id: b ? b.id : null,
            nome: b ? b.nome : '',
            url: b ? b.url : '', tipo: b ? b.tipo : 'imagem',
            mobile_url: b ? b.mobile_url : '', mobile_tipo: b ? b.mobile_tipo : '',
            mobile_modo: b ? (b.mobile_modo || 'mesma') : 'mesma',
            mobile_proporcao: b ? (b.mobile_proporcao || '4:5') : '4:5',
            foco_x: b ? Number(b.foco_x ?? 50) : 50, foco_y: b ? Number(b.foco_y ?? 50) : 50,
            hotspots_desktop: b ? JSON.parse(JSON.stringify(b.hotspots_desktop || [])) : [],
            hotspots_mobile: b ? JSON.parse(JSON.stringify(b.hotspots_mobile || [])) : [],
            file: null, fileMobile: null, localUrl: null, localMobileUrl: null, localTipo: 'imagem', localMobileTipo: 'imagem',
            removerMobile: false, view: 'desktop'
        };
        const ant = document.getElementById('box-editor-overlay');
        if (ant) ant.remove();
        const ov = document.createElement('div');
        ov.id = 'box-editor-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:99995; display:flex; align-items:center; justify-content:center; font-family:Inter, sans-serif;';
        const lbl = 'display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;';
        const inp = 'width:100%; padding:0.5rem 0.6rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.84rem; box-sizing:border-box; background:#fff;';
        ov.innerHTML = `
        <div style="background:#fff; width:min(1240px, 96vw); height:92vh; border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.4); display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1.2rem; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                <div style="font-size:1rem; font-weight:800; color:#1e293b;"><i class="ph ph-image-square" style="color:#7048e8;"></i> ${b ? 'Editar Box' : 'Novo Box'}</div>
                <div style="display:flex; gap:8px;">
                    <button id="box-ed-btn-salvar" onclick="window._boxEdSalvar()" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1.1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;"><i class="ph ph-floppy-disk"></i> Salvar Box</button>
                    <button onclick="document.getElementById('box-editor-overlay')?.remove()" style="background:#e2e8f0; color:#334155; border:none; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;">Cancelar</button>
                </div>
            </div>
            <div style="flex:1; min-height:0; display:grid; grid-template-columns:minmax(360px, 0.85fr) 1.15fr;">
                <div style="overflow-y:auto; padding:1rem 1.1rem; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; gap:0.9rem;">
                    <div>
                        <label style="${lbl}">Nome do box *</label>
                        <input type="text" id="box-ed-nome" value="${esc(ed.nome)}" oninput="window._boxEdNome(this.value)" placeholder="Ex.: Banner de abertura" style="${inp}">
                    </div>
                    <div>
                        <label style="${lbl}">Imagem ou vídeo (desktop) ${b ? '' : '*'}</label>
                        <input type="file" id="box-ed-file" accept="image/*,video/*" onchange="window._boxEdArquivo(this, 'desktop')" style="${inp}">
                        <div id="box-ed-file-info" style="font-size:0.7rem; color:#64748b; margin-top:3px;">${b ? 'Arquivo atual mantido. Selecione outro para substituir.' : `Formatos de imagem ou vídeo. Máximo ${MAX_MB} MB.`}</div>
                    </div>

                    <div style="border:1px solid #ddd6fe; background:#faf5ff; border-radius:10px; padding:0.75rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:#5b21b6; margin-bottom:6px;"><i class="ph ph-device-mobile"></i> Como aparece no celular</div>
                        <select id="box-ed-modo" onchange="window._boxEdModo(this.value)" style="${inp}">
                            ${MODOS_MOBILE.map(m => `<option value="${m.v}" ${ed.mobile_modo === m.v ? 'selected' : ''}>${m.t}</option>`).join('')}
                        </select>
                        <div id="box-ed-sec-arquivo" style="display:none; margin-top:8px;">
                            <label style="${lbl}">Imagem ou vídeo exclusivo do celular</label>
                            <input type="file" id="box-ed-file-mobile" accept="image/*,video/*" onchange="window._boxEdArquivo(this, 'mobile')" style="${inp}">
                            <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
                                <span id="box-ed-mobile-info" style="font-size:0.7rem; color:#64748b;"></span>
                                <button id="box-ed-rem-mobile" onclick="window._boxEdRemoverMobile()" style="display:none; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:6px; font-size:0.68rem; font-weight:700; padding:2px 8px; cursor:pointer;">Remover arquivo do celular</button>
                            </div>
                        </div>
                        <div id="box-ed-sec-recorte" style="display:none; margin-top:8px;">
                            <label style="${lbl}">Proporção do quadro no celular</label>
                            <select id="box-ed-prop" onchange="window._boxEdProporcao(this.value)" style="${inp}">
                                ${PROPORCOES.map(p => `<option value="${p}" ${ed.mobile_proporcao === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                            <label style="${lbl} margin-top:8px;">Ponto de foco — clique na parte mais importante da mídia</label>
                            <div id="box-ed-foco" style="position:relative; width:100%; max-height:240px; overflow:hidden; border-radius:8px; border:1px solid #c4b5fd; cursor:crosshair; line-height:0; background:#0f172a;"></div>
                        </div>
                    </div>

                    <div style="border:1px solid #fde68a; background:#fffbeb; border-radius:10px; padding:0.75rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:#b45309; margin-bottom:4px;"><i class="ph ph-link"></i> Áreas clicáveis (hiperlink)</div>
                        <div id="box-ed-hot-ajuda" style="font-size:0.72rem; color:#92400e; margin-bottom:6px; line-height:1.35;"></div>
                        <div id="box-ed-hot-lista" style="display:flex; flex-direction:column; gap:6px;"></div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; min-height:0; background:#e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.9rem;">
                        <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Pré-visualização</div>
                        <div id="box-ed-toggle" style="display:inline-flex; background:#cbd5e1; border-radius:8px; padding:3px; gap:2px;"></div>
                    </div>
                    <div id="box-ed-preview" style="flex:1; min-height:0; overflow-y:auto; padding:0 0.9rem 0.9rem;"></div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(ov);
        window._boxEdRenderTudo();
    };

    window._boxEdRenderTudo = function () {
        const secA = document.getElementById('box-ed-sec-arquivo');
        const secR = document.getElementById('box-ed-sec-recorte');
        if (secA) secA.style.display = ed.mobile_modo === 'arquivo' ? 'block' : 'none';
        if (secR) secR.style.display = ed.mobile_modo === 'recorte' ? 'block' : 'none';
        const info = document.getElementById('box-ed-mobile-info');
        const rem = document.getElementById('box-ed-rem-mobile');
        if (info) info.textContent = ed.localMobileUrl ? `Novo arquivo: ${ed.fileMobile.name}` : (edSrcMobile() ? 'Arquivo do celular atual mantido.' : 'Nenhum arquivo do celular anexado.');
        if (rem) rem.style.display = (!ed.localMobileUrl && ed.mobile_url && !ed.removerMobile) ? 'inline-block' : 'none';
        window._boxEdRenderFoco();
        window._boxEdRenderPreview();
        window._boxEdRenderHotLista();
    };

    window._boxEdNome = function (v) { ed.nome = v; };

    window._boxEdArquivo = function (inputEl, alvo) {
        const f = inputEl.files && inputEl.files[0];
        if (!f) return;
        if (!(String(f.type).startsWith('image/') || String(f.type).startsWith('video/'))) {
            alert('Apenas imagem ou vídeo são permitidos.'); inputEl.value = ''; return;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            alert(`Arquivo muito grande. O limite é ${MAX_MB} MB.`); inputEl.value = ''; return;
        }
        const u = URL.createObjectURL(f);
        if (alvo === 'mobile') {
            if (ed.localMobileUrl) URL.revokeObjectURL(ed.localMobileUrl);
            ed.fileMobile = f; ed.localMobileUrl = u; ed.localMobileTipo = tipoDe(f); ed.removerMobile = false;
            ed.hotspots_mobile = [];
        } else {
            if (ed.localUrl) URL.revokeObjectURL(ed.localUrl);
            ed.file = f; ed.localUrl = u; ed.localTipo = tipoDe(f);
            ed.hotspots_desktop = [];
            const info = document.getElementById('box-ed-file-info');
            if (info) info.textContent = `Novo arquivo: ${f.name} (${(f.size / 1048576).toFixed(1)} MB)` + (ed.id ? ' — as áreas clicáveis anteriores foram limpas.' : '');
            if (!ed.nome) { ed.nome = f.name.replace(/\.[^.]+$/, ''); const n = document.getElementById('box-ed-nome'); if (n) n.value = ed.nome; }
        }
        window._boxEdRenderTudo();
    };

    window._boxEdRemoverMobile = function () {
        ed.removerMobile = true; ed.fileMobile = null; ed.hotspots_mobile = [];
        if (ed.mobile_modo === 'arquivo') ed.mobile_modo = 'mesma';
        const sel = document.getElementById('box-ed-modo'); if (sel) sel.value = ed.mobile_modo;
        window._boxEdRenderTudo();
    };

    window._boxEdModo = function (v) {
        ed.mobile_modo = v;
        if (v !== 'mesma' || ed.view === 'mobile') { /* mantém a visão atual */ }
        window._boxEdRenderTudo();
    };

    window._boxEdProporcao = function (v) { ed.mobile_proporcao = v; window._boxEdRenderPreview(); };

    window._boxEdView = function (v) { ed.view = v === 'mobile' ? 'mobile' : 'desktop'; window._boxEdRenderPreview(); window._boxEdRenderHotLista(); };

    window._boxEdRenderFoco = function () {
        const el = document.getElementById('box-ed-foco');
        if (!el) return;
        const src = edSrcDesktop();
        if (!src) { el.innerHTML = '<div style="padding:1rem; color:#94a3b8; font-size:0.75rem; text-align:center; line-height:1.3;">Anexe a mídia do desktop para definir o foco.</div>'; return; }
        const media = edTipoDesktop() === 'video'
            ? `<video src="${esc(src)}#t=0.5" muted preload="metadata" style="width:100%; display:block; max-height:240px; object-fit:contain;"></video>`
            : `<img src="${esc(src)}" alt="" draggable="false" style="width:100%; display:block; max-height:240px; object-fit:contain;">`;
        el.innerHTML = media + `<div style="position:absolute; left:${ed.foco_x}%; top:${ed.foco_y}%; width:22px; height:22px; margin:-11px 0 0 -11px; border:3px solid #fff; border-radius:50%; box-shadow:0 0 0 2px #7048e8, 0 2px 6px rgba(0,0,0,0.5); pointer-events:none;"></div>`;
        el.onclick = (e) => {
            const m = el.querySelector('img, video');
            const r = (m || el).getBoundingClientRect();
            ed.foco_x = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
            ed.foco_y = Math.max(0, Math.min(100, Math.round((e.clientY - r.top) / r.height * 100)));
            window._boxEdRenderFoco();
            window._boxEdRenderPreview();
        };
    };

    function edBoxParaRender() {
        return {
            nome: ed.nome || 'Novo box',
            url: edSrcDesktop(), tipo: edTipoDesktop(),
            mobile_url: edSrcMobile(), mobile_tipo: edTipoMobile(),
            mobile_modo: ed.mobile_modo, mobile_proporcao: ed.mobile_proporcao, foco_x: ed.foco_x, foco_y: ed.foco_y,
            hotspots_desktop: ed.hotspots_desktop, hotspots_mobile: ed.hotspots_mobile
        };
    }

    window._boxEdRenderPreview = function () {
        const tog = document.getElementById('box-ed-toggle');
        if (tog) tog.innerHTML = togglePreviewHtml(ed.view, 'window._boxEdView');
        const prev = document.getElementById('box-ed-preview');
        if (!prev) return;
        const box = edBoxParaRender();
        let conteudo = '';
        let nota = '';
        if (!box.url) {
            conteudo = '';
        } else if (ed.view === 'mobile' && ed.mobile_modo === 'ocultar') {
            conteudo = '<div style="padding:2.2rem 1rem; text-align:center; color:#64748b; font-size:0.8rem;">Este box fica <b>oculto</b> no celular.</div>';
        } else if (ed.view === 'mobile' && ed.mobile_modo === 'arquivo' && !box.mobile_url) {
            conteudo = '<div style="padding:2.2rem 1rem; text-align:center; color:#b45309; font-size:0.8rem;">Anexe a imagem ou vídeo do celular.</div>';
        } else {
            // Mídia sem hotspots; a camada de desenho/overlay é montada em seguida
            const semHot = Object.assign({}, box, { hotspots_desktop: [], hotspots_mobile: [] });
            conteudo = window.boxRenderHtml(semHot, ed.view, { mostrarOculto: true });
        }
        if (ed.view === 'mobile' && ed.mobile_modo === 'mesma') nota = 'No celular, o box usa a mesma mídia e as mesmas áreas clicáveis do desktop (edite-as na visão Desktop).';
        if (ed.view === 'mobile' && ed.mobile_modo === 'recorte') nota = 'Quadro recortado: ajuste o ponto de foco e a proporção no painel à esquerda. Áreas clicáveis não se aplicam a mídia recortada.';
        prev.innerHTML = moldura(ed.view, conteudo, 'Anexe uma imagem ou vídeo para ver a pré-visualização.') +
            (nota ? `<div style="font-size:0.72rem; color:#475569; margin-top:8px; text-align:center;">${nota}</div>` : '');

        // Camada das áreas clicáveis (visíveis sempre; editável só quando permitido)
        const wrapper = prev.querySelector('div[style*="position:relative"][style*="line-height:0"]');
        if (!wrapper) return;
        const ativa = edHotAtiva();
        let listaMostrar = ativa;
        if (!listaMostrar && ed.view === 'mobile' && ed.mobile_modo === 'mesma' && edTipoDesktop() !== 'video') listaMostrar = ed.hotspots_desktop;
        if (!listaMostrar) return;
        const layer = document.createElement('div');
        layer.style.cssText = `position:absolute; inset:0; ${ativa ? 'cursor:crosshair; touch-action:none;' : 'pointer-events:none;'}`;
        layer.innerHTML = listaMostrar.map((h, i) =>
            `<div style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; border:2px dashed #f59e0b; background:rgba(245,158,11,0.22); pointer-events:none; box-sizing:border-box;">
                <span style="position:absolute; left:0; top:0; background:#f59e0b; color:#fff; font-size:0.62rem; font-weight:800; padding:0 5px; line-height:1.5;">${i + 1}</span></div>`
        ).join('');
        wrapper.appendChild(layer);
        if (ativa) attachDraw(layer, ativa);
    };

    function attachDraw(layer, lista) {
        let ini = null, temp = null;
        const pct = (e) => {
            const r = layer.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)),
                y: Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))
            };
        };
        layer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            layer.setPointerCapture(e.pointerId);
            ini = pct(e);
            temp = document.createElement('div');
            temp.style.cssText = 'position:absolute; border:2px solid #7048e8; background:rgba(112,72,232,0.2); pointer-events:none; box-sizing:border-box;';
            layer.appendChild(temp);
        });
        layer.addEventListener('pointermove', (e) => {
            if (!ini || !temp) return;
            const p = pct(e);
            temp.style.left = Math.min(ini.x, p.x) + '%'; temp.style.top = Math.min(ini.y, p.y) + '%';
            temp.style.width = Math.abs(p.x - ini.x) + '%'; temp.style.height = Math.abs(p.y - ini.y) + '%';
        });
        const fim = (e) => {
            if (!ini) return;
            const p = pct(e);
            const h = { x: Math.min(ini.x, p.x), y: Math.min(ini.y, p.y), w: Math.abs(p.x - ini.x), h: Math.abs(p.y - ini.y), url: '', titulo: '' };
            ini = null;
            if (temp) { temp.remove(); temp = null; }
            if (h.w < 1.5 || h.h < 1.5) return;
            ['x', 'y', 'w', 'h'].forEach(k => { h[k] = Math.round(h[k] * 100) / 100; });
            lista.push(h);
            window._boxEdRenderPreview();
            window._boxEdRenderHotLista(lista.length - 1);
        };
        layer.addEventListener('pointerup', fim);
        layer.addEventListener('pointercancel', () => { ini = null; if (temp) { temp.remove(); temp = null; } });
    }

    window._boxEdRenderHotLista = function (focarIdx) {
        const el = document.getElementById('box-ed-hot-lista');
        const ajuda = document.getElementById('box-ed-hot-ajuda');
        if (!el) return;
        const ativa = edHotAtiva();
        if (!ativa) {
            let msg = 'Áreas clicáveis estão disponíveis para imagens.';
            if (ed.view === 'mobile' && ed.mobile_modo === 'mesma') msg = 'No celular este box usa as mesmas áreas clicáveis do desktop. Troque para a visão Desktop para editá-las.';
            else if (ed.view === 'mobile' && ed.mobile_modo === 'recorte') msg = 'Mídia recortada não possui áreas clicáveis.';
            else if (ed.view === 'mobile' && ed.mobile_modo === 'ocultar') msg = 'Box oculto no celular.';
            else if (ed.view === 'mobile' && ed.mobile_modo === 'arquivo') msg = 'Anexe uma imagem para o celular para desenhar áreas clicáveis nela.';
            else if (edTipoDesktop() === 'video') msg = 'Áreas clicáveis não estão disponíveis para vídeo.';
            if (ajuda) ajuda.textContent = msg;
            el.innerHTML = '';
            return;
        }
        if (ajuda) ajuda.textContent = (ed.view === 'mobile' ? 'Visão CELULAR: ' : 'Visão DESKTOP: ') + 'arraste sobre a imagem na pré-visualização para desenhar uma área e informe o link. Ele abrirá em uma nova página.';
        if (!ativa.length) { el.innerHTML = '<div style="font-size:0.74rem; color:#a16207; font-style:italic;">Nenhuma área desenhada ainda.</div>'; return; }
        el.innerHTML = ativa.map((h, i) => `
            <div style="display:grid; grid-template-columns:24px 1.6fr 1fr 28px; gap:5px; align-items:center;">
                <span style="background:#f59e0b; color:#fff; font-weight:800; font-size:0.68rem; text-align:center; border-radius:5px; padding:4px 0;">${i + 1}</span>
                <input type="text" data-hot-url="${i}" value="${esc(h.url)}" placeholder="https://..." oninput="window._boxEdHot(${i}, 'url', this.value)" style="padding:5px 7px; border:1px solid #fcd34d; border-radius:6px; font-size:0.76rem; box-sizing:border-box; width:100%;">
                <input type="text" value="${esc(h.titulo)}" placeholder="Título (opcional)" oninput="window._boxEdHot(${i}, 'titulo', this.value)" style="padding:5px 7px; border:1px solid #fcd34d; border-radius:6px; font-size:0.76rem; box-sizing:border-box; width:100%;">
                <button onclick="window._boxEdHotExcluir(${i})" title="Excluir área" style="width:28px; height:28px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-trash"></i></button>
            </div>`).join('');
        if (focarIdx !== undefined) {
            const f = el.querySelector(`input[data-hot-url="${focarIdx}"]`);
            if (f) f.focus();
        }
    };

    window._boxEdHot = function (i, campo, valor) {
        const l = edHotAtiva();
        if (l && l[i]) l[i][campo] = valor;
    };

    window._boxEdHotExcluir = function (i) {
        const l = edHotAtiva();
        if (!l) return;
        l.splice(i, 1);
        window._boxEdRenderPreview();
        window._boxEdRenderHotLista();
    };

    window._boxEdSalvar = async function () {
        const nome = (ed.nome || '').trim();
        if (!nome) { alert('Informe o nome do box.'); document.getElementById('box-ed-nome')?.focus(); return; }
        if (!ed.id && !ed.file) { alert('Anexe a imagem ou o vídeo do box.'); return; }
        if (ed.mobile_modo === 'arquivo' && !ed.fileMobile && (!ed.mobile_url || ed.removerMobile)) {
            alert('Você escolheu "mídia própria para o celular". Anexe o arquivo do celular ou escolha outra opção.'); return;
        }
        const semUrl = (l) => (l || []).some(h => !String(h.url || '').trim());
        if (semUrl(ed.hotspots_desktop) || semUrl(ed.hotspots_mobile)) {
            alert('Informe o link de todas as áreas clicáveis ou exclua as áreas sem link.'); return;
        }
        const fd = new FormData();
        fd.append('nome', nome);
        fd.append('mobile_modo', ed.mobile_modo);
        fd.append('mobile_proporcao', ed.mobile_proporcao);
        fd.append('foco_x', String(ed.foco_x));
        fd.append('foco_y', String(ed.foco_y));
        fd.append('hotspots_desktop', JSON.stringify(ed.hotspots_desktop));
        fd.append('hotspots_mobile', JSON.stringify(ed.hotspots_mobile));
        if (ed.removerMobile) fd.append('remover_mobile', '1');
        if (ed.file) fd.append('arquivo', ed.file);
        if (ed.fileMobile) fd.append('arquivo_mobile', ed.fileMobile);

        const btn = document.getElementById('box-ed-btn-salvar');
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...'; }
        try {
            const r = ed.id ? await chamar('PUT', `/comercial/boxes/${ed.id}`, fd) : await chamar('POST', '/comercial/boxes', fd);
            if (!r || !r.success) { alert('Erro ao salvar o box: ' + ((r && r.error) || 'erro desconhecido')); return; }
            if (ed.localUrl) URL.revokeObjectURL(ed.localUrl);
            if (ed.localMobileUrl) URL.revokeObjectURL(ed.localMobileUrl);
            document.getElementById('box-editor-overlay')?.remove();
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('Box salvo com sucesso!');
            await window.carregarBoxes();
        } catch (e) {
            console.error(e);
            alert('Falha de comunicação com o servidor ao salvar o box.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        }
    };
})();
