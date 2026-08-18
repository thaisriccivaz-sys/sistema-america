const fs = require('fs');
let c = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');

// Let's locate window._tcDrop block using indexOf
const dropStart = c.indexOf('window._tcDrop = async function(e, novoStatus) {');
const dropEnd = c.indexOf('} catch(err)', dropStart) + 13;
const cleanDrop = \window._tcDrop = async function(e, novoStatus) {
        e.preventDefault();
        if (!_dragId || novoStatus === _dragStatus) return;
        const cand = _candidatos.find(c => c.id === _dragId);
        if (!cand) return;
        if (novoStatus === "Respondido") { Swal.fire({icon: "warning", title: "Atenção", text: "A coluna Respondido é automática."}); return; }
        if (novoStatus === "Dias de Teste") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); return; }
            if (cand.retornou_teste_extra) {
                if (!cand.data_teste_extra) { Swal.fire({icon: "warning", title: "Atenção", text: "Este candidato já retornou de testes antes. Preencha a data do Teste Extra nos detalhes antes de mover."}); return; }
            } else {
                if (!cand.data_teste_1 || !cand.data_teste_2) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha as datas do 1º Dia e 2º Dia nos detalhes antes de mover para esta coluna."}); return; }
            }
        }
        try {
            const r = await fetch(API(\\\/api/candidatos-teste/\/status\\\), { method:"PUT", headers:authH(), body:JSON.stringify({status:novoStatus}) });
            const data = await r.json();
            if (!r.ok) { Swal.fire({icon:"error",title:"Não permitido",text:data.error||"Erro ao mover.",confirmButtonColor:"#7c3aed"}); return; }
            await _load(); _render();
        } catch(err)\;

c = c.substring(0, dropStart) + cleanDrop + c.substring(dropEnd);

// Let's locate window._tcChangeStatus block using indexOf
const changeStart = c.indexOf('window._tcChangeStatus = async function(id, novoStatus) {');
const changeEnd = c.indexOf('} catch(err)', changeStart) + 13;
const cleanChange = \window._tcChangeStatus = async function(id, novoStatus) {
        const cand = _candidatos.find(x => x.id === id);
        if (!cand || cand.status === novoStatus) return;
        if (novoStatus === "Respondido") { Swal.fire({icon: "warning", title: "Atenção", text: "A coluna Respondido é automática."}); window._tcDetalhes(id); return; }
        if (novoStatus === "Dias de Teste") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); window._tcDetalhes(id); return; }
            if (cand.retornou_teste_extra) {
                if (!cand.data_teste_extra) { Swal.fire({icon: "warning", title: "Atenção", text: "Este candidato já retornou de testes antes. Preencha a data do Teste Extra nos detalhes antes de mover."}); window._tcDetalhes(id); return; }
            } else {
                if (!cand.data_teste_1 || !cand.data_teste_2) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha as datas do 1º Dia e 2º Dia nos detalhes antes de mover para esta coluna."}); window._tcDetalhes(id); return; }
            }
        }
        try {
            const r = await fetch(API(\\\/api/candidatos-teste/\/status\\\), {
                method: "PUT",
                headers: authH(),
                body: JSON.stringify({ status: novoStatus })
            });
            if (!r.ok) throw new Error(await r.text());
            await _load(); _render(); window._tcDetalhes(id);
        } catch(err)\;

c = c.substring(0, changeStart) + cleanChange + c.substring(changeEnd);

fs.writeFileSync('frontend/testes_candidatos.js', c, 'utf8');
console.log('Fixed undefined vars in js');
