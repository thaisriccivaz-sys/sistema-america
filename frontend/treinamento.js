// frontend/treinamento.js — Módulo de Materiais de Treinamento
// IDs alinhados com o index.html

(function () {
    'use strict';

    // ── Estado ───────────────────────────────────────────────────────────────
    let _cache = [];                  // lista de treinamentos
    let _treinAtual = null;           // treinamento aberto no modal de detalhe
    let _tabAtual = 'todos';          // aba ativa no modal de detalhe
    let _anexosCache = [];            // anexos do treinamento aberto

    // ── Helpers ──────────────────────────────────────────────────────────────
    function tok() {
        return window.currentToken
            || localStorage.getItem('erp_token')
            || localStorage.getItem('token')
            || '';
    }

    function api(path, opts = {}) {
        return fetch((window.API_URL || '') + path, {
            ...opts,
            headers: { Authorization: 'Bearer ' + tok(), ...(opts.headers || {}) }
        });
    }

    function cat(mime, nome) {
        const m = (mime || '').toLowerCase();
        const n = (nome || '').toLowerCase();
        if (m.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/.test(n)) return 'video';
        if (m === 'application/pdf' || n.endsWith('.pdf'))               return 'pdf';
        if (m.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/.test(n)) return 'imagem';
        return 'outro';
    }

    const CAT_LABEL = { video: '🎬 Vídeos', pdf: '📄 PDFs', imagem: '🖼️ Imagens', outro: '📎 Outros' };
    const CAT_COLOR = { video: '#0e7490', pdf: '#c2410c', imagem: '#7c3aed', outro: '#475569' };
    const CAT_BG    = { video: '#cffafe', pdf: '#ffedd5', imagem: '#ede9fe', outro: '#f1f5f9' };
    const CAT_ICON  = { video: 'ph-film-strip', pdf: 'ph-file-pdf', imagem: 'ph-image', outro: 'ph-paperclip' };

    function el(id) { return document.getElementById(id); }

    // ── RENDER LISTA (tabela principal) ──────────────────────────────────────
    window.renderTreinamentosTable = async function () {
        const tbody = el('treinamentos-tbody');
        const badge = el('treinamento-count-badge');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:1.5rem;animation:spin 1s linear infinite;"></i>
            <br>Carregando...</td></tr>`;

        try {
            const r = await api('/treinamentos');
            if (!r.ok) throw new Error('Erro ' + r.status);
            _cache = await r.json();

            const filtro = (el('filtro-treinamento-busca') || { value: '' }).value.toLowerCase();
            const lista  = filtro ? _cache.filter(t => t.nome.toLowerCase().includes(filtro)) : _cache;

            if (badge) badge.textContent = `${lista.length} treinamento${lista.length !== 1 ? 's' : ''}`;

            if (!lista.length) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:3rem;color:#94a3b8;">
                    <i class="ph ph-graduation-cap" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
                    Nenhum treinamento cadastrado ainda.</td></tr>`;
                return;
            }

            tbody.innerHTML = lista.map(t => _rowHtml(t)).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#ef4444;">
                <i class="ph ph-warning-circle"></i> ${e.message}</td></tr>`;
        }
    };

    function _rowHtml(t) {
        const anexos  = t.anexos || [];
        const videos  = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'video');
        const pdfs    = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'pdf');
        const imgs    = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'imagem');
        const outros  = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'outro');

        const pills = [
            videos.length  ? `<span style="background:#cffafe;color:#0e7490;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">🎬 ${videos.length}</span>` : '',
            pdfs.length    ? `<span style="background:#ffedd5;color:#c2410c;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">📄 ${pdfs.length}</span>` : '',
            imgs.length    ? `<span style="background:#ede9fe;color:#7c3aed;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">🖼️ ${imgs.length}</span>` : '',
            outros.length  ? `<span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">📎 ${outros.length}</span>` : '',
        ].filter(Boolean).join(' ');

        // Capa
        let capa = `<div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#0e7490,#06b6d4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="ph ph-graduation-cap" style="color:#fff;font-size:1.5rem;"></i></div>`;
        if (imgs.length) {
            capa = `<div style="width:56px;height:56px;border-radius:10px;overflow:hidden;flex-shrink:0;border:1px solid #e2e8f0;">
                <img src="${imgs[0].url_cloudinary}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>`;
        } else if (videos.length) {
            capa = `<div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#0e7490,#0891b2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="ph ph-film-slate" style="color:#fff;font-size:1.5rem;"></i></div>`;
        } else if (pdfs.length) {
            capa = `<div style="width:56px;height:56px;border-radius:10px;background:#fff7f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #fed7aa;">
                <i class="ph ph-file-pdf" style="color:#c2410c;font-size:1.5rem;"></i></div>`;
        }

        const data = t.criado_em ? new Date(t.criado_em).toLocaleDateString('pt-BR') : '—';
        const desc = t.descricao ? `<div style="font-size:0.77rem;color:#64748b;margin-top:1px;max-width:380px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.descricao}</div>` : '';
        const nomeSafe = (t.nome || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `<tr style="border-bottom:1px solid #f1f5f9;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding:0.85rem 1rem;">
                <div style="display:flex;align-items:center;gap:0.9rem;">
                    ${capa}
                    <div style="min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-weight:600;color:#0f172a;font-size:0.93rem;">${t.nome}</span>
                            <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">${t.departamento || 'Todos'}</span>
                        </div>
                        ${desc}
                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${pills || '<span style="color:#94a3b8;font-size:0.72rem;">Sem arquivos</span>'}</div>
                    </div>
                </div>
            </td>
            <td style="padding:0.85rem 1rem;color:#475569;font-size:0.85rem;white-space:nowrap;">${anexos.length} arquivo${anexos.length !== 1 ? 's' : ''}</td>
            <td style="padding:0.85rem 1rem;color:#64748b;font-size:0.82rem;white-space:nowrap;">${data}</td>
            <td style="padding:0.85rem 1rem;text-align:right;">
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                    <button onclick="window.abrirDetalheTreinamento(${t.id})"
                        style="background:#0e7490;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;transition:all .15s;"
                        onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#0e7490'">
                        <i class="ph ph-folder-open"></i> Abrir
                    </button>
                    <button onclick="window.abrirModalEditarTreinamento(${t.id})"
                        style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;transition:all .15s;"
                        onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'"
                        title="Editar nome e descrição">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button onclick="window.excluirTreinamento(${t.id},'${nomeSafe}')"
                        style="background:none;border:1.5px solid #fca5a5;color:#dc2626;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;"
                        onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }

    // ── MODAL: NOVO TREINAMENTO ───────────────────────────────────────────────
    window.abrirModalNovoTreinamento = function () {
        const f = el('form-novo-treinamento');
        if (f) f.reset();
        const m = el('modal-novo-treinamento');
        if (m) { m.style.display = 'flex'; }
        _carregarDepartamentosSelect('novo-treinamento-departamento', 'Todos');
        setTimeout(() => { const n = el('novo-treinamento-nome'); if (n) n.focus(); }, 80);
    };

    async function _carregarDepartamentosSelect(selectId, selecionado = 'Todos') {
        const select = el(selectId);
        if (!select) return;
        try {
            const r = await api('/departamentos');
            if (!r.ok) return;
            const deptos = await r.json();
            let html = `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;font-size:0.95rem;">
                    <input type="checkbox" value="Todos" class="depto-checkbox"> Todos os Departamentos
                </label>
            `;
            deptos.forEach(d => {
                html += `
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;font-size:0.95rem;">
                        <input type="checkbox" value="${d.nome}" class="depto-checkbox"> ${d.nome}
                    </label>
                `;
            });
            select.innerHTML = html;
            const selArray = (typeof selecionado === 'string' ? selecionado : 'Todos').split(',').map(s => s.trim());
            const checkboxes = select.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = selArray.includes(cb.value);
            });
        } catch(e) {}
    }

    window.fecharModalNovoTreinamento = function () {
        const m = el('modal-novo-treinamento');
        if (m) m.style.display = 'none';
    };

    window.salvarNovoTreinamento = async function (event) {
        if (event) event.preventDefault();
        const nome = (el('novo-treinamento-nome') || {}).value?.trim();
        const desc = (el('novo-treinamento-desc') || {}).value?.trim();
        const container = el('novo-treinamento-departamento');
        const checked = container ? Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];
        const departamento = checked.length > 0 ? checked.join(', ') : 'Todos';
        if (!nome) { alert('Informe o nome do treinamento.'); return; }

        const btn = el('form-novo-treinamento')?.querySelector('[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Criando...'; }

        try {
            const r = await api('/treinamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento })
            });
            if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao criar'); }
            window.fecharModalNovoTreinamento();
            await window.renderTreinamentosTable();
        } catch (e) {
            alert('Erro: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Criar Treinamento'; }
        }
    };

    // ── MODAL: DETALHE / ANEXOS ───────────────────────────────────────────────
    window.abrirDetalheTreinamento = async function (id) {
        _treinAtual = _cache.find(x => x.id === id) || { id };
        _tabAtual   = 'todos';

        el('detalhe-treinamento-nome').textContent = _treinAtual.nome || '';
        el('detalhe-treinamento-desc').textContent = _treinAtual.descricao || '';

        // Reseta file input e progress
        const fi = el('treinamento-file-input');
        if (fi) fi.value = '';
        _esconderProgress();

        const m = el('modal-detalhe-treinamento');
        if (m) m.style.display = 'flex';

        _resetTabs();
        await _carregarAnexos(id);
    };

    window.fecharModalDetalheTreinamento = function () {
        const m = el('modal-detalhe-treinamento');
        if (m) m.style.display = 'none';
        _treinAtual = null;
        _anexosCache = [];
    };

    // ── TABS DO MODAL ─────────────────────────────────────────────────────────
    window.switchTreinTab = function (tab) {
        _tabAtual = tab;
        _resetTabs();
        const btn = el('tab-trein-' + tab);
        if (btn) {
            btn.style.color        = '#0e7490';
            btn.style.fontWeight   = '700';
            btn.style.borderBottom = '3px solid #0e7490';
        }
        _renderGrid();
    };

    function _resetTabs() {
        ['todos', 'videos', 'pdfs', 'imagens', 'outros'].forEach(t => {
            const b = el('tab-trein-' + t);
            if (!b) return;
            b.style.color        = '#64748b';
            b.style.fontWeight   = '600';
            b.style.borderBottom = '3px solid transparent';
        });
    }

    // ── CARREGAR ANEXOS ───────────────────────────────────────────────────────
    async function _carregarAnexos(id) {
        const grid  = el('treinamento-anexos-grid');
        const vazio = el('treinamento-anexos-vazio');
        if (!grid) return;

        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:1.5rem;"></i><br>Carregando...</div>`;
        if (vazio) vazio.style.display = 'none';

        try {
            const r = await api('/treinamentos/' + id + '/anexos');
            if (!r.ok) throw new Error('Erro ' + r.status);
            _anexosCache = await r.json();
            _renderGrid();
        } catch (e) {
            grid.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;padding:1rem;">Erro: ${e.message}</div>`;
        }
    }

    function _renderGrid() {
        const grid  = el('treinamento-anexos-grid');
        const vazio = el('treinamento-anexos-vazio');
        if (!grid) return;

        const filtrado = _tabAtual === 'todos'
            ? _anexosCache
            : _tabAtual === 'videos'   ? _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'video')
            : _tabAtual === 'pdfs'     ? _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'pdf')
            : _tabAtual === 'imagens'  ? _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'imagem')
                                       : _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'outro');

        if (!filtrado.length) {
            grid.innerHTML = '';
            if (vazio) vazio.style.display = 'block';
            return;
        }
        if (vazio) vazio.style.display = 'none';
        grid.innerHTML = filtrado.map(a => _cardHtml(a)).join('');
    }

    function _cardHtml(a) {
        const c    = cat(a.tipo_mime, a.nome_arquivo);
        const url  = a.url_cloudinary || '';
        const nome = a.nome_arquivo || 'sem nome';
        const nomeSafe = nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const urlSafe  = url.replace(/'/g, "\\'");

        let preview = '';
        if (c === 'imagem') {
            preview = `<img src="${url}" alt="${nomeSafe}" loading="lazy"
                style="width:100%;height:120px;object-fit:cover;border-radius:10px 10px 0 0;display:block;cursor:zoom-in;"
                onclick="window.abrirLightbox('${urlSafe}','${nomeSafe}','imagem')">`;
        } else if (c === 'video') {
            preview = `<div onclick="window.abrirLightbox('${urlSafe}','${nomeSafe}','video')"
                style="width:100%;height:120px;background:linear-gradient(135deg,#0c4a6e,#0e7490);border-radius:10px 10px 0 0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
                <i class="ph ph-play-circle" style="color:#fff;font-size:3rem;transition:.2s;"
                    onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'"></i>
                <span style="color:#cffafe;font-size:0.65rem;margin-top:4px;opacity:0.85;">Reproduzir</span>
            </div>`;
        } else if (c === 'pdf') {
            preview = `<div onclick="window.open('${urlSafe}','_blank')"
                style="width:100%;height:120px;background:#fff7f0;border-radius:10px 10px 0 0;display:flex;flex-direction:column;
                align-items:center;justify-content:center;cursor:pointer;border-bottom:1px solid #fed7aa;">
                <i class="ph ph-file-pdf" style="color:#c2410c;font-size:3rem;"></i>
                <span style="color:#c2410c;font-size:0.65rem;margin-top:4px;font-weight:600;">Abrir PDF</span>
            </div>`;
        } else {
            preview = `<div onclick="window.open('${urlSafe}','_blank')"
                style="width:100%;height:120px;background:#f8fafc;border-radius:10px 10px 0 0;display:flex;flex-direction:column;
                align-items:center;justify-content:center;cursor:pointer;border-bottom:1px solid #e2e8f0;">
                <i class="ph ph-${CAT_ICON[c] || 'file'}" style="color:#64748b;font-size:2.5rem;"></i>
                <span style="color:#64748b;font-size:0.65rem;margin-top:4px;">Baixar</span>
            </div>`;
        }

        const treinId = _treinAtual?.id;

        return `<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;transition:box-shadow .15s;display:flex;flex-direction:column;"
            onmouseover="this.style.boxShadow='0 4px 18px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
            ${preview}
            <div style="padding:8px 10px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                <div style="font-size:0.74rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px;" title="${nomeSafe}">${nome}</div>
                <div style="display:flex;gap:4px;">
                    <button onclick="${c === 'video' ? `window.abrirLightbox('${urlSafe}','${nomeSafe}','video')` : `window.open('${urlSafe}','_blank')`}"
                        style="flex:1;background:#0e7490;color:#fff;border:none;border-radius:5px;padding:4px 0;font-size:0.72rem;cursor:pointer;
                        display:flex;align-items:center;justify-content:center;gap:3px;transition:.15s;"
                        onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#0e7490'">
                        <i class="ph ph-arrow-square-out"></i> Abrir
                    </button>
                    <button onclick="window.excluirAnexoTrein(${a.id},${treinId})"
                        style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:5px;padding:4px 8px;
                        font-size:0.72rem;cursor:pointer;display:flex;align-items:center;"
                        onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }

    // ── LIGHTBOX ──────────────────────────────────────────────────────────────
    window.abrirLightbox = function (url, nome, tipo) {
        const lb      = el('treinamento-lightbox');
        const content = el('treinamento-lightbox-content');
        const caption = el('treinamento-lightbox-caption');
        if (!lb || !content) return;

        content.innerHTML = tipo === 'video'
            ? `<video src="${url}" controls autoplay style="max-width:90vw;max-height:80vh;border-radius:8px;"></video>`
            : `<img src="${url}" alt="${nome}" style="max-width:90vw;max-height:80vh;border-radius:8px;object-fit:contain;">`;

        if (caption) caption.textContent = nome;
        lb.style.display = 'flex';
    };

    window.fecharTreinamentoLightbox = function () {
        const lb = el('treinamento-lightbox');
        if (!lb) return;
        lb.style.display = 'none';
        const content = el('treinamento-lightbox-content');
        if (content) content.innerHTML = ''; // Parar vídeo
    };

    // ── UPLOAD ────────────────────────────────────────────────────────────────
    window.handleTreinamentoFileChange = async function (event) {
        if (!_treinAtual) return;
        await _uploadFiles(event.target.files);
        event.target.value = '';
    };

    window.handleTreinamentoDrop = async function (event) {
        event.preventDefault();
        const dz = el('treinamento-dropzone');
        if (dz) { dz.style.background = '#f0fdfe'; dz.style.borderColor = '#0e7490'; }
        if (!_treinAtual) return;
        await _uploadFiles(event.dataTransfer.files);
    };

    async function _uploadFiles(files) {
        if (!files || !files.length) return;
        const MAX_MB = 500;
        for (const f of files) {
            if (f.size > MAX_MB * 1024 * 1024) {
                alert(`"${f.name}" excede ${MAX_MB}MB.`);
                return;
            }
        }

        _mostrarProgress(0, `Preparando ${files.length} arquivo(s)...`);

        let ok = 0;
        const total = files.length;
        for (const arquivo of files) {
            _mostrarProgress(Math.round((ok / total) * 100), `Enviando ${ok + 1} de ${total}: ${arquivo.name}`);
            const form = new FormData();
            form.append('arquivo', arquivo);
            try {
                const r = await api('/treinamentos/' + _treinAtual.id + '/anexos', { method: 'POST', body: form });
                if (!r.ok) {
                    const e = await r.json().catch(() => ({}));
                    throw new Error(e.error || 'Erro no upload');
                }
                ok++;
            } catch (e) {
                alert(`Erro ao enviar "${arquivo.name}": ${e.message}`);
            }
        }

        _mostrarProgress(100, `✅ ${ok} de ${total} arquivo(s) enviado(s)`);
        setTimeout(_esconderProgress, 3000);

        await _carregarAnexos(_treinAtual.id);
        await window.renderTreinamentosTable();
    }

    function _mostrarProgress(pct, texto) {
        const wrap = el('treinamento-upload-progress');
        const bar  = el('treinamento-progress-bar');
        const txt  = el('treinamento-progress-text');
        if (wrap) wrap.style.display = 'block';
        if (bar)  bar.style.width = pct + '%';
        if (txt)  txt.textContent = texto;
    }

    function _esconderProgress() {
        const wrap = el('treinamento-upload-progress');
        const bar  = el('treinamento-progress-bar');
        const txt  = el('treinamento-progress-text');
        if (wrap) wrap.style.display = 'none';
        if (bar)  bar.style.width = '0%';
        if (txt)  txt.textContent = '';
    }

    // ── EDITAR TREINAMENTO ────────────────────────────────────────────────────
    window.abrirModalEditarTreinamento = function (id) {
        const t = _cache.find(x => x.id === id);
        if (!t) return;

        el('editar-treinamento-id').value   = t.id;
        el('editar-treinamento-nome').value = t.nome || '';
        el('editar-treinamento-desc').value = t.descricao || '';
        _carregarDepartamentosSelect('editar-treinamento-departamento', t.departamento || 'Todos');

        const m = el('modal-editar-treinamento');
        if (m) m.style.display = 'flex';
        setTimeout(() => { const n = el('editar-treinamento-nome'); if (n) n.focus(); }, 80);
    };

    window.fecharModalEditarTreinamento = function () {
        const m = el('modal-editar-treinamento');
        if (m) m.style.display = 'none';
    };

    window.salvarEdicaoTreinamento = async function (event) {
        if (event) event.preventDefault();
        const id   = parseInt(el('editar-treinamento-id').value, 10);
        const nome = (el('editar-treinamento-nome') || {}).value?.trim();
        const desc = (el('editar-treinamento-desc') || {}).value?.trim();
        const deptSelect = el('editar-treinamento-departamento');
        const checked = deptSelect ? Array.from(deptSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];
        const departamento = checked.length > 0 ? checked.join(', ') : 'Todos';
        if (!nome) { alert('Informe o nome do treinamento.'); return; }

        const btn = el('btn-salvar-edicao-treinamento');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        try {
            const r = await api('/treinamentos/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento })
            });
            if (!r.ok) {
                const e = await r.json().catch(() => ({}));
                throw new Error(e.error || 'Erro ao salvar');
            }

            // Atualiza o cache local
            const idx = _cache.findIndex(x => x.id === id);
            if (idx !== -1) {
                _cache[idx].nome     = nome;
                _cache[idx].descricao = desc || '';
                _cache[idx].departamento = departamento;
            }

            // Se o modal de detalhe estiver aberto para este treinamento, atualiza o header
            if (_treinAtual && _treinAtual.id === id) {
                _treinAtual.nome      = nome;
                _treinAtual.descricao = desc || '';
                _treinAtual.departamento = departamento;
                const elNome = el('detalhe-treinamento-nome');
                const elDesc = el('detalhe-treinamento-desc');
                if (elNome) elNome.textContent = nome;
                if (elDesc) elDesc.textContent = desc || '';
            }

            window.fecharModalEditarTreinamento();
            await window.renderTreinamentosTable();
        } catch (e) {
            alert('Erro: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Salvar Altera\u00e7\u00f5es'; }
        }
    };

    // ── EXCLUIR TREINAMENTO ───────────────────────────────────────────────────
    window.excluirTreinamento = async function (id, nome) {
        if (!confirm(`Excluir o treinamento "${nome}" e TODOS os seus arquivos?\nEsta ação não pode ser desfeita.`)) return;
        try {
            const r = await api('/treinamentos/' + id, { method: 'DELETE' });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
            await window.renderTreinamentosTable();
        } catch (e) { alert('Erro: ' + e.message); }
    };

    // ── EXCLUIR ANEXO ─────────────────────────────────────────────────────────
    window.excluirAnexoTrein = async function (anexoId, treinId) {
        if (!confirm('Excluir este arquivo permanentemente?')) return;
        try {
            const r = await api('/treinamentos/' + treinId + '/anexos/' + anexoId, { method: 'DELETE' });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
            _anexosCache = _anexosCache.filter(a => a.id !== anexoId);
            _renderGrid();
            await window.renderTreinamentosTable();
        } catch (e) { alert('Erro: ' + e.message); }
    };

    // ── INIT (quando a view for aberta) ───────────────────────────────────────
    // O navigateTo('treinamento-materiais') carrega automaticamente se já existir hook
    // Também disponibilizamos para chamar manualmente
    window.initTreinamentoMateriais = function () {
        window.renderTreinamentosTable();
    };

    // CSS de spin inline para o ícone de loading
    if (!document.getElementById('trein-spin-style')) {
        const st = document.createElement('style');
        st.id = 'trein-spin-style';
        st.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(st);
    }

    console.log('[TREINAMENTO] Módulo v2 carregado.');
})();
