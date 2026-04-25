const fs = require('fs');

// === Load logo as base64 ===
const logoBase64 = fs.readFileSync('frontend/assets/logo-header.png').toString('base64');
const logoDataURI = `data:image/png;base64,${logoBase64}`;

let app = fs.readFileSync('frontend/app.js', 'utf8');

// ========================================
// FINDING THE BOUNDARIES OF THE SANTANDER HTML TEMPLATE
// ========================================
const TEMPLATE_START = 'const html = `<!DOCTYPE html>';
const TEMPLATE_END = '    // Salvar o HTML globalmente para poder via via "Ver Documento"';

const startIdx = app.indexOf(TEMPLATE_START);
const endIdx = app.indexOf(TEMPLATE_END);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find template boundaries!');
    console.error('Start found:', startIdx !== -1);
    console.error('End found:', endIdx !== -1);
    process.exit(1);
}

const before = app.substring(0, startIdx);
const after = app.substring(endIdx);

const newTemplate = `const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pedido de Abertura de Conta - \${colab.nome_completo}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 20px; }
  .page { max-width: 750px; margin: 0 auto; }
  .logo-area { text-align: center; margin-bottom: 16px; }
  .logo-area img { height: 80px; max-width: 280px; object-fit: contain; }
  h1.titulo { text-align: center; font-size: 13pt; font-weight: 900; background: #e8e8e8; border: 1.5px solid #ccc; padding: 8px 0; margin: 14px 0 20px 0; letter-spacing: 1px; }
  .colab-label { font-size: 10pt; font-weight: 900; margin: 10px 0 4px; }
  .colab-nome { font-size: 14pt; font-weight: 900; margin-bottom: 18px; }
  p.body-text { font-size: 9.5pt; margin-bottom: 10px; text-align: justify; line-height: 1.5; }
  ul.docs { font-size: 9.5pt; margin: 4px 0 14px 20px; line-height: 1.7; }
  .data-box { border: 1.5px solid #555; margin: 18px 0; }
  .data-box-title { background: #d0d0d0; font-weight: 900; font-size: 10pt; padding: 5px 10px; border-bottom: 1.5px solid #555; }
  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 10px 12px; }
  .data-line { font-size: 9pt; margin: 2px 0; }
  .data-line b { font-weight: 700; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 50px; align-items: flex-end; }
  .assin-block { text-align: center; width: 45%; }
  .assin-line { border-top: 1px solid #000; padding-top: 6px; margin-top: 55px; font-size: 9pt; }
  .assin-label { font-size: 9pt; color: #333; margin-top: 3px; }
  @media print {
    body { padding: 8px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Logo real da América Rental -->
  <div class="logo-area">
    <img src="${logoDataURI}" alt="América Rental">
  </div>

  <h1 class="titulo">PEDIDO DE ABERTURA DE CONTA</h1>

  <div class="colab-label">COLABORADOR:</div>
  <div class="colab-nome">\${fmt(colab.nome_completo)}</div>

  <p class="body-text">Prezado (a)</p>
  <p class="body-text">Escolhemos o Santander como nosso parceiro para o processamento do pagamento do seu salário.</p>
  <p class="body-text">Conforme determinam as Resoluções nº 3.402 e 3.424/06, do Conselho Monetário Nacional, seu salário será creditado em uma conta de registro, denominada 'conta salário', que não é movimentável por cheque, não admite créditos de outras naturezas que não salariais e possui serviços limitados.</p>
  <p class="body-text">Você também poderá aproveitar as vantagens de ter uma <b>CONTA CORRENTE</b> e transferir automaticamente o seu salário, possibilitando assim fazer uso de diversos outros serviços e condições diferenciadas oferecidas pelo Santander, que acreditamos que tenham um valor diferenciado para você. Para conhecer as vantagens de uma conta corrente compareça a uma agência até a data da sua admissão e apresente o original e uma cópia simples (frente e verso) dos documentos abaixo indicados:</p>

  <ul class="docs">
    <li>Esta carta;</li>
    <li>Documento de identidade com foto;</li>
    <li>CPF – Cadastro de Pessoa Física;</li>
    <li>Comprovante de endereço residencial (onde prefere receber correspondência) com prazo inferior a 60 dias da data de vencimento. Ex.: conta de luz, de água, de gás, de telefone fixo, IPTU;</li>
    <li>Se casado (a), apresentar nome completo do cônjuge, número do CPF, data de nascimento e data do casamento.</li>
  </ul>

  <p class="body-text">Se a sua opção for apenas pela utilização da conta salário, você poderá realizar a portabilidade de salário para outra instituição ou utilizar o cartão de débito, fornecido sem custo*, para os serviços mensais gratuitos** disponíveis para a conta salário. Procure a agência Santander de sua conveniência e fale com o gerente que está apto a orientar-lo e a prestar todas as informações necessárias para a movimentação da sua conta.</p>

  <!-- Dados do colaborador -->
  <div class="data-box">
    <div class="data-box-title">Dados do Colaborador</div>
    <div class="data-grid">
      <div class="data-line">Declaramos que o Sr (a) <b>\${fmt(colab.nome_completo)}</b></div>
      <div class="data-line">CPF: <b>\${fmt(colab.cpf)}</b>&nbsp;&nbsp;&nbsp;Admissão: <b>\${admissaoFmt}</b></div>
      <div class="data-line">Endereço: <b>\${enderecoPuro}</b></div>
      <div class="data-line">Nº <b>\${numero}</b>&nbsp;&nbsp;Complemento: <b>\${complemento}</b></div>
      <div class="data-line">Bairro: <b>\${bairro}</b></div>
      <div class="data-line">Cidade: <b>\${cidade}</b>&nbsp;&nbsp;&nbsp;Estado: <b>\${estado}</b>&nbsp;&nbsp;&nbsp;CEP: <b>\${cep}</b></div>
      <div class="data-line">Cargo: <b>\${fmt(colab.cargo)}</b></div>
      <div class="data-line">Salário Mensal: <b>\${salario}</b></div>
    </div>
  </div>

  <!-- Assinaturas -->
  <div class="assinaturas">
    <!-- Bloco empresa: linha + nome abaixo (espaço para carimbo físico acima) -->
    <div class="assin-block">
      <div class="assin-line">
        América Rental
      </div>
    </div>
    <!-- Bloco colaborador -->
    <div class="assin-block">
      <div class="assin-line">\${fmt(colab.nome_completo)}</div>
    </div>
  </div>

</div>
</body>
</html>\`;

`;

app = before + newTemplate + after;
fs.writeFileSync('frontend/app.js', app);
console.log('Template rewritten. Checking...');
console.log('Logo embedded:', app.includes('data:image/png;base64,'));
console.log('América Rental sig:', app.includes('América Rental\n      </div>'));
