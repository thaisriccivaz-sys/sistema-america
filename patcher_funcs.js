const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'testes_candidatos.js');
let content = fs.readFileSync(file, 'utf8');

const funcsToAdd = 
    window._tcChangeStatus = async function(id, novoStatus) {
        const c = _candidatos.find(x => x.id === id);
        if (!c || c.status === novoStatus) return;
        
        let dt = c.data_teste || null;
        if (novoStatus === "Teste 1º Dia" && !dt) {
            const { value } = await Swal.fire({ title:"Data do Teste 1º Dia", input:"date", showCancelButton:true, confirmButtonText:"Salvar" });
            if (!value) {
                window._tcDetalhes(id); // re-render para voltar ao status anterior
                return;
            }
            dt = value;
        }

        try {
            const r = await fetch(API(\/api/candidatos-teste/\/status\), {
                method: "PUT",
                headers: authH(),
                body: JSON.stringify({ status: novoStatus, data_teste: dt })
            });
            if (!r.ok) throw new Error(await r.text());
            await _load();
            _render();
            window._tcDetalhes(id); // atualiza o modal aberto
        } catch (e) {
            Swal.fire({ icon:"error", title:"Erro", text:e.message });
            window._tcDetalhes(id); // re-render error
        }
    };

    window._tcUpdateDataTeste = async function(id, novaData) {
        try {
            const r = await fetch(API(\/api/candidatos-teste/\/data\), {
                method: "PUT",
                headers: authH(),
                body: JSON.stringify({ data_teste: novaData })
            });
            if (!r.ok) throw new Error(await r.text());
            await _load();
            _render();
            window._tcDetalhes(id);
            Swal.fire({ icon: "success", title: "Data atualizada!", showConfirmButton: false, timer: 1500 });
        } catch (e) {
            Swal.fire({ icon: "error", title: "Erro", text: e.message });
        }
    };
;

const target = "window._tcUpDoc = async function";
content = content.replace(target, funcsToAdd + "\n    " + target);

fs.writeFileSync(file, content, 'utf8');
console.log('Adicionadas funções de update.');
