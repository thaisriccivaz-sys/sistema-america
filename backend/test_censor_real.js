const { censorBOPdf } = require('./censorPDF.js');
const input = "c:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema\\ABBBB\\SINISTROS\\14-04-2026\\BO_Sinistro_14042026_ABBBB.pdf";
const output = "c:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\cadastro-colaboradores\\backend\\BO_TESTE_CENSURADO.pdf";

censorBOPdf(input, output).then(ok => {
    if (ok) console.log("SUCESSO! PDF censurado salvo em:", output);
    else console.log("FALHA ao censurar");
}).catch(console.error);
