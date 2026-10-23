// frontend/estoque_nf_vinculo.js
// Vincula peças marcadas como "Estoque" (Revisão / Corretiva) a produtos Automotivos do estoque,
// reaproveitando a nota fiscal JÁ anexada na revisão/manutenção (sem anexar de novo no Compras > Estoque).
// Usa os endpoints de Financeiro > Compras > Estoque:
//   POST /api/compras-estoque-notas                  (cadastra a NF - arquivo guardado no R2)
//   POST /api/compras-estoque-notas/:id/vincular     (vincula a NF aos produtos + histórico de compras)
//   POST /api/compras-estoque/:id/historico          (compra sem arquivo)
(function () {
    'use strict';

    const E = window.EstNF = { produtos: null, _carregando: null };
    const CATEGORIA = 'Automotivo';
    const DATALIST_ID = 'estnf-prod-list';

    const tok = () => window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const hojeISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    async function api(path, method, body) {
        const r = await fetch('/api' + path, {
            method: method || 'GET',
            headers: Object.assign({ Authorization: 'Bearer ' + tok() }, body ? { 'Content-Type': 'application/json' } : {}),
            body: body ? JSON.stringify(body) : undefined
        });
        let j = null;
        try { j = await r.json(); } catch (_) {}
        if (!r.ok) throw new Error((j && j.error) || ('Erro ' + r.status));
        return j;
    }

    // Rótulo exibido na lista (desambigua nomes repetidos com o código do produto)
    function rotulo(p, repetidos) { return repetidos[norm(p.nome)] > 1 ? (p.nome + ' · #' + p.id) : p.nome; }

    E._montarDatalist = function () {
        let dl = document.getElementById(DATALIST_ID);
        if (!dl) { dl = document.createElement('datalist'); dl.id = DATALIST_ID; document.body.appendChild(dl); }
        const lista = E.produtos || [];
        const rep = {};
        lista.forEach(p => { rep[norm(p.nome)] = (rep[norm(p.nome)] || 0) + 1; });
        E._rotulos = lista.map(p => ({ id: p.id, nome: p.nome, rotulo: rotulo(p, rep) }));
        dl.innerHTML = E._rotulos.map(x => '<option value="' + esc(x.rotulo) + '"></option>').join('');
    };

    // Carrega (uma vez) os produtos da categoria Automotivo
    E.carregar = function () {
        if (E.produtos) return Promise.resolve(E.produtos);
        if (E._carregando) return E._carregando;
        E._carregando = api('/estoque?categoria=' + encodeURIComponent(CATEGORIA)).then(function (lista) {
            E.produtos = (Array.isArray(lista) ? lista : []).sort(function (a, b) { return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true }); });
            E._montarDatalist();
            return E.produtos;
        }).catch(function (e) {
            E._carregando = null;
            console.warn('[EstNF] erro ao carregar peças do estoque:', e.message);
            return [];
        });
        return E._carregando;
    };

    // Texto digitado/escolhido -> produto { id, nome }
    E.resolver = function (texto) {
        const t = norm(texto);
        if (!t || !E._rotulos) return null;
        const exato = E._rotulos.find(x => norm(x.rotulo) === t || norm(x.nome) === t);
        if (exato) return exato;
        const parecidos = E._rotulos.filter(x => norm(x.rotulo).includes(t));
        return parecidos.length === 1 ? parecidos[0] : null;
    };

    // Campo de pesquisa das peças Automotivas (aparece quando a peça é marcada como "Estoque")
    // onchangeJs: código JS inline (opcional) executado ao escolher/alterar
    E.inputHtml = function (valor, onchangeJs, style) {
        E.carregar();
        return '<input type="text" data-k="estoque_prod" list="' + DATALIST_ID + '" autocomplete="off" value="' + esc(valor || '') + '" ' +
            'placeholder="Digite para buscar a peça Automotiva do estoque..." ' +
            'title="Escolha a peça do estoque para vincular a nota fiscal já anexada (sem anexar novamente)" ' +
            (onchangeJs ? 'onchange="' + onchangeJs + '" ' : '') +
            'style="' + (style || 'width:100%;padding:3px 6px;border:1px solid #c4b5fd;border-radius:6px;font-size:0.74rem;box-sizing:border-box;background:#fff;color:#5b21b6;') + '">';
    };

    // Grava o produto escolhido na linha (stage de revisão / corretiva)
    E.aplicarEscolha = function (linha, texto) {
        const p = E.resolver(texto);
        linha.estoque_id = p ? p.id : null;
        linha.estoque_nome = String(texto || '').trim();
        return p;
    };

    function parseData(txt) {
        const s = String(txt || '').trim();
        let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
        if (m) return m[1] + '-' + m[2] + '-' + m[3];
        m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
        if (m) return m[3] + '-' + m[2] + '-' + m[1];
        return hojeISO();
    }
    const lerArquivo = file => new Promise(function (resolve, reject) {
        const r = new FileReader();
        r.onload = function () { resolve(r.result); };
        r.onerror = function () { reject(new Error('Falha ao ler o arquivo da nota fiscal.')); };
        r.readAsDataURL(file);
    });

    // Junta linhas do mesmo produto (quantidade e total somados)
    function agrupar(itens) {
        const mapa = {};
        (itens || []).forEach(function (it) {
            const id = parseInt(it.estoque_id, 10);
            const total = Number(it.valor_total) || 0;
            if (!id || !(total > 0)) return;
            const qtd = Math.max(1, Math.round(Number(it.quantidade) || 1));
            if (!mapa[id]) mapa[id] = { estoque_id: id, quantidade: 0, total: 0 };
            mapa[id].quantidade += qtd;
            mapa[id].total += total;
        });
        return Object.keys(mapa).map(function (k) {
            const g = mapa[k];
            return { estoque_id: g.estoque_id, quantidade: g.quantidade, valor_unitario: Math.round((g.total / g.quantidade) * 100) / 100, total: g.total };
        });
    }

    // Registra a compra no estoque. Com arquivo: cadastra a NF (1 vez) e vincula aos produtos.
    // Sem arquivo: apenas registra a compra no histórico de cada produto.
    // Nunca lança exceção: o lançamento da revisão/manutenção já foi salvo; em caso de falha, avisa o usuário.
    E.vincular = async function (cfg) {
        const grupos = agrupar(cfg && cfg.itens);
        if (!grupos.length) return { n: 0 };
        const origem = cfg.origem || 'Manutenção';
        const numero = String(cfg.numero || '').trim();
        const fornecedor = String(cfg.fornecedor || '').trim();
        const dataISO = parseData(cfg.emissao);
        try {
            const arq = cfg.file || null;
            const extOk = arq && /\.(pdf|png|jpe?g|xml)$/i.test(arq.name || '');
            if (extOk) {
                const b64 = await lerArquivo(arq);
                const somaItens = grupos.reduce(function (t, g) { return t + g.total; }, 0);
                const nota = await api('/compras-estoque-notas', 'POST', {
                    numero: numero || ('S/N ' + dataISO),
                    fornecedor: fornecedor,
                    data_emissao: dataISO,
                    valor_total: Math.round(somaItens * 100) / 100,
                    observacoes: 'Lançada pela ' + origem + ' (vinculada automaticamente)',
                    arquivo_base64: b64,
                    nome_arquivo: arq.name
                });
                await api('/compras-estoque-notas/' + nota.id + '/vincular', 'POST', {
                    data_compra: dataISO,
                    itens: grupos.map(function (g) { return { estoque_id: g.estoque_id, quantidade: g.quantidade, valor_unitario: g.valor_unitario, garantia_meses: 0 }; })
                });
            } else {
                for (const g of grupos) {
                    await api('/compras-estoque/' + g.estoque_id + '/historico', 'POST', {
                        data_compra: dataISO,
                        quantidade: g.quantidade,
                        valor_unitario: g.valor_unitario,
                        fornecedor: fornecedor,
                        observacao: 'Origem: ' + origem + (numero ? ' — NF ' + numero : '')
                    });
                }
            }
            if (typeof mostrarToastAviso === 'function') {
                setTimeout(function () { mostrarToastAviso('\u2705 Nota fiscal vinculada ao estoque (' + grupos.length + ' peça' + (grupos.length === 1 ? '' : 's') + ')!'); }, 1600);
            }
            return { n: grupos.length };
        } catch (e) {
            alert('O lançamento foi salvo, mas não foi possível vincular a nota fiscal ao estoque:\n' + e.message + '\n\nVocê pode vincular depois em Financeiro > Compras > Estoque > Notas Fiscais.');
            return { n: 0, erro: e.message };
        }
    };

    // Atalho para os fluxos em etapas (Revisão e Corretiva): usa as linhas marcadas como Estoque
    E.vincularLinhas = function (st, origem) {
        if (!st) return Promise.resolve({ n: 0 });
        const itens = (st.lancs || []).filter(function (l) { return l.incluir && l.tipo === 'peca' && l.estoque && l.estoque_id; });
        return E.vincular({ file: st.file || null, numero: st.numero, fornecedor: st.fornecedor, emissao: '', itens: itens, origem: origem });
    };

    // Pré-carrega as peças ao abrir a tela (ajuda a lista aparecer imediatamente)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { E._montarDatalist(); });
})();
