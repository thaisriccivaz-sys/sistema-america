const fs = require('fs');

const fileFront = 'frontend/sinistros.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

const frontSearch = `<select id="sin-tipo-sinistro" class="form-control">
                                    <option value="Danos em terceiros">Danos em terceiros</option>
                                    <option value="Danos no nosso veículo">Danos no nosso veículo</option>
                                    <option value="Danos em terceiros e nossos">Danos em terceiros e nossos</option>
                                    <option value="Outros danos">Outros danos</option>
                                </select>`;
const frontReplace = `<select id="sin-tipo-sinistro" class="form-control">
                                    <option value="Danos em Terceiros e Nosso">Danos em Terceiros e Nosso</option>
                                    <option value="Danos em Terceiros">Danos em Terceiros</option>
                                    <option value="Danos no Nosso Veículo">Danos no Nosso Veículo</option>
                                    <option value="Outros Danos">Outros Danos</option>
                                </select>`;

if (contentFront.includes('<option value="Danos em terceiros">')) {
    contentFront = contentFront.replace(frontSearch, frontReplace);
    fs.writeFileSync(fileFront, contentFront, 'utf8');
    console.log('Frontend options updated.');
}


const fileBack = 'backend/server.js';
let contentBack = fs.readFileSync(fileBack, 'utf8');

const backSearch = "const pnome = 'Sinistro_' + (pastaDataStr || dataFormatada).replace(/-/g,'') + '_' + nomeFormatado + '.pdf';";
const backReplace = "const pnome = 'BO_Sinistro_' + (pastaDataStr || dataFormatada).replace(/-/g,'') + '_' + nomeFormatado + '.pdf';";

if (contentBack.includes(backSearch)) {
    contentBack = contentBack.replace(backSearch, backReplace);
    fs.writeFileSync(fileBack, contentBack, 'utf8');
    console.log('Backend BO filename updated.');
}
