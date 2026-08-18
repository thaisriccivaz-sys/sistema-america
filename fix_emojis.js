const fs = require('fs');
let c = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');

c = c.replace('value="Ajudante" \> Ajudante</label>', 'value="Ajudante" \> 🪣 Ajudante</label>');
c = c.replace('value="Motorista B" \> Motorista B</label>', 'value="Motorista B" \> 🛻 Motorista B</label>');
c = c.replace('value="Motorista D" \> Motorista D</label>', 'value="Motorista D" \> 🚚 Motorista D</label>');

fs.writeFileSync('frontend/testes_candidatos.js', c, 'utf8');
