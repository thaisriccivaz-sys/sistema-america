const fs = require('fs');
const filePath = 'frontend/experiencia.js';

let content = fs.readFileSync(filePath, 'utf8');

// Remove literal \r text (backslash-r) que foi inserido erroneamente
// Estas sao linhas como "        ]\\r" que devem ser "        ]"
content = content.replace(/\\\r\n/g, '\r\n');
content = content.replace(/\\\r/g, '\r');

// Verifica se ainda há \\r problemáticos no texto (não em string literais do JS)
const problematic = content.match(/\\\r/g);
if (problematic) {
    console.log('Ainda tem problemas:', problematic.length);
} else {
    console.log('Arquivo limpo!');
}

// Agora encontra onde termina o objeto Motorista e insere Logística
const motoristaClosure = `        ]
    }
};`;

const logisticaBlock = `        ]
    },
    'Logística': {
        titulo: 'AVALIAÇÃO SETOR DE LOGÍSTICA',
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
                nome: '2. CUIDADO COM VEÍCULOS E EQUIPAMENTOS',
                itens: [
                    'Demonstra cuidado ao conduzir e manobrar o veículo.',
                    'Mantém a limpeza e organização do veículo ao final da rota.',
                    'Comunica imediatamente qualquer falha mecânica ou problema no veículo.',
                    'Utiliza corretamente e preserva mangueiras, conexões e acessórios da operação.',
                    'Evita danos ou avarias por descuido no manuseio de equipamentos.',
                    'Zela pelo patrimônio da empresa durante todas as etapas da operação.'
                ]
            },
            {
                nome: '3. OPERAÇÃO E QUALIDADE DO SERVIÇO',
                itens: [
                    'Executa as atividades operacionais seguindo o padrão da empresa.',
                    'Demonstra atenção e cuidado com a segurança no manuseio de resíduos.',
                    'Mantém organização e limpeza do local após finalizar a operação.',
                    'Utiliza corretamente os EPIs obrigatórios durante as operações.',
                    'Demonstra proatividade ao retornar cedo da rota.',
                    'Evita desperdício de insumos e utiliza os recursos com consciência.'
                ]
            },
            {
                nome: '4. PROCESSOS, CONTROLES E DOCUMENTOS',
                itens: [
                    'Demonstra facilidade na utilização das ferramentas e sistemas.',
                    'Garante que o registro do atendimento seja feito corretamente no aplicativo.',
                    'Está atento ao resumo da rota antes da saída pela manhã.',
                    'Comunica a logística antes de registrar qualquer falha no sistema.',
                    'Responde mensagens e ligações de forma ágil e direta.',
                    'Preenche corretamente os controles e checklists exigidos.'
                ]
            },
            {
                nome: '5. COMPORTAMENTO E RELACIONAMENTO',
                itens: [
                    'Mantém comunicação cordial e respeitosa com a equipe e liderança.',
                    'Aceita orientações e feedback sem resistência, buscando melhorar.',
                    'Mantém postura e apresentação adequadas (uniforme limpo, higiene e comportamento profissional).',
                    'Mantém postura profissional com o cliente, evitando conflitos e preservando a imagem da empresa.',
                    'Respeita a hierarquia de modo geral.',
                    'Tem bom comportamento em confraternizações e reuniões.'
                ]
            }
        ]
    }
};`;

// Verifica se Logística já existe
if (content.includes("'Logística'")) {
    console.log('Logística já existe no arquivo.');
} else {
    // Substitui o fechamento do objeto pelo bloco com Logística
    if (content.includes(motoristaClosure)) {
        content = content.replace(motoristaClosure, logisticaBlock);
        console.log('Formulário de Logística inserido com sucesso!');
    } else {
        console.log('ATENÇÃO: Não encontrou o padrão de fechamento esperado. Verificar manualmente.');
        console.log('Procurando padrão alternativo...');
        // Tenta com \r\n
        const alt = motoristaClosure.replace(/\n/g, '\r\n');
        const altBlock = logisticaBlock.replace(/\n/g, '\r\n');
        if (content.includes(alt)) {
            content = content.replace(alt, altBlock);
            console.log('Formulário de Logística inserido (padrão CRLF)!');
        } else {
            console.log('FALHOU - padrão não encontrado');
        }
    }
}

fs.writeFileSync(filePath, content);
console.log('Arquivo salvo.');
