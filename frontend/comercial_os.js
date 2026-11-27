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

    const state = {
        propostaIdAtiva: null,
        osAtual: null,
        dadosOs: null,
        editadoNaoSalvo: false,
        statusNovoDraft: 'EM ELABORAÇÃO',
        secoesAbertas: {
            periodo: true,
            produtos: true,
            fob: true,
            anexos: false
        },
        anexosAtuais: []
    };

    function normStr(s) {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
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
        if (!prop) return '';
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
        const salvo = String(prop.os_tipo_operacao || '').trim();
        const matchSalvo = OS_COMERCIAL_TIPOS_CONFIG.find(t => normStr(t.nome) === normStr(salvo));
        if (matchSalvo) return matchSalvo.nome;
        return tipoCtr === 'EQUIPAMENTOS' ? 'Equipamentos' : 'Envio';
    }

    function propostaTemFreteFob(prop) {
        if (!prop) return false;
        if (Number(prop.servico_frete_fob) === 1 || prop.servico_frete_fob === true) return true;
        if (String(prop.tipo_frete || '').trim().toUpperCase() === 'FOB') return true;
        let servs = [];
        try {
            servs = typeof prop.itens_servicos === 'string' ? JSON.parse(prop.itens_servicos || '[]') : (Array.isArray(prop.itens_servicos) ? prop.itens_servicos : []);
        } catch (_) { servs = []; }
        return (Array.isArray(servs) ? servs : []).some(s => normStr(s?.servico || s?.produto || s?.descricao || '').includes('fob'));
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
            if (m > 0) return `${m}x por semana`;
            const nome = String(it.produto || it.descricao || it.nome || '');
            const matchCod = nome.match(/\bO0(\d)[A-Z]*(?:ZC|ZA|ZV|VZ)\b/i);
            if (matchCod && parseInt(matchCod[1], 10) > 0) {
                return `${parseInt(matchCod[1], 10)}x por semana`;
            }
        }
        return '1x por semana';
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
        const ehObra = tipoLimpoUp.includes('OBRA');
        const ehEvento = tipoLimpoUp === 'EVENTO';

        // Datas de entrega/retirada do contrato (quando houver) ou período início/fim
        let dtEntPad = String(prop.periodo_inicio || '').trim().substring(0, 10);
        let dtRetPad = String(prop.periodo_fim || '').trim().substring(0, 10);
        try {
            const arrE = JSON.parse(prop.datas_entrega_equipamentos || '[]');
            if (Array.isArray(arrE) && arrE[0]) dtEntPad = String(arrE[0]).trim().substring(0, 10);
        } catch (_) {}
        try {
            const arrR = JSON.parse(prop.datas_retirada_equipamentos || '[]');
            if (Array.isArray(arrR) && arrR[0]) dtRetPad = String(arrR[0]).trim().substring(0, 10);
        } catch (_) {}

        // Regra solicitada:
        // - Quando for um contrato do tipo OBRA: selecionar automaticamente o Horário Comercial (entrega, retirada e manutenção).
        // - Quando for outro tipo de contrato: o checkbox do horário comercial NÃO deve estar pré-selecionado.
        // - Quando for EVENTO: não tem a opção de horário comercial.
        const horarioComercialPadrao = ehObra ? true : false;

        return {
            data_entrega: salvo.data_entrega !== undefined ? salvo.data_entrega : dtEntPad,
            hora_entrega: salvo.hora_entrega !== undefined ? salvo.hora_entrega : (ehObra ? '08:00 às 18:00' : (String(prop.hora_inicio || '').trim() || '')),
            entrega_horario_comercial: ehEvento ? false : (salvo.entrega_horario_comercial !== undefined ? Boolean(salvo.entrega_horario_comercial) : horarioComercialPadrao),

            data_retirada: salvo.data_retirada !== undefined ? salvo.data_retirada : dtRetPad,
            hora_retirada: salvo.hora_retirada !== undefined ? salvo.hora_retirada : (ehObra ? '08:00 às 18:00' : (String(prop.hora_fim || '').trim() || '')),
            retirada_horario_comercial: ehEvento ? false : (salvo.retirada_horario_comercial !== undefined ? Boolean(salvo.retirada_horario_comercial) : horarioComercialPadrao),

            qtd_manutencoes: salvo.qtd_manutencoes || extrairQuantidadeManutencoesProposta(prop),
            horario_manutencao: salvo.horario_manutencao || (ehObra ? 'Horário Comercial (08:00 às 18:00)' : ''),
            manutencao_horario_comercial: ehObra ? true : Boolean(salvo.manutencao_horario_comercial),

            dias_evento: Array.isArray(salvo.dias_evento) && salvo.dias_evento.length > 0
                ? salvo.dias_evento
                : extrairDiasEventoInicialDaProposta(prop),

            fob_data_entrega: salvo.fob_data_entrega !== undefined ? salvo.fob_data_entrega : dtEntPad,
            fob_data_retirada: salvo.fob_data_retirada !== undefined ? salvo.fob_data_retirada : dtRetPad,
            fob_modelo_veiculo: salvo.fob_modelo_veiculo || '',
            fob_placa_veiculo: salvo.fob_placa_veiculo || '',
            fob_nome_motorista: salvo.fob_nome_motorista || '',

            enviada_logistica: Boolean(salvo.enviada_logistica)
        };
    }

    /**
     * Verifica se todos os campos obrigatórios da OS do Comercial estão preenchidos
     * para liberar o botão "Enviar OS para a Logística".
     */
    function verificarCamposObrigatoriosOsPreenchidos() {
        const prop = state.osAtual;
        const d = state.dadosOs;
        if (!prop || !prop.id || !d) return { ok: false, pendencias: ['Carregue uma OS válida'] };

        const pendencias = [];
        const tipoLimpoUp = String(prop.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const ehEvento = tipoLimpoUp === 'EVENTO';
        const temFob = propostaTemFreteFob(prop);

        if (!String(d.data_entrega || '').trim()) pendencias.push('Data de Entrega');
        if (!d.entrega_horario_comercial && !String(d.hora_entrega || '').trim()) {
            pendencias.push('Horário da Entrega');
        }

        if (!String(d.data_retirada || '').trim()) pendencias.push('Data de Retirada');
        if (!d.retirada_horario_comercial && !String(d.hora_retirada || '').trim()) {
            pendencias.push('Horário da Retirada');
        }

        if (!String(prop.endereco_instalacao || '').trim()) {
            pendencias.push('Endereço de Instalação');
        }

        if (ehEvento) {
            const dias = Array.isArray(d.dias_evento) ? d.dias_evento : [];
            if (dias.length === 0) {
                pendencias.push('Dias e Horários do Evento');
            } else {
                const algumIncompleto = dias.some(x => !String(x.data || '').trim() || !String(x.hora_inicio || '').trim() || !String(x.hora_fim || '').trim());
                if (algumIncompleto) pendencias.push('Data / Horário de Início e Fim do Evento');
            }
        }

        if (temFob) {
            if (!String(d.fob_data_entrega || '').trim()) pendencias.push('FOB: Data da Entrega');
            if (!String(d.fob_data_retirada || '').trim()) pendencias.push('FOB: Data da Retirada');
            if (!String(d.fob_modelo_veiculo || '').trim()) pendencias.push('FOB: Modelo do Veículo');
            if (!String(d.fob_placa_veiculo || '').trim()) pendencias.push('FOB: Placa do Veículo');
            if (!String(d.fob_nome_motorista || '').trim()) pendencias.push('FOB: Nome do Motorista');
        }

        return { ok: pendencias.length === 0, pendencias };
    }

    function atualizarVisibilidadeBotaoEnviarLogistica() {
        const btn = document.getElementById('btn-cos-enviar-logistica');
        if (!btn) return;
        const prop = state.osAtual;
        if (!prop || !prop.id) {
            btn.style.display = 'none';
            return;
        }
        const check = verificarCamposObrigatoriosOsPreenchidos();
        btn.style.display = check.ok ? 'inline-flex' : 'none';
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
            assSt === 'assinado' || assSt === 'signed' || assSt === 'certificated' ||
            p.assinafy_signed_at || p.assinafy_signed_r2_key ||
            (typeof window.propostaFoiAssinadaViaAssinafy === 'function' && window.propostaFoiAssinadaViaAssinafy(p))
        );
    }

    async function buscarTodasOsDoSistema() {
        let lista = [];
        try {
            if (typeof window.apiGet === 'function') {
                lista = await window.apiGet('/propostas');
            } else {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
                const r = await fetch('/api/propostas', { headers: tk ? { 'Authorization': 'Bearer ' + tk } : {} });
                if (r.ok) lista = await r.json();
            }
        } catch (_) {}
        if (Array.isArray(lista) && lista.length > 0) {
            window._propostasData = lista;
        } else if (Array.isArray(window._propostasData)) {
            lista = window._propostasData;
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

    function renderProdutosGridHtml(prop) {
        let itens = [];
        try {
            itens = typeof prop?.itens === 'string' ? JSON.parse(prop.itens || '[]') : (Array.isArray(prop?.itens) ? prop.itens : []);
        } catch (_) { itens = []; }
        itens = (Array.isArray(itens) ? itens : []).filter(it => it && !it._substituido_por_aditivo);

        const badge = document.getElementById('cos-produtos-count-badge');
        const somaQtd = itens.reduce((acc, it) => acc + (Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1)), 0);
        if (badge) {
            if (itens.length > 0) {
                badge.style.display = 'inline-flex';
                badge.textContent = `${itens.length} item(ns) · Qtd. total: ${somaQtd}`;
            } else {
                badge.style.display = 'none';
            }
        }

        if (itens.length === 0) {
            return `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:1rem; font-size:0.78rem; font-style:italic;">Nenhum produto vinculado a esta OS.</td></tr>`;
        }

        const tipoUp = String(prop?.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const ehEv = ['EVENTO', 'EQUIPAMENTOS', 'EQUIPAMENTO'].includes(tipoUp);

        return itens.map(it => {
            const assoc = associarProdutoComEquipamentoOsLogistica(it, prop);
            const obs = String(it.observacao || '').trim();
            const qtd = Math.max(1, parseInt(it.quantidade ?? it.qtde ?? 1, 10) || 1);
            const diasArr = Array.isArray(it.dias_evento) ? it.dias_evento.filter(Boolean) : [];
            const nDiarias = ehEv ? (diasArr.length > 0 ? diasArr.length : Math.max(1, parseInt(prop?.dias_contrato || 1, 10) || 1)) : 1;
            const manutStr = ehEv ? `${nDiarias} diária(s)` : (it.manut_semana ? `${it.manut_semana}x/sem.` : '—');

            return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:6px 8px; font-weight:700; color:#1e293b;">
                        ${assoc.icone ? `<span style="font-size:0.92rem; margin-right:4px;">${assoc.icone}</span>` : ''}<span>${esc(assoc.nome)}</span>
                    </td>
                    <td style="padding:6px 8px; color:#475569;">${esc(obs || '—')}</td>
                    <td style="padding:6px 6px; text-align:center; font-weight:800; color:#0f172a;">${qtd}</td>
                    <td style="padding:6px 6px; text-align:center; color:#475569; font-weight:600;">${esc(manutStr)}</td>
                </tr>
            `;
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
            fob_nome_motorista: ''
        };

        const v = (campo) => prop ? (prop[campo] || '') : '';

        // Data de cadastro = data de criação da OS (os_criada_em), somente leitura
        const dataCadastroOs = isNovo
            ? hojeIso()
            : (String(v('os_criada_em') || '').trim().substring(0, 10) || hojeIso());

        // Uma nova OS nasce com a situação de EM ELABORAÇÃO
        const statusOsAtual = obterConfigStatusOs(isNovo ? 'EM ELABORAÇÃO' : (v('status_os') || 'EM ELABORAÇÃO')).nome;
        const tipoOsResolvido = isNovo ? '' : resolverTipoOsComercial(prop);

        const clienteNomeRaw = v('cliente_nome');
        const clienteNomeFormatado = (!isNovo && clienteNomeRaw && typeof window.formatarNomeClienteComIcone === 'function')
            ? window.formatarNomeClienteComIcone(clienteNomeRaw)
            : clienteNomeRaw;

        const tipoLimpoUp = String(v('tipo') || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
        const ehObra = tipoLimpoUp.includes('OBRA');
        const ehEvento = tipoLimpoUp === 'EVENTO';
        const temFob = !isNovo && propostaTemFreteFob(prop);
        const checkObrig = verificarCamposObrigatoriosOsPreenchidos();

        atualizarTituloAbaSuperior(!isNovo ? v('numero_os') : null);

        container.innerHTML = `
            <style>
                #view-comercial-os .prop-lbl,
                #view-comercial-os label:not(.prop-chk-inline-lbl) {
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
                #view-comercial-os form button[title*="Pesquisar"] {
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

                        <button type="button" id="btn-cos-salvar" onclick="window._comercialOS.salvarAlteracoesOS()" ${(!isNovo && state.editadoNaoSalvo) ? '' : 'disabled'}
                            style="background:${(!isNovo && state.editadoNaoSalvo) ? '#16a34a' : '#cbd5e1'}; color:${(!isNovo && state.editadoNaoSalvo) ? '#ffffff' : '#64748b'}; border:none; cursor:${(!isNovo && state.editadoNaoSalvo) ? 'pointer' : 'not-allowed'};">
                            <i class="ph ph-check"></i> Salvar
                        </button>

                        <!-- Botão Enviar OS para a Logística: só aparece quando todos os campos obrigatórios da OS do Comercial estiverem preenchidos -->
                        <button type="button" id="btn-cos-enviar-logistica" onclick="window._comercialOS.enviarOsParaLogistica()"
                            title="Enviar OS preenchida para a Logística"
                            style="display:${(!isNovo && checkObrig.ok) ? 'inline-flex' : 'none'}; background:#0284c7; color:#ffffff; border:1px solid #0369a1; font-weight:800;">
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
                        <!-- Linha 1: Nº da OS, Tipo * (com ícone na frente, bloqueado — vem direto do contrato), Atendente (bloqueado) -->
                        <div style="display:grid; grid-template-columns:1fr 1.8fr 1.4fr 1fr; gap:1rem; margin-bottom:1rem;">
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
                                <select id="cos-tipo" disabled title="O Tipo de OS vem automaticamente do Contrato e não pode ser editado">
                                    <option value="">-- Selecione --</option>
                                    ${OS_COMERCIAL_TIPOS_CONFIG.map(t => `<option value="${esc(t.nome)}" ${(!isNovo && normStr(tipoOsResolvido) === normStr(t.nome)) ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
                                </select>
                            </div>

                            <div>
                                <label class="prop-lbl">Atendente</label>
                                ${(() => {
                                    const podeEditarAtend = !isNovo && typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial();
                                    const nomeAtendExib = typeof window.resolverNomeExibicaoAtendenteComercial === 'function'
                                        ? window.resolverNomeExibicaoAtendenteComercial(v('atendente'), false)
                                        : (v('atendente_nome') || v('atendente') || '');
                                    return `
                                        <div id="cos-atendente-combo-wrap" style="position:relative; width:100%;">
                                            <input type="text" id="cos-atendente" value="${esc(nomeAtendExib)}"
                                                ${podeEditarAtend ? '' : 'readonly disabled'}
                                                title="${podeEditarAtend ? 'Selecionar atendente (liberado para o gestor do departamento)' : 'O atendente vem da Proposta/Contrato e apenas o gestor do departamento pode editá-lo.'}"
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

                            <div>
                                <label class="prop-lbl">Data Cadastro *</label>
                                <input type="date" id="cos-data-cadastro" value="${esc(dataCadastroOs)}" readonly disabled style="width:100%;">
                            </div>
                        </div>

                        <!-- Linha 2: Título * (bloqueado), Status da OS * (editável; nasce EM ELABORAÇÃO) -->
                        <div style="display:grid; grid-template-columns:1.8fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <label class="prop-lbl">Título *</label>
                                <input type="text" id="cos-titulo-contrato" value="${esc(v('titulo_contrato'))}" readonly disabled
                                    placeholder="Título da OS / Contrato..." style="width:100%;">
                            </div>

                            <div>
                                <label class="prop-lbl">Status da OS *</label>
                                <div id="cos-status-custom-wrap" style="position:relative; width:100%;">
                                    <button type="button" id="cos-status-custom-btn" onclick="window._comercialOS.toggleMenuStatusOs(event)"
                                        style="border:1px solid #cbd5e1; background:#fff;">
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

                        <!-- Seção: Dados do Cliente (somente leitura para edição, mantendo a pesquisa por lupa/Enter quando em branco) -->
                        <div style="background:#fdf2f8; border:1px solid #fbcfe8; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem;">
                            <h4 style="margin:0 0 0.35rem !important;">
                                <i class="ph ph-buildings" style="color:#7048e8;"></i> Dados do Cliente <span style="color:#dc2626;">*</span>
                            </h4>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem 0.75rem;">
                                <div>
                                    <label class="prop-lbl">Cliente <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex; gap:0.35rem; align-items:center;">
                                        <input type="text" id="cos-cliente" value="${esc(clienteNomeFormatado)}"
                                            ${!isNovo ? 'readonly' : ''}
                                            placeholder="Pressione Enter ou clique na lupa para pesquisar OS por cliente..."
                                            onkeydown="if(event.key==='Enter'){ event.preventDefault(); event.stopPropagation(); window._comercialOS.pesquisarPorCampoClienteInput(); }"
                                            style="width:100%;">
                                        <button type="button" onclick="window._comercialOS.pesquisarPorCampoClienteInput()"
                                            style="background:#2563eb; color:white; border:none; flex-shrink:0;" title="Pesquisar OS por Cliente">
                                            <i class="ph ph-magnifying-glass"></i>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="prop-lbl">Contato <span style="color:#ef4444;">*</span></label>
                                    <input type="text" id="cos-contato" value="${esc(v('contato_nome'))}" readonly disabled style="width:100%;">
                                </div>
                            </div>
                        </div>

                        <!-- Seção: Entrega, Manutenções e Retiradas (antigo Período e Locação, sem Dias Contrato) -->
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem;">
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
                                <!-- Linha Entrega e Retirada + Horários + Checkbox Horário Comercial (exceto quando for Evento) -->
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:0.45rem;">
                                    <!-- Bloco Entrega -->
                                    <div style="background:rgba(255,255,255,0.75); border:1px solid #bbf7d0; border-radius:6px; padding:0.45rem 0.6rem;">
                                        <div style="display:grid; grid-template-columns:1fr 1fr ${ehEvento ? '' : 'auto'}; gap:0.45rem; align-items:end;">
                                            <div>
                                                <label class="prop-lbl">Data de Entrega <span style="color:#dc2626;">*</span></label>
                                                <input type="date" id="cos-data-entrega" value="${esc(d.data_entrega || '')}" ${isNovo ? 'disabled' : ''}
                                                    onchange="window._comercialOS.onChangeCampoDadosOs('data_entrega', this.value)" style="width:100%;">
                                            </div>
                                            <div>
                                                <label class="prop-lbl">Horário da Entrega <span style="color:#dc2626;">*</span></label>
                                                <input type="text" id="cos-hora-entrega" value="${esc(d.entrega_horario_comercial ? '08:00 às 18:00 (Comercial)' : (d.hora_entrega || ''))}"
                                                    placeholder="Ex: 08:00 às 12:00"
                                                    ${(isNovo || d.entrega_horario_comercial) ? 'disabled' : ''}
                                                    oninput="window._comercialOS.onChangeCampoDadosOs('hora_entrega', this.value)" style="width:100%;">
                                            </div>
                                            ${!ehEvento ? `
                                                <div>
                                                    <label class="prop-chk-inline-lbl" title="Selecionar Horário Comercial (08:00 às 18:00) para a entrega">
                                                        <input type="checkbox" id="cos-chk-entrega-comercial" ${d.entrega_horario_comercial ? 'checked' : ''} ${isNovo ? 'disabled' : ''}
                                                            onchange="window._comercialOS.onToggleHorarioComercial('entrega', this.checked)">
                                                        <span>Horário comercial</span>
                                                    </label>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>

                                    <!-- Bloco Retirada -->
                                    <div style="background:rgba(255,255,255,0.75); border:1px solid #bbf7d0; border-radius:6px; padding:0.45rem 0.6rem;">
                                        <div style="display:grid; grid-template-columns:1fr 1fr ${ehEvento ? '' : 'auto'}; gap:0.45rem; align-items:end;">
                                            <div>
                                                <label class="prop-lbl">Data de Retirada <span style="color:#dc2626;">*</span></label>
                                                <input type="date" id="cos-data-retirada" value="${esc(d.data_retirada || '')}" ${isNovo ? 'disabled' : ''}
                                                    onchange="window._comercialOS.onChangeCampoDadosOs('data_retirada', this.value)" style="width:100%;">
                                            </div>
                                            <div>
                                                <label class="prop-lbl">Horário da Retirada <span style="color:#dc2626;">*</span></label>
                                                <input type="text" id="cos-hora-retirada" value="${esc(d.retirada_horario_comercial ? '08:00 às 18:00 (Comercial)' : (d.hora_retirada || ''))}"
                                                    placeholder="Ex: 14:00 às 18:00"
                                                    ${(isNovo || d.retirada_horario_comercial) ? 'disabled' : ''}
                                                    oninput="window._comercialOS.onChangeCampoDadosOs('hora_retirada', this.value)" style="width:100%;">
                                            </div>
                                            ${!ehEvento ? `
                                                <div>
                                                    <label class="prop-chk-inline-lbl" title="Selecionar Horário Comercial (08:00 às 18:00) para a retirada">
                                                        <input type="checkbox" id="cos-chk-retirada-comercial" ${d.retirada_horario_comercial ? 'checked' : ''} ${isNovo ? 'disabled' : ''}
                                                            onchange="window._comercialOS.onToggleHorarioComercial('retirada', this.checked)">
                                                        <span>Horário comercial</span>
                                                    </label>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>

                                <!-- Bloco Manutenções (automático da proposta + horário comercial automático para obras) -->
                                ${!ehEvento ? `
                                    <div style="display:grid; grid-template-columns:1fr 1.4fr auto; gap:0.5rem; align-items:end; background:rgba(255,255,255,0.75); border:1px solid #bbf7d0; border-radius:6px; padding:0.45rem 0.6rem; margin-bottom:0.45rem;">
                                        <div>
                                            <label class="prop-lbl">Quantidade de Manutenções (Proposta)</label>
                                            <input type="text" id="cos-qtd-manutencoes" value="${esc(d.qtd_manutencoes || '—')}" readonly disabled style="width:100%; font-weight:700;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Horário da Manutenção</label>
                                            <input type="text" id="cos-horario-manutencao" value="${esc(d.manutencao_horario_comercial ? '08:00 às 18:00 (Horário Comercial)' : (d.horario_manutencao || ''))}"
                                                placeholder="Informe o horário da manutenção..."
                                                ${(isNovo || d.manutencao_horario_comercial) ? 'disabled' : ''}
                                                oninput="window._comercialOS.onChangeCampoDadosOs('horario_manutencao', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-chk-inline-lbl">
                                                <input type="checkbox" id="cos-chk-manut-comercial" ${d.manutencao_horario_comercial ? 'checked' : ''} ${isNovo ? 'disabled' : ''}
                                                    onchange="window._comercialOS.onToggleHorarioComercial('manutencao', this.checked)">
                                                <span>Horário comercial</span>
                                            </label>
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Bloco exclusivo de EVENTO: Dias e Horas do Evento (Início e Fim, sem opção de horário comercial) -->
                                ${ehEvento ? `
                                    <div style="background:rgba(255,255,255,0.85); border:1px solid #86efac; border-radius:6px; padding:0.5rem 0.65rem; margin-bottom:0.45rem;">
                                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
                                            <span style="font-size:0.75rem; font-weight:800; color:#166534; display:flex; align-items:center; gap:5px;">
                                                <i class="ph ph-calendar-star"></i> Dias e Horários do Evento (Início e Fim) <span style="color:#dc2626;">*</span>
                                            </span>
                                            <button type="button" onclick="window._comercialOS.adicionarDiaEvento()" ${isNovo ? 'disabled' : ''}
                                                style="background:#16a34a; color:#fff; border:none;">
                                                <i class="ph ph-plus"></i> Adicionar Dia do Evento
                                            </button>
                                        </div>
                                        <div id="cos-dias-evento-wrap">
                                            ${renderDiasEventoRowsHtml()}
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Endereço de Instalação / Nome do Evento -->
                                <div style="display:flex; gap:0.75rem; align-items:center; background:rgba(255,255,255,0.75); padding:0.45rem 0.6rem; border:1px solid #bbf7d0; border-radius:6px; flex-wrap:wrap;">
                                    ${ehEvento ? `
                                        <div style="display:flex; gap:0.4rem; align-items:center; flex:1 1 240px;">
                                            <span style="font-size:0.74rem; font-weight:700; color:#475569; white-space:nowrap;">Nome do Evento:</span>
                                            <input type="text" value="${esc(v('nome_evento'))}" readonly disabled style="width:100%;">
                                        </div>
                                    ` : ''}
                                    <div style="display:flex; gap:0.4rem; align-items:center; flex:2 1 360px;">
                                        <span style="font-size:0.74rem; font-weight:700; color:#475569; white-space:nowrap;">Instalação *:</span>
                                        <input type="text" id="cos-endereco-instalacao" value="${esc(v('endereco_instalacao'))}" readonly disabled style="width:100%;">
                                        ${v('regiao') ? `<span style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:0.7rem; padding:2px 8px; border-radius:999px; white-space:nowrap;">${esc(v('regiao'))}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Quadro FOB (exibido apenas quando o frete for do tipo FOB) -->
                        ${temFob ? `
                            <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem;">
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
                                            <input type="date" id="cos-fob-data-entrega" value="${esc(d.fob_data_entrega || '')}"
                                                onchange="window._comercialOS.onChangeCampoDadosOs('fob_data_entrega', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Data da Retirada (FOB) <span style="color:#dc2626;">*</span></label>
                                            <input type="date" id="cos-fob-data-retirada" value="${esc(d.fob_data_retirada || '')}"
                                                onchange="window._comercialOS.onChangeCampoDadosOs('fob_data_retirada', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Modelo do Veículo <span style="color:#dc2626;">*</span></label>
                                            <input type="text" id="cos-fob-modelo-veiculo" value="${esc(d.fob_modelo_veiculo || '')}"
                                                placeholder="Modelo do veículo..."
                                                oninput="window._comercialOS.onChangeCampoDadosOs('fob_modelo_veiculo', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Placa do Veículo <span style="color:#dc2626;">*</span></label>
                                            <input type="text" id="cos-fob-placa-veiculo" value="${esc(d.fob_placa_veiculo || '')}"
                                                placeholder="Ex: ABC-1D23"
                                                oninput="window._comercialOS.onChangeCampoDadosOs('fob_placa_veiculo', this.value)" style="width:100%;">
                                        </div>
                                        <div>
                                            <label class="prop-lbl">Nome do Motorista <span style="color:#dc2626;">*</span></label>
                                            <input type="text" id="cos-fob-nome-motorista" value="${esc(d.fob_nome_motorista || '')}"
                                                placeholder="Nome do motorista..."
                                                oninput="window._comercialOS.onChangeCampoDadosOs('fob_nome_motorista', this.value)" style="width:100%;">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Seção: Produtos (Com associação e ícones da OS da Logística para Próprio Avulso e Pacote Obra; Quadro Serviços ocultado) -->
                        <div style="background:#fefce8; border:1px solid #fde68a; border-radius:9px; padding:0.55rem 0.85rem; margin-bottom:0.55rem;">
                            <div onclick="window._comercialOS.toggleSecao('produtos', event)" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;">
                                <h4 style="margin:0 !important; border-bottom:none !important; padding-bottom:0 !important;">
                                    <i class="ph ph-package" style="color:#7048e8;"></i> Produtos <span style="color:#dc2626;">*</span>
                                    <span id="cos-produtos-count-badge" style="display:none; background:#fef9c3; color:#854d0e; border:1px solid #fde047; font-size:0.68rem; font-weight:800; padding:1px 8px; border-radius:999px;"></span>
                                </h4>
                                <button type="button" onclick="window._comercialOS.toggleSecao('produtos', event)"
                                    style="width:24px !important; padding:0 !important; border:1px solid #fcd34d; background:#fef08a; color:#854d0e;">
                                    <i id="cos-caret-produtos" class="ph ph-caret-down" style="transition:transform 0.2s; transform:${state.secoesAbertas.produtos ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                                </button>
                            </div>
                            <div id="cos-secao-produtos-body" style="display:${state.secoesAbertas.produtos ? 'block' : 'none'}; margin-top:0.45rem;">
                                <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                                        <thead>
                                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.7rem; text-transform:uppercase;">
                                                <th style="padding:8px;">Produto</th>
                                                <th style="padding:8px;">Observação</th>
                                                <th style="padding:8px 6px; text-align:center;">Qtd.</th>
                                                <th style="padding:8px 6px; text-align:center;">Diárias / Manut.</th>
                                            </tr>
                                        </thead>
                                        <tbody id="cos-produtos-tbody">
                                            ${renderProdutosGridHtml(prop)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

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
                        <div style="margin-bottom:0.25rem;">
                            <label class="prop-lbl">Observações</label>
                            <textarea id="cos-obs" rows="3" ${isNovo ? 'disabled' : ''} oninput="window._comercialOS.marcarEditado()"
                                style="width:100%; resize:vertical;"
                                placeholder="${isNovo ? 'Pesquise uma OS existente pelo Nº da OS, Nome do Cliente, Nº do Contrato ou Nº da Proposta (toda OS nasce de um contrato assinado).' : 'Informações adicionais sobre a OS...'}">${esc(v('observacoes'))}</textarea>
                        </div>
                    </form>
                </div>
            </div>
        `;

        renderProdutosGridHtml(prop);
        atualizarVisibilidadeBotaoEnviarLogistica();
        if (!isNovo) {
            carregarAnexosOs(prop.id);
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
                : String(p.cliente_nome || '').replace(/^[💎🥇🥈🥉]\s*/, '').trim();
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

    window._comercialOS = {
        async init() {
            if (window._comercialOsAbrirPropostaId) {
                const pid = window._comercialOsAbrirPropostaId;
                window._comercialOsAbrirPropostaId = null;
                window._comercialOsTipoOperacaoForcado = '';
                await this.carregarOsPorPropostaId(pid);
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
                state.anexosAtuais = Array.isArray(snap.anexosAtuais) ? snap.anexosAtuais : [];
            } else {
                this.resetarParaNovaAba();
            }
            renderFormOS();
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
                state.editadoNaoSalvo = false;
                state.anexosAtuais = [];
                this.salvarSnapshotAba();
                renderFormOS();
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
            if (state.osAtual && state.osAtual.id) {
                await abrirModalPesquisaOS({ foco: 'cliente' });
                return;
            }
            const raw = String(document.getElementById('cos-cliente')?.value || '').trim();
            const limpo = typeof window.limparPrefixoGrupoCliente === 'function'
                ? window.limparPrefixoGrupoCliente(raw)
                : raw.replace(/^[💎🥇🥈🥉]\s*/, '').trim();
            await abrirModalPesquisaOS({ cliente: limpo, foco: 'cliente' });
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

        onChangeCampoDadosOs(campo, valor) {
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs[campo] = valor;
            this.marcarEditado();
            this.salvarSnapshotAba();
            atualizarVisibilidadeBotaoEnviarLogistica();
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
                }
            } else if (qual === 'retirada') {
                state.dadosOs.retirada_horario_comercial = Boolean(checked);
                if (checked) state.dadosOs.hora_retirada = '08:00 às 18:00';
                const inp = document.getElementById('cos-hora-retirada');
                if (inp) {
                    inp.disabled = Boolean(checked);
                    inp.value = checked ? '08:00 às 18:00 (Comercial)' : (state.dadosOs.hora_retirada || '');
                }
            } else if (qual === 'manutencao') {
                state.dadosOs.manutencao_horario_comercial = Boolean(checked);
                if (checked) state.dadosOs.horario_manutencao = 'Horário Comercial (08:00 às 18:00)';
                const inp = document.getElementById('cos-horario-manutencao');
                if (inp) {
                    inp.disabled = Boolean(checked);
                    inp.value = checked ? '08:00 às 18:00 (Horário Comercial)' : (state.dadosOs.horario_manutencao || '');
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
            if (!(typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial())) return;
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
            if (!(typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial())) return;
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
            if (state.osAtual) state.osAtual.atendente = nome;
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
            if (btn && state.osAtual && state.osAtual.id) {
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
            if (!state.osAtual || !state.osAtual.id) return false;
            const podeEditarAtend = typeof window.usuarioLogadoPodeEditarAtendenteComercial === 'function' && window.usuarioLogadoPodeEditarAtendenteComercial();
            const novoAtendVal = podeEditarAtend
                ? String(document.getElementById('cos-atendente')?.value || state.osAtual.atendente || '').trim()
                : (state.osAtual.atendente || '');
            const payload = {
                status_os: document.getElementById('cos-status-os')?.value || state.osAtual.status_os || 'EM ELABORAÇÃO',
                os_tipo_operacao: resolverTipoOsComercial(state.osAtual),
                os_criada_em: state.osAtual.os_criada_em || hojeIso(),
                observacoes: document.getElementById('cos-obs')?.value ?? (state.osAtual.observacoes || ''),
                os_comercial_dados_json: JSON.stringify(state.dadosOs || {}),
                atendente: novoAtendVal
            };
            try {
                const tk = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
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
            if (!state.osAtual || !state.osAtual.id) return;
            const check = verificarCamposObrigatoriosOsPreenchidos();
            if (!check.ok) {
                Swal.fire('Campos obrigatórios pendentes', `Preencha antes de enviar para a Logística:\n• ${check.pendencias.join('\n• ')}`, 'warning');
                return;
            }
            if (!state.dadosOs) state.dadosOs = {};
            state.dadosOs.enviada_logistica = true;
            state.osAtual.status_os = 'LIBERADO';
            const inpSt = document.getElementById('cos-status-os');
            if (inpSt) inpSt.value = 'LIBERADO';
            const ok = await this.salvarAlteracoesOS(true);
            if (ok) {
                if (typeof mostrarToastSucesso === 'function') {
                    mostrarToastSucesso(`OS Nº ${state.osAtual.numero_os} enviada para a Logística (Status: LIBERADO)!`);
                } else {
                    Swal.fire('Enviada!', `OS Nº ${state.osAtual.numero_os} enviada para a Logística com status LIBERADO.`, 'success');
                }
            }
        }
    };

    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('cos-status-custom-wrap');
        const menu = document.getElementById('cos-status-custom-menu');
        if (menu && menu.style.display === 'block' && wrap && !wrap.contains(e.target)) {
            menu.style.display = 'none';
        }
        const wrapAtend = document.getElementById('cos-atendente-combo-wrap');
        const dropAtend = document.getElementById('cos-atendente-dropdown');
        if (dropAtend && dropAtend.style.display === 'block' && wrapAtend && !wrapAtend.contains(e.target)) {
            dropAtend.style.display = 'none';
        }
    });

    window.renderTelaOSComercial = function () {
        window._comercialOS.init();
    };
})();
