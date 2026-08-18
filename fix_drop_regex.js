const fs = require('fs');
let c = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');

const dropRegex = /const EXIGE_DATA = \["Teste 1\\u00ba Dia","Teste 2\\u00ba Dia","Teste Extra"\];[\s\S]*?data_teste = dt;\s*\}/g;
const newDropLogic = \if (novoStatus === "Dias de Teste") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); return; }
            if (cand.retornou_teste_extra) {
                if (!cand.data_teste_extra) { Swal.fire({icon: "warning", title: "Atenção", text: "Este candidato já retornou de testes antes. Preencha a data do Teste Extra nos detalhes antes de mover."}); return; }
            } else {
                if (!cand.data_teste_1 || !cand.data_teste_2) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha as datas do 1º Dia e 2º Dia nos detalhes antes de mover para esta coluna."}); return; }
            }
        }\;
c = c.replace(dropRegex, newDropLogic);

const changeStatusRegex = /let dt = c\.data_teste \|\| null;\s*if \(novoStatus === "Teste 1\\u00ba Dia" && !dt\) \{[\s\S]*?dt = res\.value;\s*\}/g;
const newChangeLogic = \if (novoStatus === "Dias de Teste") {
            if (!c.doc_url && !c.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); window._tcDetalhes(id); return; }
            if (c.retornou_teste_extra) {
                if (!c.data_teste_extra) { Swal.fire({icon: "warning", title: "Atenção", text: "Este candidato já retornou de testes antes. Preencha a data do Teste Extra nos detalhes antes de mover."}); window._tcDetalhes(id); return; }
            } else {
                if (!c.data_teste_1 || !c.data_teste_2) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha as datas do 1º Dia e 2º Dia nos detalhes antes de mover para esta coluna."}); window._tcDetalhes(id); return; }
            }
        }\;
c = c.replace(changeStatusRegex, newChangeLogic);

fs.writeFileSync('frontend/testes_candidatos.js', c, 'utf8');
