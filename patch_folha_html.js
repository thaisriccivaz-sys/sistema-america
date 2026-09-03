const fs = require('fs');

let html = fs.readFileSync('frontend/index.html', 'utf8');
const origLen = html.length;

// ─────────────────────────────────────────────────────────────────────
// 1) Add Fechamento nav item BEFORE Recibos in the Pagamentos group
// ─────────────────────────────────────────────────────────────────────
const navAnchor = `<a href="#" class="nav-item nav-item-sub" data-target="recibos" onclick="navigateTo('recibos'); return false;"><i class="ph ph-receipt"></i>\n                                Recibos</a>`;
const navInsert = `<a href="#" class="nav-item nav-item-sub" data-target="fechamento" onclick="navigateTo('fechamento'); return false;"><i class="ph ph-calculator"></i>\n                                Fechamento</a>\n                            ` + navAnchor;
html = html.replace(navAnchor, navInsert);
console.log('Nav fechamento added:', html.includes('data-target="fechamento"'));

// ─────────────────────────────────────────────────────────────────────
// 2) Add academia desconto field inside section-academia
// ─────────────────────────────────────────────────────────────────────
const acadAnchor = `<div class="input-group">\n                                                    <label>Data de Início Academia</label>\n                                                    <input type="date" id="colab-academia-data-inicio">\n                                                </div>\n                                            </div>`;
const acadReplace = `<div class="input-group">\n                                                    <label>Data de Início Academia</label>\n                                                    <input type="date" id="colab-academia-data-inicio">\n                                                </div>\n                                                <div class="input-group" style="margin-top:.5rem;">\n                                                    <label>Desconto Mensal (R$)</label>\n                                                    <input type="number" id="colab-academia-desconto-valor" step="0.01" value="60" min="0" placeholder="60,00">\n                                                </div>\n                                            </div>`;
html = html.replace(acadAnchor, acadReplace);
console.log('Academia desconto added:', html.includes('colab-academia-desconto-valor'));

// ─────────────────────────────────────────────────────────────────────
// 3) Insert module-folha after End module-opcionais card
// ─────────────────────────────────────────────────────────────────────
const folhaAnchor = `</div><!-- End module-opcionais card -->`;
const folhaBlock = folhaAnchor + `

                                <!-- 7. Folha -->
                                <div class="card mb-4 p-4" id="module-folha">
                                    <h3 class="section-title"><i class="ph ph-currency-dollar"></i> 7. Folha</h3>
                                    <div class="opcionais-container">

                                        <div class="opcional-item">
                                            <div class="opcional-info">
                                                <h4><i class="ph ph-warning-octagon"></i> Insalubridade</h4>
                                                <div class="opcional-question-row">
                                                    <span class="opcional-question">Recebe Insalubridade?</span>
                                                    <div class="radio-pill-group">
                                                        <label><input type="radio" name="folha_insalubridade" value="0" checked onchange="toggleFolhaField('insalubridade',this.value)"> Não</label>
                                                        <label><input type="radio" name="folha_insalubridade" value="1" onchange="toggleFolhaField('insalubridade',this.value)"> Sim</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="section-folha-insalubridade" class="opcional-details-box" style="display:none;">
                                                <div class="input-group"><label>Valor (R$)</label><input type="number" id="colab-folha-insalubridade-valor" step="0.01" value="324.20" min="0"></div>
                                            </div>
                                        </div>

                                        <div class="opcional-item">
                                            <div class="opcional-info">
                                                <h4><i class="ph ph-fire"></i> Periculosidade</h4>
                                                <div class="opcional-question-row">
                                                    <span class="opcional-question">Recebe Periculosidade?</span>
                                                    <div class="radio-pill-group">
                                                        <label><input type="radio" name="folha_periculosidade" value="0" checked onchange="toggleFolhaField('periculosidade',this.value)"> Não</label>
                                                        <label><input type="radio" name="folha_periculosidade" value="1" onchange="toggleFolhaField('periculosidade',this.value)"> Sim</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="section-folha-periculosidade" class="opcional-details-box" style="display:none;">
                                                <div class="input-group"><label>Valor (R$)</label><input type="number" id="colab-folha-periculosidade-valor" step="0.01" value="0" min="0"></div>
                                            </div>
                                        </div>

                                        <div class="opcional-item">
                                            <div class="opcional-info">
                                                <h4><i class="ph ph-users-three"></i> Mensalidade Sindical</h4>
                                                <div class="opcional-question-row">
                                                    <span class="opcional-question">Paga Mensalidade Sindical?</span>
                                                    <div class="radio-pill-group">
                                                        <label><input type="radio" name="folha_mensalidade_sindical" value="0" checked onchange="toggleFolhaField('sindical',this.value)"> Não</label>
                                                        <label><input type="radio" name="folha_mensalidade_sindical" value="1" onchange="toggleFolhaField('sindical',this.value)"> Sim</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="section-folha-sindical" class="opcional-details-box" style="display:none;">
                                                <div class="input-group"><label>Valor (R$)</label><input type="number" id="colab-folha-mensalidade-sindical-valor" step="0.01" value="0" min="0"></div>
                                            </div>
                                        </div>

                                        <div class="opcional-item">
                                            <div class="opcional-info">
                                                <h4><i class="ph ph-scales"></i> Pensão Alimentícia</h4>
                                                <div class="opcional-question-row">
                                                    <span class="opcional-question">Tem Pensão Alimentícia?</span>
                                                    <div class="radio-pill-group">
                                                        <label><input type="radio" name="folha_pensao_alimenticia_rh" value="Não" checked onchange="toggleFolhaField('pensao',this.value)"> Não</label>
                                                        <label><input type="radio" name="folha_pensao_alimenticia_rh" value="Sim" onchange="toggleFolhaField('pensao',this.value)"> Sim</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="section-folha-pensao" class="opcional-details-box" style="display:none;">
                                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
                                                    <div class="input-group"><label>Percentual (%)</label><input type="number" id="colab-folha-pensao-pct" step="0.1" value="0" min="0" max="100"></div>
                                                    <div class="input-group"><label>Base de Cálculo</label>
                                                        <select id="colab-folha-pensao-tipo">
                                                            <option value="bruto">Salário Bruto</option>
                                                            <option value="liquido">Líquido (- INSS/IRRF)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="opcional-item">
                                            <div class="opcional-info">
                                                <h4><i class="ph ph-trophy"></i> PLR (Participação nos Lucros)</h4>
                                                <div class="opcional-question-row">
                                                    <span class="opcional-question">Recebe PLR?</span>
                                                    <div class="radio-pill-group">
                                                        <label><input type="radio" name="folha_plr" value="0" checked onchange="toggleFolhaField('plr',this.value)"> Não</label>
                                                        <label><input type="radio" name="folha_plr" value="1" onchange="toggleFolhaField('plr',this.value)"> Sim</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="section-folha-plr" class="opcional-details-box" style="display:none;">
                                                <div class="input-group" style="margin-bottom:.75rem;"><label>Valor por Período (R$)</label><input type="number" id="colab-folha-plr-valor" step="0.01" value="800" min="0"></div>
                                                <div class="input-group"><label>Meses de pagamento</label>
                                                    <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.4rem;" id="plr-meses-checks">
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="janeiro"> Jan</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="fevereiro"> Fev</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="março"> Mar</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="abril" checked> Abr</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="maio"> Mai</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="junho"> Jun</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="julho"> Jul</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="agosto"> Ago</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="setembro"> Set</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="outubro" checked> Out</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="novembro"> Nov</label>
                                                        <label style="font-weight:400;"><input type="checkbox" class="plr-mes-check" value="dezembro"> Dez</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div><!-- End module-folha card -->`;

html = html.replace(folhaAnchor, folhaBlock);
console.log('module-folha inserted:', html.includes('module-folha'));

if (html.length <= origLen) { console.error('AVISO: HTML não cresceu — algo não funcionou'); }
fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Done! New size:', html.length, 'vs original:', origLen);
