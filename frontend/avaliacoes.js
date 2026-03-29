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
    }
};

let chartDonut = null;
let chartBar = null;

window.renderAvaliacaoTab = async function(container) {
    if (!viewedColaborador) return;
    const colabId = viewedColaborador.id;
    const dept = viewedColaborador.departamento || viewedColaborador.cargo || '';
    
    // Identificar qual grupo usar
    let selectedGroupSatisfacao = 'escritorio';
    let selectedGroupDesempenho = 'geral';
    const dLower = dept.toLowerCase();
    
    if (dLower.includes('motorista') || dLower.includes('ajudante')) selectedGroupSatisfacao = 'motorista';
    else if (dLower.includes('manuten')) selectedGroupSatisfacao = 'manutencao';
    
    if (dLower.includes('lideran') || dLower.includes('líder')) selectedGroupDesempenho = 'lideranca';
    
    // Persistencia do tipo e ano selecionado
    const currentYear = new Date().getFullYear();
    const dataAdmissao = viewedColaborador.data_admissao ? new Date(viewedColaborador.data_admissao).getFullYear() : currentYear;
    const anos = [];
    for (let y = dataAdmissao; y <= currentYear; y++) anos.push(y);
    if (!anos.includes(currentYear)) anos.push(currentYear);
    
    let selectedYear = window.tabPersistence && window.tabPersistence['av-year-select'] ? parseInt(window.tabPersistence['av-year-select']) : currentYear;
    let selectedTipo = window.tabPersistence && window.tabPersistence['av-tipo-select'] ? window.tabPersistence['av-tipo-select'] : 'desempenho';

    const groupKey = selectedTipo === 'satisfacao' ? selectedGroupSatisfacao : selectedGroupDesempenho;
    const questions = AVALIACAO_QUESTIONS[selectedTipo][groupKey];
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
                const avg = count > 0 ? (sum / count) : null;
                trimestersData[av.trimestre][cat] = avg;
                if (avg !== null) { totalSum += avg; totalCount++; }
            });
            trimestersOverall[av.trimestre] = totalCount > 0 ? (totalSum / totalCount) : null;
        });

        // Trimestre Mappings for UI
        const trimestreToMonth = {
            1: 'Janeiro (1º Trim.)',
            2: 'Abril (2º Trim.)',
            3: 'Julho (3º Trim.)',
            4: 'Dezembro (4º Trim.)'
        };

        let tableHtml = `
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; background:#fff; margin-bottom:1.5rem;">
                <thead>
                    <tr style="background:#0284c7; color:#fff;">
                        <th style="padding:0.6rem; text-align:left; border:1px solid #0369a1;">Competências / Categorias</th>
                        <th style="padding:0.6rem; text-align:center; border:1px solid #0369a1; width:15%;">${trimestreToMonth[1]}</th>
                        <th style="padding:0.6rem; text-align:center; border:1px solid #0369a1; width:15%;">${trimestreToMonth[2]}</th>
                        <th style="padding:0.6rem; text-align:center; border:1px solid #0369a1; width:15%;">${trimestreToMonth[3]}</th>
                        <th style="padding:0.6rem; text-align:center; border:1px solid #0369a1; width:15%;">${trimestreToMonth[4]}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        categories.forEach(cat => {
            tableHtml += `<tr>
                <td style="padding:0.5rem; border:1px solid #e2e8f0; font-weight:600; color:#334155; background:#f8fafc;">${cat}</td>
                <td style="padding:0.5rem; text-align:center; border:1px solid #e2e8f0; ${trimestersData[1][cat]?'color:#16a34a;font-weight:700;':''}">${trimestersData[1][cat]?.toFixed(2) || '#REF!'}</td>
                <td style="padding:0.5rem; text-align:center; border:1px solid #e2e8f0; ${trimestersData[2][cat]?'color:#16a34a;font-weight:700;':''}">${trimestersData[2][cat]?.toFixed(2) || '#REF!'}</td>
                <td style="padding:0.5rem; text-align:center; border:1px solid #e2e8f0; ${trimestersData[3][cat]?'color:#16a34a;font-weight:700;':''}">${trimestersData[3][cat]?.toFixed(2) || '#REF!'}</td>
                <td style="padding:0.5rem; text-align:center; border:1px solid #e2e8f0; ${trimestersData[4][cat]?'color:#16a34a;font-weight:700;':''}">${trimestersData[4][cat]?.toFixed(2) || '#REF!'}</td>
            </tr>`;
        });

        tableHtml += `
            <tr style="background:#0ea5e9; color:#fff; font-weight:700;">
                <td style="padding:0.6rem; border:1px solid #0284c7; text-align:right;">Média Geral:</td>
                <td style="padding:0.6rem; text-align:center; border:1px solid #0284c7;">${trimestersOverall[1]?.toFixed(2) || '#REF!'}</td>
                <td style="padding:0.6rem; text-align:center; border:1px solid #0284c7;">${trimestersOverall[2]?.toFixed(2) || '#REF!'}</td>
                <td style="padding:0.6rem; text-align:center; border:1px solid #0284c7;">${trimestersOverall[3]?.toFixed(2) || '#REF!'}</td>
                <td style="padding:0.6rem; text-align:center; border:1px solid #0284c7;">${trimestersOverall[4]?.toFixed(2) || '#REF!'}</td>
            </tr>
            </tbody></table>
        `;

        // Action Steps
        let actionsHtml = `<div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">`;
        for (let t=1; t<=4; t++) {
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
                    <h5 style="margin:0 0 0.5rem; color:#334155;">${trimestreToMonth[t]}</h5>
                    ${hasData ? `<p style="font-size:1.5rem; font-weight:800; color:#16a34a; margin:0 0 1rem;">${trimestersOverall[t].toFixed(1)} <sub style="font-size:0.7rem;color:#64748b;">Média</sub></p>` : `<p style="font-size:0.85rem; color:#94a3b8; margin:0 0 1rem;">Pendente</p>`}
                    <div style="display:flex; gap:0.5rem; justify-content:center;">
                        <button onclick="openFormAvaliacao('${tipo}', ${year}, ${t}, '${groupKey}')" style="background:${isFull?'#0f4c81':'#0ea5e9'}; color:#fff; border:none; padding:0.4rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.8rem; flex:1;">
                            <i class="ph ph-note-pencil"></i> ${hasData ? (isFull ? 'Editar' : 'Continuar') : 'Preencher'}
                        </button>
                        ${hasData ? `<button onclick="deleteAvaliacao(${avId})" style="background:#ef4444; color:#fff; border:none; padding:0.4rem; border-radius:4px; cursor:pointer; font-size:1rem; display:flex; align-items:center;"><i class="ph ph-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        }
        actionsHtml += `</div>`;

        // Renderizar a tela de fato
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <i class="ph ph-chart-bar" style="color:#0ea5e9; font-size: 1.5rem;"></i>
                    <h4 style="margin:0; color:#1e293b;">Painel de Avaliações</h4>
                </div>
                
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <label style="font-size:0.9rem; font-weight:600; color:#475569;">Tipo:</label>
                        <select id="av-tipo-select" style="padding:0.4rem; border-radius:6px; border:1px solid #cbd5e1; font-weight:500;" onchange="window.tabPersistence['av-tipo-select']=this.value; renderAvaliacaoTab(document.getElementById('docs-list-container'));">
                            <option value="desempenho" ${tipo==='desempenho'?'selected':''}>Avaliação de Desempenho</option>
                            <option value="satisfacao" ${tipo==='satisfacao'?'selected':''}>Avaliação de Satisfação</option>
                        </select>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <label style="font-size:0.9rem; font-weight:600; color:#475569;">Ano:</label>
                        <select id="av-year-select" style="padding:0.4rem; border-radius:6px; border:1px solid #cbd5e1; font-weight:500;" onchange="window.tabPersistence['av-year-select']=this.value; renderAvaliacaoTab(document.getElementById('docs-list-container'));">
                            ${anos.map(y => `<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            ${tableHtml}

            <!-- Charts Container -->
            <div style="display:flex; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem;">
                    <h5 style="margin:0 0 1rem; text-align:center; color:#334155;">Categorias (${year}) - ${tipo === 'desempenho' ? 'Desempenho' : 'Satisfação'}</h5>
                    <div style="position:relative; height:250px;"><canvas id="chart-competencias"></canvas></div>
                </div>
                <div style="flex:1; min-width:300px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem;">
                    <h5 style="margin:0 0 1rem; text-align:center; color:#334155;">Média Geral</h5>
                    <div style="position:relative; height:250px;"><canvas id="chart-medias"></canvas></div>
                </div>
            </div>

            ${actionsHtml}
        `;

        // Renderizar Charts (depois do innerHTML)
        setTimeout(() => {
            if (typeof Chart === 'undefined') return;
            
            const doughnutLabels = categories;
            const doughnutData = categories.map(cat => {
                let sum = 0, count = 0;
                [1,2,3,4].forEach(t => { if(trimestersData[t][cat]){ sum+=trimestersData[t][cat]; count++; } });
                return count > 0 ? (sum/count).toFixed(2) : 0;
            });
            const doughnutColors = ['#0ea5e9', '#ef4444', '#84cc16', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b', '#14b8a6', '#f97316', '#6366f1', '#a855f7', '#fbbf24', '#34d399', '#f87171', '#818cf8', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c'];

            if (chartDonut) chartDonut.destroy();
            const ctxDonut = document.getElementById('chart-competencias')?.getContext('2d');
            if (ctxDonut) {
                chartDonut = new Chart(ctxDonut, {
                    type: 'doughnut',
                    data: {
                        labels: doughnutLabels,
                        datasets: [{ data: doughnutData, backgroundColor: doughnutColors.slice(0, doughnutLabels.length), borderWidth: 1 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } } }
                });
            }

            if (chartBar) chartBar.destroy();
            const ctxBar = document.getElementById('chart-medias')?.getContext('2d');
            if (ctxBar) {
                chartBar = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: [trimestreToMonth[1], trimestreToMonth[2], trimestreToMonth[3], trimestreToMonth[4]],
                        datasets: [{ label: 'Média', data: [trimestersOverall[1], trimestersOverall[2], trimestersOverall[3], trimestersOverall[4]], backgroundColor: '#3b82f6', borderRadius: 4 }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false, 
                        scales: { y: { beginAtZero: true, max: 5 } },
                        plugins: { legend: { display: false } }
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
                <p style="margin-top:0; color:#64748b; font-size:0.9rem;">Avalie cada critério de 1 a 5 (onde 1 é muito ruim e 5 é ótimo).</p>
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
    
    categories.forEach((cat, catIdx) => {
        respostas[cat] = {};
        AVALIACAO_QUESTIONS[tipo][groupKey][cat].forEach((q, i) => {
            const rads = form.elements[`av_${catIdx}_${i}`];
            if (rads && rads.length) {
                const selected = Array.from(rads).find(r => r.checked);
                if (selected) respostas[cat][i] = selected.value;
            }
        });
    });

    try {
        errSpan.textContent = 'Salvando...';
        await apiPost('/avaliacoes', { colaborador_id: viewedColaborador.id, tipo, ano, trimestre, respostas_json: JSON.stringify(respostas) });
        document.getElementById('modal-avaliacao').remove();
        renderAvaliacaoTab(document.getElementById('docs-list-container'));
        alert('Avaliação do ' + trimestre + 'º trimestre salva!');
    } catch(e) {
        errSpan.textContent = '';
        alert('Erro ao salvar avaliação: ' + e.message);
    }
};

window.deleteAvaliacao = async function(id) {
    if (!confirm('Deseja realmente apagar a avaliação? Todos os dados serão perdidos.')) return;
    try {
        await apiDelete(`/avaliacoes/${id}`);
        renderAvaliacaoTab(document.getElementById('docs-list-container'));
    } catch(e) {
        alert('Erro ao deletar: ' + e.message);
    }
};
