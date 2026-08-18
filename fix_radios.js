const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

// The string in _tcAbrirModalNovo:
const oldNovo = '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista"> Motorista</label>';
const newNovo = '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista B"> Motorista B</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista D"> Motorista D</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista"> Motorista</label>';
content = content.replace(oldNovo, newNovo);

// The string in _tcEditar:
const oldEditar = '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista" ${cand.tipo==="Motorista"?"checked":""}> Motorista</label>';
const newEditar = '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista B" ${cand.tipo==="Motorista B"?"checked":""}> Motorista B</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista D" ${cand.tipo==="Motorista D"?"checked":""}> Motorista D</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista" ${cand.tipo==="Motorista"?"checked":""}> Motorista</label>';
content = content.replace(oldEditar, newEditar);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed radios');
