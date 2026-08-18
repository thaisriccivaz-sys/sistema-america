const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

const setDTesteFn = `
    window._tcSetDTeste = async function(id, status) {
        const { value: dt } = await Swal.fire({
            title: "Data para " + status,
            html: '<input type="date" id="swal-dt" class="swal2-input">',
            confirmButtonColor: "#7c3aed",
            confirmButtonText: "Salvar",
            showCancelButton: true,
            cancelButtonText: "Cancelar",
            preConfirm: () => document.getElementById("swal-dt").value
        });
        if (!dt) return;
        try {
            const r = await fetch(API('/api/candidatos-teste/' + id + '/status'), { method:"PUT", headers:authH(), body:JSON.stringify({status:status,data_teste:dt}) });
            const data = await r.json();
            if (!r.ok) { Swal.fire({icon:"error",title:"Erro",text:data.error}); return; }
            await _load(); _render(); window._tcDetalhes(id);
        } catch(e) { Swal.fire({icon:"error",title:"Erro",text:e.message}); }
    };
`;

content += setDTesteFn;
fs.writeFileSync(file, content, 'utf8');
console.log('Added _tcSetDTeste');
