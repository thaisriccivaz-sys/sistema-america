const fs = require('fs');
let content = fs.readFileSync('./frontend/experiencia.js', 'utf8');

// Replace the max score
content = content.replace(/<input type="number" name="nota_\$\{idx\}" min="0" max="10" value="\$\{nota\}" \$\{disabled\}\n\s+oninput="calcularPontuacaoExp\(\)"\n\s+style="width:70px;/g, 
`<input type="number" name="nota_\$\{idx\}" min="1" max="5" value="\$\{nota\}" \$\{disabled\}
                            oninput="calcularPontuacaoExp()"
                            style="width:70px;`);
                            
content = content.replace(/<th style="width:100px;text-align:center;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Nota \(0-10\)<\/th>/g, 
`<th style="width:100px;text-align:center;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Nota (1-5)</th>`);

content = content.replace(/<span style="color:#94a3b8;font-size:0\.8rem;"> \/ \$\{totalItens \* 10\}<\/span>/g, 
`<span style="color:#94a3b8;font-size:0.8rem;"> / \$\{totalItens * 5\}</span>`);

const novosTemplates = `const FORMULARIOS_POR_DEPARTAMENTO = {
    'Ajudante Geral': {
        titulo: 'AVALIAÇÃO AJUDANTE GERAL',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de faltas justificadas.', 'Comunica qualquer falta ou atraso com antecedência.', 'Sai pontualmente para a rota no horário programado.', 'Realiza os atendimentos da rota com agilidade e bom ritmo.', 'É comprometido e flexível para realizar escalas extras quando solicitado.'] },
            { nome: '2. CUIDADO COM OS MATERIAIS', itens: ['Demonstra cuidado ao entrar e sair do veículo.', 'Tem atenção ao abrir portas, caçamba ou equipamentos para não causar avarias.', 'Evita apoiar materiais ou ferramentas que possam riscar ou danificar o veículo.', 'Utiliza corretamente e preserva mangueiras, conexões e acessórios da operação.', 'Mostra interesse em preservar o patrimônio da empresa.', 'Utiliza os equipamentos e máquinas da empresa com cuidado e atenção, seguindo as orientações.'] },
            { nome: '3. OPERAÇÃO E SERVIÇO', itens: ['Realiza corretamente a sucção de dejetos e a lavagem dos banheiros, seguindo o padrão.', 'Apresenta proatividade ao retornar cedo da rota.', 'Demonstra atenção e cuidado com a segurança no manuseio de resíduos.', 'Mantém organização e limpeza do local após finalizar a operação.', 'Mantém postura profissional no manuseio de dejetos, sem demonstrar nojo.', 'Utiliza corretamente os EPIs obrigatórios durante as operações.'] },
            { nome: '4. APOIO AO MOTORISTA', itens: ['Mantém atenção ao trânsito durante a rota, alertando o motorista sobre riscos.', 'Auxilia o motorista com segurança em manobras (sinalização e orientação de espaço).', 'Segue orientações do motorista com a operação.', 'Auxilia o motorista a aprontar o veículo para rápida saída da rota.', 'Auxilia o motorista a finalizar a rota e alocar os materiais em seus devidos lugares.', 'Auxilia motorista no uso de aplicativo, evitando que ele utilize o celular enquanto dirige e outras situações.'] },
            { nome: '5. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém comunicação cordial e respeitosa com logística, liderança e equipe.', 'Aceita orientações e feedback sem resistência, buscando melhorar.', 'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).', 'Mantém postura profissional com o cliente, evitando conflitos e preservando a imagem da empresa.', 'Respeita a hierarquia de modo geral.', 'Tem bom comportamento em confraternizações e reuniões.'] }
        ]
    },
    'Comercial': {
        titulo: 'AVALIAÇÃO COMERCIAL',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de faltas justificadas.', 'Comunica qualquer falta ou atraso com antecedência.', 'Evita saídas longas do posto de trabalho durante o dia.', 'Realiza os atendimentos com agilidade garantindo que todos os clientes sejam atendidos.', 'Mantém organização das atividades ao longo do dia.'] },
            { nome: '2. COMUNICAÇÃO E ATENDIMENTO', itens: ['Apresenta boa escrita e clareza em mensagens, evitando erros e ruídos de comunicação.', 'Tem o perfil de encantamento do cliente, tentando ajudar e demostrando interesse.', 'Consegue explicar informações básicas de produtos ou serviços.', 'Consegue explicar informações complexas de produtos ou serviços.', 'Consegue lidar com reclamações e situações difíceis com calma, educação e foco em solução.', 'Tem agilidade no atendimento, respondendo rapidamente o cliente.'] },
            { nome: '3. ORGANIZAÇÃO E ROTINAS', itens: ['Utiliza corretamente sistemas garantindo a integridade dos processos.', 'Cumpre prazos e mantém controles sobre retorno a clientes e colegas.', 'Tem fácil aprendizado para novas atividades.', 'Demonstra atenção ao preencher cadastros e propostas e contratos.', 'Mantém registros e informações atualizadas no sistema.', 'Acompanha follow-up de clientes (retornos, cobranças e pendências) sem deixar oportunidades morrerem.'] },
            { nome: '4. RESULTADOS E PROATIVIDADE', itens: ['Demonstra iniciativa para ajudar nas demandas.', 'Contribui para organização de metas, orçamentos ou relatórios.', 'Apresenta habilidade e agilidade no uso de computadores e na execução das tarefas.', 'Consegue executar tarefas sem necessidade constante de supervisão.', 'Demonstra capacidade de identificar oportunidades de venda (novos clientes, renovação e reativação).', 'Busca atingir metas e acompanhar resultados do setor.'] },
            { nome: '5. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém comunicação cordial e respeitosa com logística, liderança e equipe.', 'Aceita orientações e feedback sem resistência, buscando melhorar.', 'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).', 'Mantém postura profissional no ambiente de trabalho, evitando brincadeiras inadequadas e conflitos.', 'Respeita a hierarquia de modo geral.', 'Tem bom comportamento em confraternizações e reuniões.'] }
        ]
    },
    'Manutenção': {
        titulo: 'AVALIAÇÃO MANUTENÇÃO',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de faltas justificadas.', 'Comunica qualquer falta ou atraso com antecedência.', 'Evita saídas longas do posto de trabalho durante o dia.', 'Realiza todas as atividades com agilidade, evitando ociosidade durante uma atividade.', 'Mantém organização das atividades ao longo do dia.'] },
            { nome: '2. QUALIDADE DO SERVIÇO', itens: ['Executa as atividades com cuidado e capricho.', 'Segue corretamente as orientações recebidas.', 'Demonstra atenção aos detalhes nas manutenções realizadas.', 'Verifica o serviço após a conclusão para evitar retrabalho.', 'Utiliza corretamente ferramentas e materiais.', 'Comunica quando identifica falhas ou necessidade de ajuste.'] },
            { nome: '3. SEGURANÇA', itens: ['Utiliza corretamente os EPIs.', 'Respeita normas e procedimentos de segurança.', 'Tem atenção ao manusear ferramentas e equipamentos.', 'Comunica situações de risco ou condições inseguras.', 'Evita improvisações que possam gerar risco.', 'Demonstra responsabilidade com a própria segurança e a dos colegas.'] },
            { nome: '4. ORGANIZAÇÃO E FERRAMENTAS', itens: ['Mantém ferramentas e materiais organizados após o uso.', 'Zela pelos equipamentos da empresa.', 'Mantém o local de trabalho limpo e organizado.', 'Evita perdas ou extravios de materiais.', 'Sabe identificar e separar corretamente cada ferramenta.', 'Comunica quando alguma ferramenta está danificada ou faltando.'] },
            { nome: '5. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém comunicação cordial e respeitosa com logística, liderança e equipe.', 'Aceita orientações e feedback sem resistência, buscando melhorar.', 'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).', 'Mantém postura profissional no ambiente de trabalho, evitando brincadeiras inadequadas e conflitos.', 'Respeita a hierarquia de modo geral.', 'Tem bom comportamento em confraternizações e reuniões.'] }
        ]
    },
    'Motorista': {
        titulo: 'AVALIAÇÃO MOTORISTA',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de faltas justificadas.', 'Comunica qualquer falta ou atraso com antecedência.', 'Sai pontualmente para a rota no horário programado.', 'Realiza os atendimentos com agilidade garantindo que todos os clientes sejam atendidos.', 'É comprometido e flexível para realizar escalas extras quando solicitado.'] },
            { nome: '2. CONDUÇÃO E CUIDADO COM O VEÍCULO', itens: ['Cuida do correto abastecimento do veículo conforme orientação.', 'Respeita as regras de trânsito, evitando multas e advertências.', 'Mantém postura profissional no trânsito, evitando conflitos e discussões.', 'Mantém a limpeza e organização do veículo ao final da rota.', 'Comunica imediatamente qualquer ruído, falha mecânica ou sinal de problema no veículo.', 'Mantém atenção durante a direção, evitando distrações.'] },
            { nome: '3. OPERAÇÃO E SERVIÇO (ATIVIDADE PRINCIPAL)', itens: ['Realiza corretamente a sucção de dejetos, seguindo o padrão da empresa.', 'Evita desperdício de insumos e utiliza os recursos com consciência.', 'Demonstra atenção e cuidado com a segurança no manuseio de resíduos.', 'Mantém organização e limpeza do local após finalizar a operação.', 'Mantém postura profissional no manuseio de dejetos, sem demonstrar nojo.', 'Utiliza corretamente os EPIs obrigatórios durante as operações.'] },
            { nome: '4. PROCESSOS, CONTROLES E DOCUMENTOS', itens: ['Demonstra facilidade na utilização das ferramentas e sistemas.', 'Preenche corretamente o checklist do veículo.', 'Garante que o registro do atendimento seja feito corretamente no aplicativo.', 'Comunica a logística antes de registrar falha no sistema.', 'Responde as mensagens e ligações de forma ágil e direta.', 'Está atento ao resumo da rota antes da saída pela manhã.'] },
            { nome: '5. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém comunicação cordial e respeitosa com logística, liderança e equipe.', 'Aceita orientações e feedback sem resistência, buscando melhorar.', 'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).', 'Mantém postura profissional com o cliente, evitando conflitos e preservando a imagem da empresa.', 'Respeita a hierarquia de modo geral.', 'Tem bom comportamento em confraternizações e reuniões.'] }
        ]
    },
    'Financeiro': {
        titulo: 'AVALIAÇÃO SETOR FINANCEIRO',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de atrasos.', 'Comunica ausências ou atrasos com antecedência.', 'Cumpre horários e prazos internos do setor.', 'Segue a rotina diária de atividades financeiras.', 'Demonstra responsabilidade com demandas recorrentes.'] },
            { nome: '2. ORGANIZAÇÃO E CONTROLE FINANCEIRO', itens: ['Mantém organização de documentos financeiros (boletos, notas, comprovantes).', 'Mantém controles atualizados (planilhas/sistema).', 'Mantém o ambiente de trabalho organizado (mesa, arquivos e sistema).', 'Demonstra cuidado com informações sensíveis.', 'Mantém organização das atividades ao longo do dia.', 'Evita perda de documentos ou informações.'] },
            { nome: '3. PROCESSOS E SISTEMAS', itens: ['Utiliza corretamente os sistemas financeiros da empresa.', 'Realiza lançamentos (contas a pagar/receber) de forma correta.', 'Cumpre prazos de pagamentos e cobranças.', 'Segue fluxo de aprovação e validação interna.', 'Demonstra facilidade de aprendizado em sistemas novos.', 'Executa atividades conforme os processos definidos.'] },
            { nome: '4. ANÁLISE E ATENÇÃO A DETALHES', itens: ['Identifica inconsistências em valores ou documentos.', 'Demonstra atenção a centavos, datas e dados bancários.', 'Confere informações antes de executar pagamentos.', 'Evita erros por falta de conferência.', 'Analisa informações com senso crítico.', 'Demonstra responsabilidade ao lidar com valores financeiros.'] },
            { nome: '5. COMUNICAÇÃO (INTERNA E COM CLIENTES)', itens: ['Mantém comunicação clara e objetiva com equipe e outras áreas.', 'Atende clientes com cordialidade e profissionalismo.', 'Responde dúvidas financeiras com clareza (boletos, cobranças, prazos).', 'Comunica problemas ou inconsistências de forma rápida.', 'Retorna solicitações (internas e externas) dentro do prazo.', 'Consegue explicar informações financeiras de forma simples e objetiva.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Cumpre prazos de pagamento e recebimento.', 'Demonstra iniciativa para resolver pendências financeiras.', 'Ajuda na organização do setor quando necessário.', 'Propõe melhorias em processos simples.', 'Mantém produtividade no dia a dia.', 'Atua para evitar atrasos e problemas operacionais.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura ética e confidencial.', 'Respeita hierarquia e processos internos.', 'Aceita feedbacks e busca melhoria contúna.', 'Trabalha bem em equipe.', 'Mantém postura profissional no ambiente de trabalho.', 'Demonstra comprometimento com a empresa.'] }
        ]
    },
    'Logística': {
        titulo: 'AVALIAÇÃO SETOR LOGÍSTICA',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de atrasos.', 'Comunica ausências ou atrasos com antecedência.', 'Cumpre horários de entrada, saída e início de rota.', 'Segue a rotina diária operacional.', 'Demonstra responsabilidade com atividades programadas.'] },
            { nome: '2. ORGANIZAÇÃO E CONTROLE OPERACIONAL', itens: ['Mantém organização dos materiais e equipamentos.', 'Mantém o ambiente de trabalho organizado (pátio, veículos, área operacional).', 'Evita perda ou extravio de itens.', 'Mantém controle sobre itens utilizados na operação.', 'Organiza as atividades ao longo do dia.', 'Demonstra cuidado com ferramentas e recursos da empresa.'] },
            { nome: '3. PROCESSOS E SISTEMAS', itens: ['Segue os processos operacionais definidos pela empresa.', 'Utiliza corretamente sistemas e ferramentas (app, checklist, ERP).', 'Preenche corretamente checklists e registros operacionais.', 'Cumpre fluxo de comunicação com a logística.', 'Executa atividades conforme padrão estabelecido.', 'Demonstra facilidade para aprender novos processos.'] },
            { nome: '4. EXECUÇÃO OPERACIONAL E ATENÇÃO A DETALHES', itens: ['Possui conhecimento das regiões da Grande São Paulo, facilitando a execução das rotas.', 'Demonstra atenção durante a execução das atividades.', 'Evita erros operacionais por falta de atenção.', 'Segue corretamente instruções de cada serviço.', 'Mantém qualidade na execução das tarefas.', 'Demonstra responsabilidade na operação realizada.'] },
            { nome: '5. COMUNICAÇÃO (INTERNA E COM CLIENTES)', itens: ['Mantém comunicação clara com a equipe e a logística.', 'Comunica problemas ou ocorrências durante a rota com agilidade.', 'Atende clientes com educação e profissionalismo.', 'Consegue explicar o serviço ao cliente quando necessário.', 'Responde orientações de forma rápida e clara.', 'Retorna informações solicitadas dentro do prazo.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Cumpre rotas e demandas dentro do prazo.', 'Demonstra iniciativa para resolver problemas em campo.', 'Ajuda a equipe quando necessário.', 'Propõe soluções simples para melhorar a operação.', 'Mantém produtividade durante o dia.', 'Atua para evitar retrabalho e falhas operacionais.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura profissional no ambiente de trabalho.', 'Respeita liderança, equipe e demais áreas.', 'Aceita orientações e feedbacks sem resistência.', 'Trabalha bem em equipe.', 'Evita conflitos e mantém bom relacionamento.', 'Demonstra comprometimento com a empresa.'] }
        ]
    },
    'Recursos Humanos': {
        titulo: 'AVALIAÇÃO SETOR RH',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de atrasos.', 'Comunica ausências ou atrasos com antecedência.', 'Cumpre horários e prazos do setor.', 'Segue a rotina diária de atividades de RH.', 'Demonstra responsabilidade com demandas recorrentes.'] },
            { nome: '2. ORGANIZAÇÃO E CONTROLE DE DOCUMENTOS', itens: ['Mantém organização de documentos dos colaboradores.', 'Mantém arquivos físicos e digitais organizados.', 'Evita perda ou extravio de documentos.', 'Mantém controles atualizados (admissão, férias, ponto, etc.).', 'Mantém o ambiente de trabalho organizado.', 'Demonstra cuidado com documentos confidenciais.'] },
            { nome: '3. PROCESSOS E SISTEMAS', itens: ['Segue corretamente os processos internos de RH.', 'Utiliza corretamente sistemas (ERP, ponto, planilhas).', 'Aprende novos sistemas com facilidade.', 'Cumpre prazos legais e internos.', 'Segue fluxos de aprovação e validação.', 'Demonstra facilidade para aprender novos processos.'] },
            { nome: '4. ATENÇÃO A DETALHES E CONFORMIDADE', itens: ['Identifica erros ou inconsistências em documentos.', 'Demonstra atenção a dados como CPF, datas e informações pessoais.', 'Evita erros por falta de conferência.', 'Garante que documentos estejam completos e corretos.', 'Atua conforme regras trabalhistas e orientações internas.', 'Demonstra responsabilidade com informações sensíveis.'] },
            { nome: '5. COMUNICAÇÃO (INTERNA E COM COLABORADORES)', itens: ['Mantém comunicação clara com colaboradores e gestores.', 'Explica informações de RH de forma simples (holerite, férias, benefícios).', 'Responde dúvidas com agilidade.', 'Mantém postura profissional no atendimento.', 'Comunica problemas ou pendências de forma rápida.', 'Retorna solicitações dentro do prazo.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Cumpre prazos de processos (admissão, folha, férias).', 'Demonstra iniciativa para resolver pendências.', 'Ajuda na organização do setor quando necessário.', 'Propõe melhorias em rotinas simples.', 'Mantém produtividade no dia a dia.', 'Atua para evitar retrabalho e erros.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura ética e confidencial.', 'Respeita colaboradores de todos níveis.', 'Aceita feedbacks e busca melhoria contínua.', 'Trabalha bem em equipe.', 'Mantém postura profissional no ambiente de trabalho.', 'Demonstra comprometimento com a empresa.'] }
        ]
    },
    'Liderança Operacional': {
        titulo: 'AVALIAÇÃO LIDERANÇA OPERACIONAL',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Mantém pontualidade e assiduidade.', 'Cumpre horários e compromissos da função.', 'Segue a rotina diária da operação.', 'Garante o início das atividades no horário correto.', 'Demonstra responsabilidade com a equipe e operação.', 'Dá exemplo de disciplina para a equipe.'] },
            { nome: '2. ORGANIZAÇÃO E GESTÃO DE ATIVIDADES', itens: ['Organiza a equipe antes do início da operação.', 'Distribui atividades de forma clara.', 'Define prioridades conforme a demanda do dia.', 'Acompanha o andamento das atividades.', 'Mantém controle das tarefas e prazos.', 'Garante organização do pátio e operação.'] },
            { nome: '3. PROCESSOS E GESTÃO OPERACIONAL', itens: ['Garante o cumprimento dos processos operacionais.', 'Orienta a equipe sobre padrões de execução.', 'Acompanha a execução das atividades em campo/pátio.', 'Identifica desvios e corrige rapidamente.', 'Garante o uso correto de EPIs e procedimentos.', 'Assegura que a operação siga o padrão da empresa.'] },
            { nome: '4. ACOMPANHAMENTO E CONTROLE DA OPERAÇÃO', itens: ['Acompanha a saída e retorno das equipes.', 'Monitora o andamento das rotas.', 'Garante que checklists e controles sejam realizados.', 'Identifica problemas operacionais com agilidade.', 'Atua rapidamente na solução de ocorrências.', 'Mantém controle geral da operação durante o dia.'] },
            { nome: '5. COMUNICAÇÃO (EQUIPE, LOGÍSTICA E CLIENTES)', itens: ['Mantém comunicação clara com a equipe.', 'Alinha informações com a logística e escritório.', 'Comunica problemas e ocorrências com agilidade.', 'Orienta a equipe de forma objetiva.', 'Mantém postura profissional no contato com clientes.', 'Garante que as informações sejam repassadas corretamente.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Garante cumprimento das demandas do dia.', 'Atua para evitar atrasos e falhas operacionais.', 'Demonstra iniciativa na resolução de problemas.', 'Apoia a equipe sempre que necessário.', 'Propõe melhorias na operação.', 'Mantém produtividade da equipe.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura profissional no ambiente de trabalho.', 'Sabe lidar com pressão do dia a dia.', 'Mantém respeito com equipe e liderança.', 'Administra conflitos da equipe de forma rápida e equilibrada.', 'Atua de forma imparcial na resolução de problemas entre colaboradores.', 'Aceita feedbacks e aplica melhorias.', 'Demonstra comprometimento com a empresa.'] }
        ]
    },
    'Supervisão': {
        titulo: 'AVALIAÇÃO SUPERVISÃO',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Mantém pontualidade e assiduidade.', 'Cumpre horários e compromissos da função.', 'Segue a rotina diária administrativa.', 'Garante o cumprimento das atividades dentro do prazo.', 'Demonstra responsabilidade com a equipe e demandas.', 'Dá exemplo de disciplina para a equipe.'] },
            { nome: '2. ORGANIZAÇÃO E GESTÃO DE ATIVIDADES', itens: ['Organiza as demandas da equipe de forma clara.', 'Distribui tarefas conforme prioridade.', 'Acompanha o andamento das atividades.', 'Mantém controle de prazos e entregas.', 'Garante organização do ambiente de trabalho e rotinas.', 'Evita acúmulo ou atraso de atividades.'] },
            { nome: '3. PROCESSOS E PADRONIZAÇÃO', itens: ['Garante o cumprimento dos processos administrativos.', 'Orienta a equipe sobre padrões e procedimentos.', 'Confere se as atividades estão sendo executadas corretamente.', 'Identifica falhas de processo e corrige rapidamente.', 'Garante padronização das entregas do setor.', 'Apoia a implementação de melhorias nos processos.'] },
            { nome: '4. ACOMPANHAMENTO E DESENVOLVIMENTO DA EQUIPE', itens: ['Acompanha o desempenho dos auxiliares e assistentes.', 'Orienta e treina a equipe quando necessário.', 'Dá feedbacks claros e frequentes.', 'Apoia o desenvolvimento dos colaboradores.', 'Identifica dificuldades e atua na correção.', 'Garante que a equipe esteja alinhada com as atividades.'] },
            { nome: '5. COMUNICAÇÃO (EQUIPE, GESTÃO E CLIENTES INTERNOS)', itens: ['Mantém comunicação clara com a equipe.', 'Alinha informações com outros setores.', 'Comunica problemas e pendências com agilidade.', 'Garante que as informações sejam repassadas corretamente.', 'Mantém postura profissional no ambiente de trabalho.', 'Facilita a comunicação entre equipe e gestão.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Garante cumprimento das demandas do setor.', 'Atua para evitar atrasos e retrabalho.', 'Demonstra iniciativa na resolução de problemas.', 'Apoia a equipe para atingir resultados.', 'Propõe melhorias nos processos administrativos.', 'Mantém produtividade do time.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura ética e profissional.', 'Trata a equipe com respeito e equilíbrio.', 'Sabe lidar com pressão e demandas simultâneas.', 'Administra conflitos entre colaboradores de forma profissional.', 'Busca solução justa e equilibrada em situações de conflito.', 'Aceita feedbacks e busca melhoria contínua.', 'Demonstra comprometimento com a empresa.'] }
        ]
    },
    'Limpeza': {
        titulo: 'AVALIAÇÃO LIMPEZA',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de atrasos.', 'Comunica ausências ou atrasos com antecedência.', 'Cumpre horários de trabalho.', 'Segue a rotina diária de limpeza.', 'Demonstra responsabilidade com suas atividades.'] },
            { nome: '2. ORGANIZAÇÃO E LIMPEZA DO AMBIENTE', itens: ['Mantém o ambiente limpo e organizado.', 'Realiza limpeza conforme padrão da empresa.', 'Mantém organização dos materiais de limpeza.', 'Cuida corretamente dos produtos e equipamentos.', 'Mantém os espaços agradáveis e bem cuidados.', 'Evita acúmulo de sujeira ou desorganização.'] },
            { nome: '3. EXECUÇÃO DAS ATIVIDADES', itens: ['Realiza as atividades de limpeza corretamente.', 'Segue orientações recebidas.', 'Demonstra atenção durante a execução das tarefas.', 'Evita retrabalho por falha na execução.', 'Cumpre as atividades dentro do tempo esperado.', 'Demonstra capricho no trabalho realizado.'] },
            { nome: '4. ATENÇÃO E CUIDADOS', itens: ['Utiliza corretamente produtos de limpeza.', 'Demonstra cuidado com móveis, equipamentos e estrutura.', 'Evita danos ou desperdícios.', 'Identifica necessidades de limpeza ou reposição.', 'Segue orientações de segurança.', 'Mantém atenção ao executar as atividades.'] },
            { nome: '5. COMUNICAÇÃO', itens: ['Mantém comunicação clara com a equipe.', 'Informa quando há falta de materiais.', 'Comunica problemas ou necessidades.', 'Responde orientações de forma adequada.', 'Mantém postura respeitosa no ambiente de trabalho.', 'Interage de forma educada com todos.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Cumpre as atividades do dia.', 'Demonstra iniciativa para manter o ambiente limpo.', 'Ajuda quando necessário.', 'Realiza tarefas sem necessidade de cobrança constante.', 'Mantém produtividade no dia a dia.', 'Atua para evitar acúmulo de serviço.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura profissional.', 'Trata todos com respeito.', 'Aceita orientações e feedbacks.', 'Trabalha bem em equipe.', 'Evita conflitos no ambiente de trabalho.', 'Demonstra comprometimento com a empresa.'] }
        ]
    },
    'Administrativo': {
        titulo: 'AVALIAÇÃO ADMINISTRATIVO',
        secoes: [
            { nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA', itens: ['Evita faltas não justificadas.', 'Mantém baixo número de atrasos.', 'Comunica ausências ou atrasos com antecedência.', 'Cumpre horários e prazos do setor.', 'Segue a rotina diária administrativa.', 'Demonstra responsabilidade com suas atividades.'] },
            { nome: '2. ORGANIZAÇÃO E CONTROLE DE ATIVIDADES', itens: ['Mantém organização de documentos e informações.', 'Mantém arquivos físicos e digitais organizados.', 'Mantém o ambiente de trabalho organizado.', 'Controla prazos e demandas do dia a dia.', 'Evita perda de informações ou documentos.', 'Organiza suas atividades ao longo do dia.'] },
            { nome: '3. PROCESSOS E SISTEMAS', itens: ['Segue corretamente os processos internos.', 'Utiliza corretamente sistemas (ERP, planilhas, etc.).', 'Aprende novos sistemas com facilidade.', 'Cumpre fluxos e padrões definidos.', 'Preenche informações corretamente nos sistemas.', 'Demonstra facilidade para aprender novos processos.'] },
            { nome: '4. ATENÇÃO A DETALHES E QUALIDADE', itens: ['Demonstra atenção ao realizar tarefas.', 'Evita erros por falta de conferência.', 'Confere informações antes de finalizar atividades.', 'Mantém qualidade nas entregas.', 'Identifica possíveis erros ou inconsistências.', 'Atua com cuidado nas atividades realizadas.'] },
            { nome: '5. COMUNICAÇÃO (INTERNA E COM CLIENTES)', itens: ['Mantém comunicação clara com a equipe e outros setores.', 'Responde solicitações com agilidade.', 'Comunica problemas ou pendências rapidamente.', 'Atende clientes com educação e profissionalismo.', 'Explica informações de forma clara e objetiva.', 'Retorna solicitações dentro do prazo.'] },
            { nome: '6. RESULTADOS E PROATIVIDADE', itens: ['Cumpre prazos das atividades.', 'Demonstra iniciativa para resolver pendências.', 'Ajuda a equipe quando necessário.', 'Propõe melhorias simples nos processos.', 'Mantém produtividade no dia a dia.', 'Atua para evitar retrabalho.'] },
            { nome: '7. COMPORTAMENTO E RELACIONAMENTO', itens: ['Mantém postura profissional no ambiente de trabalho.', 'Trata colegas e gestores com respeito.', 'Aceita feedbacks e busca melhoria contínua.', 'Trabalha bem em equipe.', 'Evita conflitos e mantém bom relacionamento.', 'Demonstra comprometimento com a empresa.'] }
        ]
    }
};\n`;

const re = /const FORMULARIOS_POR_DEPARTAMENTO = \{([\s\S]*?)^\};\n/m;
content = content.replace(re, novosTemplates);

fs.writeFileSync('./frontend/experiencia.js', content, 'utf8');
console.log('patched');
