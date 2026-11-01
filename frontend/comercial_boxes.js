/* ══════════════════════════════════════════════════════════════════════
   BOXES DE MÍDIA + QUADRO FIXO DE VALORES POR MODELO DE PROPOSTA
   - Biblioteca por Modelo de Proposta: anexar, renomear, subir/descer, excluir (arquivos no Cloudflare R2)
   - Box Fixo de Valores (tipo = 'quadro_evento') criado para cada Modelo de Proposta:
       • Todos criados inicialmente com o mesmo padrão do Quadro de Valores — Proposta Evento
       • Podem ser editados separadamente por modelo de proposta (título, rótulos, cor, visibilidade de campos)
   - Modelo Aditivo:
       • Segue automaticamente o modelo de proposta do contrato originário vinculado (Obra → Obra, Evento → Evento, etc.)
       • Imagens/vídeos incluídos dentro do modelo de Aditivo são exibidos abaixo do #2 Quadro de Valores — ... (Fixo)
         do modelo de proposta vinculado ao contrato (e mostrados também abaixo do #2 Quadro de Valores na visão do modelo)
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

    const fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDataIso = (d) => {
        const s = String(d || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
        return s;
    };
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    /* ── Lista de Modelos de Proposta e Configurações independentes de Quadro de Valores por Modelo ── */
    window.MODELOS_PROPOSTA_BOXES = [
        { codigo: 'EVENTO', nome: 'Proposta Evento', icone: 'ph-confetti' },
        { codigo: 'OBRA', nome: 'Proposta Obra', icone: 'ph-buildings' },
        { codigo: 'LIMPA FOSSA', nome: 'Proposta Limpa Fossa', icone: 'ph-drop' },
        { codigo: 'LOCAÇÃO CONTAINER', nome: 'Proposta Locação Container', icone: 'ph-cube' },
        { codigo: 'EQUIPAMENTOS', nome: 'Equipamentos', icone: 'ph-wrench' },
        { codigo: 'VENDA', nome: 'Proposta Venda', icone: 'ph-shopping-cart' },
        { codigo: 'VISITA TÉCNICA', nome: 'Visita Técnica', icone: 'ph-clipboard-text' },
        { codigo: 'ADITIVO', nome: 'Aditivo', icone: 'ph-file-plus' }
    ];

    /* Configuração individual do Quadro de Valores para cada Modelo de Proposta:
       Todos começam com o mesmo padrão criado para Proposta Evento, mas em objetos separados
       para permitir edição individual de cada modelo posteriormente. */
    window.CONFIG_QUADRO_POR_MODELO = {
        'EVENTO': {
            nome_quadro: 'Quadro de Valores — Proposta Evento (Fixo)',
            tipo_titulo: 'EVENTO',
            info_rotulo: 'EVENTO:',
            cor_primaria: '#7b4195',
            cor_rotulo_valor_total: '#3b3b3b',
            ocultar_nome_evento: false,
            ocultar_data_fim: false,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-evento.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'OBRA': {
            nome_quadro: 'Quadro de Valores — Proposta Obra (Fixo)',
            tipo_titulo: 'OBRA MENSAL',
            info_rotulo: 'DA OBRA:',
            cor_primaria: '#1e5782',
            cor_rotulo_valor_total: '#1e5782',
            ocultar_nome_evento: true,
            ocultar_data_fim: true,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-obra.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'OBRA MENSAL': {
            nome_quadro: 'Quadro de Valores — Proposta Obra Mensal (Fixo)',
            tipo_titulo: 'OBRA MENSAL',
            info_rotulo: 'DA OBRA:',
            cor_primaria: '#1e5782',
            cor_rotulo_valor_total: '#1e5782',
            ocultar_nome_evento: true,
            ocultar_data_fim: true,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-obra.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'OBRA QUINZENAL': {
            nome_quadro: 'Quadro de Valores — Proposta Obra Quinzenal (Fixo)',
            tipo_titulo: 'OBRA QUINZENAL',
            info_rotulo: 'DA OBRA:',
            cor_primaria: '#1e5782',
            cor_rotulo_valor_total: '#1e5782',
            ocultar_nome_evento: true,
            ocultar_data_fim: true,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-obra.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'OBRA SEMANAL': {
            nome_quadro: 'Quadro de Valores — Proposta Obra Semanal (Fixo)',
            tipo_titulo: 'OBRA SEMANAL',
            info_rotulo: 'DA OBRA:',
            cor_primaria: '#1e5782',
            cor_rotulo_valor_total: '#1e5782',
            ocultar_nome_evento: true,
            ocultar_data_fim: true,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-obra.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'LIMPA FOSSA': {
            nome_quadro: 'Quadro de Valores — Proposta Limpa Fossa (Fixo)',
            tipo_titulo: 'LIMPA FOSSA',
            info_rotulo: 'DA FOSSA:',
            rotulo_instalacao: 'ENDEREÇO:',
            cor_primaria: '#1e5782',
            cor_rotulo_valor_total: '#1e5782',
            ocultar_nome_evento: true,
            ocultar_data_fim: true,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-obra.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'LIMPA FOSSA MENSAL': {
            nome_quadro: 'Quadro de Valores — Proposta Limpa Fossa Mensal (Fixo)',
            tipo_titulo: 'LIMPA FOSSA MENSAL',
            info_rotulo: 'DA FOSSA:',
            rotulo_instalacao: 'ENDEREÇO:',
            cor_primaria: '#1e5782',
            cor_rotulo_valor_total: '#1e5782',
            ocultar_nome_evento: true,
            ocultar_data_fim: true,
            mostrar_condicoes_topo: true,
            mostrar_faixa_valores_contemplados: true,
            faixa_valores_img: '/assets/faixa-valores-contemplados-obra.png?v=20261101v8',
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'LOCAÇÃO CONTAINER': {
            nome_quadro: 'Quadro de Valores — Proposta Locação Container (Fixo)',
            tipo_titulo: 'LOCAÇÃO CONTAINER',
            info_rotulo: 'EVENTO:',
            cor_primaria: '#7b4195',
            ocultar_nome_evento: false,
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'EQUIPAMENTOS': {
            nome_quadro: 'Quadro de Valores — Equipamentos (Fixo)',
            tipo_titulo: 'EQUIPAMENTOS',
            info_rotulo: 'EVENTO:',
            cor_primaria: '#7b4195',
            ocultar_nome_evento: false,
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'VENDA': {
            nome_quadro: 'Quadro de Valores — Proposta Venda (Fixo)',
            tipo_titulo: 'VENDA',
            info_rotulo: 'EVENTO:',
            cor_primaria: '#7b4195',
            ocultar_nome_evento: false,
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'VISITA TÉCNICA': {
            nome_quadro: 'Quadro de Valores — Visita Técnica (Fixo)',
            tipo_titulo: 'VISITA TÉCNICA',
            info_rotulo: 'EVENTO:',
            cor_primaria: '#7b4195',
            ocultar_nome_evento: false,
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        },
        'AVARIA': {
            nome_quadro: 'Quadro de Valores — Proposta Avaria (Fixo)',
            tipo_titulo: 'AVARIA',
            info_rotulo: 'EVENTO:',
            cor_primaria: '#7b4195',
            ocultar_nome_evento: false,
            mostrar_dias_evento_item: true,
            titulo_equipamentos: 'EQUIPAMENTOS:',
            titulo_servicos: 'SERVIÇOS:'
        }
    };

    window.normalizarModeloTipoBox = function (raw) {
        const s = String(raw || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        if (!s) return 'EVENTO';
        if (s === 'ADTIVO' || s === 'ADITIVO') return 'ADITIVO';
        if (s.includes('LOCACAO CONTAINER') || s.includes('LOCAÇÃO CONTAINER')) return 'LOCAÇÃO CONTAINER';
        if (s.includes('VISITA TECNICA') || s.includes('VISITA TÉCNICA')) return 'VISITA TÉCNICA';
        if (s.includes('OBRA')) return 'OBRA';
        if (s.includes('FOSSA')) return 'LIMPA FOSSA';
        if (window.CONFIG_QUADRO_POR_MODELO[s]) return s;
        return 'EVENTO';
    };

    function extrairSubtituloLimpaFossaTextoBox(raw) {
        const s = String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        if (!s || !s.includes('FOSSA')) return '';
        if (s.includes('MENS')) return 'LIMPA FOSSA MENSAL';
        return 'LIMPA FOSSA';
    }

    window.resolverSubtituloLimpaFossaProposta = function (propostaObj, rawHint) {
        const p = propostaObj || {};
        const direto = extrairSubtituloLimpaFossaTextoBox(p.tipo) || extrairSubtituloLimpaFossaTextoBox(rawHint);
        if (direto) return direto;
        const inpContrato = document.getElementById('prop-contrato-aditivo');
        const subVinc = extrairSubtituloLimpaFossaTextoBox(p.contrato_vinculado_tipo) || extrairSubtituloLimpaFossaTextoBox(inpContrato?.getAttribute('data-contrato-tipo'));
        if (subVinc) return subVinc;
        const numVinc = String(p.contrato_vinculado || inpContrato?.value || '').trim();
        const idVinc = Number(p.contrato_vinculado_id || inpContrato?.getAttribute('data-contrato-id') || 0);
        const todasProps = (window._boxCacheDadosAux && Array.isArray(window._boxCacheDadosAux.propostasTodas))
            ? window._boxCacheDadosAux.propostasTodas
            : (typeof _propostasData !== 'undefined' && Array.isArray(_propostasData) ? _propostasData : []);
        if ((numVinc || idVinc) && todasProps.length) {
            const orig = todasProps.find(x => {
                const t = window.normalizarModeloTipoBox(x.tipo);
                if (t === 'ADITIVO') return false;
                if (idVinc && Number(x.id) === idVinc) return true;
                if (numVinc && (String(x.contrato || '').trim() === numVinc || String(x.codigo || '').trim() === numVinc)) return true;
                return false;
            });
            const subOrig = orig ? (extrairSubtituloLimpaFossaTextoBox(orig.tipo) || extrairSubtituloLimpaFossaTextoBox(orig.tabela_precos)) : '';
            if (subOrig) return subOrig;
        }
        const subTab = extrairSubtituloLimpaFossaTextoBox(p.tabela_precos) || extrairSubtituloLimpaFossaTextoBox(document.getElementById('prop-tabela')?.value) || extrairSubtituloLimpaFossaTextoBox(document.getElementById('prop-tipo')?.value);
        if (subTab) return subTab;
        return 'LIMPA FOSSA';
    };

    /* Extrai o subtítulo exato da Obra ('OBRA MENSAL', 'OBRA QUINZENAL' ou 'OBRA SEMANAL') para exibir no topo do Quadro de Valores */
    function extrairSubtituloObraTextoBox(raw) {
        const s = String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        if (!s) return '';
        if (s.includes('QUINZ')) return 'OBRA QUINZENAL';
        if (s.includes('SEMAN')) return 'OBRA SEMANAL';
        if (s.includes('MENS')) return 'OBRA MENSAL';
        return '';
    }

    window.resolverSubtituloObraProposta = function (propostaObj, rawHint) {
        const p = propostaObj || {};
        const direto = extrairSubtituloObraTextoBox(p.tipo) || extrairSubtituloObraTextoBox(rawHint);
        if (direto) return direto;
        const inpContrato = document.getElementById('prop-contrato-aditivo');
        const subVinc = extrairSubtituloObraTextoBox(p.contrato_vinculado_tipo) || extrairSubtituloObraTextoBox(inpContrato?.getAttribute('data-contrato-tipo'));
        if (subVinc) return subVinc;
        const numVinc = String(p.contrato_vinculado || inpContrato?.value || '').trim();
        const idVinc = Number(p.contrato_vinculado_id || inpContrato?.getAttribute('data-contrato-id') || 0);
        const todasProps = (window._boxCacheDadosAux && Array.isArray(window._boxCacheDadosAux.propostasTodas))
            ? window._boxCacheDadosAux.propostasTodas
            : (typeof _propostasData !== 'undefined' && Array.isArray(_propostasData) ? _propostasData : []);
        if ((numVinc || idVinc) && todasProps.length) {
            const orig = todasProps.find(x => {
                const t = window.normalizarModeloTipoBox(x.tipo);
                if (t === 'ADITIVO') return false;
                if (idVinc && Number(x.id) === idVinc) return true;
                if (numVinc && (String(x.contrato || '').trim() === numVinc || String(x.codigo || '').trim() === numVinc)) return true;
                return false;
            });
            const subOrig = orig ? (extrairSubtituloObraTextoBox(orig.tipo) || extrairSubtituloObraTextoBox(orig.tabela_precos)) : '';
            if (subOrig) return subOrig;
        }
        const subTab = extrairSubtituloObraTextoBox(p.tabela_precos) || extrairSubtituloObraTextoBox(document.getElementById('prop-tabela')?.value) || extrairSubtituloObraTextoBox(document.getElementById('prop-tipo')?.value);
        if (subTab) return subTab;
        return 'OBRA MENSAL';
    };

    /* Resolve qual é o modelo da proposta do contrato originário vinculado a uma proposta ADITIVO */
    window.resolverModeloOrigemAditivo = function (propostaObj) {
        const p = propostaObj || {};
        if (p.contrato_vinculado_tipo) {
            const m = window.normalizarModeloTipoBox(p.contrato_vinculado_tipo);
            if (m && m !== 'ADITIVO') return m;
        }
        const inpContrato = document.getElementById('prop-contrato-aditivo');
        const tipoAttr = inpContrato?.getAttribute('data-contrato-tipo') || '';
        if (tipoAttr) {
            const m = window.normalizarModeloTipoBox(tipoAttr);
            if (m && m !== 'ADITIVO') return m;
        }
        const numVinc = String(p.contrato_vinculado || inpContrato?.value || '').trim();
        const idVinc = Number(p.contrato_vinculado_id || inpContrato?.getAttribute('data-contrato-id') || 0);
        const todasProps = (window._boxCacheDadosAux && Array.isArray(window._boxCacheDadosAux.propostasTodas))
            ? window._boxCacheDadosAux.propostasTodas
            : (typeof _propostasData !== 'undefined' && Array.isArray(_propostasData) ? _propostasData : []);
        if ((numVinc || idVinc) && todasProps.length) {
            const orig = todasProps.find(x => {
                const t = window.normalizarModeloTipoBox(x.tipo);
                if (t === 'ADITIVO') return false;
                if (idVinc && Number(x.id) === idVinc) return true;
                if (numVinc && (String(x.contrato || '').trim() === numVinc || String(x.codigo || '').trim() === numVinc)) return true;
                return false;
            });
            if (orig && orig.tipo) {
                const m = window.normalizarModeloTipoBox(orig.tipo);
                if (m && m !== 'ADITIVO') return m;
            }
        }
        const tabPrecos = String(p.tabela_precos || document.getElementById('prop-tabela')?.value || '').trim();
        if (tabPrecos) {
            const mTab = window.normalizarModeloTipoBox(tabPrecos);
            if (mTab && mTab !== 'ADITIVO') return mTab;
        }
        return window._boxesModeloBaseAditivo || 'EVENTO';
    };

    window.obterConfigQuadroModelo = function (modeloRaw, configBoxExtra) {
        const mod = window.normalizarModeloTipoBox(modeloRaw);
        const modEfetivo = mod === 'ADITIVO' ? window.resolverModeloOrigemAditivo() : mod;
        const base = window.CONFIG_QUADRO_POR_MODELO[modEfetivo] || window.CONFIG_QUADRO_POR_MODELO['EVENTO'];
        const extra = Object.assign({}, configBoxExtra || {});
        if (modEfetivo === 'OBRA' || modEfetivo === 'OBRA MENSAL' || modEfetivo === 'OBRA QUINZENAL' || modEfetivo === 'OBRA SEMANAL') {
            const rotUp = String(extra.info_rotulo || '').trim().toUpperCase();
            if (!rotUp || rotUp === 'EVENTO:' || rotUp === 'OBRA:') {
                extra.info_rotulo = 'DA OBRA:';
            }
            if (!extra.cor_primaria || String(extra.cor_primaria).toLowerCase() === '#7b4195') {
                delete extra.cor_primaria;
            }
            const subHint = extrairSubtituloObraTextoBox(modeloRaw);
            if (subHint) {
                extra.tipo_titulo = subHint;
            } else if (!extra.tipo_titulo || String(extra.tipo_titulo).toUpperCase() === 'OBRA') {
                extra.tipo_titulo = 'OBRA MENSAL';
            }
            extra.ocultar_nome_evento = true;
            extra.ocultar_data_fim = true;
            extra.mostrar_condicoes_topo = true;
            extra.mostrar_faixa_valores_contemplados = true;
            extra.faixa_valores_img = '/assets/faixa-valores-contemplados-obra.png?v=20261101v8';
        } else if (modEfetivo === 'LIMPA FOSSA' || modEfetivo === 'LIMPA FOSSA MENSAL') {
            extra.info_rotulo = 'DA FOSSA:';
            extra.rotulo_instalacao = 'ENDEREÇO:';
            if (!extra.cor_primaria || String(extra.cor_primaria).toLowerCase() === '#7b4195') {
                delete extra.cor_primaria;
            }
            const subFossa = extrairSubtituloLimpaFossaTextoBox(modeloRaw);
            if (subFossa) extra.tipo_titulo = subFossa;
            extra.ocultar_nome_evento = true;
            extra.ocultar_data_fim = true;
            extra.mostrar_condicoes_topo = true;
            extra.mostrar_faixa_valores_contemplados = true;
            extra.faixa_valores_img = '/assets/faixa-valores-contemplados-obra.png?v=20261101v8';
        }
        return Object.assign({}, base, extra);
    };

    /* Cache leve de clientes, contatos, endereços e equipamentos para enriquecer o Quadro Fixo */
    window._boxCacheDadosAux = { carregado: false, clientes: [], contatos: [], enderecos: [], equipamentos: [], propostasEvento: [], propostasTodas: [] };
    window._boxPropostaPreviewId = 'auto';
    window._boxesModeloAtivo = 'EVENTO';
    window._boxesModeloBaseAditivo = 'EVENTO';
    window._boxesAditivoCache = [];

    window.carregarCacheDadosQuadroEvento = async function (forcar) {
        const c = window._boxCacheDadosAux;
        if (c.carregado && !forcar) return c;
        try {
            const [clientes, contatos, enderecos, equipamentos, propostas] = await Promise.all([
                typeof apiGet === 'function' ? apiGet('/clientes').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/contatos').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/enderecos-entrega').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/estoque-equipamentos').catch(() => []) : [],
                typeof apiGet === 'function' ? apiGet('/propostas').catch(() => []) : []
            ]);
            c.clientes = Array.isArray(clientes) ? clientes : [];
            c.contatos = Array.isArray(contatos) ? contatos : [];
            c.enderecos = Array.isArray(enderecos) ? enderecos : [];
            c.equipamentos = Array.isArray(equipamentos) ? equipamentos : [];
            c.propostasTodas = Array.isArray(propostas) ? propostas : [];
            c.propostasEvento = c.propostasTodas.filter(p =>
                norm(String(p.tipo || '').replace(/^proposta\s+/i, '')) === 'evento'
            );
            c.carregado = true;
        } catch (e) {
            console.warn('[BOXES] Aviso ao carregar cache auxiliar:', e);
        }
        return c;
    };

    /* Busca a "Descrição para Proposta" no cadastro do equipamento pelo código ou nome */
    window.obterDescricaoPropostaEquipamento = function (itemOuProd) {
        if (!itemOuProd) return '';
        if (itemOuProd.descricao_proposta && String(itemOuProd.descricao_proposta).trim()) {
            return String(itemOuProd.descricao_proposta).trim();
        }
        const lista = (window._boxCacheDadosAux && window._boxCacheDadosAux.equipamentos.length)
            ? window._boxCacheDadosAux.equipamentos
            : (window._equipamentosEstoqueData || []);
        const cod = norm(itemOuProd.codigo);
        const nome = norm(String(itemOuProd.produto || itemOuProd.descricao || itemOuProd.nome || '').replace(/^\d+\s*-\s*/, ''));
        const achado = lista.find(eq =>
            (cod && cod !== '—' && norm(eq.codigo) === cod) ||
            (nome && norm(eq.nome) === nome)
        );
        if (!achado) return '';
        return String(achado.descricao_proposta || achado.especificacao_tecnica || '').trim();
    };

    /* Busca a Foto do Equipamento no cadastro pelo código ou nome */
    window.obterFotoPropostaEquipamento = function (itemOuProd) {
        if (!itemOuProd) return '';
        if (itemOuProd.foto_url && String(itemOuProd.foto_url).trim()) {
            return String(itemOuProd.foto_url).trim();
        }
        const lista = (window._boxCacheDadosAux && window._boxCacheDadosAux.equipamentos.length)
            ? window._boxCacheDadosAux.equipamentos
            : (window._equipamentosEstoqueData || []);
        const cod = norm(itemOuProd.codigo);
        const nome = norm(String(itemOuProd.produto || itemOuProd.descricao || itemOuProd.nome || '').replace(/^\d+\s*-\s*/, ''));
        const achado = lista.find(eq =>
            (cod && cod !== '—' && norm(eq.codigo) === cod) ||
            (nome && norm(eq.nome) === nome)
        );
        if (!achado) return '';
        if (achado.foto_url && String(achado.foto_url).trim()) return String(achado.foto_url).trim();
        if (achado.r2_key && achado.id) return '/api/public/equipamento-foto/' + achado.id;
        return '';
    };

    /* Busca o Link do Equipamento no cadastro pelo código ou nome */
    window.obterLinkPropostaEquipamento = function (itemOuProd) {
        const normalizarUrl = (u) => {
            const raw = String(u || '').trim();
            if (!raw) return '';
            if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
            return 'https://' + raw;
        };
        if (!itemOuProd) return '';
        if (itemOuProd.link_url && String(itemOuProd.link_url).trim()) {
            return normalizarUrl(itemOuProd.link_url);
        }
        const lista = (window._boxCacheDadosAux && window._boxCacheDadosAux.equipamentos.length)
            ? window._boxCacheDadosAux.equipamentos
            : (window._equipamentosEstoqueData || []);
        const cod = norm(itemOuProd.codigo);
        const nome = norm(String(itemOuProd.produto || itemOuProd.descricao || itemOuProd.nome || '').replace(/^\d+\s*-\s*/, ''));
        const achado = lista.find(eq =>
            (cod && cod !== '—' && norm(eq.codigo) === cod) ||
            (nome && norm(eq.nome) === nome)
        );
        if (!achado || !achado.link_url) return '';
        return normalizarUrl(achado.link_url);
    };

    function formatarNumeroPropostaSequencial(codigoRaw, contratoRaw, idRaw) {
        const cand = String(codigoRaw || '').trim();
        if (/^\d+$/.test(cand)) return String(parseInt(cand, 10)).padStart(2, '0');
        const mPr = cand.match(/^(?:PR|CT)\d{4}\/?0*(\d+)$/i);
        if (mPr) return String(parseInt(mPr[1], 10)).padStart(2, '0');
        const cont = String(contratoRaw || '').trim();
        const mCt = cont.match(/^(?:PR|CT)\d{4}\/?0*(\d+)$/i);
        if (mCt) return String(parseInt(mCt[1], 10)).padStart(2, '0');
        if (idRaw && /^\d+$/.test(String(idRaw))) return String(parseInt(idRaw, 10)).padStart(2, '0');
        return (cand && cand.toUpperCase() !== 'AUTO') ? cand : '01';
    }

    function gerarDatasIntervaloIsoBox(iniIso, fimIso) {
        const ini = String(iniIso || '').trim().slice(0, 10);
        const fim = String(fimIso || '').trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || ini > fim) return [];
        const out = [];
        const cur = new Date(ini + 'T12:00:00Z');
        const end = new Date(fim + 'T12:00:00Z');
        let guard = 0;
        while (cur <= end && guard < 730) {
            out.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
            guard++;
        }
        return out;
    }

    function calcularResumoDiariasRodape(proposta, itensRaw) {
        const datasSet = new Set();
        let flagManutDiaria = Boolean(proposta && proposta.manutencao_diaria);
        const extrairDataIso = (entry) => {
            if (!entry) return '';
            if (typeof entry === 'object') return String(entry.data || entry.dia || '').trim().slice(0, 10);
            return String(entry).trim().split(/[\sT]+/)[0].slice(0, 10);
        };
        (Array.isArray(itensRaw) ? itensRaw : []).forEach(it => {
            if (it && it.manutencao_diaria) flagManutDiaria = true;
            const arr = Array.isArray(it && it.dias_evento) ? it.dias_evento : [];
            arr.forEach(d => {
                const iso = extrairDataIso(d);
                if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) datasSet.add(iso);
            });
        });
        if (datasSet.size === 0 && proposta && proposta.dias_evento) {
            let arrProp = [];
            if (Array.isArray(proposta.dias_evento)) arrProp = proposta.dias_evento;
            else {
                try {
                    const p = JSON.parse(proposta.dias_evento);
                    arrProp = Array.isArray(p) ? p : String(proposta.dias_evento).split(',');
                } catch (e) {
                    arrProp = String(proposta.dias_evento).split(',');
                }
            }
            arrProp.forEach(d => {
                const iso = extrairDataIso(d);
                if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) datasSet.add(iso);
            });
        }
        const datasOrdenadas = [...datasSet].sort();
        if (proposta && proposta.periodo_inicio && proposta.periodo_fim && datasOrdenadas.length > 0) {
            const todasPeriodo = gerarDatasIntervaloIsoBox(proposta.periodo_inicio, proposta.periodo_fim);
            if (todasPeriodo.length > 0 && todasPeriodo.length === datasOrdenadas.length && todasPeriodo.every((d, i) => datasOrdenadas[i] === d)) {
                flagManutDiaria = true;
            }
        }
        if (flagManutDiaria) return 'MANUTENÇÃO DIÁRIA';
        if (datasOrdenadas.length === 0) return '';
        return datasOrdenadas.map(iso => fmtDataIso(iso)).join(', ');
    }

    function formatarDiasEventoProdutoCurto(it, proposta) {
        let diasArr = Array.isArray(it && it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
        if (diasArr.length === 0 && proposta && proposta.dias_evento) {
            if (Array.isArray(proposta.dias_evento)) diasArr = proposta.dias_evento.filter(Boolean);
            else {
                try {
                    const p = JSON.parse(proposta.dias_evento);
                    diasArr = Array.isArray(p) ? p.filter(Boolean) : String(proposta.dias_evento).split(',');
                } catch (e) {
                    diasArr = String(proposta.dias_evento).split(',');
                }
            }
        }
        const datasIso = [];
        diasArr.forEach(entry => {
            const s = (entry && typeof entry === 'object') ? String(entry.data || entry.iso || '') : String(entry || '');
            const iso = s.trim().split(/[\sT]+/)[0].slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && !datasIso.includes(iso)) datasIso.push(iso);
        });
        datasIso.sort();
        if (datasIso.length === 0) return '';
        return datasIso.map(iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`).join(', ');
    }

    /* Limita a Razão Social a no máximo 30 caracteres sem cortar palavras no meio
       e sem deixar conectivos isolados no final (ex.: "E", "&", "DE", "DA", "DO") */
    function truncarRazaoSocialProposta(nome, limite) {
        const max = Number(limite) > 0 ? Number(limite) : 30;
        const limpo = String(nome || '').trim().replace(/\s+/g, ' ');
        if (!limpo || limpo === '—') return '—';
        const conectivoFinalRe = /^(?:E|&|DE|DA|DO|DAS|DOS|-|\/|,)$/i;
        const palavras = limpo.split(' ');
        if (limpo.length <= max) {
            while (palavras.length > 1 && conectivoFinalRe.test(palavras[palavras.length - 1])) {
                palavras.pop();
            }
            return palavras.join(' ');
        }
        const escolhidas = [];
        let atual = '';
        for (let i = 0; i < palavras.length; i++) {
            const p = palavras[i];
            const candidato = atual ? (atual + ' ' + p) : p;
            if (candidato.length <= max) {
                escolhidas.push(p);
                atual = candidato;
            } else {
                break;
            }
        }
        if (escolhidas.length === 0) {
            return limpo.slice(0, max).trim();
        }
        while (escolhidas.length > 1 && conectivoFinalRe.test(escolhidas[escolhidas.length - 1])) {
            escolhidas.pop();
        }
        return escolhidas.join(' ');
    }
    window.truncarRazaoSocialProposta = truncarRazaoSocialProposta;

    /* Separa endereço de instalação em Linha 1 (Nome do Local), Rua/Número, Bairro/Cidade e Linha 2 completa */
    function separarRuaBairroCidade(linha2) {
        const s = String(linha2 || '').trim();
        if (!s) return { rua: '', bairro_cidade: '' };
        const partes = s.split(/\s+-\s+/);
        if (partes.length >= 2) {
            return { rua: partes[0].trim(), bairro_cidade: partes.slice(1).join(' - ').trim() };
        }
        return { rua: s, bairro_cidade: '' };
    }

    function formatarInstalacaoDuasLinhas(proposta, clienteObj) {
        const rawOriginal = String(proposta.endereco_instalacao || '').trim();
        const mPrefixo = rawOriginal.match(/^\s*(ENDERE[ÇC]O\s+(?:DE\s+)?(?:FATURAMENTO|ENTREGA|INSTALA[ÇC][ÃA]O|COBRAN[ÇC]A|COMERCIAL)|MATRIZ|FILIAL)\s*[-:–]\s*(.*)$/i);
        const prefixoExplicito = mPrefixo ? String(mPrefixo[1] || '').trim().toUpperCase() : '';
        const rawEnd = (mPrefixo ? String(mPrefixo[2] || '') : rawOriginal).trim();

        const c = window._boxCacheDadosAux;
        if ((rawEnd || rawOriginal) && c && Array.isArray(c.enderecos) && c.enderecos.length) {
            const cliId = clienteObj ? Number(clienteObj.id) : 0;
            const candidatos = cliId ? c.enderecos.filter(e => Number(e.cliente_id) === cliId) : c.enderecos;
            const endNorm = norm(rawEnd || rawOriginal);
            const match = candidatos.find(e => {
                const rua = norm(e.endereco);
                return rua && endNorm.includes(rua);
            });
            if (match) {
                const nomeLocal = String(match.nome_local || prefixoExplicito || '').trim();
                const ruaNum = [match.endereco, match.numero, match.complemento].map(x => String(x || '').trim()).filter(Boolean).join(', ');
                const bairroCid = [match.bairro, [match.municipio, match.uf].filter(Boolean).join('/')].map(x => String(x || '').trim()).filter(Boolean).join(' - ');
                const endCompleto = [ruaNum, bairroCid].filter(Boolean).join(' - ');
                if (nomeLocal) {
                    return { linha1: nomeLocal, linha2: endCompleto || rawEnd, rua: ruaNum || rawEnd, bairro_cidade: bairroCid };
                }
                return { linha1: ruaNum || rawEnd, linha2: bairroCid, rua: ruaNum || rawEnd, bairro_cidade: bairroCid };
            }
        }
        if (!rawOriginal) {
            return {
                linha1: 'NOME DO LOCAL',
                linha2: 'RUA E NUMERO - BAIRRO - CIDADE',
                rua: 'RUA ANTÔNIO BORGES MACHADO DE OLIVEIRA, 500',
                bairro_cidade: 'BAIRRO - CIDADE'
            };
        }
        if (prefixoExplicito) {
            const sep = separarRuaBairroCidade(rawEnd);
            return { linha1: prefixoExplicito, linha2: rawEnd, rua: sep.rua, bairro_cidade: sep.bairro_cidade };
        }
        const partesTraco = rawOriginal.split(/\s+-\s+/);
        if (partesTraco.length >= 2) {
            const l2 = partesTraco.slice(1).join(' - ').trim();
            const sep = separarRuaBairroCidade(l2);
            return {
                linha1: partesTraco[0].trim(),
                linha2: l2,
                rua: sep.rua,
                bairro_cidade: sep.bairro_cidade
            };
        }
        return { linha1: rawOriginal, linha2: '', rua: '', bairro_cidade: '' };
    }

    function lerServicosProposta(raw) {
        if (typeof window._parseServicosProposta === 'function') return window._parseServicosProposta(raw);
        if (Array.isArray(raw)) return raw;
        try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }

    /* Monta todos os dados estruturados para o Quadro de Valores de qualquer Modelo de Proposta */
    window.montarDadosQuadroEventoProposta = function (propostaExplicita, modeloForcado) {
        const c = window._boxCacheDadosAux || { clientes: [], contatos: [], enderecos: [], equipamentos: [], propostasEvento: [], propostasTodas: [] };

        let prop = propostaExplicita || null;
        if (!prop && window._boxPropostaPreviewId && window._boxPropostaPreviewId !== 'auto' && window._boxPropostaPreviewId !== 'exemplo') {
            const fonte = (c.propostasTodas && c.propostasTodas.length) ? c.propostasTodas : (c.propostasEvento || []);
            prop = fonte.find(p => String(p.id) === String(window._boxPropostaPreviewId)) || null;
        }
        if (!prop && window._boxPropostaPreviewId !== 'exemplo') {
            const tipoForm = document.getElementById('prop-tipo')?.value || '';
            const cliForm = document.getElementById('prop-cliente')?.value || '';
            if (cliForm || (window._propProdutosAdicionados && window._propProdutosAdicionados.length)) {
                let contratoLive = '';
                try {
                    if (typeof _propostasEditandoId !== 'undefined' && _propostasEditandoId && typeof _propostasData !== 'undefined') {
                        const pp = _propostasData.find(x => x.id === _propostasEditandoId);
                        contratoLive = (pp && pp.contrato) || '';
                    }
                } catch (e) {}
                const inpContratoAdt = document.getElementById('prop-contrato-aditivo');
                prop = {
                    id: (typeof _propostasEditandoId !== 'undefined' && _propostasEditandoId) ? _propostasEditandoId : null,
                    tipo: tipoForm || 'EVENTO',
                    tabela_precos: document.getElementById('prop-tabela')?.value || '',
                    contrato_vinculado: inpContratoAdt?.value || '',
                    contrato_vinculado_id: inpContratoAdt?.getAttribute('data-contrato-id') || null,
                    contrato_vinculado_tipo: inpContratoAdt?.getAttribute('data-contrato-tipo') || '',
                    codigo: document.getElementById('prop-codigo')?.value || 'AUTO',
                    contrato: contratoLive,
                    cliente_nome: cliForm,
                    contato_nome: document.getElementById('prop-contato')?.value || '',
                    nome_evento: document.getElementById('prop-nome-evento')?.value || '',
                    periodo_inicio: document.getElementById('prop-periodo-ini')?.value || '',
                    periodo_fim: document.getElementById('prop-periodo-fim')?.value || '',
                    validade_proposta: document.getElementById('prop-validade-proposta')?.value || '',
                    condicao_pagamento: document.getElementById('prop-cond-pag')?.value || '',
                    dias_contrato: document.getElementById('prop-dias')?.value || 0,
                    endereco_instalacao: document.getElementById('prop-endereco')?.value || '',
                    manutencao_diaria: Boolean(document.getElementById('prop-dias-manut-diarias')?.checked),
                    itens: window._propProdutosAdicionados || [],
                    itens_servicos: window._propServicosAdicionados || []
                };
            }
        }

        const modeloBruto = modeloForcado || (prop && prop.tipo) || window._boxesModeloAtivo || 'EVENTO';
        const modeloNorm = window.normalizarModeloTipoBox(modeloBruto);
        const modeloEfetivo = modeloNorm === 'ADITIVO' ? window.resolverModeloOrigemAditivo(prop) : modeloNorm;
        const cfgModelo = window.obterConfigQuadroModelo(modeloEfetivo);
        const tituloTopoResolvido = modeloEfetivo === 'OBRA'
            ? window.resolverSubtituloObraProposta(prop, modeloBruto)
            : (modeloEfetivo === 'LIMPA FOSSA'
                ? window.resolverSubtituloLimpaFossaProposta(prop, modeloBruto)
                : (cfgModelo.tipo_titulo || modeloEfetivo));

        if (!prop) {
            const descDemo = 'Descrição de Produtos aqui, o texto pode ser grande. Descrição de Produtos aqui, o texto pode ser grande e deve quebrar a linha ao final da linha pontilhada';
            const obsDemo = 'OBSERVAÇÃO TAMBÉM PODE SER GRANDE E DEVE ESTAR EM CAIXA ALTA';
            return {
                modelo_tipo: modeloEfetivo,
                eh_aditivo: modeloNorm === 'ADITIVO',
                eh_demo: true,
                tipo_titulo: tituloTopoResolvido,
                info_rotulo: cfgModelo.info_rotulo || 'EVENTO:',
                ocultar_nome_evento: Boolean(cfgModelo.ocultar_nome_evento),
                contrato: '01',
                codigo_proposta: '01',
                razao_social: truncarRazaoSocialProposta('LATIN AMERICA MANUTENCAO E MONTAGEM INDUSTRIAL LTDA', 30),
                cnpj: 'CNPJ AQUI',
                contato_nome: 'NOME DO CONTATO',
                contato_celular: 'NUMERO DO CONTATO',
                nome_evento: 'NOME DO EVENTO',
                data_inicio: 'DD/MM/AA',
                data_fim: 'DD/MM/AA',
                validade_proposta: 'DD/MM/AA',
                condicao_pagamento: 'PIX 50% RESERVA + 50% ANTES DA ENTREGA',
                contrato_vinculado: 'APENAS PARA ADITIVO',
                diarias_contrato: 'DIÁRIAS DE CONTRATO',
                instalacao_linha1: 'NOME DO LOCAL',
                instalacao_linha2: 'RUA E NUMERO - BAIRRO - CIDADE',
                instalacao_rua: 'RUA ANTÔNIO BORGES MACHADO DE OLIVEIRA, 500',
                instalacao_bairro_cidade: 'BAIRRO - CIDADE',
                resumo_diarias_rodape: 'MANUTENÇÃO DIÁRIA',
                itens: [
                    { quantidade: 5, nome: 'BANHEIRO QUÍMICO STANDARD 002XZV', descricao_proposta: descDemo, link_url: 'https://www.americarental.com.br', observacao: obsDemo, dias_evento_texto: '02/11, 03/11, 04/11, 05/11, 06/11', quant_diarias: 5, unit: 100, por_dia: 500, desconto: 0, total: 2500 },
                    { quantidade: 5, nome: 'BANHEIRO QUÍMICO STANDARD 002XZV', descricao_proposta: descDemo, link_url: 'https://www.americarental.com.br', observacao: obsDemo, dias_evento_texto: '02/11, 03/11, 04/11, 05/11, 06/11, 07/11', quant_diarias: 6, unit: 100, por_dia: 500, desconto: 300, total: 2700 },
                    { quantidade: 2, nome: 'LAVATÓRIO PORTÁTIL', descricao_proposta: descDemo, link_url: '', observacao: '', dias_evento_texto: '02/11, 03/11, 04/11, 05/11, 06/11', quant_diarias: 5, unit: 0, por_dia: 0, desconto: 0, total: 0, cortesia: true }
                ],
                servicos: [
                    { quantidade: 1, nome: 'LIMPEZA DURANTE O EVENTO', descricao_proposta: '', observacao: '', quant_diarias: '—', unit: 350, por_dia: 350, desconto: 50, total: 300 }
                ],
                valor_total_por_dia_geral: 1000,
                valor_total_produtos: 5200,
                valor_total_servicos: 300,
                valor_total_geral: 5200
            };
        }

        const cliNomeLimpo = String(prop.cliente_nome || '').replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+\s*/, '').trim();
        const cliNorm = norm(cliNomeLimpo);
        const clienteObj = (c.clientes || []).find(cl =>
            norm(cl.nome_razao_social) === cliNorm || norm(cl.nome_fantasia) === cliNorm
        ) || null;

        const cnpj = (clienteObj && clienteObj.cpf_cnpj) ? String(clienteObj.cpf_cnpj).trim() : (prop.cliente_cnpj || '—');
        const contatoNome = String(prop.contato_nome || '').trim();
        let celularContato = prop.contato_celular || prop.contato_telefone || '';
        if (!celularContato && contatoNome && Array.isArray(c.contatos)) {
            const contNorm = norm(contatoNome);
            const contObj = c.contatos.find(ct =>
                norm(ct.nome || ct.nome_contato) === contNorm &&
                (!clienteObj || Number(ct.cliente_id) === Number(clienteObj.id) || norm(ct.cliente_nome) === cliNorm)
            ) || c.contatos.find(ct => norm(ct.nome || ct.nome_contato) === contNorm);
            if (contObj) celularContato = String(contObj.celular || contObj.telefone || contObj.whatsapp || '').trim();
        }
        if (!celularContato && clienteObj) celularContato = String(clienteObj.celular || clienteObj.telefone || '').trim();

        const iniFmt = fmtDataIso(prop.periodo_inicio);
        const fimFmt = fmtDataIso(prop.periodo_fim);
        const valFmt = fmtDataIso(prop.validade_proposta);
        const condPag = String(prop.condicao_pagamento || '').trim();
        const contratoVinc = String(prop.contrato_vinculado || '').trim();
        let diariasContrato = '';
        if (iniFmt && fimFmt) diariasContrato = iniFmt === fimFmt ? iniFmt : iniFmt + ' A ' + fimFmt;
        else diariasContrato = iniFmt || fimFmt || '—';

        const inst = formatarInstalacaoDuasLinhas(prop, clienteObj);

        let itensRaw = [];
        if (Array.isArray(prop.itens)) itensRaw = prop.itens;
        else if (prop.itens) { try { itensRaw = JSON.parse(prop.itens); } catch (e) { itensRaw = []; } }
        const servicosRaw = lerServicosProposta(prop.itens_servicos);

        let somaPorDia = 0;
        let somaTotalGeral = 0;
        let somaTotalServicos = 0;

        const itensFormatados = (itensRaw || []).map(it => {
            const qtd = Math.max(1, Number(it.quantidade ?? it.qtde ?? 1) || 1);
            const nomeProd = String(it.produto || it.descricao || it.nome || 'EQUIPAMENTO').replace(/^\d+\s*-\s*/, '').trim();
            const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = diasArr.length > 0 ? diasArr.length : Math.max(1, Number(it.diarias ?? prop.dias_contrato ?? 1) || 1);
            const unitLiq = Number(it.valor_unitario ?? it.valor ?? 0) || 0;
            const base = Number(it.valor_base) > 0 ? Number(it.valor_base) : unitLiq;
            const netDia = (it.valor_total !== undefined && !isNaN(parseFloat(it.valor_total))) ? parseFloat(it.valor_total) : unitLiq * qtd;
            const grossDia = base * qtd;
            const descDia = Math.max(0, grossDia - netDia);
            somaPorDia += netDia;
            somaTotalGeral += netDia * nDiarias;
            return {
                quantidade: qtd,
                nome: nomeProd,
                descricao_proposta: window.obterDescricaoPropostaEquipamento(it),
                foto_url: window.obterFotoPropostaEquipamento(it),
                link_url: window.obterLinkPropostaEquipamento(it),
                observacao: String(it.observacao || '').trim().toUpperCase(),
                dias_evento_texto: formatarDiasEventoProdutoCurto(it, prop),
                quant_diarias: nDiarias,
                unit: base,
                por_dia: grossDia,
                desconto: descDia * nDiarias,
                total: netDia * nDiarias,
                cortesia: netDia <= 0
            };
        });

        const servicosFormatados = (servicosRaw || []).map(s => {
            const qtd = Math.max(1, Number(s.quantidade ?? 1) || 1);
            const nomeServ = String(s.servico || s.descricao || s.nome || 'SERVIÇO').replace(/^\d+\s*-\s*/, '').trim();
            const isFob = !!s.frete_fob;
            const unitLiq = isFob ? 0 : (Number(s.valor_unitario ?? s.valor ?? 0) || 0);
            const base = isFob ? 0 : (Number(s.valor_base) > 0 ? Number(s.valor_base) : unitLiq);
            const net = isFob ? 0 : ((s.valor_total !== undefined && !isNaN(parseFloat(s.valor_total))) ? parseFloat(s.valor_total) : unitLiq * qtd);
            const gross = isFob ? 0 : (base * qtd);
            if (!isFob) somaTotalServicos += net;
            return {
                quantidade: qtd,
                nome: nomeServ,
                descricao_proposta: window.obterDescricaoPropostaEquipamento({ codigo: s.codigo, produto: nomeServ }),
                link_url: window.obterLinkPropostaEquipamento({ codigo: s.codigo, produto: nomeServ, link_url: s.link_url }),
                observacao: String(s.observacao || '').trim().toUpperCase(),
                quant_diarias: '—',
                unit: base,
                por_dia: gross,
                desconto: isFob ? 0 : Math.max(0, gross - net),
                total: net,
                fob: isFob,
                cortesia: !isFob && net <= 0
            };
        });

        const numSeq = formatarNumeroPropostaSequencial(prop.codigo, prop.contrato, prop.id);
        const resumoDiariasRodape = calcularResumoDiariasRodape(prop, itensRaw);

        return {
            modelo_tipo: modeloEfetivo,
            eh_aditivo: modeloNorm === 'ADITIVO',
            eh_demo: false,
            tipo_titulo: tituloTopoResolvido,
            info_rotulo: cfgModelo.info_rotulo || 'EVENTO:',
            ocultar_nome_evento: Boolean(cfgModelo.ocultar_nome_evento),
            contrato: numSeq,
            codigo_proposta: numSeq,
            razao_social: truncarRazaoSocialProposta(cliNomeLimpo || prop.cliente_razao || '', 30),
            cnpj: cnpj || '—',
            contato_nome: contatoNome || '—',
            contato_celular: celularContato || '—',
            nome_evento: String(prop.nome_evento || '').trim() || '—',
            data_inicio: iniFmt || '—',
            data_fim: fimFmt || iniFmt || '—',
            validade_proposta: valFmt || '—',
            condicao_pagamento: condPag || '—',
            contrato_vinculado: contratoVinc,
            diarias_contrato: diariasContrato,
            instalacao_linha1: inst.linha1,
            instalacao_linha2: inst.linha2,
            instalacao_rua: inst.rua,
            instalacao_bairro_cidade: inst.bairro_cidade,
            resumo_diarias_rodape: resumoDiariasRodape,
            itens: itensFormatados,
            servicos: servicosFormatados,
            valor_total_por_dia_geral: somaPorDia,
            valor_total_produtos: somaTotalGeral,
            valor_total_servicos: somaTotalServicos,
            valor_total_geral: somaTotalGeral
        };
    };

    /* Renderiza o Quadro de Valores (todos os modelos começam com o mesmo padrão criado para Proposta Evento,
       podendo ser personalizados separadamente via CONFIG_QUADRO_POR_MODELO / config_quadro do box) */
    /* Mantém o topo do Quadro de Valores encostado na imagem anterior (sem margem extra e sem altura mínima no celular) */
    window.ajustarAlturaQuadroValoresBoxes = function (root) {
        const escopo = root && root.classList && root.classList.contains('box-quadro-evento-proposta')
            ? [root]
            : Array.from((root && root.querySelectorAll ? root : document).querySelectorAll('.box-quadro-evento-proposta'));
        escopo.forEach(q => q.classList.remove('bq-abaixo-600'));
    };
    window.addEventListener('resize', () => {
        if (typeof window.ajustarAlturaQuadroValoresBoxes === 'function') window.ajustarAlturaQuadroValoresBoxes();
    });

    /* Renderiza o Quadro de Valores (todos os modelos começam com o mesmo padrão criado para Proposta Evento,
       podendo ser personalizados separadamente via CONFIG_QUADRO_POR_MODELO / config_quadro do box) */
    window.renderBoxQuadroEventoHtml = function (dadosCustom, view, configQuadroBox) {
        const modeloRef = (configQuadroBox && configQuadroBox.modelo_tipo) || (dadosCustom && dadosCustom.modelo_tipo) || (dadosCustom && dadosCustom.tipo) || window._boxesModeloAtivo || 'EVENTO';
        const d = (dadosCustom && dadosCustom.itens && Array.isArray(dadosCustom.itens) && dadosCustom.razao_social !== undefined)
            ? dadosCustom
            : window.montarDadosQuadroEventoProposta(dadosCustom, modeloRef);
        const cfg = window.obterConfigQuadroModelo(d.modelo_tipo || modeloRef, configQuadroBox);
        const aditivoHtml = (configQuadroBox && configQuadroBox.aditivo_html) || '';
        const u = (px) => (px / 19.2).toFixed(4) + 'cqw';
        const ROXO = cfg.cor_primaria || '#7b4195';
        const corRotuloTotal = cfg.cor_rotulo_valor_total || (String(ROXO).toLowerCase() === '#1e5782' ? '#1e5782' : '#3b3b3b');
        const tituloTopo = (d && (d.modelo_tipo === 'OBRA' || d.modelo_tipo === 'LIMPA FOSSA') && d.tipo_titulo)
            ? d.tipo_titulo
            : (cfg.tipo_titulo || d.tipo_titulo || 'EVENTO');
        const infoRotulo = cfg.info_rotulo || d.info_rotulo || 'EVENTO:';
        const rotuloInstalacao = cfg.rotulo_instalacao || d.rotulo_instalacao || (String(infoRotulo).toUpperCase().includes('FOSSA') ? 'ENDEREÇO:' : 'INSTALAÇÃO:');
        const ocultarNomeEvento = cfg.ocultar_nome_evento !== undefined ? Boolean(cfg.ocultar_nome_evento) : Boolean(d.ocultar_nome_evento);
        const ocultarDataFim = cfg.ocultar_data_fim !== undefined ? Boolean(cfg.ocultar_data_fim) : Boolean(d.ocultar_data_fim);
        const mostrarCondicoesTopo = cfg.mostrar_condicoes_topo !== undefined ? Boolean(cfg.mostrar_condicoes_topo) : (String(d.modelo_tipo || '').toUpperCase() === 'EVENTO');
        const mostrarFaixaValores = cfg.mostrar_faixa_valores_contemplados !== undefined ? Boolean(cfg.mostrar_faixa_valores_contemplados) : (['EVENTO', 'OBRA', 'OBRA MENSAL', 'OBRA QUINZENAL', 'OBRA SEMANAL', 'LIMPA FOSSA', 'LIMPA FOSSA MENSAL'].includes(String(d.modelo_tipo || '').toUpperCase()));
        const faixaValoresImg = cfg.faixa_valores_img || (String(ROXO).toLowerCase() === '#1e5782' ? '/assets/faixa-valores-contemplados-obra.png?v=20261101v8' : '/assets/faixa-valores-contemplados-evento.png?v=20261101v8');
        const mostrarDiasItem = cfg.mostrar_dias_evento_item !== false;
        const tituloEquip = cfg.titulo_equipamentos || 'EQUIPAMENTOS:';
        const tituloServ = cfg.titulo_servicos || 'SERVIÇOS:';

        const sepEndTopo = separarRuaBairroCidade(d.instalacao_linha2);
        const endRuaTopo = d.instalacao_rua !== undefined ? d.instalacao_rua : sepEndTopo.rua;
        const endBairroCidTopo = d.instalacao_bairro_cidade !== undefined ? d.instalacao_bairro_cidade : sepEndTopo.bairro_cidade;
        const exibirContratoBaseTopo = Boolean(d.eh_aditivo || d.eh_demo || (d.contrato_vinculado && String(d.contrato_vinculado).trim()));
        const textoContratoBaseTopo = (d.eh_demo && !d.eh_aditivo) ? (d.contrato_vinculado || 'APENAS PARA ADITIVO') : (d.contrato_vinculado || '—');
        const razaoSocialTopo = truncarRazaoSocialProposta(d.razao_social, 30);

        const qtdTotalLinhas = ((d.itens && d.itens.length) || 0) + ((d.servicos && d.servicos.length) || 0);
        const abaixo600Inicial = qtdTotalLinhas < 9;

        const COLS = u(135) + ' 1fr ' + u(110) + ' ' + u(190) + ' ' + u(165) + ' ' + u(140) + ' ' + u(220);
        const GAP = u(10);

        const celula = (it, valor, cor) => it.fob
            ? '<span class="bq-d" style="font-size:' + u(22) + '; color:' + ROXO + '; letter-spacing:0.04em;">FOB</span>'
            : (it.cortesia
                ? '<span class="bq-d" style="font-size:' + u(22) + '; color:' + ROXO + '; letter-spacing:0.04em;">CORTESIA</span>'
                : '<span style="color:' + cor + ';">' + fmtNum(valor) + '</span>');

        const cabecalhoColunas = (titulo) => `
            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:center; margin-bottom:${u(16)};">
                <div></div>
                <div style="font-size:${u(40)}; color:#3b3b3b; display:flex; align-items:center; gap:${u(10)};">
                    <span style="color:${ROXO}; font-size:${u(24)};">&#9656;</span> ${titulo}
                </div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">QUANT.<br>DIÁRIAS</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">VALOR UNITÁRIO<br>POR DIÁRIA R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">VALOR TOTAL<br>POR DIA R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">DESCONTO<br>R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:${ROXO}; line-height:1.2;">VALOR<br>TOTAL R$</div>
            </div>`;

        const cabecalhoColunasServicos = (titulo) => `
            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:center; margin-bottom:${u(16)};">
                <div></div>
                <div style="grid-column:2 / 4; font-size:${u(40)}; color:#3b3b3b; display:flex; align-items:center; gap:${u(10)};">
                    <span style="color:${ROXO}; font-size:${u(24)};">&#9656;</span> ${titulo}
                </div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">VALOR UNITÁRIO<br>R$</div>
                <div></div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:#3b3b3b; line-height:1.2;">DESCONTO<br>R$</div>
                <div class="bq-d" style="text-align:center; font-size:${u(18)}; color:${ROXO}; line-height:1.2;">VALOR<br>TOTAL R$</div>
            </div>`;

        const svgChainLink = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="width:${u(20)}; height:${u(20)}; display:block;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
        const iconeLinkItem = (it) => {
            const rawUrl = String(it.link_url || '').trim();
            const urlHref = rawUrl ? (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('/') ? rawUrl : 'https://' + rawUrl) : '';
            const baseStyle = `width:${u(36)}; height:${u(36)}; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; text-decoration:none; box-sizing:border-box;`;
            if (urlHref) {
                return `<a href="${esc(urlHref)}" target="_blank" rel="noopener noreferrer" title="Abrir link do equipamento" onclick="event.stopPropagation();" style="${baseStyle} background:${ROXO}; cursor:pointer;">${svgChainLink}</a>`;
            }
            return `<span style="${baseStyle} background:#9ca3af; cursor:default; pointer-events:none;">${svgChainLink}</span>`;
        };

        const celulaLinhaStyle = `text-align:center; font-size:${u(26)}; align-self:start; min-height:${u(36)}; display:flex; align-items:center; justify-content:center; line-height:1;`;
        const linhaItem = (it) => `
            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:center; margin-bottom:${u(26)};">
                <div style="display:flex; align-items:center; justify-content:center; width:${u(125)}; min-height:${it.foto_url ? u(84) : u(36)};">
                    ${it.foto_url ? `<img src="${esc(it.foto_url)}" alt="${esc(it.nome)}" onload="if(window.ajustarAlturaQuadroValoresBoxes) window.ajustarAlturaQuadroValoresBoxes(this.closest('.box-quadro-evento-proposta'));" style="max-width:${u(120)}; max-height:${u(120)}; width:auto; height:auto; object-fit:contain; display:block;" onerror="this.style.display='none'">` : ''}
                </div>
                <div style="min-width:0; padding-right:${u(20)}; align-self:start;">
                    <div style="display:flex; align-items:center; gap:${u(12)}; width:100%; min-height:${u(36)};">
                        <span class="bq-d" style="font-size:${u(26)}; color:#3b3b3b; text-transform:uppercase; display:inline-flex; align-items:center; gap:${u(10)}; line-height:1;"><span>${esc(it.quantidade)}</span>${iconeLinkItem(it)}<span>${esc(it.nome)}</span></span>
                        <span style="flex:1; height:0; border-bottom:${u(3)} dotted #4b5563; min-width:${u(30)}; align-self:center;"></span>
                    </div>
                    ${it.descricao_proposta ? `<div style="font-size:${u(24)}; color:#4b5563; line-height:1.3; margin-top:${u(8)}; word-break:break-word;">${esc(it.descricao_proposta)}</div>` : ''}
                    ${it.observacao ? `<div style="font-size:${u(24)}; color:#3b3b3b; line-height:1.3; margin-top:${u(2)}; word-break:break-word;">Obs. se houver: ${esc(String(it.observacao).toUpperCase())}</div>` : ''}
                    ${(mostrarDiasItem && it.dias_evento_texto) ? `<div style="font-size:${u(24)}; color:#3b3b3b; line-height:1.3; margin-top:${u(2)}; word-break:break-word;">Dia de Evento / Sucção: ${esc(it.dias_evento_texto)}</div>` : ''}
                </div>
                <div class="bq-d" style="${celulaLinhaStyle} color:#3b3b3b;">${esc(it.quant_diarias)}</div>
                <div class="bq-d" style="${celulaLinhaStyle}">${celula(it, it.unit, '#3b3b3b')}</div>
                <div class="bq-d" style="${celulaLinhaStyle}">${celula(it, it.por_dia, '#3b3b3b')}</div>
                <div class="bq-d" style="${celulaLinhaStyle} color:#3b3b3b;">${(it.cortesia || it.fob || !(Number(it.desconto) > 0)) ? '—' : fmtNum(it.desconto)}</div>
                <div class="bq-d" style="${celulaLinhaStyle}">${celula(it, it.total, ROXO)}</div>
            </div>`;

        const linhaServico = (it) => `
            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:center; margin-bottom:${u(26)};">
                <div style="display:flex; align-items:center; justify-content:center; width:${u(125)}; min-height:${it.foto_url ? u(84) : u(36)};">
                    ${it.foto_url ? `<img src="${esc(it.foto_url)}" alt="${esc(it.nome)}" onload="if(window.ajustarAlturaQuadroValoresBoxes) window.ajustarAlturaQuadroValoresBoxes(this.closest('.box-quadro-evento-proposta'));" style="max-width:${u(120)}; max-height:${u(120)}; width:auto; height:auto; object-fit:contain; display:block;" onerror="this.style.display='none'">` : ''}
                </div>
                <div style="grid-column:2 / 4; min-width:0; padding-right:${u(20)}; align-self:start;">
                    <div style="display:flex; align-items:center; gap:${u(12)}; width:100%; min-height:${u(36)};">
                        <span class="bq-d" style="font-size:${u(26)}; color:#3b3b3b; text-transform:uppercase; display:inline-flex; align-items:center; gap:${u(10)}; line-height:1;"><span>${esc(it.quantidade)}</span>${iconeLinkItem(it)}<span>${esc(it.nome)}</span></span>
                        <span style="flex:1; height:0; border-bottom:${u(3)} dotted #4b5563; min-width:${u(30)}; align-self:center;"></span>
                    </div>
                    ${it.descricao_proposta ? `<div style="font-size:${u(24)}; color:#4b5563; line-height:1.3; margin-top:${u(8)}; word-break:break-word;">${esc(it.descricao_proposta)}</div>` : ''}
                    ${it.observacao ? `<div style="font-size:${u(24)}; color:#3b3b3b; line-height:1.3; margin-top:${u(2)}; word-break:break-word;">Obs. se houver: ${esc(String(it.observacao).toUpperCase())}</div>` : ''}
                </div>
                <div class="bq-d" style="${celulaLinhaStyle}">${celula(it, it.unit, '#3b3b3b')}</div>
                <div></div>
                <div class="bq-d" style="${celulaLinhaStyle} color:#3b3b3b;">${(it.cortesia || it.fob || !(Number(it.desconto) > 0)) ? '—' : fmtNum(it.desconto)}</div>
                <div class="bq-d" style="${celulaLinhaStyle}">${celula(it, it.total, ROXO)}</div>
            </div>`;

        const itensHtml = (d.itens && d.itens.length > 0)
            ? d.itens.map(linhaItem).join('')
            : `<div style="padding:${u(24)}; text-align:center; color:#94a3b8; font-size:${u(24)}; border:${u(2)} dashed #cbd5e1; border-radius:${u(10)}; margin-bottom:${u(20)};">Nenhum equipamento adicionado nesta proposta ainda.</div>`;

        const totalProdutosQuadro = (d.valor_total_produtos !== undefined && !isNaN(Number(d.valor_total_produtos)))
            ? Number(d.valor_total_produtos)
            : (Array.isArray(d.itens) ? d.itens.reduce((acc, it) => acc + (it.cortesia || it.fob ? 0 : (Number(it.total) || 0)), 0) : Number(d.valor_total_geral || 0));
        const totalServicosQuadro = (d.valor_total_servicos !== undefined && !isNaN(Number(d.valor_total_servicos)))
            ? Number(d.valor_total_servicos)
            : (Array.isArray(d.servicos) ? d.servicos.reduce((acc, s) => acc + (s.cortesia || s.fob ? 0 : (Number(s.total) || 0)), 0) : 0);

        const secaoServicos = (d.servicos && d.servicos.length > 0) ? `
            <div style="padding:${u(14)} ${u(60)} ${u(20)} ${u(50)};">
                ${cabecalhoColunasServicos(esc(tituloServ))}
                ${d.servicos.map(linhaServico).join('')}
                <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:baseline; margin-top:${u(14)}; padding-top:${u(16)}; border-top:${u(2)} solid #d1d5db;">
                    <div class="bq-d" style="grid-column:1 / 7; text-align:right; font-size:${u(32)}; color:${corRotuloTotal};">VALOR TOTAL DOS SERVIÇOS: R$</div>
                    <div class="bq-d" style="text-align:center; font-size:${u(36)}; color:${ROXO};">${fmtNum(totalServicosQuadro)}</div>
                </div>
            </div>` : '';

        return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600&display=swap');
            @font-face { font-family:'FGBook'; src:local('Franklin Gothic Book'), local('FranklinGothic-Book'), local('FRABK'); font-weight:400; font-style:normal; }
            @font-face { font-family:'FGDemi'; src:local('Franklin Gothic Demi'), local('FranklinGothic-Demi'), local('FRADM'); font-weight:600; font-style:normal; }
            .box-quadro-evento-proposta { font-family:'FGBook','Libre Franklin','Franklin Gothic Book',Arial,Helvetica,sans-serif; font-weight:400; background:#fff; }
            .box-quadro-evento-proposta .bq-d { font-family:'FGDemi','Libre Franklin','Franklin Gothic Demi',Arial,Helvetica,sans-serif; font-weight:600; }
            .box-quadro-evento-proposta .bq-inner { width:100%; min-height:0; display:flex; flex-direction:column; box-sizing:border-box; background:#fff; }
            .box-quadro-evento-proposta .bq-topo-bloco { position:relative; z-index:2; flex-shrink:0; margin-top:0; }
            .box-quadro-evento-proposta .bq-dados-topo-grid { flex:1; display:grid; grid-template-columns:0.82fr 1.18fr; column-gap:${u(48)}; padding:${u(24)} ${u(44)} ${u(18)} ${u(115)}; align-items:start; min-width:0; }
            .box-quadro-evento-proposta .bq-dados-topo-grid.bq-topo-3col { grid-template-columns:${u(452)} 1fr auto; column-gap:${u(32)}; padding:${u(34)} ${u(54)} ${u(20)} ${u(49)}; }
            .box-quadro-evento-proposta .bq-body-wrap { flex:0 0 auto; display:flex; flex-direction:column; justify-content:flex-start; width:100%; box-sizing:border-box; position:relative; z-index:1; }
            .box-quadro-evento-proposta.bq-mobile .bq-inner { min-height:0; }
            .box-quadro-evento-proposta.bq-mobile .bq-topo-bloco { margin-top:0; }
            .box-quadro-evento-proposta.bq-mobile .bq-dados-topo-grid { grid-template-columns:0.74fr 1.26fr; column-gap:${u(32)}; padding:${u(24)} ${u(44)} ${u(18)} ${u(53)}; }
            .box-quadro-evento-proposta.bq-mobile .bq-dados-topo-grid.bq-topo-3col { grid-template-columns:${u(452)} 1fr auto; column-gap:${u(32)}; padding:${u(34)} ${u(54)} ${u(20)} ${u(49)}; }
            .box-quadro-evento-proposta.bq-mobile .bq-body-wrap { justify-content:flex-start; }
            @media (max-width: 768px) {
                .box-quadro-evento-proposta .bq-inner { min-height:0; }
                .box-quadro-evento-proposta .bq-topo-bloco { margin-top:0; }
                .box-quadro-evento-proposta .bq-dados-topo-grid { grid-template-columns:0.74fr 1.26fr; column-gap:${u(32)}; padding:${u(24)} ${u(44)} ${u(18)} ${u(53)}; }
                .box-quadro-evento-proposta .bq-dados-topo-grid.bq-topo-3col { grid-template-columns:${u(452)} 1fr auto; column-gap:${u(32)}; padding:${u(34)} ${u(54)} ${u(20)} ${u(49)}; }
                .box-quadro-evento-proposta .bq-body-wrap { justify-content:flex-start; }
            }
        </style>
        <div class="box-quadro-evento-proposta${view === 'mobile' ? ' bq-mobile' : ''}" style="container-type:inline-size; width:100%; background:#fff; color:#1e293b; box-sizing:border-box; line-height:1.35;">
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" onload="if(window.ajustarAlturaQuadroValoresBoxes) window.ajustarAlturaQuadroValoresBoxes(this.closest('.box-quadro-evento-proposta'));" style="display:none;">
            <div class="bq-inner">
                <div class="bq-topo-bloco">
                    <!-- Faixa superior: PROPOSTA [MODELO] + número sequencial da proposta -->
                    <div style="border-bottom:${u(3)} solid ${ROXO}; height:${u(84)}; padding:0 ${u(54)} 0 ${u(34)}; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; flex-shrink:0;">
                        <div style="font-size:${u(33)}; letter-spacing:0.02em; color:#333;">PROPOSTA <span class="bq-d">${esc(tituloTopo)}</span></div>
                        <div class="bq-d" style="font-size:${u(42)}; color:${ROXO};">${esc(d.codigo_proposta || d.contrato)}</div>
                    </div>

                    <!-- Bloco logo + dados do cliente + informações do evento + condições da proposta -->
                    <div style="display:flex; align-items:stretch; position:relative; z-index:2; background:#fff;${mostrarFaixaValores ? '' : ` box-shadow:0 ${u(10)} ${u(14)} -${u(10)} rgba(15,23,42,0.18);`} flex-shrink:0;">
                        <div style="background:${ROXO}; width:${mostrarCondicoesTopo ? u(358) : u(415)}; height:${u(260)}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <img src="/assets/logo-quadro-evento.png" alt="América Rental desde 1999" style="height:${mostrarCondicoesTopo ? u(220) : u(224)}; width:auto; display:block;">
                        </div>
                        ${mostrarCondicoesTopo ? `
                        <div class="bq-dados-topo-grid bq-topo-3col">
                            <div style="min-width:0;">
                                <div style="font-size:${u(30.5)}; line-height:1.15; color:#333; display:flex; align-items:center; gap:${u(8)}; white-space:nowrap;">
                                    <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                    <span>DADOS DO <span class="bq-d">CLIENTE:</span></span>
                                </div>
                                <div style="color:#333; margin-top:${u(20)}; word-break:break-word;">
                                    <div class="bq-d" style="font-size:${u(19.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; overflow:hidden; margin-bottom:${u(14)};">${esc(razaoSocialTopo)}</div>
                                    <div style="font-size:${u(18.5)}; line-height:1.25; margin-bottom:${u(15)};">CNPJ: <span class="bq-d">${esc(d.cnpj)}</span></div>
                                    <div style="font-size:${u(18.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(14)};">CONTATO: <span class="bq-d">${esc(d.contato_nome)}</span></div>
                                    <div style="font-size:${u(18.5)}; line-height:1.25;">CEL.: <span class="bq-d">${esc(d.contato_celular)}</span></div>
                                </div>
                            </div>
                            <div style="min-width:0; overflow:hidden;">
                                <div style="font-size:${u(30.5)}; line-height:1.15; color:#333; display:flex; align-items:center; gap:${u(8)}; white-space:nowrap;">
                                    <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                    <span>INFORMAÇÕES <span class="bq-d">${esc(infoRotulo)}</span></span>
                                </div>
                                <div style="color:#333; margin-top:${u(20)};">
                                    ${ocultarNomeEvento ? '' : `<div class="bq-d" style="font-size:${u(19.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(22)};">${esc(d.nome_evento)}</div>`}
                                    <div style="font-size:${u(18.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(19)};" title="${esc(d.instalacao_linha1)}">${esc(rotuloInstalacao)} <span class="bq-d">${esc(d.instalacao_linha1)}</span></div>
                                    ${endRuaTopo ? `<div class="bq-d" style="font-size:${u(18)}; line-height:1.35; color:#333; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(endRuaTopo)}">${esc(endRuaTopo)}</div>` : ''}
                                    ${endBairroCidTopo ? `<div class="bq-d" style="font-size:${u(18)}; line-height:1.35; color:#333; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(endBairroCidTopo)}">${esc(endBairroCidTopo)}</div>` : ''}
                                </div>
                            </div>
                            <div style="min-width:0; text-align:right;">
                                <div style="font-size:${u(30.5)}; line-height:1.15; color:#333; display:flex; align-items:center; justify-content:flex-end; gap:${u(8)}; white-space:nowrap;">
                                    <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                    <span>CONDIÇÕES DA <span class="bq-d">PROPOSTA:</span></span>
                                </div>
                                <div style="color:#333; margin-top:${u(20)};">
                                    <div class="bq-d" style="font-size:${u(19.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; margin-bottom:${u(14)};">${esc(d.condicao_pagamento || '—')}</div>
                                    ${ocultarDataFim
                                        ? `<div style="font-size:${u(18.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; margin-bottom:${u(15)};">DATA: <span class="bq-d">${esc(d.data_inicio || '—')}</span></div>`
                                        : `<div style="font-size:${u(18.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; margin-bottom:${u(15)};">DATA DO CONTRATO: <span class="bq-d">${esc(d.data_inicio || '—')}</span> A <span class="bq-d">${esc(d.data_fim || d.data_inicio || '—')}</span></div>`
                                    }
                                    <div style="font-size:${u(18.5)}; line-height:1.25; text-transform:uppercase; white-space:nowrap; margin-bottom:${u(14)};">VALIDADE DA PROPOSTA: <span class="bq-d">${esc(d.validade_proposta || '—')}</span></div>
                                    ${exibirContratoBaseTopo ? `<div style="font-size:${u(18.5)}; line-height:1.25; color:${ROXO}; text-transform:uppercase; white-space:nowrap;">CONTRATO BASE: <span class="bq-d">${esc(textoContratoBaseTopo)}</span></div>` : ''}
                                </div>
                            </div>
                        </div>
                        ` : `
                        <div class="bq-dados-topo-grid">
                            <div style="min-width:0;">
                                <div style="font-size:${u(31)}; color:#333; display:flex; align-items:center; gap:${u(8)}; white-space:nowrap;">
                                    <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                    <span>DADOS DO <span class="bq-d">CLIENTE:</span></span>
                                </div>
                                <div style="font-size:${u(20.5)}; color:#333; line-height:1.58; margin-top:${u(14)}; word-break:break-word;">
                                    <div class="bq-d" style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(4)};">${esc(razaoSocialTopo)}</div>
                                    <div>CNPJ: <span class="bq-d">${esc(d.cnpj)}</span></div>
                                    <div style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">CONTATO: <span class="bq-d">${esc(d.contato_nome)}</span></div>
                                    <div>CEL.: <span class="bq-d">${esc(d.contato_celular)}</span></div>
                                </div>
                            </div>
                            <div style="min-width:0; overflow:hidden;">
                                <div style="font-size:${u(31)}; color:#333; display:flex; align-items:center; gap:${u(8)}; white-space:nowrap;">
                                    <span style="color:${ROXO}; font-size:${u(22)};">&#9656;</span>
                                    <span>INFORMAÇÕES <span class="bq-d">${esc(infoRotulo)}</span></span>
                                </div>
                                <div style="font-size:${u(20.5)}; color:#333; line-height:1.45; margin-top:${u(14)};">
                                    ${ocultarNomeEvento ? '' : `<div class="bq-d" style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:${u(4)};">${esc(d.nome_evento)}</div>`}
                                    <div style="text-transform:uppercase;${ocultarDataFim ? ` margin-bottom:${u(6)};` : ''}">INÍCIO: <span class="bq-d">${esc(d.data_inicio || '—')}</span></div>
                                    ${ocultarDataFim ? '' : `<div style="text-transform:uppercase; margin-bottom:${u(6)};">FIM: <span class="bq-d">${esc(d.data_fim || '—')}</span></div>`}
                                    <div style="text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(d.instalacao_linha1)}">${esc(rotuloInstalacao)} <span class="bq-d">${esc(d.instalacao_linha1)}</span></div>
                                    ${d.instalacao_linha2 ? `<div style="font-size:${u(16.5)}; color:#444; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.35;" title="${esc(d.instalacao_linha2)}">${esc(d.instalacao_linha2)}</div>` : ''}
                                </div>
                            </div>
                        </div>
                        `}
                    </div>
                    ${mostrarFaixaValores ? `<img src="${faixaValoresImg}" alt="Valores contemplados na proposta" style="width:100%; height:auto; display:block; pointer-events:none;">` : ''}
                </div>

                <div class="bq-body-wrap" style="padding-bottom:${u(30)};">
                    <!-- Equipamentos e Serviços com totais calculados separadamente -->
                    <div class="bq-equipamentos-bloco">
                        <div style="padding:${u(34)} ${u(60)} ${u(16)} ${u(50)};">
                            ${cabecalhoColunas(esc(tituloEquip))}
                            ${itensHtml}
                            <div style="display:grid; grid-template-columns:${COLS}; column-gap:${GAP}; align-items:baseline; margin-top:${u(14)}; padding-top:${u(16)}; border-top:${u(2)} solid #d1d5db;">
                                <div class="bq-d" style="grid-column:1 / 7; text-align:right; font-size:${u(32)}; color:${corRotuloTotal};">VALOR TOTAL DOS PRODUTOS: R$</div>
                                <div class="bq-d" style="text-align:center; font-size:${u(36)}; color:${ROXO};">${fmtNum(totalProdutosQuadro)}</div>
                            </div>
                        </div>
                        ${secaoServicos}
                    </div>
                </div>
            </div>
        </div>${aditivoHtml ? `<div class="bq-aditivo-after" style="width:100%;">${aditivoHtml}</div>` : ''}`;
    };

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
            return { src: box.url, tipo: box.tipo, hotspots: box.hotspots_mobile || [], recorte: true };
        }
        const hotMob = box.hotspots_mobile || [];
        return { src: box.url, tipo: box.tipo, hotspots: hotMob.length ? hotMob : (box.hotspots_desktop || []), recorte: false };
    }

    window.boxRenderHtml = function (box, view, opts) {
        opts = opts || {};
        if (box && box.tipo === 'quadro_evento') {
            const cfgBox = Object.assign(
                { modelo_tipo: box.modelo_tipo || opts.modelo_tipo || window._boxesModeloAtivo || 'EVENTO', aditivo_html: opts.aditivo_html || '' },
                box.config_quadro || {}
            );
            return window.renderBoxQuadroEventoHtml(opts.proposta || null, view, cfgBox);
        }
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
                (v.tipo === 'video' ? '' : hotspotsHtml(v.hotspots)) +
                `</div>`;
        }
        return `<div style="position:relative; width:100%; line-height:0;">` +
            midiaHtml(v.src, v.tipo, 'width:100%; height:auto; display:block;') +
            (v.tipo === 'video' ? '' : hotspotsHtml(v.hotspots)) +
            `</div>`;
    };

    /* ── Gerenciador (biblioteca por modelo de proposta + Aditivo) ────────────────── */
    window._boxesLista = [];
    window._boxesListaModeloBase = [];
    window._boxesViewPreview = 'desktop';

    window.abrirGerenciadorBoxes = async function (modeloInicial) {
        if (modeloInicial) {
            window._boxesModeloAtivo = window.normalizarModeloTipoBox(modeloInicial);
        } else if (window._modeloPropostaAtivo && (window._modeloPropostaAtivo.codigo_tipo || window._modeloPropostaAtivo.nome)) {
            window._boxesModeloAtivo = window.normalizarModeloTipoBox(window._modeloPropostaAtivo.codigo_tipo || window._modeloPropostaAtivo.nome);
        } else {
            const tipoForm = document.getElementById('prop-tipo')?.value || '';
            if (tipoForm) window._boxesModeloAtivo = window.normalizarModeloTipoBox(tipoForm);
        }

        const ant = document.getElementById('boxes-manager-overlay');
        if (ant) ant.remove();
        const ov = document.createElement('div');
        ov.id = 'boxes-manager-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:99990; display:flex; align-items:center; justify-content:center; font-family:Inter, sans-serif;';
        ov.innerHTML = `
        <div style="background:#f8fafc; width:min(1400px, 98vw); height:94vh; border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.35); display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:0.75rem 1.2rem; background:#fff; border-bottom:1px solid #e2e8f0; flex-wrap:wrap;">
                <div>
                    <div id="boxes-header-titulo" style="font-size:1.05rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:8px;"><i class="ph ph-image-square" style="color:#7048e8;"></i> Boxes (Banners)</div>
                    <div id="boxes-header-subtitulo" style="font-size:0.74rem; color:#64748b;">Edição dos boxes (banners e Quadro de Valores Fixo) exclusivos do modelo de proposta selecionado.</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button id="boxes-btn-anexar-principal" onclick="window.abrirEditorBox(null)" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="ph ph-plus-circle"></i> Anexar Box (Imagem / Vídeo)</button>
                    <button onclick="document.getElementById('boxes-manager-overlay')?.remove()" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;">Fechar</button>
                </div>
            </div>

            <!-- Abas ocultas: abertura direta pelo modelo de proposta selecionado -->
            <div id="boxes-modelos-tabs" style="display:none;"></div>

            <!-- Barra informativa quando estiver no Modelo Aditivo -->
            <div id="boxes-aditivo-banner" style="display:none; padding:0.55rem 1rem; background:#f5f3ff; border-bottom:1px solid #ddd6fe; font-size:0.76rem; color:#4c1d95; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;"></div>

            <div style="flex:1; min-height:0; display:grid; grid-template-columns:minmax(390px, 0.82fr) 1.18fr; gap:0.9rem; padding:0.9rem;">
                <div style="display:flex; flex-direction:column; min-height:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px;">
                        <div id="boxes-col-esq-titulo" style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Ordem dos Boxes <span id="boxes-count" style="background:#ede9fe; color:#6d28d9; padding:1px 8px; border-radius:999px; margin-left:4px;">0</span></div>
                    </div>
                    <div id="boxes-lista" style="flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;"></div>
                </div>
                <div style="display:flex; flex-direction:column; min-height:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <div style="font-size:0.74rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Pré-visualização</div>
                            <select id="boxes-prop-preview-sel" onchange="window._setBoxPropostaPreview(this.value)" style="padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.74rem; background:#fff; color:#334155; font-weight:600; cursor:pointer;">
                                <option value="auto">Dados: Proposta aberta / Modelo Exemplo</option>
                            </select>
                        </div>
                        <div id="boxes-toggle-view" style="display:inline-flex; background:#e2e8f0; border-radius:8px; padding:3px; gap:2px;"></div>
                    </div>
                    <div id="boxes-preview" style="flex:1; min-height:0; overflow-y:auto; background:#e2e8f0; border-radius:10px; border:1px solid #cbd5e1; padding:14px;"></div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(ov);
        window._renderAbasModelosBoxes();
        await window.carregarCacheDadosQuadroEvento(true);
        window._popularSelectPropostasPreviewBoxes();
        await window.carregarBoxes();
    };

    window._renderAbasModelosBoxes = function () {
        const ativo = window._boxesModeloAtivo || 'EVENTO';
        const modObj = window.MODELOS_PROPOSTA_BOXES.find(x => x.codigo === ativo) || { codigo: ativo, nome: ativo };
        const titEl = document.getElementById('boxes-header-titulo');
        const subEl = document.getElementById('boxes-header-subtitulo');
        const btnAnexar = document.getElementById('boxes-btn-anexar-principal');
        const bannerAdt = document.getElementById('boxes-aditivo-banner');

        if (ativo === 'ADITIVO') {
            if (titEl) titEl.innerHTML = `<i class="ph ph-file-plus" style="color:#6d28d9;"></i> Boxes (Banners) — Modelo de Proposta: Aditivo`;
            if (subEl) subEl.innerHTML = `O Aditivo segue o modelo do contrato vinculado e posiciona as imagens incluídas aqui <b>abaixo do #2 Quadro de Valores (Fixo)</b>.`;
            if (btnAnexar) btnAnexar.innerHTML = `<i class="ph ph-plus-circle"></i> Incluir Imagem / Vídeo no Aditivo`;
            if (bannerAdt) {
                bannerAdt.style.display = 'flex';
                const opcoesBase = window.MODELOS_PROPOSTA_BOXES.filter(x => x.codigo !== 'ADITIVO').map(x =>
                    `<option value="${esc(x.codigo)}" ${window._boxesModeloBaseAditivo === x.codigo ? 'selected' : ''}>${esc(x.nome)}</option>`
                ).join('');
                bannerAdt.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="background:#6d28d9; color:#fff; font-weight:800; padding:2px 8px; border-radius:999px; font-size:0.68rem;">REGRA DO ADITIVO</span>
                        <span>O Aditivo usa automaticamente o modelo da proposta do <b>contrato vinculado</b> (Obra → Obra, Evento → Evento, etc.) e posiciona as imagens cadastradas aqui <b>abaixo do #2 Quadro de Valores (Fixo)</b>.</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <label style="font-weight:700; color:#5b21b6; font-size:0.72rem;">Simular Contrato Originário:</label>
                        <select onchange="window._setModeloBaseAditivoPreview(this.value)" style="padding:4px 8px; border:1px solid #c4b5fd; border-radius:6px; font-size:0.74rem; background:#fff; color:#4c1d95; font-weight:700; cursor:pointer;">
                            ${opcoesBase}
                        </select>
                    </div>`;
            }
        } else {
            if (titEl) titEl.innerHTML = `<i class="ph ph-image-square" style="color:#7048e8;"></i> Boxes (Banners) — ${esc(modObj.nome)}`;
            if (subEl) subEl.innerHTML = `Gerencie os banners e o <b>Quadro de Valores — ${esc(modObj.nome)} (Fixo)</b> exclusivos deste modelo de proposta.`;
            if (btnAnexar) btnAnexar.innerHTML = `<i class="ph ph-plus-circle"></i> Anexar Box em ${esc(modObj.nome)}`;
            if (bannerAdt) bannerAdt.style.display = 'none';
        }
    };

    window.selecionarModeloBoxes = async function (codigoModelo) {
        window._boxesModeloAtivo = window.normalizarModeloTipoBox(codigoModelo);
        window._renderAbasModelosBoxes();
        window._popularSelectPropostasPreviewBoxes();
        await window.carregarBoxes();
    };

    window._setModeloBaseAditivoPreview = async function (codigoBase) {
        window._boxesModeloBaseAditivo = window.normalizarModeloTipoBox(codigoBase);
        await window.carregarBoxes();
    };

    window._popularSelectPropostasPreviewBoxes = function () {
        const sel = document.getElementById('boxes-prop-preview-sel');
        if (!sel) return;
        const c = window._boxCacheDadosAux || { propostasEvento: [], propostasTodas: [] };
        const opcoes = [
            `<option value="auto" ${window._boxPropostaPreviewId === 'auto' ? 'selected' : ''}>Dados: Proposta aberta / Modelo Exemplo</option>`,
            `<option value="exemplo" ${window._boxPropostaPreviewId === 'exemplo' ? 'selected' : ''}>Dados: Exemplo do Layout (modelo)</option>`
        ];
        const fonte = (c.propostasTodas && c.propostasTodas.length) ? c.propostasTodas : (c.propostasEvento || []);
        fonte.slice(0, 50).forEach(p => {
            const label = `${p.codigo || ('#' + p.id)} [${p.tipo || 'EVENTO'}]${p.nome_evento ? ' — ' + p.nome_evento : ''} (${p.cliente_nome || 'Sem cliente'})`;
            opcoes.push(`<option value="${esc(p.id)}" ${String(window._boxPropostaPreviewId) === String(p.id) ? 'selected' : ''}>Proposta: ${esc(label)}</option>`);
        });
        sel.innerHTML = opcoes.join('');
    };

    window._setBoxPropostaPreview = function (val) {
        window._boxPropostaPreviewId = val || 'auto';
        window._renderBoxesPreview();
    };

    window.carregarBoxes = async function () {
        const lista = document.getElementById('boxes-lista');
        if (lista && !window._boxesLista.length) lista.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2rem; font-size:0.85rem;">Carregando...</div>';
        const modAtivo = window._boxesModeloAtivo || 'EVENTO';

        const [resAtivo, resAditivo] = await Promise.all([
            apiGet('/comercial/boxes?modelo_tipo=' + encodeURIComponent(modAtivo)).catch(() => []),
            modAtivo === 'ADITIVO'
                ? apiGet('/comercial/boxes?modelo_tipo=' + encodeURIComponent(window._boxesModeloBaseAditivo || 'EVENTO')).catch(() => [])
                : apiGet('/comercial/boxes?modelo_tipo=ADITIVO').catch(() => [])
        ]);

        if (modAtivo === 'ADITIVO') {
            window._boxesLista = Array.isArray(resAtivo) ? resAtivo : [];
            window._boxesAditivoCache = window._boxesLista;
            window._boxesListaModeloBase = Array.isArray(resAditivo) ? resAditivo : [];
        } else {
            window._boxesLista = Array.isArray(resAtivo) ? resAtivo : [];
            window._boxesAditivoCache = Array.isArray(resAditivo) ? resAditivo : [];
            window._boxesListaModeloBase = window._boxesLista;
        }

        window._renderBoxesLista();
        window._renderBoxesPreview();
        if (typeof window._renderEditorModeloPropostaAtivo === 'function') window._renderEditorModeloPropostaAtivo();
        if (typeof window.atualizarPreviewModeloPropostaAtivo === 'function') window.atualizarPreviewModeloPropostaAtivo();
    };

    window._renderBoxesLista = function () {
        const el = document.getElementById('boxes-lista');
        const cnt = document.getElementById('boxes-count');
        const modAtivo = window._boxesModeloAtivo || 'EVENTO';
        if (cnt) cnt.textContent = String(window._boxesLista.length);
        if (!el) return;

        /* Visão quando estamos na aba ADITIVO */
        if (modAtivo === 'ADITIVO') {
            const listaAdt = window._boxesLista || [];
            const modBase = window._boxesModeloBaseAditivo || 'EVENTO';
            const modBaseObj = window.MODELOS_PROPOSTA_BOXES.find(x => x.codigo === modBase) || { nome: modBase };
            const cabecalhoPosicao = `
                <div style="background:#f5f3ff; border:2px dashed #8b5cf6; border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                        <span style="background:#5c4599; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:999px; white-space:nowrap;">#2 FIXO DO CONTRATO</span>
                        <div style="font-size:0.78rem; color:#4c1d95; font-weight:700; line-height:1.3;">
                            Quadro de Valores — ${esc(modBaseObj.nome)} (Fixo)<br>
                            <span style="font-size:0.7rem; color:#6d28d9; font-weight:500;">⬇️ Todas as imagens anexadas abaixo entram imediatamente abaixo deste #2 Quadro de Valores:</span>
                        </div>
                    </div>
                    <button type="button" onclick="window.abrirEditorBox(null, 'ADITIVO')" style="background:#6d28d9; color:#fff; border:none; padding:6px 10px; border-radius:7px; font-size:0.73rem; font-weight:700; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
                        <i class="ph ph-plus-circle"></i> + Imagem Aditivo
                    </button>
                </div>`;

            if (!listaAdt.length) {
                el.innerHTML = cabecalhoPosicao + `
                    <div style="text-align:center; color:#6d28d9; padding:2rem 1rem; font-size:0.83rem; border:2px dashed #c4b5fd; border-radius:10px; background:#fff;">
                        Nenhuma imagem de Aditivo cadastrada ainda.<br>
                        Clique em <b>Incluir Imagem / Vídeo no Aditivo</b> para adicionar imagens que aparecerão abaixo do <b>#2 Quadro de Valores — Proposta Evento (Fixo)</b> (ou do modelo vinculado ao contrato).
                    </div>`;
                return;
            }

            el.innerHTML = cabecalhoPosicao + listaAdt.map((b, i) => {
                const thumb = b.tipo === 'video'
                    ? `<video src="${esc(b.url)}#t=0.5" muted preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video>`
                    : `<img src="${esc(b.url)}" alt="" style="width:100%; height:100%; object-fit:cover;">`;
                const nHot = (b.hotspots_desktop || []).length + (b.hotspots_mobile || []).length;
                return `
                <div style="background:#fff; border:1.5px solid #c4b5fd; border-radius:10px; padding:8px; display:flex; gap:10px; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:3px;">
                        <button title="Subir posição" ${i === 0 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'up')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === 0 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === 0 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-up"></i></button>
                        <button title="Descer posição" ${i === listaAdt.length - 1 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'down')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === listaAdt.length - 1 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === listaAdt.length - 1 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-down"></i></button>
                    </div>
                    <div style="width:120px; height:72px; border-radius:7px; overflow:hidden; background:#0f172a; flex-shrink:0; position:relative;">
                        ${thumb}
                        ${b.tipo === 'video' ? '<span style="position:absolute; right:4px; bottom:4px; background:rgba(0,0,0,0.7); color:#fff; font-size:0.62rem; padding:1px 5px; border-radius:4px;">VÍDEO</span>' : ''}
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; font-size:0.85rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><span style="color:#6d28d9;">Aditivo #${i + 1}</span> ${esc(b.nome)}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                            <span style="background:#ede9fe; color:#5b21b6; font-size:0.65rem; font-weight:800; padding:1px 7px; border-radius:999px;">Abaixo do #2 Quadro de Valores</span>
                            <span style="background:#f1f5f9; color:#475569; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${b.tipo === 'video' ? 'Vídeo' : 'Imagem'}</span>
                            <span style="background:#ede9fe; color:#6d28d9; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${esc(ROTULO_MODO[b.mobile_modo] || ROTULO_MODO.mesma)}</span>
                            ${nHot ? `<span style="background:#fef3c7; color:#b45309; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${nHot} link(s)</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button title="Editar" onclick="window.abrirEditorBox(${b.id}, 'ADITIVO')" style="height:32px; padding:0 9px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:700;"><i class="ph ph-pencil-simple"></i> Editar</button>
                        <button title="Excluir" onclick="window.excluirBox(${b.id})" style="height:32px; padding:0 9px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:700;"><i class="ph ph-trash"></i> Excluir</button>
                        <button title="Adicionar Nova" onclick="window.abrirEditorBox(null, 'ADITIVO')" style="height:32px; padding:0 9px; border:none; background:#6d28d9; color:#fff; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:700;"><i class="ph ph-plus-circle"></i> + Nova</button>
                    </div>
                </div>`;
            }).join('');
            return;
        }

        /* Visão padrão para cada Modelo de Proposta (EVENTO, OBRA MENSAL, etc.) */
        const lista = window._boxesLista;
        if (!lista.length) {
            el.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2.5rem 1rem; font-size:0.85rem; border:2px dashed #cbd5e1; border-radius:10px; background:#fff;">Nenhum box cadastrado neste modelo.<br>Clique em <b>Anexar Box</b> para adicionar uma imagem ou vídeo.</div>';
            return;
        }

        const cfgMod = window.obterConfigQuadroModelo(modAtivo);

        el.innerHTML = lista.map((b, i) => {
            const isQuadroFixo = b.tipo === 'quadro_evento';
            const cfgBox = isQuadroFixo ? window.obterConfigQuadroModelo(modAtivo, b.config_quadro) : cfgMod;
            const corThumb = cfgBox.cor_primaria || '#5c4599';
            const tituloThumb = cfgBox.tipo_titulo || modAtivo;
            const thumb = isQuadroFixo
                ? `<div style="width:100%; height:100%; background:#fff; border:1px solid #ddd6fe; display:flex; flex-direction:column; overflow:hidden; font-size:0.46rem;">
                       <div style="padding:2px 5px; border-bottom:1px solid ${esc(corThumb)}; display:flex; justify-content:space-between; font-weight:800; color:#1e293b;"><span>PROPOSTA ${esc(tituloThumb)}</span><span style="color:${esc(corThumb)};">01</span></div>
                       <div style="flex:1; display:flex; align-items:stretch;">
                           <div style="width:30px; background:${esc(corThumb)}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800;">A</div>
                           <div style="flex:1; padding:3px 4px; color:#475569; line-height:1.25;"><b>▸ CLIENTE / ${esc(cfgBox.info_rotulo || 'EVENTO:')}</b><br>▸ EQUIPAMENTOS...</div>
                       </div>
                       <div style="background:#f8fafc; color:${esc(corThumb)}; padding:1px 5px; text-align:right; font-weight:800; border-top:1px solid #e2e8f0;">VALOR TOTAL</div>
                   </div>`
                : (b.tipo === 'video'
                    ? `<video src="${esc(b.url)}#t=0.5" muted preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video>`
                    : `<img src="${esc(b.url)}" alt="" style="width:100%; height:100%; object-fit:cover;">`);
            const nHot = (b.hotspots_desktop || []).length + (b.hotspots_mobile || []).length;

            return `
            <div style="background:${isQuadroFixo ? '#faf5ff' : '#fff'}; border:${isQuadroFixo ? '2px solid #8b5cf6' : '1px solid #e2e8f0'}; border-radius:10px; padding:8px; display:flex; gap:10px; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <button title="Subir posição" ${i === 0 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'up')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === 0 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === 0 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-up"></i></button>
                    <button title="Descer posição" ${i === lista.length - 1 ? 'disabled' : ''} onclick="window.moverBox(${b.id}, 'down')" style="width:26px; height:26px; border:1px solid #cbd5e1; background:${i === lista.length - 1 ? '#f1f5f9' : '#fff'}; border-radius:6px; cursor:${i === lista.length - 1 ? 'not-allowed' : 'pointer'}; display:inline-flex; align-items:center; justify-content:center; padding:0;"><i class="ph ph-arrow-down"></i></button>
                </div>
                <div style="width:120px; height:72px; border-radius:7px; overflow:hidden; background:#0f172a; flex-shrink:0; position:relative;">
                    ${thumb}
                    ${b.tipo === 'video' ? '<span style="position:absolute; right:4px; bottom:4px; background:rgba(0,0,0,0.7); color:#fff; font-size:0.62rem; padding:1px 5px; border-radius:4px;">VÍDEO</span>' : ''}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:0.85rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><span style="color:#7048e8;">#${i + 1}</span> ${esc(b.nome)}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                        ${isQuadroFixo ? `
                            <span style="background:${esc(corThumb)}; color:#fff; font-size:0.64rem; font-weight:800; padding:1px 8px; border-radius:999px;"><i class="ph ph-lock-key"></i> FIXO · ${esc(tituloThumb)}</span>
                            <span style="background:#ede9fe; color:#5b21b6; font-size:0.64rem; font-weight:700; padding:1px 7px; border-radius:999px;">Editável por modelo</span>
                        ` : `
                            <span style="background:#f1f5f9; color:#475569; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${b.tipo === 'video' ? 'Vídeo' : 'Imagem'}</span>
                            <span style="background:#ede9fe; color:#6d28d9; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${esc(ROTULO_MODO[b.mobile_modo] || ROTULO_MODO.mesma)}</span>
                            ${nHot ? `<span style="background:#fef3c7; color:#b45309; font-size:0.66rem; font-weight:700; padding:1px 7px; border-radius:999px;">${nHot} link(s)</span>` : ''}
                        `}
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    ${isQuadroFixo ? `
                        <button title="Editar Quadro de Valores deste Modelo" onclick="window.abrirEditorQuadroValoresBox(${b.id})" style="padding:0 10px; height:32px; border:1px solid #c4b5fd; background:#ede9fe; color:#5b21b6; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:800;"><i class="ph ph-sliders-horizontal"></i> Editar Quadro</button>
                    ` : `
                        <button title="Editar" onclick="window.abrirEditorBox(${b.id})" style="width:32px; height:32px; border:1px solid #c4b5fd; background:#f5f3ff; color:#6d28d9; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-pencil-simple"></i></button>
                        <button title="Excluir" onclick="window.excluirBox(${b.id})" style="width:32px; height:32px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="ph ph-trash"></i></button>
                    `}
                </div>
            </div>`;
        }).join('') + (() => {
            const adtList = (window._boxesAditivoCache || []).filter(x => x && x.tipo !== 'quadro_evento');
            if (!adtList.length) return '';
            return `
                <div style="margin-top:8px; padding-top:8px; border-top:2px dashed #c4b5fd; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.75rem; font-weight:800; color:#5b21b6;"><i class="ph ph-image-square"></i> Imagens de Aditivo Anexadas</span>
                    <button type="button" onclick="window.abrirEditorBox(null, 'ADITIVO')" style="background:#6d28d9; color:#fff; border:none; padding:4px 9px; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-plus-circle"></i> + Adicionar Nova</button>
                </div>
            ` + adtList.map((b, i) => `
                <div style="background:#f5f3ff; border:1.5px solid #c4b5fd; border-radius:10px; padding:8px; display:flex; gap:10px; align-items:center;">
                    <div style="width:100px; height:64px; border-radius:7px; overflow:hidden; background:#0f172a; flex-shrink:0;">
                        ${b.tipo === 'video'
                            ? `<video src="${esc(b.url)}#t=0.5" muted preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video>`
                            : `<img src="${esc(b.url)}" alt="" style="width:100%; height:100%; object-fit:cover;">`}
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; font-size:0.82rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><span style="color:#6d28d9;">Aditivo #${i + 1}</span> ${esc(b.nome)}</div>
                        <div style="font-size:0.68rem; color:#6d28d9; font-weight:700; margin-top:2px;">Abaixo do #2 Quadro de Valores</div>
                    </div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        <button title="Editar" onclick="window.abrirEditorBox(${b.id}, 'ADITIVO')" style="height:30px; padding:0 8px; border:1px solid #c4b5fd; background:#fff; color:#6d28d9; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; font-size:0.7rem; font-weight:700;"><i class="ph ph-pencil-simple"></i> Editar</button>
                        <button title="Excluir" onclick="window.excluirBox(${b.id})" style="height:30px; padding:0 8px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; font-size:0.7rem; font-weight:700;"><i class="ph ph-trash"></i> Excluir</button>
                        <button title="Adicionar Nova" onclick="window.abrirEditorBox(null, 'ADITIVO')" style="height:30px; padding:0 8px; border:none; background:#6d28d9; color:#fff; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; font-size:0.7rem; font-weight:700;"><i class="ph ph-plus-circle"></i> + Nova</button>
                    </div>
                </div>
            `).join('');
        })();
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

    /* Combina a lista de boxes do modelo base com os boxes do Aditivo posicionados abaixo do #2 Quadro de Valores */
    window.combinarBoxesComAditivo = function (boxesBase, boxesAditivo) {
        const base = Array.isArray(boxesBase) ? boxesBase : [];
        const extras = (Array.isArray(boxesAditivo) ? boxesAditivo : []).filter(x => x && x.tipo !== 'quadro_evento');
        if (!extras.length) return base;
        const out = [];
        let inseriu = false;
        for (const b of base) {
            out.push(b);
            if (!inseriu && b && b.tipo === 'quadro_evento') {
                extras.forEach(ex => out.push(ex));
                inseriu = true;
            }
        }
        if (!inseriu) extras.forEach(ex => out.push(ex));
        return out;
    };

    /* Renderiza a lista completa de boxes: a imagem do box de Aditivo aparece abaixo do Quadro de Valores,
       logo após o Quadro de Valores terminar. */
    window.renderListaBoxesCompletaHtml = function (listaBoxes, view, opts) {
        opts = opts || {};
        const arr = Array.isArray(listaBoxes) ? listaBoxes : [];
        return arr.map(b => b ? window.boxRenderHtml(b, view, opts) : '').join('');
    };

    window._renderBoxesPreview = function () {
        const prev = document.getElementById('boxes-preview');
        const tog = document.getElementById('boxes-toggle-view');
        if (tog) tog.innerHTML = togglePreviewHtml(window._boxesViewPreview, 'window._setBoxesViewPreview');
        if (!prev) return;
        const view = window._boxesViewPreview;
        const modAtivo = window._boxesModeloAtivo || 'EVENTO';

        let listaParaRender = window._boxesLista;
        let modRef = modAtivo;
        if (modAtivo === 'ADITIVO') {
            modRef = window._boxesModeloBaseAditivo || 'EVENTO';
            listaParaRender = window.combinarBoxesComAditivo(window._boxesListaModeloBase, window._boxesLista);
        } else if ((window._boxesAditivoCache || []).length > 0) {
            listaParaRender = window.combinarBoxesComAditivo(window._boxesLista, window._boxesAditivoCache);
        }

        const html = window.renderListaBoxesCompletaHtml(listaParaRender, view, { mostrarOculto: true, modelo_tipo: modRef });
        prev.innerHTML = moldura(view, html, 'Os boxes aparecem aqui, empilhados na ordem da biblioteca.');
        if (typeof window.ajustarAlturaQuadroValoresBoxes === 'function') {
            requestAnimationFrame(() => window.ajustarAlturaQuadroValoresBoxes(prev));
        }
    };

    window.moverBox = async function (id, direcao) {
        const r = await chamar('POST', `/comercial/boxes/${id}/mover`, { direcao });
        if (r && r.error) { alert(r.error); return; }
        await window.carregarBoxes();
    };

    window.excluirBox = async function (id) {
        const b = (window._boxesLista || []).find(x => x.id === id) || (window._boxesAditivoCache || []).find(x => x.id === id);
        if (b && b.tipo === 'quadro_evento') {
            alert('Este Quadro de Valores é fixo do modelo de proposta e não pode ser excluído.');
            return;
        }
        if (!confirm(`Excluir o box "${b ? b.nome : ''}"? O arquivo será removido.`)) return;
        const r = await chamar('DELETE', `/comercial/boxes/${id}`);
        if (r && r.error) { alert(r.error); return; }
        await window.carregarBoxes();
    };

    /* ── Editor Individual do Quadro de Valores por Modelo de Proposta ────────────── */
    window.abrirEditorQuadroValoresBox = function (boxId) {
        const b = (window._boxesLista || []).find(x => Number(x.id) === Number(boxId));
        if (!b || b.tipo !== 'quadro_evento') return;
        const mod = window.normalizarModeloTipoBox(b.modelo_tipo || window._boxesModeloAtivo || 'EVENTO');
        const cfgAtual = window.obterConfigQuadroModelo(mod, b.config_quadro);

        const ant = document.getElementById('box-quadro-config-overlay');
        if (ant) ant.remove();
        const ov = document.createElement('div');
        ov.id = 'box-quadro-config-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:99996; display:flex; align-items:center; justify-content:center; font-family:Inter, sans-serif;';
        const lbl = 'display:block; font-size:0.74rem; font-weight:700; color:#475569; margin-bottom:4px;';
        const inp = 'width:100%; padding:0.5rem 0.65rem; border:1px solid #cbd5e1; border-radius:7px; font-size:0.84rem; box-sizing:border-box; background:#fff;';

        ov.innerHTML = `
        <div style="background:#fff; width:min(560px, 95vw); border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.4); overflow:hidden; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.85rem 1.2rem; background:#faf5ff; border-bottom:1px solid #ddd6fe;">
                <div>
                    <div style="font-size:0.98rem; font-weight:800; color:#4c1d95;"><i class="ph ph-sliders-horizontal"></i> Editar Quadro de Valores — ${esc(mod)}</div>
                    <div style="font-size:0.72rem; color:#6d28d9;">As alterações abaixo valem exclusivamente para o modelo <b>${esc(mod)}</b>.</div>
                </div>
                <button onclick="document.getElementById('box-quadro-config-overlay')?.remove()" style="background:none; border:none; font-size:1.2rem; color:#64748b; cursor:pointer;">&times;</button>
            </div>
            <div style="padding:1.1rem 1.2rem; display:flex; flex-direction:column; gap:0.85rem;">
                <div>
                    <label style="${lbl}">Nome do Box na Lista *</label>
                    <input type="text" id="bq-cfg-nome" value="${esc(b.nome)}" style="${inp}">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div>
                        <label style="${lbl}">Título no Topo (após PROPOSTA)</label>
                        <input type="text" id="bq-cfg-tipo-titulo" value="${esc(cfgAtual.tipo_titulo || mod)}" style="${inp}">
                    </div>
                    <div>
                        <label style="${lbl}">Rótulo Informações (após INFORMAÇÕES)</label>
                        <input type="text" id="bq-cfg-info-rotulo" value="${esc(cfgAtual.info_rotulo || 'EVENTO:')}" style="${inp}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div>
                        <label style="${lbl}">Título Seção Equipamentos</label>
                        <input type="text" id="bq-cfg-tit-equip" value="${esc(cfgAtual.titulo_equipamentos || 'EQUIPAMENTOS:')}" style="${inp}">
                    </div>
                    <div>
                        <label style="${lbl}">Título Seção Serviços</label>
                        <input type="text" id="bq-cfg-tit-serv" value="${esc(cfgAtual.titulo_servicos || 'SERVIÇOS:')}" style="${inp}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:140px 1fr; gap:0.75rem; align-items:end;">
                    <div>
                        <label style="${lbl}">Cor Principal do Quadro</label>
                        <input type="color" id="bq-cfg-cor" value="${esc(cfgAtual.cor_primaria || '#7b4195')}" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:7px; cursor:pointer; background:#fff; padding:2px;">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; padding-bottom:4px;">
                        <label style="display:flex; align-items:center; gap:7px; font-size:0.78rem; color:#334155; cursor:pointer;">
                            <input type="checkbox" id="bq-cfg-ocultar-evento" ${cfgAtual.ocultar_nome_evento ? 'checked' : ''}> Ocultar linha "Nome do Evento" no cabeçalho
                        </label>
                        <label style="display:flex; align-items:center; gap:7px; font-size:0.78rem; color:#334155; cursor:pointer;">
                            <input type="checkbox" id="bq-cfg-ocultar-fim" ${cfgAtual.ocultar_data_fim ? 'checked' : ''}> Ocultar linha "Fim: DD/MM/AA" no cabeçalho
                        </label>
                        <label style="display:flex; align-items:center; gap:7px; font-size:0.78rem; color:#334155; cursor:pointer;">
                            <input type="checkbox" id="bq-cfg-mostrar-dias" ${cfgAtual.mostrar_dias_evento_item !== false ? 'checked' : ''}> Mostrar "Dia de Evento / Sucção" nos produtos
                        </label>
                    </div>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; padding:0.8rem 1.2rem; background:#f8fafc; border-top:1px solid #e2e8f0;">
                <button onclick="document.getElementById('box-quadro-config-overlay')?.remove()" style="background:#e2e8f0; color:#334155; border:none; padding:0.5rem 1rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;">Cancelar</button>
                <button onclick="window._salvarConfigQuadroValoresBox(${b.id}, '${esc(mod)}')" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1.15rem; border-radius:7px; font-weight:700; font-size:0.8rem; cursor:pointer;"><i class="ph ph-floppy-disk"></i> Salvar Alterações do Modelo</button>
            </div>
        </div>`;
        document.body.appendChild(ov);
    };

    window._salvarConfigQuadroValoresBox = async function (boxId, mod) {
        const nome = (document.getElementById('bq-cfg-nome')?.value || '').trim();
        const cfg = {
            nome_quadro: nome || `Quadro de Valores — ${mod} (Fixo)`,
            tipo_titulo: (document.getElementById('bq-cfg-tipo-titulo')?.value || mod).trim(),
            info_rotulo: (document.getElementById('bq-cfg-info-rotulo')?.value || 'EVENTO:').trim(),
            titulo_equipamentos: (document.getElementById('bq-cfg-tit-equip')?.value || 'EQUIPAMENTOS:').trim(),
            titulo_servicos: (document.getElementById('bq-cfg-tit-serv')?.value || 'SERVIÇOS:').trim(),
            cor_primaria: document.getElementById('bq-cfg-cor')?.value || '#7b4195',
            ocultar_nome_evento: Boolean(document.getElementById('bq-cfg-ocultar-evento')?.checked),
            ocultar_data_fim: Boolean(document.getElementById('bq-cfg-ocultar-fim')?.checked),
            mostrar_dias_evento_item: Boolean(document.getElementById('bq-cfg-mostrar-dias')?.checked)
        };
        window.CONFIG_QUADRO_POR_MODELO[mod] = Object.assign({}, window.CONFIG_QUADRO_POR_MODELO[mod] || {}, cfg);
        const fd = new FormData();
        fd.append('nome', cfg.nome_quadro);
        fd.append('config_quadro', JSON.stringify(cfg));
        const r = await chamar('PUT', `/comercial/boxes/${boxId}`, fd);
        if (!r || !r.success) {
            alert('Erro ao salvar configuração do quadro: ' + ((r && r.error) || 'erro desconhecido'));
            return;
        }
        document.getElementById('box-quadro-config-overlay')?.remove();
        if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso(`Quadro de Valores (${mod}) atualizado!`);
        await window.carregarBoxes();
    };

    /* ── Editor do box de mídia (criador responsivo) ──────────────────────────────── */
    let ed = null;

    const tipoDe = (file) => (file && String(file.type).startsWith('video/')) ? 'video' : 'imagem';
    const edSrcDesktop = () => ed.localUrl || ed.url || '';
    const edTipoDesktop = () => ed.localUrl ? ed.localTipo : (ed.tipo || 'imagem');
    const edSrcMobile = () => ed.localMobileUrl || (ed.removerMobile ? '' : (ed.mobile_url || ''));
    const edTipoMobile = () => ed.localMobileUrl ? ed.localMobileTipo : (ed.mobile_tipo || 'imagem');

    function edHotAtiva() {
        if (ed.view === 'desktop') return edTipoDesktop() === 'video' ? null : ed.hotspots_desktop;
        if (ed.mobile_modo === 'ocultar') return null;
        if (ed.mobile_modo === 'arquivo') return (edSrcMobile() && edTipoMobile() !== 'video') ? ed.hotspots_mobile : null;
        return edTipoDesktop() === 'video' ? null : ed.hotspots_mobile;
    }

    window.abrirEditorBox = function (id, modeloForcado) {
        const b = id ? ((window._boxesLista || []).find(x => x.id === id) || (window._boxesAditivoCache || []).find(x => x.id === id)) : null;
        if (b && b.tipo === 'quadro_evento') {
            window.abrirEditorQuadroValoresBox(b.id);
            return;
        }
        const modeloAlvo = window.normalizarModeloTipoBox(modeloForcado || (b && b.modelo_tipo) || window._boxesModeloAtivo || 'EVENTO');
        ed = {
            id: b ? b.id : null,
            modelo_tipo: modeloAlvo,
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
        const rotuloModelo = modeloAlvo === 'ADITIVO'
            ? 'Aditivo (será exibido abaixo do #2 Quadro de Valores do contrato vinculado)'
            : modeloAlvo;
        ov.innerHTML = `
        <div style="background:#fff; width:min(1240px, 96vw); height:92vh; border-radius:14px; box-shadow:0 25px 50px rgba(0,0,0,0.4); display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1.2rem; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                <div>
                    <div style="font-size:1rem; font-weight:800; color:#1e293b;"><i class="ph ph-image-square" style="color:#7048e8;"></i> ${b ? 'Editar Box' : 'Novo Box'} — <span style="color:#6d28d9;">${esc(rotuloModelo)}</span></div>
                </div>
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
            if (ed.mobile_modo !== 'arquivo') ed.hotspots_mobile = [];
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
            const semHot = Object.assign({}, box, { hotspots_desktop: [], hotspots_mobile: [] });
            conteudo = window.boxRenderHtml(semHot, ed.view, { mostrarOculto: true });
        }
        if (ed.view === 'mobile' && ed.mobile_modo === 'mesma') nota = 'Arraste sobre a imagem para criar as áreas clicáveis do celular. Se não desenhar nenhuma, valem as do desktop (em azul).';
        if (ed.view === 'mobile' && ed.mobile_modo === 'recorte') nota = 'Quadro recortado: ajuste a proporção e o ponto de foco (painel à esquerda) antes de desenhar as áreas clicáveis do celular.';
        prev.innerHTML = moldura(ed.view, conteudo, 'Anexe uma imagem ou vídeo para ver a pré-visualização.') +
            (nota ? `<div style="font-size:0.72rem; color:#475569; margin-top:8px; text-align:center;">${nota}</div>` : '');

        const wrapper = prev.querySelector('div[style*="position:relative"][style*="line-height:0"]');
        if (!wrapper) return;
        const ativa = edHotAtiva();
        const listaMostrar = ativa;
        if (!listaMostrar) return;
        const fantasma = (ed.view === 'mobile' && ed.mobile_modo === 'mesma' && listaMostrar.length === 0) ? (ed.hotspots_desktop || []) : [];
        const fantasmaHtml = fantasma.map((h) =>
            `<div title="Área do desktop (vale no celular enquanto você não desenhar as suas)" style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; border:2px dashed #3b82f6; background:rgba(59,130,246,0.16); pointer-events:none; box-sizing:border-box;">
                <span style="position:absolute; left:0; top:0; background:#3b82f6; color:#fff; font-size:0.6rem; font-weight:800; padding:0 5px; line-height:1.5;">D</span></div>`
        ).join('');
        const layer = document.createElement('div');
        layer.style.cssText = `position:absolute; inset:0; cursor:crosshair; touch-action:none;`;
        layer.innerHTML = fantasmaHtml + listaMostrar.map((h, i) =>
            `<div style="position:absolute; left:${h.x}%; top:${h.y}%; width:${h.w}%; height:${h.h}%; border:2px dashed #f59e0b; background:rgba(245,158,11,0.22); pointer-events:none; box-sizing:border-box;">
                <span style="position:absolute; left:0; top:0; background:#f59e0b; color:#fff; font-size:0.62rem; font-weight:800; padding:0 5px; line-height:1.5;">${i + 1}</span></div>`
        ).join('');
        wrapper.appendChild(layer);
        attachDraw(layer, ativa);
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
            if (ed.view === 'mobile' && ed.mobile_modo === 'ocultar') msg = 'Box oculto no celular.';
            else if (ed.view === 'mobile' && ed.mobile_modo === 'arquivo') msg = 'Anexe uma imagem para o celular para desenhar áreas clicáveis nela.';
            else if (edTipoDesktop() === 'video') msg = 'Áreas clicáveis não estão disponíveis para vídeo.';
            if (ajuda) ajuda.textContent = msg;
            el.innerHTML = '';
            return;
        }
        if (ajuda) ajuda.textContent = (ed.view === 'mobile' ? 'Visão CELULAR: ' : 'Visão DESKTOP: ') + 'arraste sobre a imagem na pré-visualização para desenhar uma área e informe o link. Ele abrirá em uma nova página.';
        const podeCopiar = ed.view === 'mobile' && ed.mobile_modo === 'mesma' && (ed.hotspots_desktop || []).length > 0;
        const btnCopiar = podeCopiar
            ? '<button onclick="window._boxEdCopiarDesktop()" style="align-self:flex-start; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:6px; font-size:0.72rem; font-weight:700; padding:4px 10px; cursor:pointer;"><i class="ph ph-copy"></i> Copiar áreas do desktop para o celular</button>'
            : '';
        if (ajuda && ed.view === 'mobile' && ed.mobile_modo === 'mesma') ajuda.textContent += ' Se nenhuma área for criada no celular, valem as do desktop (em azul).';
        if (!ativa.length) { el.innerHTML = btnCopiar + '<div style="font-size:0.74rem; color:#a16207; font-style:italic;">Nenhuma área desenhada ainda.</div>'; return; }
        el.innerHTML = btnCopiar + ativa.map((h, i) => `
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

    window._boxEdCopiarDesktop = function () {
        ed.hotspots_mobile = JSON.parse(JSON.stringify(ed.hotspots_desktop || []));
        window._boxEdRenderPreview();
        window._boxEdRenderHotLista();
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
        fd.append('modelo_tipo', ed.modelo_tipo || window._boxesModeloAtivo || 'EVENTO');
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
