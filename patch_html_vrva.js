const fs = require('fs');
let c = fs.readFileSync('frontend/index.html', 'utf8');

const target = `                                        </div>\r\n\r\n                                    </div>\r\n                                </div><!-- End module-folha card -->`;

const replacement = `                                        </div>\r\n\r\n                                        <!-- Vale Refeição (VR) por colaborador -->\r\n                                        <div class="opcional-item">\r\n                                            <div class="opcional-info">\r\n                                                <h4><i class="ph ph-fork-knife"></i> Vale Refeição (VR)</h4>\r\n                                                <div class="opcional-question-row">\r\n                                                    <span class="opcional-question">Recebe VR?</span>\r\n                                                    <div class="radio-pill-group">\r\n                                                        <label><input type="radio" name="folha_vr" value="0" checked onchange="toggleFolhaField('vr',this.value)"> Não</label>\r\n                                                        <label><input type="radio" name="folha_vr" value="1" onchange="toggleFolhaField('vr',this.value)"> Sim</label>\r\n                                                    </div>\r\n                                                </div>\r\n                                            </div>\r\n                                            <div id="section-folha-vr" class="opcional-details-box" style="display:none;">\r\n                                                <div class="input-group"><label>Valor Diário (R$)</label><input type="number" id="colab-folha-vr-valor" step="0.01" value="0" min="0" placeholder="Ex: 35.00"></div>\r\n                                            </div>\r\n                                        </div>\r\n\r\n                                        <!-- Vale Alimentação (VA) -->\r\n                                        <div class="opcional-item">\r\n                                            <div class="opcional-info">\r\n                                                <h4><i class="ph ph-basket"></i> Vale Alimentação (VA)</h4>\r\n                                                <div class="opcional-question-row">\r\n                                                    <span class="opcional-question">Recebe VA?</span>\r\n                                                    <div class="radio-pill-group">\r\n                                                        <label><input type="radio" name="folha_va" value="0" checked onchange="toggleFolhaField('va',this.value)"> Não</label>\r\n                                                        <label><input type="radio" name="folha_va" value="1" onchange="toggleFolhaField('va',this.value)"> Sim</label>\r\n                                                    </div>\r\n                                                </div>\r\n                                            </div>\r\n                                            <div id="section-folha-va" class="opcional-details-box" style="display:none;">\r\n                                                <div class="input-group"><label>Valor Mensal Fixo (R$)</label><input type="number" id="colab-folha-va-valor" step="0.01" value="0" min="0" placeholder="Ex: 300.00"></div>\r\n                                            </div>\r\n                                        </div>\r\n\r\n                                    </div>\r\n                                </div><!-- End module-folha card -->`;

if (c.includes(target)) {
    c = c.replace(target, replacement);
    fs.writeFileSync('frontend/index.html', c, 'utf8');
    console.log('index.html VR/VA blocks added OK');
} else {
    // Try with LF instead of CRLF
    const targetLF = target.replace(/\r\n/g, '\n');
    if (c.includes(targetLF)) {
        c = c.replace(targetLF, replacement.replace(/\r\n/g, '\n'));
        fs.writeFileSync('frontend/index.html', c, 'utf8');
        console.log('index.html VR/VA blocks added OK (LF)');
    } else {
        console.log('Target not found - dumping context around End module-folha card:');
        const idx = c.indexOf('End module-folha card');
        if (idx > 0) console.log(JSON.stringify(c.substring(idx - 200, idx + 50)));
    }
}
