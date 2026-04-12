const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const autorizacaoHTML = `
<p style="text-align: justify; font-size: 14px; line-height: 1.5;">Pelo presente instrumento, autorizo a empresa AMERICA RENTAL EQUIPAMENTOS LTDA, situada na Rua Saldo da Divisa, nº 97, CEP 07242-300, Parque Alvorada - Guarulhos SP, Inscrita no CNPJ sob o nº 03.434.448/0001-01, autorizo o desconto descrito abaixo:</p>
<br/>
<p style="font-size: 14px; line-height: 1.6;"><strong>Descrição:</strong> {MODAL_DESCRICAO}</p>
<p style="font-size: 14px; line-height: 1.6;"><strong>Valor:</strong> R$ {MODAL_VALOR}</p>
<p style="font-size: 14px; line-height: 1.6;"><strong>Parcelamento:</strong> ( {PARCELA_1} ) 1x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( {PARCELA_2} ) 2x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( {PARCELA_3} ) 3x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>- Valor Parcela: R$ {MODAL_VALOR_PARCELA}</b></p>
<br/><br/><br/><br/>
<div style="text-align: center; margin-top: 50px;">
    ___________________________________________________<br/>
    <b>{NOME_COMPLETO}</b><br/>
    CPF: {CPF}
</div>
`;

db.serialize(() => {
    db.run("INSERT OR REPLACE INTO geradores (nome, conteudo, variaveis, created_at) VALUES ('AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO', ?, '[]', CURRENT_TIMESTAMP)", autorizacaoHTML);
    console.log("Documents injected successfully");
});
