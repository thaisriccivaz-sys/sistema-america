const fs = require('fs');

let html = fs.readFileSync('frontend/index.html', 'utf8');

const novoPlr = `<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:.6rem;margin-top:.4rem;" id="plr-meses-checks">
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="janeiro" style="flex:none;height:auto;width:auto;margin:0;"> Janeiro</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="fevereiro" style="flex:none;height:auto;width:auto;margin:0;"> Fevereiro</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="março" style="flex:none;height:auto;width:auto;margin:0;"> Março</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="abril" checked style="flex:none;height:auto;width:auto;margin:0;"> Abril</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="maio" style="flex:none;height:auto;width:auto;margin:0;"> Maio</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="junho" style="flex:none;height:auto;width:auto;margin:0;"> Junho</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="julho" style="flex:none;height:auto;width:auto;margin:0;"> Julho</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="agosto" style="flex:none;height:auto;width:auto;margin:0;"> Agosto</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="setembro" style="flex:none;height:auto;width:auto;margin:0;"> Setembro</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="outubro" checked style="flex:none;height:auto;width:auto;margin:0;"> Outubro</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="novembro" style="flex:none;height:auto;width:auto;margin:0;"> Novembro</label>
                                                        <label style="display:flex;align-items:center;gap:.3rem;font-weight:400;min-width:auto;margin:0;"><input type="checkbox" class="plr-mes-check" value="dezembro" style="flex:none;height:auto;width:auto;margin:0;"> Dezembro</label>
                                                    </div>`;

// Usa regex para encontrar a tag id="plr-meses-checks" e todo o seu conteúdo até o fechamento da div
const regex = /<div[^>]*id="plr-meses-checks"[^>]*>[\s\S]*?<\/div>/i;

if (regex.test(html)) {
    html = html.replace(regex, novoPlr);
    fs.writeFileSync('frontend/index.html', html, 'utf8');
    console.log('Substituição concluída com sucesso.');
} else {
    console.log('Não foi possível encontrar a div plr-meses-checks.');
}
