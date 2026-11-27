/**
 * ============================================================================
 * MÓDULO: COMERCIAL → OS
 * Tela de OS do Comercial (independente da tela de OS da Logística).
 *
 * Regras implementadas:
 *   1. Tipos de OS com ícone na frente (somente leitura na OS criada — vem
 *      direto da tela de Contrato de acordo com as regras de criação da OS):
 *        - 🚚 Envio
 *        - 🔧 Visita técnica
 *        - 💧 Limpa fossa
 *        - 🛒 Compras
 *        - 📦 Equipamentos
 *   2. Uma nova OS nasce com a situação "EM ELABORAÇÃO" (e só passa para
 *      "LIBERADO" quando enviada para a Logística após preencher todos os
 *      campos obrigatórios).
 *   3. Campos somente leitura: Nº da OS (exceto pesquisa), Tipo *, Atendente,
 *      Título *, Data Cadastro *, Dados do Cliente (Cliente com pesquisa, Contato).
 *   4. Quadro "Período e Locação" renomeado para "Entrega, Manutenções e Retiradas"
 *      (sem o campo Dias Contrato):
 *        - Data de Entrega * + Horário da Entrega (ou checkbox "Horário comercial",
 *          pré-selecionado automaticamente apenas quando for contrato do tipo OBRA).
 *        - Data de Retirada * + Horário da Retirada (ou checkbox "Horário comercial",
 *          pré-selecionado automaticamente apenas quando for contrato do tipo OBRA).
 *        - Quando for OBRA: Quantidade de Manutenções selecionada na proposta
 *          (preenchimento automático) e Horário da Manutenção automático como
 *          Horário Comercial.
 *        - Quando for EVENTO: campo para selecionar / definir os dias e horas
 *          do evento (Horário de Início e Horário de Fim de cada dia do evento,
 *          sem opção de horário comercial).
 *   5. Botão "Enviar OS para a Logística" aparece somente quando todos os
 *      campos obrigatórios da OS do Comercial estiverem preenchidos.
 *   6. Quadro "Produtos *":
 *        - Quando for produto com fonte de fornecimento "PRÓPRIO AVULSO" ou
 *          "PACOTE OBRA", associa e exibe o nome padronizado da tela de OS da
 *          Logística com o ícone correto na frente (separando ícones de OBRA e
 *          EVENTO e modelo do equipamento, removendo códigos como
 *          "BANHEIRO QUÍMICO EXTRA LUXO O05XZC" → "🔵 EXL OBRA").
 *   7. Quadro "Serviços" ocultado.
 *   8. Caso o frete seja do tipo FOB (servico_frete_fob === 1 ou tipo_frete === 'FOB'),
 *      exibe o quadro "FOB *" com: Data da Entrega, Data da Retirada, Modelo do
 *      Veículo que fará a retirada/entrega, Placa do Veículo e Nome do Motorista.
 * ============================================================================
 */
(function () {
    'use strict';

    const OS_COMERCIAL_TIPOS_CONFIG = [
        { nome: 'Envio',          icone: '🚚', label: '🚚 Envio' },
        { nome: 'Visita técnica', icone: '🔧', label: '🔧 Visita técnica' },
        { nome: 'Limpa fossa',    icone: '💧', label: '💧 Limpa fossa' },
        { nome: 'Compras',        icone: '🛒', label: '🛒 Compras' },
        { nome: 'Equipamentos',   icone: '📦', label: '📦 Equipamentos' }
    ];

    const OS_COMERCIAL_STATUS_CONFIG = [
        { nome: 'EM ELABORAÇÃO',                bg: '#fef3c7', text: '#b45309', border: '#fcd34d', icon: 'ph-pencil-simple-line' },
        { nome: 'LIBERADO',                      bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: 'ph-check-circle' },
        { nome: 'ENTREGA AGENDADA',              bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', icon: 'ph-calendar-check' },
        { nome: 'ENTREGUE - ACOMPANHAMENTO OS',  bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', icon: 'ph-truck' },
        { nome: 'RETIRADA AGENDADA',             bg: '#fef9c3', text: '#a16207', border: '#fde047', icon: 'ph-calendar-plus' },
        { nome: 'RETIRADA PARCIAL REALIZADA',    bg: '#ffedd5', text: '#c2410c', border: '#fdba74', icon: 'ph-arrows-split' },
        { nome: 'RETIRADA TOTAL REALIZADA',      bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', icon: 'ph-seal-check' }
    ];

    window.OS_COMERCIAL_TIPOS_CONFIG = OS_COMERCIAL_TIPOS_CONFIG;
    window.OS_COMERCIAL_STATUS_CONFIG = OS_COMERCIAL_STATUS_CONFIG;
    window._snapshotsOsComercial = window._snapshotsOsComercial || {};
    window._activeOsComercialTabId = window._activeOsComercialTabId || 'comercial-os';

    const OS_EQUIPAMENTOS_LOGISTICA_CATALOGO = [
        // OBRA
        { nome: 'STD OBRA',                icone: '💙', label: '💙 STD OBRA',                grupo: 'Obra' },
        { nome: 'LX OBRA',                 icone: '🟦', label: '🟦 LX OBRA',                 grupo: 'Obra' },
        { nome: 'EXL OBRA',                icone: '🔵', label: '🔵 EXL OBRA',                grupo: 'Obra' },
        { nome: 'PCD OBRA',                icone: '♿', label: '♿ PCD OBRA',                grupo: 'Obra' },
        { nome: 'CHUVEIRO OBRA',           icone: '🚿', label: '🚿 CHUVEIRO OBRA',           grupo: 'Obra' },
        { nome: 'HIDRÁULICO OBRA',         icone: '🚽', label: '🚽 HIDRÁULICO OBRA',         grupo: 'Obra' },
        { nome: 'MICTÓRIO OBRA',           icone: '💦', label: '💦 MICTÓRIO OBRA',           grupo: 'Obra' },
        { nome: 'PBII OBRA',               icone: '🧼', label: '🧼 PBII OBRA',               grupo: 'Obra' },
        { nome: 'PBIII OBRA',              icone: '🧼', label: '🧼 PBIII OBRA',              grupo: 'Obra' },
        { nome: 'GUARITA INDIVIDUAL OBRA', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL OBRA', grupo: 'Obra' },
        { nome: 'GUARITA DUPLA OBRA',      icone: '⚪', label: '⚪ GUARITA DUPLA OBRA',      grupo: 'Obra' },
        { nome: 'LIMPA FOSSA OBRA',        icone: '💧', label: '💧 LIMPA FOSSA OBRA',        grupo: 'Obra' },
        // EVENTO
        { nome: 'STD EVENTO',                icone: '💜', label: '💜 STD EVENTO',                grupo: 'Evento' },
        { nome: 'LX EVENTO',                 icone: '🟣', label: '🟣 LX EVENTO',                 grupo: 'Evento' },
        { nome: 'EXL EVENTO',                icone: '🟣', label: '🟣 EXL EVENTO',                grupo: 'Evento' },
        { nome: 'PCD EVENTO',                icone: '♿', label: '♿ PCD EVENTO',                grupo: 'Evento' },
        { nome: 'CHUVEIRO EVENTO',           icone: '🚿', label: '🚿 CHUVEIRO EVENTO',           grupo: 'Evento' },
        { nome: 'HIDRÁULICO EVENTO',         icone: '🚽', label: '🚽 HIDRÁULICO EVENTO',         grupo: 'Evento' },
        { nome: 'MICTÓRIO EVENTO',           icone: '💦', label: '💦 MICTÓRIO EVENTO',           grupo: 'Evento' },
        { nome: 'PBII EVENTO',               icone: '🧼', label: '🧼 PBII EVENTO',               grupo: 'Evento' },
        { nome: 'PBIII EVENTO',              icone: '🧼', label: '🧼 PBIII EVENTO',              grupo: 'Evento' },
        { nome: 'GUARITA INDIVIDUAL EVENTO', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL EVENTO', grupo: 'Evento' },
        { nome: 'GUARITA DUPLA EVENTO',      icone: '⚪', label: '⚪ GUARITA DUPLA EVENTO',      grupo: 'Evento' },
        { nome: 'LIMPA FOSSA EVENTO',        icone: '💧', label: '💧 LIMPA FOSSA EVENTO',        grupo: 'Evento' }
    ];

    function obterEquipamentosLogisticaPorModalidadeOs(modalidade) {
        const ehEv = normStr(modalidade) === 'evento';
        return OS_EQUIPAMENTOS_LOGISTICA_CATALOGO.filter(eq =>
            ehEv ? eq.grupo === 'Evento' : eq.grupo === 'Obra'
        );
    }

    function normalizarNomeServicoSemZonaOs(nomeRaw) {
        let s = String(nomeRaw || '').replace(/^\d+\s*-\s*/, '').trim();
        if (!s) return '';
        // Remove sufixos de zona / frequência do código de serviço (ex.: "MOBILIZAÇÃO ZC" -> "MOBILIZAÇÃO", "DESMOBILIZAÇÃO ZA" -> "DESMOBILIZAÇÃO", "LIMPA FOSSA 1ZC" -> "LIMPA FOSSA")
        s = s
            .replace(/\s+[-_/]?\s*\d*\s*(?:ZC|ZA|ZV|VZ)\b$/i, '')
            .replace(/\s+\bO0\d[A-Z0-9]*\b$/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        return s;
    }

    function deduplicarServicosCatalogoOs(servicosBrutos) {
        const mapa = new Map();
        (Array.isArray(servicosBrutos) ? servicosBrutos : []).forEach(p => {
            if (!p) return;
            const nomeLimpo = normalizarNomeServicoSemZonaOs(p.nome || p.servico || p.descricao || '');
            if (!nomeLimpo) return;
            const chave = normStr(nomeLimpo);
            if (!chave || mapa.has(chave)) return;
            mapa.set(chave, {
                id: p.id || '',
                nome: nomeLimpo
            });
        });
        return Array.from(mapa.values());
    }

    const state = {
        propostaIdAtiva: null,
        osAtual: null,
        dadosOs: null,
        editadoNaoSalvo: false,
        statusNovoDraft: 'EM ELABORAÇÃO',
        tipoOsDraft: '',
        modalidadeDraft: 'Obra',
        itensProdutosDraft: [],
        itensServicosDraft: [],
        freteFobDraft: false,
        secoesAbertas: {
            periodo: true,
            produtos: true,
            distribuicao: false,
            servicos: true,
            informacoes_compras: true,
            fob: true,
            anexos: false
        },
        anexosAtuais: []
    };

    function limparPrefixoGrupoSeguroOs(val) {
        return String(val ?? '')
            .replace(/^(?:💎|🥇|🥈|🥉|[\uD800-\uDFFF]|\uFFFD|\s)+/gu, '')
            .trim();
    }

    function normStr(s) {
        return limparPrefixoGrupoSeguroOs(s)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function formatarIntervaloHorarioMascaraOs(raw, prevRaw = '') {
        let s = String(raw || '');
        const p = String(prevRaw || '');
        // Permite apagar com Backspace sobre os separadores ' às ' e ':'
        if (p.endsWith(' às ') && s === p.slice(0, -1)) {
            const digs = p.replace(/\D/g, '');
            s = digs.slice(0, Math.max(0, digs.length - 1));
        } else if (p.endsWith(':') && s === p.slice(0, -1)) {
            const digs = p.replace(/\D/g, '');
            s = digs.slice(0, Math.max(0, digs.length - 1));
        }
        let d = s.replace(/\D/g, '').slice(0, 8);
        if (!d) return '';

        const clamp2 = (twoDigits, maxVal) => {
            if (twoDigits.length < 2) return twoDigits;
            const n = parseInt(twoDigits, 10);
            if (isNaN(n)) return twoDigits;
            return String(Math.min(maxVal, Math.max(0, n))).padStart(2, '0');
        };

        if (d.length <= 2) {
            return clamp2(d, 23);
        }
        const h1 = clamp2(d.slice(0, 2), 23);
        if (d.length <= 4) {
            const m1 = clamp2(d.slice(2, 4), 59);
            return `${h1}:${m1}`;
        }
        const m1 = clamp2(d.slice(2, 4), 59);
        if (d.length <= 6) {
            const h2 = clamp2(d.slice(4, 6), 23);
            return `${h1}:${m1} às ${h2}`;
        }
        const h2 = clamp2(d.slice(4, 6), 23);
        const m2 = clamp2(d.slice(6, 8), 59);
        return `${h1}:${m1} às ${h2}:${m2}`;
    }

    function horarioIntervaloValidoOs(val) {
        return /^\d{2}:\d{2}\s+às\s+\d{2}:\d{2}$/.test(String(val || '').trim());
    }

    function extrairContatosInstalacaoIniciaisOs(prop, salvo) {
        const adicionarUnicos = (destino, entrada) => {
            const itens = Array.isArray(entrada)
                ? entrada
                : String(entrada || '').split(/\s*\|\s*|\s*;\s*/);
            itens.forEach(raw => {
                const txt = String(raw || '').trim();
                if (!txt) return;
                const nomeBase = normStr(txt.split(' - ')[0]);
                const jaExiste = destino.some(x => normStr(x) === normStr(txt) || (nomeBase && normStr(String(x).split(' - ')[0]) === nomeBase));
                if (!jaExiste) destino.push(txt);
            });
        };

        const lista = [];
        if (salvo && Array.isArray(salvo.contatos_instalacao) && salvo.contatos_instalacao.length > 0) {
            adicionarUnicos(lista, salvo.contatos_instalacao);
            return lista;
        }
        if (prop) {
            if (prop.contato_instalacao_contrato) {
                adicionarUnicos(lista, prop.contato_instalacao_contrato);
            }
            if (prop.contatos_responsaveis_contrato_json) {
                try {
                    const obj = typeof prop.contatos_responsaveis_contrato_json === 'string'
                        ? JSON.parse(prop.contatos_responsaveis_contrato_json || '{}')
                        : (prop.contatos_responsaveis_contrato_json || {});
                    if (Array.isArray(obj.instalacao_lista) && obj.instalacao_lista.length > 0) {
                        adicionarUnicos(lista, obj.instalacao_lista);
                    } else if (obj.instalacao) {
                        adicionarUnicos(lista, obj.instalacao);
                    }
                } catch (_) {}
            }
        }
        return lista;
    }

    function esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtMoeda(v) {
        const n = Number(v) || 0;
        return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function hojeIso() {
        return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 10);
    }

    function fmtDataBr(iso) {
        const s = String(iso || '').trim().substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—';
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    }

    function obterConfigStatusOs(statusRaw) {
        const sNorm = normStr(statusRaw).toUpperCase();
        return OS_COMERCIAL_STATUS_CONFIG.find(c => normStr(c.nome).toUpperCase() === sNorm)
            || OS_COMERCIAL_STATUS_CONFIG[0];
    }

    function obterConfigTipoOs(tipoRaw) {
        const tNorm = normStr(tipoRaw);
        return OS_COMERCIAL_TIPOS_CONFIG.find(t => normStr(t.nome) === tNorm || normStr(t.label) === tNorm)
            || OS_COMERCIAL_TIPOS_CONFIG[0];
    }

    window.renderBadgeStatusOsComercialHtml = function (statusRaw) {
        const cfg = obterConfigStatusOs(statusRaw);
        return `<span style="display:inline-flex; align-items:center; gap:5px;">
            <span style="background:${cfg.bg}; color:${cfg.text}; border:1px solid ${cfg.border}; padding:1px 9px; border-radius:999px; font-size:0.71rem; font-weight:800; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
                <i class="ph ${cfg.icon}" style="font-size:0.82rem;"></i> ${esc(cfg.nome)}
            </span>
        </span>`;
    };

    function osVeioDeContrato(prop) {
        if (!prop || !prop.id) return false;
        const sitUp = String(prop.situacao_contrato || '').trim().toUpperCase();
        const faseUp = String(prop.fase_negociacao || '').trim().toUpperCase();
        if (sitUp === 'OS AVULSA' || faseUp === 'OS AVULSA') return false;
        return Boolean(String(prop.contrato || '').trim() || String(prop.codigo || '').trim());
    }

    function resolverModalidadeObraEventoOs(prop, dadosOs) {
        if (osVeioDeContrato(prop)) {
            const tipoLimpoUp = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            if (tipoLimpoUp === 'EVENTO' || tipoLimpoUp.includes('EVENTO')) return 'Evento';
            if (tipoLimpoUp.includes('OBRA')) return 'Obra';
            if (dadosOs && (dadosOs.modalidade_os === 'Obra' || dadosOs.modalidade_os === 'Evento')) {
                return dadosOs.modalidade_os;
            }
            if (dadosOs && (dadosOs.modalidade_obra_evento === 'Obra' || dadosOs.modalidade_obra_evento === 'Evento')) {
                return dadosOs.modalidade_obra_evento;
            }
            return 'Obra';
        }
        const modSalva = (dadosOs && (dadosOs.modalidade_os || dadosOs.modalidade_obra_evento)) || '';
        if (modSalva === 'Obra' || modSalva === 'Evento') {
            return modSalva;
        }
        if (prop && prop.tipo) {
            const tipoLimpoUp = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            if (tipoLimpoUp.includes('EVENTO')) return 'Evento';
            if (tipoLimpoUp.includes('OBRA')) return 'Obra';
        }
        return state.modalidadeDraft === 'Evento' ? 'Evento' : 'Obra';
    }

    window.renderBadgeModalidadeObraEventoOsHtml = function (modalidade) {
        const ehEv = String(modalidade || '').trim().toLowerCase() === 'evento';
        const imgSrc = ehEv ? 'assets/evento.png' : 'assets/obra.png';
        const txt = ehEv ? 'Evento' : 'Obra';
        const cor = ehEv ? '#8E24AA' : '#156EB6';
        return `<span style="display:inline-flex; align-items:center; gap:6px;">
            <img src="${imgSrc}" alt="${txt}" style="height:20px; width:auto; object-fit:contain; flex-shrink:0;">
            <span style="font-weight:800; color:${cor}; font-size:0.76rem;">${txt}</span>
        </span>`;
    };

    /**
     * Verifica se um item da proposta possui fonte de fornecimento "PRÓPRIO AVULSO" ou "PACOTE OBRA".
     */
    function itemEhProprioAvulsoOuPacoteObra(it, prop) {
        if (!it) return false;
        let fonte = normStr(it.fonte_fornecimento || '');
        if (!fonte && typeof window.obterFonteFornecimentoEquipamento === 'function') {
            try {
                fonte = normStr(window.obterFonteFornecimentoEquipamento({
                    codigo: it.codigo || '',
                    produto: it.produto || it.descricao || it.nome || ''
                }) || '');
            } catch (_) {}
        }
        if (fonte) {
            return fonte.includes('proprio avulso') || fonte.includes('pacote obra');
        }
        // Fallback para itens antigos gravados antes do campo fonte_fornecimento existir no JSON:
        const nome = String(it.produto || it.descricao || it.nome || '');
        const cod = String(it.codigo || '');
        if (/\bO0\d[A-Z]*(?:ZC|ZA|ZV|VZ)\b/i.test(nome) || /\bO0\d[A-Z]*(?:ZC|ZA|ZV|VZ)\b/i.test(cod)) {
            return true; // Código típico de Pacote Obra
        }
        const tipoCtr = String(prop?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        if (tipoCtr.includes('OBRA')) return true;
        return itemEhEquipamentoLogistica(nome);
    }

    /**
     * Verifica se o nome do produto corresponde a um dos equipamentos existentes na tela de OS da Logística.
     */
    function itemEhEquipamentoLogistica(nomeProd) {
        const n = normStr(nomeProd);
        if (!n) return false;
        return (
            n.includes('standard') || n.includes('standart') || /\bstd\b/.test(n) ||
            n.includes('luxo') || n.includes('luxury') || /\blx\b/.test(n) ||
            n.includes('extra lux') || /\b(exl|elx)\b/.test(n) ||
            n.includes('pcd') || n.includes('pne') || n.includes('deficiente') || n.includes('acessivel') ||
            n.includes('chuveiro') ||
            n.includes('hidraulic') ||
            n.includes('mictorio') || n.includes('kros') ||
            n.includes('pia') || n.includes('pbii') || n.includes('pbiii') || n.includes('lavatorio') ||
            n.includes('guarita') ||
            n.includes('fossa') || n.includes('succao') || n.includes('caminhao') ||
            n.includes('carrinho') ||
            (n.includes('caixa') && n.includes('agua')) ||
            n.includes('banheiro') || n.includes('cabine')
        );
    }

    /**
     * Associa o produto da proposta (quando PRÓPRIO AVULSO ou PACOTE OBRA) ao nome e ícone
     * padronizados da tela de OS da Logística, separando OBRA e EVENTO e modelo do equipamento.
     * Ex: "BANHEIRO QUÍMICO EXTRA LUXO O05XZC" → { associado: true, icone: '🔵', nome: 'EXL OBRA', label: '🔵 EXL OBRA' }
     */
    function associarProdutoComEquipamentoOsLogistica(it, prop) {
        const nomeOriginal = String(it?.produto || it?.descricao || it?.nome || '—').trim();
        if (!itemEhProprioAvulsoOuPacoteObra(it, prop)) {
            return { associado: false, icone: '', nome: nomeOriginal, label: nomeOriginal };
        }

        const n = normStr(nomeOriginal);
        const tipoCtr = String(prop?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const fonteNorm = normStr(it?.fonte_fornecimento || '');
        const temCodObra = /\bO0\d[A-Z]*(?:ZC|ZA|ZV|VZ)\b/i.test(nomeOriginal) || /\bO0\d/i.test(String(it?.codigo || ''));
        const ehContextoObra = tipoCtr.includes('OBRA') || fonteNorm.includes('pacote obra') || temCodObra || n.includes('obra');
        const sufixo = ehContextoObra ? 'OBRA' : 'EVENTO';

        if (n.includes('carrinho')) {
            return { associado: true, icone: '🛤', nome: 'CARRINHO', label: '🛤 CARRINHO' };
        }
        if (n.includes('caixa') && n.includes('agua')) {
            return { associado: true, icone: '🧊', nome: 'CAIXA DAGUA', label: '🧊 CAIXA DAGUA' };
        }
        if (n.includes('fossa') || n.includes('succao') || n.includes('caminhao')) {
            const nm = `LIMPA FOSSA ${sufixo}`;
            return { associado: true, icone: '💧', nome: nm, label: `💧 ${nm}` };
        }
        if (n.includes('extra lux') || /\b(exl|elx)\b/.test(n)) {
            const ic = sufixo === 'OBRA' ? '🔵' : '🟣';
            const nm = `EXL ${sufixo}`;
            return { associado: true, icone: ic, nome: nm, label: `${ic} ${nm}` };
        }
        if (n.includes('luxo') || n.includes('luxury') || /\blx\b/.test(n)) {
            const ic = sufixo === 'OBRA' ? '🟦' : '🟣';
            const nm = `LX ${sufixo}`;
            return { associado: true, icone: ic, nome: nm, label: `${ic} ${nm}` };
        }
        if (n.includes('pcd') || n.includes('pne') || n.includes('deficiente') || n.includes('acessivel')) {
            const nm = `PCD ${sufixo}`;
            return { associado: true, icone: '♿', nome: nm, label: `♿ ${nm}` };
        }
        if (n.includes('chuveiro')) {
            const nm = `CHUVEIRO ${sufixo}`;
            return { associado: true, icone: '🚿', nome: nm, label: `🚿 ${nm}` };
        }
        if (n.includes('hidraulic')) {
            const nm = `HIDRÁULICO ${sufixo}`;
            return { associado: true, icone: '🚽', nome: nm, label: `🚽 ${nm}` };
        }
        if (n.includes('mictorio') || n.includes('kros')) {
            const nm = `MICTÓRIO ${sufixo}`;
            return { associado: true, icone: '💦', nome: nm, label: `💦 ${nm}` };
        }
        if (n.includes('pbiii') || n.includes('pia iii') || n.includes('pia 3') || n.includes('3 torneiras')) {
            const nm = `PBIII ${sufixo}`;
            return { associado: true, icone: '🧼', nome: nm, label: `🧼 ${nm}` };
        }
        if (n.includes('pia') || n.includes('pbii') || n.includes('lavatorio') || n.includes('2 torneiras')) {
            const nm = `PBII ${sufixo}`;
            return { associado: true, icone: '🧼', nome: nm, label: `🧼 ${nm}` };
        }
        if (n.includes('guarita') && n.includes('dupla')) {
            const nm = `GUARITA DUPLA ${sufixo}`;
            return { associado: true, icone: '⚪', nome: nm, label: `⚪ ${nm}` };
        }
        if (n.includes('guarita')) {
            const nm = `GUARITA INDIVIDUAL ${sufixo}`;
            return { associado: true, icone: '⬜', nome: nm, label: `⬜ ${nm}` };
        }
        if (n.includes('standard') || n.includes('standart') || /\bstd\b/.test(n) || n.includes('banheiro') || n.includes('cabine')) {
            const ic = sufixo === 'OBRA' ? '💙' : '💜';
            const nm = `STD ${sufixo}`;
            return { associado: true, icone: ic, nome: nm, label: `${ic} ${nm}` };
        }

        // Se for obra e tiver código final tipo O05XZC mas não caiu nos modelos acima, limpa o código
        if (ehContextoObra) {
            const limpo = nomeOriginal.replace(/\s+\bO0\d[A-Z0-9]*\b/gi, '').replace(/\s+\b(?:ZC|ZA|ZV|VZ)\b$/gi, '').trim();
            return { associado: false, icone: '', nome: limpo, label: limpo };
        }
        return { associado: false, icone: '', nome: nomeOriginal, label: nomeOriginal };
    }

    /**
     * Resolve o Tipo de OS Comercial (Envio, Visita técnica, Limpa fossa, Compras, Equipamentos)
     * direto do contrato:
     * - Contrato do tipo EQUIPAMENTOS sem nenhum equipamento da tela de OS da Logística → "Equipamentos"
     * - Quando tiver algum equipamento da tela de OS da Logística → "Envio"
     * - Contrato LIMPA FOSSA → "Limpa fossa"
     */
    function resolverTipoOsComercial(prop) {
        if (!prop) return state.tipoOsDraft || '';
        const salvo = String(prop.os_tipo_operacao || '').trim();
        if (Object.prototype.hasOwnProperty.call(prop, '_tipoOsManual')) {
            if (!prop._tipoOsManual) return '';
            const mManual = OS_COMERCIAL_TIPOS_CONFIG.find(t => normStr(t.nome) === normStr(prop._tipoOsManual));
            if (mManual) return mManual.nome;
        }
        const matchSalvo = OS_COMERCIAL_TIPOS_CONFIG.find(t => normStr(t.nome) === normStr(salvo));
        if (matchSalvo) return matchSalvo.nome;

        const tipoCtr = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        if (tipoCtr === 'LIMPA FOSSA') return 'Limpa fossa';

        let itensArr = [];
        try {
            itensArr = typeof prop.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop.itens) ? prop.itens : []);
        } catch (_) { itensArr = []; }

        const temEquipLogistica = (Array.isArray(itensArr) ? itensArr : []).some(it => {
            if (!it || it._substituido_por_aditivo) return false;
            return itemEhEquipamentoLogistica(it.produto || it.descricao || it.nome || '');
        });

        if (tipoCtr === 'EQUIPAMENTOS' && !temEquipLogistica) {
            return 'Equipamentos';
        }
        if (temEquipLogistica) {
            return 'Envio';
        }
        if (!osVeioDeContrato(prop)) return '';
        return tipoCtr === 'EQUIPAMENTOS' ? 'Equipamentos' : 'Envio';
    }

    function propostaTemFreteFob(prop) {
        if (!prop || !prop.id) {
            if (state.freteFobDraft) return true;
            const draftServs = Array.isArray(state.itensServicosDraft) ? state.itensServicosDraft : [];
            return draftServs.some(s => Boolean(s && (s.frete_fob || normStr(s.servico || s.produto || s.descricao || '').includes('fob'))));
        }
        if (Number(prop.servico_frete_fob) === 1 || prop.servico_frete_fob === true) return true;
        if (String(prop.tipo_frete || '').trim().toUpperCase() === 'FOB') return true;
        let servs = [];
        try {
            servs = typeof prop.itens_servicos === 'string' ? JSON.parse(prop.itens_servicos || '[]') : (Array.isArray(prop.itens_servicos) ? prop.itens_servicos : []);
        } catch (_) { servs = []; }
        return (Array.isArray(servs) ? servs : []).some(s => Boolean(s && (s.frete_fob || normStr(s?.servico || s?.produto || s?.descricao || '').includes('fob'))));
    }

    function obterListaEnderecosEstadoAtualOs(prop, dadosOs) {
        const domEl = document.getElementById('cos-endereco-instalacao');
        const raw = domEl
            ? String(domEl.value || '')
            : String((prop && prop.id ? prop.endereco_instalacao : (dadosOs && dadosOs.endereco_instalacao_draft)) || '');
        return raw.split(/\s*\|\s*/).map(s => String(s || '').trim()).filter(Boolean);
    }

    function obterMapaLinksMapsEnderecosOs(dadosOs) {
        if (!dadosOs) return {};
        if (!dadosOs.links_maps_por_endereco || typeof dadosOs.links_maps_por_endereco !== 'object' || Array.isArray(dadosOs.links_maps_por_endereco)) {
            dadosOs.links_maps_por_endereco = {};
        }
        if (Array.isArray(dadosOs.enderecos_instalacao_detalhes)) {
            dadosOs.enderecos_instalacao_detalhes.forEach(item => {
                if (!item || !item.endereco) return;
                const k = normStr(item.endereco);
                const lnk = String(item.link_maps || item.google_maps_link || '').trim();
                if (k && lnk && !dadosOs.links_maps_por_endereco[k]) {
                    dadosOs.links_maps_por_endereco[k] = lnk;
                }
            });
        }
        return dadosOs.links_maps_por_endereco;
    }

    function obterLinkMapsDoEnderecoOs(enderecoTexto, dadosOs) {
        const k = normStr(enderecoTexto);
        if (!k || !dadosOs) return '';
        const mapa = obterMapaLinksMapsEnderecosOs(dadosOs);
        return String(mapa[k] || '').trim();
    }

    function linkGoogleMapsValidoOs(urlRaw) {
        const u = String(urlRaw || '').trim();
        if (!u) return false;
        return /^https?:\/\/\S+/i.test(u) || /^(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps|google\.[a-z.]+\/maps)\/\S*/i.test(u);
    }

    function normalizarUrlAbrirMapsOs(urlRaw) {
        const u = String(urlRaw || '').trim();
        if (!u) return '';
        if (/^https?:\/\//i.test(u)) return u;
        return 'https://' + u;
    }

    function obterRegrasProdutosEServicosOs(prop, dadosOs) {
        const tipoOsVal = resolverTipoOsComercial(prop);
        const tNorm = normStr(tipoOsVal);
        const modAtual = resolverModalidadeObraEventoOs(prop, dadosOs);
        const ehEvento = normStr(modAtual) === 'evento';
        const ehObra = !ehEvento;
        const temFob = propostaTemFreteFob(prop);
        const itensAtivos = obterProdutosMescladosOs(prop).filter(it => it && !it._substituido_por_aditivo);
        const servsAtivos = obterServicosMescladosOs(prop).filter(s => s && !s._substituido_por_aditivo);

        // Visibilidade dos quadros conforme Tipo de OS e Obra/Evento:
        // - Compras: não exibe Produtos nem Serviços; exibe apenas o quadro "Informações Importantes"
        // - Limpa fossa: apenas deve ser possível adicionar Serviço (oculta Produtos)
        // - Evento (exceto Limpa fossa e Compras): não deve preencher Serviço (oculta Serviços)
        const ehCompras = (tNorm === 'compras');
        const ehLimpaFossa = (tNorm === 'limpa fossa');
        const ehEquipamentos = (tNorm === 'equipamentos');

        const mostrarQuadroProdutos = !ehCompras && !ehLimpaFossa;
        const mostrarQuadroServicos = !ehCompras && (ehLimpaFossa || ehObra);
        const mostrarQuadroInfoCompras = ehCompras;

        // Regra de obrigatoriedade de Produtos:
        // - Envio e Equipamentos: obrigatório ter produto
        const produtoObrigatorio = mostrarQuadroProdutos && (tNorm === 'envio' || ehEquipamentos);

        // Regra de obrigatoriedade de Serviços:
        // - Limpa fossa: obrigatório selecionar pelo menos 1 serviço
        // - Quando a OS é Obra (exceto Compras): obrigatório ter pelo menos 1 serviço (ou Frete FOB); em Evento (exceto Limpa fossa), nunca exige serviço
        const servicoObrigatorio = mostrarQuadroServicos && (ehLimpaFossa || (ehObra && !temFob));

        return {
            tipoOsVal,
            tNorm,
            ehObra,
            ehEvento,
            ehCompras,
            ehLimpaFossa,
            ehEquipamentos,
            temFob,
            itensAtivos,
            servsAtivos,
            mostrarQuadroProdutos,
            mostrarQuadroServicos,
            mostrarQuadroInfoCompras,
            produtoObrigatorio,
            servicoObrigatorio
        };
    }

    function validarDistribuicaoProdutosEnderecosOs(prop, dadosOs) {
        const listaEnds = obterListaEnderecosEstadoAtualOs(prop, dadosOs);
        const itensAtivos = obterProdutosMescladosOs(prop).filter(it => it && !it._substituido_por_aditivo);
        if (listaEnds.length <= 1 || itensAtivos.length === 0) {
            return { exigido: false, ok: true, pendencias: [] };
        }
        const dist = (dadosOs && Array.isArray(dadosOs.distribuicao_enderecos)) ? dadosOs.distribuicao_enderecos : [];
        const pendencias = [];

        itensAtivos.forEach((it, pIdx) => {
            const qtdTotal = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            const assoc = associarProdutoComEquipamentoOsLogistica(it, prop);
            let soma = 0;
            for (let eIdx = 0; eIdx < listaEnds.length; eIdx++) {
                const q = parseInt(dist[eIdx]?.quantidades?.[pIdx] ?? 0, 10) || 0;
                soma += Math.max(0, q);
            }
            if (soma !== qtdTotal) {
                pendencias.push(`Distribuir ${assoc.nome}: ${soma} de ${qtdTotal} vinculado(s) nos endereços`);
            }
        });

        listaEnds.forEach((endTxt, eIdx) => {
            let somaEnd = 0;
            itensAtivos.forEach((_, pIdx) => {
                somaEnd += Math.max(0, parseInt(dist[eIdx]?.quantidades?.[pIdx] ?? 0, 10) || 0);
            });
            if (somaEnd <= 0) {
                pendencias.push(`Vincular pelo menos 1 produto ao Endereço #${eIdx + 1}`);
            }
        });

        return { exigido: true, ok: pendencias.length === 0, pendencias };
    }

    function formatarTextoQtdManutencoes(raw) {
        const digits = String(raw || '').replace(/\D+/g, '');
        if (!digits) return '';
        const n = parseInt(digits, 10);
        return (!isNaN(n) && n > 0) ? `${n}x` : '';
    }

    function extrairQuantidadeManutencoesProposta(prop) {
        if (!prop) return '';
        let itens = [];
        try {
            itens = typeof prop.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop.itens) ? prop.itens : []);
        } catch (_) { itens = []; }
        for (const it of (Array.isArray(itens) ? itens : [])) {
            if (!it || it._substituido_por_aditivo) continue;
            const m = parseInt(it.manut_semana, 10);
            if (m > 0) return `${m}x`;
            const nome = String(it.produto || it.descricao || it.nome || '');
            const matchCod = nome.match(/\bO0(\d)[A-Z]*(?:ZC|ZA|ZV|VZ)\b/i);
            if (matchCod && parseInt(matchCod[1], 10) > 0) {
                return `${parseInt(matchCod[1], 10)}x`;
            }
        }
        return '1x';
    }

    function extrairDiasEventoInicialDaProposta(prop) {
        if (!prop) return [];
        const mapDias = new Map();
        let itens = [];
        try {
            itens = typeof prop.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop.itens) ? prop.itens : []);
        } catch (_) { itens = []; }
        const hIniPad = String(prop.hora_inicio || '08:00').trim() || '08:00';
        const hFimPad = String(prop.hora_fim || '18:00').trim() || '18:00';

        (Array.isArray(itens) ? itens : []).forEach(it => {
            if (!it || it._substituido_por_aditivo) return;
            const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento : [];
            const horariosObj = (it.dias_evento_horarios && typeof it.dias_evento_horarios === 'object') ? it.dias_evento_horarios : {};
            diasArr.forEach(dRaw => {
                const dIso = String(dRaw || '').trim().substring(0, 10);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dIso)) return;
                if (!mapDias.has(dIso)) {
                    const hDia = horariosObj[dIso] || {};
                    mapDias.set(dIso, {
                        data: dIso,
                        hora_inicio: String(hDia.inicio || hDia.hora_inicio || hIniPad).trim() || '08:00',
                        hora_fim: String(hDia.fim || hDia.hora_fim || hFimPad).trim() || '18:00'
                    });
                }
            });
        });

        if (mapDias.size === 0 && prop.periodo_inicio) {
            const dIni = String(prop.periodo_inicio || '').trim().substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dIni)) {
                mapDias.set(dIni, { data: dIni, hora_inicio: hIniPad, hora_fim: hFimPad });
            }
        }

        return Array.from(mapDias.values()).sort((a, b) => a.data.localeCompare(b.data));
    }

    function inicializarDadosOsComercial(prop) {
        if (!prop) return null;
        let salvo = {};
        if (prop.os_comercial_dados_json) {
            try {
                salvo = typeof prop.os_comercial_dados_json === 'string'
                    ? JSON.parse(prop.os_comercial_dados_json || '{}')
                    : (prop.os_comercial_dados_json || {});
            } catch (_) { salvo = {}; }
        }

        const tipoLimpoUp = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const modResolvida = salvo.modalidade_os || salvo.modalidade_obra_evento || (tipoLimpoUp === 'EVENTO' || tipoLimpoUp.includes('EVENTO') ? 'Evento' : 'Obra');
        const ehObra = modResolvida === 'Obra';
        const ehEvento = modResolvida === 'Evento';

        const temRetiradaSalva = Boolean(
            String(salvo.data_retirada || '').trim() ||
            String(salvo.hora_retirada || '').trim() ||
            salvo.retirada_horario_comercial
        );

        return {
            modalidade_os: modResolvida,
            modalidade_obra_evento: modResolvida,
            data_entrega: salvo.data_entrega !== undefined ? salvo.data_entrega : '',
            hora_entrega: salvo.hora_entrega !== undefined ? salvo.hora_entrega : '',
            entrega_horario_comercial: ehEvento ? false : Boolean(salvo.entrega_horario_comercial),

            agendar_retirada: ehObra ? (salvo.agendar_retirada !== undefined ? Boolean(salvo.agendar_retirada) : temRetiradaSalva) : false,
            data_retirada: salvo.data_retirada !== undefined ? salvo.data_retirada : '',
            hora_retirada: salvo.hora_retirada !== undefined ? salvo.hora_retirada : '',
            retirada_horario_comercial: ehEvento ? false : Boolean(salvo.retirada_horario_comercial),

            qtd_manutencoes: formatarTextoQtdManutencoes(salvo.qtd_manutencoes) || extrairQuantidadeManutencoesProposta(prop),
            horario_manutencao: salvo.horario_manutencao !== undefined ? salvo.horario_manutencao : '',
            manutencao_horario_comercial: ehEvento ? false : Boolean(salvo.manutencao_horario_comercial),
            dias_semana_manutencao: Array.isArray(salvo.dias_semana_manutencao) ? salvo.dias_semana_manutencao : [],

            dias_evento: Array.isArray(salvo.dias_evento) && salvo.dias_evento.length > 0
                ? salvo.dias_evento
                : extrairDiasEventoInicialDaProposta(prop),

            fob_data_entrega: salvo.fob_data_entrega !== undefined ? salvo.fob_data_entrega : '',
            fob_data_retirada: salvo.fob_data_retirada !== undefined ? salvo.fob_data_retirada : '',
            fob_modelo_veiculo: salvo.fob_modelo_veiculo || '',
            fob_placa_veiculo: salvo.fob_placa_veiculo || '',
            fob_nome_motorista: salvo.fob_nome_motorista || '',

            contatos_instalacao: extrairContatosInstalacaoIniciaisOs(prop, salvo),
            distribuicao_enderecos: Array.isArray(salvo.distribuicao_enderecos) ? salvo.distribuicao_enderecos : [],
            links_maps_por_endereco: (salvo.links_maps_por_endereco && typeof salvo.links_maps_por_endereco === 'object' && !Array.isArray(salvo.links_maps_por_endereco))
                ? { ...salvo.links_maps_por_endereco }
                : {},
            enderecos_instalacao_detalhes: Array.isArray(salvo.enderecos_instalacao_detalhes) ? salvo.enderecos_instalacao_detalhes : [],
            informacoes_importantes: String(salvo.informacoes_importantes || '').trim(),

            enviada_logistica: Boolean(salvo.enviada_logistica)
        };
    }

    /**
     * Verifica se todos os campos obrigatórios da OS do Comercial estão preenchidos
     * para liberar o botão "Enviar OS para a Logística".
     */
    function verificarCamposObrigatoriosOsPreenchidos() {
        const prop = state.osAtual;
        const d = state.dadosOs || {};
        const isNovo = !prop || !prop.id;
        const veioDeContrato = osVeioDeContrato(prop);

        const pendencias = [];
        const modAtual = resolverModalidadeObraEventoOs(prop, d);
        const ehEvento = normStr(modAtual) === 'evento';
        const regrasPS = obterRegrasProdutosEServicosOs(prop, d);
        const temFob = regrasPS.temFob;

        const tipoOsVal = String(document.getElementById('cos-tipo')?.value ?? regrasPS.tipoOsVal ?? '').trim();
        if (!tipoOsVal) pendencias.push('Tipo de OS *');

        const dataCadVal = String(document.getElementById('cos-data-cadastro')?.value ?? (isNovo ? (d.os_criada_em_draft || hojeIso()) : (prop.os_criada_em || hojeIso()))).trim();
        if (!dataCadVal) pendencias.push('Data Cadastro *');

        const tituloVal = String(document.getElementById('cos-titulo-contrato')?.value ?? (isNovo ? (d.titulo_contrato_draft || '') : (prop.titulo_contrato || ''))).trim();
        if (!veioDeContrato && !tituloVal) pendencias.push('Título *');

        const cliVal = limparPrefixoGrupoSeguroOs(document.getElementById('cos-cliente')?.value ?? (isNovo ? (d.cliente_nome_draft || '') : (prop.cliente_nome || '')));
        if (!cliVal) pendencias.push('Cliente *');

        const contatoVal = String(document.getElementById('cos-contato')?.value ?? (isNovo ? (d.contato_nome_draft || '') : (prop.contato_nome || ''))).trim();
        if (!contatoVal) pendencias.push('Contato *');

        const ctsInst = Array.isArray(d.contatos_instalacao)
            ? d.contatos_instalacao.filter(x => Boolean(String(x || '').trim()))
            : extrairContatosInstalacaoIniciaisOs(prop, d);
        if (ctsInst.length === 0) {
            pendencias.push('Contato(s) de Instalação *');
        }

        if (regrasPS.mostrarQuadroInfoCompras) {
            const infoCompVal = String(document.getElementById('cos-info-importantes-compras')?.value ?? d.informacoes_importantes ?? '').trim();
            if (!infoCompVal) {
                pendencias.push('Informações Importantes * (obrigatório para OS de Compras)');
            }
        }
        if (regrasPS.produtoObrigatorio && regrasPS.itensAtivos.length === 0) {
            pendencias.push(`Adicionar pelo menos 1 Produto (obrigatório para OS de ${tipoOsVal || 'Envio/Equipamentos'})`);
        }
        if (regrasPS.servicoObrigatorio && regrasPS.servsAtivos.length === 0) {
            pendencias.push(regrasPS.ehLimpaFossa
                ? 'Selecionar pelo menos 1 Serviço (obrigatório para OS de Limpa fossa)'
                : 'Selecionar pelo menos 1 Serviço ou marcar Frete FOB (obrigatório para OS de Obra)');
        }

        const dataEntregaVal = String(document.getElementById('cos-data-entrega')?.value ?? d.data_entrega ?? '').trim();
        if (!dataEntregaVal) pendencias.push('Data de Entrega *');

        const chkEntCom = document.getElementById('cos-chk-entrega-comercial');
        const entregaComercial = chkEntCom ? Boolean(chkEntCom.checked) : Boolean(d.entrega_horario_comercial);
        const horaEntVal = String(document.getElementById('cos-hora-entrega')?.value ?? d.hora_entrega ?? '').trim();
        if (!entregaComercial && !horarioIntervaloValidoOs(horaEntVal)) {
            pendencias.push('Horário da Entrega * (formato HH:MM às HH:MM ou Horário comercial)');
        }

        const chkAgendarRet = document.getElementById('cos-chk-agendar-retirada');
        const agendarRet = chkAgendarRet ? Boolean(chkAgendarRet.checked) : Boolean(d.agendar_retirada);
        const retiradaObrigatoria = ehEvento || agendarRet;
        if (retiradaObrigatoria) {
            const dataRetVal = String(document.getElementById('cos-data-retirada')?.value ?? d.data_retirada ?? '').trim();
            if (!dataRetVal) pendencias.push('Data de Retirada *');
            const chkRetCom = document.getElementById('cos-chk-retirada-comercial');
            const retComercial = chkRetCom ? Boolean(chkRetCom.checked) : Boolean(d.retirada_horario_comercial);
            const horaRetVal = String(document.getElementById('cos-hora-retirada')?.value ?? d.hora_retirada ?? '').trim();
            if (!retComercial && !horarioIntervaloValidoOs(horaRetVal)) {
                pendencias.push('Horário da Retirada * (formato HH:MM às HH:MM ou Horário comercial)');
            }
        }

        const listaEndsCheck = obterListaEnderecosEstadoAtualOs(prop, d);
        if (listaEndsCheck.length === 0) {
            pendencias.push('Endereço de Instalação *');
        } else {
            listaEndsCheck.forEach((endTxt, iEnd) => {
                const inpDomMaps = document.getElementById(`cos-end-maps-link-${iEnd}`);
                const linkMapsVal = inpDomMaps
                    ? String(inpDomMaps.value || '').trim()
                    : obterLinkMapsDoEnderecoOs(endTxt, d);
                if (!linkMapsVal) {
                    pendencias.push(listaEndsCheck.length > 1
                        ? `Link do Google Maps do Endereço #${iEnd + 1} *`
                        : 'Link do Google Maps do Endereço de Instalação *');
                } else if (!linkGoogleMapsValidoOs(linkMapsVal)) {
                    pendencias.push(listaEndsCheck.length > 1
                        ? `Link do Google Maps válido (https://...) no Endereço #${iEnd + 1} *`
                        : 'Link do Google Maps válido (https://...) no Endereço de Instalação *');
                }
            });
        }

        const checkDist = regrasPS.mostrarQuadroProdutos
            ? validarDistribuicaoProdutosEnderecosOs(prop, d)
            : { exigido: false, ok: true, pendencias: [] };
        if (checkDist.exigido && !checkDist.ok) {
            checkDist.pendencias.forEach(m => pendencias.push(m));
        }

        if (ehEvento) {
            const nomeEvVal = String(document.getElementById('cos-nome-evento')?.value ?? (isNovo ? (d.nome_evento_draft || '') : (prop.nome_evento || ''))).trim();
            if (!veioDeContrato && !nomeEvVal) {
                pendencias.push('Nome do Evento *');
            }
            const dias = Array.isArray(d.dias_evento) ? d.dias_evento : [];
            if (dias.length === 0) {
                pendencias.push('Dias e Horários do Evento *');
            } else {
                const algumIncompleto = dias.some(x => !String(x.data || '').trim() || !String(x.hora_inicio || '').trim() || !String(x.hora_fim || '').trim());
                if (algumIncompleto) pendencias.push('Data / Horário de Início e Fim do Evento *');
            }
        }

        if (temFob) {
            if (!String(d.fob_data_entrega || '').trim()) pendencias.push('FOB: Data da Entrega *');
            if (!String(d.fob_data_retirada || '').trim()) pendencias.push('FOB: Data da Retirada *');
            if (!String(d.fob_modelo_veiculo || '').trim()) pendencias.push('FOB: Modelo do Veículo *');
            if (!String(d.fob_placa_veiculo || '').trim()) pendencias.push('FOB: Placa do Veículo *');
            if (!String(d.fob_nome_motorista || '').trim()) pendencias.push('FOB: Nome do Motorista *');
        }

        return { ok: pendencias.length === 0, pendencias };
    }

    function atualizarVisibilidadeBotaoEnviarLogistica() {
        const btn = document.getElementById('btn-cos-enviar-logistica');
        if (!btn) return;
        const check = verificarCamposObrigatoriosOsPreenchidos();
        // IMPORTANTE: NÃO usar disabled nativo, para permitir clicar no botão cinza e mostrar a lista de campos pendentes!
        btn.disabled = false;
        btn.dataset.bloqueado = check.ok ? '0' : '1';
        btn.style.display = 'inline-flex';
        btn.style.background = check.ok ? '#0284c7' : '#cbd5e1';
        btn.style.color = check.ok ? '#ffffff' : '#64748b';
        btn.style.borderColor = check.ok ? '#0369a1' : '#94a3b8';
        btn.style.cursor = 'pointer';
        btn.style.opacity = check.ok ? '1' : '0.9';
        btn.title = check.ok
            ? 'Enviar OS preenchida para a Logística'
            : `Clique para ver os campos obrigatórios pendentes (${check.pendencias.length})`;
    }

    function contratoEstaAssinado(p) {
        if (!p) return false;
        const sitUp = String(p.situacao_contrato || '').trim().toUpperCase();
        const assSt = String(p.assinafy_status || '').trim().toLowerCase();
        return Boolean(
            sitUp === 'CONTRATO ASSINADO' ||
            sitUp === 'CONTRATO DIGITAL ASSINADO' ||
            sitUp === 'NÃO ASSINA CONTRATO - ENTREGA LIBERADA' ||
            sitUp === 'NAO ASSINA CONTRATO - ENTREGA LIBERADA' ||
            sitUp === 'OS AVULSA' ||
            assSt === 'assinado' || assSt === 'signed' || assSt === 'certificated' ||
            p.assinafy_signed_at || p.assinafy_signed_r2_key ||
            (typeof window.propostaFoiAssinadaViaAssinafy === 'function' && window.propostaFoiAssinadaViaAssinafy(p))
        );
    }

    async function buscarTodasOsDoSistema() {
        let lista = [];
        try {
            if (typeof window.apiGet === 'function') {
                lista = await window.apiGet('/propostas?incluir_os_avulsa=1');
            } else {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch('/api/propostas?incluir_os_avulsa=1', { headers: tk ? { 'Authorization': 'Bearer ' + tk } : {} });
                if (r.ok) lista = await r.json();
            }
        } catch (_) {}
        if (!Array.isArray(lista) || lista.length === 0) {
            lista = Array.isArray(window._propostasData) ? window._propostasData : [];
        }
        return (Array.isArray(lista) ? lista : []).filter(p => {
            const temOs = Boolean(p.numero_os && String(p.numero_os).trim());
            const tipoUp = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
            return temOs && tipoUp !== 'ADITIVO' && contratoEstaAssinado(p);
        });
    }

    function obterTabIdAtivaOsComercial() {
        const tabsArr = (typeof appOpenTabs !== 'undefined' && Array.isArray(appOpenTabs)) ? appOpenTabs : window.appOpenTabs;
        if (Array.isArray(tabsArr)) {
            const ativa = tabsArr.find(t => t && t.active && t.target === 'comercial-os');
            if (ativa && ativa.tabId) {
                window._activeOsComercialTabId = ativa.tabId;
                return ativa.tabId;
            }
        }
        return window._activeOsComercialTabId || 'comercial-os';
    }

    function atualizarTituloAbaSuperior(numOs, tabIdOverride) {
        const tabsArr = (typeof appOpenTabs !== 'undefined' && Array.isArray(appOpenTabs)) ? appOpenTabs : window.appOpenTabs;
        if (!Array.isArray(tabsArr)) return;
        const tabIdAlvo = tabIdOverride || obterTabIdAtivaOsComercial();
        const tabOs = tabsArr.find(t => t && t.tabId === tabIdAlvo)
            || tabsArr.find(t => t && t.target === 'comercial-os' && t.active);
        if (!tabOs) return;
        const numLimpo = String(numOs || '').trim();
        const novoTitulo = numLimpo ? `${numLimpo.padStart(2, '0')} - OS` : 'OS';
        if (tabOs.title !== novoTitulo) {
            tabOs.title = novoTitulo;
            if (typeof renderAppTabs === 'function') renderAppTabs();
        }
    }

    function obterProdutosMescladosOs(prop) {
        if (!prop || !prop.id) {
            return Array.isArray(state.itensProdutosDraft) ? state.itensProdutosDraft.filter(Boolean) : [];
        }
        let itensBase = [];
        try {
            itensBase = typeof prop?.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop?.itens) ? prop.itens : []);
        } catch (_) { itensBase = []; }
        itensBase = Array.isArray(itensBase) ? itensBase.filter(Boolean) : [];
        if (prop && prop.id && osVeioDeContrato(prop) && typeof window.aplicarMesclagemAditivosNoContratoAtivo === 'function') {
            try {
                const mesclados = window.aplicarMesclagemAditivosNoContratoAtivo(prop, itensBase, []);
                if (mesclados && Array.isArray(mesclados.produtos)) {
                    return mesclados.produtos.filter(Boolean);
                }
            } catch (_) {}
        }
        return itensBase;
    }

    function obterServicosMescladosOs(prop) {
        if (!prop || !prop.id) {
            return Array.isArray(state.itensServicosDraft) ? state.itensServicosDraft.filter(Boolean) : [];
        }
        let servsBase = [];
        try {
            servsBase = typeof prop?.itens_servicos === 'string' ? JSON.parse(prop.itens_servicos || '[]') : (Array.isArray(prop?.itens_servicos) ? prop.itens_servicos : []);
        } catch (_) { servsBase = []; }
        servsBase = Array.isArray(servsBase) ? servsBase.filter(Boolean) : [];
        if (prop && prop.id && osVeioDeContrato(prop) && typeof window.aplicarMesclagemAditivosNoContratoAtivo === 'function') {
            try {
                const mesclados = window.aplicarMesclagemAditivosNoContratoAtivo(prop, [], servsBase);
                if (mesclados && Array.isArray(mesclados.servicos)) {
                    return mesclados.servicos.filter(Boolean);
                }
            } catch (_) {}
        }
        return servsBase;
    }

    function normalizarEstruturaDistribuicaoEnderecos(prop, dadosOs) {
        if (!dadosOs) return [];
        const listaEnds = obterListaEnderecosEstadoAtualOs(prop, dadosOs);
        const itensAtivos = obterProdutosMescladosOs(prop).filter(it => it && !it._substituido_por_aditivo);
        if (listaEnds.length <= 1 || itensAtivos.length === 0) {
            dadosOs.distribuicao_enderecos = [];
            return [];
        }
        const prev = Array.isArray(dadosOs.distribuicao_enderecos) ? dadosOs.distribuicao_enderecos : [];
        const nova = listaEnds.map((endTxt, eIdx) => {
            const existentePorNome = prev.find(d => d && normStr(d.endereco) === normStr(endTxt));
            const origem = existentePorNome || prev[eIdx] || { quantidades: {} };
            const quantidades = {};
            itensAtivos.forEach((it, pIdx) => {
                const maxQtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
                let q = parseInt(origem.quantidades?.[pIdx] ?? 0, 10) || 0;
                if (q < 0) q = 0;
                if (q > maxQtd) q = maxQtd;
                quantidades[pIdx] = q;
            });
            return { endereco: endTxt, quantidades };
        });

        // Garante que a soma em cada produto nunca ultrapasse o total da OS
        itensAtivos.forEach((it, pIdx) => {
            const maxQtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            let acum = 0;
            nova.forEach(entry => {
                const atual = entry.quantidades[pIdx] || 0;
                if (acum + atual > maxQtd) {
                    entry.quantidades[pIdx] = Math.max(0, maxQtd - acum);
                }
                acum += entry.quantidades[pIdx];
            });
        });

        nova.forEach(entry => {
            entry.resumo_itens = itensAtivos.map((it, pIdx) => {
                const q = entry.quantidades[pIdx] || 0;
                if (q <= 0) return null;
                const assoc = associarProdutoComEquipamentoOsLogistica(it, prop);
                return { produto: assoc.nome, icone: assoc.icone || '', quantidade: q };
            }).filter(Boolean);
        });

        dadosOs.distribuicao_enderecos = nova;
        return nova;
    }

    function renderDistribuicaoProdutosEnderecosHtml(prop) {
        if (!state.dadosOs) state.dadosOs = {};
        const listaEnds = obterListaEnderecosEstadoAtualOs(prop, state.dadosOs);
        const itensAtivos = obterProdutosMescladosOs(prop).filter(it => it && !it._substituido_por_aditivo);
        if (listaEnds.length <= 1 || itensAtivos.length === 0) {
            return '';
        }
        const dist = normalizarEstruturaDistribuicaoEnderecos(prop, state.dadosOs);
        const tipoOk = Boolean(String(resolverTipoOsComercial(prop) || '').trim());

        const badgesResumoHtml = itensAtivos.map((it, pIdx) => {
            const qtdTotal = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            const assoc = associarProdutoComEquipamentoOsLogistica(it, prop);
            const alocado = dist.reduce((acc, d) => acc + (parseInt(d.quantidades?.[pIdx] ?? 0, 10) || 0), 0);
            const falta = qtdTotal - alocado;
            const completo = falta === 0;
            return `<span id="cos-dist-resumo-prod-${pIdx}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:800; background:${completo ? '#dcfce7' : '#ffedd5'}; color:${completo ? '#15803d' : '#c2410c'}; border:1px solid ${completo ? '#86efac' : '#fdba74'};">
                <span>${assoc.icone ? assoc.icone + ' ' : ''}${esc(assoc.nome)}:</span>
                <span>${alocado} / ${qtdTotal}</span>
                <span>${completo ? '✓' : `(Falta ${falta})`}</span>
            </span>`;
        }).join('');

        const cardsEnderecosHtml = listaEnds.map((endTxt, eIdx) => {
            const somaEnd = itensAtivos.reduce((acc, _, pIdx) => acc + (parseInt(dist[eIdx]?.quantidades?.[pIdx] ?? 0, 10) || 0), 0);
            const itensInputsHtml = itensAtivos.map((it, pIdx) => {
                const qtdTotal = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
                const assoc = associarProdutoComEquipamentoOsLogistica(it, prop);
                const valAtual = parseInt(dist[eIdx]?.quantidades?.[pIdx] ?? 0, 10) || 0;
                return `<div style="display:inline-flex; align-items:center; gap:6px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:7px; padding:4px 8px;">
                    <span style="font-size:0.73rem; font-weight:700; color:#1e293b; white-space:nowrap;">${assoc.icone ? assoc.icone + ' ' : ''}${esc(assoc.nome)} <span style="color:#64748b; font-weight:600;">(de ${qtdTotal})</span></span>
                    <div style="display:inline-flex; align-items:center; gap:2px;">
                        <button type="button" ${!tipoOk ? 'disabled' : ''} onclick="window._comercialOS.ajustarDeltaDistribuicao(${eIdx}, ${pIdx}, -1)"
                            style="width:22px !important; height:22px !important; padding:0 !important; background:#e2e8f0; color:#334155; border:none; font-weight:800;">-</button>
                        <input type="number" id="cos-dist-inp-${eIdx}-${pIdx}" min="0" max="${qtdTotal}" value="${valAtual}" ${!tipoOk ? 'disabled' : ''}
                            oninput="window._comercialOS.atualizarQtdProdutoNoEndereco(${eIdx}, ${pIdx}, this.value)"
                            style="width:48px !important; height:22px !important; text-align:center; font-weight:800; padding:0 4px !important;">
                        <button type="button" ${!tipoOk ? 'disabled' : ''} onclick="window._comercialOS.ajustarDeltaDistribuicao(${eIdx}, ${pIdx}, 1)"
                            style="width:22px !important; height:22px !important; padding:0 !important; background:#dbeafe; color:#1d4ed8; border:none; font-weight:800;">+</button>
                    </div>
                </div>`;
            }).join('');

            return `<div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:7px 10px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                    <div style="display:inline-flex; align-items:center; gap:6px; min-width:0; flex:1;">
                        <span style="background:#10b981; color:#fff; border-radius:999px; padding:1px 7px; font-size:0.68rem; font-weight:800; flex-shrink:0;">Endereço #${eIdx + 1}</span>
                        <span style="font-size:0.74rem; font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(endTxt)}">${esc(endTxt)}</span>
                    </div>
                    <span id="cos-dist-total-end-${eIdx}" style="font-size:0.7rem; font-weight:800; padding:1px 8px; border-radius:999px; background:${somaEnd > 0 ? '#eff6ff' : '#fee2e2'}; color:${somaEnd > 0 ? '#1d4ed8' : '#b91c1c'}; border:1px solid ${somaEnd > 0 ? '#bfdbfe' : '#fecaca'};">
                        ${somaEnd > 0 ? `${somaEnd} unid. neste endereço` : 'Nenhum produto vinculado'}
                    </span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
                    ${itensInputsHtml}
                </div>
            </div>`;
        }).join('');

        const distAberto = Boolean(state.secoesAbertas.distribuicao);
        const checkDistAtual = validarDistribuicaoProdutosEnderecosOs(prop, state.dadosOs);
        const statusDistBadge = checkDistAtual.ok
            ? `<span id="cos-dist-header-status" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:1px 8px; border-radius:999px; font-size:0.68rem; font-weight:800;">✓ 100% distribuído</span>`
            : `<span id="cos-dist-header-status" style="background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:1px 8px; border-radius:999px; font-size:0.68rem; font-weight:800;">Pendente vincular</span>`;

        return `<div style="margin-top:0.55rem; background:#fffbeb; border:1.5px solid #f59e0b; border-radius:8px; padding:0.45rem 0.75rem;">
            <div onclick="window._comercialOS.toggleSecao('distribuicao', event)" style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; cursor:pointer; user-select:none;">
                <span style="font-size:0.75rem; font-weight:800; color:#92400e; display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <i class="ph ph-git-branch" style="font-size:0.95rem; color:#d97706;"></i>
                    <span>Vínculo Fracionado de Produtos por Endereço <span style="color:#dc2626;">*</span></span>
                    ${statusDistBadge}
                </span>
                <div style="display:inline-flex; align-items:center; gap:8px;">
                    <span style="font-size:0.69rem; color:#78350f; font-weight:600;">Clique para abrir/minimizar os detalhes</span>
                    <button type="button" onclick="window._comercialOS.toggleSecao('distribuicao', event)"
                        style="width:24px !important; height:22px !important; padding:0 !important; border:1px solid #f59e0b; background:#fef3c7; color:#92400e;">
                        <i id="cos-caret-distribuicao" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${distAberto ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                    </button>
                </div>
            </div>
            <div id="cos-secao-distribuicao-body" style="display:${distAberto ? 'block' : 'none'}; margin-top:8px; padding-top:7px; border-top:1px dashed #fcd34d;">
                <div style="font-size:0.7rem; color:#78350f; font-weight:600; margin-bottom:6px;">Altere a quantidade em um endereço para calcular o restante automaticamente:</div>
                <div id="cos-dist-resumo-bar" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:7px;">
                    ${badgesResumoHtml}
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    ${cardsEnderecosHtml}
                </div>
            </div>
        </div>`;
    }

    function obterContagemEnderecosDoProdutoOs(prop, dadosOs, prodAtivoIdx, listaEnds) {
        const totalEnds = Array.isArray(listaEnds) ? listaEnds.length : 0;
        if (totalEnds === 0) return 0;
        if (totalEnds === 1) return 1;
        const dist = (dadosOs && Array.isArray(dadosOs.distribuicao_enderecos)) ? dadosOs.distribuicao_enderecos : [];
        let comQtd = 0;
        for (let eIdx = 0; eIdx < totalEnds; eIdx++) {
            const q = parseInt(dist[eIdx]?.quantidades?.[prodAtivoIdx] ?? 0, 10) || 0;
            if (q > 0) comQtd++;
        }
        return comQtd;
    }

    function renderBadgeQtdEnderecosProdutoHtml(qtdEnds, totalEndsOs) {
        if (totalEndsOs <= 0) {
            return `<span style="color:#94a3b8; font-size:0.72rem;">0 endereços</span>`;
        }
        const corBg = qtdEnds > 0 ? '#ecfdf5' : '#fef2f2';
        const corTxt = qtdEnds > 0 ? '#047857' : '#b91c1c';
        const corBd = qtdEnds > 0 ? '#6ee7b7' : '#fecaca';
        const txt = qtdEnds === 1 ? '1 endereço' : `${qtdEnds} endereços`;
        return `<span style="display:inline-flex; align-items:center; gap:4px; background:${corBg}; color:${corTxt}; border:1px solid ${corBd}; padding:1px 8px; border-radius:999px; font-size:0.7rem; font-weight:800; white-space:nowrap;">
            <i class="ph ph-map-pin" style="font-size:0.78rem;"></i> ${txt}
        </span>`;
    }

    function renderProdutosGridHtml(prop) {
        const veioDeCtr = osVeioDeContrato(prop);
        const itensTodos = obterProdutosMescladosOs(prop);
        const itensAtivos = itensTodos.filter(it => it && !it._substituido_por_aditivo);
        const totalCols = veioDeCtr ? 5 : 6;
        const listaEndsOs = obterListaEnderecosEstadoAtualOs(prop, state.dadosOs);
        if (listaEndsOs.length > 1 && itensAtivos.length > 0 && state.dadosOs) {
            normalizarEstruturaDistribuicaoEnderecos(prop, state.dadosOs);
        }

        const badge = document.getElementById('cos-produtos-count-badge');
        const somaQtd = itensAtivos.reduce((acc, it) => acc + (Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1)), 0);
        if (badge) {
            if (itensAtivos.length > 0) {
                badge.style.display = 'inline-flex';
                badge.textContent = `${itensAtivos.length} item(ns) · Qtd. total: ${somaQtd}`;
            } else {
                badge.style.display = 'none';
            }
        }

        if (itensTodos.length === 0) {
            return `<tr><td colspan="${totalCols}" style="text-align:center; color:#94a3b8; padding:1rem; font-size:0.78rem; font-style:italic;">Nenhum produto vinculado a esta OS.</td></tr>`;
        }

        const modAtual = resolverModalidadeObraEventoOs(prop, state.dadosOs);
        const ehEv = normStr(modAtual) === 'evento' || ['EVENTO', 'EQUIPAMENTOS', 'EQUIPAMENTO'].includes(String(prop?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, ''));
        const temAditivosMesclados = itensTodos.some(it => it && (it._from_aditivo_dinamico || it._substituido_por_aditivo));
        let ativoCursor = 0;

        return itensTodos.map((it, idx) => {
            const substPorCod = it._substituido_por_aditivo ? String(it._substituido_por_aditivo) : '';
            const ativoIdxAtual = substPorCod ? -1 : ativoCursor++;
            const assoc = associarProdutoComEquipamentoOsLogistica(it, prop || { tipo: ehEv ? 'EVENTO' : 'OBRA MENSAL' });
            const obs = String(it.observacao || '').trim();
            const qtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = ehEv ? (diasArr.length > 0 ? diasArr.length : Math.max(1, parseInt(it.diarias ?? prop?.dias_contrato ?? 1, 10) || 1)) : 1;
            const numManut = parseInt(String(it.manut_semana || '').replace(/\D+/g, ''), 10) || 0;
            const manutStr = ehEv ? `${nDiarias} diária(s)` : (numManut > 0 ? `${numManut}x/sem.` : '—');
            const ehFromAditivo = Boolean(it._from_aditivo_dinamico);
            const badgeOrigTxt = it._badge_origem ? String(it._badge_origem) : 'Contrato Base';
            const badgeOrigHtml = temAditivosMesclados
                ? `<span style="background:${ehFromAditivo ? '#fef9c3' : '#e0f2fe'}; color:${ehFromAditivo ? '#854d0e' : '#0369a1'}; border:1px solid ${ehFromAditivo ? '#eab308' : '#7dd3fc'}; padding:1px 7px; border-radius:999px; font-size:0.65rem; font-weight:800; white-space:nowrap; display:inline-block; text-decoration:none;">${esc(badgeOrigTxt)}</span>`
                : '';
            const badgeSubHtml = substPorCod
                ? `<span style="background:#e2e8f0; color:#475569; border:1px solid #cbd5e1; padding:1px 7px; border-radius:999px; font-size:0.65rem; font-weight:800; white-space:nowrap; display:inline-block; text-decoration:none;">Substituído pelo Aditivo Nº ${esc(substPorCod)}</span>`
                : '';
            const rowStyle = substPorCod ? 'border-bottom:1px solid #e2e8f0; background:#f8fafc; opacity:0.68;' : 'border-bottom:1px solid #e2e8f0;';
            const strikeStyle = substPorCod ? 'text-decoration:line-through; color:#94a3b8;' : '';
            const qtdEndProd = substPorCod ? 0 : obterContagemEnderecosDoProdutoOs(prop, state.dadosOs, ativoIdxAtual, listaEndsOs);
            const cellEndHtml = substPorCod
                ? '<span style="color:#94a3b8;">—</span>'
                : `<span id="cos-prod-endcount-${ativoIdxAtual}">${renderBadgeQtdEnderecosProdutoHtml(qtdEndProd, listaEndsOs.length)}</span>`;

            return `
                <tr style="${rowStyle}">
                    <td style="padding:6px 8px; font-weight:700; color:#1e293b;">
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <span style="${strikeStyle}">${assoc.icone ? `<span style="font-size:0.92rem; margin-right:4px;">${assoc.icone}</span>` : ''}${esc(assoc.nome)}</span>
                            ${badgeOrigHtml}
                            ${badgeSubHtml}
                        </div>
                    </td>
                    <td style="padding:6px 8px; color:#475569; ${strikeStyle}">${esc(obs || '—')}</td>
                    <td style="padding:6px 6px; text-align:center; font-weight:800; color:#0f172a; ${strikeStyle}">
                        ${!veioDeCtr ? `<input type="number" min="1" value="${qtd}" onchange="window._comercialOS.alterarQtdProdutoOsAvulsa(${idx}, this.value)" style="width:56px !important; text-align:center; font-weight:800;">` : qtd}
                    </td>
                    <td style="padding:6px 6px; text-align:center; color:#475569; font-weight:600; ${strikeStyle}">${esc(manutStr)}</td>
                    <td style="padding:6px 6px; text-align:center;">${cellEndHtml}</td>
                    ${!veioDeCtr ? `<td style="padding:6px; text-align:center;">
                        <button type="button" onclick="window._comercialOS.removerProdutoOsAvulsa(${idx})" title="Remover produto da OS"
                            style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; width:24px !important; padding:0 !important;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>` : ''}
                </tr>
            `;
        }).join('');
    }

    function renderServicosGridHtml(prop) {
        const veioDeCtr = osVeioDeContrato(prop);
        const servsTodos = obterServicosMescladosOs(prop);
        const servsAtivos = servsTodos.filter(s => s && !s._substituido_por_aditivo);
        const totalCols = veioDeCtr ? 2 : 3;

        const badge = document.getElementById('cos-servicos-count-badge');
        if (badge) {
            if (servsAtivos.length > 0) {
                badge.style.display = 'inline-flex';
                badge.textContent = `${servsAtivos.length} serviço(s)`;
            } else {
                badge.style.display = 'none';
            }
        }

        if (servsTodos.length === 0) {
            return `<tr><td colspan="${totalCols}" style="text-align:center; color:#94a3b8; padding:1rem; font-size:0.78rem; font-style:italic;">Nenhum serviço vinculado a esta OS.</td></tr>`;
        }

        return servsTodos.map((s, idx) => {
            const nomeRaw = String(s.servico || s.produto || s.descricao || s.nome || '—').trim();
            const nome = normalizarNomeServicoSemZonaOs(nomeRaw) || nomeRaw;
            const obs = String(s.observacao || '').trim();
            const ehFob = Boolean(s.frete_fob || normStr(nome).includes('fob'));
            const substPorCod = s._substituido_por_aditivo ? String(s._substituido_por_aditivo) : '';
            const strikeStyle = substPorCod ? 'text-decoration:line-through; color:#94a3b8;' : '';
            return `<tr style="border-bottom:1px solid #e2e8f0; ${substPorCod ? 'opacity:0.65; background:#f8fafc;' : ''}">
                <td style="padding:6px 8px; font-weight:700; color:#1e293b; ${strikeStyle}">
                    <span style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span><i class="ph ph-wrench" style="color:#2563eb; margin-right:4px;"></i>${esc(nome)}</span>
                        ${ehFob ? '<span style="background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; padding:1px 7px; border-radius:999px; font-size:0.65rem; font-weight:800;">FRETE FOB</span>' : ''}
                    </span>
                </td>
                <td style="padding:6px 8px; color:#475569; ${strikeStyle}">${esc(obs || '—')}</td>
                ${!veioDeCtr ? `<td style="padding:6px; text-align:center;">
                    <button type="button" onclick="window._comercialOS.removerServicoOsAvulsa(${idx})" title="Remover serviço da OS"
                        style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; width:24px !important; padding:0 !important;">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>` : ''}
            </tr>`;
        }).join('');
    }

    function renderDiasEventoRowsHtml() {
        const d = state.dadosOs;
        const dias = (d && Array.isArray(d.dias_evento)) ? d.dias_evento : [];
        if (dias.length === 0) {
            return `<div style="color:#94a3b8; font-size:0.74rem; font-style:italic; padding:4px 0;">Nenhum dia do evento selecionado. Clique em "+ Adicionar Dia do Evento" ao lado.</div>`;
        }
        return `<div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
            ${dias.map((item, idx) => `
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:0.5rem; align-items:center; background:#fff; padding:4px 8px; border:1px solid #bbf7d0; border-radius:6px;">
                    <div>
                        <label class="prop-lbl">Dia do Evento #${idx + 1} *</label>
                        <input type="date" value="${esc(item.data || '')}"
                            onchange="window._comercialOS.atualizarDiaEvento(${idx}, 'data', this.value)">
                    </div>
                    <div>
                        <label class="prop-lbl">Horário Início do Evento *</label>
                        <input type="time" value="${esc(item.hora_inicio || '08:00')}"
                            onchange="window._comercialOS.atualizarDiaEvento(${idx}, 'hora_inicio', this.value)">
                    </div>
                    <div>
                        <label class="prop-lbl">Horário Fim do Evento *</label>
                        <input type="time" value="${esc(item.hora_fim || '18:00')}"
                            onchange="window._comercialOS.atualizarDiaEvento(${idx}, 'hora_fim', this.value)">
                    </div>
                    <div style="padding-top:14px;">
                        <button type="button" onclick="window._comercialOS.removerDiaEvento(${idx})" title="Remover este dia do evento"
                            style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; width:26px; padding:0;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    function renderFormOS() {
        const container = document.getElementById('view-comercial-os');
        if (!container) return;

        const prop = state.osAtual;
        const isNovo = !prop || !prop.id;
        if (!isNovo && !state.dadosOs) {
            state.dadosOs = inicializarDadosOsComercial(prop);
        }
        const d = state.dadosOs || {
            data_entrega: '',
            hora_entrega: '',
            entrega_horario_comercial: false,
            agendar_retirada: false,
            data_retirada: '',
            hora_retirada: '',
            retirada_horario_comercial: false,
            qtd_manutencoes: '',
            horario_manutencao: '',
            manutencao_horario_comercial: false,
            dias_evento: [],
            fob_data_entrega: '',
            fob_data_retirada: '',
            fob_modelo_veiculo: '',
            fob_placa_veiculo: '',
            fob_nome_motorista: '',
            links_maps_por_endereco: {},
            enderecos_instalacao_detalhes: [],
            informacoes_importantes: ''
        };

        const v = (campo) => prop ? (prop[campo] || '') : '';
        const veioDeContrato = osVeioDeContrato(prop);

        // Data de cadastro = data de criação da OS (os_criada_em)
        const dataCadastroOs = isNovo
            ? ((state.dadosOs && state.dadosOs.os_criada_em_draft) || hojeIso())
            : (String(v('os_criada_em') || '').trim().substring(0, 10) || hojeIso());

        // Uma nova OS nasce com a situação de EM ELABORAÇÃO
        const statusOsAtual = obterConfigStatusOs(isNovo ? (state.statusNovoDraft || 'EM ELABORAÇÃO') : (v('status_os') || 'EM ELABORAÇÃO')).nome;
        const tipoOsResolvido = resolverTipoOsComercial(prop);
        const tipoOsPreenchido = Boolean(String(tipoOsResolvido || '').trim());
        const modalidadeAtual = resolverModalidadeObraEventoOs(prop, d);
        const ehEvento = normStr(modalidadeAtual) === 'evento';
        const ehObra = !ehEvento;

        const clienteNomeRaw = limparPrefixoGrupoSeguroOs(isNovo ? (d.cliente_nome_draft || '') : v('cliente_nome'));
        const clienteNomeFormatado = (clienteNomeRaw && typeof window.formatarNomeClienteComIcone === 'function')
            ? window.formatarNomeClienteComIcone(clienteNomeRaw)
            : clienteNomeRaw;

        const regrasPS = obterRegrasProdutosEServicosOs(prop, d);
        const temFob = regrasPS.temFob;
        const checkObrig = verificarCamposObrigatoriosOsPreenchidos();
        const lockPorTipoAttr = !tipoOsPreenchido ? 'disabled' : '';
        const lockPorTipoTitle = !tipoOsPreenchido ? 'Selecione primeiro o Tipo * de OS para liberar o preenchimento dos demais campos.' : '';
        const lockPorTipoStyle = !tipoOsPreenchido ? 'opacity:0.55; cursor:not-allowed;' : '';
        const podeSalvarOs = (!isNovo && state.editadoNaoSalvo && tipoOsPreenchido) || (isNovo && tipoOsPreenchido && state.editadoNaoSalvo);

        atualizarTituloAbaSuperior(!isNovo ? v('numero_os') : null);

        container.innerHTML = `
            <style>
                #view-comercial-os .prop-lbl,
                #view-comercial-os label:not(.prop-chk-inline-lbl):not(.prop-chk-inline-lbl-blue) {
                    font-weight: 600 !important;
                    font-size: 0.7rem !important;
                    color: #475569 !important;
                    display: block !important;
                    margin-bottom: 2px !important;
                    white-space: nowrap !important;
                    text-transform: none !important;
                    letter-spacing: normal !important;
                }
                #view-comercial-os label.prop-chk-inline-lbl {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                    height: 26px !important;
                    padding: 0 8px !important;
                    margin-bottom: 0 !important;
                    border: 1px solid #86efac !important;
                    border-radius: 4px !important;
                    background: #dcfce7 !important;
                    color: #166534 !important;
                    font-size: 0.72rem !important;
                    font-weight: 700 !important;
                    cursor: pointer !important;
                    white-space: nowrap !important;
                    user-select: none !important;
                    box-sizing: border-box !important;
                }
                #view-comercial-os label.prop-chk-inline-lbl input[type="checkbox"] {
                    margin: 0 !important;
                    width: 13px !important;
                    height: 13px !important;
                    accent-color: #16a34a !important;
                }
                #view-comercial-os label.prop-chk-inline-lbl-blue {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                    height: 26px !important;
                    padding: 0 8px !important;
                    margin-bottom: 0 !important;
                    border: 1px solid #60a5fa !important;
                    border-radius: 4px !important;
                    background: #dbeafe !important;
                    color: #1d4ed8 !important;
                    font-size: 0.72rem !important;
                    font-weight: 700 !important;
                    cursor: pointer !important;
                    white-space: nowrap !important;
                    user-select: none !important;
                    box-sizing: border-box !important;
                }
                #view-comercial-os label.prop-chk-inline-lbl-blue input[type="checkbox"] {
                    margin: 0 !important;
                    width: 13px !important;
                    height: 13px !important;
                    accent-color: #2563eb !important;
                }
                #view-comercial-os h4 {
                    font-size: 0.8rem !important;
                    font-weight: 800 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.04em !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                    padding-bottom: 0.25rem !important;
                    margin: 0.8rem 0 0.5rem 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 0.4rem !important;
                }
                #view-comercial-os input:not([type="checkbox"]):not([type="radio"]),
                #view-comercial-os select {
                    height: 26px !important;
                    padding: 2px 6px !important;
                    font-size: 0.75rem !important;
                    border-radius: 4px !important;
                    border: 1px solid #cbd5e1 !important;
                    background: white !important;
                    color: #1e293b !important;
                    box-sizing: border-box !important;
                    line-height: normal !important;
                    font-family: 'Inter', sans-serif !important;
                    outline: none !important;
                    transition: all 0.2s !important;
                    text-transform: none !important;
                }
                #view-comercial-os input[readonly],
                #view-comercial-os input:disabled,
                #view-comercial-os select:disabled {
                    background: #f8fafc !important;
                    color: #334155 !important;
                }
                #view-comercial-os input#cos-codigo,
                #view-comercial-os input#cos-cliente {
                    background: #ffffff !important;
                }
                #view-comercial-os input:not([type="checkbox"]):not([type="radio"]):focus,
                #view-comercial-os select:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
                }
                #view-comercial-os textarea {
                    padding: 4px 6px !important;
                    font-size: 0.75rem !important;
                    border-radius: 4px !important;
                    border: 1px solid #cbd5e1 !important;
                    background: white !important;
                    color: #1e293b !important;
                    box-sizing: border-box !important;
                    font-family: 'Inter', sans-serif !important;
                    outline: none !important;
                    text-transform: none !important;
                }
                #view-comercial-os button {
                    height: 26px !important;
                    font-size: 0.75rem !important;
                    padding: 0 10px !important;
                    border-radius: 4px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 4px !important;
                    font-weight: 600 !important;
                    font-family: 'Inter', sans-serif !important;
                    cursor: pointer !important;
                }
                #view-comercial-os button#cos-status-custom-btn {
                    display: flex !important;
                    justify-content: space-between !important;
                    text-align: left !important;
                    padding: 0 8px !important;
                    width: 100% !important;
                }
                #view-comercial-os form button[title*="Pesquisar"],
                #view-comercial-os form button[title*="Selecionar Cliente"] {
                    width: 26px !important;
                    padding: 0 !important;
                }
                #view-comercial-os form button i {
                    font-size: 0.85rem !important;
                }
                #view-comercial-os div[style*="display:grid"],
                #view-comercial-os div[style*="display: grid"] {
                    gap: 0.4rem 0.6rem !important;
                }
                #view-comercial-os div[style*="margin-bottom:1rem"],
                #view-comercial-os div[style*="margin-bottom: 1rem"],
                #view-comercial-os div[style*="margin-bottom:0.85rem"],
                #view-comercial-os div[style*="margin-bottom: 0.85rem"] {
                    margin-bottom: 0.5rem !important;
                }
                #view-comercial-os table {
                    font-size: 0.76rem !important;
                }
                #view-comercial-os table th,
                #view-comercial-os table td {
                    padding: 0.3rem 0.45rem !important;
                }
            </style>
            <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0; font-family:'Inter',sans-serif;">
                <!-- Toolbar Superior -->
                <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; position:sticky; top:0; z-index:997; border-top-left-radius:14px; border-top-right-radius:14px;">
                    <div style="display:flex; gap:0.45rem; align-items:center; flex-wrap:wrap; flex:1; width:100%;">
                        <button type="button" id="btn-cos-novo" onclick="window._comercialOS.novaOSNaMesmaAba()"
                            style="background:#3b82f6; color:white; border:none;">
                            <i class="ph ph-file-text"></i> Novo
                        </button>

                        <button type="button" id="btn-cos-salvar" onclick="window._comercialOS.salvarAlteracoesOS()" ${podeSalvarOs ? '' : 'disabled'}
                            style="background:${podeSalvarOs ? '#16a34a' : '#cbd5e1'}; color:${podeSalvarOs ? '#ffffff' : '#64748b'}; border:none; cursor:${podeSalvarOs ? 'pointer' : 'not-allowed'};">
                            <i class="ph ph-check"></i> Salvar
                        </button>

                        <!-- Botão Enviar OS para a Logística: cinza quando houver pendências (clicável para listar campos pendentes) e azul quando tudo preenchido -->
                        <button type="button" id="btn-cos-enviar-logistica" onclick="window._comercialOS.enviarOsParaLogistica()"
                            data-bloqueado="${checkObrig.ok ? '0' : '1'}"
                            title="${checkObrig.ok ? 'Enviar OS preenchida para a Logística' : `Clique para ver os campos obrigatórios pendentes (${checkObrig.pendencias.length})`}"
                            style="display:inline-flex; background:${checkObrig.ok ? '#0284c7' : '#cbd5e1'}; color:${checkObrig.ok ? '#ffffff' : '#64748b'}; border:1px solid ${checkObrig.ok ? '#0369a1' : '#94a3b8'}; font-weight:800; cursor:pointer; opacity:${checkObrig.ok ? '1' : '0.9'};">
                            <i class="ph ph-paper-plane-tilt"></i> Enviar OS para a Logística
                        </button>

                        <div style="margin-left:auto; display:inline-flex; align-items:center; gap:0.45rem;">
                            ${!isNovo && v('contrato') ? `
                                <button type="button" onclick="window.abrirContratoDaProposta(${Number(prop.id)})" title="Abrir o Contrato Nº ${esc(v('contrato'))} vinculado a esta OS"
                                    style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; font-weight:800;">
                                    <i class="ph ph-file-text"></i> Contrato Nº ${esc(v('contrato'))}
                                </button>
                            ` : ''}
                            ${!isNovo && v('codigo') ? `
                                <button type="button" onclick="window.abrirPropostaDiretoId(${Number(prop.id)})" title="Abrir a Proposta Nº ${esc(v('codigo'))} vinculada a esta OS"
                                    style="background:#2563eb; color:#ffffff; border:1px solid #1d4ed8; font-weight:700;">
                                    <i class="ph ph-file-text"></i> Proposta Nº ${esc(v('codigo'))}
                                </button>
                            ` : ''}
                            ${!isNovo ? `
                                <button type="button" onclick="if(typeof abrirLogsAlteracao === 'function') abrirLogsAlteracao(${Number(prop.id)})"
                                    style="background:#7048e8; color:white; border:none;">
                                    <i class="ph ph-clock-counter-clockwise"></i> Histórico
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Corpo do Formulário -->
                <div style="padding:1.25rem 1.5rem;">
                    <form id="form-comercial-os" autocomplete="off" onsubmit="return false;">
                        <!-- Linha 1: Obra / Evento (ao lado esquerdo do Nº da OS), Nº da OS, Tipo *, Atendente, Data Cadastro * -->
                        <div style="display:grid; grid-template-columns:0.95fr 1fr 1.6fr 1.3fr 0.95fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <label class="prop-lbl">Obra / Evento</label>
                                <div id="cos-modalidade-custom-wrap" style="position:relative; width:100%;">
                                    <button type="button" id="cos-modalidade-custom-btn"
                                        ${veioDeContrato ? 'disabled' : ''}
                                        onclick="window._comercialOS.toggleMenuModalidadeOs(event)"
                                        title="${veioDeContrato ? 'A modalidade (Obra / Evento) vem automaticamente do Contrato vinculado e não pode ser alterada.' : 'Selecionar Obra ou Evento'}"
                                        style="width:100% !important; display:flex !important; justify-content:space-between !important; align-items:center !important; padding:0 8px !important; border:1px solid #cbd5e1; background:${veioDeContrato ? '#f8fafc' : '#fff'}; cursor:${veioDeContrato ? 'not-allowed' : 'pointer'};">
                                        <span id="cos-modalidade-custom-badge" style="display:inline-flex; align-items:center; gap:6px;">
                                            ${window.renderBadgeModalidadeObraEventoOsHtml(modalidadeAtual)}
                                        </span>
                                        ${!veioDeContrato ? `<i class="ph ph-caret-down" style="font-size:0.82rem; color:#64748b;"></i>` : `<i class="ph ph-lock-simple" style="font-size:0.78rem; color:#94a3b8;"></i>`}
                                    </button>
                                    <input type="hidden" id="cos-modalidade-os" value="${esc(modalidadeAtual)}">
                                    ${!veioDeContrato ? `
                                        <div id="cos-modalidade-custom-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.14); z-index:1100; padding:6px;">
                                            ${['Obra', 'Evento'].map(mod => `
                                                <div onclick="window._comercialOS.selecionarModalidadeOs('${mod}', event)"
                                                    style="padding:5px 8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background 0.12s;"
                                                    onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                                    ${window.renderBadgeModalidadeObraEventoOsHtml(mod)}
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <div>
                                <label class="prop-lbl">Nº da OS</label>
                                <div style="display:flex; gap:0.25rem; align-items:center;">
                                    <input type="text" id="cos-codigo" value="${isNovo ? '' : esc(String(v('numero_os') || '').toUpperCase())}"
                                        ${!isNovo ? 'readonly' : ''}
                                        placeholder="Nº da OS, cliente, contrato ou proposta..."
                                        title="Pressione Enter ou clique na lupa para pesquisar outra OS"
                                        onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.pesquisarPorCampoOsInput(); }"
                                        style="flex:1; font-weight:700;">
                                    <button type="button" onclick="window._comercialOS.pesquisarPorCampoOsInput()"
                                        style="background:#2563eb; border:none; color:#fff;" title="Pesquisar OS pelo número, cliente, contrato ou proposta">
                                        <i class="ph ph-magnifying-glass"></i>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label class="prop-lbl">Tipo *</label>
                                <select id="cos-tipo"
                                    onchange="window._comercialOS.onChangeTipoOs(this.value)"
                                    title="Selecione o Tipo de OS para habilitar o preenchimento dos demais campos"
                                    style="width:100%; border-color:${!tipoOsPreenchido ? '#2563eb' : '#cbd5e1'} !important; background:#fff !important; font-weight:700;">
                                    <option value="">-- Selecione --</option>
                                    ${OS_COMERCIAL_TIPOS_CONFIG.map(t => `<option value="${esc(t.nome)}" ${(normStr(tipoOsResolvido) === normStr(t.nome)) ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
                                </select>
                            </div>

                            <div onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                                <label class="prop-lbl">Atendente</label>
                                ${(() => {
                                    const gestorPodeEditar = typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial();
                                    const podeEditarAtend = tipoOsPreenchido && (!veioDeContrato || gestorPodeEditar);
                                    const rawAtend = isNovo
                                        ? ((d && d.atendente_draft) || (window.currentUser && (window.currentUser.nome_completo || window.currentUser.nome || window.currentUser.username)) || '')
                                        : v('atendente');
                                    const nomeAtendExib = typeof window.resolverNomeExibicaoAtendenteComercial === 'function'
                                        ? window.resolverNomeExibicaoAtendenteComercial(rawAtend, false)
                                        : (v('atendente_nome') || rawAtend || '');
                                    return `
                                        <div id="cos-atendente-combo-wrap" style="position:relative; width:100%; ${lockPorTipoStyle}">
                                            <input type="text" id="cos-atendente" value="${esc(nomeAtendExib)}"
                                                ${podeEditarAtend ? '' : 'readonly disabled'}
                                                title="${!tipoOsPreenchido ? lockPorTipoTitle : (podeEditarAtend ? 'Selecionar atendente do departamento Comercial' : 'O atendente vem da Proposta/Contrato e apenas o gestor do departamento pode editá-lo.')}"
                                                onfocus="if(!this.disabled && window._comercialOS && typeof window._comercialOS.filtrarDropdownAtendenteOs === 'function') window._comercialOS.filtrarDropdownAtendenteOs('', true);"
                                                onclick="if(!this.disabled && window._comercialOS && typeof window._comercialOS.filtrarDropdownAtendenteOs === 'function') window._comercialOS.filtrarDropdownAtendenteOs('', true);"
                                                oninput="if(window._comercialOS && typeof window._comercialOS.filtrarDropdownAtendenteOs === 'function') window._comercialOS.filtrarDropdownAtendenteOs(this.value, true);"
                                                style="width:100%; ${podeEditarAtend ? 'padding-right:1.6rem !important; background:#fff !important;' : ''}">
                                            ${podeEditarAtend ? `
                                                <button type="button" tabindex="-1" onclick="window._comercialOS.toggleDropdownAtendenteOs(event)"
                                                    style="position:absolute; right:2px; top:50%; transform:translateY(-50%); background:transparent !important; border:none !important; color:#64748b; width:22px !important; height:22px !important; padding:0 !important;">
                                                    <i class="ph ph-caret-down"></i>
                                                </button>
                                            ` : ''}
                                            <div id="cos-atendente-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:200px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.12); z-index:1100;"></div>
                                        </div>
                                    `;
                                })()}
                            </div>

                            <div onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                                <label class="prop-lbl">Data Cadastro *</label>
                                <input type="date" id="cos-data-cadastro" value="${esc(dataCadastroOs)}"
                                    ${(veioDeContrato || !tipoOsPreenchido) ? 'readonly disabled' : ''}
                                    onchange="window._comercialOS.onChangeCampoOsAvulsa('os_criada_em', this.value)"
                                    title="${!tipoOsPreenchido ? lockPorTipoTitle : ''}"
                                    style="width:100%; ${lockPorTipoStyle}">
                            </div>
                        </div>

                        <!-- Linha 2: Título *, Status da OS * (editável; nasce EM ELABORAÇÃO) -->
                        <div style="display:grid; grid-template-columns:1.8fr 1.5fr; gap:1rem; margin-bottom:1rem;" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                            <div>
                                <label class="prop-lbl">Título *</label>
                                <input type="text" id="cos-titulo-contrato" value="${esc(isNovo ? (d.titulo_contrato_draft || '') : v('titulo_contrato'))}"
                                    ${(veioDeContrato || !tipoOsPreenchido) ? 'readonly disabled' : ''}
                                    oninput="window._comercialOS.onChangeCampoOsAvulsa('titulo_contrato', this.value)"
                                    title="${!tipoOsPreenchido ? lockPorTipoTitle : ''}"
                                    placeholder="Título da OS / Contrato..." style="width:100%; ${lockPorTipoStyle}">
                            </div>

                            <div>
                                <label class="prop-lbl">Status da OS *</label>
                                <div id="cos-status-custom-wrap" style="position:relative; width:100%; ${lockPorTipoStyle}">
                                    <button type="button" id="cos-status-custom-btn" ${lockPorTipoAttr} onclick="window._comercialOS.toggleMenuStatusOs(event)"
                                        title="${!tipoOsPreenchido ? lockPorTipoTitle : ''}"
                                        style="border:1px solid #cbd5e1; background:${!tipoOsPreenchido ? '#f8fafc' : '#fff'};">
                                        <span id="cos-status-custom-badge">${window.renderBadgeStatusOsComercialHtml(statusOsAtual)}</span>
                                        <i class="ph ph-caret-down" style="font-size:0.85rem; color:#64748b;"></i>
                                    </button>
                                    <input type="hidden" id="cos-status-os" value="${esc(statusOsAtual)}">
                                    <div id="cos-status-custom-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:280px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(15,23,42,0.14); z-index:1100; padding:6px;">
                                        ${OS_COMERCIAL_STATUS_CONFIG.map(cfg => `
                                            <div onclick="window._comercialOS.selecionarStatusOs('${esc(cfg.nome)}', event)"
                                                style="padding:5px 8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; transition:background 0.12s;"
                                                onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                                ${window.renderBadgeStatusOsComercialHtml(cfg.nome)}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Dados do Cliente -->
                        <div style="background:#fdf2f8; border:1px solid #fbcfe8; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                            <h4 style="margin:0 0 0.35rem !important;">
                                <i class="ph ph-buildings" style="color:#7048e8;"></i> Dados do Cliente <span style="color:#dc2626;">*</span>
                            </h4>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem 0.75rem;">
                                <div>
                                    <label class="prop-lbl">Cliente <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex; gap:0.35rem; align-items:center;">
                                        <input type="text" id="cos-cliente" value="${esc(clienteNomeFormatado)}"
                                            ${!tipoOsPreenchido ? 'disabled' : (veioDeContrato ? 'readonly' : '')}
                                            placeholder="${!tipoOsPreenchido ? 'Selecione primeiro o Tipo * de OS...' : (veioDeContrato ? 'Cliente vinculado ao contrato' : 'Digite o nome do cliente ou clique na lupa para selecionar...')}"
                                            oninput="${!veioDeContrato ? "window._comercialOS.onChangeCampoOsAvulsa('cliente_nome', this.value)" : ''}"
                                            onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); if(${(!veioDeContrato && tipoOsPreenchido) ? 'true' : 'false'}) window._comercialOS.pesquisarPorCampoClienteInput(); }"
                                            style="width:100%;">
                                        <button type="button" ${(!tipoOsPreenchido || veioDeContrato) ? 'disabled' : ''} onclick="window._comercialOS.pesquisarPorCampoClienteInput()"
                                            style="background:#2563eb; color:white; border:none; flex-shrink:0; opacity:${(!tipoOsPreenchido || veioDeContrato) ? '0.5' : '1'}; cursor:${(!tipoOsPreenchido || veioDeContrato) ? 'not-allowed' : 'pointer'};"
                                            title="${veioDeContrato ? 'O cliente vem do Contrato vinculado e não pode ser alterado.' : 'Selecionar Cliente'}">
                                            <i class="ph ph-magnifying-glass"></i>
                                        </button>
                                        <button type="button" ${(!tipoOsPreenchido || veioDeContrato) ? 'disabled' : ''} onclick="window._comercialOS.abrirModalNovoClienteOs(event)"
                                            style="background:#eab308; color:white; border:none; width:26px !important; padding:0 !important; flex-shrink:0; opacity:${(!tipoOsPreenchido || veioDeContrato) ? '0.5' : '1'}; cursor:${(!tipoOsPreenchido || veioDeContrato) ? 'not-allowed' : 'pointer'};"
                                            title="${veioDeContrato ? 'O cliente vem do Contrato vinculado e não pode ser alterado.' : 'Cadastrar Novo Cliente'}">
                                            <i class="ph ph-plus"></i>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="prop-lbl">Contato <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex; gap:0.35rem; align-items:center;">
                                        <div id="cos-contato-combo-wrap" style="position:relative; flex:1; min-width:0;">
                                            <input type="text" id="cos-contato" value="${esc(isNovo ? (d.contato_nome_draft || '') : v('contato_nome'))}"
                                                ${!tipoOsPreenchido ? 'disabled' : ''}
                                                autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other"
                                                placeholder="${!tipoOsPreenchido ? 'Selecione primeiro o Tipo * de OS...' : 'Selecione ou digite o contato do cliente...'}"
                                                onfocus="if(!this.disabled) window._comercialOS.abrirDropdownContatosOs(true);"
                                                onclick="if(!this.disabled) window._comercialOS.abrirDropdownContatosOs(true);"
                                                oninput="window._comercialOS.onInputContatoOs(this.value);"
                                                onkeydown="if(event.key==='Escape'){ const dd=document.getElementById('cos-contato-dropdown'); if(dd) dd.style.display='none'; }"
                                                style="width:100%; padding-right:1.8rem !important; ${tipoOsPreenchido ? 'background:#fff !important;' : ''}">
                                            ${tipoOsPreenchido ? `
                                                <button type="button" tabindex="-1" onclick="window._comercialOS.toggleDropdownContatosOs(event)" title="Selecionar contato do cliente"
                                                    style="position:absolute; right:2px; top:50%; transform:translateY(-50%); background:transparent !important; border:none !important; color:#64748b; width:22px !important; height:22px !important; padding:0 !important;">
                                                    <i class="ph ph-caret-down"></i>
                                                </button>
                                            ` : ''}
                                            <div id="cos-contato-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:220px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.12); z-index:1100;"></div>
                                        </div>
                                        <button type="button" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.abrirModalNovoContatoOs(event)"
                                            style="background:#eab308; color:white; border:none; width:26px !important; padding:0 !important; flex-shrink:0; opacity:${!tipoOsPreenchido ? '0.5' : '1'}; cursor:${!tipoOsPreenchido ? 'not-allowed' : 'pointer'};"
                                            title="Cadastrar Novo Contato">
                                            <i class="ph ph-plus"></i>
                                        </button>
                                    </div>
                                </div>

                                <div style="grid-column: 1 / -1;">
                                    <label class="prop-lbl">Contato(s) de Instalação <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex; gap:0.35rem; align-items:center;">
                                        <div id="cos-contato-inst-combo-wrap" style="position:relative; flex:1; min-width:0;">
                                            <input type="text" id="cos-contato-inst" value=""
                                                ${!tipoOsPreenchido ? 'disabled' : ''}
                                                autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other"
                                                placeholder="${!tipoOsPreenchido ? 'Selecione primeiro o Tipo * de OS...' : 'Selecione um ou mais contatos de instalação (ou digite e pressione Enter)...'}"
                                                onfocus="if(!this.disabled) window._comercialOS.abrirDropdownContatosInstalacaoOs(true);"
                                                onclick="if(!this.disabled) window._comercialOS.abrirDropdownContatosInstalacaoOs(true);"
                                                oninput="window._comercialOS.filtrarDropdownContatosInstalacaoOs(this.value);"
                                                onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.adicionarContatoInstalacaoManualOs(); } else if(event.key==='Escape'){ const dd=document.getElementById('cos-contato-inst-dropdown'); if(dd) dd.style.display='none'; }"
                                                style="width:100%; padding-right:1.8rem !important; ${tipoOsPreenchido ? 'background:#fff !important;' : ''}">
                                            ${tipoOsPreenchido ? `
                                                <button type="button" tabindex="-1" onclick="window._comercialOS.toggleDropdownContatosInstalacaoOs(event)" title="Selecionar contato de instalação"
                                                    style="position:absolute; right:2px; top:50%; transform:translateY(-50%); background:transparent !important; border:none !important; color:#64748b; width:22px !important; height:22px !important; padding:0 !important;">
                                                    <i class="ph ph-caret-down"></i>
                                                </button>
                                            ` : ''}
                                            <div id="cos-contato-inst-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:220px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.12); z-index:1105;"></div>
                                        </div>
                                        <button type="button" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.abrirModalNovoContatoInstalacaoOs(event)"
                                            style="background:#eab308; color:white; border:none; width:26px !important; padding:0 !important; flex-shrink:0; opacity:${!tipoOsPreenchido ? '0.5' : '1'}; cursor:${!tipoOsPreenchido ? 'not-allowed' : 'pointer'};"
                                            title="Cadastrar Novo Contato de Instalação">
                                            <i class="ph ph-plus"></i>
                                        </button>
                                    </div>
                                    <div id="cos-contatos-inst-chips" style="display:none; flex-wrap:wrap; gap:5px; margin-top:5px;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Entrega, Manutenções e Retiradas (antigo Período e Locação, sem Dias Contrato) -->
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                            <div onclick="window._comercialOS.toggleSecao('periodo', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important;">
                                    <i class="ph ph-truck" style="color:#16a34a;"></i> Entrega, Manutenções e Retiradas <span style="color:#dc2626;">*</span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('periodo', event)"
                                    style="width:24px !important; padding:0 !important; border:1px solid #86efac; background:#dcfce7; color:#166534;">
                                    <i id="cos-caret-periodo" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.periodo ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-periodo-body" style="display:${state.secoesAbertas.periodo ? 'block' : 'none'}; margin-top:0.45rem;">
                                <!-- Linha Entrega e Retirada + Horários + Checkbox Horário Comercial / Agendar retirada -->
                                ${(() => {
                                    const mostrarBlocoRetirada = ehEvento || Boolean(d.agendar_retirada);
                                    return `
                                        <div style="display:grid; grid-template-columns:${mostrarBlocoRetirada ? (ehObra ? '1.25fr 1fr' : '1fr 1fr') : '1fr'}; gap:0.6rem; margin-bottom:0.45rem;">
                                            <!-- Bloco Entrega -->
                                            <div style="background:rgba(255,255,255,0.75); border:1px solid #bbf7d0; border-radius:6px; padding:0.45rem 0.6rem;">
                                                <div style="display:grid; grid-template-columns:${ehEvento ? '1fr 1fr' : '1fr 1fr auto auto'}; gap:0.45rem; align-items:end;">
                                                    <div>
                                                        <label class="prop-lbl">Data de Entrega <span style="color:#dc2626;">*</span></label>
                                                        <input type="date" id="cos-data-entrega" value="${esc(d.data_entrega || '')}" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                            onchange="window._comercialOS.onChangeCampoDadosOs('data_entrega', this.value)" style="width:100%;">
                                                    </div>
                                                    <div>
                                                        <label class="prop-lbl">Horário da Entrega <span style="color:#dc2626;">*</span></label>
                                                        <input type="text" id="cos-hora-entrega" inputmode="numeric" maxlength="14"
                                                            data-prev-hora="${esc(d.entrega_horario_comercial ? '' : (d.hora_entrega || ''))}"
                                                            value="${esc(d.entrega_horario_comercial ? '08:00 às 18:00 (Comercial)' : (d.hora_entrega || ''))}"
                                                            placeholder="HH:MM às HH:MM"
                                                            ${(!tipoOsPreenchido || d.entrega_horario_comercial) ? 'disabled' : ''}
                                                            oninput="window._comercialOS.onInputHorarioIntervaloOs(this, 'hora_entrega')" style="width:100%;">
                                                    </div>
                                                    ${!ehEvento ? `
                                                        <div>
                                                            <label class="prop-chk-inline-lbl" title="Selecionar Horário Comercial (08:00 às 18:00) para a entrega">
                                                                <input type="checkbox" id="cos-chk-entrega-comercial" ${d.entrega_horario_comercial ? 'checked' : ''} ${!tipoOsPreenchido ? 'disabled' : ''}
                                                                    onchange="window._comercialOS.onToggleHorarioComercial('entrega', this.checked)">
                                                                <span>Horário comercial</span>
                                                            </label>
                                                        </div>
                                                        <div>
                                                            <label class="prop-chk-inline-lbl-blue" title="Marque para agendar e informar os dados obrigatórios de Retirada">
                                                                <input type="checkbox" id="cos-chk-agendar-retirada" ${d.agendar_retirada ? 'checked' : ''} ${!tipoOsPreenchido ? 'disabled' : ''}
                                                                    onchange="window._comercialOS.onToggleAgendarRetirada(this.checked)">
                                                                <span>Agendar retirada</span>
                                                            </label>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>

                                            ${mostrarBlocoRetirada ? `
                                                <!-- Bloco Retirada -->
                                                <div style="background:rgba(255,255,255,0.75); border:1px solid #bbf7d0; border-radius:6px; padding:0.45rem 0.6rem;">
                                                    <div style="display:grid; grid-template-columns:1fr 1fr ${ehEvento ? '' : 'auto'}; gap:0.45rem; align-items:end;">
                                                        <div>
                                                            <label class="prop-lbl">Data de Retirada <span style="color:#dc2626;">*</span></label>
                                                            <input type="date" id="cos-data-retirada" value="${esc(d.data_retirada || '')}" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                                onchange="window._comercialOS.onChangeCampoDadosOs('data_retirada', this.value)" style="width:100%;">
                                                        </div>
                                                        <div>
                                                            <label class="prop-lbl">Horário da Retirada <span style="color:#dc2626;">*</span></label>
                                                            <input type="text" id="cos-hora-retirada" inputmode="numeric" maxlength="14"
                                                                data-prev-hora="${esc(d.retirada_horario_comercial ? '' : (d.hora_retirada || ''))}"
                                                                value="${esc(d.retirada_horario_comercial ? '08:00 às 18:00 (Comercial)' : (d.hora_retirada || ''))}"
                                                                placeholder="HH:MM às HH:MM"
                                                                ${(!tipoOsPreenchido || d.retirada_horario_comercial) ? 'disabled' : ''}
                                                                oninput="window._comercialOS.onInputHorarioIntervaloOs(this, 'hora_retirada')" style="width:100%;">
                                                        </div>
                                                        ${!ehEvento ? `
                                                            <div>
                                                                <label class="prop-chk-inline-lbl" title="Selecionar Horário Comercial (08:00 às 18:00) para a retirada">
                                                                    <input type="checkbox" id="cos-chk-retirada-comercial" ${d.retirada_horario_comercial ? 'checked' : ''} ${!tipoOsPreenchido ? 'disabled' : ''}
                                                                        onchange="window._comercialOS.onToggleHorarioComercial('retirada', this.checked)">
                                                                    <span>Horário comercial</span>
                                                                </label>
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                })()}

                                <!-- Endereço de Instalação / Nome do Evento (acima de Manutenções e Dias do Evento) -->
                                <div style="display:flex; flex-direction:column; gap:0.4rem; background:rgba(255,255,255,0.75); padding:0.45rem 0.6rem; border:1px solid #bbf7d0; border-radius:6px; margin-bottom:0.45rem;">
                                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                                        ${ehEvento ? `
                                            <div style="display:flex; gap:0.4rem; align-items:center; flex:1 1 240px;">
                                                <span style="font-size:0.74rem; font-weight:700; color:#475569; white-space:nowrap;">Nome do Evento:</span>
                                                <input type="text" id="cos-nome-evento" value="${esc(isNovo ? (d.nome_evento_draft || '') : v('nome_evento'))}"
                                                    ${(veioDeContrato || !tipoOsPreenchido) ? 'readonly disabled' : ''}
                                                    oninput="window._comercialOS.onChangeCampoOsAvulsa('nome_evento', this.value)"
                                                    style="width:100%;">
                                            </div>
                                        ` : ''}
                                        <div style="display:flex; gap:0.4rem; align-items:center; flex:2 1 360px;">
                                            <span style="font-size:0.74rem; font-weight:700; color:#475569; white-space:nowrap;">Instalação *:</span>
                                            <div id="cos-endereco-combo-wrap" style="position:relative; flex:1;">
                                                <input type="text" id="cos-endereco-instalacao" value="${esc(isNovo ? (d.endereco_instalacao_draft || '') : v('endereco_instalacao'))}"
                                                    ${!tipoOsPreenchido ? 'disabled' : ''}
                                                    autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other"
                                                    placeholder="${!tipoOsPreenchido ? 'Selecione primeiro o Tipo * de OS...' : 'Selecione ou digite um ou mais endereços de instalação...'}"
                                                    onfocus="if(!this.disabled) window._comercialOS.abrirDropdownEnderecosOs(true);"
                                                    onclick="if(!this.disabled) window._comercialOS.abrirDropdownEnderecosOs(true);"
                                                    oninput="window._comercialOS.onInputEnderecoOs(this.value);"
                                                    onkeydown="if(event.key==='Escape'){ const dd=document.getElementById('cos-endereco-dropdown'); if(dd) dd.style.display='none'; }"
                                                    style="width:100%; padding-right:1.8rem !important; ${tipoOsPreenchido ? 'background:#fff !important;' : ''}">
                                                ${tipoOsPreenchido ? `
                                                    <button type="button" tabindex="-1" onclick="window._comercialOS.toggleDropdownEnderecosOs(event)" title="Listar endereços do cliente"
                                                        style="position:absolute; right:2px; top:50%; transform:translateY(-50%); background:transparent !important; border:none !important; color:#64748b; width:22px !important; height:22px !important; padding:0 !important;">
                                                        <i class="ph ph-caret-down"></i>
                                                    </button>
                                                ` : ''}
                                                <div id="cos-endereco-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:220px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.12); z-index:1100;"></div>
                                            </div>
                                            <button type="button" id="cos-btn-add-mais-endereco" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                onclick="window._comercialOS.iniciarAdicaoOutroEnderecoOs(event)"
                                                title="Adicionar mais um endereço de instalação na OS"
                                                style="background:#16a34a; color:#fff; border:none; flex-shrink:0; white-space:nowrap; opacity:${!tipoOsPreenchido ? '0.5' : '1'}; cursor:${!tipoOsPreenchido ? 'not-allowed' : 'pointer'};">
                                                <i class="ph ph-map-pin-plus"></i> + Endereço
                                            </button>
                                            <button type="button" id="cos-btn-novo-endereco" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                onclick="window._comercialOS.abrirModalNovoEnderecoOs(event)"
                                                title="Cadastrar Novo Endereço no Cliente"
                                                style="background:#eab308; color:#fff; border:none; width:26px !important; padding:0 !important; flex-shrink:0; opacity:${!tipoOsPreenchido ? '0.5' : '1'}; cursor:${!tipoOsPreenchido ? 'not-allowed' : 'pointer'};">
                                                <i class="ph ph-plus"></i>
                                            </button>
                                            ${v('regiao') ? `<span style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:0.7rem; padding:2px 8px; border-radius:999px; white-space:nowrap;">${esc(v('regiao'))}</span>` : ''}
                                        </div>
                                    </div>
                                    <div id="cos-enderecos-chips" style="display:none; flex-direction:column; gap:6px; align-items:stretch;"></div>
                                </div>

                                <!-- Bloco Manutenções (abaixo de Instalação — sem o campo Quantidade de Manutenções Proposta) -->
                                ${!ehEvento ? `
                                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:end; background:rgba(255,255,255,0.75); border:1px solid #bbf7d0; border-radius:6px; padding:0.45rem 0.6rem;">
                                        <div style="flex:1.3 1 210px;">
                                            <label class="prop-lbl">Horário da Manutenção</label>
                                            <input type="text" id="cos-horario-manutencao" inputmode="numeric" maxlength="14"
                                                data-prev-hora="${esc(d.manutencao_horario_comercial ? '' : (d.horario_manutencao || ''))}"
                                                value="${esc(d.manutencao_horario_comercial ? '08:00 às 18:00 (Horário Comercial)' : (d.horario_manutencao || ''))}"
                                                placeholder="HH:MM às HH:MM"
                                                ${(!tipoOsPreenchido || d.manutencao_horario_comercial) ? 'disabled' : ''}
                                                oninput="window._comercialOS.onInputHorarioIntervaloOs(this, 'horario_manutencao')" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-chk-inline-lbl">
                                                <input type="checkbox" id="cos-chk-manut-comercial" ${d.manutencao_horario_comercial ? 'checked' : ''} ${!tipoOsPreenchido ? 'disabled' : ''}
                                                    onchange="window._comercialOS.onToggleHorarioComercial('manutencao', this.checked)">
                                                <span>Horário comercial</span>
                                            </label>
                                        </div>
                                        <!-- Dias da Semana (ao lado direito do Horário comercial da Manutenção, padrão OS da Logística) -->
                                        <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap; padding-left:4px; border-left:1px solid #cbd5e1;">
                                            <button type="button" id="cos-btn-agenda-endereco" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                onclick="window._comercialOS.buscarAgendaEnderecoOs(event)"
                                                title="Verificar manutenções programadas para esta região (Dias da semana da manutenção)"
                                                style="background:#f59e0b !important; border:none !important; color:#fff !important; width:26px !important; height:26px !important; border-radius:4px !important; padding:0 !important; flex-shrink:0; display:inline-flex !important; align-items:center !important; justify-content:center !important; cursor:${!tipoOsPreenchido ? 'not-allowed' : 'pointer'} !important;">
                                                <i class="ph ph-calendar-check" style="font-size:1rem;"></i>
                                            </button>
                                            ${[
                                                { d: 'Seg', id: 'cos-chk-manut-seg', c: '#ef4444' },
                                                { d: 'Ter', id: 'cos-chk-manut-ter', c: '#f97316' },
                                                { d: 'Qua', id: 'cos-chk-manut-qua', c: '#ca8a04' },
                                                { d: 'Qui', id: 'cos-chk-manut-qui', c: '#16a34a' },
                                                { d: 'Sex', id: 'cos-chk-manut-sex', c: '#3b82f6' },
                                                { d: 'Sáb', id: 'cos-chk-manut-sab', c: '#8b5cf6' },
                                                { d: 'Dom', id: 'cos-chk-manut-dom', c: '#ec4899' }
                                            ].map(item => {
                                                const marcado = Array.isArray(d.dias_semana_manutencao) && d.dias_semana_manutencao.some(x => normStr(x) === normStr(item.d));
                                                return `<label id="lbl-${item.id}" data-cor="${item.c}" onclick="event.stopPropagation()" style="display:inline-flex !important; align-items:center !important; gap:3px !important; height:26px !important; padding:0 7px !important; margin-bottom:0 !important; font-size:0.72rem !important; font-weight:700 !important; border-radius:4px !important; border:1.5px solid ${item.c} !important; background:${marcado ? item.c : '#fff'} !important; color:${marcado ? '#fff' : item.c} !important; cursor:${!tipoOsPreenchido ? 'not-allowed' : 'pointer'} !important; user-select:none !important; box-sizing:border-box !important;">
                                                    <input type="checkbox" id="${item.id}" ${marcado ? 'checked' : ''} ${!tipoOsPreenchido ? 'disabled' : ''}
                                                        onchange="window._comercialOS.toggleDiaSemanaManutencao('${item.d}', this.checked, this.closest('label'))"
                                                        style="margin:0 !important; width:13px !important; height:13px !important; accent-color:${item.c}; cursor:pointer;">
                                                    <span>${item.d}</span>
                                                </label>`;
                                            }).join('')}
                                            <div id="cos-sugestoes-dias-container" style="flex-basis:100%; font-size:0.73rem; padding:2px 4px; display:none;"></div>
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Bloco exclusivo de EVENTO: Dias e Horas do Evento (Início e Fim, sem opção de horário comercial) -->
                                ${ehEvento ? `
                                    <div style="background:rgba(255,255,255,0.85); border:1px solid #86efac; border-radius:6px; padding:0.5rem 0.65rem;">
                                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
                                            <span style="font-size:0.75rem; font-weight:800; color:#166534; display:flex; align-items:center; gap:5px;">
                                                <i class="ph ph-calendar-star"></i> Dias e Horários do Evento (Início e Fim) <span style="color:#dc2626;">*</span>
                                            </span>
                                            <button type="button" onclick="window._comercialOS.adicionarDiaEvento()" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                style="background:#16a34a; color:#fff; border:none;">
                                                <i class="ph ph-plus"></i> Adicionar Dia do Evento
                                            </button>
                                        </div>
                                        <div id="cos-dias-evento-wrap">
                                            ${renderDiasEventoRowsHtml()}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Quadro FOB (exibido apenas quando o frete for do tipo FOB) -->
                        ${temFob ? `
                            <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                                <div onclick="window._comercialOS.toggleSecao('fob', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                    <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important; color:#1e3a8a !important;">
                                        <i class="ph ph-steering-wheel" style="color:#2563eb;"></i> FOB (Retirada / Entrega pelo Cliente) <span style="color:#dc2626;">*</span>
                                    </h4>
                                    <button type="button" onclick="window._comercialOS.toggleSecao('fob', event)"
                                        style="width:24px !important; padding:0 !important; border:1px solid #93c5fd; background:#dbeafe; color:#1e40af;">
                                        <i id="cos-caret-fob" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.fob ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                    </button>
                                </div>
                                <div id="cos-secao-fob-body" style="display:${state.secoesAbertas.fob ? 'block' : 'none'}; margin-top:0.45rem;">
                                    <div style="display:grid; grid-template-columns:1fr 1fr 1.3fr 1fr 1.4fr; gap:0.5rem 0.65rem;">
                                        <div>
                                            <label class="prop-lbl">Data da Entrega (FOB) <span style="color:#dc2626;">*</span></label>
                                            <input type="date" id="cos-fob-data-entrega" value="${esc(d.fob_data_entrega || '')}" ${lockPorTipoAttr}
                                                onchange="window._comercialOS.onChangeCampoDadosOs('fob_data_entrega', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Data da Retirada (FOB) <span style="color:#dc2626;">*</span></label>
                                            <input type="date" id="cos-fob-data-retirada" value="${esc(d.fob_data_retirada || '')}" ${lockPorTipoAttr}
                                                onchange="window._comercialOS.onChangeCampoDadosOs('fob_data_retirada', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Modelo do Veículo <span style="color:#dc2626;">*</span></label>
                                            <input type="text" id="cos-fob-modelo-veiculo" value="${esc(d.fob_modelo_veiculo || '')}" ${lockPorTipoAttr}
                                                placeholder="Modelo do veículo..."
                                                oninput="window._comercialOS.onChangeCampoDadosOs('fob_modelo_veiculo', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Placa do Veículo <span style="color:#dc2626;">*</span></label>
                                            <input type="text" id="cos-fob-placa-veiculo" value="${esc(d.fob_placa_veiculo || '')}" ${lockPorTipoAttr}
                                                placeholder="Ex: ABC-1D23"
                                                oninput="window._comercialOS.onChangeCampoDadosOs('fob_placa_veiculo', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Nome do Motorista <span style="color:#dc2626;">*</span></label>
                                            <input type="text" id="cos-fob-nome-motorista" value="${esc(d.fob_nome_motorista || '')}" ${lockPorTipoAttr}
                                                placeholder="Nome do motorista..."
                                                oninput="window._comercialOS.onChangeCampoDadosOs('fob_nome_motorista', this.value)" style="width:100%;">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Quadro exclusivo para OS do tipo Compras: Informações Importantes em formato de texto -->
                        ${regrasPS.mostrarQuadroInfoCompras ? `
                            <div style="background:#fff7ed; border:1.5px solid #fdba74; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                                <div onclick="window._comercialOS.toggleSecao('informacoes_compras', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                    <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important; color:#9a3412 !important;">
                                        <i class="ph ph-note-pencil" style="color:#ea580c;"></i> Informações Importantes <span style="color:#dc2626;">*</span>
                                    </h4>
                                    <button type="button" onclick="window._comercialOS.toggleSecao('informacoes_compras', event)"
                                        style="width:24px !important; padding:0 !important; border:1px solid #fdba74; background:#ffedd5; color:#9a3412;">
                                        <i id="cos-caret-informacoes_compras" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.informacoes_compras ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                    </button>
                                </div>
                                <div id="cos-secao-informacoes_compras-body" style="display:${state.secoesAbertas.informacoes_compras ? 'block' : 'none'}; margin-top:0.45rem;">
                                    <textarea id="cos-info-importantes-compras" rows="4" ${!tipoOsPreenchido ? 'disabled' : ''}
                                        oninput="window._comercialOS.onChangeCampoDadosOs('informacoes_importantes', this.value)"
                                        placeholder="Descreva aqui as informações importantes referentes a esta OS de Compras..."
                                        style="width:100%; resize:vertical;">${esc(d.informacoes_importantes || '')}</textarea>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Seção: Produtos + Vínculo Fracionado por Endereço -->
                        ${regrasPS.mostrarQuadroProdutos ? `
                        <div style="background:#fefce8; border:1px solid #fde68a; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                            <div onclick="window._comercialOS.toggleSecao('produtos', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important;">
                                    <i class="ph ph-package" style="color:#7048e8;"></i> Produtos <span id="cos-produtos-obrig-ast" style="color:#dc2626; display:${regrasPS.produtoObrigatorio ? 'inline' : 'none'};">*</span>
                                    <span id="cos-produtos-count-badge" style="display:none; background:#fef9c3; color:#854d0e; border:1px solid #fde047; font-size:0.68rem; font-weight:800; padding:1px 8px; border-radius:999px;"></span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('produtos', event)"
                                    style="width:24px !important; padding:0 !important; border:1px solid #fcd34d; background:#fef08a; color:#854d0e;">
                                    <i id="cos-caret-produtos" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.produtos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-produtos-body" style="display:${state.secoesAbertas.produtos ? 'block' : 'none'}; margin-top:0.45rem;">
                                ${!veioDeContrato ? `
                                    <div style="display:grid; grid-template-columns:2.1fr 1.8fr 0.6fr 0.85fr auto; gap:0.45rem; align-items:end; margin-bottom:0.5rem;">
                                        <div>
                                            <label class="prop-lbl">Produto / Equipamento ${regrasPS.produtoObrigatorio ? '<span style="color:#dc2626;">*</span>' : ''}</label>
                                            <div style="display:flex; gap:0.25rem; align-items:center;">
                                                <div id="cos-prod-combo-wrap" style="position:relative; flex:1; min-width:0;">
                                                    <input type="text" id="cos-prod-input" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                        autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false"
                                                        placeholder="${regrasPS.ehEquipamentos ? 'Selecione o produto (Fonte: Parceiros)...' : 'Selecione o equipamento da OS...'}"
                                                        onfocus="if(!this.disabled) window._comercialOS.filtrarDropdownProdutosOs('', true);"
                                                        onclick="if(!this.disabled) window._comercialOS.filtrarDropdownProdutosOs('', true);"
                                                        oninput="window._comercialOS.filtrarDropdownProdutosOs(this.value, true);"
                                                        onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.abrirModalPesquisaProdutosOs(); }"
                                                        style="width:100%; padding-right:1.6rem !important; font-weight:700;">
                                                    ${tipoOsPreenchido ? `
                                                        <button type="button" tabindex="-1" onclick="window._comercialOS.toggleDropdownProdutosOs(event)"
                                                            style="position:absolute; right:2px; top:50%; transform:translateY(-50%); background:transparent !important; border:none !important; color:#64748b; width:22px !important; height:22px !important; padding:0 !important;">
                                                            <i class="ph ph-caret-down"></i>
                                                        </button>
                                                    ` : ''}
                                                    <div id="cos-prod-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; min-width:280px; max-height:240px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.14); z-index:1120;"></div>
                                                </div>
                                                <button type="button" id="btn-cos-pesq-prod" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.abrirModalPesquisaProdutosOs()"
                                                    title="Pesquisar Equipamento da OS"
                                                    style="background:#2563eb; color:#fff; border:none; width:26px !important; padding:0 !important; flex-shrink:0;">
                                                    <i class="ph ph-magnifying-glass"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Observação</label>
                                            <input type="text" id="cos-prod-obs" ${!tipoOsPreenchido ? 'disabled' : ''} placeholder="Observação do produto..." style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Qtd.</label>
                                            <input type="number" id="cos-prod-qtd" min="1" value="1" ${!tipoOsPreenchido ? 'disabled' : ''} style="width:100%; text-align:center; font-weight:700;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">${ehEvento ? 'Diárias' : 'Manut./Sem.'}</label>
                                            ${ehEvento
                                                ? `<input type="number" id="cos-prod-manut" min="1" value="1" ${!tipoOsPreenchido ? 'disabled' : ''} style="width:100%; text-align:center; font-weight:700;">`
                                                : `<div style="position:relative; display:flex; align-items:center; width:100%;">
                                                    <input type="text" id="cos-prod-manut" value="1x" data-prev-manut="1x" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                        oninput="window._comercialOS.onInputManutSemProdutoOs(this)"
                                                        onkeydown="if(event.key==='ArrowUp'){ event.preventDefault(); window._comercialOS.ajustarManutSemProdutoOs(1); } else if(event.key==='ArrowDown'){ event.preventDefault(); window._comercialOS.ajustarManutSemProdutoOs(-1); }"
                                                        style="width:100%; text-align:center; font-weight:700; padding-right:22px !important;">
                                                    <div style="position:absolute; right:2px; top:2px; bottom:2px; width:18px; display:flex; flex-direction:column; border-left:1px solid #cbd5e1; overflow:hidden; border-radius:0 3px 3px 0; background:#f8fafc;">
                                                        <button type="button" tabindex="-1" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.ajustarManutSemProdutoOs(1)" title="Aumentar (máx. 7x)"
                                                            style="flex:1 !important; height:11px !important; width:18px !important; padding:0 !important; border:none !important; border-bottom:1px solid #e2e8f0 !important; border-radius:0 !important; background:transparent !important; color:#334155 !important; line-height:1;">
                                                            <i class="ph ph-caret-up" style="font-size:0.62rem !important;"></i>
                                                        </button>
                                                        <button type="button" tabindex="-1" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.ajustarManutSemProdutoOs(-1)" title="Diminuir (mín. 1x)"
                                                            style="flex:1 !important; height:11px !important; width:18px !important; padding:0 !important; border:none !important; border-radius:0 !important; background:transparent !important; color:#334155 !important; line-height:1;">
                                                            <i class="ph ph-caret-down" style="font-size:0.62rem !important;"></i>
                                                        </button>
                                                    </div>
                                                </div>`
                                            }
                                        </div>
                                        <div>
                                            <button type="button" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.adicionarProdutoOsAvulsa()"
                                                style="background:#16a34a; color:#fff; border:none; font-weight:700;">
                                                <i class="ph ph-plus-circle"></i> Adicionar
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}
                                <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                                        <thead>
                                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.7rem; text-transform:uppercase;">
                                                <th style="padding:8px;">Produto</th>
                                                <th style="padding:8px;">Observação</th>
                                                <th style="padding:8px 6px; text-align:center;">Qtd.</th>
                                                <th style="padding:8px 6px; text-align:center;">Diárias / Manut.</th>
                                                <th style="padding:8px 6px; text-align:center; width:125px;">Endereços</th>
                                                ${!veioDeContrato ? '<th style="padding:8px 6px; text-align:center; width:52px;">Ações</th>' : ''}
                                            </tr>
                                        </thead>
                                        <tbody id="cos-produtos-tbody">
                                            ${renderProdutosGridHtml(prop)}
                                        </tbody>
                                    </table>
                                </div>
                                <div id="cos-distribuicao-enderecos-wrap">
                                    ${renderDistribuicaoProdutosEnderecosHtml(prop)}
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Seção: Serviços -->
                        ${regrasPS.mostrarQuadroServicos ? `
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                            <div onclick="window._comercialOS.toggleSecao('servicos', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important; color:#1e3a8a !important;">
                                    <i class="ph ph-wrench" style="color:#2563eb;"></i> Serviços <span id="cos-servicos-obrig-ast" style="color:#dc2626; display:${regrasPS.servicoObrigatorio ? 'inline' : 'none'};">*</span>
                                    <span id="cos-servicos-count-badge" style="display:none; background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; font-size:0.68rem; font-weight:800; padding:1px 8px; border-radius:999px;"></span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('servicos', event)"
                                    style="width:24px !important; padding:0 !important; border:1px solid #93c5fd; background:#dbeafe; color:#1e40af;">
                                    <i id="cos-caret-servicos" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.servicos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-servicos-body" style="display:${state.secoesAbertas.servicos ? 'block' : 'none'}; margin-top:0.45rem;">
                                ${!veioDeContrato ? `
                                    <div style="display:grid; grid-template-columns:2.1fr 2fr ${ehObra ? 'auto' : ''} auto; gap:0.45rem; align-items:end; margin-bottom:0.5rem;">
                                        <div>
                                            <label class="prop-lbl">Serviço ${regrasPS.servicoObrigatorio ? '<span style="color:#dc2626;">*</span>' : ''}</label>
                                            <div style="display:flex; gap:0.25rem; align-items:center;">
                                                <div id="cos-serv-combo-wrap" style="position:relative; flex:1; min-width:0;">
                                                    <input type="text" id="cos-serv-input" ${!tipoOsPreenchido ? 'disabled' : ''}
                                                        autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false"
                                                        placeholder="Selecione ou pesquise o serviço..."
                                                        onfocus="if(!this.disabled) window._comercialOS.filtrarDropdownServicosOs('', true);"
                                                        onclick="if(!this.disabled) window._comercialOS.filtrarDropdownServicosOs('', true);"
                                                        oninput="window._comercialOS.filtrarDropdownServicosOs(this.value, true);"
                                                        onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.abrirModalPesquisaServicosOs(); }"
                                                        style="width:100%;">
                                                    <div id="cos-serv-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; min-width:300px; max-height:220px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 8px 20px rgba(15,23,42,0.14); z-index:1120;"></div>
                                                </div>
                                                <button type="button" id="btn-cos-pesq-serv" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.abrirModalPesquisaServicosOs()"
                                                    title="Pesquisar Serviço no Catálogo"
                                                    style="background:#2563eb; color:#fff; border:none; width:26px !important; padding:0 !important; flex-shrink:0;">
                                                    <i class="ph ph-magnifying-glass"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Observação</label>
                                            <input type="text" id="cos-serv-obs" ${!tipoOsPreenchido ? 'disabled' : ''} placeholder="Observação do serviço..." style="width:100%;">
                                        </div>
                                        ${ehObra ? `
                                            <div>
                                                <label class="prop-chk-inline-lbl-blue" title="Marcar Frete FOB (dispensa serviço obrigatório na Obra e habilita quadro de veículo/motorista FOB)">
                                                    <input type="checkbox" id="cos-serv-fob-geral" ${temFob ? 'checked' : ''} ${!tipoOsPreenchido ? 'disabled' : ''}
                                                        onchange="window._comercialOS.onToggleFreteFobOsAvulsa(this.checked)">
                                                    <span>Frete FOB</span>
                                                </label>
                                            </div>
                                        ` : ''}
                                        <div>
                                            <button type="button" ${!tipoOsPreenchido ? 'disabled' : ''} onclick="window._comercialOS.adicionarServicoOsAvulsa()"
                                                style="background:#16a34a; color:#fff; border:none; font-weight:700;">
                                                <i class="ph ph-plus-circle"></i> Adicionar
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}
                                <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                                        <thead>
                                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.7rem; text-transform:uppercase;">
                                                <th style="padding:8px;">Serviço</th>
                                                <th style="padding:8px;">Observação</th>
                                                ${!veioDeContrato ? '<th style="padding:8px 6px; text-align:center; width:52px;">Ações</th>' : ''}
                                            </tr>
                                        </thead>
                                        <tbody id="cos-servicos-tbody">
                                            ${renderServicosGridHtml(prop)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Seção: Anexos (Exclusivos da OS do Comercial) -->
                        <div style="background:#fefce8; border:1.5px solid #fde047; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem;">
                            <div onclick="window._comercialOS.toggleSecao('anexos', event)" style="display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; user-select:none;">
                                <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important; color:#854d0e !important;">
                                    <i class="ph ph-paperclip" style="color:#ca8a04;"></i> Anexos
                                    <span id="cos-anexos-count-badge" style="background:#fef08a; color:#854d0e; border:1px solid #facc15; padding:1px 8px; border-radius:999px; font-size:0.68rem; font-weight:800;">${state.anexosAtuais.length} anexo(s)</span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('anexos', event)"
                                    style="width:24px !important; padding:0 !important; border:1px solid #facc15; background:#fef08a; color:#854d0e;">
                                    <i id="cos-caret-anexos" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.anexos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-anexos-body" style="display:${state.secoesAbertas.anexos ? 'block' : 'none'}; margin-top:0.5rem;">
                                ${!isNovo ? `
                                    <div style="display:flex; gap:0.5rem; align-items:flex-end; margin-bottom:0.5rem; flex-wrap:wrap;">
                                        <div style="flex:1; min-width:200px;">
                                            <label class="prop-lbl" style="color:#713f12;">Título do Anexo</label>
                                            <input type="text" id="cos-anexo-titulo-input" placeholder="Escreva o título do anexo da OS..." style="width:100%;">
                                        </div>
                                        <input type="file" id="cos-anexo-file-input" multiple style="display:none;" onchange="window._comercialOS.enviarAnexosOs(this.files)">
                                        <button type="button" onclick="document.getElementById('cos-anexo-file-input')?.click()"
                                            style="background:#ca8a04; color:#fff; border:none;">
                                            <i class="ph ph-upload-simple"></i> Incluir Documento(s) Anexo(s)
                                        </button>
                                    </div>
                                ` : ''}
                                <div id="cos-anexos-lista-wrap">
                                    <div style="text-align:center; color:#94a3b8; font-size:0.76rem; padding:0.65rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">
                                        ${isNovo ? 'Selecione uma OS para visualizar ou incluir anexos.' : 'Nenhum documento anexado nesta OS.'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Observações -->
                        <div style="margin-bottom:0.25rem; ${lockPorTipoStyle}" onclick="window._comercialOS.onClickCampoBloqueadoPorTipoOs(event)">
                            <label class="prop-lbl">Observações</label>
                            <textarea id="cos-obs" rows="3" ${!tipoOsPreenchido ? 'disabled' : ''}
                                oninput="window._comercialOS.onChangeCampoOsAvulsa('observacoes', this.value)"
                                style="width:100%; resize:vertical;"
                                placeholder="${!tipoOsPreenchido ? 'Selecione primeiro o Tipo * de OS para liberar o preenchimento dos demais campos...' : 'Informações adicionais sobre a OS...'}">${esc(isNovo ? (d.observacoes_draft || '') : v('observacoes'))}</textarea>
                        </div>
                    </form>
                </div>
            </div>
        `;

        renderProdutosGridHtml(prop);
        renderServicosGridHtml(prop);
        if (window._comercialOS && typeof window._comercialOS.sincronizarChipsContatosInstalacaoOs === 'function') {
            window._comercialOS.sincronizarChipsContatosInstalacaoOs();
        }
        if (window._comercialOS && typeof window._comercialOS.sincronizarChipsEnderecosOs === 'function') {
            window._comercialOS.sincronizarChipsEnderecosOs();
        }
        atualizarVisibilidadeBotaoEnviarLogistica();
        if (!isNovo) {
            carregarAnexosOs(prop.id);
        }
        if (typeof window._cosMontarDrawerComentarios === 'function') {
            window._cosMontarDrawerComentarios();
            window.carregarComentariosOsAtiva(isNovo ? null : prop.id, false);
        }
    }

    async function carregarAnexosOs(propId) {
        if (!propId) return;
        try {
            const res = await window.apiGet(`/propostas/${propId}/anexos-os-comercial`);
            const lista = (res && Array.isArray(res.anexos)) ? res.anexos : (Array.isArray(res) ? res : []);
            state.anexosAtuais = lista;
            const badge = document.getElementById('cos-anexos-count-badge');
            if (badge) badge.textContent = `${lista.length} anexo(s)`;
            const wrap = document.getElementById('cos-anexos-lista-wrap');
            if (!wrap) return;
            if (!lista.length) {
                wrap.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.76rem; padding:0.65rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">Nenhum documento anexado nesta OS.</div>`;
                return;
            }
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
            wrap.innerHTML = `<div style="display:flex; flex-direction:column; gap:6px;">
                ${lista.map((a, idx) => {
                    const urlView = `/api/propostas/${propId}/anexos-os-comercial/${a.id}/arquivo?inline=1${token ? `&token=${encodeURIComponent(token)}` : ''}`;
                    const urlDown = `/api/propostas/${propId}/anexos-os-comercial/${a.id}/arquivo?download=1${token ? `&token=${encodeURIComponent(token)}` : ''}`;
                    return `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <div style="min-width:0;">
                            <div style="font-size:0.76rem; font-weight:700; color:#0f172a;">#${idx + 1} — ${esc(a.titulo || a.nome_arquivo || 'Anexo')}</div>
                            <div style="font-size:0.7rem; color:#64748b;">${esc(a.nome_arquivo || '')}</div>
                        </div>
                        <div style="display:flex; gap:6px; flex-shrink:0;">
                            <a href="${urlView}" target="_blank" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:3px 8px; border-radius:4px; font-size:0.72rem; font-weight:700; text-decoration:none;"><i class="ph ph-eye"></i> Visualizar</a>
                            <a href="${urlDown}" target="_blank" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:3px 8px; border-radius:4px; font-size:0.72rem; font-weight:700; text-decoration:none;"><i class="ph ph-download-simple"></i> Baixar</a>
                            <button type="button" onclick="window._comercialOS.excluirAnexoOs(${Number(a.id)})" title="Remover anexo da OS"
                                style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; width:24px; padding:0;">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        } catch (_) {}
    }

    async function abrirModalPesquisaOS(filtrosIniciais = {}) {
        const listaOs = await buscarTodasOsDoSistema();
        let clientes = Array.isArray(window._clientesCache) && window._clientesCache.length ? window._clientesCache : [];
        if (!clientes.length && typeof window.apiGet === 'function') {
            try {
                clientes = await window.apiGet('/clientes');
                window._clientesCache = clientes;
            } catch (_) {}
        }

        const clientCnpjMap = {};
        const clientIconMap = {};
        (clientes || []).forEach(c => {
            if (c.nome_razao_social) {
                const k = c.nome_razao_social.toLowerCase().trim();
                if (c.cpf_cnpj || !clientCnpjMap[k]) clientCnpjMap[k] = c.cpf_cnpj || '';
                const ico = typeof window.obterIconeApenasGrupoCliente === 'function' ? window.obterIconeApenasGrupoCliente(c.grupo_clientes) : '';
                if (ico || !clientIconMap[k]) clientIconMap[k] = ico;
            }
        });

        const extrairNum = (val) => {
            const d = String(val || '').replace(/\D/g, '');
            return d ? parseInt(d, 10) : 0;
        };

        const osEnriquecidas = listaOs.map(p => {
            const nomeLimpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(p.cliente_nome || '')
                : limparPrefixoGrupoSeguroOs(p.cliente_nome || '');
            const key = nomeLimpo.toLowerCase().trim();
            const cfgTipo = obterConfigTipoOs(resolverTipoOsComercial(p));
            return {
                ...p,
                cliente_nome_limpo: nomeLimpo,
                cliente_cnpj: clientCnpjMap[key] || '',
                cliente_icone: clientIconMap[key] || '',
                tipo_os_label: cfgTipo.label
            };
        }).sort((a, b) => extrairNum(b.numero_os) - extrairNum(a.numero_os));

        const renderRows = (list) => {
            if (!list.length) {
                return `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem;">Nenhuma OS encontrada.</td></tr>`;
            }
            return list.map(p => {
                const numOs = String(p.numero_os || '').trim().padStart(2, '0');
                const codProp = String(p.codigo || '').trim().padStart(2, '0');
                const numCtr = String(p.contrato || '').trim().padStart(2, '0');
                const dataFmt = fmtDataBr(p.os_criada_em);

                const btnOsVerde = `<button type="button" onclick="event.stopPropagation(); Swal.close(); window._comercialOS.carregarOsPorPropostaId(${p.id});" title="Abrir OS Nº ${esc(numOs)}" style="background:#16a34a; color:#ffffff; border:1px solid #15803d; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.76rem; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">${esc(numOs)}</button>`;
                const btnPropAzul = codProp
                    ? `<button type="button" onclick="event.stopPropagation(); Swal.close(); window.abrirPropostaDiretoId(${p.id});" title="Clique para abrir a Proposta Nº ${esc(codProp)}" style="background:#2563eb; color:#ffffff; border:1px solid #1d4ed8; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.76rem; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">${esc(codProp)}</button>`
                    : '—';
                const btnCtrAmarelo = numCtr
                    ? `<button type="button" onclick="event.stopPropagation(); Swal.close(); window.abrirContratoDaProposta(${p.id});" title="Clique para abrir o Contrato Nº ${esc(numCtr)}" style="background:#eab308; color:#0f172a; border:1px solid #ca8a04; padding:3px 10px; border-radius:6px; font-weight:800; font-size:0.76rem; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">${esc(numCtr)}</button>`
                    : '—';

                return `
                    <tr ondblclick="Swal.close(); window._comercialOS.carregarOsPorPropostaId(${p.id});"
                        onclick="Swal.close(); window._comercialOS.carregarOsPorPropostaId(${p.id});"
                        style="cursor:pointer; border-bottom:1px solid #e2e8f0; transition:background 0.15s;"
                        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;">${btnOsVerde}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">${btnPropAzul}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">${btnCtrAmarelo}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#334155;">${esc(p.titulo_contrato || '—')}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#1e293b;">${p.cliente_icone ? p.cliente_icone + ' ' : ''}${esc(p.cliente_nome_limpo || '—')}</td>
                        <td style="padding:10px 12px; color:#475569; white-space:nowrap;">${esc(p.cliente_cnpj || '—')}</td>
                        <td style="padding:10px 12px; font-weight:700; color:#15803d; text-align:center; white-space:nowrap;">${esc(p.tipo_os_label)}</td>
                        <td style="padding:10px 12px; color:#475569; text-align:center; white-space:nowrap;">${esc(dataFmt)}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;">${window.renderBadgeStatusOsComercialHtml(p.status_os || 'EM ELABORAÇÃO')}</td>
                    </tr>
                `;
            }).join('');
        };

        Swal.fire({
            title: '',
            width: '100%',
            showConfirmButton: false,
            customClass: { popup: 'custom-swal-padding-zero' },
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    <div style="font-size:1.1rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; gap:6px;">
                        <span style="display:flex; align-items:center; gap:6px;"><i class="ph ph-clipboard-text" style="color:#16a34a; font-size:1.3rem;"></i> Pesquisar Ordens de Serviço (OS)</span>
                        <button type="button" onclick="Swal.close()" style="background:none; border:none; color:#64748b; font-size:1.3rem; cursor:pointer; line-height:1;">&times;</button>
                    </div>

                    <div style="padding:16px; background:#f1f5f9; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:grid; grid-template-columns: 1fr 1.8fr 1fr 1fr; gap:0.75rem;">
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nº da OS</label>
                                <input type="text" id="modal-cos-search-os" value="${esc(filtrosIniciais.os || '')}" placeholder="Ex: 01, 02..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente / Razão Social</label>
                                <input type="text" id="modal-cos-search-cliente" value="${esc(filtrosIniciais.cliente || '')}" placeholder="Nome do cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nº do Contrato</label>
                                <input type="text" id="modal-cos-search-contrato" value="${esc(filtrosIniciais.contrato || '')}" placeholder="Nº do contrato..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nº da Proposta</label>
                                <input type="text" id="modal-cos-search-proposta" value="${esc(filtrosIniciais.proposta || '')}" placeholder="Nº da proposta..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; height:36px; text-transform:none;">
                            </div>
                        </div>

                        <div style="max-height:calc(88vh - 210px); min-height:52vh; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:85px;">Nº OS</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:90px;">Proposta</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:95px;">Contrato</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; min-width:140px;">Título</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc;">Razão Social / Cliente</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; width:130px;">CNPJ</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:155px;">Tipo OS</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:105px;">Data OS</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc; text-align:center; width:175px;">Status da OS</th>
                                    </tr>
                                </thead>
                                <tbody id="modal-cos-tbody">
                                    ${renderRows(osEnriquecidas)}
                                </tbody>
                            </table>
                        </div>

                        <div style="font-size:0.75rem; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
                            <span>Clique em uma linha para carregar a OS na tela (ou clique nos botões de Proposta / Contrato para ir diretamente a eles).</span>
                            <span id="modal-cos-count" style="font-weight:700; color:#475569;">Total: ${osEnriquecidas.length} OS</span>
                        </div>
                    </div>
                </div>
            `,
            didOpen: () => {
                const swalPopup = typeof Swal.getPopup === 'function' ? Swal.getPopup() : null;
                if (swalPopup) {
                    swalPopup.style.width = '98vw';
                    swalPopup.style.maxWidth = '98vw';
                    swalPopup.style.margin = '1vh auto';
                }
                const inpOs = document.getElementById('modal-cos-search-os');
                const inpCli = document.getElementById('modal-cos-search-cliente');
                const inpCtr = document.getElementById('modal-cos-search-contrato');
                const inpProp = document.getElementById('modal-cos-search-proposta');
                const tbody = document.getElementById('modal-cos-tbody');
                const countEl = document.getElementById('modal-cos-count');

                const filtrar = () => {
                    const qOs = normStr(inpOs?.value || '');
                    const qCli = normStr(inpCli?.value || '');
                    const qCtr = normStr(inpCtr?.value || '');
                    const qProp = normStr(inpProp?.value || '');

                    const filtradas = osEnriquecidas.filter(p => {
                        const nOs = normStr(p.numero_os);
                        const nCli = normStr(p.cliente_nome_limpo + ' ' + (p.titulo_contrato || ''));
                        const nCtr = normStr(p.contrato);
                        const nProp = normStr(p.codigo);

                        const okOs = !qOs || nOs.includes(qOs) || nOs.replace(/^0+/, '') === qOs.replace(/^0+/, '') || nCli.includes(qOs) || nCtr.includes(qOs) || nProp.includes(qOs);
                        const okCli = !qCli || nCli.includes(qCli);
                        const okCtr = !qCtr || nCtr.includes(qCtr) || nCtr.replace(/^0+/, '') === qCtr.replace(/^0+/, '');
                        const okProp = !qProp || nProp.includes(qProp) || nProp.replace(/^0+/, '') === qProp.replace(/^0+/, '');
                        return okOs && okCli && okCtr && okProp;
                    });

                    if (tbody) tbody.innerHTML = renderRows(filtradas);
                    if (countEl) countEl.textContent = `Total: ${filtradas.length} OS`;
                };

                [inpOs, inpCli, inpCtr, inpProp].forEach(el => el?.addEventListener('input', filtrar));
                filtrar();
                if (filtrosIniciais.foco === 'cliente') inpCli?.focus();
                else inpOs?.focus();
            }
        });
    }

    function resolverIcoGrupoOs(grp) {
        if (typeof window.obterIconeApenasGrupoCliente === 'function') {
            return window.obterIconeApenasGrupoCliente(grp);
        }
        const g = normStr(grp);
        if (g.includes('diamante')) return '💎';
        if (g.includes('ouro')) return '🥇';
        if (g.includes('prata')) return '🥈';
        if (g.includes('bronze')) return '🥉';
        return '';
    }

    function indexarListaClientesRapidaOs(clientesBrutos) {
        // IMPORTANTE: Nunca chamar window.formatarNomeClienteComIcone dentro do loop de 6000+ clientes!
        // Quando grupo === '', formatarNomeClienteComIcone percorre todo window._clientesCache causando O(N²) (~38 milhões de iterações) e travando a aba.
        const arr = (Array.isArray(clientesBrutos) ? clientesBrutos : []).map(c => {
            const nomeRaw = String(c.nome_razao_social || c.razao_social || c.cliente_nome || '').trim();
            const nomeLimpo = limparPrefixoGrupoSeguroOs(nomeRaw);
            const grupo = String(c.grupo_clientes || c.classificacao || c.grupo || '').trim();
            const icone = resolverIcoGrupoOs(grupo);
            const nomeExib = icone ? `${icone} ${nomeLimpo}` : nomeLimpo;
            const doc = String(c.cpf_cnpj || c.cnpj || '').trim();
            return {
                id: c.id || null,
                codigo: c.codigo || '',
                nome_limpo: nomeLimpo,
                grupo,
                icone,
                nome_exib: nomeExib,
                cpf_cnpj: doc,
                search_norm: normStr(`${c.codigo || ''} ${nomeLimpo} ${c.nome_fantasia || ''} ${doc}`)
            };
        }).filter(c => Boolean(c.nome_limpo));
        arr.sort((a, b) => (a.nome_limpo < b.nome_limpo ? -1 : (a.nome_limpo > b.nome_limpo ? 1 : 0)));
        return arr;
    }

    async function garantirCacheClientesRapidoOs(forcar = false) {
        if (!forcar && Array.isArray(window._cosClientesIndexadosCache) && window._cosClientesIndexadosCache.length > 0) {
            return window._cosClientesIndexadosCache;
        }
        if (!forcar && window._cosClientesLoadPromise) {
            return window._cosClientesLoadPromise;
        }
        if (!forcar && Array.isArray(window._clientesCache) && window._clientesCache.length > 0) {
            window._cosClientesIndexadosCache = indexarListaClientesRapidaOs(window._clientesCache);
            return window._cosClientesIndexadosCache;
        }

        window._cosClientesLoadPromise = (async () => {
            let clientesBrutos = [];
            if (typeof window.apiGet === 'function') {
                try {
                    clientesBrutos = await window.apiGet('/comercial/clientes-basico');
                } catch (_) {
                    clientesBrutos = [];
                }
                if (!Array.isArray(clientesBrutos) || !clientesBrutos.length) {
                    try {
                        clientesBrutos = await window.apiGet('/comercial/relatorios/clientes');
                    } catch (_) {
                        clientesBrutos = [];
                    }
                }
            }
            if (Array.isArray(clientesBrutos) && clientesBrutos.length > 0) {
                window._cosTodosClientesCache = clientesBrutos;
                if (!Array.isArray(window._clientesCache) || !window._clientesCache.length) {
                    window._clientesCache = clientesBrutos;
                }
                window._cosClientesIndexadosCache = indexarListaClientesRapidaOs(clientesBrutos);
                return window._cosClientesIndexadosCache;
            }
            return [];
        })().finally(() => {
            window._cosClientesLoadPromise = null;
        });

        return window._cosClientesLoadPromise;
    }

    async function abrirModalSelecionarClienteOs(termoInicial = '') {
        let listaClientes = (Array.isArray(window._cosClientesIndexadosCache) && window._cosClientesIndexadosCache.length > 0)
            ? window._cosClientesIndexadosCache
            : [];

        if (!listaClientes.length) {
            Swal.fire({
                title: 'Carregando clientes...',
                allowOutsideClick: false,
                didOpen: () => { if (typeof Swal.showLoading === 'function') Swal.showLoading(); }
            });
            listaClientes = await garantirCacheClientesRapidoOs();
            Swal.close();
        }

        const LIMITE_VISIVEL = 150;
        let listaAtualRenderizada = listaClientes;

        window._cosSelecionarClienteModalIdx = (idx) => {
            const item = listaAtualRenderizada[idx];
            if (!item) return;
            Swal.close();
            window._comercialOS.selecionarClienteNaOs(item.nome_limpo, item.grupo, item.id);
        };

        const renderRows = (list) => {
            listaAtualRenderizada = list;
            if (!list.length) {
                return `<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem;">Nenhum cliente encontrado.</td></tr>`;
            }
            return list.slice(0, LIMITE_VISIVEL).map((c, idx) => `
                <tr onclick="window._cosSelecionarClienteModalIdx(${idx})"
                    style="cursor:pointer; border-bottom:1px solid #e2e8f0; transition:background 0.15s;"
                    onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                    <td style="padding:10px 12px; font-weight:600; color:#1e293b; overflow-wrap:break-word;">${esc(c.nome_exib)}</td>
                    <td style="padding:10px 12px; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.cpf_cnpj || '—')}</td>
                </tr>
            `).join('');
        };

        const qIni = normStr(termoInicial);
        const iniciaisFiltrados = qIni ? listaClientes.filter(c => c.search_norm.includes(qIni)) : listaClientes;

        Swal.fire({
            title: '',
            width: '900px',
            showConfirmButton: false,
            customClass: { popup: 'custom-swal-padding-zero' },
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    <div style="font-size:1.1rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; gap:6px;">
                        <span style="display:flex; align-items:center; gap:6px;"><i class="ph ph-buildings" style="color:#2563eb; font-size:1.3rem;"></i> Selecionar Cliente</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button type="button" onclick="const q=document.getElementById('modal-cos-cli-search')?.value||''; Swal.close(); setTimeout(()=>window._comercialOS.abrirModalNovoClienteOs(null, q), 120);"
                                style="background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                <i class="ph ph-plus-circle"></i> Cadastrar Novo Cliente
                            </button>
                            <button type="button" onclick="Swal.close()" style="background:none; border:none; color:#64748b; font-size:1.3rem; cursor:pointer; line-height:1;">&times;</button>
                        </div>
                    </div>

                    <div style="padding:16px; background:#f1f5f9; display:flex; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Cliente / Razão Social</label>
                            <input type="text" id="modal-cos-cli-search" value="${esc(termoInicial || '')}" placeholder="Digite o nome do cliente..."
                                style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.84rem; box-sizing:border-box; height:38px; text-transform:none;">
                        </div>

                        <div style="max-height:55vh; min-height:38vh; overflow:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                            <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                <colgroup><col style="width:auto;"><col style="width:190px;"></colgroup>
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc;">Razão Social / Cliente</th>
                                        <th style="padding:10px 12px; position:sticky; top:0; background:#f8fafc;">CNPJ / CPF</th>
                                    </tr>
                                </thead>
                                <tbody id="modal-cos-cli-tbody">
                                    ${renderRows(iniciaisFiltrados)}
                                </tbody>
                            </table>
                        </div>

                        <div style="font-size:0.75rem; color:#64748b; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                            <span>Clique em um cliente para vinculá-lo à OS.</span>
                            <span id="modal-cos-cli-count" style="font-weight:700; color:#475569;">${iniciaisFiltrados.length > LIMITE_VISIVEL ? `Exibindo ${LIMITE_VISIVEL} de ${iniciaisFiltrados.length} cliente(s)` : `Total: ${iniciaisFiltrados.length} cliente(s)`}</span>
                        </div>
                    </div>
                </div>
            `,
            didOpen: () => {
                const swalPopup = typeof Swal.getPopup === 'function' ? Swal.getPopup() : null;
                if (swalPopup) {
                    swalPopup.style.maxWidth = '96vw';
                }
                const inpCli = document.getElementById('modal-cos-cli-search');
                const tbody = document.getElementById('modal-cos-cli-tbody');
                const countEl = document.getElementById('modal-cos-cli-count');
                let timerDeb = null;

                const aplicarFiltro = () => {
                    const q = normStr(inpCli?.value || '');
                    const filtrados = q ? listaClientes.filter(c => c.search_norm.includes(q)) : listaClientes;
                    if (tbody) tbody.innerHTML = renderRows(filtrados);
                    if (countEl) {
                        countEl.textContent = filtrados.length > LIMITE_VISIVEL
                            ? `Exibindo ${LIMITE_VISIVEL} de ${filtrados.length} cliente(s)`
                            : `Total: ${filtrados.length} cliente(s)`;
                    }
                };

                inpCli?.addEventListener('input', () => {
                    clearTimeout(timerDeb);
                    timerDeb = setTimeout(aplicarFiltro, 80);
                });
                aplicarFiltro();
                inpCli?.focus();
            }
        });
    }

    window._comercialOS = {
        async init() {
            if (window._comercialOsAbrirPropostaId) {
                const pid = window._comercialOsAbrirPropostaId;
                window._comercialOsAbrirPropostaId = null;
                window._comercialOsTipoOperacaoForcado = '';
                await this.carregarOsPorPropostaId(pid);
                setTimeout(() => { garantirCacheClientesRapidoOs().catch(() => {}); }, 450);
                return;
            }
            const tabKey = obterTabIdAtivaOsComercial();
            const snap = window._snapshotsOsComercial && window._snapshotsOsComercial[tabKey];
            if (snap) {
                state.propostaIdAtiva = snap.propostaIdAtiva || null;
                state.osAtual = snap.osAtual ? JSON.parse(JSON.stringify(snap.osAtual)) : null;
                state.dadosOs = snap.dadosOs ? JSON.parse(JSON.stringify(snap.dadosOs)) : (state.osAtual ? inicializarDadosOsComercial(state.osAtual) : null);
                state.editadoNaoSalvo = Boolean(snap.editadoNaoSalvo);
                state.statusNovoDraft = snap.statusNovoDraft || 'EM ELABORAÇÃO';
                state.tipoOsDraft = snap.tipoOsDraft || '';
                state.modalidadeDraft = snap.modalidadeDraft || 'Obra';
                state.itensProdutosDraft = Array.isArray(snap.itensProdutosDraft) ? JSON.parse(JSON.stringify(snap.itensProdutosDraft)) : [];
                state.itensServicosDraft = Array.isArray(snap.itensServicosDraft) ? JSON.parse(JSON.stringify(snap.itensServicosDraft)) : [];
                state.freteFobDraft = Boolean(snap.freteFobDraft);
                state.anexosAtuais = Array.isArray(snap.anexosAtuais) ? snap.anexosAtuais : [];
            } else {
                this.resetarParaNovaAba();
            }
            renderFormOS();
            setTimeout(() => { garantirCacheClientesRapidoOs().catch(() => {}); }, 350);
        },

        salvarSnapshotAba(tabIdOverride) {
            const tabKey = tabIdOverride || obterTabIdAtivaOsComercial();
            if (!tabKey) return;
            window._snapshotsOsComercial[tabKey] = {
                propostaIdAtiva: state.propostaIdAtiva || null,
                osAtual: state.osAtual ? JSON.parse(JSON.stringify(state.osAtual)) : null,
                dadosOs: state.dadosOs ? JSON.parse(JSON.stringify(state.dadosOs)) : null,
                editadoNaoSalvo: Boolean(state.editadoNaoSalvo),
                statusNovoDraft: state.statusNovoDraft || 'EM ELABORAÇÃO',
                tipoOsDraft: state.tipoOsDraft || '',
                modalidadeDraft: state.modalidadeDraft || 'Obra',
                itensProdutosDraft: Array.isArray(state.itensProdutosDraft) ? JSON.parse(JSON.stringify(state.itensProdutosDraft)) : [],
                itensServicosDraft: Array.isArray(state.itensServicosDraft) ? JSON.parse(JSON.stringify(state.itensServicosDraft)) : [],
                freteFobDraft: Boolean(state.freteFobDraft),
                anexosAtuais: Array.isArray(state.anexosAtuais) ? JSON.parse(JSON.stringify(state.anexosAtuais)) : []
            };
        },

        limparSnapshotAba(tabIdOverride) {
            const tabKey = tabIdOverride || obterTabIdAtivaOsComercial();
            if (window._snapshotsOsComercial && tabKey) {
                delete window._snapshotsOsComercial[tabKey];
            }
        },

        resetarParaNovaAba() {
            state.propostaIdAtiva = null;
            state.osAtual = null;
            state.dadosOs = null;
            state.editadoNaoSalvo = false;
            state.statusNovoDraft = 'EM ELABORAÇÃO';
            state.tipoOsDraft = '';
            state.modalidadeDraft = 'Obra';
            state.itensProdutosDraft = [];
            state.itensServicosDraft = [];
            state.freteFobDraft = false;
            state.anexosAtuais = [];
        },

        novaOSNaMesmaAba() {
            this.resetarParaNovaAba();
            const tabKey = obterTabIdAtivaOsComercial();
            if (window._snapshotsOsComercial && tabKey) {
                delete window._snapshotsOsComercial[tabKey];
            }
            atualizarTituloAbaSuperior(null, tabKey);
            renderFormOS();
        },

        async carregarOsPorPropostaId(propId) {
            const idNum = Number(propId);
            if (!idNum) return;
            try {
                let p = await window.apiGet(`/propostas/${idNum}`);
                if (!p || !p.id) return;
                if (!contratoEstaAssinado(p)) {
                    Swal.fire('Aviso', 'Uma OS só pode existir para contratos assinados.', 'warning');
                    return;
                }
                p.os_tipo_operacao = resolverTipoOsComercial(p);
                if (!p.status_os) p.status_os = 'EM ELABORAÇÃO';
                state.propostaIdAtiva = p.id;
                state.osAtual = p;
                state.dadosOs = inicializarDadosOsComercial(p);
                state.tipoOsDraft = p.os_tipo_operacao || '';
                state.modalidadeDraft = resolverModalidadeObraEventoOs(p, state.dadosOs);
                state.itensProdutosDraft = [];
                state.itensServicosDraft = [];
                state.freteFobDraft = false;
                state.editadoNaoSalvo = false;
                state.anexosAtuais = [];
                this.salvarSnapshotAba();
                renderFormOS();

                // Carrega lista de propostas apenas em segundo plano se vier de contrato e ainda não estiver em memória
                if (osVeioDeContrato(p) && typeof window.apiGet === 'function' && (!Array.isArray(window._propostasData) || !window._propostasData.length)) {
                    window.apiGet('/propostas').then(todasProps => {
                        if (Array.isArray(todasProps) && todasProps.length > 0) {
                            window._propostasData = todasProps;
                            if (state.osAtual && Number(state.osAtual.id) === idNum) {
                                const tbodyP = document.getElementById('cos-produtos-tbody');
                                if (tbodyP) tbodyP.innerHTML = renderProdutosGridHtml(state.osAtual);
                                const tbodyS = document.getElementById('cos-servicos-tbody');
                                if (tbodyS) tbodyS.innerHTML = renderServicosGridHtml(state.osAtual);
                                this.sincronizarPainelDistribuicaoEnderecos();
                            }
                        }
                    }).catch(() => {});
                }
            } catch (e) {
                console.error('[COMERCIAL_OS] Erro ao carregar OS:', e);
            }
        },

        async pesquisarPorCampoOsInput() {
            const raw = String(document.getElementById('cos-codigo')?.value || '').trim();
            if (!raw || (state.osAtual && String(state.osAtual.numero_os || '').trim() === raw)) {
                await abrirModalPesquisaOS({ foco: 'os' });
                return;
            }
            const listaOs = await buscarTodasOsDoSistema();
            const rawNorm = normStr(raw);
            const rawDigits = raw.replace(/\D/g, '').replace(/^0+/, '');

            if (/^\d+$/.test(raw)) {
                const matchOsExata = listaOs.find(p => {
                    const nOs = String(p.numero_os || '').trim();
                    return nOs === raw || (rawDigits && nOs.replace(/\D/g, '').replace(/^0+/, '') === rawDigits);
                });
                if (matchOsExata) {
                    await this.carregarOsPorPropostaId(matchOsExata.id);
                    if (typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso(`OS Nº ${matchOsExata.numero_os} carregada!`);
                    }
                    return;
                }
            }

            const matchesFlex = listaOs.filter(p => {
                const nOs = normStr(p.numero_os);
                const nCtr = normStr(p.contrato);
                const nProp = normStr(p.codigo);
                const nCli = normStr(p.cliente_nome);
                return nOs.includes(rawNorm) ||
                    nCli.includes(rawNorm) ||
                    nCtr === rawNorm || (rawDigits && nCtr.replace(/^0+/, '') === rawDigits) ||
                    nProp === rawNorm || (rawDigits && nProp.replace(/^0+/, '') === rawDigits);
            });

            if (matchesFlex.length === 1) {
                await this.carregarOsPorPropostaId(matchesFlex[0].id);
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`OS Nº ${matchesFlex[0].numero_os} carregada!`);
                }
                return;
            }

            await abrirModalPesquisaOS({ os: raw, foco: 'os' });
        },

        async pesquisarPorCampoClienteInput() {
            if (osVeioDeContrato(state.osAtual)) return;
            if (!String(resolverTipoOsComercial(state.osAtual) || '').trim()) {
                this.onClickCampoBloqueadoPorTipoOs();
                return;
            }
            const raw = String(document.getElementById('cos-cliente')?.value || '').trim();
            const limpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(raw)
                : limparPrefixoGrupoSeguroOs(raw);
            await abrirModalSelecionarClienteOs(limpo);
        },

        selecionarClienteNaOs(nomeLimpo, grupoOpcional = '', clienteId = null) {
            if (osVeioDeContrato(state.osAtual)) return;
            const limpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(nomeLimpo || '')
                : limparPrefixoGrupoSeguroOs(nomeLimpo || '');
            if (!state.dadosOs) state.dadosOs = {};
            const anterior = this._obterNomeClienteAtualOs();
            if (normStr(anterior) !== normStr(limpo)) {
                this._contatosCacheAtualOs = null;
                this._enderecosCacheAtualOs = null;
                this._enderecosCacheKeyOs = '';
                this._enderecosLoadPromiseOs = null;
                state.dadosOs.contatos_instalacao = [];
                if (!state.osAtual || !state.osAtual.id) {
                    state.dadosOs.contato_nome_draft = '';
                    state.dadosOs.endereco_instalacao_draft = '';
                } else {
                    state.osAtual.contato_nome = '';
                    state.osAtual.endereco_instalacao = '';
                    state.osAtual.contato_instalacao_contrato = '';
                }
                const inpCt = document.getElementById('cos-contato');
                if (inpCt) inpCt.value = '';
                const inpCtInst = document.getElementById('cos-contato-inst');
                if (inpCtInst) inpCtInst.value = '';
                this.sincronizarChipsContatosInstalacaoOs();
                const inpEnd = document.getElementById('cos-endereco-instalacao');
                if (inpEnd) inpEnd.value = '';
                this.sincronizarChipsEnderecosOs();
            }
            if (clienteId) {
                if (state.osAtual && state.osAtual.id) state.osAtual.cliente_id = Number(clienteId);
                else state.dadosOs.cliente_id_draft = Number(clienteId);
            }
            const inpCli = document.getElementById('cos-cliente');
            if (inpCli) {
                let exib = limpo;
                if (typeof window.formatarNomeClienteComIcone === 'function') {
                    exib = window.formatarNomeClienteComIcone(limpo, grupoOpcional);
                } else if (grupoOpcional) {
                    const g = normStr(grupoOpcional);
                    const ico = g.includes('diamante') ? '💎' : (g.includes('ouro') ? '🥇' : (g.includes('prata') ? '🥈' : (g.includes('bronze') ? '🥉' : '')));
                    if (ico) exib = `${ico} ${limpo}`;
                }
                inpCli.value = exib;
            }
            if (state.osAtual && state.osAtual.id) {
                state.osAtual.cliente_nome = limpo;
            } else {
                state.dadosOs.cliente_nome_draft = limpo;
            }
            this.carregarEnderecosClienteOsAtual(true).catch(() => {});
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        onInputQtdManutencoesOs(inputEl) {
            if (!inputEl) return;
            const raw = String(inputEl.value || '');
            const prev = String(inputEl.dataset.prevQtd || '');
            let digits = '';
            if (prev && prev.endsWith('x') && raw === prev.slice(0, -1)) {
                digits = prev.replace(/\D+/g, '').slice(0, -1);
            } else {
                digits = raw.replace(/\D+/g, '');
            }
            const n = digits ? parseInt(digits, 10) : 0;
            const novoVal = (!isNaN(n) && n > 0) ? `${n}x` : '';
            inputEl.value = novoVal;
            inputEl.dataset.prevQtd = novoVal;
            if (novoVal && typeof inputEl.setSelectionRange === 'function') {
                try {
                    const pos = Math.max(0, novoVal.length - 1);
                    inputEl.setSelectionRange(pos, pos);
                } catch (_) {}
            }
            this.onChangeCampoDadosOs('qtd_manutencoes', novoVal);
        },

        onToggleAgendarRetirada(checked) {
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs.agendar_retirada = Boolean(checked);
            if (!checked) {
                state.dadosOs.data_retirada = '';
                state.dadosOs.hora_retirada = '';
                state.dadosOs.retirada_horario_comercial = false;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            renderFormOS();
        },

        toggleSecao(chave, event) {
            if (event) event.stopPropagation();
            const body = document.getElementById(`cos-secao-${chave}-body`);
            const caret = document.getElementById(`cos-caret-${chave}`);
            if (!body) return;
            const novo = body.style.display === 'none';
            state.secoesAbertas[chave] = novo;
            body.style.display = novo ? 'block' : 'none';
            if (caret) caret.style.transform = novo ? 'rotate(180deg)' : 'rotate(0deg)';
        },

        onClickCampoBloqueadoPorTipoOs(event) {
            const tipoAtual = resolverTipoOsComercial(state.osAtual);
            if (String(tipoAtual || '').trim()) return;
            if (event) {
                const tag = String(event.target?.tagName || '').toUpperCase();
                if (tag === 'BUTTON' && event.target.title && event.target.title.includes('Pesquisar')) return;
                if (event.target?.closest && event.target.closest('button[title*="Pesquisar"]')) return;
            }
            const selTipo = document.getElementById('cos-tipo');
            if (selTipo) {
                selTipo.focus();
                selTipo.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.28)';
                setTimeout(() => { if (selTipo) selTipo.style.boxShadow = ''; }, 1400);
            }
            if (typeof mostrarToastAviso === 'function') {
                mostrarToastAviso('Selecione primeiro o Tipo * de OS para liberar o preenchimento dos demais campos.');
            } else if (typeof Swal !== 'undefined' && !Swal.isVisible()) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: 'Selecione primeiro o Tipo * de OS para liberar o preenchimento dos demais campos.',
                    showConfirmButton: false,
                    timer: 2600
                });
            }
        },

        onChangeTipoOs(novoTipo) {
            const val = String(novoTipo || '').trim();
            if (state.osAtual && state.osAtual.id) {
                state.osAtual.os_tipo_operacao = val;
            } else {
                state.tipoOsDraft = val;
                if (!state.dadosOs) {
                    state.dadosOs = {
                        modalidade_os: state.modalidadeDraft || 'Obra',
                        modalidade_obra_evento: state.modalidadeDraft || 'Obra',
                        data_entrega: '',
                        hora_entrega: '',
                        entrega_horario_comercial: false,
                        agendar_retirada: false,
                        data_retirada: '',
                        hora_retirada: '',
                        retirada_horario_comercial: false,
                        qtd_manutencoes: '',
                        horario_manutencao: '',
                        manutencao_horario_comercial: false,
                        dias_semana_manutencao: [],
                        dias_evento: [],
                        fob_data_entrega: '',
                        fob_data_retirada: '',
                        fob_modelo_veiculo: '',
                        fob_placa_veiculo: '',
                        fob_nome_motorista: ''
                    };
                }
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            renderFormOS();
        },

        toggleMenuModalidadeOs(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (osVeioDeContrato(state.osAtual)) return;
            const menu = document.getElementById('cos-modalidade-custom-menu');
            if (!menu) return;
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        },

        selecionarModalidadeOs(modalidade, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (osVeioDeContrato(state.osAtual)) return;
            const modNorm = normStr(modalidade) === 'evento' ? 'Evento' : 'Obra';
            state.modalidadeDraft = modNorm;
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs.modalidade_os = modNorm;
            state.dadosOs.modalidade_obra_evento = modNorm;
            if (state.osAtual) {
                state.osAtual.tipo = modNorm === 'Evento' ? 'Proposta Evento' : 'Proposta Obra';
            }
            const menu = document.getElementById('cos-modalidade-custom-menu');
            if (menu) menu.style.display = 'none';
            this.marcarEditado();
            this.salvarSnapshotAba();
            renderFormOS();
        },

        toggleDiaSemanaManutencao(dia, checked, lblEl) {
            if (!state.dadosOs) state.dadosOs = {};
            const atuais = Array.isArray(state.dadosOs.dias_semana_manutencao) ? [...state.dadosOs.dias_semana_manutencao] : [];
            const idx = atuais.findIndex(x => normStr(x) === normStr(dia));
            if (checked && idx === -1) atuais.push(dia);
            if (!checked && idx >= 0) atuais.splice(idx, 1);
            state.dadosOs.dias_semana_manutencao = atuais;
            if (lblEl && lblEl.dataset && lblEl.dataset.cor) {
                lblEl.style.setProperty('background', checked ? lblEl.dataset.cor : '#fff', 'important');
                lblEl.style.setProperty('color', checked ? '#fff' : lblEl.dataset.cor, 'important');
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        async buscarAgendaEnderecoOs(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const listaEnds = this.obterListaEnderecosOs();
            const endereco = String(listaEnds[0] || '').trim();
            if (!endereco) {
                if (typeof mostrarToastAviso === 'function') {
                    mostrarToastAviso('Preencha o campo de Instalação antes de verificar os dias da semana da manutenção.');
                } else {
                    Swal.fire('Atenção', 'Preencha o campo de Instalação antes de verificar os dias da semana da manutenção.', 'warning');
                }
                return;
            }
            const btn = document.getElementById('cos-btn-agenda-endereco');
            const origHtml = btn ? btn.innerHTML : '';
            if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size:1rem;"></i>';
            try {
                const params = new URLSearchParams({ endereco });
                const cliNome = this._obterNomeClienteAtualOs();
                if ((!Array.isArray(this._enderecosCacheAtualOs) || !this._enderecosCacheAtualOs.length) && cliNome && typeof window._obterDadosEnderecosClienteProposta === 'function') {
                    const resEnds = await window._obterDadosEnderecosClienteProposta(cliNome).catch(() => ({ enderecosDoCliente: [] }));
                    this._enderecosCacheAtualOs = Array.isArray(resEnds?.enderecosDoCliente) ? resEnds.enderecosDoCliente : [];
                }
                const matchEnd = (this._enderecosCacheAtualOs || []).find(e =>
                    normStr(e.texto_completo) === normStr(endereco) ||
                    (e.endereco && normStr(endereco).includes(normStr(e.endereco)))
                );
                if (matchEnd && matchEnd.coordenadas) {
                    const mCoord = String(matchEnd.coordenadas).match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
                    if (mCoord) {
                        params.set('lat', mCoord[1].replace(',', '.'));
                        params.set('lng', mCoord[2].replace(',', '.'));
                    }
                }
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const resp = await fetch(`/api/logistica/os/agenda-endereco?${params.toString()}`, {
                    headers: tk ? { 'Authorization': 'Bearer ' + tk } : {}
                });
                const data = await resp.json();
                if (typeof window.exibirModalAgendaEndereco === 'function') {
                    window.exibirModalAgendaEndereco(data, endereco);
                } else {
                    const exatos = Array.isArray(data.exatos) ? data.exatos : [];
                    const prox = Array.isArray(data.proximos) ? data.proximos : [];
                    const resumoLinhas = [...exatos, ...prox].slice(0, 12).map(o =>
                        `<li style="margin-bottom:4px;"><b>OS ${esc(o.numero_os || '—')}</b> — ${esc(o.cliente || '')} (${esc((Array.isArray(o.dias_semana) ? o.dias_semana : []).join(', ') || o.dias_semana || '—')})</li>`
                    ).join('');
                    Swal.fire({
                        title: 'Dias da Semana na Região',
                        html: `<div style="text-align:left; font-size:0.84rem;">${resumoLinhas ? `<ul style="padding-left:18px;">${resumoLinhas}</ul>` : 'Nenhuma OS próxima encontrada nesta região.'}</div>`,
                        width: '620px'
                    });
                }
                const contSug = document.getElementById('cos-sugestoes-dias-container');
                if (contSug) {
                    if (data.dias_sugeridos_2km && data.dias_sugeridos_2km.length > 0) {
                        contSug.style.display = 'block';
                        contSug.innerHTML = `<span style="color:#1d4ed8; font-weight:700;"><i class="ph ph-check-circle"></i> Sugeridos (≤1km): <b>${esc(data.dias_sugeridos_2km.map(x => x.dia).join(', '))}</b></span>`;
                    } else if (data.dias_sugeridos_5km && data.dias_sugeridos_5km.length > 0) {
                        contSug.style.display = 'block';
                        contSug.innerHTML = `<span style="color:#b45309; font-weight:700;"><i class="ph ph-warning"></i> Sugeridos (1-3km): <b>${esc(data.dias_sugeridos_5km.map(x => x.dia).join(', '))}</b></span>`;
                    } else {
                        contSug.style.display = 'none';
                        contSug.innerHTML = '';
                    }
                }
            } catch (e) {
                console.error('[COMERCIAL_OS Agenda Endereço]', e);
                if (typeof mostrarToastAviso === 'function') {
                    mostrarToastAviso('Erro ao buscar agenda da região. Tente novamente.');
                }
            } finally {
                if (btn) btn.innerHTML = origHtml;
            }
        },

        _obterNomeClienteAtualOs() {
            const rawCli = String(document.getElementById('cos-cliente')?.value || (state.osAtual && state.osAtual.cliente_nome) || (state.dadosOs && state.dadosOs.cliente_nome_draft) || '').trim();
            return typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(rawCli)
                : limparPrefixoGrupoSeguroOs(rawCli);
        },

        onInputContatoOs(valor) {
            this.onChangeCampoOsAvulsa('contato_nome', valor);
            this.filtrarDropdownContatosOs(valor);
        },

        async abrirDropdownContatosOs(mostrarTodos = true) {
            const drop = document.getElementById('cos-contato-dropdown');
            const inp = document.getElementById('cos-contato');
            if (!drop || !inp || inp.disabled) return;
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Selecione ou informe o Cliente primeiro para listar os contatos vinculados.</div>`;
                drop.style.display = 'block';
                return;
            }
            let contatos = [];
            if (typeof window._obterDadosContatosClienteProposta === 'function') {
                const res = await window._obterDadosContatosClienteProposta(cliNome).catch(() => ({ contatosDoCliente: [] }));
                contatos = Array.isArray(res?.contatosDoCliente) ? res.contatosDoCliente : [];
            }
            this._contatosCacheAtualOs = contatos;
            this.renderDropdownContatosOs(inp.value, mostrarTodos);
        },

        async toggleDropdownContatosOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const drop = document.getElementById('cos-contato-dropdown');
            if (drop && drop.style.display === 'block') {
                drop.style.display = 'none';
                return;
            }
            await this.abrirDropdownContatosOs(true);
            document.getElementById('cos-contato')?.focus();
        },

        async filtrarDropdownContatosOs(termo) {
            const cliNome = this._obterNomeClienteAtualOs();
            if (!Array.isArray(this._contatosCacheAtualOs) && cliNome && typeof window._obterDadosContatosClienteProposta === 'function') {
                const res = await window._obterDadosContatosClienteProposta(cliNome).catch(() => ({ contatosDoCliente: [] }));
                this._contatosCacheAtualOs = Array.isArray(res?.contatosDoCliente) ? res.contatosDoCliente : [];
            }
            this.renderDropdownContatosOs(termo, false);
        },

        renderDropdownContatosOs(termoFiltro = '', mostrarTodos = false) {
            const drop = document.getElementById('cos-contato-dropdown');
            if (!drop) return;
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Selecione ou informe o Cliente primeiro para listar os contatos vinculados.</div>`;
                drop.style.display = 'block';
                return;
            }
            const base = Array.isArray(this._contatosCacheAtualOs) ? this._contatosCacheAtualOs : [];
            const q = mostrarTodos ? '' : normStr(termoFiltro);
            const filtrados = !q
                ? base
                : base.filter(c =>
                    normStr(c.nome).includes(q) ||
                    normStr(c.cargo).includes(q) ||
                    normStr(c.celular).includes(q) ||
                    normStr(c.telefone).includes(q) ||
                    normStr(c.telefone_ramal).includes(q) ||
                    normStr(c.email).includes(q)
                );
            if (!filtrados.length) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Nenhum contato vinculado encontrado (você pode digitar manualmente).</div>`;
                drop.style.display = 'block';
                return;
            }
            drop.innerHTML = filtrados.slice(0, 60).map(c => {
                const safeNome = String(c.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const telsFmt = typeof window.formatarTelefonesContatoDropdown === 'function'
                    ? window.formatarTelefonesContatoDropdown(c).map(t => `📞 ${t}`)
                    : ([c.celular, c.telefone].filter(Boolean).map(t => `📞 ${t}`));
                const subInfo = [c.cargo, ...telsFmt, c.email].filter(Boolean).join(' • ');
                const badgesHtml = typeof window.obterBadgesOpcoesContato === 'function' ? window.obterBadgesOpcoesContato(c) : '';
                return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarContatoOs('${safeNome}')"
                    style="padding:6px 10px; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
                        <span style="font-size:0.78rem; font-weight:700; color:#1e293b;">${esc(c.nome)}</span>
                        ${badgesHtml}
                    </div>
                    ${subInfo ? `<div style="font-size:0.7rem; color:#64748b; margin-top:2px;">${esc(subInfo)}</div>` : ''}
                </div>`;
            }).join('');
            drop.style.display = 'block';
        },

        selecionarContatoOs(nome) {
            const inp = document.getElementById('cos-contato');
            const drop = document.getElementById('cos-contato-dropdown');
            if (inp) inp.value = nome;
            if (drop) drop.style.display = 'none';
            if (state.osAtual && state.osAtual.id) {
                state.osAtual.contato_nome = nome;
            } else {
                if (!state.dadosOs) state.dadosOs = {};
                state.dadosOs.contato_nome_draft = nome;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        obterListaContatosInstalacaoOs() {
            if (!state.dadosOs) state.dadosOs = {};
            if (!Array.isArray(state.dadosOs.contatos_instalacao)) {
                state.dadosOs.contatos_instalacao = extrairContatosInstalacaoIniciaisOs(state.osAtual, state.dadosOs);
            }
            return state.dadosOs.contatos_instalacao.map(x => String(x || '').trim()).filter(Boolean);
        },

        _contatoInstalacaoJaSelecionado(rotuloOuNome) {
            const selecionados = this.obterListaContatosInstalacaoOs();
            const alvoFull = normStr(rotuloOuNome);
            const alvoNome = normStr(String(rotuloOuNome || '').split(' - ')[0]);
            return selecionados.some(sel => {
                const selFull = normStr(sel);
                const selNome = normStr(String(sel || '').split(' - ')[0]);
                return (alvoFull && selFull === alvoFull) || (alvoNome && selNome === alvoNome);
            });
        },

        sincronizarChipsContatosInstalacaoOs() {
            const chipsEl = document.getElementById('cos-contatos-inst-chips');
            if (!chipsEl) return;
            const tipoOk = Boolean(String(resolverTipoOsComercial(state.osAtual) || '').trim());
            const lista = this.obterListaContatosInstalacaoOs();
            if (lista.length === 0) {
                chipsEl.innerHTML = '';
                chipsEl.style.display = 'none';
                atualizarVisibilidadeBotaoEnviarLogistica();
                return;
            }
            chipsEl.style.display = 'flex';
            chipsEl.innerHTML = lista.map((ct, idx) => `
                <span style="display:inline-flex; align-items:center; gap:5px; background:#f5f3ff; border:1px solid #c4b5fd; color:#5b21b6; padding:2px 8px; border-radius:999px; font-size:0.71rem; font-weight:700; max-width:100%;">
                    <i class="ph ph-user-check" style="font-size:0.8rem; color:#7c3aed;"></i>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:360px;" title="${esc(ct)}">${esc(ct)}</span>
                    ${tipoOk ? `<button type="button" onclick="window._comercialOS.removerContatoInstalacaoChipOs(${idx})" title="Remover este contato de instalação"
                        style="border:none !important; background:transparent !important; color:#dc2626 !important; cursor:pointer; font-weight:900 !important; font-size:0.84rem !important; padding:0 2px !important; height:auto !important; line-height:1;">&times;</button>` : ''}
                </span>
            `).join('');
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        async abrirDropdownContatosInstalacaoOs(mostrarTodos = true) {
            const drop = document.getElementById('cos-contato-inst-dropdown');
            const inp = document.getElementById('cos-contato-inst');
            if (!drop || !inp || inp.disabled) return;
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Selecione ou informe o Cliente primeiro para listar os contatos de instalação.</div>`;
                drop.style.display = 'block';
                return;
            }
            if (!Array.isArray(this._contatosCacheAtualOs) && typeof window._obterDadosContatosClienteProposta === 'function') {
                const res = await window._obterDadosContatosClienteProposta(cliNome).catch(() => ({ contatosDoCliente: [] }));
                this._contatosCacheAtualOs = Array.isArray(res?.contatosDoCliente) ? res.contatosDoCliente : [];
            }
            this.renderDropdownContatosInstalacaoOs(inp.value, mostrarTodos);
        },

        async toggleDropdownContatosInstalacaoOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const drop = document.getElementById('cos-contato-inst-dropdown');
            if (drop && drop.style.display === 'block') {
                drop.style.display = 'none';
                return;
            }
            await this.abrirDropdownContatosInstalacaoOs(true);
            document.getElementById('cos-contato-inst')?.focus();
        },

        async filtrarDropdownContatosInstalacaoOs(termo) {
            const cliNome = this._obterNomeClienteAtualOs();
            if (!Array.isArray(this._contatosCacheAtualOs) && cliNome && typeof window._obterDadosContatosClienteProposta === 'function') {
                const res = await window._obterDadosContatosClienteProposta(cliNome).catch(() => ({ contatosDoCliente: [] }));
                this._contatosCacheAtualOs = Array.isArray(res?.contatosDoCliente) ? res.contatosDoCliente : [];
            }
            this.renderDropdownContatosInstalacaoOs(termo, false);
        },

        renderDropdownContatosInstalacaoOs(termoFiltro = '', mostrarTodos = false) {
            const drop = document.getElementById('cos-contato-inst-dropdown');
            if (!drop) return;
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Selecione ou informe o Cliente primeiro para listar os contatos de instalação.</div>`;
                drop.style.display = 'block';
                return;
            }
            const base = Array.isArray(this._contatosCacheAtualOs) ? this._contatosCacheAtualOs : [];
            // Filtra fora os contatos que já foram selecionados para instalação
            const disponiveis = base.filter(c => {
                const rotulo = [c.nome, c.celular || c.telefone || c.email].filter(Boolean).join(' - ');
                return !this._contatoInstalacaoJaSelecionado(rotulo) && !this._contatoInstalacaoJaSelecionado(c.nome);
            });
            const q = mostrarTodos ? '' : normStr(termoFiltro);
            const filtrados = !q
                ? disponiveis
                : disponiveis.filter(c =>
                    normStr(c.nome).includes(q) ||
                    normStr(c.cargo).includes(q) ||
                    normStr(c.celular).includes(q) ||
                    normStr(c.telefone).includes(q) ||
                    normStr(c.telefone_ramal).includes(q) ||
                    normStr(c.email).includes(q)
                );

            if (!filtrados.length) {
                const msgVazio = (base.length > 0 && disponiveis.length === 0)
                    ? 'Todos os contatos cadastrados deste cliente já foram selecionados.'
                    : 'Nenhum contato disponível encontrado (digite e pressione Enter ou clique no + para cadastrar).';
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">${esc(msgVazio)}</div>`;
                drop.style.display = 'block';
                return;
            }

            drop.innerHTML = filtrados.slice(0, 60).map(c => {
                const rotulo = [c.nome, c.celular || c.telefone || c.email].filter(Boolean).join(' - ');
                const safeRotulo = String(rotulo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const telsFmt = typeof window.formatarTelefonesContatoDropdown === 'function'
                    ? window.formatarTelefonesContatoDropdown(c).map(t => `📞 ${t}`)
                    : ([c.celular, c.telefone].filter(Boolean).map(t => `📞 ${t}`));
                const subInfo = [c.cargo, ...telsFmt, c.email].filter(Boolean).join(' • ');
                const badgesHtml = typeof window.obterBadgesOpcoesContato === 'function' ? window.obterBadgesOpcoesContato(c) : '';
                return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarContatoInstalacaoOs('${safeRotulo}')"
                    style="padding:6px 10px; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
                        <span style="font-size:0.78rem; font-weight:700; color:#1e293b;">${esc(c.nome)}</span>
                        ${badgesHtml}
                    </div>
                    ${subInfo ? `<div style="font-size:0.7rem; color:#64748b; margin-top:2px;">${esc(subInfo)}</div>` : ''}
                </div>`;
            }).join('');
            drop.style.display = 'block';
        },

        selecionarContatoInstalacaoOs(rotulo) {
            const txt = String(rotulo || '').trim();
            if (!txt) return;
            const lista = this.obterListaContatosInstalacaoOs();
            if (!this._contatoInstalacaoJaSelecionado(txt)) {
                lista.push(txt);
                state.dadosOs.contatos_instalacao = lista;
            }
            const inp = document.getElementById('cos-contato-inst');
            if (inp) inp.value = '';
            this.sincronizarChipsContatosInstalacaoOs();
            this.marcarEditado();
            this.salvarSnapshotAba();
            // Mantém ou fecha suavemente atualizando a lista para que o contato selecionado suma imediatamente
            const drop = document.getElementById('cos-contato-inst-dropdown');
            if (drop && drop.style.display === 'block') {
                this.renderDropdownContatosInstalacaoOs('', true);
            }
        },

        adicionarContatoInstalacaoManualOs() {
            const inp = document.getElementById('cos-contato-inst');
            const val = String(inp?.value || '').trim();
            if (!val) return;
            this.selecionarContatoInstalacaoOs(val);
            const drop = document.getElementById('cos-contato-inst-dropdown');
            if (drop) drop.style.display = 'none';
        },

        removerContatoInstalacaoChipOs(idx) {
            const lista = this.obterListaContatosInstalacaoOs();
            if (idx < 0 || idx >= lista.length) return;
            lista.splice(idx, 1);
            state.dadosOs.contatos_instalacao = lista;
            this.sincronizarChipsContatosInstalacaoOs();
            this.marcarEditado();
            this.salvarSnapshotAba();
            const drop = document.getElementById('cos-contato-inst-dropdown');
            if (drop && drop.style.display === 'block') {
                this.renderDropdownContatosInstalacaoOs(document.getElementById('cos-contato-inst')?.value || '', true);
            }
        },

        async abrirModalNovoContatoInstalacaoOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            if (!String(resolverTipoOsComercial(state.osAtual) || '').trim()) {
                this.onClickCampoBloqueadoPorTipoOs();
                return;
            }
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                Swal.fire('Selecione o Cliente', 'Selecione o Cliente primeiro antes de cadastrar um novo contato de instalação.', 'warning');
                return;
            }
            if (typeof window.cadastrarNovoContatoProposta !== 'function') {
                Swal.fire('Aviso', 'Modal de cadastro de contatos não disponível.', 'warning');
                return;
            }
            const nomeDigitado = String(document.getElementById('cos-contato-inst')?.value || '').trim();
            window._onOsComercialContatoInstalacaoSalvo = (contatoRotulo, empRazao) => {
                this._contatosCacheAtualOs = null;
                if (empRazao && !this._obterNomeClienteAtualOs()) {
                    this.selecionarClienteNaOs(empRazao, '', null);
                }
                this.selecionarContatoInstalacaoOs(contatoRotulo);
                window._onOsComercialContatoInstalacaoSalvo = null;
            };
            await window.cadastrarNovoContatoProposta(nomeDigitado, false, 'os_comercial_instalacao');
        },

        obterListaEnderecosOs(valOpcional = undefined) {
            const raw = valOpcional !== undefined
                ? String(valOpcional || '')
                : String(document.getElementById('cos-endereco-instalacao')?.value || '');
            return raw.split(/\s*\|\s*/).map(s => String(s || '').trim()).filter(Boolean);
        },

        sincronizarChipsEnderecosOs() {
            const chipsEl = document.getElementById('cos-enderecos-chips');
            const inp = document.getElementById('cos-endereco-instalacao');
            if (!chipsEl || !inp) return;
            const tipoOk = Boolean(String(resolverTipoOsComercial(state.osAtual) || '').trim());
            const lista = this.obterListaEnderecosOs(inp.value);
            if (!state.dadosOs) state.dadosOs = {};
            obterMapaLinksMapsEnderecosOs(state.dadosOs);
            if (lista.length === 0) {
                chipsEl.innerHTML = '';
                chipsEl.style.display = 'none';
                this.sincronizarPainelDistribuicaoEnderecos();
                return;
            }
            chipsEl.style.display = 'flex';
            chipsEl.innerHTML = lista.map((end, idx) => {
                const linkAtual = obterLinkMapsDoEnderecoOs(end, state.dadosOs);
                const linkValido = linkGoogleMapsValidoOs(linkAtual);
                const endSafeJs = String(end || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px 8px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:5px 8px;">
                    <div style="display:inline-flex; align-items:center; gap:5px; flex:1.2 1 280px; min-width:220px;">
                        <span style="background:#10b981; color:#fff; border-radius:999px; padding:1px 6px; font-size:0.66rem; font-weight:800; flex-shrink:0;">#${idx + 1}</span>
                        <span style="font-size:0.73rem; font-weight:700; color:#065f46; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(end)}">${esc(end)}</span>
                        ${tipoOk ? `<button type="button" onclick="window._comercialOS.removerEnderecoOsChip(${idx})" title="Remover este endereço de instalação"
                            style="border:none !important; background:#fee2e2 !important; color:#dc2626 !important; cursor:pointer; font-weight:900 !important; font-size:0.8rem !important; padding:0 5px !important; height:19px !important; width:auto !important; border-radius:999px !important; line-height:1; flex-shrink:0;">&times;</button>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:5px; flex:1.4 1 320px; min-width:250px;">
                        <span style="font-size:0.7rem; font-weight:800; color:#1e293b; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;">
                            <i class="ph ph-map-pin-line" style="color:#dc2626; font-size:0.85rem;"></i> Google Maps <span style="color:#dc2626;">*</span>:
                        </span>
                        <input type="url" id="cos-end-maps-link-${idx}" value="${esc(linkAtual)}"
                            ${!tipoOk ? 'disabled' : ''}
                            placeholder="Cole aqui o link do Google Maps do local de instalação..."
                            autocomplete="off" spellcheck="false"
                            oninput="window._comercialOS.atualizarLinkMapsEnderecoOs(${idx}, '${endSafeJs}', this.value)"
                            style="flex:1; min-width:150px; height:25px !important; padding:2px 8px !important; font-size:0.73rem !important; border:1px solid ${linkValido ? '#86efac' : '#cbd5e1'} !important; border-radius:6px !important; background:#fff !important; text-transform:none !important;">
                        <button type="button" id="cos-end-maps-open-${idx}"
                            onclick="window._comercialOS.abrirLinkMapsEnderecoOs(${idx}, '${endSafeJs}')"
                            title="${linkValido ? 'Abrir localização no Google Maps em nova aba' : 'Informe um link do Google Maps para abrir'}"
                            style="display:inline-flex !important; align-items:center !important; gap:3px !important; height:25px !important; padding:0 8px !important; border-radius:6px !important; font-size:0.7rem !important; font-weight:700 !important; border:1px solid ${linkValido ? '#93c5fd' : '#e2e8f0'} !important; background:${linkValido ? '#eff6ff' : '#f8fafc'} !important; color:${linkValido ? '#1d4ed8' : '#94a3b8'} !important; cursor:pointer; flex-shrink:0; white-space:nowrap;">
                            <i class="ph ph-arrow-square-out" style="font-size:0.82rem;"></i> Mapa
                        </button>
                    </div>
                </div>`;
            }).join('') + (tipoOk ? `
                <div style="display:flex; justify-content:flex-start;">
                    <button type="button" onclick="window._comercialOS.iniciarAdicaoOutroEnderecoOs(event)"
                        title="Clique para adicionar mais um endereço de instalação na OS"
                        style="display:inline-flex !important; align-items:center !important; gap:4px !important; background:#eff6ff !important; border:1px dashed #3b82f6 !important; color:#1d4ed8 !important; padding:2px 10px !important; height:23px !important; border-radius:999px !important; font-size:0.71rem !important; font-weight:800 !important; cursor:pointer;">
                        <i class="ph ph-plus-circle" style="font-size:0.85rem;"></i> Adicionar outro endereço
                    </button>
                </div>
            ` : '');
            this.sincronizarPainelDistribuicaoEnderecos();
        },

        atualizarLinkMapsEnderecoOs(idx, enderecoTexto, valor) {
            if (!state.dadosOs) state.dadosOs = {};
            const mapa = obterMapaLinksMapsEnderecosOs(state.dadosOs);
            const k = normStr(enderecoTexto);
            const limpo = String(valor || '').trim();
            if (k) {
                if (limpo) mapa[k] = limpo;
                else delete mapa[k];
            }
            const lista = this.obterListaEnderecosOs();
            state.dadosOs.enderecos_instalacao_detalhes = lista.map(e => ({
                endereco: e,
                link_maps: obterLinkMapsDoEnderecoOs(e, state.dadosOs)
            }));

            const inpLink = document.getElementById(`cos-end-maps-link-${idx}`);
            const btnOpen = document.getElementById(`cos-end-maps-open-${idx}`);
            const valido = linkGoogleMapsValidoOs(limpo);
            if (inpLink) {
                inpLink.style.borderColor = valido ? '#86efac' : '#cbd5e1';
            }
            if (btnOpen) {
                btnOpen.style.borderColor = valido ? '#93c5fd' : '#e2e8f0';
                btnOpen.style.background = valido ? '#eff6ff' : '#f8fafc';
                btnOpen.style.color = valido ? '#1d4ed8' : '#94a3b8';
                btnOpen.title = valido ? 'Abrir localização no Google Maps em nova aba' : 'Informe um link do Google Maps para abrir';
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        abrirLinkMapsEnderecoOs(idx, enderecoTexto) {
            const inpLink = document.getElementById(`cos-end-maps-link-${idx}`);
            const raw = inpLink ? inpLink.value : obterLinkMapsDoEnderecoOs(enderecoTexto, state.dadosOs);
            if (!linkGoogleMapsValidoOs(raw)) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Link do Google Maps', 'Insira primeiro um link válido do Google Maps (ex: https://maps.app.goo.gl/...) para este endereço.', 'info');
                }
                inpLink?.focus();
                return;
            }
            const urlFinal = normalizarUrlAbrirMapsOs(raw);
            if (urlFinal) window.open(urlFinal, '_blank', 'noopener,noreferrer');
        },

        sincronizarPainelDistribuicaoEnderecos() {
            const wrap = document.getElementById('cos-distribuicao-enderecos-wrap');
            if (wrap) {
                wrap.innerHTML = renderDistribuicaoProdutosEnderecosHtml(state.osAtual);
            }
            const tbody = document.getElementById('cos-produtos-tbody');
            if (tbody) {
                tbody.innerHTML = renderProdutosGridHtml(state.osAtual);
            }
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        ajustarDeltaDistribuicao(endIdx, prodIdx, delta) {
            const inp = document.getElementById(`cos-dist-inp-${endIdx}-${prodIdx}`);
            const cur = parseInt(inp?.value ?? 0, 10) || 0;
            const novo = Math.max(0, cur + delta);
            if (inp) inp.value = String(novo);
            this.atualizarQtdProdutoNoEndereco(endIdx, prodIdx, novo);
        },

        atualizarQtdProdutoNoEndereco(endIdx, prodIdx, valorRaw) {
            if (!state.dadosOs) state.dadosOs = {};
            const prop = state.osAtual;
            const listaEnds = obterListaEnderecosEstadoAtualOs(prop, state.dadosOs);
            const itensAtivos = obterProdutosMescladosOs(prop).filter(it => it && !it._substituido_por_aditivo);
            if (listaEnds.length <= 1 || !itensAtivos[prodIdx]) return;

            const dist = normalizarEstruturaDistribuicaoEnderecos(prop, state.dadosOs);
            const qtdTotal = Math.max(1, parseInt(itensAtivos[prodIdx].quantidade ?? itensAtivos[prodIdx].qtde ?? 1, 10) || 1);
            let novoVal = Math.max(0, parseInt(valorRaw, 10) || 0);
            if (novoVal > qtdTotal) novoVal = qtdTotal;

            if (listaEnds.length === 2) {
                // Com 2 endereços, ao atualizar um endereço o outro recebe automaticamente o restante!
                const outroIdx = endIdx === 0 ? 1 : 0;
                dist[endIdx].quantidades[prodIdx] = novoVal;
                dist[outroIdx].quantidades[prodIdx] = Math.max(0, qtdTotal - novoVal);
            } else {
                // Com 3+ endereços, se editar qualquer endereço antes do último, calcula o saldo restante automaticamente no último endereço
                const lastIdx = listaEnds.length - 1;
                if (endIdx !== lastIdx) {
                    let somaOutrosFixos = 0;
                    for (let i = 0; i < lastIdx; i++) {
                        if (i !== endIdx) somaOutrosFixos += (parseInt(dist[i]?.quantidades?.[prodIdx] ?? 0, 10) || 0);
                    }
                    const maxPermitidoAqui = Math.max(0, qtdTotal - somaOutrosFixos);
                    if (novoVal > maxPermitidoAqui) novoVal = maxPermitidoAqui;
                    dist[endIdx].quantidades[prodIdx] = novoVal;
                    dist[lastIdx].quantidades[prodIdx] = Math.max(0, qtdTotal - somaOutrosFixos - novoVal);
                } else {
                    let somaAnteriores = 0;
                    for (let i = 0; i < lastIdx; i++) {
                        somaAnteriores += (parseInt(dist[i]?.quantidades?.[prodIdx] ?? 0, 10) || 0);
                    }
                    const maxNoUltimo = Math.max(0, qtdTotal - somaAnteriores);
                    if (novoVal > maxNoUltimo) novoVal = maxNoUltimo;
                    dist[lastIdx].quantidades[prodIdx] = novoVal;
                }
            }

            // Atualiza resumo_itens e reflete valores no DOM em tempo real sem perder o foco do campo digitado
            dist.forEach((entry, eIdx) => {
                entry.resumo_itens = itensAtivos.map((it, pI) => {
                    const q = entry.quantidades[pI] || 0;
                    if (q <= 0) return null;
                    const assoc = associarProdutoComEquipamentoOsLogistica(it, prop);
                    return { produto: assoc.nome, icone: assoc.icone || '', quantidade: q };
                }).filter(Boolean);

                const inpCell = document.getElementById(`cos-dist-inp-${eIdx}-${prodIdx}`);
                if (inpCell && String(inpCell.value) !== String(entry.quantidades[prodIdx])) {
                    inpCell.value = String(entry.quantidades[prodIdx]);
                }
                const somaEnd = itensAtivos.reduce((acc, _, pI) => acc + (parseInt(entry.quantidades?.[pI] ?? 0, 10) || 0), 0);
                const badgeEnd = document.getElementById(`cos-dist-total-end-${eIdx}`);
                if (badgeEnd) {
                    badgeEnd.textContent = somaEnd > 0 ? `${somaEnd} unid. neste endereço` : 'Nenhum produto vinculado';
                    badgeEnd.style.background = somaEnd > 0 ? '#eff6ff' : '#fee2e2';
                    badgeEnd.style.color = somaEnd > 0 ? '#1d4ed8' : '#b91c1c';
                    badgeEnd.style.borderColor = somaEnd > 0 ? '#bfdbfe' : '#fecaca';
                }
            });

            const assocProd = associarProdutoComEquipamentoOsLogistica(itensAtivos[prodIdx], prop);
            const alocadoProd = dist.reduce((acc, d) => acc + (parseInt(d.quantidades?.[prodIdx] ?? 0, 10) || 0), 0);
            const faltaProd = qtdTotal - alocadoProd;
            const completoProd = faltaProd === 0;
            const resProdEl = document.getElementById(`cos-dist-resumo-prod-${prodIdx}`);
            if (resProdEl) {
                resProdEl.style.background = completoProd ? '#dcfce7' : '#ffedd5';
                resProdEl.style.color = completoProd ? '#15803d' : '#c2410c';
                resProdEl.style.borderColor = completoProd ? '#86efac' : '#fdba74';
                resProdEl.innerHTML = `<span>${assocProd.icone ? assocProd.icone + ' ' : ''}${esc(assocProd.nome)}:</span> <span>${alocadoProd} / ${qtdTotal}</span> <span>${completoProd ? '✓' : `(Falta ${faltaProd})`}</span>`;
            }

            // Atualiza em tempo real na tabela de Produtos a quantidade de endereços em que cada produto tem qtd > 0
            itensAtivos.forEach((_, pI) => {
                const cellCnt = document.getElementById(`cos-prod-endcount-${pI}`);
                if (cellCnt) {
                    const qtdEndsP = obterContagemEnderecosDoProdutoOs(prop, { ...state.dadosOs, distribuicao_enderecos: dist }, pI, listaEnds);
                    cellCnt.innerHTML = renderBadgeQtdEnderecosProdutoHtml(qtdEndsP, listaEnds.length);
                }
            });

            state.dadosOs.distribuicao_enderecos = dist;
            const hdrStatusEl = document.getElementById('cos-dist-header-status');
            if (hdrStatusEl) {
                const chkD = validarDistribuicaoProdutosEnderecosOs(prop, state.dadosOs);
                hdrStatusEl.style.background = chkD.ok ? '#dcfce7' : '#ffedd5';
                hdrStatusEl.style.color = chkD.ok ? '#15803d' : '#c2410c';
                hdrStatusEl.style.borderColor = chkD.ok ? '#86efac' : '#fdba74';
                hdrStatusEl.textContent = chkD.ok ? '✓ 100% distribuído' : 'Pendente vincular';
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        async abrirModalNovoClienteOs(event, prefilledName = '') {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            if (osVeioDeContrato(state.osAtual)) return;
            if (!String(resolverTipoOsComercial(state.osAtual) || '').trim()) {
                this.onClickCampoBloqueadoPorTipoOs();
                return;
            }
            if (typeof window.abrirModalCadastroCliente !== 'function') {
                Swal.fire('Aviso', 'Modal de cadastro de clientes não disponível.', 'warning');
                return;
            }
            const nomeIni = prefilledName || this._obterNomeClienteAtualOs() || '';
            window._onOsComercialClienteSalvo = (razaoSocial, grupoClientes, clienteIdNovo) => {
                window._cosClientesIndexadosCache = null;
                garantirCacheClientesRapidoOs(true).catch(() => {});
                this.selecionarClienteNaOs(razaoSocial, grupoClientes || '', clienteIdNovo || null);
                window._onOsComercialClienteSalvo = null;
            };
            await window.abrirModalCadastroCliente(null, nomeIni);
        },

        async abrirModalNovoContatoOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            if (!String(resolverTipoOsComercial(state.osAtual) || '').trim()) {
                this.onClickCampoBloqueadoPorTipoOs();
                return;
            }
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                Swal.fire('Selecione o Cliente', 'Selecione o Cliente primeiro antes de cadastrar um novo contato.', 'warning');
                return;
            }
            if (typeof window.cadastrarNovoContatoProposta !== 'function') {
                Swal.fire('Aviso', 'Modal de cadastro de contatos não disponível.', 'warning');
                return;
            }
            const nomeDigitado = String(document.getElementById('cos-contato')?.value || '').trim();
            window._onOsComercialContatoSalvo = (contatoNome, empRazao) => {
                this._contatosCacheAtualOs = null;
                if (empRazao && !this._obterNomeClienteAtualOs()) {
                    this.selecionarClienteNaOs(empRazao, '', null);
                }
                this.selecionarContatoOs(contatoNome);
                window._onOsComercialContatoSalvo = null;
            };
            await window.cadastrarNovoContatoProposta(nomeDigitado, false, 'os_comercial');
        },

        async _obterCatalogoEquipamentosOs() {
            if (Array.isArray(window._equipamentosEstoqueData) && window._equipamentosEstoqueData.length > 0) {
                return window._equipamentosEstoqueData;
            }
            if (typeof window.apiGet === 'function') {
                try {
                    const lista = await window.apiGet('/estoque-equipamentos');
                    if (Array.isArray(lista)) {
                        window._equipamentosEstoqueData = lista;
                        return lista;
                    }
                } catch (_) {}
            }
            return [];
        },

        _obterListaProdutosMutavelOs() {
            if (state.osAtual && state.osAtual.id) {
                let arr = [];
                try {
                    arr = typeof state.osAtual.itens === 'string' ? JSON.parse(state.osAtual.itens || '[]') : (Array.isArray(state.osAtual.itens) ? state.osAtual.itens : []);
                } catch (_) { arr = []; }
                return Array.isArray(arr) ? arr : [];
            }
            if (!Array.isArray(state.itensProdutosDraft)) state.itensProdutosDraft = [];
            return state.itensProdutosDraft;
        },

        _salvarListaProdutosMutavelOs(novaLista) {
            if (state.osAtual && state.osAtual.id) {
                state.osAtual.itens = novaLista;
            } else {
                state.itensProdutosDraft = novaLista;
            }
        },

        _obterListaServicosMutavelOs() {
            if (state.osAtual && state.osAtual.id) {
                let arr = [];
                try {
                    arr = typeof state.osAtual.itens_servicos === 'string' ? JSON.parse(state.osAtual.itens_servicos || '[]') : (Array.isArray(state.osAtual.itens_servicos) ? state.osAtual.itens_servicos : []);
                } catch (_) { arr = []; }
                return Array.isArray(arr) ? arr : [];
            }
            if (!Array.isArray(state.itensServicosDraft)) state.itensServicosDraft = [];
            return state.itensServicosDraft;
        },

        _salvarListaServicosMutavelOs(novaLista) {
            if (state.osAtual && state.osAtual.id) {
                state.osAtual.itens_servicos = novaLista;
            } else {
                state.itensServicosDraft = novaLista;
            }
        },

        onInputManutSemProdutoOs(inputEl) {
            if (!inputEl) return;
            const raw = String(inputEl.value || '');
            const prev = String(inputEl.dataset.prevManut || '');
            let digits = '';
            if (prev && prev.endsWith('x') && raw === prev.slice(0, -1)) {
                digits = prev.replace(/\D+/g, '').slice(0, -1);
            } else {
                digits = raw.replace(/\D+/g, '');
            }
            let n = digits ? parseInt(digits, 10) : 0;
            if (!isNaN(n) && n > 7) n = 7;
            const novoVal = (!isNaN(n) && n > 0) ? `${n}x` : '';
            inputEl.value = novoVal;
            inputEl.dataset.prevManut = novoVal;
            if (novoVal && typeof inputEl.setSelectionRange === 'function') {
                try {
                    const pos = Math.max(0, novoVal.length - 1);
                    inputEl.setSelectionRange(pos, pos);
                } catch (_) {}
            }
        },

        ajustarManutSemProdutoOs(delta) {
            const inp = document.getElementById('cos-prod-manut');
            if (!inp || inp.disabled) return;
            const cur = parseInt(String(inp.value || '').replace(/\D+/g, ''), 10) || 1;
            const novo = Math.min(7, Math.max(1, cur + (Number(delta) || 0)));
            const novoTxt = `${novo}x`;
            inp.value = novoTxt;
            inp.dataset.prevManut = novoTxt;
        },

        toggleDropdownProdutosOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const drop = document.getElementById('cos-prod-dropdown');
            const inp = document.getElementById('cos-prod-input');
            if (!drop || !inp || inp.disabled) return;
            if (drop.style.display === 'block') {
                drop.style.display = 'none';
                return;
            }
            this.filtrarDropdownProdutosOs('', true);
            inp.focus();
        },

        async _obterProdutosParaSelecaoOsAtual() {
            const tipoOsVal = resolverTipoOsComercial(state.osAtual);
            if (normStr(tipoOsVal) === 'equipamentos') {
                const catalogo = await this._obterCatalogoEquipamentosOs();
                return catalogo
                    .filter(p => {
                        const f = normStr(p.fonte_fornecimento);
                        const g = normStr(p.grupo_produto);
                        return f.includes('parceir') && g !== 'servicos' && g !== 'servico';
                    })
                    .map(p => ({
                        codigo: String(p.codigo || p.id || ''),
                        nome: String(p.nome || '').trim(),
                        icone: '',
                        label: String(p.nome || '').trim(),
                        fonte: 'PARCEIROS',
                        grupo: String(p.grupo_produto || 'PARCEIROS').trim()
                    }))
                    .filter(p => Boolean(p.nome));
            }
            const modAt = resolverModalidadeObraEventoOs(state.osAtual, state.dadosOs);
            return obterEquipamentosLogisticaPorModalidadeOs(modAt).map(p => ({
                codigo: p.nome,
                nome: p.nome,
                icone: p.icone || '',
                label: p.label || p.nome,
                fonte: 'PACOTE OBRA',
                grupo: p.grupo
            }));
        },

        async filtrarDropdownProdutosOs(termo = '', abrir = true) {
            const drop = document.getElementById('cos-prod-dropdown');
            const inp = document.getElementById('cos-prod-input');
            if (!drop || !inp || inp.disabled) return;
            const prods = await this._obterProdutosParaSelecaoOsAtual();
            const ehTipoEquip = normStr(resolverTipoOsComercial(state.osAtual)) === 'equipamentos';
            const q = normStr(termo);
            const filtrados = !q
                ? prods
                : prods.filter(p => normStr(`${p.nome} ${p.label} ${p.grupo || ''}`).includes(q));
            if (!filtrados.length) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.75rem; color:#64748b;">${ehTipoEquip ? 'Nenhum produto da fonte Parceiros encontrado.' : 'Nenhum equipamento encontrado.'}</div>`;
            } else {
                drop.innerHTML = filtrados.slice(0, 80).map(p => {
                    const nomeEsc = String(p.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const labelEsc = String(p.label || p.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const fonteEsc = String(p.fonte || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarProdutoDropdownOs('${nomeEsc}', '${labelEsc}', '${fonteEsc}')"
                        style="padding:7px 10px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:7px;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                        ${p.icone ? `<span style="font-size:0.95rem;">${p.icone}</span>` : ''}
                        <span style="font-size:0.77rem; font-weight:800; color:#1e293b;">${esc(p.nome)}</span>
                    </div>`;
                }).join('');
            }
            if (abrir) drop.style.display = 'block';
        },

        selecionarProdutoDropdownOs(nome, labelComIcone, fonte = 'PACOTE OBRA') {
            const inp = document.getElementById('cos-prod-input');
            const drop = document.getElementById('cos-prod-dropdown');
            if (inp) {
                inp.value = labelComIcone || nome || '';
                inp.dataset.codigo = nome || '';
                inp.dataset.nome = nome || '';
                inp.dataset.fonte = fonte || 'PACOTE OBRA';
            }
            if (drop) drop.style.display = 'none';
        },

        async abrirModalPesquisaProdutosOs() {
            if (osVeioDeContrato(state.osAtual)) return;
            const modAt = resolverModalidadeObraEventoOs(state.osAtual, state.dadosOs);
            const ehTipoEquip = normStr(resolverTipoOsComercial(state.osAtual)) === 'equipamentos';
            const prods = await this._obterProdutosParaSelecaoOsAtual();
            const termoIni = limparPrefixoGrupoSeguroOs(document.getElementById('cos-prod-input')?.value || '')
                .replace(/^[^\p{L}\p{N}]+/gu, '')
                .trim();

            let renderizados = prods;
            window._cosSelProdModalIdx = (idx) => {
                const p = renderizados[idx];
                if (!p) return;
                Swal.close();
                this.selecionarProdutoDropdownOs(String(p.nome || ''), String(p.label || p.nome || ''), String(p.fonte || 'PACOTE OBRA'));
            };

            const renderRows = (list) => {
                renderizados = list;
                if (!list.length) return '<tr><td colspan="2" style="padding:1.5rem; text-align:center; color:#94a3b8;">Nenhum produto encontrado.</td></tr>';
                return list.slice(0, 150).map((p, idx) => `
                    <tr onclick="window._cosSelProdModalIdx(${idx})" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                        <td style="padding:8px 12px; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:8px;">
                            ${p.icone ? `<span style="font-size:1.05rem;">${p.icone}</span>` : ''}
                            <span>${esc(p.nome || '—')}</span>
                        </td>
                        <td style="padding:8px 12px; color:#475569; width:140px; font-weight:700;">${esc(ehTipoEquip ? 'PARCEIROS' : p.grupo)}</td>
                    </tr>
                `).join('');
            };

            Swal.fire({
                title: '',
                width: '600px',
                showConfirmButton: false,
                showCloseButton: true,
                customClass: { popup: 'custom-swal-padding-zero' },
                html: `<div style="text-align:left; font-family:'Inter',sans-serif;">
                    <div style="padding:14px 18px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:1.02rem; color:#1e293b;">
                        <i class="ph ph-package" style="color:#7048e8;"></i> ${ehTipoEquip ? 'Selecionar Produto (Fonte: Parceiros)' : `Selecionar Equipamento (${esc(modAt)})`}
                    </div>
                    <div style="padding:14px 16px; background:#f1f5f9; display:flex; flex-direction:column; gap:10px;">
                        <input type="text" id="modal-cos-prod-q" value="${esc(termoIni)}" placeholder="${ehTipoEquip ? 'Digite o nome do produto parceiro...' : 'Digite o equipamento (ex: STD, LX, EXL, PCD, Guarita...)'}"
                            style="width:100%; height:36px; padding:0 10px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; font-size:0.84rem; text-transform:none; box-sizing:border-box;">
                        <div style="max-height:360px; overflow:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                            <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.8rem;">
                                <thead><tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                    <th style="padding:8px 12px;">Produto / Equipamento</th>
                                    <th style="padding:8px 12px; width:140px;">${ehTipoEquip ? 'Fonte' : 'Modalidade'}</th>
                                </tr></thead>
                                <tbody id="modal-cos-prod-tbody">${renderRows(termoIni ? prods.filter(p => normStr(p.nome).includes(normStr(termoIni))) : prods)}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`,
                didOpen: () => {
                    const inp = document.getElementById('modal-cos-prod-q');
                    const tb = document.getElementById('modal-cos-prod-tbody');
                    inp?.addEventListener('input', () => {
                        const q = normStr(inp.value);
                        const f = q ? prods.filter(p => normStr(p.nome).includes(q)) : prods;
                        if (tb) tb.innerHTML = renderRows(f);
                    });
                    setTimeout(() => inp?.focus(), 40);
                }
            });
        },

        adicionarProdutoOsAvulsa() {
            if (osVeioDeContrato(state.osAtual)) return;
            const inp = document.getElementById('cos-prod-input');
            const nomeDataset = String(inp?.dataset?.nome || '').trim();
            const digitadoLimpo = String(inp?.value || '').replace(/^[^\p{L}\p{N}]+/gu, '').trim();
            const nomeFinal = nomeDataset || digitadoLimpo;
            if (!nomeFinal) {
                Swal.fire('Produto obrigatório', 'Selecione um produto da lista para adicionar à OS.', 'warning');
                return;
            }
            const ehTipoEquip = normStr(resolverTipoOsComercial(state.osAtual)) === 'equipamentos';
            const fonteFinal = inp?.dataset?.fonte || (ehTipoEquip ? 'PARCEIROS' : 'PACOTE OBRA');
            const qtd = Math.max(1, parseInt(document.getElementById('cos-prod-qtd')?.value || '1', 10) || 1);
            const manutRaw = String(document.getElementById('cos-prod-manut')?.value || '1').replace(/\D+/g, '');
            const modAt = resolverModalidadeObraEventoOs(state.osAtual, state.dadosOs);
            const ehEv = normStr(modAt) === 'evento';
            const manut = ehEv
                ? Math.max(1, parseInt(manutRaw || '1', 10) || 1)
                : Math.min(7, Math.max(1, parseInt(manutRaw || '1', 10) || 1));
            const obs = String(document.getElementById('cos-prod-obs')?.value || '').trim();

            const lista = this._obterListaProdutosMutavelOs();
            lista.push({
                codigo: nomeFinal,
                produto: nomeFinal,
                descricao: nomeFinal,
                fonte_fornecimento: fonteFinal,
                observacao: obs,
                quantidade: qtd,
                manut_semana: ehEv ? undefined : manut,
                diarias: ehEv ? manut : 1,
                valor_unitario: 0,
                valor_total: 0
            });
            this._salvarListaProdutosMutavelOs(lista);

            if (inp) { inp.value = ''; inp.dataset.codigo = ''; inp.dataset.nome = ''; inp.dataset.fonte = ''; }
            const obsEl = document.getElementById('cos-prod-obs'); if (obsEl) obsEl.value = '';
            const qtdEl = document.getElementById('cos-prod-qtd'); if (qtdEl) qtdEl.value = '1';
            const manutEl = document.getElementById('cos-prod-manut');
            if (manutEl) {
                manutEl.value = ehEv ? '1' : '1x';
                if (!ehEv) manutEl.dataset.prevManut = '1x';
            }

            const tbody = document.getElementById('cos-produtos-tbody');
            if (tbody) tbody.innerHTML = renderProdutosGridHtml(state.osAtual);
            const regrasPS = obterRegrasProdutosEServicosOs(state.osAtual, state.dadosOs);
            const astServ = document.getElementById('cos-servicos-obrig-ast');
            if (astServ) astServ.style.display = regrasPS.servicoObrigatorio ? 'inline' : 'none';
            this.sincronizarPainelDistribuicaoEnderecos();
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        alterarQtdProdutoOsAvulsa(idx, novaQtdRaw) {
            if (osVeioDeContrato(state.osAtual)) return;
            const lista = this._obterListaProdutosMutavelOs();
            if (!lista[idx]) return;
            const qtd = Math.max(1, parseInt(novaQtdRaw, 10) || 1);
            lista[idx].quantidade = qtd;
            lista[idx].valor_total = (Number(lista[idx].valor_unitario) || 0) * qtd;
            this._salvarListaProdutosMutavelOs(lista);
            const tbody = document.getElementById('cos-produtos-tbody');
            if (tbody) tbody.innerHTML = renderProdutosGridHtml(state.osAtual);
            this.sincronizarPainelDistribuicaoEnderecos();
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        removerProdutoOsAvulsa(idx) {
            if (osVeioDeContrato(state.osAtual)) return;
            const lista = this._obterListaProdutosMutavelOs();
            if (idx < 0 || idx >= lista.length) return;
            lista.splice(idx, 1);
            this._salvarListaProdutosMutavelOs(lista);
            if (state.dadosOs && Array.isArray(state.dadosOs.distribuicao_enderecos)) {
                state.dadosOs.distribuicao_enderecos = [];
            }
            const tbody = document.getElementById('cos-produtos-tbody');
            if (tbody) tbody.innerHTML = renderProdutosGridHtml(state.osAtual);
            const regrasPS = obterRegrasProdutosEServicosOs(state.osAtual, state.dadosOs);
            const astServ = document.getElementById('cos-servicos-obrig-ast');
            if (astServ) astServ.style.display = regrasPS.servicoObrigatorio ? 'inline' : 'none';
            this.sincronizarPainelDistribuicaoEnderecos();
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        async _obterServicosUnicosCatalogoOs() {
            const catalogo = await this._obterCatalogoEquipamentosOs();
            const brutos = catalogo.filter(p => {
                const g = normStr(p.grupo_produto);
                return g === 'servicos' || g === 'servico';
            });
            return deduplicarServicosCatalogoOs(brutos);
        },

        async filtrarDropdownServicosOs(termo = '', abrir = true) {
            const drop = document.getElementById('cos-serv-dropdown');
            const inp = document.getElementById('cos-serv-input');
            if (!drop || !inp || inp.disabled) return;
            const servs = await this._obterServicosUnicosCatalogoOs();
            const q = normStr(termo);
            const filtrados = !q
                ? servs.slice(0, 60)
                : servs.filter(p => normStr(p.nome).includes(q)).slice(0, 60);
            if (!filtrados.length) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.75rem; color:#64748b;">Nenhum serviço encontrado (você pode digitar manualmente ou usar a lupa).</div>`;
            } else {
                drop.innerHTML = filtrados.map(p => {
                    const nomeEsc = String(p.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarServicoDropdownOs('', '${nomeEsc}')"
                        style="padding:7px 10px; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                        <div style="font-size:0.76rem; font-weight:700; color:#1e293b;">${esc(p.nome)}</div>
                    </div>`;
                }).join('');
            }
            if (abrir) drop.style.display = 'block';
        },

        selecionarServicoDropdownOs(cod, nome) {
            const inp = document.getElementById('cos-serv-input');
            const drop = document.getElementById('cos-serv-dropdown');
            const limpo = normalizarNomeServicoSemZonaOs(nome) || String(nome || '').trim();
            if (inp) {
                inp.value = limpo;
                inp.dataset.codigo = '';
                inp.dataset.nome = limpo;
            }
            if (drop) drop.style.display = 'none';
        },

        async abrirModalPesquisaServicosOs() {
            if (osVeioDeContrato(state.osAtual)) return;
            const servs = await this._obterServicosUnicosCatalogoOs();
            const termoIni = String(document.getElementById('cos-serv-input')?.value || '').trim();

            let renderizados = servs;
            window._cosSelServModalIdx = (idx) => {
                const p = renderizados[idx];
                if (!p) return;
                Swal.close();
                this.selecionarServicoDropdownOs('', String(p.nome || ''));
            };

            const renderRows = (list) => {
                renderizados = list;
                if (!list.length) return '<tr><td style="padding:1.5rem; text-align:center; color:#94a3b8;">Nenhum serviço encontrado.</td></tr>';
                return list.slice(0, 150).map((p, idx) => `
                    <tr onclick="window._cosSelServModalIdx(${idx})" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                        <td style="padding:9px 12px; font-weight:700; color:#1e293b;">${esc(p.nome || '—')}</td>
                    </tr>
                `).join('');
            };

            Swal.fire({
                title: '',
                width: '560px',
                showConfirmButton: false,
                showCloseButton: true,
                customClass: { popup: 'custom-swal-padding-zero' },
                html: `<div style="text-align:left; font-family:'Inter',sans-serif;">
                    <div style="padding:14px 18px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-weight:800; font-size:1.02rem; color:#1e293b;">
                        <i class="ph ph-wrench" style="color:#2563eb;"></i> Selecionar Serviço
                    </div>
                    <div style="padding:14px 16px; background:#f1f5f9; display:flex; flex-direction:column; gap:10px;">
                        <input type="text" id="modal-cos-serv-q" value="${esc(termoIni)}" placeholder="Digite o nome do serviço..."
                            style="width:100%; height:36px; padding:0 10px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; font-size:0.84rem; text-transform:none; box-sizing:border-box;">
                        <div style="max-height:360px; overflow:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                            <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.8rem;">
                                <thead><tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase;">
                                    <th style="padding:8px 12px;">Serviço</th>
                                </tr></thead>
                                <tbody id="modal-cos-serv-tbody">${renderRows(termoIni ? servs.filter(p => normStr(p.nome).includes(normStr(termoIni))) : servs)}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`,
                didOpen: () => {
                    const inp = document.getElementById('modal-cos-serv-q');
                    const tb = document.getElementById('modal-cos-serv-tbody');
                    inp?.addEventListener('input', () => {
                        const q = normStr(inp.value);
                        const f = q ? servs.filter(p => normStr(p.nome).includes(q)) : servs;
                        if (tb) tb.innerHTML = renderRows(f);
                    });
                    setTimeout(() => inp?.focus(), 40);
                }
            });
        },

        onToggleFreteFobOsAvulsa(checked) {
            if (osVeioDeContrato(state.osAtual)) return;
            const flag = Boolean(checked);
            if (state.osAtual && state.osAtual.id) {
                state.osAtual.servico_frete_fob = flag ? 1 : 0;
                state.osAtual.tipo_frete = flag ? 'FOB' : '';
            } else {
                state.freteFobDraft = flag;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            renderFormOS();
        },

        adicionarServicoOsAvulsa() {
            if (osVeioDeContrato(state.osAtual)) return;
            const inp = document.getElementById('cos-serv-input');
            const nomeDigitado = String(inp?.value || '').trim();
            const nomeRaw = normalizarNomeServicoSemZonaOs(nomeDigitado) || nomeDigitado;
            if (!nomeRaw) {
                Swal.fire('Serviço obrigatório', 'Digite ou selecione um serviço para adicionar à OS.', 'warning');
                return;
            }
            const obs = String(document.getElementById('cos-serv-obs')?.value || '').trim();
            const ehFobServ = normStr(nomeRaw).includes('fob');

            const lista = this._obterListaServicosMutavelOs();
            lista.push({
                codigo: '',
                servico: nomeRaw,
                descricao: nomeRaw,
                observacao: obs,
                valor_unitario: 0,
                valor_total: 0,
                frete_fob: ehFobServ
            });
            this._salvarListaServicosMutavelOs(lista);
            if (ehFobServ) {
                if (state.osAtual && state.osAtual.id) {
                    state.osAtual.servico_frete_fob = 1;
                    state.osAtual.tipo_frete = 'FOB';
                } else {
                    state.freteFobDraft = true;
                }
            }

            if (inp) { inp.value = ''; inp.dataset.codigo = ''; inp.dataset.nome = ''; }
            const obsEl = document.getElementById('cos-serv-obs'); if (obsEl) obsEl.value = '';

            if (ehFobServ) {
                renderFormOS();
            } else {
                const tbody = document.getElementById('cos-servicos-tbody');
                if (tbody) tbody.innerHTML = renderServicosGridHtml(state.osAtual);
                atualizarVisibilidadeBotaoEnviarLogistica();
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        removerServicoOsAvulsa(idx) {
            if (osVeioDeContrato(state.osAtual)) return;
            const lista = this._obterListaServicosMutavelOs();
            if (idx < 0 || idx >= lista.length) return;
            lista.splice(idx, 1);
            this._salvarListaServicosMutavelOs(lista);
            const tbody = document.getElementById('cos-servicos-tbody');
            if (tbody) tbody.innerHTML = renderServicosGridHtml(state.osAtual);
            atualizarVisibilidadeBotaoEnviarLogistica();
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        async iniciarAdicaoOutroEnderecoOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const inp = document.getElementById('cos-endereco-instalacao');
            if (inp && !inp.disabled) {
                const lista = this.obterListaEnderecosOs(inp.value);
                if (lista.length > 0 && !/\|\s*$/.test(inp.value)) {
                    inp.value = lista.join(' | ') + ' | ';
                }
                inp.focus();
                try {
                    const len = inp.value.length;
                    inp.setSelectionRange(len, len);
                } catch (_) {}
            }
            await this.abrirDropdownEnderecosOs(true);
        },

        removerEnderecoOsChip(idx) {
            const inp = document.getElementById('cos-endereco-instalacao');
            if (!inp) return;
            const lista = this.obterListaEnderecosOs(inp.value);
            if (idx < 0 || idx >= lista.length) return;
            lista.splice(idx, 1);
            const novoVal = lista.join(' | ');
            inp.value = novoVal;
            this.onChangeCampoOsAvulsa('endereco_instalacao', novoVal);
            this.sincronizarChipsEnderecosOs();
        },

        onInputEnderecoOs(valor) {
            this.onChangeCampoOsAvulsa('endereco_instalacao', valor);
            this.sincronizarChipsEnderecosOs();
            this.filtrarDropdownEnderecosOs(valor);
        },

        _formatarEnderecoLocalOs(e) {
            if (!e) return '';
            if (typeof window._formatarEnderecoEntregaProposta === 'function') {
                return window._formatarEnderecoEntregaProposta(e);
            }
            const ruaNum = [e.endereco, e.numero].filter(Boolean).join(', ');
            const cidUf = [e.municipio, e.uf].filter(Boolean).join('/');
            const corpo = [ruaNum, e.complemento, e.bairro, cidUf, e.cep].filter(Boolean).join(' - ');
            return [e.nome_local, corpo].filter(Boolean).join(' - ');
        },

        async carregarEnderecosClienteOsAtual(forcar = false) {
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) return [];
            let cliId = (state.osAtual && state.osAtual.cliente_id) || (state.dadosOs && state.dadosOs.cliente_id_draft) || '';
            if (!cliId && Array.isArray(window._cosClientesIndexadosCache)) {
                const match = window._cosClientesIndexadosCache.find(c => normStr(c.nome_limpo) === normStr(cliNome));
                if (match && match.id) cliId = match.id;
            }
            if (!cliId && Array.isArray(window._clientesCache)) {
                const match2 = window._clientesCache.find(c => normStr(c.nome_razao_social) === normStr(cliNome) || normStr(c.nome_fantasia) === normStr(cliNome));
                if (match2 && match2.id) cliId = match2.id;
            }
            const key = `${cliId || ''}::${normStr(cliNome)}`;
            if (!forcar && this._enderecosCacheKeyOs === key && Array.isArray(this._enderecosCacheAtualOs)) {
                return this._enderecosCacheAtualOs;
            }
            if (!forcar && this._enderecosLoadPromiseOs && this._enderecosLoadPromiseKeyOs === key) {
                return this._enderecosLoadPromiseOs;
            }

            this._enderecosLoadPromiseKeyOs = key;
            this._enderecosLoadPromiseOs = (async () => {
                let ends = [];
                try {
                    const qs = new URLSearchParams();
                    if (cliId) qs.set('cliente_id', String(cliId));
                    qs.set('cliente_nome', cliNome);
                    if (typeof window.apiGet === 'function') {
                        const rawEnds = await window.apiGet(`/comercial/enderecos-por-cliente?${qs.toString()}`).catch(() => []);
                        if (Array.isArray(rawEnds)) {
                            ends = rawEnds.map(e => ({
                                ...e,
                                texto_completo: this._formatarEnderecoLocalOs(e)
                            })).filter(e => Boolean(e.texto_completo));
                        }
                    }
                } catch (_) {}

                if (!ends.length && typeof window._obterDadosEnderecosClienteProposta === 'function') {
                    const res = await window._obterDadosEnderecosClienteProposta(cliNome).catch(() => ({ enderecosDoCliente: [] }));
                    ends = Array.isArray(res?.enderecosDoCliente) ? res.enderecosDoCliente : [];
                }
                this._enderecosCacheAtualOs = ends;
                this._enderecosCacheKeyOs = key;
                return ends;
            })().finally(() => {
                this._enderecosLoadPromiseOs = null;
            });

            return this._enderecosLoadPromiseOs;
        },

        async abrirDropdownEnderecosOs(mostrarTodos = true) {
            const drop = document.getElementById('cos-endereco-dropdown');
            const inp = document.getElementById('cos-endereco-instalacao');
            if (!drop || !inp || inp.disabled) return;
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Selecione ou informe o Cliente primeiro para listar os endereços cadastrados.</div>`;
                drop.style.display = 'block';
                return;
            }
            const curKey = `${(state.osAtual && state.osAtual.cliente_id) || (state.dadosOs && state.dadosOs.cliente_id_draft) || ''}::${normStr(cliNome)}`;
            if (this._enderecosCacheKeyOs !== curKey || !Array.isArray(this._enderecosCacheAtualOs)) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;"><i class="ph ph-spinner ph-spin"></i> Carregando endereços do cliente...</div>`;
                drop.style.display = 'block';
            }
            await this.carregarEnderecosClienteOsAtual(false);
            this.renderDropdownEnderecosOs(inp.value, mostrarTodos);
        },

        async toggleDropdownEnderecosOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            const drop = document.getElementById('cos-endereco-dropdown');
            if (drop && drop.style.display === 'block') {
                drop.style.display = 'none';
                return;
            }
            await this.abrirDropdownEnderecosOs(true);
            document.getElementById('cos-endereco-instalacao')?.focus();
        },

        async filtrarDropdownEnderecosOs(termo) {
            const cliNome = this._obterNomeClienteAtualOs();
            if (cliNome && !Array.isArray(this._enderecosCacheAtualOs)) {
                await this.carregarEnderecosClienteOsAtual(false);
            }
            this.renderDropdownEnderecosOs(termo, false);
        },

        renderDropdownEnderecosOs(termoFiltro = '', mostrarTodos = false) {
            const drop = document.getElementById('cos-endereco-dropdown');
            if (!drop) return;
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Selecione ou informe o Cliente primeiro para listar os endereços cadastrados.</div>`;
                drop.style.display = 'block';
                return;
            }
            const base = Array.isArray(this._enderecosCacheAtualOs) ? this._enderecosCacheAtualOs : [];
            const listaAtuais = this.obterListaEnderecosOs();
            const ultimoSeg = String(termoFiltro || '').split('|').pop().trim();
            const ultimoJaSel = listaAtuais.some(x => normStr(x) === normStr(ultimoSeg));
            const q = (mostrarTodos || ultimoJaSel) ? '' : normStr(ultimoSeg);
            const filtrados = !q
                ? base
                : base.filter(e =>
                    normStr(e.texto_completo).includes(q) ||
                    normStr(e.nome_local).includes(q) ||
                    normStr(e.endereco).includes(q) ||
                    normStr(e.bairro).includes(q) ||
                    normStr(e.municipio).includes(q) ||
                    normStr(e.cep).includes(q)
                );
            if (!filtrados.length) {
                drop.innerHTML = `<div style="padding:8px 10px; font-size:0.76rem; color:#64748b; text-align:center;">Nenhum endereço cadastrado encontrado para este cliente (clique no botão <b>+</b> amarelo para cadastrar ou digite manualmente).</div>`;
                drop.style.display = 'block';
                return;
            }
            drop.innerHTML = filtrados.slice(0, 60).map(e => {
                const txt = String(e.texto_completo || '').trim();
                const safeTxt = txt.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const jaAdic = listaAtuais.some(x => normStr(x) === normStr(txt));
                const zonaTxt = String(e.zona || '').trim();
                const zonaNorm = normStr(zonaTxt);
                const zonaBg = zonaNorm.includes('central') ? '#dbeafe' : (zonaNorm.includes('amarela') ? '#fef9c3' : (zonaNorm.includes('vermelha') ? '#fee2e2' : '#f1f5f9'));
                const zonaCor = zonaNorm.includes('central') ? '#1d4ed8' : (zonaNorm.includes('amarela') ? '#a16207' : (zonaNorm.includes('vermelha') ? '#b91c1c' : '#475569'));
                const zonaHtml = (zonaTxt && zonaTxt !== 'Outra')
                    ? `<span style="background:${zonaBg}; color:${zonaCor}; padding:1px 6px; border-radius:999px; font-size:0.64rem; font-weight:800;">${esc(zonaTxt)}</span>`
                    : '';
                return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarEnderecoDropdownOs('${safeTxt}')"
                    style="padding:6px 10px; cursor:pointer; border-bottom:1px solid #f1f5f9; background:${jaAdic ? '#f0fdf4' : '#fff'};"
                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${jaAdic ? '#f0fdf4' : '#fff'}'">
                    <div style="font-size:0.76rem; font-weight:700; color:#1e293b; display:flex; align-items:center; justify-content:space-between; gap:6px;">
                        <span style="display:inline-flex; align-items:center; gap:5px; flex-wrap:wrap;">
                            <span>${esc(e.nome_local || e.endereco || 'Endereço')}</span>
                            ${zonaHtml}
                        </span>
                        ${jaAdic ? '<span style="font-size:0.65rem; background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:1px 6px; border-radius:999px; font-weight:800;">✓ Selecionado</span>' : ''}
                    </div>
                    <div style="font-size:0.7rem; color:#64748b; margin-top:2px;">${esc(txt)}</div>
                </div>`;
            }).join('');
            drop.style.display = 'block';
        },

        selecionarEnderecoDropdownOs(textoCompleto) {
            const inp = document.getElementById('cos-endereco-instalacao');
            const drop = document.getElementById('cos-endereco-dropdown');
            const txtNovo = String(textoCompleto || '').trim();
            if (inp && txtNovo) {
                const lista = this.obterListaEnderecosOs(inp.value);
                const jaTem = lista.some(x => normStr(x) === normStr(txtNovo));
                let novoVal = txtNovo;
                if (lista.length > 0) {
                    novoVal = jaTem ? lista.join(' | ') : [...lista, txtNovo].join(' | ');
                }
                inp.value = novoVal;
                this.onChangeCampoOsAvulsa('endereco_instalacao', novoVal);
                this.sincronizarChipsEnderecosOs();
            }
            if (drop) drop.style.display = 'none';
        },

        async abrirModalNovoEnderecoOs(event) {
            if (event) { event.preventDefault(); event.stopPropagation(); }
            if (!String(resolverTipoOsComercial(state.osAtual) || '').trim()) {
                this.onClickCampoBloqueadoPorTipoOs();
                return;
            }
            const cliNome = this._obterNomeClienteAtualOs();
            if (!cliNome) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Selecione o Cliente', 'Selecione o Cliente primeiro antes de cadastrar um novo endereço.', 'warning');
                }
                return;
            }
            if (typeof window.abrirModalEnderecosEntrega !== 'function') {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Aviso', 'Função de cadastro de endereços não está disponível no momento.', 'warning');
                }
                return;
            }

            let cliObj = null;
            const listaCli = Array.isArray(window._cosClientesIndexadosCache) ? window._cosClientesIndexadosCache : [];
            const m1 = listaCli.find(c => normStr(c.nome_limpo) === normStr(cliNome));
            if (m1 && m1.id) {
                cliObj = { id: m1.id, nome_razao_social: m1.nome_limpo };
            } else if (Array.isArray(window._clientesCache)) {
                cliObj = window._clientesCache.find(c => normStr(c.nome_razao_social) === normStr(cliNome) || normStr(c.nome_fantasia) === normStr(cliNome)) || null;
            }
            if (!cliObj) {
                const idSalvo = (state.osAtual && state.osAtual.cliente_id) || (state.dadosOs && state.dadosOs.cliente_id_draft) || null;
                cliObj = idSalvo ? { id: idSalvo, nome_razao_social: cliNome } : { nome_razao_social: cliNome };
            }

            window._onOsComercialEnderecoSalvo = (fullAddress) => {
                this._enderecosCacheAtualOs = null;
                this._enderecosCacheKeyOs = '';
                this._enderecosLoadPromiseOs = null;
                const txtNovo = String(fullAddress || '').trim();
                const inp = document.getElementById('cos-endereco-instalacao');
                const valAtual = inp ? inp.value : ((state.osAtual && state.osAtual.id) ? state.osAtual.endereco_instalacao : (state.dadosOs && state.dadosOs.endereco_instalacao_draft));
                const lista = this.obterListaEnderecosOs(valAtual || '');
                if (txtNovo && !lista.some(x => normStr(x) === normStr(txtNovo))) {
                    lista.push(txtNovo);
                }
                const novoVal = lista.join(' | ');
                if (inp) inp.value = novoVal;
                this.onChangeCampoOsAvulsa('endereco_instalacao', novoVal);
                this.sincronizarChipsEnderecosOs();
                this.carregarEnderecosClienteOsAtual(true).catch(() => {});
            };

            await window.abrirModalEnderecosEntrega(cliObj);
        },

        onChangeCampoOsAvulsa(campo, valor) {
            if (!state.dadosOs) state.dadosOs = {};
            if (state.osAtual && state.osAtual.id) {
                state.osAtual[campo] = valor;
            } else {
                state.dadosOs[`${campo}_draft`] = valor;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        onChangeCampoDadosOs(campo, valor) {
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs[campo] = valor;
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        onInputHorarioIntervaloOs(inp, campo) {
            if (!inp) return;
            const prev = inp.dataset.prevHora || '';
            const fmt = formatarIntervaloHorarioMascaraOs(inp.value, prev);
            inp.value = fmt;
            inp.dataset.prevHora = fmt;
            this.onChangeCampoDadosOs(campo, fmt);
        },

        onToggleHorarioComercial(qual, checked) {
            if (!state.dadosOs) state.dadosOs = {};
            if (qual === 'entrega') {
                state.dadosOs.entrega_horario_comercial = Boolean(checked);
                if (checked) state.dadosOs.hora_entrega = '08:00 às 18:00';
                const inp = document.getElementById('cos-hora-entrega');
                if (inp) {
                    inp.disabled = Boolean(checked);
                    inp.value = checked ? '08:00 às 18:00 (Comercial)' : (state.dadosOs.hora_entrega || '');
                    inp.dataset.prevHora = checked ? '' : (state.dadosOs.hora_entrega || '');
                }
            } else if (qual === 'retirada') {
                state.dadosOs.retirada_horario_comercial = Boolean(checked);
                if (checked) state.dadosOs.hora_retirada = '08:00 às 18:00';
                const inp = document.getElementById('cos-hora-retirada');
                if (inp) {
                    inp.disabled = Boolean(checked);
                    inp.value = checked ? '08:00 às 18:00 (Comercial)' : (state.dadosOs.hora_retirada || '');
                    inp.dataset.prevHora = checked ? '' : (state.dadosOs.hora_retirada || '');
                }
            } else if (qual === 'manutencao') {
                state.dadosOs.manutencao_horario_comercial = Boolean(checked);
                if (checked) state.dadosOs.horario_manutencao = '08:00 às 18:00';
                const inp = document.getElementById('cos-horario-manutencao');
                if (inp) {
                    inp.disabled = Boolean(checked);
                    inp.value = checked ? '08:00 às 18:00 (Horário Comercial)' : (state.dadosOs.horario_manutencao || '');
                    inp.dataset.prevHora = checked ? '' : (state.dadosOs.horario_manutencao || '');
                }
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        adicionarDiaEvento() {
            if (!state.dadosOs) state.dadosOs = {};
            if (!Array.isArray(state.dadosOs.dias_evento)) state.dadosOs.dias_evento = [];
            const dataSug = state.dadosOs.data_entrega || hojeIso();
            state.dadosOs.dias_evento.push({
                data: dataSug,
                hora_inicio: '08:00',
                hora_fim: '18:00'
            });
            const wrap = document.getElementById('cos-dias-evento-wrap');
            if (wrap) wrap.innerHTML = renderDiasEventoRowsHtml();
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        atualizarDiaEvento(idx, campo, valor) {
            if (!state.dadosOs || !Array.isArray(state.dadosOs.dias_evento) || !state.dadosOs.dias_evento[idx]) return;
            state.dadosOs.dias_evento[idx][campo] = valor;
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        removerDiaEvento(idx) {
            if (!state.dadosOs || !Array.isArray(state.dadosOs.dias_evento)) return;
            state.dadosOs.dias_evento.splice(idx, 1);
            const wrap = document.getElementById('cos-dias-evento-wrap');
            if (wrap) wrap.innerHTML = renderDiasEventoRowsHtml();
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
        },

        toggleMenuStatusOs(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const menu = document.getElementById('cos-status-custom-menu');
            if (!menu) return;
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        },

        async filtrarDropdownAtendenteOs(termo = '', abrir = true) {
            const veioDeContrato = osVeioDeContrato(state.osAtual);
            const gestorPode = typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial();
            if (veioDeContrato && !gestorPode) return;
            const drop = document.getElementById('cos-atendente-dropdown');
            const inp = document.getElementById('cos-atendente');
            if (!drop || !inp || inp.disabled) return;
            const lista = (typeof window.carregarAtendentesComercial === 'function')
                ? await window.carregarAtendentesComercial()
                : (window._atendentesComercialCache || []);
            const q = normStr(termo);
            const filtrados = q
                ? lista.filter(a => normStr(a.nome).includes(q) || normStr(a.username).includes(q) || normStr(a.email_corporativo).includes(q))
                : lista;
            if (!filtrados.length) {
                drop.innerHTML = `<div style="padding:7px 10px; font-size:0.74rem; color:#94a3b8;">Nenhum colaborador do Comercial encontrado.</div>`;
            } else {
                drop.innerHTML = filtrados.map(a => {
                    const nomeEsc = String(a.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `<div onmousedown="event.preventDefault(); window._comercialOS.selecionarAtendenteOs('${nomeEsc}')"
                        style="padding:6px 10px; font-size:0.76rem; color:#1e293b; cursor:pointer; border-bottom:1px solid #f1f5f9;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                        <strong>${esc(a.nome)}</strong>
                    </div>`;
                }).join('');
            }
            if (abrir) drop.style.display = 'block';
        },

        toggleDropdownAtendenteOs(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const veioDeContrato = osVeioDeContrato(state.osAtual);
            const gestorPode = typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial();
            if (veioDeContrato && !gestorPode) return;
            const drop = document.getElementById('cos-atendente-dropdown');
            const inp = document.getElementById('cos-atendente');
            if (!drop || !inp || inp.disabled) return;
            if (drop.style.display === 'block') {
                drop.style.display = 'none';
            } else {
                this.filtrarDropdownAtendenteOs('', true);
                inp.focus();
            }
        },

        selecionarAtendenteOs(nome) {
            const inp = document.getElementById('cos-atendente');
            const drop = document.getElementById('cos-atendente-dropdown');
            if (inp) inp.value = nome;
            if (drop) drop.style.display = 'none';
            if (state.osAtual) {
                state.osAtual.atendente = nome;
            } else {
                if (!state.dadosOs) state.dadosOs = {};
                state.dadosOs.atendente_draft = nome;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        async selecionarStatusOs(novoStatus, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const inp = document.getElementById('cos-status-os');
            const badge = document.getElementById('cos-status-custom-badge');
            const menu = document.getElementById('cos-status-custom-menu');
            if (inp) inp.value = novoStatus;
            if (badge) badge.innerHTML = window.renderBadgeStatusOsComercialHtml(novoStatus);
            if (menu) menu.style.display = 'none';
            if (state.osAtual) {
                state.osAtual.status_os = novoStatus;
            } else {
                state.statusNovoDraft = novoStatus;
            }
            this.marcarEditado();
            this.salvarSnapshotAba();
        },

        marcarEditado() {
            state.editadoNaoSalvo = true;
            const btn = document.getElementById('btn-cos-salvar');
            const tipoPreenchido = Boolean(String(resolverTipoOsComercial(state.osAtual) || '').trim());
            if (btn && tipoPreenchido) {
                btn.disabled = false;
                btn.style.background = '#16a34a';
                btn.style.color = '#ffffff';
                btn.style.cursor = 'pointer';
            }
        },

        async enviarAnexosOs(fileList) {
            if (!state.osAtual || !state.osAtual.id) return;
            const files = Array.from(fileList || []);
            if (!files.length) return;
            const titulo = String(document.getElementById('cos-anexo-titulo-input')?.value || '').trim();
            const fd = new FormData();
            files.forEach(f => fd.append('arquivos', f));
            if (titulo) fd.append('titulo', titulo);
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/propostas/${state.osAtual.id}/anexos-os-comercial`, {
                    method: 'POST',
                    headers: tk ? { 'Authorization': 'Bearer ' + tk } : {},
                    body: fd
                });
                const res = await r.json();
                if (!r.ok || !res.success) {
                    Swal.fire('Erro', (res && res.error) || 'Não foi possível anexar documento(s) à OS.', 'error');
                    return;
                }
                const inpTit = document.getElementById('cos-anexo-titulo-input');
                if (inpTit) inpTit.value = '';
                const inpFile = document.getElementById('cos-anexo-file-input');
                if (inpFile) inpFile.value = '';
                await carregarAnexosOs(state.osAtual.id);
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso('Anexo(s) incluído(s) na OS com sucesso!');
                }
            } catch (e) {
                Swal.fire('Erro', e.message || 'Erro ao enviar anexo.', 'error');
            }
        },

        async excluirAnexoOs(anexoId) {
            if (!state.osAtual || !state.osAtual.id || !anexoId) return;
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch(`/api/propostas/${state.osAtual.id}/anexos-os-comercial/${anexoId}`, {
                    method: 'DELETE',
                    headers: tk ? { 'Authorization': 'Bearer ' + tk } : {}
                });
                if (r.ok) {
                    await carregarAnexosOs(state.osAtual.id);
                }
            } catch (_) {}
        },

        async salvarAlteracoesOS(silencioso = false) {
            const tipoOperacao = String(document.getElementById('cos-tipo')?.value || resolverTipoOsComercial(state.osAtual) || '').trim();
            if (!tipoOperacao) {
                if (!silencioso) Swal.fire('Tipo obrigatório', 'Selecione primeiro o Tipo * de OS.', 'warning');
                return false;
            }
            const veioDeContrato = osVeioDeContrato(state.osAtual);
            const gestorPodeEditarAtend = typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial();
            const podeEditarAtend = !veioDeContrato || gestorPodeEditarAtend;
            const novoAtendVal = podeEditarAtend
                ? String(document.getElementById('cos-atendente')?.value || (state.osAtual && state.osAtual.atendente) || (state.dadosOs && state.dadosOs.atendente_draft) || '').trim()
                : ((state.osAtual && state.osAtual.atendente) || '');

            const modAtual = resolverModalidadeObraEventoOs(state.osAtual, state.dadosOs);
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs.modalidade_os = modAtual;
            state.dadosOs.modalidade_obra_evento = modAtual;

            const clienteRawInput = String(document.getElementById('cos-cliente')?.value || (state.osAtual && state.osAtual.cliente_nome) || (state.dadosOs && state.dadosOs.cliente_nome_draft) || '').trim();
            const clienteLimpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(clienteRawInput)
                : limparPrefixoGrupoSeguroOs(clienteRawInput);

            if ((!state.osAtual || !state.osAtual.id) && !clienteLimpo) {
                if (!silencioso) Swal.fire('Cliente obrigatório', 'Selecione um Cliente antes de salvar a OS.', 'warning');
                return false;
            }

            if (normStr(modAtual) !== 'evento' && state.dadosOs.agendar_retirada) {
                const faltaDataRet = !String(state.dadosOs.data_retirada || '').trim();
                const faltaHoraRet = !state.dadosOs.retirada_horario_comercial && !String(state.dadosOs.hora_retirada || '').trim();
                if (faltaDataRet || faltaHoraRet) {
                    if (!silencioso) {
                        Swal.fire(
                            'Retirada obrigatória',
                            'Como a opção "Agendar retirada" está selecionada, preencha a Data de Retirada e o Horário da Retirada (ou marque Horário comercial).',
                            'warning'
                        );
                    }
                    return false;
                }
            } else if (!veioDeContrato && normStr(modAtual) !== 'evento' && !state.dadosOs.agendar_retirada) {
                state.dadosOs.data_retirada = '';
                state.dadosOs.hora_retirada = '';
                state.dadosOs.retirada_horario_comercial = false;
            }

            const contatoAtualVal = String(document.getElementById('cos-contato')?.value || (state.osAtual && state.osAtual.contato_nome) || (state.dadosOs && state.dadosOs.contato_nome_draft) || '').trim();
            const listaCtInstSalvar = this.obterListaContatosInstalacaoOs();
            state.dadosOs.contatos_instalacao = listaCtInstSalvar;
            const contatoInstalacaoStr = listaCtInstSalvar.join(' | ');
            let respContratoObj = {};
            if (state.osAtual && state.osAtual.contatos_responsaveis_contrato_json) {
                try {
                    respContratoObj = typeof state.osAtual.contatos_responsaveis_contrato_json === 'string'
                        ? JSON.parse(state.osAtual.contatos_responsaveis_contrato_json || '{}')
                        : { ...state.osAtual.contatos_responsaveis_contrato_json };
                } catch (_) { respContratoObj = {}; }
            }
            respContratoObj.instalacao = contatoInstalacaoStr;
            respContratoObj.instalacao_lista = listaCtInstSalvar;

            const listaEndSalvar = this.obterListaEnderecosOs();
            const enderecoAtualVal = listaEndSalvar.length > 0
                ? listaEndSalvar.join(' | ')
                : String(document.getElementById('cos-endereco-instalacao')?.value || (state.osAtual && state.osAtual.endereco_instalacao) || '').trim().replace(/\s*\|\s*$/, '');
            state.dadosOs.enderecos_instalacao = listaEndSalvar;
            const mapaMapsSalvar = obterMapaLinksMapsEnderecosOs(state.dadosOs);
            listaEndSalvar.forEach((endTxt, iEnd) => {
                const inpDomMaps = document.getElementById(`cos-end-maps-link-${iEnd}`);
                if (inpDomMaps) {
                    const k = normStr(endTxt);
                    const vLnk = String(inpDomMaps.value || '').trim();
                    if (k) {
                        if (vLnk) mapaMapsSalvar[k] = vLnk;
                        else delete mapaMapsSalvar[k];
                    }
                }
            });
            state.dadosOs.enderecos_instalacao_detalhes = listaEndSalvar.map(endTxt => ({
                endereco: endTxt,
                link_maps: obterLinkMapsDoEnderecoOs(endTxt, state.dadosOs)
            }));
            normalizarEstruturaDistribuicaoEnderecos(state.osAtual, state.dadosOs);

            // Valida regras obrigatórias de Produtos, Serviços, Informações de Compras e Distribuição Fracionada por Endereço
            const regrasPS = obterRegrasProdutosEServicosOs(state.osAtual, state.dadosOs);
            const infoCompEl = document.getElementById('cos-info-importantes-compras');
            if (infoCompEl) {
                state.dadosOs.informacoes_importantes = String(infoCompEl.value || '').trim();
            }
            if (regrasPS.mostrarQuadroInfoCompras && !String(state.dadosOs.informacoes_importantes || '').trim()) {
                if (!silencioso) {
                    Swal.fire('Informação obrigatória', 'Para OS do tipo "Compras", preencha o quadro de Informações Importantes.', 'warning');
                }
                return false;
            }
            if (!veioDeContrato) {
                if (regrasPS.produtoObrigatorio && regrasPS.itensAtivos.length === 0) {
                    if (!silencioso) {
                        Swal.fire('Produto obrigatório', `Para OS do tipo "${tipoOperacao}", é obrigatório adicionar pelo menos um produto.`, 'warning');
                    }
                    return false;
                }
                if (regrasPS.servicoObrigatorio && regrasPS.servsAtivos.length === 0) {
                    if (!silencioso) {
                        const msgServ = regrasPS.ehLimpaFossa
                            ? 'Para OS do tipo "Limpa fossa", é obrigatório selecionar pelo menos um serviço.'
                            : 'Para OS de Obra, é obrigatório adicionar pelo menos um serviço (ou marcar Frete FOB).';
                        Swal.fire('Serviço obrigatório', msgServ, 'warning');
                    }
                    return false;
                }
            }

            const checkDist = regrasPS.mostrarQuadroProdutos
                ? validarDistribuicaoProdutosEnderecosOs(state.osAtual, state.dadosOs)
                : { exigido: false, ok: true, pendencias: [] };
            if (checkDist.exigido && !checkDist.ok) {
                if (!silencioso) {
                    Swal.fire(
                        'Vínculo de produtos por endereço',
                        `Como há mais de um endereço na OS, distribua todos os produtos entre os endereços:\n• ${checkDist.pendencias.join('\n• ')}`,
                        'warning'
                    );
                }
                return false;
            }

            const listaProdsAvulsa = !veioDeContrato
                ? (regrasPS.mostrarQuadroProdutos ? this._obterListaProdutosMutavelOs() : [])
                : [];
            const listaServsAvulsa = !veioDeContrato
                ? (regrasPS.mostrarQuadroServicos ? this._obterListaServicosMutavelOs() : [])
                : [];
            const somaTotalAvulsa = !veioDeContrato
                ? (listaProdsAvulsa.reduce((a, x) => a + (Number(x.valor_total) || 0), 0) + listaServsAvulsa.reduce((a, x) => a + (x.frete_fob ? 0 : (Number(x.valor_total) || 0)), 0))
                : 0;
            const flagFobAvulsa = !veioDeContrato ? (propostaTemFreteFob(state.osAtual) ? 1 : 0) : 0;

            const payload = {
                status_os: document.getElementById('cos-status-os')?.value || (state.osAtual && state.osAtual.status_os) || state.statusNovoDraft || 'EM ELABORAÇÃO',
                os_tipo_operacao: tipoOperacao,
                os_criada_em: document.getElementById('cos-data-cadastro')?.value || (state.osAtual && state.osAtual.os_criada_em) || hojeIso(),
                observacoes: document.getElementById('cos-obs')?.value ?? ((state.osAtual && state.osAtual.observacoes) || ''),
                os_comercial_dados_json: JSON.stringify(state.dadosOs || {}),
                atendente: novoAtendVal,
                contato_nome: contatoAtualVal,
                contato_instalacao_contrato: contatoInstalacaoStr,
                contatos_responsaveis_contrato_json: JSON.stringify(respContratoObj),
                endereco_instalacao: enderecoAtualVal,
                ...(!veioDeContrato ? {
                    modalidade_obra_evento: modAtual,
                    tipo: modAtual === 'Evento' ? 'Proposta Evento' : 'Proposta Obra',
                    titulo_contrato: String(document.getElementById('cos-titulo-contrato')?.value || '').trim(),
                    cliente_nome: clienteLimpo,
                    nome_evento: String(document.getElementById('cos-nome-evento')?.value || '').trim(),
                    itens: JSON.stringify(listaProdsAvulsa),
                    itens_servicos: JSON.stringify(listaServsAvulsa),
                    servico_frete_fob: flagFobAvulsa,
                    tipo_frete: flagFobAvulsa ? 'FOB' : '',
                    valor_total: somaTotalAvulsa
                } : {})
            };

            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                if (!state.osAtual || !state.osAtual.id) {
                    const rNovo = await fetch('/api/comercial/os-avulsa', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                        },
                        body: JSON.stringify(payload)
                    });
                    const resNovo = await rNovo.json();
                    if (!rNovo.ok || !resNovo.success || !resNovo.id) {
                        if (!silencioso) Swal.fire('Erro', (resNovo && resNovo.error) || 'Não foi possível criar a OS.', 'error');
                        return false;
                    }
                    await this.carregarOsPorPropostaId(resNovo.id);
                    if (!silencioso && typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso(`OS Nº ${resNovo.numero_os} criada com sucesso!`);
                    }
                    return true;
                }

                const r = await fetch(`/api/propostas/${state.osAtual.id}/os-comercial`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tk ? { 'Authorization': 'Bearer ' + tk } : {})
                    },
                    body: JSON.stringify(payload)
                });
                const res = await r.json();
                if (!r.ok || !res.success) {
                    if (!silencioso) Swal.fire('Erro', (res && res.error) || 'Não foi possível salvar a OS.', 'error');
                    return false;
                }
                Object.assign(state.osAtual, payload);
                state.editadoNaoSalvo = false;
                this.salvarSnapshotAba();
                renderFormOS();
                if (!silencioso && typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso('OS salva com sucesso!');
                }
                return true;
            } catch (e) {
                if (!silencioso) Swal.fire('Erro', e.message || 'Erro ao salvar a OS.', 'error');
                return false;
            }
        },

        async enviarOsParaLogistica() {
            const check = verificarCamposObrigatoriosOsPreenchidos();
            if (!check.ok) {
                const itensHtml = check.pendencias.map(p => `<li style="margin-bottom:5px; color:#1e293b; font-weight:600;">${esc(p)}</li>`).join('');
                Swal.fire({
                    icon: 'warning',
                    title: 'Campos obrigatórios pendentes',
                    html: `<div style="text-align:left; font-size:0.86rem; font-family:'Inter',sans-serif;">
                        <p style="margin:0 0 8px 0; color:#475569;">Preencha os campos abaixo antes de enviar a OS para a Logística:</p>
                        <ul style="margin:0; padding-left:18px;">${itensHtml}</ul>
                    </div>`,
                    confirmButtonText: 'Entendi',
                    confirmButtonColor: '#2563eb'
                });
                atualizarVisibilidadeBotaoEnviarLogistica();
                return;
            }
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs.enviada_logistica = true;
            state.statusNovoDraft = 'LIBERADO';
            if (state.osAtual) state.osAtual.status_os = 'LIBERADO';
            const inpSt = document.getElementById('cos-status-os');
            if (inpSt) inpSt.value = 'LIBERADO';
            const ok = await this.salvarAlteracoesOS(true);
            if (ok) {
                const numExib = (state.osAtual && state.osAtual.numero_os) || '';
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`OS Nº ${numExib} enviada para a Logística (Status: LIBERADO)!`);
                } else {
                    Swal.fire('Enviada!', `OS Nº ${numExib} enviada para a Logística com status LIBERADO.`, 'success');
                }
            }
        }
    };

    function fecharDropdownsAbertosOsPorAlvo(targetEl) {
        const pares = [
            ['cos-status-custom-wrap', 'cos-status-custom-menu'],
            ['cos-modalidade-custom-wrap', 'cos-modalidade-custom-menu'],
            ['cos-atendente-combo-wrap', 'cos-atendente-dropdown'],
            ['cos-contato-combo-wrap', 'cos-contato-dropdown'],
            ['cos-contato-inst-combo-wrap', 'cos-contato-inst-dropdown'],
            ['cos-endereco-combo-wrap', 'cos-endereco-dropdown'],
            ['cos-prod-combo-wrap', 'cos-prod-dropdown'],
            ['cos-serv-combo-wrap', 'cos-serv-dropdown']
        ];
        pares.forEach(([wrapId, menuId]) => {
            const menu = document.getElementById(menuId);
            if (!menu || menu.style.display === 'none' || !menu.style.display) return;
            const wrap = document.getElementById(wrapId);
            if (!targetEl || !wrap || !wrap.contains(targetEl)) {
                menu.style.display = 'none';
            }
        });
    }

    document.addEventListener('mousedown', (e) => {
        fecharDropdownsAbertosOsPorAlvo(e.target);
    }, true);

    document.addEventListener('focusin', (e) => {
        fecharDropdownsAbertosOsPorAlvo(e.target);
    }, true);

    /* ═══════════════════════════════════════════════════════════════════════════
       ABA INFERIOR (DRAWER MEIA TELA) DE COMENTÁRIOS DA OS DO COMERCIAL
       (Mesma aparência e todas as funções da tela de Contratos)
       ═══════════════════════════════════════════════════════════════════════════ */
    window._comentariosOsCache = [];
    window._comentariosOsTotalGeral = 0;
    window._comentariosOsReplyAberto = {};
    window._comentariosOsAnexosPendentes = {};
    window._cosDrawerComentariosAberto = false;

    function _obterUrlArquivoAnexoOs(anexoId, download = false, propIdOverride = null) {
        const propId = Number(propIdOverride || (state.osAtual && state.osAtual.id));
        if (!propId || !anexoId) return '';
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('rh_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        return `/api/propostas/${propId}/anexos-os-comercial/${encodeURIComponent(String(anexoId))}/arquivo?${download ? 'download=1&' : 'inline=1&'}${token ? `token=${encodeURIComponent(token)}` : ''}`;
    }

    window.abrirArquivoAnexoOsComercial = function (anexoId, download = false, propIdOverride = null) {
        const url = _obterUrlArquivoAnexoOs(anexoId, download, propIdOverride);
        if (url) window.open(url, '_blank');
    };

    function _formatarTamBytesOs(bytes) {
        if (typeof window._formatarTamanhoBytesAnexoContrato === 'function') {
            return window._formatarTamanhoBytesAnexoContrato(bytes);
        }
        const b = Number(bytes || 0);
        if (!b || b <= 0) return '';
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(2)} MB`;
    }

    function _iconeArquivoAnexoOs(nomeArquivo, mimeType) {
        if (typeof window._iconePorArquivoAnexoContrato === 'function') {
            return window._iconePorArquivoAnexoContrato(nomeArquivo, mimeType);
        }
        const ext = String(nomeArquivo || '').split('.').pop().toLowerCase();
        const mime = String(mimeType || '').toLowerCase();
        if (ext === 'pdf' || mime.includes('pdf')) return { icon: 'ph-file-pdf', color: '#dc2626', bg: '#fef2f2', label: 'PDF', kind: 'pdf' };
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext) || mime.startsWith('image/')) return { icon: 'ph-image', color: '#0284c7', bg: '#f0f9ff', label: (ext || 'IMG').toUpperCase(), kind: 'image' };
        return { icon: 'ph-file-text', color: '#475569', bg: '#f8fafc', label: (ext && ext.length <= 5 ? ext.toUpperCase() : 'ARQ'), kind: 'doc' };
    }

    function _gerarHtmlMiniaturaAnexoOs(anexo, tamanhoPx = 46) {
        const a = anexo || {};
        const ic = _iconeArquivoAnexoOs(a.nome_arquivo, a.mime_type);
        const idJsSafe = esc(String(a.id || '')).replace(/'/g, "\\'");
        const propIdJs = Number(a.proposta_id || (state.osAtual && state.osAtual.id) || 0);
        const urlInline = _obterUrlArquivoAnexoOs(a.id, false, propIdJs);
        const w = Number(tamanhoPx) || 46;
        const h = Number(tamanhoPx) || 46;
        const badgeExt = `<span style="position:absolute; bottom:2px; right:2px; background:${ic.color}; color:#fff; font-size:0.56rem; font-weight:800; padding:1px 4px; border-radius:3px; line-height:1.1; pointer-events:none; box-shadow:0 1px 2px rgba(0,0,0,0.2);">${esc(ic.label || 'ARQ')}</span>`;

        if (ic.kind === 'image' && urlInline) {
            return `<div onclick="window.abrirArquivoAnexoOsComercial('${idJsSafe}', false, ${propIdJs})" title="Clique para visualizar ${esc(a.nome_arquivo || 'imagem')}"
                style="width:${w}px; height:${h}px; border-radius:8px; overflow:hidden; position:relative; flex-shrink:0; border:1.5px solid #cbd5e1; background:${ic.bg}; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(15,23,42,0.08);">
                <img src="${esc(urlInline)}" alt="${esc(a.nome_arquivo || '')}"
                    style="width:100%; height:100%; object-fit:cover; display:block;"
                    onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
                <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; flex-direction:column; color:${ic.color};">
                    <i class="ph ${ic.icon}" style="font-size:1.35rem;"></i>
                </div>
                ${badgeExt}
            </div>`;
        }
        if (ic.kind === 'pdf' && urlInline) {
            return `<div onclick="window.abrirArquivoAnexoOsComercial('${idJsSafe}', false, ${propIdJs})" title="Clique para visualizar ${esc(a.nome_arquivo || 'PDF')}"
                style="width:${w}px; height:${h}px; border-radius:8px; overflow:hidden; position:relative; flex-shrink:0; border:1.5px solid #fca5a5; background:#ffffff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(15,23,42,0.08);">
                <iframe src="${esc(urlInline)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" tabindex="-1"
                    style="width:220px; height:220px; border:none; transform:scale(${(w / 220).toFixed(3)}); transform-origin:top left; pointer-events:none; position:absolute; top:0; left:0; background:#fff;"></iframe>
                ${badgeExt}
            </div>`;
        }
        return `<div onclick="window.abrirArquivoAnexoOsComercial('${idJsSafe}', false, ${propIdJs})" title="Clique para abrir ${esc(a.nome_arquivo || 'documento')}"
            style="width:${w}px; height:${h}px; border-radius:8px; overflow:hidden; position:relative; flex-shrink:0; border:1.5px solid #cbd5e1; background:linear-gradient(145deg, #ffffff 0%, ${ic.bg} 100%); cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <div style="position:absolute; top:0; right:0; width:12px; height:12px; background:#e2e8f0; border-bottom-left-radius:4px;"></div>
            <i class="ph ${ic.icon}" style="font-size:1.35rem; color:${ic.color}; margin-bottom:6px;"></i>
            ${badgeExt}
        </div>`;
    }

    function _obterChaveUsuarioComentariosOsVistos() {
        const u = (typeof window.obterNomeUsuarioLogado === 'function' ? window.obterNomeUsuarioLogado() : '') || localStorage.getItem('username') || 'default';
        return `_cosComentariosVistos_${String(u).toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    }

    function _obterMapaComentariosOsVistos() {
        try {
            const raw = localStorage.getItem(_obterChaveUsuarioComentariosOsVistos());
            const parsed = raw ? JSON.parse(raw) : null;
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function _salvarMapaComentariosOsVistos(mapa) {
        try {
            localStorage.setItem(_obterChaveUsuarioComentariosOsVistos(), JSON.stringify(mapa || {}));
        } catch (_) {}
    }

    function _calcularComentariosNovosNaoVistosOs(escopoKey, lista) {
        const arr = Array.isArray(lista) ? lista : [];
        if (!arr.length) return 0;
        const key = String(escopoKey || 'all');
        const mapa = _obterMapaComentariosOsVistos();
        const lastSeenId = Number(mapa[key] || 0);
        const maxId = arr.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0);
        if (window._cosDrawerComentariosAberto) {
            if (maxId > lastSeenId) {
                mapa[key] = maxId;
                _salvarMapaComentariosOsVistos(mapa);
            }
            return 0;
        }
        const meuNomeNorm = normStr(typeof window.obterNomeUsuarioLogado === 'function' ? window.obterNomeUsuarioLogado() : '');
        let novos = 0;
        arr.forEach(c => {
            const cid = Number(c.id) || 0;
            if (cid > lastSeenId) {
                const autorNorm = normStr(c.autor_nome);
                const userNorm = normStr(c.usuario_username);
                if (!meuNomeNorm || (autorNorm !== meuNomeNorm && userNorm !== meuNomeNorm)) {
                    novos++;
                }
            }
        });
        return novos;
    }

    function _marcarComentariosOsComoVistos(escopoKey, lista) {
        const arr = Array.isArray(lista) ? lista : (window._comentariosOsCache || []);
        const key = String(escopoKey || 'all');
        const maxId = arr.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0);
        const mapa = _obterMapaComentariosOsVistos();
        if (maxId > Number(mapa[key] || 0)) {
            mapa[key] = maxId;
            _salvarMapaComentariosOsVistos(mapa);
        }
        const badgeNovos = document.getElementById('cos-comentarios-os-novos-badge');
        if (badgeNovos) {
            badgeNovos.style.display = 'none';
            badgeNovos.textContent = '0';
        }
    }

    function _atualizarBadgesContagemComentariosOs(totalCount, novosCount) {
        const badgeTotal = document.getElementById('cos-comentarios-os-count-badge');
        if (badgeTotal) badgeTotal.textContent = String(Number(totalCount) || 0);
        const badgeNovos = document.getElementById('cos-comentarios-os-novos-badge');
        if (badgeNovos) {
            const n = Number(novosCount) || 0;
            if (n > 0) {
                badgeNovos.textContent = String(n);
                badgeNovos.style.display = 'inline-flex';
            } else {
                badgeNovos.textContent = '0';
                badgeNovos.style.display = 'none';
            }
        }
    }

    function _formatarDataHoraComentarioOs(dtStr) {
        if (typeof window._formatarDataHoraComentarioContrato === 'function') {
            return window._formatarDataHoraComentarioContrato(dtStr);
        }
        const raw = String(dtStr || '').trim();
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{2}):(\d{2}))?/);
        if (m) return (m[4] && m[5]) ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
        return raw || '—';
    }

    function _obterIniciaisAutorOs(nome) {
        if (typeof window._obterIniciaisAutorComentario === 'function') {
            return window._obterIniciaisAutorComentario(nome);
        }
        const limpo = String(nome || '').trim();
        if (!limpo) return 'US';
        const partes = limpo.split(/\s+/).filter(Boolean);
        return partes.length === 1 ? partes[0].substring(0, 2).toUpperCase() : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    window._cosMontarDrawerComentarios = function () {
        let wrapper = document.getElementById('cos-comentarios-drawer-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'cos-comentarios-drawer-wrapper';
            wrapper.style.cssText = [
                'position:fixed',
                'bottom:32px',
                'left:60px',
                'right:0',
                'z-index:9500',
                'display:none',
                'flex-direction:column',
                'align-items:flex-start',
                'pointer-events:none'
            ].join(';');

            wrapper.innerHTML = `
                <div id="cos-comentarios-btn-row" style="padding:0 0 0 12px; pointer-events:auto;">
                    <button type="button" id="cos-comentarios-toggle-btn"
                        title="Comentários da OS"
                        style="
                            display:flex; align-items:center; gap:6px;
                            background:#f1f5f9; border:1.5px solid #cbd5e1;
                            border-bottom:none; border-radius:8px 8px 0 0;
                            padding:5px 16px; cursor:pointer;
                            color:#475569; font-size:0.78rem; font-weight:700;
                            box-shadow:0 -2px 8px rgba(0,0,0,0.06);
                            transition:background 0.15s, color 0.15s;
                        "
                        onmouseenter="this.style.background='#e2e8f0'; this.style.color='#1e293b';"
                        onmouseleave="this.style.background='#f1f5f9'; this.style.color='#475569';"
                        onclick="window._cosToggleDrawerComentarios()"
                    >
                        <i id="cos-comentarios-drawer-icon" class="ph ph-caret-up-bold" style="font-size:0.9rem;"></i>
                        <span>Comentários</span>
                        <span id="cos-comentarios-os-count-badge" title="Total de comentários" style="background:#e2e8f0; color:#334155; border-radius:99px; padding:1px 8px; font-size:0.68rem; font-weight:800;">0</span>
                        <span id="cos-comentarios-os-novos-badge" title="Comentários novos não lidos" style="display:none; background:#dc2626; color:#ffffff; border-radius:99px; padding:1px 8px; font-size:0.68rem; font-weight:800; box-shadow:0 1px 4px rgba(220,38,38,0.35);">0</span>
                    </button>
                </div>

                <div id="cos-comentarios-drawer-panel"
                    style="
                        width:100%; background:#ffffff;
                        border-top:none;
                        box-shadow:none;
                        max-height:0; overflow:hidden;
                        transition:max-height 0.32s cubic-bezier(.4,0,.2,1);
                        display:flex; flex-direction:column;
                        order:-1; pointer-events:auto;
                    "
                >
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 16px; border-bottom:1px solid #e2e8f0; background:#f8fafc; flex-wrap:wrap; flex-shrink:0;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <i class="ph ph-chats-circle" style="color:#6d28d9; font-size:1.15rem;"></i>
                            <span id="cos-comentarios-drawer-titulo" style="font-weight:800; font-size:0.86rem; color:#1e293b;">Comentários da OS</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-left:auto;">
                            <input type="text" id="cos-comentarios-filtro-usuario" list="cos-comentarios-datalist-usuarios"
                                placeholder="Filtrar usuário..." oninput="window.filtrarComentariosOsEmTempoReal()"
                                style="height:28px; width:145px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.74rem; background:#fff; text-transform:none;">
                            <datalist id="cos-comentarios-datalist-usuarios"></datalist>

                            <input type="text" id="cos-comentarios-filtro-departamento" list="cos-comentarios-datalist-departamentos"
                                placeholder="Filtrar depto..." oninput="window.filtrarComentariosOsEmTempoReal()"
                                style="height:28px; width:130px; padding:0 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.74rem; background:#fff; text-transform:none;">
                            <datalist id="cos-comentarios-datalist-departamentos"></datalist>

                            <input type="date" id="cos-comentarios-filtro-data" onchange="window.filtrarComentariosOsEmTempoReal()"
                                style="height:28px; padding:0 6px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.74rem; background:#fff;">

                            <button type="button" onclick="window.limparFiltrosComentariosOs()" title="Limpar filtros"
                                style="height:28px; padding:0 8px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                                Limpar
                            </button>

                            <button type="button" onclick="window.carregarComentariosOsAtiva(null, true)" title="Atualizar comentários"
                                style="height:28px; padding:0 10px; background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd; border-radius:6px; font-size:0.73rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                                <i class="ph ph-arrows-clockwise"></i> Atualizar
                            </button>

                            <button type="button" onclick="window._cosToggleDrawerComentarios(false)" title="Fechar aba de comentários"
                                style="height:28px; width:28px; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:6px; font-size:0.9rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                    </div>

                    <div id="cos-comentarios-os-lista-wrap" style="overflow-y:auto; flex:1; padding:12px 16px; background:#f8fafc; min-height:180px;">
                        <div style="text-align:center; color:#64748b; font-size:0.82rem; padding:0.95rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">
                            Carregando histórico de comentários desta OS...
                        </div>
                    </div>

                    <div id="cos-comentarios-composer-footer" style="padding:10px 16px; border-top:1px solid #e2e8f0; background:#ffffff; flex-shrink:0;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                            <label style="display:block; font-size:0.76rem; font-weight:800; color:#4c1d95; margin:0; text-transform:none;">
                                <i class="ph ph-chat-centered-text"></i> Comentários
                            </label>
                            <span style="font-size:0.71rem; color:#64748b; font-weight:600;">
                                <i class="ph ph-paperclip"></i> Anexe vários arquivos na pasta ou cole imagens/documentos com <strong>Ctrl+V</strong> (vão automaticamente para o quadro Anexos da OS)
                            </span>
                        </div>
                        <div id="cos-comentario-anexos-pending-main" style="display:none; flex-wrap:wrap; gap:6px; margin-bottom:6px; padding:6px 8px; background:#f5f3ff; border:1px dashed #c4b5fd; border-radius:8px;"></div>
                        <div style="display:flex; gap:8px; align-items:flex-end;">
                            <input type="file" id="cos-comentario-files-inp-main" multiple style="display:none;" onchange="window.adicionarArquivosPendentesComentarioOs(this.files, 'main'); this.value='';">
                            <button type="button" onclick="document.getElementById('cos-comentario-files-inp-main')?.click()"
                                title="Selecionar um ou vários documentos/imagens na pasta para anexar ao comentário e ao quadro Anexos da OS"
                                style="background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd; border-radius:8px; padding:0 0.85rem; font-size:0.8rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; height:42px; transition:background 0.15s;"
                                onmouseover="this.style.background='#ddd6fe'" onmouseout="this.style.background='#ede9fe'">
                                <i class="ph ph-paperclip" style="font-size:1.05rem;"></i> Anexar
                            </button>
                            <textarea id="cos-comentario-os-novo-texto" rows="2"
                                placeholder="Digite um comentário ou cole imagem/arquivo com Ctrl+V... (Ctrl+Enter para enviar)"
                                onpaste="window.tratarPasteAnexoComentarioOs(event, 'main')"
                                onkeydown="if((event.ctrlKey || event.metaKey) && event.key === 'Enter'){ event.preventDefault(); window.enviarComentarioOs(null); }"
                                style="flex:1; padding:0.5rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.83rem; resize:none; box-sizing:border-box; text-transform:none; font-family:inherit;"></textarea>
                            <button type="button" id="cos-btn-enviar-comentario-os" onclick="window.enviarComentarioOs(null)"
                                style="background:#6d28d9; color:#ffffff; border:none; border-radius:8px; padding:0 1.1rem; font-size:0.82rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; height:42px; transition:background 0.15s;"
                                onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#6d28d9'">
                                <i class="ph ph-paper-plane-right" style="font-size:1rem;"></i> Adicionar Comentário
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(wrapper);

            document.addEventListener('mousedown', function _cosClickForaComentarios(e) {
                if (!window._cosDrawerComentariosAberto) return;
                const w = document.getElementById('cos-comentarios-drawer-wrapper');
                if (w && !w.contains(e.target) && !e.target.closest('.swal2-container')) {
                    window._cosToggleDrawerComentarios(false);
                }
            });

            document.addEventListener('paste', function _cosPasteGlobalComentarios(e) {
                if (!window._cosDrawerComentariosAberto) return;
                const active = document.activeElement;
                if (active && (active.id === 'cos-comentario-os-novo-texto' || String(active.id || '').startsWith('cos-comentario-reply-texto-'))) {
                    return;
                }
                const cd = e.clipboardData;
                if (!cd) return;
                const hasFile = (cd.items && Array.from(cd.items).some(it => it && it.kind === 'file')) || (cd.files && cd.files.length > 0);
                if (hasFile) {
                    window.tratarPasteAnexoComentarioOs(e, 'main');
                }
            });
        }
        window._cosAtualizarVisibilidadeDrawerComentarios();
    };

    window._cosToggleDrawerComentarios = function (forcarEstado) {
        window._cosMontarDrawerComentarios();
        const panel = document.getElementById('cos-comentarios-drawer-panel');
        const icon = document.getElementById('cos-comentarios-drawer-icon');
        if (!panel) return;
        const novoEstado = (typeof forcarEstado === 'boolean') ? forcarEstado : !window._cosDrawerComentariosAberto;
        window._cosDrawerComentariosAberto = novoEstado;
        panel.style.maxHeight = novoEstado ? '50vh' : '0';
        panel.style.height = novoEstado ? '50vh' : 'auto';
        panel.style.borderTop = novoEstado ? '1.5px solid #cbd5e1' : 'none';
        panel.style.boxShadow = novoEstado ? '0 -8px 28px rgba(15,23,42,0.16)' : 'none';
        if (icon) {
            icon.className = novoEstado ? 'ph ph-caret-down-bold' : 'ph ph-caret-up-bold';
        }
        if (novoEstado) {
            const propId = Number(state.osAtual && state.osAtual.id) || null;
            window.carregarComentariosOsAtiva(propId, false);
            setTimeout(() => {
                _marcarComentariosOsComoVistos(propId ? `os_${propId}` : 'all', window._comentariosOsCache || []);
                const wrap = document.getElementById('cos-comentarios-os-lista-wrap');
                if (wrap) wrap.scrollTop = wrap.scrollHeight;
                if (propId) document.getElementById('cos-comentario-os-novo-texto')?.focus();
            }, 150);
        }
    };

    window._cosAtualizarVisibilidadeDrawerComentarios = function () {
        const w = document.getElementById('cos-comentarios-drawer-wrapper');
        if (!w) return;
        const viewOs = document.getElementById('view-comercial-os');
        const formOs = document.getElementById('form-comercial-os');
        const isVisivel = Boolean(viewOs && viewOs.offsetParent !== null && formOs && formOs.offsetParent !== null);
        if (isVisivel) {
            if (w.style.display !== 'flex') {
                w.style.display = 'flex';
                const propId = Number(state.osAtual && state.osAtual.id) || null;
                window.carregarComentariosOsAtiva(propId, false);
            }
        } else {
            if (w.style.display !== 'none') {
                w.style.display = 'none';
                if (window._cosDrawerComentariosAberto) {
                    const panel = document.getElementById('cos-comentarios-drawer-panel');
                    const icon = document.getElementById('cos-comentarios-drawer-icon');
                    if (panel) {
                        panel.style.maxHeight = '0';
                        panel.style.height = 'auto';
                        panel.style.borderTop = 'none';
                        panel.style.boxShadow = 'none';
                    }
                    if (icon) icon.className = 'ph ph-caret-up-bold';
                    window._cosDrawerComentariosAberto = false;
                }
            }
        }
    };

    if (!window._cosComentariosVisibilityInterval) {
        window._cosComentariosVisibilityInterval = setInterval(() => {
            if (typeof window._cosAtualizarVisibilidadeDrawerComentarios === 'function') {
                window._cosAtualizarVisibilidadeDrawerComentarios();
            }
        }, 450);
    }

    if (!window._cosComentariosPollNovosInterval) {
        window._cosComentariosPollNovosInterval = setInterval(() => {
            const w = document.getElementById('cos-comentarios-drawer-wrapper');
            if (!w || w.style.display === 'none') return;
            const propId = Number(state.osAtual && state.osAtual.id) || null;
            if (typeof window.carregarComentariosOsAtiva === 'function') {
                window.carregarComentariosOsAtiva(propId, false, true);
            }
        }, 25000);
    }

    window.carregarComentariosOsAtiva = async function (propIdOpcional, mostrarFeedback = false, isPollingBackground = false) {
        const propId = Number(propIdOpcional !== null && propIdOpcional !== undefined ? propIdOpcional : (state.osAtual && state.osAtual.id));
        if (!propId) {
            try {
                const resRec = await window.apiGet('/comercial/os/comentarios-recentes?limit=50');
                const listaRec = (resRec && Array.isArray(resRec.comentarios)) ? resRec.comentarios : [];
                const totalGeral = (resRec && Number(resRec.total_geral) > 0) ? Number(resRec.total_geral) : listaRec.length;
                window._comentariosOsCache = listaRec;
                window._comentariosOsTotalGeral = totalGeral;
                window.atualizarDatalistsFiltrosComentariosOs(listaRec);
                if (!isPollingBackground || window._cosDrawerComentariosAberto) {
                    window.renderizarListaComentariosOs(listaRec);
                } else {
                    const novosRec = _calcularComentariosNovosNaoVistosOs('all', listaRec);
                    _atualizarBadgesContagemComentariosOs(totalGeral, novosRec);
                }
                if (mostrarFeedback && typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`Últimos comentários das OS atualizados (${listaRec.length} exibido(s)).`);
                }
            } catch (_) {
                if (!isPollingBackground) {
                    window._comentariosOsCache = [];
                    window._comentariosOsTotalGeral = 0;
                    window.renderizarListaComentariosOs([]);
                }
            }
            return;
        }
        try {
            const res = await window.apiGet(`/propostas/${propId}/comentarios-os-comercial`);
            const lista = (res && Array.isArray(res.comentarios)) ? res.comentarios : [];
            window._comentariosOsCache = lista;
            window._comentariosOsTotalGeral = lista.length;
            window.atualizarDatalistsFiltrosComentariosOs(lista);
            if (!isPollingBackground || window._cosDrawerComentariosAberto) {
                window.renderizarListaComentariosOs(lista);
            } else {
                const novosOs = _calcularComentariosNovosNaoVistosOs(`os_${propId}`, lista);
                _atualizarBadgesContagemComentariosOs(lista.length, novosOs);
            }
            if (mostrarFeedback && typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(`Histórico de comentários atualizado (${lista.length} comentário(s)).`);
            }
        } catch (_) {
            if (!isPollingBackground) {
                window.renderizarListaComentariosOs([]);
            }
        }
    };

    window.atualizarDatalistsFiltrosComentariosOs = function (lista) {
        const arr = Array.isArray(lista) ? lista : (window._comentariosOsCache || []);
        const dlUsers = document.getElementById('cos-comentarios-datalist-usuarios');
        const dlDeptos = document.getElementById('cos-comentarios-datalist-departamentos');
        if (dlUsers) {
            const nomesUnicos = Array.from(new Set(arr.map(c => String(c.autor_nome || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
            dlUsers.innerHTML = nomesUnicos.map(n => `<option value="${esc(n)}"></option>`).join('');
        }
        if (dlDeptos) {
            const deptosUnicos = Array.from(new Set(arr.map(c => String(c.autor_departamento || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
            dlDeptos.innerHTML = deptosUnicos.map(d => `<option value="${esc(d)}"></option>`).join('');
        }
    };

    window.filtrarComentariosOsEmTempoReal = function () {
        window.renderizarListaComentariosOs(window._comentariosOsCache || []);
    };

    window.limparFiltrosComentariosOs = function () {
        const elU = document.getElementById('cos-comentarios-filtro-usuario');
        const elD = document.getElementById('cos-comentarios-filtro-departamento');
        const elDt = document.getElementById('cos-comentarios-filtro-data');
        if (elU) elU.value = '';
        if (elD) elD.value = '';
        if (elDt) elDt.value = '';
        window.renderizarListaComentariosOs(window._comentariosOsCache || []);
    };

    window.toggleResponderComentarioOs = function (comentarioId, autorNome) {
        const key = String(comentarioId);
        const box = document.getElementById(`cos-comentario-reply-box-${key}`);
        if (!box) return;
        const novoEstado = box.style.display === 'none';
        window._comentariosOsReplyAberto[key] = novoEstado;
        box.style.display = novoEstado ? 'block' : 'none';
        if (novoEstado) {
            const txt = document.getElementById(`cos-comentario-reply-texto-${key}`);
            if (txt) {
                if (autorNome && !txt.value.trim()) {
                    txt.placeholder = `Responder ao comentário de ${autorNome}...`;
                }
                setTimeout(() => txt.focus(), 40);
            }
        }
    };

    window.adicionarArquivosPendentesComentarioOs = function (fileList, targetKey = 'main') {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const key = String(targetKey || 'main');
        if (!Array.isArray(window._comentariosOsAnexosPendentes[key])) {
            window._comentariosOsAnexosPendentes[key] = [];
        }
        const now = Date.now();
        files.forEach((f, idx) => {
            if (!f) return;
            let fileObj = f;
            if (/^image\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name || '')) {
                const ext = (f.name.split('.').pop() || 'png').toLowerCase();
                const dt = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const customName = `Print_${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}_${pad(dt.getHours())}h${pad(dt.getMinutes())}m${pad(dt.getSeconds())}s_${idx + 1}.${ext}`;
                try { fileObj = new File([f], customName, { type: f.type || 'image/png' }); } catch (_) { fileObj = f; }
            }
            const isImg = String(fileObj.type || '').toLowerCase().startsWith('image/');
            const previewUrl = isImg && typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(fileObj) : '';
            window._comentariosOsAnexosPendentes[key].push({
                uid: `${now}_${Math.random().toString(36).slice(2, 7)}`,
                file: fileObj,
                name: fileObj.name || 'anexo',
                size: fileObj.size || 0,
                type: fileObj.type || '',
                previewUrl
            });
        });
        window.renderizarAnexosPendentesComentarioOs(key);
    };

    window.removerArquivoPendenteComentarioOs = function (targetKey, uid) {
        const key = String(targetKey || 'main');
        const arr = window._comentariosOsAnexosPendentes[key];
        if (!Array.isArray(arr)) return;
        const item = arr.find(x => x.uid === uid);
        if (item && item.previewUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
            try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
        }
        window._comentariosOsAnexosPendentes[key] = arr.filter(x => x.uid !== uid);
        window.renderizarAnexosPendentesComentarioOs(key);
    };

    window.limparArquivosPendentesComentarioOs = function (targetKey) {
        const key = String(targetKey || 'main');
        const arr = window._comentariosOsAnexosPendentes[key];
        if (Array.isArray(arr)) {
            arr.forEach(item => {
                if (item && item.previewUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
                    try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
                }
            });
        }
        window._comentariosOsAnexosPendentes[key] = [];
        window.renderizarAnexosPendentesComentarioOs(key);
    };

    window.renderizarAnexosPendentesComentarioOs = function (targetKey = 'main') {
        const key = String(targetKey || 'main');
        const box = document.getElementById(`cos-comentario-anexos-pending-${key}`);
        if (!box) return;
        const arr = Array.isArray(window._comentariosOsAnexosPendentes[key]) ? window._comentariosOsAnexosPendentes[key] : [];
        if (!arr.length) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }
        box.style.display = 'flex';
        box.innerHTML = arr.map(item => {
            const ic = _iconeArquivoAnexoOs(item.name, item.type);
            const tam = _formatarTamBytesOs(item.size);
            const thumb = item.previewUrl
                ? `<img src="${esc(item.previewUrl)}" style="width:34px; height:34px; border-radius:6px; object-fit:cover; border:1px solid #cbd5e1; flex-shrink:0;">`
                : `<div style="width:34px; height:34px; border-radius:6px; background:${ic.bg}; color:${ic.color}; border:1px solid #cbd5e1; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="ph ${ic.icon}" style="font-size:1.05rem;"></i>
                    <span style="font-size:0.48rem; font-weight:800; line-height:1;">${esc(ic.label || 'ARQ')}</span>
                </div>`;
            return `
                <div style="display:inline-flex; align-items:center; gap:7px; background:#ffffff; border:1px solid #c4b5fd; border-radius:8px; padding:4px 8px; max-width:260px; box-shadow:0 1px 2px rgba(15,23,42,0.05);">
                    ${thumb}
                    <div style="min-width:0; flex:1;">
                        <div style="font-size:0.74rem; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(item.name)}">${esc(item.name)}</div>
                        <div style="font-size:0.66rem; color:#64748b;">${esc(tam || ic.label || '')}</div>
                    </div>
                    <button type="button" onclick="window.removerArquivoPendenteComentarioOs('${esc(key)}', '${esc(item.uid)}')" title="Remover anexo pendente"
                        style="background:#fee2e2; color:#dc2626; border:none; width:20px; height:20px; border-radius:50%; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; flex-shrink:0;">
                        &times;
                    </button>
                </div>
            `;
        }).join('');
    };

    window.tratarPasteAnexoComentarioOs = function (event, targetKey = 'main') {
        const cd = event && (event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData));
        if (!cd) return;
        const files = [];
        if (cd.items && cd.items.length) {
            for (let i = 0; i < cd.items.length; i++) {
                const it = cd.items[i];
                if (it && it.kind === 'file') {
                    const f = it.getAsFile();
                    if (f) files.push(f);
                }
            }
        } else if (cd.files && cd.files.length) {
            for (let i = 0; i < cd.files.length; i++) files.push(cd.files[i]);
        }
        if (files.length > 0) {
            window.adicionarArquivosPendentesComentarioOs(files, targetKey);
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(`${files.length} arquivo(s) colado(s)! Clique em Adicionar Comentário para enviar.`);
            }
        }
    };

    window.enviarComentarioOs = async function (parentIdOpcional) {
        const propId = Number(state.osAtual && state.osAtual.id);
        if (!propId) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'OS não salva', text: 'Salve ou carregue uma OS antes de registrar comentários.' });
            }
            return;
        }
        const parentId = (parentIdOpcional && Number(parentIdOpcional) > 0) ? Number(parentIdOpcional) : null;
        const targetKey = parentId ? `reply_${parentId}` : 'main';
        const inputEl = parentId
            ? document.getElementById(`cos-comentario-reply-texto-${parentId}`)
            : document.getElementById('cos-comentario-os-novo-texto');
        const texto = inputEl ? String(inputEl.value || '').trim() : '';
        const pendentes = Array.isArray(window._comentariosOsAnexosPendentes[targetKey]) ? window._comentariosOsAnexosPendentes[targetKey] : [];

        if (!texto && pendentes.length === 0) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Comentário vazio', text: 'Digite uma mensagem ou anexe um documento antes de enviar o comentário.' });
            }
            if (inputEl) inputEl.focus();
            return;
        }

        const btnEl = parentId
            ? document.getElementById(`cos-btn-enviar-reply-comentario-${parentId}`)
            : document.getElementById('cos-btn-enviar-comentario-os');
        const htmlOrig = btnEl ? btnEl.innerHTML : '';
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
        }

        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('rh_token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
            let anexosInseridos = [];

            if (pendentes.length > 0) {
                const fd = new FormData();
                pendentes.forEach(item => {
                    if (item && item.file) fd.append('arquivos', item.file);
                });
                const titPadrao = texto ? `Anexo de comentário: ${texto.slice(0, 60)}` : 'Anexo enviado via Comentários';
                fd.append('titulo', titPadrao);

                const respAnexo = await fetch(`/api/propostas/${propId}/anexos-os-comercial`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: fd
                });
                const dataAnexo = await respAnexo.json().catch(() => ({}));
                if (!respAnexo.ok || dataAnexo.error) {
                    throw new Error(dataAnexo.error || 'Falha ao enviar documento(s) anexo(s) do comentário.');
                }
                if (Array.isArray(dataAnexo.inseridos) && dataAnexo.inseridos.length > 0) {
                    anexosInseridos = dataAnexo.inseridos;
                } else if (Array.isArray(dataAnexo.anexos)) {
                    anexosInseridos = dataAnexo.anexos.slice(-pendentes.length);
                }
            }

            const resp = await fetch(`/api/propostas/${propId}/comentarios-os-comercial`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    comentario: texto,
                    parent_id: parentId,
                    anexos_json: anexosInseridos
                })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || data.error) {
                throw new Error(data.error || 'Não foi possível registrar o comentário.');
            }
            if (inputEl) inputEl.value = '';
            window.limparArquivosPendentesComentarioOs(targetKey);
            if (parentId) {
                window._comentariosOsReplyAberto[String(parentId)] = false;
            }
            await window.carregarComentariosOsAtiva(propId, false);
            _marcarComentariosOsComoVistos(`os_${propId}`, window._comentariosOsCache || []);
            if (anexosInseridos.length > 0) {
                await carregarAnexosOs(propId);
            }
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(
                    anexosInseridos.length > 0
                        ? `Comentário registrado e ${anexosInseridos.length} documento(s) incluído(s) no quadro Anexos da OS!`
                        : (parentId ? 'Resposta adicionada ao comentário!' : 'Comentário registrado no histórico da OS!')
                );
            }
        } catch (e) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Erro ao comentar', text: e.message || 'Erro ao salvar comentário.' });
            }
        } finally {
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerHTML = htmlOrig;
            }
        }
    };

    window.renderizarListaComentariosOs = function (lista) {
        const arrOrig = Array.isArray(lista) ? lista : (window._comentariosOsCache || []);
        const arr = [...arrOrig].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        const propIdAtu = Number(state.osAtual && state.osAtual.id);
        const ehModoTodasOs = !propIdAtu;
        const escopoKey = ehModoTodasOs ? 'all' : `os_${propIdAtu}`;
        const totalBadgeVal = ehModoTodasOs
            ? (Number(window._comentariosOsTotalGeral) > 0 ? Number(window._comentariosOsTotalGeral) : arr.length)
            : arr.length;
        const novosCount = _calcularComentariosNovosNaoVistosOs(escopoKey, arr);
        _atualizarBadgesContagemComentariosOs(totalBadgeVal, novosCount);

        const tituloEl = document.getElementById('cos-comentarios-drawer-titulo');
        if (tituloEl) {
            const numOsAtu = !ehModoTodasOs && state.osAtual && state.osAtual.numero_os
                ? `OS Nº ${String(state.osAtual.numero_os).padStart(2, '0')}`
                : 'OS';
            tituloEl.textContent = ehModoTodasOs
                ? 'Últimos Comentários das OS (até 50 recentes)'
                : `Comentários da ${numOsAtu}`;
        }
        const footerComposer = document.getElementById('cos-comentarios-composer-footer');
        if (footerComposer) {
            footerComposer.style.display = ehModoTodasOs ? 'none' : 'block';
        }

        const wrap = document.getElementById('cos-comentarios-os-lista-wrap');
        if (!wrap) return;

        if (!arr.length) {
            wrap.innerHTML = `
                <div style="text-align:center; color:#64748b; font-size:0.82rem; padding:1.2rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">
                    ${ehModoTodasOs
                        ? 'Nenhum comentário registrado nas OS até o momento.'
                        : 'Nenhum comentário registrado nesta OS até o momento. Adicione um comentário no campo abaixo.'}
                </div>
            `;
            return;
        }

        const fUsuario = normStr((document.getElementById('cos-comentarios-filtro-usuario') || {}).value);
        const fDepto = normStr((document.getElementById('cos-comentarios-filtro-departamento') || {}).value);
        const fData = String(((document.getElementById('cos-comentarios-filtro-data') || {}).value) || '').trim();
        const temFiltroAtivo = Boolean(fUsuario || fDepto || fData);

        const itemCombinaFiltro = (c) => {
            if (!temFiltroAtivo) return true;
            if (fUsuario) {
                const nomeNorm = normStr(c.autor_nome);
                const userNorm = normStr(c.usuario_username);
                if (!nomeNorm.includes(fUsuario) && !userNorm.includes(fUsuario)) return false;
            }
            if (fDepto) {
                const depNorm = normStr(c.autor_departamento);
                if (!depNorm.includes(fDepto)) return false;
            }
            if (fData) {
                const mDt = String(c.criado_em || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
                const dataIso = mDt ? mDt[1] : '';
                if (dataIso !== fData) return false;
            }
            return true;
        };

        const byId = new Map();
        const childrenMap = new Map();
        arr.forEach(c => {
            const idNum = Number(c.id);
            byId.set(idNum, c);
            childrenMap.set(idNum, []);
        });

        const roots = [];
        arr.forEach(c => {
            const pId = c.parent_id ? Number(c.parent_id) : null;
            if (pId && childrenMap.has(pId)) {
                childrenMap.get(pId).push(c);
            } else {
                roots.push(c);
            }
        });

        const memoVisivel = new Map();
        const deveExibirNo = (c, ancestralCombina = false) => {
            const idNum = Number(c.id);
            const proprioCombina = itemCombinaFiltro(c);
            const filhos = childrenMap.get(idNum) || [];
            const algumFilhoVisivel = filhos.some(f => deveExibirNo(f, ancestralCombina || proprioCombina));
            const visivel = !temFiltroAtivo || proprioCombina || ancestralCombina || algumFilhoVisivel;
            memoVisivel.set(idNum, { visivel, proprioCombina });
            return visivel;
        };

        const rootsVisiveis = roots.filter(r => deveExibirNo(r, false));
        if (!rootsVisiveis.length) {
            wrap.innerHTML = `
                <div style="text-align:center; color:#64748b; font-size:0.82rem; padding:0.95rem; background:#ffffff; border:1px dashed #cbd5e1; border-radius:8px;">
                    Nenhum comentário encontrado para os filtros selecionados (usuário, departamento ou data).
                </div>
            `;
            return;
        }

        const renderizarNoComentario = (c, nivel = 0, ancestralCombina = false) => {
            const idNum = Number(c.id);
            const infoVis = memoVisivel.get(idNum) || { visivel: true, proprioCombina: true };
            if (!infoVis.visivel) return '';
            const filhos = (childrenMap.get(idNum) || []).filter(f => {
                const fVis = memoVisivel.get(Number(f.id));
                return fVis ? fVis.visivel : deveExibirNo(f, ancestralCombina || infoVis.proprioCombina);
            });
            const iniciais = _obterIniciaisAutorOs(c.autor_nome);
            const fotoUrl = String(c.autor_foto_url || '').trim() || (c.colaborador_id ? `/api/colaboradores/foto/${Number(c.colaborador_id)}` : '');
            const dataHoraFmt = _formatarDataHoraComentarioOs(c.criado_em);
            const deptoTxt = String(c.autor_departamento || 'Geral').trim() || 'Geral';
            const replyAberto = Boolean(window._comentariosOsReplyAberto && window._comentariosOsReplyAberto[String(idNum)]);
            const parentObj = c.parent_id ? byId.get(Number(c.parent_id)) : null;
            const destaqueFiltro = temFiltroAtivo && infoVis.proprioCombina;
            const numOsExib = String(c.numero_os || c.proposta_id || '').trim().padStart(2, '0');
            const cliNomeRaw = limparPrefixoGrupoSeguroOs(c.cliente_nome || '');
            const cliNomeComIcone = (cliNomeRaw && typeof window.formatarNomeClienteComIcone === 'function')
                ? window.formatarNomeClienteComIcone(cliNomeRaw)
                : cliNomeRaw;
            const propIdCard = Number(c.proposta_id || propIdAtu || 0);

            return `
                <div id="cos-comentario-card-${idNum}" style="${nivel > 0 ? 'margin-left:1.35rem; margin-top:0.5rem; border-left:2.5px solid #c4b5fd; padding-left:0.7rem;' : 'margin-bottom:0.6rem;'}">
                    <div style="background:${destaqueFiltro ? '#faf5ff' : '#ffffff'}; border:1px solid ${destaqueFiltro ? '#a855f7' : (nivel > 0 ? '#e9d5ff' : '#dbeafe')}; border-radius:9px; padding:0.65rem 0.8rem; box-shadow:0 1px 2px rgba(15,23,42,0.03);">
                        ${ehModoTodasOs && propIdCard ? `
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:0.45rem; padding-bottom:0.4rem; border-bottom:1px dashed #e2e8f0;">
                                <button type="button" onclick="window._cosToggleDrawerComentarios(false); window._comercialOS.carregarOsPorPropostaId(${propIdCard});"
                                    title="Clique para abrir a OS Nº ${esc(numOsExib)}"
                                    style="background:#16a34a; color:#ffffff; border:1px solid #15803d; padding:2px 10px; border-radius:6px; font-size:0.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; transition:all 0.15s;"
                                    onmouseover="this.style.background='#15803d'; this.style.transform='scale(1.04)'"
                                    onmouseout="this.style.background='#16a34a'; this.style.transform='scale(1)'">
                                    <i class="ph ph-clipboard-text"></i> OS Nº ${esc(numOsExib)}
                                </button>
                                ${cliNomeComIcone ? `<span style="font-size:0.79rem; font-weight:800; color:#0f172a;">${esc(cliNomeComIcone)}</span>` : ''}
                            </div>
                        ` : ''}
                        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:9px; min-width:0;">
                                <div style="width:36px; height:36px; border-radius:50%; overflow:hidden; flex-shrink:0; position:relative; background:#ede9fe; border:1.5px solid #c4b5fd; display:flex; align-items:center; justify-content:center;">
                                    ${fotoUrl ? `<img src="${esc(fotoUrl)}" alt="${esc(c.autor_nome)}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">` : ''}
                                    <span style="display:${fotoUrl ? 'none' : 'flex'}; width:100%; height:100%; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; color:#5b21b6; letter-spacing:0.02em;">
                                        ${esc(iniciais)}
                                    </span>
                                </div>
                                <div style="min-width:0;">
                                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                        <span style="font-size:0.83rem; font-weight:800; color:#1e293b;">${esc(c.autor_nome || 'Colaborador')}</span>
                                        <span style="background:#ede9fe; color:#5b21b6; border:1px solid #ddd6fe; font-size:0.69rem; font-weight:700; padding:1px 7px; border-radius:999px;">
                                            ${esc(deptoTxt)}
                                        </span>
                                        ${parentObj ? `
                                            <span style="font-size:0.71rem; color:#6d28d9; font-weight:600; display:inline-flex; align-items:center; gap:3px;">
                                                <i class="ph ph-arrow-bend-down-right"></i> em resposta a <strong>${esc(parentObj.autor_nome || 'comentário')}</strong>
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div style="font-size:0.72rem; color:#64748b; display:flex; align-items:center; gap:4px; margin-top:1px;">
                                        <i class="ph ph-clock" style="font-size:0.8rem; color:#7c3aed;"></i>
                                        <span>${esc(dataHoraFmt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                                ${!ehModoTodasOs ? `
                                    <button type="button" onclick="window.toggleResponderComentarioOs(${idNum}, '${esc(String(c.autor_nome || '').replace(/'/g, ''))}')" title="Deixar um comentário dentro deste comentário" style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; border-radius:6px; padding:3px 9px; font-size:0.73rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:background 0.15s;" onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='#f5f3ff'">
                                        <i class="ph ph-arrow-bend-down-right"></i> Responder
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        ${c.comentario ? `<div style="margin-top:0.45rem; padding-left:45px; font-size:0.83rem; color:#1e293b; line-height:1.45; white-space:pre-wrap; word-break:break-word;">${esc(c.comentario)}</div>` : ''}
                        ${(() => {
                            let anexosCom = [];
                            try {
                                if (c.anexos_json) {
                                    anexosCom = typeof c.anexos_json === 'string' ? JSON.parse(c.anexos_json || '[]') : (Array.isArray(c.anexos_json) ? c.anexos_json : []);
                                }
                            } catch (_) {}
                            if (!Array.isArray(anexosCom) || !anexosCom.length) return '';
                            return `
                                <div style="margin-top:0.5rem; padding-left:45px; display:flex; flex-wrap:wrap; gap:8px;">
                                    ${anexosCom.map(ax => {
                                        const axObj = Object.assign({ proposta_id: c.proposta_id || propIdAtu }, ax);
                                        const idAxSafe = esc(String(axObj.id || '')).replace(/'/g, "\\'");
                                        const thumbAx = _gerarHtmlMiniaturaAnexoOs(axObj, 46);
                                        const tamAx = _formatarTamBytesOs(axObj.tamanho);
                                        return `
                                            <div style="display:inline-flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:5px 9px; max-width:310px;">
                                                ${thumbAx}
                                                <div style="min-width:0; flex:1;">
                                                    <div style="font-size:0.75rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(axObj.nome_arquivo || axObj.titulo || 'Anexo')}">
                                                        ${esc(axObj.nome_arquivo || axObj.titulo || 'Anexo')}
                                                    </div>
                                                    <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                                                        ${tamAx ? `<span style="font-size:0.67rem; color:#64748b;">${esc(tamAx)}</span>` : ''}
                                                        <button type="button" onclick="window.abrirArquivoAnexoOsComercial('${idAxSafe}', false, ${propIdCard})" style="background:transparent; border:none; color:#2563eb; font-size:0.7rem; font-weight:700; cursor:pointer; padding:0;">Visualizar</button>
                                                        <button type="button" onclick="window.abrirArquivoAnexoOsComercial('${idAxSafe}', true, ${propIdCard})" style="background:transparent; border:none; color:#15803d; font-size:0.7rem; font-weight:700; cursor:pointer; padding:0;">Baixar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `;
                        })()}

                        <div id="cos-comentario-reply-box-${idNum}" style="display:${replyAberto ? 'block' : 'none'}; margin-top:0.55rem; margin-left:45px; background:#f8fafc; border:1px solid #ddd6fe; border-radius:8px; padding:0.5rem 0.65rem;">
                            <div style="font-size:0.72rem; font-weight:700; color:#5b21b6; margin-bottom:4px;">
                                <i class="ph ph-arrow-bend-down-right"></i> Responder ao comentário de ${esc(c.autor_nome || 'Colaborador')}
                            </div>
                            <div id="cos-comentario-anexos-pending-reply_${idNum}" style="display:none; flex-wrap:wrap; gap:6px; margin-bottom:6px; padding:5px 7px; background:#f5f3ff; border:1px dashed #c4b5fd; border-radius:7px;"></div>
                            <div style="display:flex; gap:6px; align-items:flex-end; flex-wrap:wrap;">
                                <input type="file" id="cos-comentario-files-inp-reply_${idNum}" multiple style="display:none;" onchange="window.adicionarArquivosPendentesComentarioOs(this.files, 'reply_${idNum}'); this.value='';">
                                <button type="button" onclick="document.getElementById('cos-comentario-files-inp-reply_${idNum}')?.click()"
                                    title="Anexar documentos/imagens nesta resposta"
                                    style="background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd; border-radius:6px; padding:0 0.65rem; font-size:0.74rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; height:34px;">
                                    <i class="ph ph-paperclip"></i> Anexar
                                </button>
                                <textarea id="cos-comentario-reply-texto-${idNum}" rows="2"
                                    placeholder="Escreva sua resposta ou cole imagem/arquivo com Ctrl+V..."
                                    onpaste="window.tratarPasteAnexoComentarioOs(event, 'reply_${idNum}')"
                                    onkeydown="if((event.ctrlKey || event.metaKey) && event.key === 'Enter'){ event.preventDefault(); window.enviarComentarioOs(${idNum}); }"
                                    style="flex:1; min-width:200px; padding:0.45rem 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; resize:vertical; box-sizing:border-box; text-transform:none; font-family:inherit;"></textarea>
                                <div style="display:flex; gap:5px;">
                                    <button type="button" id="cos-btn-enviar-reply-comentario-${idNum}" onclick="window.enviarComentarioOs(${idNum})" style="background:#6d28d9; color:#ffffff; border:none; border-radius:6px; padding:0.42rem 0.8rem; font-size:0.76rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; height:34px;">
                                        <i class="ph ph-paper-plane-right"></i> Enviar Resposta
                                    </button>
                                    <button type="button" onclick="window.toggleResponderComentarioOs(${idNum})" style="background:#ffffff; color:#64748b; border:1px solid #cbd5e1; border-radius:6px; padding:0.42rem 0.65rem; font-size:0.75rem; font-weight:600; cursor:pointer; height:34px;">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${filhos.length ? `
                        <div style="display:flex; flex-direction:column;">
                            ${filhos.map(filho => renderizarNoComentario(filho, nivel + 1, ancestralCombina || infoVis.proprioCombina)).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        };

        wrap.innerHTML = rootsVisiveis.map(r => renderizarNoComentario(r, 0, false)).join('');
        setTimeout(() => {
            if (wrap) wrap.scrollTop = wrap.scrollHeight;
        }, 30);
    };

    window.renderTelaOSComercial = function () {
        window._comercialOS.init();
    };
})();
