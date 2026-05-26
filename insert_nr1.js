const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const html = `
<p style="text-align: center; font-weight: bold; font-size: 1.2rem; margin-bottom: 2rem;">ORDEM DE SERVIÇO - NR1</p>

<p style="font-weight: bold; text-decoration: underline;">DESCRIÇÃO DA ATIVIDADE</p>
<p style="text-transform: uppercase;">FAZER SUCÇÃO COM EQUIPAMENTOS APROPRIADOS DOS DEJETOS DOS BANHEIROS, REPOR OS DESODORANTES, EFETUAR LAVAGEM E SECAGEM DOS MESMOS E EFETUAR A CARGA E DESCARGA DOS BANHEIROS QUÍMICOS NOS CAMINHÕES E NOS LOCAIS DEFINIDOS PELO SEU SUPERIOR IMEDIATO, NORMAS E PROCEDIMENTOS INTERNOS.</p>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">IDENTIFICAÇÃO DOS RISCOS AMBIENTAIS</p>
<p style="font-weight: bold;">RISCOS / FONTES GERADORAS</p>
<ul style="list-style-type: none; padding-left: 0; margin-top: 0.5rem; line-height: 1.6;">
    <li><b>Físicos:</b> Ruído peculiar a ambientes externos e umidade da lavagem dos sanitários.</li>
    <li><b>Químicos:</b> Produtos saneantes: desinfetantes, bactericida e desodorização sanitária.</li>
    <li><b>Biológicos:</b> Sucção de dejetos e limpeza de sanitários químicos.</li>
    <li><b>Ergonômicos:</b> intensidade pequena (possível postura inadequada, possível stress).</li>
    <li><b>Acidentes:</b> intensidade pequena (possíveis acidentes de quedas, cortes e perfurações e outros).</li>
</ul>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">MEDIDAS PREVENTIVAS</p>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;" border="1">
    <thead>
        <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; text-align: left;">EPI’s (Equipamentos de Proteção Individual)</th>
            <th style="padding: 8px; text-align: left;">OBSERVAÇÕES</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="padding: 8px;">ÓCULOS DE PROTEÇÃO, LUVA DE NEOLATEX, CAPACETE COM JUGULAR, BOTA TIPO B COM BICO DE AÇO, UNIFORME COMPLETO, PROTETOR SOLAR, PROTETOR AUDITIVO, CAPA DE CHUVA.</td>
            <td style="padding: 8px;">SEM MAIS</td>
        </tr>
    </tbody>
</table>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">MEDIDAS ADMINISTRATIVAS</p>
<ul style="margin-top: 0.5rem; line-height: 1.6;">
    <li>TREINAMENTO E MONITORAMENTO DAS ATIVIDADES.</li>
    <li>ORIENTAÇÕES DE SEGURANÇA DOS LOCAIS DE PRESTAÇÃO DE SERVIÇOS.</li>
</ul>

<p style="margin-top: 2rem;">Declaro ter recebido as instruções de Segurança e Saúde no Trabalho de acordo com a NR-1, bem como os EPIs necessários e comprometo-me a cumprir todas as normas estabelecidas.</p>
`;

db.get('SELECT * FROM geradores WHERE nome = ?', ['NR1'], (err, row) => {
    if (!row) {
        db.run('INSERT INTO geradores (nome, conteudo) VALUES (?, ?)', ['NR1', html], (err) => {
            if (err) console.log(err.message);
            else console.log('NR1 gerador adicionado com sucesso!');
        });
    } else {
        console.log('NR1 gerador já existe.');
    }
});
