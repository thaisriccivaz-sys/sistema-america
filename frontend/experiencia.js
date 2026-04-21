// ===========================================================
// MÓDULO: CONTROLE DE EXPERIÊNCIA
// ===========================================================

let _experienciaLista = [];
let _expStatFilter = '';
let _expSortField = '';
let _expSortAsc = true;

function filterByStatExp(stat) {
    _expStatFilter = stat;
    filterExperienciaList();
}
window.filterByStatExp = filterByStatExp;

function sortExperienciaList(field) {
    if (_expSortField === field) {
        _expSortAsc = !_expSortAsc;
    } else {
        _expSortField = field;
        _expSortAsc = true;
    }
    filterExperienciaList();
}
window.sortExperienciaList = sortExperienciaList;

function filterExperienciaList(searchVal) {
    const search = (typeof searchVal === 'string' ? searchVal : document.getElementById('exp-search')?.value || '').toLowerCase();
    const situacaoFiltro = document.getElementById('exp-filter-situacao')?.value || '';
    
    let filtered = _experienciaLista.filter(c => {
        const matchSearch = !search || (c.nome_completo || '').toLowerCase().includes(search) ||
            (c.departamento || '').toLowerCase().includes(search) ||
            (c.cargo || '').toLowerCase().includes(search);
        const matchSituacao = !situacaoFiltro || (c.formulario_situacao || 'pendente') === situacaoFiltro;
        
        let matchStat = true;
        if (_expStatFilter === 'aprovados') {
            matchStat = c.formulario_resultado === 'Aprovado';
        } else if (_expStatFilter === 'reprovados') {
            matchStat = c.formulario_resultado === 'Reprovado';
        } else if (_expStatFilter === 'vencendo') {
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            if (c.prazo2_fim) {
                const fim = parseDateBR_or_ISO(c.prazo2_fim);
                if (fim) {
                    const diff = Math.ceil((fim - hoje) / 86400000);
                    matchStat = (diff > 0 && diff <= 15);
                } else matchStat = false;
            } else matchStat = false;
        }

        return matchSearch && matchSituacao && matchStat;
    });

    if (_expSortField) {
        filtered.sort((a, b) => {
            let valA = '', valB = '';
            if (_expSortField === 'nome') {
                valA = a.nome_completo || '';
                valB = b.nome_completo || '';
            } else if (_expSortField === 'admissao') {
                valA = parseDateBR_or_ISO(a.data_admissao) || new Date(0);
                valB = parseDateBR_or_ISO(b.data_admissao) || new Date(0);
            } else if (_expSortField === 'vencimento') {
                valA = parseDateBR_or_ISO(a.prazo2_fim) || new Date(0);
                valB = parseDateBR_or_ISO(b.prazo2_fim) || new Date(0);
            }
            if (valA < valB) return _expSortAsc ? -1 : 1;
            if (valA > valB) return _expSortAsc ? 1 : -1;
            return 0;
        });
    }

    renderExperienciaList(filtered);
    updateExperienciaUIState();
}
window.filterExperienciaList = filterExperienciaList;

function updateExperienciaUIState() {
    // Atualizar cartões
    const cards = document.querySelectorAll('#exp-stats-row .card');
    cards.forEach((card, idx) => {
        card.style.border = '1px solid #e2e8f0';
        card.style.background = '#fff';
        card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        
        const isSelected = (idx === 0 && _expStatFilter === '') ||
                           (idx === 1 && _expStatFilter === 'vencendo') ||
                           (idx === 2 && _expStatFilter === 'aprovados') ||
                           (idx === 3 && _expStatFilter === 'reprovados');
        if (isSelected) {
            card.style.border = '2px solid #3b82f6';
            card.style.background = '#f8fafc';
            card.style.boxShadow = '0 4px 6px -1px rgba(59,130,246,0.2)';
        }
    });

    // Atualizar ícones de ordenação
    const thNome = document.getElementById('th-exp-nome');
    const thAdmissao = document.getElementById('th-exp-admissao');
    const thVencimento = document.getElementById('th-exp-vencimento');
    
    if (thNome) thNome.innerHTML = `Colaborador <i class="ph ${_expSortField === 'nome' ? (_expSortAsc ? 'ph-arrow-up' : 'ph-arrow-down') : 'ph-arrows-down-up'}" style="color:${_expSortField === 'nome' ? '#3b82f6' : '#94a3b8'};font-size:0.8rem;font-weight:bold;"></i>`;
    if (thAdmissao) thAdmissao.innerHTML = `Admissão <i class="ph ${_expSortField === 'admissao' ? (_expSortAsc ? 'ph-arrow-up' : 'ph-arrow-down') : 'ph-arrows-down-up'}" style="color:${_expSortField === 'admissao' ? '#3b82f6' : '#94a3b8'};font-size:0.8rem;font-weight:bold;"></i>`;
    if (thVencimento) thVencimento.innerHTML = `Fim 2º Prazo <i class="ph ${_expSortField === 'vencimento' ? (_expSortAsc ? 'ph-arrow-up' : 'ph-arrow-down') : 'ph-arrows-down-up'}" style="color:${_expSortField === 'vencimento' ? '#3b82f6' : '#94a3b8'};font-size:0.8rem;font-weight:bold;"></i>`;
}

const FORMULARIOS_POR_DEPARTAMENTO = {
    'Ajudante Geral': {
        titulo: 'AVALIAÇÃO AJUDANTE GERAL',
        secoes: [
            {
                nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA',
                itens: [
                    'Evita faltas não justificadas.',
                    'Mantém baixo número de faltas justificadas.',
                    'Comunica qualquer falta ou atraso com antecedência.',
                    'Sai pontualmente para a rota no horário programado.',
                    'Realiza os atendimentos da rota com agilidade e bom ritmo.',
                    'É comprometido e flexível para realizar escalas extras quando solicitado.'
                ]
            },
            {
                nome: '2. CUIDADO COM OS MATERIAIS',
                itens: [
                    'Demonstra cuidado ao entrar e sair do veículo.',
                    'Tem atenção ao abrir portas, caçamba ou equipamentos para não causar avarias.',
                    'Evita apoiar materiais ou ferramentas que possam riscar ou danificar o veículo.',
                    'Utiliza corretamente e preserva mangueiras, conexões e acessórios da operação.',
                    'Mostra interesse em preservar o patrimônio da empresa.',
                    'Utiliza os equipamentos e máquinas da empresa com cuidado e atenção, seguindo as orientações.'
                ]
            },
            {
                nome: '3. OPERAÇÃO E SERVIÇO',
                itens: [
                    'Realiza corretamente a sucção de dejetos e a lavagem dos banheiros, seguindo o padrão.',
                    'Apresenta proatividade ao retornar cedo da rota.',
                    'Demonstra atenção e cuidado com a segurança no manuseio de resíduos.',
                    'Mantém organização e limpeza do local após finalizar a operação.',
                    'Mantém postura profissional no manuseio de dejetos, sem demonstrar nojo.',
                    'Utiliza corretamente os EPIs obrigatórios durante as operações.'
                ]
            },
            {
                nome: '4. APOIO AO MOTORISTA',
                itens: [
                    'Mantém atenção ao trânsito durante a rota, alertando o motorista sobre riscos.',
                    'Auxilia o motorista com segurança em manobras (sinalização e orientação de espaço).',
                    'Segue orientações do motorista com a operação.',
                    'Auxilia o motorista a aprontar o veículo para rápida saída da rota.',
                    'Auxilia o motorista a finalizar a rota e alocar os materiais em seus devidos lugares.',
                    'Auxilia motorista no uso de aplicativo, evitando que ele utilize o celular enquanto dirige e outras situações.'
                ]
            },
            {
                nome: '5. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém comunicação cordial e respeitosa com logística, liderança e equipe.',
                    'Aceita orientações e feedback sem resistência, buscando melhorar.',
                    'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).',
                    'Mantém postura profissional com o cliente, evitando conflitos e preservando a imagem da empresa.',
                    'Respeita a hierarquia de modo geral.',
                    'Tem bom comportamento em confraternizações e reuniões.'
                ]
            }
        ]
    },
    'Comercial': {
        titulo: 'AVALIAÇÃO COMERCIAL',
        secoes: [
            {
                nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA',
                itens: [
                    'Evita faltas não justificadas.',
                    'Mantém baixo número de faltas justificadas.',
                    'Comunica qualquer falta ou atraso com antecedência.',
                    'Evita saídas longas do posto de trabalho durante o dia.',
                    'Realiza os atendimentos com agilidade garantindo que todos os clientes sejam atendidos.',
                    'Mantém organização das atividades ao longo do dia.'
                ]
            },
            {
                nome: '2. COMUNICAÇÃO E ATENDIMENTO',
                itens: [
                    'Apresenta boa escrita e clareza em mensagens, evitando erros e ruídos de comunicação.',
                    'Tem o perfil de encantamento do cliente, tentando ajudar e demostrando interesse.',
                    'Consegue explicar informações básicas de produtos ou serviços.',
                    'Consegue explicar informações complexas de produtos ou serviços.',
                    'Consegue lidar com reclamações e situações difíceis com calma, educação e foco em solução.',
                    'Tem agilidade no atendimento, respondendo rapidamente o cliente.'
                ]
            },
            {
                nome: '3. ORGANIZAÇÃO E ROTINAS',
                itens: [
                    'Utiliza corretamente sistemas garantindo a integridade dos processos.',
                    'Cumpre prazos e mantém controles sobre retorno a clientes e colegas.',
                    'Tem fácil aprendizado para novas atividades.',
                    'Demonstra atenção ao preencher cadastros e propostas e contratos.',
                    'Mantém registros e informações atualizadas no sistema.',
                    'Acompanha follow-up de clientes (retornos, cobranças e pendências) sem deixar oportunidades morrerem.'
                ]
            },
            {
                nome: '4. RESULTADOS E PROATIVIDADE',
                itens: [
                    'Demonstra iniciativa para ajudar nas demandas.',
                    'Contribui para organização de metas, orçamentos ou relatórios.',
                    'Apresenta habilidade e agilidade no uso de computadores e na execução das tarefas.',
                    'Consegue executar tarefas sem necessidade constante de supervisão.',
                    'Demonstra capacidade de identificar oportunidades de venda (novos clientes, renovação e reativação).',
                    'Busca atingir metas e acompanhar resultados do setor.'
                ]
            },
            {
                nome: '5. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém comunicação cordial e respeitosa com logística, liderança e equipe.',
                    'Aceita orientações e feedback sem resistência, buscando melhorar.',
                    'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).',
                    'Mantém postura profissional no ambiente de trabalho, evitando brincadeiras inadequadas e conflitos.',
                    'Respeita a hierarquia de modo geral.',
                    'Tem bom comportamento em confraternizações e reuniões.'
                ]
            }
        ]
    },
    'Manutenção': {
        titulo: 'AVALIAÇÃO MANUTENÇÃO',
        secoes: [
            {
                nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA',
                itens: [
                    'Evita faltas não justificadas.',
                    'Mantém baixo número de faltas justificadas.',
                    'Comunica qualquer falta ou atraso com antecedência.',
                    'Evita saídas longas do posto de trabalho durante o dia.',
                    'Realiza todas as atividades com agilidade, evitando ociosidade durante uma atividade.',
                    'Mantém organização das atividades ao longo do dia.'
                ]
            },
            {
                nome: '2. QUALIDADE DO SERVIÇO',
                itens: [
                    'Executa as atividades com cuidado e capricho.',
                    'Segue corretamente as orientações recebidas.',
                    'Demonstra atenção aos detalhes nas manutenções realizadas.',
                    'Verifica o serviço após a conclusão para evitar retrabalho.',
                    'Utiliza corretamente ferramentas e materiais.',
                    'Comunica quando identifica falhas ou necessidade de ajuste.'
                ]
            },
            {
                nome: '3. SEGURANÇA',
                itens: [
                    'Utiliza corretamente os EPIs.',
                    'Respeita normas e procedimentos de segurança.',
                    'Tem atenção ao manusear ferramentas e equipamentos.',
                    'Comunica situações de risco ou condições inseguras.',
                    'Evita improvisações que possam gerar risco.',
                    'Demonstra responsabilidade com a própria segurança e a dos colegas.'
                ]
            },
            {
                nome: '4. ORGANIZAÇÃO E FERRAMENTAS',
                itens: [
                    'Mantém ferramentas e materiais organizados após o uso.',
                    'Zela pelos equipamentos da empresa.',
                    'Mantém o local de trabalho limpo e organizado.',
                    'Evita perdas ou extravios de materiais.',
                    'Sabe identificar e separar corretamente cada ferramenta.',
                    'Comunica quando alguma ferramenta está danificada ou faltando.'
                ]
            },
            {
                nome: '5. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém comunicação cordial e respeitosa com logística, liderança e equipe.',
                    'Aceita orientações e feedback sem resistência, buscando melhorar.',
                    'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).',
                    'Mantém postura profissional no ambiente de trabalho, evitando brincadeiras inadequadas e conflitos.',
                    'Respeita a hierarquia de modo geral.',
                    'Tem bom comportamento em confraternizações e reuniões.'
                ]
            }
        ]
    },
    'Motorista': {
        titulo: 'AVALIAÇÃO MOTORISTA',
        secoes: [
            {
                nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA',
                itens: [
                    'Evita faltas não justificadas.',
                    'Mantém baixo número de faltas justificadas.',
                    'Comunica qualquer falta ou atraso com antecedência.',
                    'Sai pontualmente para a rota no horário programado.',
                    'Realiza os atendimentos com agilidade garantindo que todos os clientes sejam atendidos.',
                    'É comprometido e flexível para realizar escalas extras quando solicitado.'
                ]
            },
            {
                nome: '2. CONDUÇÃO E CUIDADO COM O VEÍCULO',
                itens: [
                    'Cuida do correto abastecimento do veículo conforme orientação.',
                    'Respeita as regras de trânsito, evitando multas e advertências.',
                    'Mantém postura profissional no trânsito, evitando conflitos e discussões.',
                    'Mantém a limpeza e organização do veículo ao final da rota.',
                    'Comunica imediatamente qualquer ruído, falha mecânica ou sinal de problema no veículo.',
                    'Mantém atenção durante a direção, evitando distrações.'
                ]
            },
            {
                nome: '3. OPERAÇÃO E SERVIÇO (ATIVIDADE PRINCIPAL)',
                itens: [
                    'Realiza corretamente a sucção de dejetos, seguindo o padrão da empresa.',
                    'Evita desperdício de insumos e utiliza os recursos com consciência.',
                    'Demonstra atenção e cuidado com a segurança no manuseio de resíduos.',
                    'Mantém organização e limpeza do local após finalizar a operação.',
                    'Mantém postura profissional no manuseio de dejetos, sem demonstrar nojo.',
                    'Utiliza corretamente os EPIs obrigatórios durante as operações.'
                ]
            },
            {
                nome: '4. PROCESSOS, CONTROLES E DOCUMENTOS',
                itens: [
                    'Demonstra facilidade na utilização das ferramentas e sistemas.',
                    'Preenche corretamente o checklist do veículo.',
                    'Garante que o registro do atendimento seja feito corretamente no aplicativo.',
                    'Comunica a logística antes de registrar falha no sistema.',
                    'Responde as mensagens e ligações de forma ágil e direta.',
                    'Está atento ao resumo da rota antes da saída pela manhã.'
                ]
            },
            {
                nome: '5. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém comunicação cordial e respeitosa com logística, liderança e equipe.',
                    'Aceita orientações e feedback sem resistência, buscando melhorar.',
                    'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).',
                    'Mantém postura profissional com o cliente, evitando conflitos e preservando a imagem da empresa.',
                    'Respeita a hierarquia de modo geral.',
                    'Tem bom comportamento em confraternizações e reuniões.'
                ]
            }
        ]
    }
};

// Formulário padrão para departamentos sem template específico
function getFormularioPadrao(depto) {
    return {
        titulo: `AVALIAÇÃO ${depto.toUpperCase()}`,
        secoes: [
            {
                nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA',
                itens: [
                    'Evita faltas não justificadas.',
                    'Mantém baixo número de faltas justificadas.',
                    'Comunica qualquer falta ou atraso com antecedência.',
                    'Cumpre o horário de trabalho estabelecido.',
                    'Realiza suas atividades com agilidade e organização.',
                    'É comprometido com suas responsabilidades.'
                ]
            },
            {
                nome: '2. QUALIDADE E DESEMPENHO',
                itens: [
                    'Executa as atividades com cuidado e capricho.',
                    'Segue corretamente as orientações recebidas.',
                    'Demonstra atenção aos detalhes nas tarefas realizadas.',
                    'Busca melhorar continuamente suas habilidades.',
                    'Entrega resultados dentro do prazo esperado.',
                    'Demonstra iniciativa para resolver problemas.'
                ]
            },
            {
                nome: '3. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém comunicação cordial e respeitosa com a equipe.',
                    'Aceita orientações e feedback sem resistência, buscando melhorar.',
                    'Mantém postura e apresentação adequadas.',
                    'Mantém postura profissional no ambiente de trabalho.',
                    'Respeita a hierarquia de modo geral.',
                    'Tem bom comportamento em confraternizações e reuniões.'
                ]
            }
        ]
    };
}

function getFormulario(departamento) {
    if (!departamento) return getFormularioPadrao('Geral');
    const dept = departamento.trim();
    if (FORMULARIOS_POR_DEPARTAMENTO[dept]) return FORMULARIOS_POR_DEPARTAMENTO[dept];
    // Tenta encontrar parcialmente
    for (const key of Object.keys(FORMULARIOS_POR_DEPARTAMENTO)) {
        if (dept.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(dept.toLowerCase())) {
            return FORMULARIOS_POR_DEPARTAMENTO[key];
        }
    }
    return getFormularioPadrao(departamento);
}

// ---- TELA PRINCIPAL ----
async function loadExperiencia() {
    const section = document.getElementById('view-experiencia');
    if (!section) return;

    window.currentBreadcrumbKey = 'experiencia';
    if(typeof window.renderBookmarks === 'function') window.renderBookmarks();

    // Load data
    const data = await apiGet('/experiencia');
    if (!data) {
        const tbody = document.getElementById('table-experiencia-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ef4444;padding:2rem;">Erro ao carregar dados. Verifique a conexão.</td></tr>';
        return;
    }

    _experienciaLista = data;
    renderExperienciaList(data);
    // Update stats
    updateExperienciaStats(data);
}

function updateExperienciaStats(lista) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    let vencendo = 0, aprovados = 0, reprovados = 0;
    lista.forEach(c => {
        if (c.prazo2_fim) {
            const fim = parseDateBR_or_ISO(c.prazo2_fim);
            if (fim) {
                const diff = Math.ceil((fim - hoje) / 86400000);
                if (diff > 0 && diff <= 15) vencendo++;
            }
        }
        if (c.formulario_resultado === 'Aprovado') aprovados++;
        if (c.formulario_resultado === 'Reprovado') reprovados++;
    });
    const el = s => document.getElementById(s);
    if (el('exp-stat-total')) el('exp-stat-total').textContent = lista.length;
    if (el('exp-stat-vencendo')) el('exp-stat-vencendo').textContent = vencendo;
    if (el('exp-stat-aprovados')) el('exp-stat-aprovados').textContent = aprovados;
    if (el('exp-stat-reprovados')) el('exp-stat-reprovados').textContent = reprovados;
}

function renderExperienciaList(lista) {
    const tbody = document.getElementById('table-experiencia-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem;font-style:italic;">Nenhum colaborador em período de experiência encontrado.</td></tr>';
        return;
    }

    lista.forEach(c => {
        const admissao = c.data_admissao ? formatarDataBR(c.data_admissao) : '-';
        const prazo1Fim = c.prazo1_fim ? formatarDataBR(c.prazo1_fim) : '-';
        const prazo2Fim = c.prazo2_fim ? formatarDataBR(c.prazo2_fim) : '-';

        // Status badge
        let statusBadge = '';
        const situacao = c.formulario_situacao || 'pendente';
        if (situacao === 'finalizado') {
            const resultado = c.formulario_resultado || '';
            if (resultado === 'Aprovado') {
                statusBadge = `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-check-circle"></i> Aprovado</span>`;
            } else if (resultado === 'Reprovado') {
                statusBadge = `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-x-circle"></i> Reprovado</span>`;
            } else {
                statusBadge = `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-check"></i> Finalizado</span>`;
            }
        } else {
            statusBadge = `<span style="background:#f1f5f9;color:#64748b;padding:3px 10px;border-radius:12px;font-size:0.8rem;"><i class="ph ph-clock"></i> Em andamento</span>`;
        }

        // Situação formulário badge
        let formBadge = '';
        const hoje2 = new Date(); hoje2.setHours(0,0,0,0);
        const fim2 = c.prazo2_fim ? parseDateBR_or_ISO(c.prazo2_fim) : null;
        const diasParaVencer = fim2 ? Math.ceil((fim2 - hoje2) / 86400000) : null;
        const estaEnviando = c._enviando;
        
        if (situacao === 'finalizado') {
            const resultado = c.formulario_resultado || '';
            if (resultado === 'Aprovado') {
                formBadge = `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-check-circle"></i> Finalizado</span>`;
            } else if (resultado === 'Reprovado') {
                formBadge = `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-x-circle"></i> Finalizado</span>`;
            } else {
                formBadge = `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-check"></i> Finalizado</span>`;
            }
        } else if (situacao === 'iniciado') {
            formBadge = `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;"><i class="ph ph-pencil"></i> Iniciado</span>`;
        } else if (situacao === 'enviado') {
            const envioDate = c.data_envio_email
                ? new Date(c.data_envio_email).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})
                : '';
            formBadge = `<div style="display:flex;flex-direction:column;gap:2px;">
                <span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-paper-plane-tilt"></i> Enviado</span>
                ${envioDate ? `<span style="font-size:0.65rem;color:#64748b;padding-left:4px;"><i class="ph ph-clock"></i> ${envioDate}</span>` : ''}
            </div>`;
        } else if (estaEnviando) {
            formBadge = `<div style="display:flex;flex-direction:column;gap:2px;">
                <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-spinner" style="animation:spin 1s linear infinite;"></i> Enviando...
                </span>
            </div>`;
        } else if (diasParaVencer !== null && diasParaVencer > 0 && diasParaVencer <= 15) {
            formBadge = `<div style="display:flex;flex-direction:column;gap:2px;">
                <span style="background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:12px;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-clock"></i> Pendente</span>
                <span style="font-size:0.65rem;color:#f59e0b;padding-left:4px;"><i class="ph ph-bell"></i> E-mail será enviado automaticamente</span>
            </div>`;
        } else {
            formBadge = `<span style="background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:12px;font-size:0.8rem;"><i class="ph ph-clock"></i> Pendente</span>`;
        }

        // Days left warning
        let diasRestantesHtml = '';
        if (c.prazo2_fim && situacao !== 'finalizado') {
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const fim = parseDateBR_or_ISO(c.prazo2_fim);
            if (fim) {
                const diff = Math.ceil((fim - hoje) / 86400000);
                if (diff <= 0) {
                    diasRestantesHtml = `<br><span style="color:#dc2626;font-size:0.75rem;font-weight:700;"><i class="ph ph-warning"></i> Vencido!</span>`;
                } else if (diff <= 15) {
                    diasRestantesHtml = `<br><span style="color:#dc2626;font-size:0.75rem;font-weight:700;"><i class="ph ph-warning"></i> ${diff} dias restantes!</span>`;
                }
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;"><a href="#" style="color:#1c7ed6;text-decoration:none;" onclick="event.preventDefault();viewColaborador(${c.id})">${c.nome_completo}</a></td>
            <td>${c.cargo || '-'}</td>
            <td>${c.departamento || '-'}</td>
            <td>${admissao}</td>
            <td>${c.responsavel_nome || '-'}</td>
            <td>${prazo2Fim}${diasRestantesHtml}</td>
            <td>${statusBadge}</td>
            <td>${formBadge}</td>
            <td style="text-align:right;">
                <button onclick="openExperienciaModal(${c.id})" class="btn btn-sm" style="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;font-size:0.8rem;padding:4px 10px;border-radius:6px;cursor:pointer;" title="Ver/Editar Formulário">
                    <i class="ph ph-clipboard-text"></i> Formulário
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function parseDateBR_or_ISO(dateStr) {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(y, m - 1, d);
    }
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d);
    }
    return null;
}

function formatarDataBR(dateStr) {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// ---- MODAL DO FORMULÁRIO ----
async function openExperienciaModal(colaboradorId) {
    const resp = await apiGet(`/experiencia/${colaboradorId}`);
    if (!resp) { showToast('Erro ao carregar dados.', 'error'); return; }

    const colab = resp.colaborador;
    const form = resp.formulario;
    const formularioDef = getFormulario(colab.departamento || colab.cargo || '');

    const token = localStorage.getItem('token');
    let payload;
    try { payload = JSON.parse(atob(token.split('.')[1])); } catch(e) { payload = {}; }
    const isRH = payload.permissoes && (payload.permissoes.includes('rh_completo') || payload.permissoes.includes('rh'));
    const isResponsavel = true; // RH can always edit

    // Determinar se pode editar
    const situacao = form ? form.situacao : 'pendente';
    const canEdit = isRH || situacao !== 'finalizado';

    let modalHtml = `
    <div id="modal-experiencia-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;">
        <div style="background:#fff;border-radius:16px;width:100%;max-width:820px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">
            <div style="padding:1.5rem 2rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:10;border-radius:16px 16px 0 0;">
                <div>
                    <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#0f172a;">${formularioDef.titulo}</h2>
                    <p style="margin:4px 0 0;color:#64748b;font-size:0.85rem;">Avaliação de Experiência — Segundo Prazo</p>
                </div>
                <button onclick="document.getElementById('modal-experiencia-overlay').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;padding:4px;">
                    <i class="ph ph-x-circle"></i>
                </button>
            </div>

            <div style="padding:1.5rem 2rem;">
                <!-- Dados do avaliado -->
                <div style="background:#f8fafc;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem;border:1px solid #e2e8f0;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                        <div><span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;">NOME DO COLABORADOR</span><span style="font-weight:600;color:#0f172a;">${colab.nome_completo}</span></div>
                        <div><span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;">FUNÇÃO</span><span style="font-weight:600;color:#0f172a;">${colab.cargo || '-'}</span></div>
                        <div><span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;">DATA DE ADMISSÃO</span><span style="font-weight:600;color:#0f172a;">${formatarDataBR(colab.data_admissao)}</span></div>
                        <div><span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;">RESPONSÁVEL DA ÁREA</span><span style="font-weight:600;color:#0f172a;">${form && form.responsavel_nome ? form.responsavel_nome : (colab.responsavel_nome || '-')}</span></div>
                    </div>
                </div>

                <form id="form-experiencia-avaliacao">
                    <input type="hidden" id="exp-form-colab-id" value="${colab.id}">
                    <input type="hidden" id="exp-form-id" value="${form ? form.id : ''}">
    `;

    let itemGlobalIdx = 0;
    formularioDef.secoes.forEach((secao, si) => {
        modalHtml += `
            <div style="margin-bottom:1.5rem;">
                <div style="background:#1e3a5f;color:#fff;padding:0.6rem 1rem;border-radius:8px;font-weight:700;font-size:0.85rem;letter-spacing:0.5px;margin-bottom:0.75rem;">${secao.nome}</div>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead><tr>
                        <th style="text-align:left;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Pontos Avaliados</th>
                        <th style="width:100px;text-align:center;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Nota (1-5)</th>
                        <th style="width:200px;text-align:left;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Obs.</th>
                    </tr></thead>
                    <tbody>
        `;

        secao.itens.forEach((item, ii) => {
            const idx = itemGlobalIdx++;
            const nota = form && form.respostas && form.respostas[`nota_${idx}`] !== undefined ? form.respostas[`nota_${idx}`] : '';
            const obs = form && form.respostas && form.respostas[`obs_${idx}`] ? form.respostas[`obs_${idx}`] : '';
            const disabled = situacao === 'finalizado' && !isRH ? 'disabled' : '';

            modalHtml += `
                <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">${item}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">
                        <input type="number" name="nota_${idx}" min="0" max="10" value="${nota}" ${disabled}
                            oninput="calcularPontuacaoExp()"
                            style="width:70px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:0.9rem;outline:none;${disabled ? 'background:#f8fafc;' : ''}">
                    </td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">
                        <input type="text" name="obs_${idx}" value="${obs}" ${disabled}
                            style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;box-sizing:border-box;${disabled ? 'background:#f8fafc;' : ''}">
                    </td>
                </tr>
            `;
        });

        modalHtml += `</tbody></table></div>`;
    });

    const totalItens = itemGlobalIdx;
    const pontuacaoAtual = form && form.pontuacao !== undefined ? form.pontuacao : 0;
    const situacaoAtual = form && form.situacao_avaliacao ? form.situacao_avaliacao : '';
    const comentariosAtual = form && form.comentarios ? form.comentarios : '';

    modalHtml += `
                <!-- Resultado -->
                <div style="background:#f8fafc;border-radius:12px;padding:1.25rem;border:1px solid #e2e8f0;margin-top:1rem;">
                    <div style="display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;">
                        <div>
                            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px;">PONTUAÇÃO TOTAL</span>
                            <span id="exp-pontuacao-total" style="font-size:2rem;font-weight:800;color:#d9480f;">${pontuacaoAtual}</span>
                            <span style="color:#94a3b8;font-size:0.8rem;"> / ${totalItens * 5}</span>
                        </div>
                        <div style="flex:1;min-width:200px;">
                            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px;">SITUAÇÃO</span>
                            <select id="exp-situacao-avaliacao" name="situacao_avaliacao" style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;outline:none;" ${situacao === 'finalizado' && !isRH ? 'disabled' : ''}>
                                <option value="">Selecione...</option>
                                <option value="Aprovado" ${situacaoAtual === 'Aprovado' ? 'selected' : ''}>✅ Aprovado</option>
                                <option value="Reprovado" ${situacaoAtual === 'Reprovado' ? 'selected' : ''}>❌ Reprovado</option>
                            </select>
                        </div>
                        <div style="flex:2;min-width:200px;">
                            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px;">COMENTÁRIOS</span>
                            <textarea id="exp-comentarios" name="comentarios" rows="3" style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;resize:vertical;box-sizing:border-box;" ${situacao === 'finalizado' && !isRH ? 'disabled' : ''}>${comentariosAtual}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:1rem;justify-content:space-between;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e2e8f0;">
                    <div>
                        ${(situacao !== 'finalizado') ? `
                        <button type="button" onclick="reenviarEmailExperiencia(${colab.id}, this)" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                            <i class="ph ph-envelope-simple"></i> Enviar Link p/ Gestor
                        </button>
                        ` : ''}
                    </div>
                    <div style="display:flex;gap:1rem;">
                        <button type="button" onclick="document.getElementById('modal-experiencia-overlay').remove()" style="padding:0.6rem 1.25rem;border:1px solid #e2e8f0;border-radius:8px;background:#f1f5f9;color:#334155;cursor:pointer;font-weight:600;">Fechar</button>
                        ${canEdit ? `
                        <button type="button" onclick="salvarFormularioExp('rascunho')" style="padding:0.6rem 1.25rem;border:1px solid #7c3aed;border-radius:8px;background:#ede9fe;color:#5b21b6;cursor:pointer;font-weight:600;"><i class="ph ph-floppy-disk"></i> Salvar Rascunho</button>
                        <button type="button" onclick="salvarFormularioExp('finalizado')" style="padding:0.6rem 1.25rem;border:none;border-radius:8px;background:#1d4ed8;color:#fff;cursor:pointer;font-weight:600;"><i class="ph ph-check-circle"></i> Finalizar Avaliação</button>
                        ` : ''}
                    </div>
                </div>
            </form>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Store total items count for scoring
    document.getElementById('form-experiencia-avaliacao').dataset.totalItens = totalItens;

    // Calculate initial score
    calcularPontuacaoExp();
}

function calcularPontuacaoExp() {
    const form = document.getElementById('form-experiencia-avaliacao');
    if (!form) return;
    const inputs = form.querySelectorAll('input[name^="nota_"]');
    let total = 0;
    inputs.forEach(inp => {
        const v = parseFloat(inp.value);
        if (!isNaN(v)) total += v;
    });
    const el = document.getElementById('exp-pontuacao-total');
    if (el) el.textContent = total.toFixed(0);
}

async function salvarFormularioExp(situacaoForm) {
    const form = document.getElementById('form-experiencia-avaliacao');
    if (!form) return;

    const colaboradorId = document.getElementById('exp-form-colab-id').value;
    const formId = document.getElementById('exp-form-id').value;

    const respostas = {};
    const inputs = form.querySelectorAll('input[name^="nota_"], input[name^="obs_"]');
    inputs.forEach(inp => { respostas[inp.name] = inp.value; });

    const pontuacao = parseFloat(document.getElementById('exp-pontuacao-total').textContent) || 0;
    const situacaoAvaliacao = document.getElementById('exp-situacao-avaliacao').value;
    const comentarios = document.getElementById('exp-comentarios').value;

    const payload = {
        colaborador_id: colaboradorId,
        respostas,
        pontuacao,
        situacao_avaliacao: situacaoAvaliacao,
        comentarios,
        situacao: situacaoForm
    };

    const url = formId ? `/experiencia/formulario/${formId}` : `/experiencia/formulario`;
    const method = formId ? 'PUT' : 'POST';

    const token = localStorage.getItem('token');
    const resp = await fetch(`/api${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        const err = await resp.json();
        showToast(err.error || 'Erro ao salvar formulário.', 'error');
        return;
    }

    document.getElementById('modal-experiencia-overlay').remove();
    showToast(situacaoForm === 'finalizado' ? 'Avaliação finalizada com sucesso!' : 'Rascunho salvo!', 'success');

    // If finalized, send popup to RH users
    if (situacaoForm === 'finalizado') {
        // The backend will handle the popup via websocket/polling
    }

    // Reload list
    loadExperiencia();
}

async function reenviarEmailExperiencia(colaboradorId, btn) {
    if (!confirm('Deseja enviar/reenviar o e-mail de avaliação para o gestor agora?')) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        const resp = await fetch(`/api/experiencia/enviar-email/${colaboradorId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.error || 'Falha ao enviar e-mail');
        }

        if (typeof showToast !== 'undefined') showToast('E-mail enviado com sucesso!', 'success');
        
        // Reload modal status implicitly by recreating list
        loadExperiencia();

    } catch (e) {
        if (typeof showToast !== 'undefined') showToast(e.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
window.reenviarEmailExperiencia = reenviarEmailExperiencia;

// Register module globally
window.loadExperiencia = loadExperiencia;
window.openExperienciaModal = openExperienciaModal;
window.calcularPontuacaoExp = calcularPontuacaoExp;
window.salvarFormularioExp = salvarFormularioExp;

// ---- PUBLIC FORM LOGIC ----
window.loadPublicExperiencia = async function(token) {
    try {
        const res = await fetch(`/api/experiencia/publico/info?token=${token}`);
        const data = await res.json();
        
        if (!res.ok) {
            document.getElementById('public-exp-content').innerHTML = `
                <div style="text-align:center; padding: 2rem;">
                    <i class="ph ph-warning-circle" style="font-size:3rem; color:#dc2626;"></i>
                    <h3 style="margin-top:1rem; color:#dc2626;">Link Inválido ou Expirado</h3>
                    <p style="color:#64748b; margin-top:0.5rem;">${data.error || 'Não foi possível carregar o formulário.'}</p>
                </div>
            `;
            return;
        }

        renderPublicExpForm(data.colaborador, data.formulario, token);
    } catch (e) {
        console.error(e);
        document.getElementById('public-exp-content').innerHTML = `<div style="text-align:center;color:#dc2626;">Erro de conexão.</div>`;
    }
};

window.renderPublicExpForm = function(colab, form, token) {
    let html = `
        <div style="margin-bottom:2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
            <p style="margin:0; color:#64748b; font-weight:600; text-transform:uppercase; font-size:0.85rem;">Colaborador</p>
            <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">${colab.nome_completo}</h3>
            <p style="margin:4px 0 0; color:#475569;">${colab.cargo || ''} - ${colab.departamento || ''}</p>
        </div>
    `;

    // Achar config do formulário do departamento
    const dpt = colab.departamento || '';
    let formConfig = null;
    let fallback = null;
    for (const [key, val] of Object.entries(FORMULARIOS_POR_DEPARTAMENTO)) {
        if (dpt.toLowerCase().includes(key.toLowerCase())) formConfig = val;
        if (key === 'Geral') fallback = val;
    }
    if (!formConfig) formConfig = fallback;

    if (!formConfig) {
        html += `<div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;">Formulário não configurado para o departamento: ${dpt}</div>`;
        document.getElementById('public-exp-content').innerHTML = html;
        return;
    }

    const disableEdit = form && form.situacao === 'finalizado';

    html += `<form id="public-exp-form-element" onsubmit="window.submitPublicExpForm(event, '${token}')">`;

    // Render Seções
    formConfig.secoes.forEach((secao, sIdx) => {
        html += `<div style="margin-bottom:1.5rem;">
                    <h4 style="margin-bottom:0.75rem; color:#1d4ed8; border-bottom:1px solid #bfdbfe; padding-bottom:4px; font-size:1rem;">${secao.nome}</h4>`;
        secao.itens.forEach((req, idx) => {
            const key = `req_s${sIdx}_i${idx}`;
            const value = (form && form.respostas && form.respostas[key]) ? form.respostas[key] : '';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #e2e8f0;">
                    <div style="flex:1; padding-right:1rem; font-size:0.9rem; color:#334155;">${req}</div>
                    <div style="width:120px;">
                        <select name="${key}" class="form-control" title="Nota de 1 a 5" style="padding:4px; font-size:0.9rem;" onchange="window.calcPublicExpScore()" required ${disableEdit ? 'disabled' : ''}>
                            <option value="">Nota</option>
                            <option value="1" ${value==='1'?'selected':''}>1 - Ruim</option>
                            <option value="2" ${value==='2'?'selected':''}>2 - Regular</option>
                            <option value="3" ${value==='3'?'selected':''}>3 - Bom</option>
                            <option value="4" ${value==='4'?'selected':''}>4 - Muito Bom</option>
                            <option value="5" ${value==='5'?'selected':''}>5 - Excelente</option>
                        </select>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });

    // Subtotal e Resultado Final
    html += `
        <div style="background:#f1f5f9; padding:1rem; border-radius:8px; margin-bottom:1.5rem; text-align:center;">
            <p style="margin:0; font-size:1rem; font-weight:600; color:#475569;">Pontuação Final (Média)</p>
            <div id="public-exp-resultado-num" style="font-size:2rem; font-weight:700; color:#1d4ed8;">${form ? (form.pontuacao || '0.00') : '0.00'}</div>
            <div id="public-exp-resultado-texto" style="font-size:1.1rem; font-weight:600; margin-top:8px;">${form ? (form.situacao_avaliacao || '-') : '-'}</div>
            <input type="hidden" name="pontuacao" id="public-exp-pontuacao-val" value="${form ? form.pontuacao : '0'}">
            <input type="hidden" name="situacao_avaliacao" id="public-exp-situacao-val" value="${form ? form.situacao_avaliacao : ''}">
        </div>
    `;

    // Comentários
    html += `
        <div class="input-group" style="margin-bottom:1.5rem;">
            <label>Comentários / Observações do Responsável:</label>
            <textarea name="comentarios" rows="3" class="form-control" ${disableEdit ? 'readonly' : ''} placeholder="Opcional">${form ? (form.comentarios || '') : ''}</textarea>
        </div>
    `;

    if (!disableEdit) {
        html += `
            <div style="padding-top:1rem; border-top:1px solid #e2e8f0; text-align:right;">
                <button type="submit" class="btn btn-primary" style="padding:10px 20px; font-size:1rem;">
                    <i class="ph ph-check-square-offset"></i> Enviar Avaliação
                </button>
            </div>
        `;
    }

    html += `</form>`;
    document.getElementById('public-exp-content').innerHTML = html;
    
    if(!disableEdit && form) {
        setTimeout(window.calcPublicExpScore, 100);
    }
};

window.calcPublicExpScore = function() {
    const frm = document.getElementById('public-exp-form-element');
    if(!frm) return;
    const selects = frm.querySelectorAll('select[name^="req_"]');
    let total = 0, count = 0;
    selects.forEach(sel => {
        if (sel.value) { total += parseInt(sel.value); count++; }
    });
    
    const media = count > 0 ? (total / count).toFixed(2) : '0.00';
    document.getElementById('public-exp-resultado-num').textContent = media;
    document.getElementById('public-exp-pontuacao-val').value = media;
    
    const resTextoEl = document.getElementById('public-exp-resultado-texto');
    const situacaoVal = document.getElementById('public-exp-situacao-val');
    
    if (count < selects.length) {
        resTextoEl.textContent = 'Preencha todos os campos';
        resTextoEl.style.color = '#94a3b8';
        situacaoVal.value = '';
    } else {
        if (media >= 3) {
            resTextoEl.textContent = 'APROVADO';
            resTextoEl.style.color = '#059669';
            situacaoVal.value = 'Aprovado';
        } else {
            resTextoEl.textContent = 'REPROVADO';
            resTextoEl.style.color = '#dc2626';
            situacaoVal.value = 'Reprovado';
        }
    }
};

window.submitPublicExpForm = async function(e, token) {
    e.preventDefault();
    const frm = e.target;
    
    const selects = frm.querySelectorAll('select[name^="req_"]');
    for (let i = 0; i < selects.length; i++) {
        if (!selects[i].value) { alert("Por favor, preencha todas as notas."); return; }
    }
    
    window.calcPublicExpScore();
    
    const fData = new FormData(frm);
    const payload = {
        respostas: {},
        pontuacao: parseFloat(fData.get('pontuacao')),
        situacao_avaliacao: fData.get('situacao_avaliacao'),
        comentarios: fData.get('comentarios') || ''
    };
    
    selects.forEach(sel => { payload.respostas[sel.name] = sel.value; });
    
    try {
        const btn = frm.querySelector('button[type="submit"]');
        if(btn) { btn.disabled = true; btn.innerHTML = 'Enviando...'; }
        
        const res = await fetch(`/api/experiencia/publico/submit?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const ans = await res.json();
        
        if (res.ok) {
            document.getElementById('public-exp-content').innerHTML = `
                <div style="text-align:center; padding: 2rem;">
                    <i class="ph ph-check-circle" style="font-size:4rem; color:#059669;"></i>
                    <h3 style="margin-top:1rem; color:#1e40af;">Avaliação Preenchida com Sucesso!</h3>
                    <p style="color:#64748b; margin-top:0.5rem;">Responsável: <b>${ans.responsavel_nome || 'Liderança'}</b></p>
                    <p style="color:#64748b;">Colaborador: <b>${ans.colaborador_nome}</b></p>
                    <div style="margin-top:2rem; color:#94a3b8; font-size:0.9rem;">
                        Você pode fechar esta aba agora.
                    </div>
                </div>
            `;
        } else {
            alert("Erro: " + (ans.error || 'Tente novamente.'));
            if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-square-offset"></i> Enviar Avaliação'; }
        }
    } catch(err) {
        console.error(err);
        alert("Erro de conexão.");
    }
};
