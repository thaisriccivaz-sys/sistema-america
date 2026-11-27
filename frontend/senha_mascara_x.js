/* ==========================================================================
 * Máscara Obrigatória de Senha em Ações / Exclusões (Padrão: xxxxxxxx)
 * - Sempre exibe os caracteres digitados como "x" (ex: "xxxxxxxx")
 * - NUNCA exibe a senha em texto aberto ao digitar
 * - NUNCA inclui botão de olho (ph-eye / ph-eye-slash) nem reveal nativo
 * ========================================================================== */
(function () {
    'use strict';

    function escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Retorna o valor real (não mascarado) digitado em um input com máscara "x".
     */
    window.obterValorRealSenhaX = function (inputElOrId) {
        const el = typeof inputElOrId === 'string'
            ? document.getElementById(inputElOrId)
            : inputElOrId;
        if (!el) return '';
        if (typeof el._realSenhaX === 'string') {
            return el._realSenhaX;
        }
        return String(el.value || '');
    };

    /**
     * Limpa ou redefine o valor real e visual ("xxx...") de um input com máscara "x".
     */
    window.definirValorRealSenhaX = function (inputElOrId, novoValorReal = '') {
        const el = typeof inputElOrId === 'string'
            ? document.getElementById(inputElOrId)
            : inputElOrId;
        if (!el) return;
        const real = String(novoValorReal || '');
        el._realSenhaX = real;
        el.value = 'x'.repeat(real.length);
    };

    /**
     * Aplica a máscara "xxxxxxxx" (sem mostrar caracteres e sem botão de olho)
     * em qualquer elemento <input>.
     */
    window.aplicarMascaraSenhaX = function (inputEl, valorInicial = undefined) {
        if (!inputEl || inputEl.tagName !== 'INPUT') return inputEl;
        if (inputEl.dataset.senhaXBound === '1') {
            if (valorInicial !== undefined) {
                window.definirValorRealSenhaX(inputEl, valorInicial);
            }
            return inputEl;
        }

        const inicial = valorInicial !== undefined
            ? String(valorInicial || '')
            : (typeof inputEl._realSenhaX === 'string' ? inputEl._realSenhaX : String(inputEl.value || ''));

        // Usa type="text" com autocomplete desligado para:
        // 1) Mostrar literalmente "xxxxxxxx" na tela (e não bolinhas nem texto real)
        // 2) Impedir qualquer ícone nativo de olho do navegador (Edge/Chrome ::-ms-reveal)
        try {
            if (inputEl.type !== 'text') inputEl.type = 'text';
        } catch (_) {}

        inputEl.setAttribute('data-senha-x', '1');
        inputEl.dataset.senhaXBound = '1';
        inputEl.setAttribute('autocomplete', 'off');
        inputEl.setAttribute('autocorrect', 'off');
        inputEl.setAttribute('autocapitalize', 'off');
        inputEl.setAttribute('spellcheck', 'false');
        inputEl.setAttribute('data-lpignore', 'true');
        inputEl.setAttribute('data-1p-ignore', 'true');
        inputEl.setAttribute('data-form-type', 'other');
        inputEl.style.textTransform = 'none';

        // Remove eventual botão de olho irmão se alguém tiver colocado por engano
        const parent = inputEl.parentElement;
        if (parent) {
            parent.querySelectorAll('.ph-eye, .ph-eye-slash').forEach(icon => {
                const btn = icon.closest('button') || icon;
                if (btn && btn !== inputEl) btn.style.display = 'none';
            });
        }

        inputEl._realSenhaX = inicial;
        inputEl.value = 'x'.repeat(inicial.length);

        let selBefore = { start: inicial.length, end: inicial.length };
        const salvarSelecao = () => {
            try {
                const s = typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : inputEl._realSenhaX.length;
                const e = typeof inputEl.selectionEnd === 'number' ? inputEl.selectionEnd : s;
                selBefore = { start: Math.max(0, s), end: Math.max(0, e) };
            } catch (_) {
                selBefore = { start: inputEl._realSenhaX.length, end: inputEl._realSenhaX.length };
            }
        };

        inputEl.addEventListener('keydown', (e) => {
            salvarSelecao();
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                e.preventDefault();
            }
        });
        inputEl.addEventListener('mousedown', salvarSelecao);
        inputEl.addEventListener('keyup', salvarSelecao);
        inputEl.addEventListener('select', salvarSelecao);
        inputEl.addEventListener('focus', salvarSelecao);

        inputEl.addEventListener('copy', (e) => e.preventDefault());
        inputEl.addEventListener('cut', (e) => e.preventDefault());

        inputEl.addEventListener('beforeinput', (e) => {
            salvarSelecao();
            const real = String(inputEl._realSenhaX || '');
            const start = Math.min(selBefore.start, real.length);
            const end = Math.min(Math.max(start, selBefore.end), real.length);
            const it = String(e.inputType || '');

            if (it === 'insertText' && typeof e.data === 'string') {
                e.preventDefault();
                const inserido = e.data;
                const novoReal = real.slice(0, start) + inserido + real.slice(end);
                const novoCursor = start + inserido.length;
                inputEl._realSenhaX = novoReal;
                inputEl.value = 'x'.repeat(novoReal.length);
                try { inputEl.setSelectionRange(novoCursor, novoCursor); } catch (_) {}
                selBefore = { start: novoCursor, end: novoCursor };
                inputEl.dispatchEvent(new Event('senha-x-change', { bubbles: true }));
                return;
            }

            if (it === 'insertFromPaste' || it === 'insertFromDrop') {
                e.preventDefault();
                const clip = (e.clipboardData || window.clipboardData);
                const textoColado = clip ? String(clip.getData('text') || '').replace(/[\r\n]+/g, '') : '';
                const novoReal = real.slice(0, start) + textoColado + real.slice(end);
                const novoCursor = start + textoColado.length;
                inputEl._realSenhaX = novoReal;
                inputEl.value = 'x'.repeat(novoReal.length);
                try { inputEl.setSelectionRange(novoCursor, novoCursor); } catch (_) {}
                selBefore = { start: novoCursor, end: novoCursor };
                inputEl.dispatchEvent(new Event('senha-x-change', { bubbles: true }));
                return;
            }

            if (it === 'deleteContentBackward') {
                e.preventDefault();
                let novoReal = real;
                let novoCursor = start;
                if (start !== end) {
                    novoReal = real.slice(0, start) + real.slice(end);
                    novoCursor = start;
                } else if (start > 0) {
                    novoReal = real.slice(0, start - 1) + real.slice(end);
                    novoCursor = start - 1;
                }
                inputEl._realSenhaX = novoReal;
                inputEl.value = 'x'.repeat(novoReal.length);
                try { inputEl.setSelectionRange(novoCursor, novoCursor); } catch (_) {}
                selBefore = { start: novoCursor, end: novoCursor };
                inputEl.dispatchEvent(new Event('senha-x-change', { bubbles: true }));
                return;
            }

            if (it === 'deleteContentForward') {
                e.preventDefault();
                let novoReal = real;
                let novoCursor = start;
                if (start !== end) {
                    novoReal = real.slice(0, start) + real.slice(end);
                    novoCursor = start;
                } else if (start < real.length) {
                    novoReal = real.slice(0, start) + real.slice(start + 1);
                    novoCursor = start;
                }
                inputEl._realSenhaX = novoReal;
                inputEl.value = 'x'.repeat(novoReal.length);
                try { inputEl.setSelectionRange(novoCursor, novoCursor); } catch (_) {}
                selBefore = { start: novoCursor, end: novoCursor };
                inputEl.dispatchEvent(new Event('senha-x-change', { bubbles: true }));
                return;
            }

            if (it === 'deleteByCut' || it.startsWith('deleteWord') || it.startsWith('deleteSoftLine') || it.startsWith('deleteHardLine')) {
                e.preventDefault();
                let novoReal = real;
                let novoCursor = start;
                if (start !== end) {
                    novoReal = real.slice(0, start) + real.slice(end);
                    novoCursor = start;
                } else {
                    novoReal = '';
                    novoCursor = 0;
                }
                inputEl._realSenhaX = novoReal;
                inputEl.value = 'x'.repeat(novoReal.length);
                try { inputEl.setSelectionRange(novoCursor, novoCursor); } catch (_) {}
                selBefore = { start: novoCursor, end: novoCursor };
                inputEl.dispatchEvent(new Event('senha-x-change', { bubbles: true }));
            }
        });

        // Fallback seguro para teclados móveis / IME / autofill inesperado
        inputEl.addEventListener('input', () => {
            const valVisivel = String(inputEl.value || '');
            const realAntigo = String(inputEl._realSenhaX || '');
            if (valVisivel === 'x'.repeat(realAntigo.length)) {
                salvarSelecao();
                return;
            }

            let cursor = valVisivel.length;
            try {
                if (typeof inputEl.selectionStart === 'number') cursor = inputEl.selectionStart;
            } catch (_) {}

            // Reconcilia qualquer diferença entre o texto visível e o estado anterior
            let prefixLen = 0;
            const minStart = Math.min(selBefore.start, realAntigo.length, valVisivel.length);
            while (prefixLen < minStart && valVisivel[prefixLen] === 'x') {
                prefixLen++;
            }

            const removidos = Math.max(0, selBefore.end - prefixLen);
            const deltaInserido = valVisivel.length - (realAntigo.length - removidos);
            let trechoNovo = '';
            if (deltaInserido > 0) {
                trechoNovo = valVisivel.slice(prefixLen, prefixLen + deltaInserido);
            }

            const novoReal = realAntigo.slice(0, prefixLen) + trechoNovo + realAntigo.slice(prefixLen + removidos);
            inputEl._realSenhaX = novoReal;
            inputEl.value = 'x'.repeat(novoReal.length);
            const posFinal = Math.min(Math.max(0, cursor), novoReal.length);
            try { inputEl.setSelectionRange(posFinal, posFinal); } catch (_) {}
            selBefore = { start: posFinal, end: posFinal };
        });

        return inputEl;
    };

    // Auto-inicializa qualquer <input data-senha-x="1"> inserido dinamicamente no DOM
    document.addEventListener('focusin', (e) => {
        const el = e.target;
        if (el && el.tagName === 'INPUT' && el.getAttribute('data-senha-x') === '1') {
            window.aplicarMascaraSenhaX(el);
        }
    }, true);

    /**
     * Abre modal padronizado solicitando senha de ação/exclusão com máscara "xxxxxxxx"
     * e SEM botão de olho.
     * Retorna Promise<string | null> (string digitada ou null se cancelado).
     */
    window.solicitarSenhaAcaoComMascaraX = async function (opcoes = {}) {
        const cfg = typeof opcoes === 'string'
            ? { mensagem: opcoes }
            : (opcoes || {});

        const titulo = cfg.titulo || 'Confirmação por Senha';
        const mensagem = cfg.mensagem || 'Digite a senha para autorizar esta ação:';
        const htmlExtra = cfg.htmlExtra || '';
        const placeholder = cfg.placeholder || 'Digite a senha...';
        const confirmText = cfg.confirmButtonText || 'Confirmar';
        const cancelText = cfg.cancelButtonText || 'Cancelar';
        const confirmColor = cfg.confirmButtonColor || '#dc2626';
        const obrigatoria = cfg.obrigatoria !== false;
        const msgObrigatoria = cfg.mensagemObrigatoria || 'Informe a senha para continuar.';
        const validador = typeof cfg.validar === 'function' ? cfg.validar : null;

        if (typeof Swal !== 'undefined' && typeof Swal.fire === 'function') {
            const inputId = 'swal-inp-senha-acao-x-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
            let senhaConfirmada = null;

            const res = await Swal.fire({
                title: titulo,
                icon: cfg.icon || 'warning',
                width: cfg.width || '440px',
                html: `
                    <div style="text-align:left; font-size:0.86rem; color:#334155; line-height:1.45; font-family:'Inter', sans-serif;">
                        ${htmlExtra || `<p style="margin:0 0 10px 0; color:#475569; white-space:pre-line;">${escHtml(mensagem)}</p>`}
                        <input type="text" id="${inputId}" data-senha-x="1"
                            placeholder="${escHtml(placeholder)}"
                            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                            style="width:100%; padding:0.6rem 0.75rem; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.92rem; box-sizing:border-box; outline:none; text-transform:none; font-family:'Inter', sans-serif; letter-spacing:0.04em;">
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText,
                confirmButtonColor: confirmColor,
                cancelButtonColor: '#64748b',
                focusConfirm: false,
                didOpen: () => {
                    const inp = document.getElementById(inputId);
                    if (inp) {
                        window.aplicarMascaraSenhaX(inp, '');
                        inp.focus();
                        inp.addEventListener('keydown', (ev) => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                Swal.clickConfirm();
                            }
                        });
                    }
                },
                preConfirm: async () => {
                    const inp = document.getElementById(inputId);
                    const real = window.obterValorRealSenhaX(inp);
                    if (obrigatoria && !String(real || '').trim()) {
                        Swal.showValidationMessage(msgObrigatoria);
                        return false;
                    }
                    if (validador) {
                        const erroOuOk = await validador(real);
                        if (typeof erroOuOk === 'string' && erroOuOk) {
                            Swal.showValidationMessage(erroOuOk);
                            return false;
                        }
                        if (erroOuOk === false) {
                            return false;
                        }
                    }
                    senhaConfirmada = real;
                    return true;
                }
            });

            if (!res || !res.isConfirmed) return null;
            return senhaConfirmada;
        }

        // Fallback leve em DOM puro caso SweetAlert2 não esteja carregado (nunca usa window.prompt!)
        return new Promise((resolve) => {
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:Inter,sans-serif;';
            ov.innerHTML = `
                <div style="background:#fff;border-radius:12px;width:92vw;max-width:390px;padding:1.25rem;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
                    <div style="font-weight:800;color:#0f172a;font-size:0.98rem;margin-bottom:0.45rem;">${escHtml(titulo)}</div>
                    <div style="font-size:0.84rem;color:#475569;margin-bottom:0.75rem;white-space:pre-line;">${escHtml(mensagem)}</div>
                    <input type="text" data-senha-x="1" placeholder="${escHtml(placeholder)}"
                        style="width:100%;padding:0.6rem 0.75rem;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.92rem;box-sizing:border-box;outline:none;text-transform:none;">
                    <div class="sx-err" style="display:none;color:#dc2626;font-size:0.76rem;font-weight:700;margin-top:6px;"></div>
                    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:1rem;">
                        <button type="button" class="sx-cancel" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:0.48rem 0.95rem;border-radius:8px;font-weight:700;cursor:pointer;">${escHtml(cancelText)}</button>
                        <button type="button" class="sx-ok" style="background:${escHtml(confirmColor)};color:#fff;border:none;padding:0.48rem 1.05rem;border-radius:8px;font-weight:700;cursor:pointer;">${escHtml(confirmText)}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(ov);
            const inp = ov.querySelector('input');
            const errEl = ov.querySelector('.sx-err');
            window.aplicarMascaraSenhaX(inp, '');
            const fechar = (v) => { ov.remove(); resolve(v); };
            ov.querySelector('.sx-cancel').onclick = () => fechar(null);
            const ok = async () => {
                const real = window.obterValorRealSenhaX(inp);
                if (obrigatoria && !String(real || '').trim()) {
                    errEl.textContent = msgObrigatoria;
                    errEl.style.display = 'block';
                    inp.focus();
                    return;
                }
                if (validador) {
                    const r = await validador(real);
                    if (typeof r === 'string' && r) {
                        errEl.textContent = r;
                        errEl.style.display = 'block';
                        inp.focus();
                        return;
                    }
                    if (r === false) return;
                }
                fechar(real);
            };
            ov.querySelector('.sx-ok').onclick = ok;
            inp.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') { ev.preventDefault(); ok(); }
                if (ev.key === 'Escape') { ev.preventDefault(); fechar(null); }
            });
            setTimeout(() => inp.focus(), 40);
        });
    };
})();
