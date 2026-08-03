const OCR_TEXT = `Nome ou logo 
da empresa
Fatura de serviço
Consultoria R$50.00 10 
Avenida Paulista, 2100
São Paulo, SP, - 01310-930
Fone: (11) 3655-4213
www.websitedaempresa.com
Número da fatura: 
Data da fatura:
Data de vencimento:
ID do consumidor:
49163336111
04/09/2018
04/09/2020
96-0643
Emitida para
Empresa
Rua Wisard, 480
CEP 05434-000 
Fone: (11) 3476-4566
Web Design R$50,00 50
Descrição Valor Qtd Total
R$2.500,00
Informações para 
pagamento:
Métodos de pagamento 
aceitáveis pela empresa
Notas:
Observe a data de 
vencimento acima.
TOTAL: R$3.180,00
Sub-Total:
Imposto 6%:
Ajuste:
R$3.000,00
R$180,00
---
R$500,00`;

function sugerirClassificacao(desc) {
  const descLower = desc.toLowerCase();
  let categoria = 'Insumo';
  let natureza = 'Variável';
  let unidade = 'UN';

  if (descLower.includes('mão de obra') || descLower.includes('mao de obra') || descLower.includes('serviço') || descLower.includes('servico') || descLower.includes('consultoria') || descLower.includes('design') || descLower.includes('desenvolvimento') || descLower.includes('suporte')) {
    categoria = 'MDO';
    natureza = 'Fixo';
    unidade = 'H';
  } else if (descLower.includes('frete') || descLower.includes('transporte') || descLower.includes('entrega') || descLower.includes('carreto')) {
    categoria = 'Frete';
    natureza = 'Variável';
    unidade = 'KM';
  } else if (descLower.includes('imposto') || descLower.includes('taxa') || descLower.includes('iss') || descLower.includes('icms')) {
    categoria = 'Imposto';
    natureza = 'Variável';
  }

  return { categoria, natureza, unidade };
}

function runParse() {
  const lines = OCR_TEXT.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lineValRegex = /(?:r\$\s*)?([\d.]+[.,]\d{2})\b/i;

  const itens = [];

  lines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();
    
    // Skip obvious document total/tax/header lines in line-by-line item extraction
    if (lineLower.includes('valor total') || lineLower.includes('total a pagar') || lineLower.includes('total geral') || lineLower.includes('total da fatura') || lineLower.includes('total liquido') || lineLower.includes('total líquido') || lineLower.includes('cnpj') || lineLower.includes('inscricao') || lineLower.includes('inscrição') || lineLower.includes('sub-total') || lineLower.includes('subtotal') || lineLower.includes('imposto')) {
      console.log(`Line ${idx+1} skipped by exclusion words: "${line}"`);
      return;
    }

    const match = line.match(lineValRegex);
    if (match) {
      let rawVal = match[1];
      let cleanVal = rawVal;
      if (cleanVal.includes('.') && cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
      } else if (cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(',', '.');
      } else if (cleanVal.includes('.')) {
        const parts = cleanVal.split('.');
        if (parts.length === 2 && parts[1].length === 2) {
          // decimal separator
        } else {
          // thousands separator
          cleanVal = cleanVal.replace(/\./g, '');
        }
      }
      const parsedVal = parseFloat(cleanVal);
      
      if (!isNaN(parsedVal) && parsedVal > 0) {
        let desc = line.split(match[0])[0].trim();
        desc = desc.replace(/^[\s\-.:;=]+/g, '').replace(/[\s\-.:;=]+$/g, '').trim();
        
        const descClean = desc.replace(/:/g, '').trim().toLowerCase();
        if (descClean === 'total' || descClean === 'subtotal' || descClean === 'sub-total' || descClean.startsWith('total ') || descClean === 'total geral' || descClean === 'total a pagar') {
          console.log(`Line ${idx+1} skipped as total label: "${line}"`);
          return;
        }

        const letterCount = (desc.match(/[a-zA-Z\u00C0-\u00FF]/g) || []).length;
        if (letterCount >= 3 && desc.length < 150) {
          const classif = sugerirClassificacao(desc);
          itens.push({
            lineIndex: idx + 1,
            original: line,
            descricao: desc,
            valor: parsedVal,
            natureza: classif.natureza,
            categoria: classif.categoria,
            unidade: classif.unidade
          });
        } else {
          console.log(`Line ${idx+1} skipped: letterCount=${letterCount}, desc="${desc}"`);
        }
      }
    } else {
      console.log(`Line ${idx+1} has no regex match: "${line}"`);
    }
  });

  console.log("\n=== PARSED ITEMS ===");
  console.log(JSON.stringify(itens, null, 2));
}

runParse();
