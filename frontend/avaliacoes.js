const AVALIACAO_QUESTIONS = {
    satisfacao: {
        motorista: {
            'Ambiente de trabalho': [
                'Como você avalia seu ambiente de trabalho no dia a dia?',
                'Você se sente respeitado pelos colegas e líderes?',
                'A comunicação entre você e sua liderança é clara e eficiente?',
                'O ambiente físico (pátio, base, locais de apoio) está adequado e limpo?'
            ],
            'Condições de trabalho e equipamentos': [
                'Os veículos fornecidos estão em boas condições?',
                'Você tem os EPIs necessários para realizar seu trabalho com segurança?',
                'Os veículos são consertados com agilidade após reportes de problemas?',
                'A estrutura e lavadoras para realizar a lavagem dos banheiros é eficiente?'
            ],
            'Rotina e Carga de Trabalho': [
                'As rotas estão bem planejadas e equilibradas?',
                'O volume de trabalho diário está dentro do que você considera justo?',
                'Você sente que as informações do dia a dia são comunicadas de forma clara e no tempo certo?',
                'As informações são passadas com antecedência?'
            ],
            'Processos e Organização': [
                'Os horários de saída e chegada estão sendo respeitados?',
                'O uso do APP para ordens de serviço facilita seu trabalho?',
                'Você entende claramente o que precisa ser feito em cada cliente?',
                'Como você avalia o relacionamento da equipe durante as rotas e no pátio?'
            ],
            'Treinamentos e Desenvolvimento': [
                'Os treinamentos recebidos são suficientes para garantir qualidade e segurança nas atividades?',
                'Você tem interesse em aprender algo novo na empresa?',
                'Você sente necessidade de reciclagem sobre sua função?',
                'Você se sente apoiado para melhorar seu desempenho?'
            ],
            'Satisfação e Motivação': [
                'Você está satisfeito em trabalhar na América Rental?',
                'O ambiente e as condições de trabalho te motivam a continuar?',
                'Você sente que algo prejudica sua motivação?',
                'Qual nota você daria para sua experiência aqui na América Rental?'
            ],
            'Valorização e Reconhecimento': [
                'Você sente que seu trabalho é reconhecido pela liderança?',
                'A empresa valoriza seus esforços no dia a dia?',
                'Você acredita que há reconhecimento quando você se destaca ou faz algo além do esperado?',
                'Você se sente respeitado como profissional aqui na América Rental?'
            ],
            'Crescimento e Oportunidades': [
                'Você enxerga oportunidades de crescimento dentro da empresa?',
                'Você sente que há espaço para ser promovido ou assumir novas responsabilidades?',
                'Você já recebeu algum feedback sobre seu desempenho e possibility de evolução?',
                'A empresa incentiva o desenvolvimento dos colaboradores com treinamentos ou novas funções?'
            ],
            'Liderança Supervisor Pátio (Joca)': [
                'A comunicação com o supervisor do pátio é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao supervisor do pátio?',
                'O supervisor do pátio demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido do supervisor do pátio?'
            ],
            'Liderança Gerente (Jefferson)': [
                'A comunicação com o gerente é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao gerente?',
                'O gerente demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido do Gerente?'
            ],
            'Liderança Supervisor Escritório (Edson)': [
                'A comunicação com o supervisor do escritório é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao supervisor do escritório?',
                'O supervisor do escritório demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido do supervisor do escritório?'
            ]
        },
        manutencao: {
            'Ambiente de trabalho': [
                'Como você avalia seu ambiente de trabalho no dia a dia?',
                'Você se sente respeitado pelos colegas e líderes?',
                'A comunicação entre você e sua liderança é clara e eficiente?',
                'O ambiente físico (pátio, base, cozinha e locais de apoio) está adequado e limpo?'
            ],
            'Condições de trabalho e equipamentos': [
                'As ferramentas e equipamentos fornecidos estão em boas condições?',
                'Você tem os EPIs necessários para realizar seu trabalho com segurança?',
                'Os equipamentos e ferramentas são consertados com agilidade após reportes de problemas?',
                'A estrutura das oficinas são completas e em boas condições?'
            ],
            'Rotina e Carga de Trabalho': [
                'As rotas estão bem planejadas e equilibradas?',
                'O volume de trabalho diário está dentro do que você considera justo?',
                'Você sente que as informações do dia a dia são comunicadas de forma clara e no tempo certo?',
                'Como você considera a frequência de horas extras que é feita para cumprir a demanda de trabalho?'
            ],
            'Processos e Organização': [
                'Os horários de saída e chegada estão sendo respeitados?',
                'Existe clareza sobre os prazos esperados para cada tipo de reparo?',
                'Você entende claramente o que precisa ser feito em cada novo serviço?',
                'Como você avalia o relacionamento da equipe de manutenção?'
            ],
            'Treinamentos e Desenvolvimento': [
                'Os treinamentos recebidos são suficientes para garantir qualidade e segurança nas atividades?',
                'Você tem interesse em aprender algo novo na empresa?',
                'Você sente necessidade de reciclagem sobre sua função?',
                'Você se sente apoiado para melhorar seu desempenho?'
            ],
            'Satisfação e Motivação': [
                'Como você avalia seu nível de satisfação trabalhando na empresa atualmente?',
                'Você se sente valorizado pelo trabalho que realiza no dia a dia?',
                'Como você avalia o equilíbrio entre sua vida pessoal e profissional?',
                'Você acredita que há reconhecimento quando você se destaca ou faz algo além do esperado?'
            ],
            'Crescimento e Oportunidades': [
                'Você enxerga oportunidades de crescimento dentro da empresa?',
                'Você sente que há espaço para ser promovido ou assumir novas responsabilidades?',
                'Você já recebeu algum feedback sobre seu desempenho e possibilidade de evolução?',
                'A empresa incentiva o desenvolvimento dos colaboradores com treinamentos ou novas funções?'
            ],
            'Liderança Supervisor Pátio (Joca)': [
                'A comunicação com o supervisor do pátio é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao supervisor do pátio?',
                'O supervisor do pátio demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido do supervisor do pátio?'
            ],
            'Liderança Supervisora (Thais)': [
                'A comunicação com a supervisora é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas a supervisora?',
                'A supervisora demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido da supervisora?'
            ],
            'Liderança Gerente (Jefferson)': [
                'A comunicação com o gerente é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao gerente?',
                'O gerente demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido do Gerente?'
            ]
        },
        escritorio: {
            'Ambiente de trabalho': [
                'Como você avalia o ambiente de trabalho no escritório?',
                'Você se sente respeitado(a) pelos colegas e pela liderança?',
                'O ambiente físico (pátio, base, cozinha e locais de apoio) está adequado e limpo?',
                'O clima organizacional é positivo e colaborativo?'
            ],
            'Condições de Trabalho e Ferramentas': [
                'Os equipamentos (computador, internet, sistemas etc.) estão em boas condições?',
                'Você tem acesso às ferramentas necessárias para realizar seu trabalho?',
                'Quando há problemas técnicos, o suporte é rápido e eficiente?',
                'As ferramentas utilizadas facilitam ou agilizam suas tarefas?'
            ],
            'Organização e Rotina de Trabalho': [
                'A carga de trabalho está dentro do que você considera justo?',
                'As tarefas diárias são bem organizadas e distribuídas?',
                'Você consegue manter uma boa rotina de trabalho sem sobrecarga?',
                'As suas atividades são claras e dentro da sua função?'
            ],
            'Comunicação e Liderança': [
                'A comunicação com a liderança é clara e objetiva?',
                'Você sente que pode dar sugestões e ser ouvido(a)?',
                'A liderança acompanha e dá suporte ao seu trabalho?',
                'Você recebe feedbacks sobre sua performance com regularidade?'
            ],
            'Crescimento e Desenvolvimento': [
                'Você sente que a empresa oferece oportunidades de crescimento?',
                'Há incentivos para aprendizado e desenvolvimento profissional?',
                'Você já recebeu algum feedback sobre seu potencial de evolução?',
                'Você se sente estimulado(a) a buscar novos desafios aqui dentro?'
            ],
            'Satisfação e Motivação': [
                'Como você avalia seu nível de satisfação trabalhando na empresa atualmente?',
                'Você se sente valorizado pelo trabalho que realiza no dia a dia?',
                'Como você avalia o equilíbrio entre sua vida pessoal e profissional?',
                'Você acredita que há reconhecimento quando você se destaca ou faz algo além do esperado?'
            ],
            'Clareza de Papéis e Responsabilidades': [
                'Você entende claramente quais são suas responsabilidades?',
                'As tarefas atribuídas a você fazem sentido dentro da sua função?',
                'Você sabe a quem recorrer quando tem dúvidas sobre suas atribuições?',
                'Há alinhamento entre o que te pedem e o que você executa no dia a dia?'
            ],
            'Processos e Fluxo de Trabalho': [
                'Os processos internos estão bem definidos?',
                'As demandas urgentes são tratadas com organização e prioridade?',
                'O fluxo entre departamentos é eficiente e colaborativo?',
                'Existe padronização nas rotinas e procedimentos?'
            ],
            'Colaboração em Equipe': [
                'A equipe trabalha de forma colaborativa e com espírito de equipe?',
                'Você se sente parte do time nas decisões e planejamentos?',
                'Há apoio entre os colegas para resolver problemas do dia a dia?',
                'Você sente que pode contar com a equipe quando precisa?'
            ],
            'Liderança Supervisor Direto': [
                'A comunicação com o supervisor é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao supervisor?',
                'O supervisor demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido do supervisor?'
            ]
        }
    },
    desempenho: {
        geral: {
            'Liderança': [
                'Assume a responsabilidade por suas tarefas e decisões?',
                'Motiva e influencia positivamente os colegas de equipe?',
                'Quando precisa resolver problemas sem orientações reage bem?',
                'Demonstra capacidade de liderança ao assumir iniciativas ou coordenar atividades?'
            ],
            'Assiduidade': [
                'Cumpre sua jornada de trabalho sem atrasos ou faltas frequentes?',
                'Avisa com antecedência quando precisa se ausentar?',
                'Demonstra comprometimento em manter regularidade na presença, mesmo em situações adversas?',
                'Respeita os horários de entrada, saída e intervalos?'
            ],
            'Flexibilidade': [
                'Se adapta facilmente a mudanças inesperadas no fluxo de trabalho?',
                'Reage bem a alterações de última hora em prazos ou procedimentos?',
                'Está disposto a aprender novas funções ou ferramentas quando necessário?',
                'Mantém uma postura positiva diante de desafios e imprevistos?'
            ],
            'Disponibilidade': [
                'Está disposto a colaborar além das suas funções quando necessário?',
                'Demonstra interesse em assumir novas responsabilidades?',
                'Lida bem com situações que exigem maior dedicação ou tempo extra?',
                'Demonstra abertura para ajudar os colegas quando solicitado?'
            ],
            'Integração': [
                'Participa ativamente de reuniões e atividades em equipe?',
                'Se comunica de forma clara e respeitosa com os demais membros da equipe?',
                'Contribui para um ambiente de trabalho harmonioso?',
                'Demonstra bom relacionamento com outros colaboradores?'
            ],
            'Colaboração': [
                'Compartilha conhecimento e experiências com a equipe?',
                'Demonstra interesse em ajudar colegas quando necessário?',
                'Trabalha bem em grupo e valoriza o trabalho coletivo?',
                'Respeita e considera opiniões diferentes ao tomar decisões?'
            ],
            'Organização': [
                'Mantém seu ambiente de trabalho organizado?',
                'Cumpre prazos e planeja suas atividades de forma eficiente?',
                'Prioriza corretamente as tarefas mais urgentes e importantes?',
                'Gerencia bem seu tempo para evitar retrabalho e atrasos?'
            ],
            'Ética': [
                'Segue as regras e normas da empresa de maneira consistente?',
                'Mantém uma postura profissional em todas as interações?',
                'Lida com informações confidenciais de forma responsável?',
                'Age com transparência e honestidade no trabalho?'
            ],
            'Produtividade': [
                'Cumpre suas tarefas dentro dos prazos estabelecidos?',
                'Mantém um ritmo de trabalho constante e eficiente?',
                'Lida bem com pressão sem comprometer o desempenho?',
                'O volume de trabalho que ele entrega atende às expectativas da empresa?'
            ],
            'Qualidade': [
                'Entrega suas tarefas com precisão e atenção aos detalhes?',
                'Segue os padrões e procedimentos para garantir a qualidade do serviço?',
                'Demonstra preocupação em melhorar continuamente seu desempenho?',
                'O trabalho dele atende às expectativas e padrões da empresa?'
            ],
            'Aptidão Técnica': [
                'Possui as habilidades técnicas necessárias para desempenhar sua função?',
                'Busca atualização e desenvolvimento profissional constantemente?',
                'Aplica corretamente seus conhecimentos na execução das atividades?',
                'Busca aprender novas ferramentas e metodologias para aprimorar seu trabalho?'
            ]
        },
        lideranca: {
            'Gestão de Equipe': [
                'Consegue organizar e distribuir as tarefas de forma eficiente?',
                'Sabe mediar conflitos entre os membros da equipe e buscar soluções?',
                'Acompanha de perto o desempenho e as dificuldades dos colaboradores?',
                'Incentiva a participação e considera as opiniões da equipe?'
            ],
            'Comunicação': [
                'Comunica de forma clara as metas e expectativas para a equipe?',
                'Presta atenção ao que a equipe tem a dizer durante reuniões?',
                'Transmite feedbacks de forma construtiva e no momento certo?',
                'Garante que as informações importantes cheguem a todos sem ruídos?'
            ],
            'Tomada de Decisão': [
                'Analisa bem os fatos antes de tomar uma decisão importante?',
                'Assume a responsabilidade pelas decisões tomadas?',
                'Age com rapidez em situações de crise ou urgência?',
                'Busca soluções inovadoras para problemas recorrentes?'
            ],
            'Desenvolvimento de Pessoas': [
                'Incentiva a capacitação e o treinamento da equipe?',
                'Identifica e valoriza talentos dentro da sua equipe?',
                'Oferece oportunidades para que os colaboradores assumam novas responsabilidades?',
                'É um exemplo de profissionalismo a ser seguido?'
            ],
            'Resultados e Foco': [
                'Mantém a equipe engajada no alcance das metas do setor?',
                'Avalia e ajusta as rotinas quando a equipe não atinge os resultados esperados?',
                'Otimiza os recursos disponíveis para garantir eficiência?',
                'Prioriza as atividades que trazem maior impacto para a empresa?'
            ]
        }
    },
    experiencia: {
        motorista: {
            'Disciplina e Cumprimento de Rotina': [
                'O colaborador evita faltas não justificadas.',
                'O colaborador mantém baixo número de faltas justificadas.',
                'O colaborador comunica qualquer falta ou atraso com antecedência.',
                'O colaborador sai pontualmente para a rota no horário programado.',
                'O colaborador realiza os atendimentos da rota com agilidade e bom ritmo.',
                'O colaborador é comprometido e flexível para realizar escalas extras quando solicitado.'
            ],
            'Condução e Cuidado com o Veículo': [
                'O colaborador dirige de forma segura e defensiva.',
                'O colaborador respeita as regras de trânsito, evitando multas e advertências.',
                'O colaborador mantém controle adequado de velocidade durante a condução.',
                'O colaborador demonstra cuidado geral com o veículo durante o uso diário.',
                'O colaborador evita frenagens bruscas e condução agressiva.',
                'O colaborador mantém atenção durante a direção, evitando distrações.'
            ],
            'Operação e Serviço': [
                'O colaborador realiza corretamente a sucção de dejetos, seguindo o padrão da empresa.',
                'O colaborador mantém a integridade da carga/resíduo durante a operação.',
                'O colaborador demonstra atenção e cuidado com a segurança no manuseio de resíduos.',
                'O colaborador mantém organização e limpeza do local após finalizar a operação.',
                'O colaborador mantém postura profissional no manuseio de dejetos, sem demonstrar nojo.',
                'O colaborador utiliza corretamente os EPIs obrigatórios durante as operações.'
            ],
            'Processos, Controles e Documentos': [
                'O colaborador demonstra facilidade na utilização das ferramentas e sistemas.',
                'O colaborador preenche corretamente o checklist do veículo.',
                'O colaborador tira fotos corretamente no sistema SimpliRoute.',
                'O colaborador liga para a logística e reporta corretamente antes de dar falha no sistema.',
                'O colaborador responde as mensagens e ligações de forma ágil e direta.',
                'O colaborador se atenta ao resumo da rota antes de sua saída de manhã.'
            ],
            'Comportamento e Relacionamento': [
                'O colaborador mantem comunicação cordial com a logística.',
                'O colaborador mantem comunicação cordial com a liderança.',
                'O colaborador apresenta bom relacionamento com o ajudante direto.',
                'O colaborador tem bom relacionamento com a equipe em geral.',
                'O colaborador respeita a hierarquia.',
                'O colaborador tem bom comportamento em confraternizações e reuniões.'
            ]
        },
        ajudante: {
            'Disciplina e Cumprimento de Rotina': [
                'O colaborador evita faltas não justificadas.',
                'O colaborador mantém baixo número de faltas justificadas.',
                'O colaborador comunica qualquer falta ou atraso com antecedência.',
                'O colaborador sai pontualmente para a rota no horário programado.',
                'O colaborador realiza os atendimentos da rota com agilidade e bom ritmo.',
                'O colaborador é comprometido e flexível para realizar escalas extras quando solicitado.'
            ],
            'Condução e Cuidado com o Veículo': [
                'O colaborador dirige de forma segura e defensiva.',
                'O colaborador respeita as regras de trânsito, evitando multas e advertências.',
                'O colaborador mantém controle adequado de velocidade durante a condução.',
                'O colaborador demonstra cuidado geral com o veículo durante o uso diário.',
                'O colaborador evita frenagens bruscas e condução agressiva.',
                'O colaborador mantém atenção durante a direção, evitando distrações.'
            ],
            'Operação e Serviço': [
                'O colaborador realiza corretamente a sucção de dejetos, seguindo o padrão da empresa.',
                'O colaborador mantém a integridade da carga/resíduo durante a operação.',
                'O colaborador demonstra atenção e cuidado com a segurança no manuseio de resíduos.',
                'O colaborador mantém organização e limpeza do local após finalizar a operação.',
                'O colaborador mantém postura profissional no manuseio de dejetos, sem demonstrar nojo.',
                'O colaborador utiliza corretamente os EPIs obrigatórios durante as operações.'
            ],
            'Processos, Controles e Documentos': [
                'O colaborador demonstra facilidade na utilização das ferramentas e sistemas.',
                'O colaborador preenche corretamente o checklist do veículo.',
                'O colaborador tira fotos corretamente no sistema SimpliRoute.',
                'O colaborador liga para a logística e reporta corretamente antes de dar falha no sistema.',
                'O colaborador responde as mensagens e ligações de forma ágil e direta.',
                'O colaborador se atenta ao resumo da rota antes de sua saída de manhã.'
            ],
            'Comportamento e Relacionamento': [
                'O colaborador mantem comunicação cordial com a logística.',
                'O colaborador mantem comunicação cordial com a liderança.',
                'O colaborador apresenta bom relacionamento com o ajudante direto.',
                'O colaborador tem bom relacionamento com a equipe em geral.',
                'O colaborador respeita a hierarquia.',
                'O colaborador tem bom comportamento em confraternizações e reuniões.'
            ]
        }
    }
};

let chartDonut = null;
let chartBar = null;

window.renderAvaliacaoTab = async function(container) {
    if (!viewedColaborador) return;
    const colabId = viewedColaborador.id;
    const dept = viewedColaborador.departamento || viewedColaborador.cargo || '';

    // Identificar qual grupo usar para satisfação e desempenho (auto-detectado pelo departamento)
    let defaultSatisfacao = 'escritorio';
    let defaultDesempenho = 'geral';
    let defaultExperiencia = 'motorista';
    const dLower = dept.toLowerCase();
    if (dLower.includes('motorista') || dLower.includes('ajudante')) { defaultSatisfacao = 'motorista'; defaultExperiencia = dLower.includes('ajudante') ? 'ajudante' : 'motorista'; }
    else if (dLower.includes('manuten')) defaultSatisfacao = 'manutencao';
    if (dLower.includes('lideran') || dLower.includes('líder') || dLower.includes('lider')) defaultDesempenho = 'lideranca';

    // Montar lista de grupos disponíveis por tipo
    const groupOptionsSatisfacao = Object.keys(AVALIACAO_QUESTIONS.satisfacao);
    const groupOptionsDesempenho = Object.keys(AVALIACAO_QUESTIONS.desempenho);
    const groupOptionsExperiencia = Object.keys(AVALIACAO_QUESTIONS.experiencia || {});

    // Persistência de tipo, ano e grupo
    if (!window.tabPersistence) window.tabPersistence = {};
    const currentYear = new Date().getFullYear();
    const dataAdmissao = viewedColaborador.data_admissao ? new Date(viewedColaborador.data_admissao).getFullYear() : currentYear;
    const anos = [];
    for (let y = dataAdmissao; y <= currentYear; y++) anos.push(y);
    if (!anos.includes(currentYear)) anos.push(currentYear);

    let selectedYear = window.tabPersistence['av-year-select'] ? parseInt(window.tabPersistence['av-year-select']) : currentYear;
    let selectedTipo = window.tabPersistence['av-tipo-select'] || 'desempenho';

    // Grupo persistido ou padrão pelo departamento
    const pkSat = `av-group-satisfacao-${colabId}`;
    const pkDes = `av-group-desempenho-${colabId}`;
    const pkExp = `av-group-experiencia-${colabId}`;
    if (!window.tabPersistence[pkSat]) window.tabPersistence[pkSat] = defaultSatisfacao;
    if (!window.tabPersistence[pkDes]) window.tabPersistence[pkDes] = defaultDesempenho;
    if (!window.tabPersistence[pkExp]) window.tabPersistence[pkExp] = defaultExperiencia;

    let groupKey = selectedTipo === 'satisfacao' ? window.tabPersistence[pkSat] 
                 : (selectedTipo === 'experiencia' ? window.tabPersistence[pkExp] : window.tabPersistence[pkDes]);

    // Garantir que o groupKey existe em AVALIACAO_QUESTIONS
    const safeGroupKey = (AVALIACAO_QUESTIONS[selectedTipo] && AVALIACAO_QUESTIONS[selectedTipo][groupKey]) ? groupKey
        : (selectedTipo === 'satisfacao' ? defaultSatisfacao : (selectedTipo === 'experiencia' ? defaultExperiencia : defaultDesempenho));

    const questions = AVALIACAO_QUESTIONS[selectedTipo][safeGroupKey];
    const categories = Object.keys(questions);

    container.innerHTML = '<p style="color:#64748b; padding:1rem;">Carregando avaliações...</p>';

    // Fetch avaliacoes
    const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`).catch(() => []);
    
    const renderDashboard = (year, tipo) => {
        // Filtrar do ano atual E do tipo atual
        const avYear = avaliacoes.filter(a => Number(a.ano) === Number(year) && a.tipo === tipo);
        
        const trimestersData = { 1: {}, 2: {}, 3: {}, 4: {} };
        const trimestersOverall = { 1: null, 2: null, 3: null, 4: null };

        avYear.forEach(av => {
            const res = JSON.parse(av.respostas_json);
            let totalSum = 0; let totalCount = 0;
            categories.forEach(cat => {
                const catAnswers = res[cat] || {};
                let sum = 0; let count = 0;
                Object.values(catAnswers).forEach(val => {
                    const n = parseFloat(val);
                    if (!isNaN(n)) { sum += n; count++; }
                });
                const metric = tipo === 'experiencia' ? sum : (count > 0 ? (sum / count) : null);
                trimestersData[av.trimestre][cat] = metric;
                if (metric !== null) { totalSum += metric; totalCount++; }
            });
            trimestersOverall[av.trimestre] = tipo === 'experiencia' ? totalSum : (totalCount > 0 ? (totalSum / totalCount) : null);
        });

        // Trimestre Mappings for UI
        const trimestreToMonth = {
            1: 'Janeiro (1º Trim.)',
            2: 'Abril (2º Trim.)',
            3: 'Julho (3º Trim.)',
            4: 'Dezembro (4º Trim.)'
        };

        // Action Steps
        let actionsHtml = `<div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">`;
        const dateRightNow = new Date();
        const anoAtual = dateRightNow.getFullYear();
        const mesAtual = dateRightNow.getMonth() + 1; // 1 a 12

        const maxTrim = tipo === 'experiencia' ? 1 : 4;
        for (let t=1; t<=maxTrim; t++) {
            // Todos os trimestres ficam liberados para preenchimento a pedido do usuário
            const hasData = trimestersOverall[t] !== null;

            let perc = 0;
            let avId = null;
            if (hasData) {
                const av = avYear.find(a=>a.trimestre===t);
                avId = av.id;
                const res = JSON.parse(av.respostas_json);
                let totalQ = 0, ansQ = 0;
                categories.forEach(cat => {
                    totalQ += questions[cat].length;
                    if (res[cat]) Object.values(res[cat]).forEach(v => { if (v) ansQ++; });
                });
                perc = totalQ > 0 ? Math.round((ansQ/totalQ)*100) : 0;
            }
            
            const isFull = perc === 100;

            actionsHtml += `
                <div style="flex:1; min-width:200px; background:#fff; border:1px solid ${hasData?'#0ea5e9':'#cbd5e1'}; border-radius:8px; padding:1.2rem; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.05); position:relative;">
                    ${perc > 0 ? `<div style="position:absolute; top:-10px; right:-10px; background:${isFull?'#16a34a':'#f59e0b'}; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.2); font-size:0.7rem; font-weight:700;">${perc}%</div>` : ''}
                    <h6 style="margin:0 0 0.3rem; color:#0f4c81; font-size:0.75rem; text-transform:uppercase; opacity:0.8;">${tipo==='desempenho'?'Avaliação de Desempenho':(tipo==='experiencia'?'Avaliação de Experiência':'Avaliação de Satisfação')}</h6>
                    <h5 style="margin:0 0 0.5rem; color:#334155;">${tipo==='experiencia' ? 'Realizar Avaliação' : trimestreToMonth[t]}</h5>
                    ${hasData ? `<p style="font-size:1.5rem; font-weight:800; color:#16a34a; margin:0 0 1rem;">${tipo==='experiencia' ? Math.round(trimestersOverall[t]) : trimestersOverall[t].toFixed(1)} <sub style="font-size:0.7rem;color:#64748b;">${tipo==='experiencia'?'Soma Total':'Média'}</sub></p>` : `<p style="font-size:0.85rem; color:#94a3b8; margin:0 0 1rem;">Disponível para Preenchimento</p>`}
                    <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
                        <button onclick="openFormAvaliacao('${tipo}', ${year}, ${t}, '${safeGroupKey}')" style="background:${isFull?'#0f4c81':'#0ea5e9'}; color:#fff; border:none; padding:0.4rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.8rem; flex:1;">
                            <i class="ph ph-note-pencil"></i> ${hasData ? (isFull ? 'Editar' : 'Continuar') : 'Preencher'}
                        </button>
                        ${isFull ? `<button onclick="viewAvaliacaoPDF('${tipo}', ${year}, ${t}, '${groupKey}')" style="background:#10b981; color:#fff; border:none; padding:0.4rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center;" title="Visualizar Avaliação em PDF">
                            <i class="ph ph-eye"></i>
                        </button>` : ''}
                        ${hasData ? `<button onclick="deleteAvaliacao(${avId})" style="background:#ef4444; color:#fff; border:none; padding:0.4rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center;" title="Excluir Avaliação Definitivamente">
                            <i class="ph ph-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            `;
        }
        
        // Se após o loop não houver quadros a mostrar (ex: ano futuro), adiciona mensagem
        if (actionsHtml === `<div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">`) {
            actionsHtml += `<div style="flex:1; padding:2rem; text-align:center; color:#64748b; font-size:0.9rem; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">Nenhuma avaliação liberada para este ano até o momento. Aguarde o mês correspondente.</div>`;
        }
        
        actionsHtml += `</div>`;

        // Renderizar a tela de fato
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap:wrap; gap:1rem;">
                
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <!-- Tipo de Avaliacao -->
                    <div style="display:flex; align-items:center; gap:0.5rem; background:#fff; padding:0.3rem; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05); flex-wrap:wrap;">
                        <button onclick="window.tabPersistence['av-tipo-select']='desempenho'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'desempenho' ? 'background:#0ea5e9; color:#fff; box-shadow:0 2px 4px rgba(14,165,233,0.3);' : 'background:transparent; color:#64748b;'}">
                            <i class="ph ph-trend-up" style="font-size:1.2rem;"></i> Desempenho
                        </button>
                        <button onclick="window.tabPersistence['av-tipo-select']='satisfacao'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'satisfacao' ? 'background:#8b5cf6; color:#fff; box-shadow:0 2px 4px rgba(139,92,246,0.3);' : 'background:transparent; color:#64748b;'}">
                            <i class="ph ph-smiley" style="font-size:1.2rem;"></i> Satisfação
                        </button>
                        <button onclick="window.tabPersistence['av-tipo-select']='experiencia'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'experiencia' ? 'background:#f59e0b; color:#fff; box-shadow:0 2px 4px rgba(245,158,11,0.3);' : 'background:transparent; color:#64748b;'}">
                            <i class="ph ph-medal" style="font-size:1.2rem;"></i> Experiência
                        </button>
                    </div>
                    <!-- Departamento / Grupo de perguntas - REMOVIDO CONFORME SOLICITACAO -->
                    <div style="display:none; align-items:center; gap:0.6rem;">
                        <i class="ph ph-buildings" style="color:#0f4c81; font-size:1.1rem;"></i>
                        <label style="font-size:0.85rem; font-weight:700; color:#0f4c81; white-space:nowrap;">Formulário para:</label>
                        <select onchange="window.tabPersistence['${tipo === 'satisfacao' ? pkSat : (tipo === 'experiencia' ? pkExp : pkDes)}']=this.value; renderAvaliacaoTab(document.getElementById('docs-list-container'));" style="padding:0.4rem 0.75rem; border-radius:6px; border:1.5px solid #0f4c81; font-weight:600; background:#eff6ff; color:#0f4c81; cursor:pointer; font-size:0.88rem;">
                            ${(tipo === 'satisfacao' ? groupOptionsSatisfacao : (tipo === 'experiencia' ? groupOptionsExperiencia : groupOptionsDesempenho)).map(g => `<option value="${g}" ${g === safeGroupKey ? 'selected':''}>${g.charAt(0).toUpperCase()+g.slice(1).replace(/_/g,' ')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <label style="font-size:0.9rem; font-weight:600; color:#475569;">Ano Base:</label>
                    <select id="av-year-select" style="padding:0.5rem; border-radius:6px; border:1px solid #cbd5e1; font-weight:600; background:#fff; color:#334155; cursor:pointer;" onchange="window.tabPersistence['av-year-select']=this.value; renderAvaliacaoTab(document.getElementById('docs-list-container'));">
                        ${anos.map(y => `<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Charts Container -->
            <div style="display:flex; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
                <div style="flex:${tipo === 'experiencia' ? 'none; width:100%' : '1; min-width:300px'}; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <h5 style="margin:0 0 1rem; text-align:center; color:#334155; font-size:1.1rem;">${tipo === 'experiencia' ? 'Desempenho por Categoria' : 'Desempenho por Categoria Trimestral'}</h5>
                    <div style="position:relative; height:500px;"><canvas id="chart-competencias"></canvas></div>
                </div>
                ${tipo === 'experiencia' ? '' : `
                <div style="flex:1; min-width:300px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <h5 style="margin:0 0 1rem; text-align:center; color:#334155; font-size:1.1rem;">Evolução Trimestral Geral</h5>
                    <div style="position:relative; height:500px;"><canvas id="chart-medias"></canvas></div>
                </div>
                `}
            </div>

            ${actionsHtml}
        `;

        // Renderizar Charts (depois do innerHTML)
        setTimeout(() => {
            if (typeof Chart === 'undefined') return;
            
            const categoriesList = categories;
            const datasetsBar = [];
            const barColors = [
                { bg: 'rgba(14, 165, 233, 0.9)', border: '#0ea5e9' }, // 1º Trim: Azul
                { bg: 'rgba(168, 85, 247, 0.9)', border: '#a855f7' }, // 2º Trim: Roxo
                { bg: 'rgba(34, 197, 94, 0.9)', border: '#22c55e' }, // 3º Trim: Verde
                { bg: 'rgba(236, 72, 153, 0.9)', border: '#ec4899' }  // 4º Trim: Rosa
            ];
            const legendLabelsTrim = { 1: '1º Trimestre', 2: '2º Trimestre', 3: '3º Trimestre', 4: '4º Trimestre' };

            const maxDatasetTrim = tipo === 'experiencia' ? 1 : 4;
            const trimsArray = Array.from({length: maxDatasetTrim}, (_, i) => i + 1);

            trimsArray.forEach(t => {
                const dataPoints = categories.map(cat => trimestersData[t][cat] ? parseFloat(trimestersData[t][cat].toFixed(2)) : null);
                datasetsBar.push({
                    label: tipo === 'experiencia' ? 'Pontuação Oitda' : legendLabelsTrim[t],
                    data: dataPoints,
                    backgroundColor: barColors[t-1].bg,
                    borderColor: barColors[t-1].border,
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                });
            });

            if (chartDonut) chartDonut.destroy();
            const ctxDonut = document.getElementById('chart-competencias')?.getContext('2d');
            if (ctxDonut) {
                // Formatação multi-linhas (split em duas partes se >2 palavras)
                const formattedLabels = categoriesList.map(c => {
                    const words = c.trim().split(/\s+/);
                    if (words.length > 2) {
                        const mid = Math.ceil(words.length / 2);
                        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
                    }
                    return c;
                });

                chartDonut = new Chart(ctxDonut, {
                    type: 'bar',
                    data: {
                        labels: formattedLabels,
                        datasets: datasetsBar
                    },
                    options: { 
                        indexAxis: 'y', 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { 
                            x: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
                            y: { ticks: { font: { size: 10 } } }
                        },
                        plugins: { 
                            legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                            tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + (c.raw ? c.raw : '0'); } } }
                        } 
                    }
                });
            }

            if (chartBar) chartBar.destroy();
            const ctxBar = document.getElementById('chart-medias')?.getContext('2d');
            if (ctxBar) {
                // Gráfico 2: Evolução (Linha)
                chartBar = new Chart(ctxBar, {
                    type: 'line',
                    data: {
                        labels: [trimestreToMonth[1], trimestreToMonth[2], trimestreToMonth[3], trimestreToMonth[4]],
                        datasets: [{ 
                            label: 'Média Geral', 
                            data: [trimestersOverall[1], trimestersOverall[2], trimestersOverall[3], trimestersOverall[4]], 
                            borderColor: '#10b981', 
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            borderWidth: 3,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#10b981',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            fill: true,
                            tension: 0.4 // Linha suave
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } },
                        plugins: { 
                            legend: { display: false },
                            tooltip: { callbacks: { label: function(c) { return 'Nota: ' + (c.raw ? c.raw.toFixed(2) : '0'); } } }
                        }
                    }
                });
            }
        }, 100);
    };

    renderDashboard(selectedYear, selectedTipo);
};

window.openFormAvaliacao = async function(tipo, ano, trimestre, groupKey) {
    const colabId = viewedColaborador.id;
    const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`).catch(() => []);
    const existing = avaliacoes.find(a => Number(a.ano) === Number(ano) && Number(a.trimestre) === Number(trimestre) && a.tipo === tipo);
    let savedAnswers = {};
    if (existing) savedAnswers = JSON.parse(existing.respostas_json);

    const questions = AVALIACAO_QUESTIONS[tipo][groupKey];
    const categories = Object.keys(questions);
    
    const trimestreToMonth = {1: 'Janeiro (1º Trim.)', 2: 'Abril (2º Trim.)', 3: 'Julho (3º Trim.)', 4: 'Dezembro (4º Trim.)'};

    let html = `
        <div style="background:#fff; border-radius:12px; max-width:900px; width:95%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="padding:1.5rem; background:#0f4c81; color:#fff; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:1.25rem;">${tipo === 'desempenho' ? 'Avaliação de Desempenho' : 'Avaliação de Satisfação'} - ${trimestreToMonth[trimestre]} / ${ano}</h3>
                <button onclick="document.getElementById('modal-avaliacao').remove()" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:2rem; overflow-y:auto; flex:1; background:#f8fafc;">
                <p style="margin-top:0; margin-bottom:1.5rem; color:#0f4c81; font-size:1.05rem; font-weight:700; background:#e0f2fe; padding:12px 16px; border-radius:8px; border-left:5px solid #0ea5e9; box-shadow:0 2px 4px rgba(14,165,233,0.15);">
                    Avalie cada critério (1 Muito ruim - 2 Ruim - 3 Médio - 4 Bom - 5 Muito bom)
                </p>
                <form id="form-avaliacao-perguntas">
    `;

    categories.forEach((cat, catIdx) => {
        const totalQ = questions[cat].length;
        let ansQ = 0;
        if (savedAnswers[cat]) {
            Object.values(savedAnswers[cat]).forEach(v => { if (v) ansQ++; });
        }
        let perc = totalQ > 0 ? Math.round((ansQ/totalQ)*100) : 0;
        const completeColor = perc === 100 ? '#16a34a' : '#0ea5e9';

        html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:1.5rem; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="background:#f1f5f9; padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; color:#334155;">${catIdx+1}. ${cat}</span>
                    <div style="display:flex; align-items:center; gap:0.5rem; width:100px;">
                        <span style="font-size:0.75rem; font-weight:700; color:${completeColor};" id="perc-text-av${catIdx}">${perc}%</span>
                        <div style="flex:1; background:#cbd5e1; height:6px; border-radius:3px; overflow:hidden;">
                            <div id="perc-bar-av${catIdx}" style="width:${perc}%; height:100%; background:${completeColor}; transition:width 0.3s, background 0.3s;"></div>
                        </div>
                    </div>
                </div>
                <div style="padding:1rem;">
        `;
        questions[cat].forEach((q, i) => {
            const val = savedAnswers[cat] ? savedAnswers[cat][i] : null;
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px dashed #e2e8f0;">
                    <div style="flex:1; padding-right:1rem; font-size:0.9rem; color:#475569; font-weight:500;">${q}</div>
                    <div style="display:flex; gap:0.35rem;">
            `;
            for(let v=1; v<=5; v++) {
                const checked = (val == v) ? 'checked' : '';
                html += `
                    <label style="cursor:pointer; position:relative; margin:0;" title="Nota ${v}">
                        <input type="radio" name="av_${catIdx}_${i}" value="${v}" ${checked} style="position:absolute; opacity:0; pointer-events:none;" onchange="updateAvaliacaoProgress(${catIdx}, ${totalQ})">
                        <div class="radio-nota" style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:700; font-size:0.85rem; border:1px solid #cbd5e1; background: ${checked?'#0f4c81':'#fff'}; color: ${checked?'#fff':'#64748b'}; transition:all 0.15s;" 
                             onclick="this.parentElement.parentElement.querySelectorAll('.radio-nota').forEach(el=>{el.style.background='#fff'; el.style.color='#64748b'; el.style.borderColor='#cbd5e1'}); this.style.background='#0f4c81'; this.style.color='#fff'; this.style.borderColor='#0f4c81';">
                            ${v}
                        </div>
                    </label>
                `;
            }
            html += `</div></div>`;
        });
        html += `</div></div>`;
    });

    html += `
                </form>
            </div>
            <div style="padding:1.5rem; border-top:1px solid #e2e8f0; text-align:right; background:#fff; border-radius:0 0 12px 12px; display:flex; justify-content:space-between; align-items:center;">
                <span id="form-av-error" style="color:#e03131; font-size:0.85rem; font-weight:600;"></span>
                <div>
                    <button type="button" onclick="document.getElementById('modal-avaliacao').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="button" onclick="saveAvaliacao('${tipo}', ${ano}, ${trimestre}, '${groupKey}')" class="btn btn-primary" style="margin-left:0.5rem;"><i class="ph ph-check"></i> Salvar Respostas</button>
                </div>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.id = 'modal-avaliacao';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; box-sizing:border-box;';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
};

window.updateAvaliacaoProgress = function(catIdx, totalQ) {
    const form = document.getElementById('form-avaliacao-perguntas');
    let ansQ = 0;
    for (let i=0; i<totalQ; i++) {
        const rads = form.elements[`av_${catIdx}_${i}`];
        if (rads && Array.from(rads).find(r => r.checked)) ansQ++;
    }
    const perc = Math.round((ansQ/totalQ)*100);
    const textEl = document.getElementById(`perc-text-av${catIdx}`);
    const barEl = document.getElementById(`perc-bar-av${catIdx}`);
    if (textEl && barEl) {
        textEl.textContent = `${perc}%`;
        barEl.style.width = `${perc}%`;
        const color = perc === 100 ? '#16a34a' : '#0ea5e9';
        textEl.style.color = color;
        barEl.style.background = color;
    }
}

window.saveAvaliacao = async function(tipo, ano, trimestre, groupKey) {
    const categories = Object.keys(AVALIACAO_QUESTIONS[tipo][groupKey]);
    const form = document.getElementById('form-avaliacao-perguntas');
    const respostas = {};
    const errSpan = document.getElementById('form-av-error');
    
    let totalQ = 0;
    let ansQ = 0;

    categories.forEach((cat, catIdx) => {
        respostas[cat] = {};
        AVALIACAO_QUESTIONS[tipo][groupKey][cat].forEach((q, i) => {
            totalQ++;
            const rads = form.elements[`av_${catIdx}_${i}`];
            if (rads && rads.length) {
                const selected = Array.from(rads).find(r => r.checked);
                if (selected) {
                    respostas[cat][i] = selected.value;
                    ansQ++;
                }
            }
        });
    });

    const is100Percent = (totalQ > 0 && ansQ === totalQ);

    try {
        errSpan.textContent = 'Salvando...';
        await apiPost('/avaliacoes', { colaborador_id: viewedColaborador.id, tipo, ano, trimestre, respostas_json: JSON.stringify(respostas) });
        
        // Se estiver 100%, gera o PDF e salva
        if (is100Percent && typeof html2pdf !== 'undefined') {
            errSpan.textContent = 'Gerando PDF...';
            await generateAndUploadEvaluationPDF(viewedColaborador.id, viewedColaborador.nome_completo, tipo, ano, trimestre, groupKey, respostas);
        }

        const modal = document.getElementById('modal-avaliacao');
        if (modal) modal.remove();
        
        renderAvaliacaoTab(document.getElementById('docs-list-container'));
        alert('Avaliação do ' + trimestre + 'º trimestre salva!');
    } catch(e) {
        errSpan.textContent = '';
        alert('Erro ao salvar avaliação: ' + e.message);
    }
};

// ============================================================
// MOTOR DE PDF - usa jsPDF DIRETAMENTE (sem html2canvas)
// Solução definitiva: gera o PDF programaticamente, sem DOM
// ============================================================
async function buildAvaliacaoPDF(nome, tipo, ano, trimestre, groupKey, respostas) {
    // jsPDF está bundled no html2pdf.bundle.min.js como window.jspdf.jsPDF
    const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!JsPDF) throw new Error('jsPDF não encontrado. Verifique se html2pdf.bundle.min.js está carregado.');

    const doc = new JsPDF('p', 'mm', 'a4');
    const PW = 210; // largura A4 mm
    const PH = 297; // altura A4 mm
    const ML = 14;  // margem esquerda
    const MR = 14;  // margem direita
    const CW = PW - ML - MR; // largura do conteúdo
    let y = 12;

    // Cores
    const C_BLUE   = [15, 76, 129];
    const C_LBLUE  = [240, 247, 255];
    const C_GRAY   = [71, 85, 105];
    const C_LGRAY  = [248, 250, 252];
    const C_WHITE  = [255, 255, 255];
    const C_LINE   = [203, 213, 225];

    const checkPage = (needed) => {
        if (y + needed > PH - 12) { doc.addPage(); y = 12; }
    };

    // --- LOGO ---
    try {
        const resp = await fetch('/assets/logo-header.png');
        const blob = await resp.blob();
        const imgObj = await new Promise((res, rej) => {
            const r = new FileReader(); 
            r.onload = () => {
                const img = new Image();
                img.onload = () => res({ b64: r.result, w: img.width, h: img.height });
                img.onerror = rej;
                img.src = r.result;
            };
            r.onerror = rej;
            r.readAsDataURL(blob);
        });
        const ratio = imgObj.w / imgObj.h;
        const logoW = CW;
        const logoH = CW / ratio;
        doc.addImage(imgObj.b64, 'PNG', ML, y, logoW, logoH);
        y += logoH + 4;
    } catch(e) { y += 3; }

    // --- TÍTULO ---
    const tipoText = tipo === 'desempenho' ? 'Avaliação de Desempenho' : (tipo === 'experiencia' ? 'Avaliação de Experiência' : 'Avaliação de Satisfação');
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_BLUE);
    doc.text(tipoText, PW / 2, y, { align: 'center' });
    y += 6;

    // --- SUBTÍTULO ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_GRAY);
    doc.text(`Colaborador: ${nome}  |  Ano: ${ano}  |  ${trimestre}º Trimestre`, PW / 2, y, { align: 'center' });
    y += 4;

    // --- DIVISOR ---
    doc.setDrawColor(...C_LINE);
    doc.setLineWidth(0.4);
    doc.line(ML, y, PW - MR, y);
    y += 5;

    // --- CATEGORIAS ---
    const cats = Object.keys(AVALIACAO_QUESTIONS[tipo][groupKey]);
    let totalScore = 0, totalQs = 0;

    cats.forEach((cat, cIdx) => {
        const questions = AVALIACAO_QUESTIONS[tipo][groupKey][cat];
        let catTotal = 0, catCount = 0;

        const rows = questions.map((q, i) => {
            const nota = respostas[cat] ? respostas[cat][i] : null;
            if (nota) { catTotal += parseFloat(nota); catCount++; }
            return { q: q || '', nota: nota || '-' };
        });
        const catMetric = tipo === 'experiencia' ? catTotal : (catCount > 0 ? (catTotal / catCount).toFixed(2) : '0.00');
        totalScore += catTotal; totalQs += catCount;

        // Calcular altura necessária da categoria
        const rowHeight = 7.5;
        const catBlockH = 8 + rows.length * rowHeight;
        checkPage(catBlockH);

        // Cabeçalho da categoria
        doc.setFillColor(...C_LBLUE);
        doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, 'F');
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_BLUE);
        doc.text(`${cIdx + 1}. ${cat}`, ML + 3, y + 5.5);
        doc.text(`${tipo==='experiencia'?'Soma':'Média'}: ${catMetric}`, PW - MR - 3, y + 5.5, { align: 'right' });
        y += 9;

        // Linhas de perguntas
        rows.forEach(({ q, nota }, qi) => {
            checkPage(rowHeight + 2);

            // Fundo alternado
            if (qi % 2 === 0) {
                doc.setFillColor(...C_LGRAY);
                doc.rect(ML, y - 1, CW, rowHeight, 'F');
            }

            // Texto da pergunta (com quebra de linha automática)
            const maxQW = CW - 22;
            const lines = doc.splitTextToSize(q, maxQW);
            const rowH = Math.max(rowHeight, lines.length * 4 + 2);

            // Verificar quebra de página para linhas longas
            if (y + rowH > PH - 12) { doc.addPage(); y = 12; }

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C_GRAY);
            doc.text(lines, ML + 2, y + 4);

            // Nota alinhada à direita
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C_BLUE);
            doc.text(`Nota: ${nota}`, PW - MR - 2, y + 4, { align: 'right' });

            // Linha separadora sutil
            doc.setDrawColor(...C_LINE);
            doc.setLineWidth(0.15);
            doc.line(ML, y + rowH - 0.5, PW - MR, y + rowH - 0.5);

            y += rowH;
        });

        y += 3; // espaço entre categorias
    });

    // --- MÉDIA/SOMA TOTAL ---
    const overallMetric = tipo === 'experiencia' ? totalScore : (totalQs > 0 ? (totalScore / totalQs).toFixed(2) : '0.00');
    checkPage(14);
    doc.setFillColor(...C_BLUE);
    doc.roundedRect(ML, y, CW, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_WHITE);
    doc.text(`${tipo==='experiencia'?'Soma':'Média'} Total Alcançada: ${overallMetric}`, PW - MR - 5, y + 8, { align: 'right' });
    y += 16;

    // --- GRÁFICOS (nova página) ---
    const graph1Canvas = document.getElementById('chart-competencias');
    const graph2Canvas = document.getElementById('chart-medias');

    if (graph1Canvas || graph2Canvas) {
        doc.addPage();
        y = 12;

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_BLUE);
        doc.text('Análise Gráfica dos Resultados', PW / 2, y, { align: 'center' });
        y += 5;
        doc.setDrawColor(...C_LINE);
        doc.setLineWidth(0.4);
        doc.line(ML, y, PW - MR, y);
        y += 8;

        const addGraph = (canvas, label) => {
            if (!canvas) return;
            try {
                const imgData = canvas.toDataURL('image/png');
                const ratio = canvas.width / canvas.height;
                const maxW = CW;
                const maxH = 90;
                let imgW = maxW;
                let imgH = imgW / ratio;
                if (imgH > maxH) { imgH = maxH; imgW = imgH * ratio; }

                checkPage(imgH + 15);
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C_GRAY);
                doc.text(label, PW / 2, y, { align: 'center' });
                y += 5;

                doc.addImage(imgData, 'PNG', ML + (CW - imgW) / 2, y, imgW, imgH);
                y += imgH + 10;
            } catch(e) { console.warn('Gráfico não pôde ser inserido:', e); }
        };

        addGraph(graph1Canvas, 'Desempenho por Categoria');
        addGraph(graph2Canvas, 'Evolução Trimestral Geral');
    }

    return doc;
}

// ============================================================
// FUNÇÃO DE SALVAR (Upload automático)
// ============================================================
async function generateAndUploadEvaluationPDF(colabId, nome, tipo, ano, trimestre, groupKey, respostas) {
    const nomeFormated = tipo === 'desempenho' ? 'Avaliacao_de_Desempenho' : (tipo === 'experiencia' ? 'Avaliacao_de_Experiencia' : 'Avaliacao_de_Satisfacao');
    const safeNome = nome.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `${nomeFormated}_${trimestre}_${ano}_${safeNome.toUpperCase()}.pdf`;

    try {
        const doc = await buildAvaliacaoPDF(nome, tipo, ano, trimestre, groupKey, respostas);
        const pdfBlob = doc.output('blob');

        const formData = new FormData();
        formData.append('file', new File([pdfBlob], fileName, { type: 'application/pdf' }));
        formData.append('colaborador_id', colabId.toString());
        
        let docTypeStr = 'Avaliação de Desempenho';
        if (tipo === 'satisfacao') docTypeStr = 'Avaliação de Satisfação';
        else if (tipo === 'experiencia') docTypeStr = 'Avaliação de Experiência';
        formData.append('document_type', docTypeStr);
        
        formData.append('tab_name', 'AVALIACAO');
        formData.append('year', ano.toString());
        formData.append('month', trimestre.toString());

        const response = await fetch('/api/documentos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });
        if (!response.ok) throw new Error(`Falha no upload: ${response.statusText}`);
        console.log('PDF gerado e enviado com sucesso:', fileName);
    } catch(e) {
        console.error('Erro ao gerar PDF da Avaliação:', e);
    }
}

// ============================================================
// BOTÃO VISUALIZAR - Abre PDF para download/preview
// ============================================================
window.viewAvaliacaoPDF = async function(tipo, ano, trimestre, groupKey) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        alert('A biblioteca de PDF ainda não foi carregada. Aguarde e tente novamente.');
        return;
    }

    const colabId = viewedColaborador.id;
    const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`).catch(() => []);
    const av = avaliacoes.find(a => Number(a.ano) === Number(ano) && Number(a.trimestre) === Number(trimestre) && a.tipo === tipo);
    if (!av || !av.respostas_json) {
        alert('Respostas não encontradas no servidor para gerar a visualização.');
        return;
    }
    const respostas = JSON.parse(av.respostas_json);

    // Overlay de carregamento
    const overlay = document.createElement('div');
    overlay.id = 'pdf-preview-avaliacao-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="color:#fff;font-size:1.1rem;display:flex;flex-direction:column;align-items:center;gap:1rem;">
        <div style="width:40px;height:40px;border:4px solid #0ea5e9;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span style="font-weight:600;">Gerando PDF...</span>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(overlay);

    try {
        const nome = viewedColaborador.nome_completo;
        const safeNome = nome.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g, '');
        const nomeBase = tipo === 'desempenho' ? 'Avaliacao_de_Desempenho' : (tipo === 'experiencia' ? 'Avaliacao_de_Experiencia' : 'Avaliacao_de_Satisfacao');
        const fileName = `${nomeBase}_${trimestre}_${ano}_${safeNome.toUpperCase()}.pdf`;

        const doc = await buildAvaliacaoPDF(nome, tipo, ano, trimestre, groupKey, respostas);
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        overlay.style.justifyContent = 'flex-start';
        overlay.innerHTML = `
            <div style="width:100%;padding:14px 28px;background:#1e293b;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 10px rgba(0,0,0,0.5);flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-file-pdf" style="color:#0ea5e9;font-size:1.8rem;"></i>
                    <h3 style="margin:0;color:#fff;font-size:1rem;font-weight:600;">${fileName}</h3>
                </div>
                <div style="display:flex;gap:12px;align-items:center;">
                    <a href="${blobUrl}" download="${fileName}" style="background:#10b981;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:700;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:7px;font-size:0.9rem;">
                        <i class="ph ph-download-simple"></i> Baixar PDF
                    </a>
                    <button onclick="document.getElementById('pdf-preview-avaliacao-overlay').remove();URL.revokeObjectURL('${blobUrl}');" style="background:#ef4444;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;font-size:0.9rem;">
                        <i class="ph ph-x"></i> Fechar
                    </button>
                </div>
            </div>
            <div style="flex:1;width:100%;display:flex;justify-content:center;padding:20px;box-sizing:border-box;">
                <iframe src="${blobUrl}" style="width:100%;max-width:1000px;height:100%;border:none;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.4);"></iframe>
            </div>
        `;
    } catch(e) {
        alert('Erro ao gerar PDF: ' + e.message);
        if (document.body.contains(overlay)) overlay.remove();
    }
}

win
