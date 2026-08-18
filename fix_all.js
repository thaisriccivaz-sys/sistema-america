const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

// 1. _tcUpDoc -> maintain open
content = content.replace('window._tcFecharModal(); await _load(); _render();', 'await _load(); _render(); window._tcDetalhes(id);');

// 2. _tcEnvCom -> use tc-novo-coment and fix onclick
content = content.replace('tc-com-\', 'tc-novo-coment-\');
content = content.replace(/window\._tcAddComent\(/g, 'window._tcEnvCom(');

// 3. New Options for Radio Buttons
const oldRadioNovo = \<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista"> Motorista</label>\;
const newRadioNovo = \<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista B"> Motorista B</label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista D"> Motorista D</label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista"> Motorista</label>\;
content = content.replace(oldRadioNovo, newRadioNovo);

const oldRadioEditar = \<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista" \> Motorista</label>\;
const newRadioEditar = \<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista B" \> Motorista B</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista D" \> Motorista D</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista" \> Motorista</label>\;
content = content.replace(oldRadioEditar, newRadioEditar);

// 4. Badges function
// Replace inline logic with a cleaner ternary or function inline.
// Old: \
const newBadgeStr = '\';
content = content.replace(/\$\{c\.tipo === "Motorista" \? "[^"]*" : "[^"]*"\}/g, newBadgeStr);

// 5. Columns
content = content.replace('icone: "ph-number-one"', 'icone: "ph-clipboard-text"');
content = content.replace('icone: "ph-number-two"', 'icone: "ph-clipboard-text"');

// 6. Documento
content = content.replace('Documento (\\)', 'Documento');

// Finally, make sure the _tcEnvCom actually calls window._tcDetalhes(id) too, to show the new comment!
// Let's look for: Swal.fire({icon:"success",title:"Comentário adicionado!",showConfirmButton:false,timer:1500}); 
// Actually let's just append await _load(); _render(); window._tcDetalhes(id); to _tcEnvCom
const envComTarget = 'Swal.fire({icon:"success",title:"Comentario adicionado",showConfirmButton:false,timer:1500});';
if (content.includes('Comentario adicionado')) {
    // Wait, let's just check how _tcEnvCom ends
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed multiple frontend issues');
