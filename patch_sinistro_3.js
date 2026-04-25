const fs = require('fs');

const fileFront = 'frontend/sinistros.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

const oldSelect = `<option value="1">1x</option>
                                        <option value="2">2x</option>
                                        <option value="3">3x</option>
                                        <option value="4">4x</option>
                                        <option value="5">5x</option>
                                        <option value="6">6x</option>
                                        <option value="7">7x</option>
                                        <option value="8">8x</option>
                                        <option value="9">9x</option>
                                        <option value="10">10x</option>
                                        <option value="11">11x</option>
                                        <option value="12">12x</option>`;
const newSelect = `<option value="1">1x</option>
                                        <option value="2">2x</option>
                                        <option value="3">3x</option>`;
if (contentFront.includes('<option value="12">12x</option>')) {
    contentFront = contentFront.replace(oldSelect, newSelect);
    fs.writeFileSync(fileFront, contentFront, 'utf8');
    console.log('Frontend max parcelas reduced to 3');
}

const fileBack = 'backend/server.js';
let contentBack = fs.readFileSync(fileBack, 'utf8');
if (contentBack.includes("'BOLETIM_DE_OCORRENCIA',") && !contentBack.includes("'SINISTROS',")) {
    contentBack = contentBack.replace("'BOLETIM_DE_OCORRENCIA',", "'SINISTROS',");
    fs.writeFileSync(fileBack, contentBack, 'utf8');
    console.log('Backend SINISTROS folder added instead of BOLETIM_DE_OCORRENCIA');
}

