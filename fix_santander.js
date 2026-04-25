const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// The replacement for the Santander function
const OLD_SANTANDER_FN = `window.gerarFichaSantander = async function() {
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) { alert('Selecione um colaborador primeiro.'); return; }

    const fmt = (v) => v || '—';
    const hoje = new Date();
    const dataHoje = hoje.toLocaleDateString('pt-BR');
    const mesExtenso = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const anoStr = hoje.getFullYear();
    
    // Salário formatado
    const salario = colab.salario ? parseFloat(colab.salario).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '—';
    
    // Endereço dividido
    let endereco = '—', numero = '—', complemento = '—', bairro = '—', cidade = '—', estado = '—', cep = '—';
    if (colab.endereco_completo) {
        // Tentar separar (algo simples, pois é texto livre no BD atual)
        const parts = colab.endereco_completo.split(',');
        endereco = parts[0] || colab.endereco_completo;
        if (parts.length > 1) numero = parts[1].trim().split(' ')[0];
    }
    
    // Data admissão formatada
    let admissaoFmt = '—';
    if (colab.data_admissao) {
        const d = new Date(colab.data_admissao);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        admissaoFmt = d.toLocaleDateString('pt-BR');
    }

    const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pedido de Abertura de Conta - \${colab.nome_completo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 20px; }
  .page { max-width: 750px; margin: 0 auto; }
  .logo-area { text-align: center; margin-bottom: 10px; }
  .logo-area img { height: 60px; }
  .logo-text { font-size: 28pt; font-weight: 900; font-family: serif; letter-spacing: -1px; }
  .logo-sub { font-size: 7pt; color: #555; letter-spacing: 2px; }
  h1.titulo { text-align: center; font-size: 13pt; font-weight: 900; background: #e8e8e8; border: 1.5px solid #ccc; padding: 6px 0; margin: 12px 0; letter-spacing: 1px; }
  .colab-label { font-size: 10pt; font-weight: 900; margin: 10px 0 6px; }
  .colab-nome { font-size: 13pt; font-weight: 900; }
  p.body-text { font-size: 9.5pt; margin-bottom: 8px; text-align: justify; line-height: 1.5; }
  ul.docs { font-size: 9.5pt; margin: 4px 0 10px 20px; line-height: 1.6; }
  .data-box { border: 1.5px solid #555; margin: 14px 0; }
  .data-box-title { background: #d0d0d0; font-weight: 900; font-size: 9.5pt; padding: 4px 10px; border-bottom: 1.5px solid #555; }
  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 8px 10px; }
  .data-line { font-size: 9pt; margin: 1.5px 0; }
  .data-line b { font-weight: 700; }
  .rh-section { margin: 16px 0; font-size: 9.5pt; line-height: 1.7; }
  .city-date { margin: 20px 0 30px; font-size: 10pt; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 40px; }
  .assin-block { text-align: center; width: 45%; }
  .assin-line { border-top: 1.5px solid #000; padding-top: 4px; margin-top: 40px; font-size: 9pt; }
  .bank-box { border: 1.5px solid #555; margin-top: 20px; }
  .bank-box-title { background: #d0d0d0; font-weight: 900; font-size: 9.5pt; padding: 4px 10px; border-bottom: 1.5px solid #555; }
  .bank-field { display: flex; align-items: flex-end; padding: 6px 10px; border-bottom: 1px solid #ccc; gap: 8px; font-size: 9.5pt; }
  .bank-field:last-child { border-bottom: none; }
  .bank-field-line { flex: 1; border-bottom: 1px solid #000; min-height: 18px; }
  .footnote { font-size: 7.5pt; color: #333; margin-top: 12px; text-align: justify; line-height: 1.4; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Logo -->
  <div class="logo-area">
    <div class="logo-text">AMÉRIC<span style="color:#cc3300;">A</span> <span style="color:#cc3300; font-style:italic;">Rental</span></div>
    <div class="logo-sub">desde 1999</div>
  </div>

  <h1 class="titulo">PEDIDO DE ABERTURA DE CONTA</h1>

  <div class="colab-label">COLABORADOR:</div>
  <div class="colab-nome">\${fmt(colab.nome_completo)}</div>

  <br>
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
      <div class="data-line">Endereço: <b>\${endereco}</b></div>
      <div class="data-line">Nº <b>\${numero}</b>&nbsp;&nbsp;Complemento: <b>\${complemento}</b></div>
      <div class="data-line">Bairro: <b>\${bairro}</b></div>
      <div class="data-line">Cidade: <b>\${cidade}</b>&nbsp;&nbsp;&nbsp;Estado: <b>\${estado}</b>&nbsp;&nbsp;&nbsp;CEP: <b>\${cep}</b></div>
      <div class="data-line">Cargo: <b>\${fmt(colab.cargo)}</b></div>
      <div class="data-line">Salário Mensal: <b>\${salario}</b></div>
      <div class="data-line">Celular: <b>\${fmt(colab.celular)}</b></div>
      <div class="data-line">E-mail: <b>\${fmt(colab.email)}</b></div>
    </div>
  </div>

  <!-- RH -->
  <div class="rh-section">
    <b>Responsável de RH: Juliene de Camargo Corrêa</b><br>
    Telefone: - (11) 99025-2820 ou (11) 2499-3353<br>
    <b>EMPRESA: America Rental Equipamentos LTDA</b><br>
    <b>CNPJ: 03.434.448/0001-01</b>
  </div>

  <!-- Data e local -->
  <div class="city-date">
    Guarulhos, _______________, ____________________________ de 20_______.
  </div>

  <!-- Assinaturas -->
  <div class="assinaturas">
    <div class="assin-block">
      <img style="height:45px; margin-bottom:4px;" src="" onerror="this.style.display='none'">
      <div class="assin-line">
        AMÉRIC<span style="color:#cc3300;">A</span> <span style="color:#cc3300; font-style:italic;">Rental</span><br>
        AMÉRICA RENTAL EQUIPAMENTOS LTDA<br>
        CNPJ: 03.434.448/0001-01
      </div>
      <div style="margin-top:4px;font-size:8pt;border-top:1px solid #000; padding-top:3px;">AMÉRICA RENTAL EQUIPAMENTOS LTDA</div>
    </div>
    <div class="assin-block">
      <div class="assin-line">\${fmt(colab.nome_completo)}</div>
    </div>
  </div>

  <!-- Rodapé com notas -->
  <p class="footnote">*Exceto nos casos de pedidos de reposição formulados pelo cliente decorrentes de perda, roubo, danificação ou outros motivos não imputáveis ao Banco. ** Serviços gratuitos: duas consultas ao saldo de sua conta, dois extratos dos últimos 30 dias, um DOC/TED pelo valor total do crédito e cinco saques (por evento de crédito). A utilização acima desses limites ou de quaisquer outros serviços estará sujeita à cobrança de tarifas.</p>

  <!-- Banco -->
  <div class="bank-box">
    <div class="bank-box-title">Para uso exclusivo do Banco Santander:</div>
    <div class="bank-field">
      <span style="white-space:nowrap;">Nome e Número da Agência: Guarulhos</span>
      <div class="bank-field-line"></div>
    </div>
    <div class="bank-field">
      <span>Número da Conta:</span>
      <div class="bank-field-line"></div>
    </div>
    <div class="bank-field">
      <span>Responsável pelo atendimento:</span>
      <div class="bank-field-line"></div>
    </div>
  </div>

  <div class="no-print" style="text-align:center; margin-top: 24px;">
    <button onclick="window.print()" style="background:#ec0000;color:#fff;border:none;padding:12px 32px;font-size:1rem;font-weight:700;border-radius:8px;cursor:pointer;">🖨️ Imprimir</button>
  </div>
</div>
</body>
</html>\`;

    // Abrir janela de impressão
    const win = window.open('', '_blank', 'width=820,height=900');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);

    // Registrar que foi gerado
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;

        // Salvar data no backend e mostrar toast
        try { await apiPut(\`/colaboradores/\${colab.id}/admissao\`, { santander_ficha_data: colab.santander_ficha_data }); } catch(e) {}
        if (typeof showToast === 'function') showToast('Ficha Santander gerada com sucesso!', 'success');
    }
};`;

const NEW_SANTANDER_FN = `window.gerarFichaSantander = async function() {
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (!colab) { alert('Selecione um colaborador primeiro.'); return; }

    const fmt = (v) => v || '—';
    const hoje = new Date();
    const dataHoje = hoje.toLocaleDateString('pt-BR');
    const mesExtenso = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const anoStr = hoje.getFullYear();
    
    // Salário formatado
    const salario = colab.salario ? parseFloat(colab.salario).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '—';
    
    // Endereço e Cidade extraídos corretamente do endereço do Colaborador (agora separado por vírgula e traço)
    let enderecoPuro = fmt(colab.endereco_completo);
    let numero = '—', complemento = '—', bairro = '—', cidade = '—', estado = '—', cep = '—';
    if (colab.endereco_completo) {
        // Separação típica: "Rua X, 123, Bairro, Cidade - SP, CEP"
        const parts = colab.endereco_completo.split(',');
        enderecoPuro = parts[0] ? parts[0].trim() : '—';
        if (parts.length > 1) {
            const part2 = parts[1].trim(); 
            numero = part2.split(' ')[0] || part2;
            if (part2.includes(' ')) complemento = part2.substring(numero.length).trim();
        }
        if (parts.length > 2) bairro = parts[2].trim();
        if (parts.length > 3) {
            const cidadeEst = parts[3].trim().split('-');
            if (cidadeEst.length === 2) { cidade = cidadeEst[0].trim(); estado = cidadeEst[1].trim(); }
            else { cidade = parts[3].trim(); }
        }
        if (colab.cep) cep = colab.cep;
    }
    
    // Data admissão formatada
    let admissaoFmt = '—';
    if (colab.data_admissao) {
        const d = new Date(colab.data_admissao);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        admissaoFmt = d.toLocaleDateString('pt-BR');
    }

    const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pedido de Abertura de Conta - \${colab.nome_completo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 20px; }
  .page { max-width: 750px; margin: 0 auto; }
  .logo-area { text-align: center; margin-bottom: 20px; }
  .logo-area img { height: 60px; }
  .logo-text { font-size: 32pt; font-weight: 900; font-family: 'Times New Roman', serif; letter-spacing: -1px; }
  .logo-sub { font-size: 8pt; color: #555; letter-spacing: 2px; }
  h1.titulo { text-align: center; font-size: 15pt; font-weight: 900; background: #eaeaea; border: 1px solid #ccc; padding: 12px 0; margin: 15px 0 25px 0; letter-spacing: 1px; }
  .colab-label { font-size: 10pt; font-weight: 900; margin: 10px 0 6px; }
  .colab-nome { font-size: 16pt; font-weight: 900; margin-bottom: 20px; }
  p.body-text { font-size: 9.5pt; margin-bottom: 12px; text-align: justify; line-height: 1.5; }
  ul.docs { font-size: 9.5pt; margin: 4px 0 15px 20px; line-height: 1.8; }
  .data-box { border: 1.5px solid #555; margin: 20px 0; background:#f9f9f9; }
  .data-box-title { background: #dcdcdc; font-weight: 900; font-size: 10.5pt; padding: 6px 12px; border-bottom: 1.5px solid #555; }
  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 12px 12px; }
  .data-line { font-size: 9.5pt; margin: 3px 0; }
  .data-line b { font-weight: 700; }
  .rh-section { margin: 16px 0; font-size: 9.5pt; line-height: 1.7; display:none; } /* Retirado seções extras nòo exibidas no anexo */
  .city-date { margin: 25px 0 45px; font-size: 10pt; font-weight: 700; color: #333; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 40px; align-items: flex-end; }
  
  .assin-block { text-align: center; width: 48%; }
  .assin-block-company { text-align: center; width: 48%; }
  
  .assin-line { border-top: 1px solid #000; padding-top: 6px; font-size: 9.5pt; font-weight:bold; margin-top: 50px;}
  
  /* A área de assinatura da empresa fica sem linha (p/ carimbo) e com texto centralizado formatado */
  .carimbo-area { height: 75px; width: 100%; border: 1px dashed transparent; margin-bottom: 2px; }
  .company-sig-text { font-size: 11pt; color: #000; text-align:center; font-family: 'Arial', sans-serif;}

  .bank-box { border: 1px solid #555; margin-top: 25px; }
  .bank-box-title { background: #dcdcdc; font-weight: 900; font-size: 9.5pt; padding: 6px 12px; border-bottom: 1px solid #555; }
  .bank-field { display: flex; align-items: flex-end; padding: 8px 12px; border-bottom: 1px solid #ccc; gap: 8px; font-size: 9.5pt; margin-bottom:5px;}
  .bank-field:last-child { border-bottom: none; }
  .bank-field-line { flex: 1; border-bottom: 1px solid #000; min-height: 18px; }
  
  .footnote { font-size: 7pt; color: #555; margin-top: 15px; text-align: justify; line-height: 1.4; }
  
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Logo -->
  <div class="logo-area">
    <div class="logo-text">AMÉRIC<span style="color:#cc3300;">A</span> <span style="color:#cc3300; font-style:italic;">Rental</span></div>
    <div class="logo-sub">desde 1999</div>
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

  <div style="height: 10px;"></div>

  <!-- Assinaturas -->
  <div class="assinaturas">
    <div class="assin-block-company">
      <div class="carimbo-area"></div>
      <div class="company-sig-text">
        AMÉRIC<span style="color:#cc3300;">A</span> <span style="color:#cc3300; font-style:italic;">Rental</span><br>
        AMÉRICA RENTAL EQUIPAMENTOS LTDA<br>
        CNPJ: 03.434.448/0001-01
      </div>
    </div>
    <div class="assin-block">
      <div class="assin-line">\${fmt(colab.nome_completo)}</div>
    </div>
  </div>

</div>
</body>
</html>\`;

    // Salvar o HTML globalmente para poder via via "Ver Documento"
    window._santanderPreVHtml = html;

    // Registrar no backend / interface
    if (colab) {
        colab.santander_ficha_data = new Date().toISOString();
        const log = document.getElementById('santander-status-log');
        const logText = document.getElementById('santander-status-text');
        
        if (log) log.style.display = 'block';
        if (logText) logText.textContent = \`Ficha gerada em \${new Date().toLocaleString('pt-BR')}\`;
        
        // Exibe o botão de visualização
        const btnVer = document.getElementById('btn-ver-santander');
        if (btnVer) btnVer.style.display = 'flex';

        // Atualizar visual da interface para 100% no step 2 se tiver função compatível (do fix_admissao)
        if (window._admissaoChecklist && window._admissaoChecklist[colab.id]) {
            window._admissaoChecklist[colab.id]['santander'] = 100;
            // Opcional: Atualizar a exibição das bolinhas de progresso
            const elPc = document.getElementById('step-2-pc');
            if (elPc) {
                 elPc.innerHTML = '<i class="ph ph-check" style="font-size:12px"></i>';
                 elPc.style.background = '#22c55e';
            }
            window._recalculateAdmissaoFinalProg();
        }

        try { await window.apiPut(\`/colaboradores/\${colab.id}/admissao\`, { santander_ficha_data: colab.santander_ficha_data }); } catch(e) {}
        
        if (typeof showToast === 'function') {
            showToast('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.', 'success');
        } else alert('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.');
    }
};

window.verFichaSantander = function() {
    if (!window._santanderPreVHtml) {
        alert("Gere o documento primeiro."); return;
    }
    const html = window._santanderPreVHtml;
    // Abrir iframe preview / nova janela
    const win = window.open('', '_blank', 'width=820,height=900');
    win.document.write(html);
    win.document.close();
    win.focus();
    
    // Adicionar pequeno delay para print popup ao visualizar
    setTimeout(() => {
        // Option popup is better UI if not auto print, but we leave it to the user.
    }, 500);
};

// Funçao mockup caso nòo exista _recalculateAdmissaoFinalProg
if (typeof window._recalculateAdmissaoFinalProg !== 'function') {
    window._recalculateAdmissaoFinalProg = function() {
        const bar = document.getElementById('admissao-progress-bar');
        const pc = document.getElementById('admissao-pc-total');
        if(bar) bar.style.width = '30%';
    }
}
`;

if (app.includes(OLD_SANTANDER_FN)) {
    app = app.replace(OLD_SANTANDER_FN, NEW_SANTANDER_FN);
    fs.writeFileSync('frontend/app.js', app);
    console.log("Santander function replaced successfully!");
} else {
    // If exact replace fails, try index slicing
    const startIdx = app.indexOf('window.gerarFichaSantander = async function() {');
    const endIdxStr = "window.renderMultasMotoristaTab = async function";
    const endIdx = app.indexOf(endIdxStr);
    
    if (startIdx !== -1 && endIdx !== -1) {
        app = app.substring(0, startIdx) + NEW_SANTANDER_FN + "\n\n// ============================================================\n// ABA MULTAS — MOTORISTAS\n// ============================================================\n" + app.substring(endIdx);
        fs.writeFileSync('frontend/app.js', app);
        console.log("Santander function replacement via string slice done!");
    } else {
        console.log("Could not find the bounds for gerador santander!");
    }
}
