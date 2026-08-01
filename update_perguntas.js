const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'avaliacoes_perguntas.js');
let content = fs.readFileSync(filePath, 'utf8');

const newSatisfacao = `{
        motorista: {
            'Ambiente de trabalho': [
                'Como você avalia seu ambiente de trabalho no dia a dia?',
                'Você se sente respeitado pelos colegas e líderes?',
                'A comunicação entre você e sua liderança é clara e eficiente?',
                'O ambiente físico (pátio, base, locais de apoio) está adequado e limpo?'
            ],
            'Condições de trabalho e equipamentos': [
                'Os veículos/equipamentos fornecidos estão em boas condições?',
                'Você tem os EPIs necessários para realizar seu trabalho com segurança?',
                'Os veículos são consertados com agilidade após reportes de problemas?',
                'A estrutura para realizar seu trabalho é eficiente?'
            ],
            'Organização e Rotina de Trabalho': [
                'As rotas/tarefas estão bem planejadas e equilibradas?',
                'O volume de trabalho diário está dentro do que você considera justo?',
                'Você sente que as informações do dia a dia são comunicadas de forma clara?',
                'Os horários e prazos estão sendo respeitados?'
            ],
            'Comunicação e Liderança': [
                'A comunicação com a liderança é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas ao supervisor/gerente?',
                'A liderança demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido da sua liderança direta?'
            ],
            'Crescimento e Desenvolvimento': [
                'Os treinamentos recebidos são suficientes para garantir qualidade e segurança nas atividades?',
                'Você tem interesse em aprender algo novo na empresa?',
                'Você já recebeu algum feedback sobre seu desempenho e possibilidade de evolução?',
                'A empresa incentiva o desenvolvimento dos colaboradores com treinamentos ou novas funções?'
            ],
            'Satisfação e Motivação': [
                'Você está satisfeito em trabalhar na América Rental?',
                'O ambiente e as condições de trabalho te motivam a continuar?',
                'Você se sente valorizado pelo trabalho que realiza no dia a dia?',
                'Qual nota você daria para sua experiência aqui na empresa?'
            ],
            'Clareza de Papéis e Responsabilidades': [
                'Você entende claramente o que precisa ser feito em cada cliente/serviço?',
                'As tarefas atribuídas a você fazem sentido dentro da sua função?',
                'Você sabe a quem recorrer quando tem dúvidas sobre suas atribuições?',
                'Há alinhamento entre o que te pedem e o que você executa no dia a dia?'
            ],
            'Processos e Fluxo de Trabalho': [
                'Os processos internos e o uso do APP facilitam seu trabalho?',
                'As demandas urgentes são tratadas com organização e prioridade?',
                'Existe clareza sobre os procedimentos e padrões a serem seguidos?',
                'O fluxo de informações entre os setores funciona bem?'
            ],
            'Colaboração em Equipe': [
                'Como você avalia o relacionamento da equipe durante as atividades?',
                'A equipe trabalha de forma colaborativa e com espírito de equipe?',
                'Há apoio entre os colegas para resolver problemas do dia a dia?',
                'Você sente que pode contar com a equipe quando precisa?'
            ],
            'Saúde e Bem-Estar': [
                'A empresa oferece um ambiente que promove o bem-estar físico e mental?',
                'Você se sente apoiado em questões relacionadas à sua saúde?',
                'A carga de estresse no dia a dia é gerenciável?',
                'Você acredita que a empresa se preocupa com a qualidade de vida dos colaboradores?'
            ]
        },
        manutencao: {
            'Ambiente de trabalho': [
                'Como você avalia seu ambiente de trabalho no dia a dia?',
                'Você se sente respeitado pelos colegas e líderes?',
                'A comunicação entre você e sua liderança é clara e eficiente?',
                'O ambiente físico (oficina, locais de apoio) está adequado e limpo?'
            ],
            'Condições de trabalho e equipamentos': [
                'As ferramentas e equipamentos fornecidos estão em boas condições?',
                'Você tem os EPIs necessários para realizar seu trabalho com segurança?',
                'Os equipamentos e ferramentas são consertados/substituídos com agilidade?',
                'A estrutura das oficinas são completas e em boas condições?'
            ],
            'Organização e Rotina de Trabalho': [
                'As rotinas de manutenção preventiva e corretiva estão bem planejadas?',
                'O volume de trabalho diário está dentro do que você considera justo?',
                'Você sente que as informações de novos serviços são comunicadas de forma clara?',
                'Como você considera a frequência de horas extras necessária para cumprir a demanda?'
            ],
            'Comunicação e Liderança': [
                'A comunicação com a liderança é clara e objetiva no seu dia a dia?',
                'Você se sente confortável para levar sugestões ou dúvidas à liderança?',
                'A liderança demonstra acompanhamento e apoio nas rotinas da equipe?',
                'Como você avalia o suporte recebido da sua liderança direta?'
            ],
            'Crescimento e Desenvolvimento': [
                'Os treinamentos recebidos são suficientes para garantir qualidade e segurança nas atividades?',
                'Você tem interesse em aprender algo novo na empresa?',
                'Você sente necessidade de reciclagem sobre sua função?',
                'A empresa incentiva o desenvolvimento com treinamentos ou novas funções?'
            ],
            'Satisfação e Motivação': [
                'Como você avalia seu nível de satisfação trabalhando na empresa atualmente?',
                'Você se sente valorizado pelo trabalho que realiza no dia a dia?',
                'Como você avalia o equilíbrio entre sua vida pessoal e profissional?',
                'Você acredita que há reconhecimento quando você se destaca ou faz algo além do esperado?'
            ],
            'Clareza de Papéis e Responsabilidades': [
                'Existe clareza sobre os prazos esperados para cada tipo de reparo?',
                'As tarefas atribuídas a você fazem sentido dentro da sua função?',
                'Você sabe a quem recorrer quando tem dúvidas técnicas?',
                'Há alinhamento entre o que te pedem e o que você executa no dia a dia?'
            ],
            'Processos e Fluxo de Trabalho': [
                'Os processos internos para solicitar peças e aprovações estão bem definidos?',
                'As demandas urgentes são tratadas com organização e prioridade?',
                'O fluxo entre a manutenção e outros setores é eficiente?',
                'Existe padronização nos reparos e procedimentos?'
            ],
            'Colaboração em Equipe': [
                'Como você avalia o relacionamento da equipe de manutenção?',
                'A equipe trabalha de forma colaborativa para resolver problemas complexos?',
                'Há apoio entre os colegas para compartilhar conhecimentos técnicos?',
                'Você sente que pode contar com a equipe quando precisa?'
            ],
            'Saúde e Bem-Estar': [
                'A empresa oferece um ambiente seguro e que promove a saúde no trabalho?',
                'Você se sente apoiado em questões relacionadas à sua saúde?',
                'A carga de desgaste físico no dia a dia é gerenciável?',
                'Você acredita que a empresa se preocupa com a qualidade de vida da equipe?'
            ]
        },
        escritorio: {
            'Ambiente de trabalho': [
                'Como você avalia o ambiente de trabalho no escritório?',
                'Você se sente respeitado(a) pelos colegas e pela liderança?',
                'O ambiente físico (escritório, locais de apoio) está adequado e limpo?',
                'O clima organizacional é positivo e colaborativo?'
            ],
            'Condições de trabalho e equipamentos': [
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
            'Saúde e Bem-Estar': [
                'A empresa oferece um ambiente que promove o bem-estar físico e mental?',
                'Você se sente apoiado(a) em questões relacionadas à sua saúde?',
                'A carga de estresse no dia a dia é gerenciável?',
                'Você acredita que a empresa se preocupa com a qualidade de vida dos colaboradores?'
            ]
        }
    }`;

const satisfacaoRegex = /satisfacao:\s*\{[\s\S]*?\},[\s\n]*desempenho:/;
if (satisfacaoRegex.test(content)) {
    content = content.replace(satisfacaoRegex, `satisfacao: ${newSatisfacao},\n    desempenho:`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Arquivo atualizado com sucesso!");
} else {
    console.error("Não foi possível encontrar o bloco satisfacao.");
}
