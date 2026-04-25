const fs = require('fs');
let content = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', 'utf8');

const adminForm = `'Administrativo': {
        titulo: 'AVALIAÇÃO SETOR ADMINISTRATIVO',
        secoes: [
            {
                nome: '1. DISCIPLINA E CUMPRIMENTO DE ROTINA',
                itens: [
                    'Evita faltas não justificadas.',
                    'Mantém baixo número de atrasos.',
                    'Comunica ausências ou atrasos com antecedência.',
                    'Cumpre horários e prazos do setor.',
                    'Segue a rotina diária administrativa.',
                    'Demonstra responsabilidade com suas atividades.'
                ]
            },
            {
                nome: '2. ORGANIZAÇÃO E CONTROLE DE ATIVIDADES',
                itens: [
                    'Mantém organização de documentos e informações.',
                    'Mantém arquivos físicos e digitais organizados.',
                    'Mantém o ambiente de trabalho organizado.',
                    'Controla prazos e demandas do dia a dia.',
                    'Evita perda de informações ou documentos.',
                    'Organiza suas atividades ao longo do dia.'
                ]
            },
            {
                nome: '3. PROCESSOS E SISTEMAS',
                itens: [
                    'Segue corretamente os processos internos.',
                    'Utiliza corretamente sistemas (ERP, planilhas, etc.).',
                    'Aprende novos sistemas com facilidade.',
                    'Cumpre fluxos e padrões definidos.',
                    'Preenche informações corretamente nos sistemas.',
                    'Demonstra facilidade para aprender novos processos.'
                ]
            },
            {
                nome: '4. ATENÇÃO A DETALHES E QUALIDADE',
                itens: [
                    'Demonstra atenção ao realizar tarefas.',
                    'Evita erros por falta de conferência.',
                    'Confere informações antes de finalizar atividades.',
                    'Mantém qualidade nas entregas.',
                    'Identifica possíveis erros ou inconsistências.',
                    'Atua com cuidado nas atividades realizadas.'
                ]
            },
            {
                nome: '5. COMUNICAÇÃO (INTERNA E COM CLIENTES)',
                itens: [
                    'Mantém comunicação clara com a equipe e outros setores.',
                    'Responde solicitações com agilidade.',
                    'Comunica problemas ou pendências rapidamente.',
                    'Atende clientes com educação e profissionalismo.',
                    'Explica informações de forma clara e objetiva.',
                    'Retorna solicitações dentro do prazo.'
                ]
            },
            {
                nome: '6. RESULTADOS E PROATIVIDADE',
                itens: [
                    'Cumpre prazos das atividades.',
                    'Demonstra iniciativa para resolver pendências.',
                    'Ajuda a equipe quando necessário.',
                    'Propõe melhorias simples nos processos.',
                    'Mantém produtividade no dia a dia.',
                    'Atua para evitar retrabalho.'
                ]
            },
            {
                nome: '7. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém postura profissional no ambiente de trabalho.',
                    'Trata colegas e gestores com respeito.',
                    'Aceita feedbacks e busca melhoria contínua.',
                    'Trabalha bem em equipe.',
                    'Evita conflitos e mantém bom relacionamento.',
                    'Demonstra comprometimento com a empresa.'
                ]
            }
        ]
    },`;

content = content.replace("'Ajudante Geral': {", adminForm + '\n    \'Ajudante Geral\': {');
fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/experiencia.js', content);
console.log('Admin form added');
