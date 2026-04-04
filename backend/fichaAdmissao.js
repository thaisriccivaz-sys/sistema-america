function safeStr(val) { return val ? val : ''; }

function getFichaAdmissaoHtml(colaborador, baseUrl) {
    const c = colaborador;

    const parseMoney = (val) => {
        if (!val) return 'R$ 0,00';
        if (typeof val === 'number') return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(val);
        if (typeof val === 'string' && val.includes('R$')) return val;
        let numStr = String(val).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        let num = parseFloat(numStr);
        if (isNaN(num)) return val;
        return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(num);
    };

    const isIntermitente = c.tipo_contrato === 'Intermitente' ? '( X )' : '(   )';
    const isCLT = c.tipo_contrato === 'CLT' ? '( X )' : '(   )';

    let dependentes = [];
    try { if (c.dependentes) dependentes = (typeof c.dependentes === 'string') ? JSON.parse(c.dependentes) : c.dependentes; } catch(e) {}

    const isCasado = c.estado_civil && (c.estado_civil.toLowerCase().includes('casad') || c.estado_civil.toLowerCase().includes('uni'));
    // Cônjuge: lê das colunas diretas (nova arquitetura) ou retrocompat. com dependentes
    const conjugeNome = safeStr(c.conjuge_nome || ((dependentes.find(d => d.grau_parentesco === 'C\u00f4njuge') || {}).nome));
    const conjugeCpf  = safeStr(c.conjuge_cpf  || ((dependentes.find(d => d.grau_parentesco === 'C\u00f4njuge') || {}).cpf));
    // Filhos: apenas dependentes sem grau cônjuge
    const filhos = dependentes.filter(d => d.grau_parentesco !== 'C\u00f4njuge');

    const temConjuge = isCasado && conjugeNome;
    const temDependentes = filhos.length > 0;

    const isMotorista = (c.cargo || '').toUpperCase().includes('MOTORISTA');
    const showRg = (c.rg_tipo === 'RG' && !isMotorista);

    let sabIn = c.sabado_entrada;
    let sabOut = c.sabado_saida;
    // Fallback: se não tem sábado específico, usa horário padrão para escala seg-sab
    const escalaTipo = c.escala_tipo || c.escala_padrao || '';
    if (!sabIn && escalaTipo && (escalaTipo.toLowerCase().includes('seis') || escalaTipo.toLowerCase().includes('seg_sab') || escalaTipo.toLowerCase().includes('sabado'))) {
        sabIn = c.horario_entrada;
        sabOut = c.horario_saida;
    }

    const logoSrc = `${baseUrl || 'https://sistema-america.onrender.com'}/assets/logo-header.png`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 0 20px 20px 20px; line-height: 1.4; color: #000; }
  @page { size: A4; margin: 0.5cm 1.8cm 1.8cm 1.8cm; }
  .logo { width: 100%; display: block; margin: 0 0 10px 0; }
  h2 { text-align: center; font-size: 14px; margin: 5px 0 16px 0; font-weight: bold; }
  .row { display: flex; flex-direction: row; margin-bottom: 4px; }
  .label { font-weight: bold; margin-right: 5px; white-space: nowrap; }
  .value { flex: 1; border-bottom: 1px solid #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-bottom: 2px; }
  .box { border: 2px solid #000; padding: 10px; margin-top: 15px; margin-bottom: 15px; }
  .box-title { text-align: center; font-weight: bold; font-size: 11px; margin-top: -18px; margin-bottom: 10px; }
  .box-title span { background: #fff; padding: 0 5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .blue-hdr { background:#2F5597; color:#fff; text-align:center; padding:6px; font-weight:bold; margin-top:20px; margin-bottom:15px; }
  .dep-row { display:flex; gap:10px; margin-bottom:8px; font-size:10px; }
  .dep-row > div { flex:1; border-bottom:1px solid #000; min-height:16px; align-items:flex-end; display:flex; }
  .red { color:red; font-weight:bold; }
  .bold { font-weight:bold; }
</style>
</head>
<body>
<img src="${logoSrc}" class="logo" alt="Am\u00e9rica Rental" onerror="this.style.display='none'">
<h2>FICHA DE ADMISS\u00c3O DE COLABORADOR</h2>

<div class="grid-2">
  <div class="row"><span class="label">Colaborador:</span><div class="value bold">${safeStr(c.nome_completo || c.nome)}</div></div>
  <div class="row"><span class="label">CPF:</span><div class="value bold">${safeStr(c.cpf)}</div></div>
</div>
<div class="row"><span class="label">Empresa:</span><div class="value bold">Am\u00e9rica Rental Equipamentos Ltda &nbsp;&nbsp; CNPJ: 03.434.448/0001-01</div></div>

<div class="row"><span class="label">Endere\u00e7o:</span><div class="value">${safeStr(c.endereco)}</div></div>
<div class="row" style="width: 50%;"><span class="label">Telefone:</span><div class="value">${safeStr(c.telefone)}</div></div>

<div class="grid-2">
  <div class="row"><span class="label">Data de Nascimento:</span><div class="value">${c.data_nascimento ? new Date(c.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR') : ''}</div></div>
  <div class="row"><span class="label">Estado Civil:</span><div class="value">${safeStr(c.estado_civil)}</div></div>
</div>
<div class="grid-2">
  <div class="row"><span class="label">Nome do Pai:</span><div class="value">${safeStr(c.nome_pai)}</div></div>
  <div class="row"><span class="label">Nome da M\u00e3e:</span><div class="value">${safeStr(c.nome_mae)}</div></div>
</div>
<div class="grid-2">
  <div class="row"><span class="label">Grau de Instru\u00e7\u00e3o:</span><div class="value">${safeStr(c.grau_instrucao)}</div></div>
  <div class="row"><span class="label">Naturalidade:</span><div class="value">${safeStr(c.local_nascimento)}</div></div>
</div>

<div class="box">
  <div class="row"><span class="label">Cor da Pele:</span><span style="width:150px">${safeStr(c.cor_raca)}</span> <i style="font-size:10px">(Como o colaborador se identifica)</i></div>
  <div class="row" style="margin-top:5px"><span class="label">Possui alguma doen\u00e7a ou \u00e9 al\u00e9rgico a algum tipo de rem\u00e9dio?</span> <span>${(c.alergias && c.alergias.trim()!=='') ? 'Sim' : 'N\u00e3o'}</span></div>
  <div class="row" style="margin-top:5px"><span class="label">Em caso positivo indicar as provid\u00eancias:</span></div>
  <div style="border-bottom:1px solid #000;height:18px">${safeStr(c.alergias)}</div>
  <div style="border-bottom:1px solid #000;height:18px;margin-top:5px"></div>
</div>

${showRg ? `<div class="grid-2">
  <div class="row"><span class="label">C\u00e9dula de Identidade:</span><div class="value">${safeStr(c.rg)}</div></div>
  <div class="row"><span class="label">Emiss\u00e3o:</span><div class="value">${c.rg_data_emissao ? new Date(c.rg_data_emissao+'T12:00:00').toLocaleDateString('pt-BR') : ''}</div></div>
</div>` : ''}

<div class="grid-3">
  <div class="row"><span class="label">T\u00edtulo de eleitor:</span><div class="value">${safeStr(c.titulo_eleitoral)}</div></div>
  <div class="row"><span class="label">Zona:</span><div class="value">${safeStr(c.titulo_zona)}</div></div>
  <div class="row"><span class="label">Se\u00e7\u00e3o:</span><div class="value">${safeStr(c.titulo_secao)}</div></div>
</div>
${c.sexo === 'Masculino' ? `<div class="row" style="width:33%"><span class="label">Reservista:</span><div class="value">${safeStr(c.certificado_militar || '')}</div></div>` : ''}

<div style="text-align:center;font-size:11px;margin-top:15px;font-weight:bold">
  Contrato Intermitente ${isIntermitente} &nbsp;&nbsp;&nbsp; Contrato CLT ${isCLT}
</div>

<div class="box">
  <div class="box-title"><span>INFORMA\u00c7\u00d5ES \u00c0 CONTABILIDADE</span></div>
  <div style="padding:0 40px">
    <div class="grid-2">
      <div class="row"><span class="label">Data de Admiss\u00e3o:</span> <div class="value">${c.data_admissao ? new Date(c.data_admissao+'T12:00:00').toLocaleDateString('pt-BR') : ''}</div></div>
      <div class="row"><span class="label">Fun\u00e7\u00e3o:</span> <div class="value">${safeStr(c.cargo)}</div></div>
    </div>
    <div class="row" style="width:50%"><span class="label">Sal\u00e1rio:</span> <div class="value">${parseMoney(c.salario)}</div></div>
    <div class="grid-2" style="margin-top:5px">
      <div class="row"><span class="label">Insalubridade:</span> <div class="value">${c.insalubridade==='Sim'?'Sim':'N\u00e3o'}</div></div>
      <div class="row"><span class="label">Valor Insalubridade:</span> <div class="value">${c.insalubridade==='Sim'?parseMoney(c.insalubridade_valor):''}</div></div>
      <div class="row"><span class="label">Meio de Transporte:</span> <div class="value">${safeStr(c.meio_transporte)}</div></div>
      <div class="row"><span class="label">Valor:</span> <div class="value">${c.meio_transporte === 'Vale Transporte (VT)' ? '6%' : parseMoney(c.valor_transporte)}</div></div>
      <div class="row"><span class="label">Vale Adiantamento:</span> <div class="value">${c.adiantamento_salarial==='Sim'?'Sim':'N\u00e3o'}</div></div>
      <div class="row"><span class="label">Valor:</span> <div class="value">${c.adiantamento_salarial==='Sim'?parseMoney(c.adiantamento_valor):''}</div></div>
    </div>
    <div style="margin-top:5px">
      <div class="row"><span class="label">Hor\u00e1rio de Trabalho:</span>
        <span class="red" style="font-size:10px; font-weight:bold;">
          ${sabIn ? \`Seg \u00e0 Sex \${safeStr(c.horario_entrada)} \u00e0s \${safeStr(c.horario_saida)} &nbsp;-&nbsp; S\u00e1b \${safeStr(sabIn)} \u00e0s \${safeStr(sabOut)}\` : \`Seg \u00e0 Sex \${safeStr(c.horario_entrada)} \u00e0s \${safeStr(c.horario_saida)}\`}
        </span>
      </div>
    </div>
    <div class="row"><span class="label">Per\u00edodo de Experi\u00eancia:</span> <span>45/45</span></div>
  </div>
  <div style="border-top:1px solid #000;margin-top:10px;padding-top:5px" class="grid-3">
    <div class="row"><span class="label">Banco:</span> <span>${safeStr(c.banco_nome)}</span></div>
    <div class="row"><span class="label">Ag\u00eancia:</span> <span>${safeStr(c.banco_agencia)}</span></div>
    <div class="row"><span class="label">Conta:</span> <span>${safeStr(c.banco_conta)}</span></div>
  </div>
</div>

<div class="blue-hdr">Providenciar o Livro de Registro de Empregados</div>

${(temConjuge || temDependentes) ? `<div style="font-size:10px">
  ${temConjuge ? `<div class="dep-row">
    <div style="flex:2"><span class="label">Nome do C\u00f4njuge:</span> ${conjugeNome}</div>
    <div><span class="label">CPF:</span> ${conjugeCpf}</div>
  </div>` : ''}
  ${filhos.slice(0,4).map(f => `<div class="dep-row">
    <div style="flex:2"><span class="label">Nome Dependente:</span> ${safeStr(f.nome)}</div>
    <div><span class="label">CPF:</span> ${safeStr(f.cpf)}</div>
    <div><span class="label">Nascimento:</span> ${f.data_nascimento ? new Date(f.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR') : ''}</div>
  </div>`).join('')}
</div>` : ''}

</body>
</html>`;
    return html;
}

module.exports = { getFichaAdmissaoHtml };
