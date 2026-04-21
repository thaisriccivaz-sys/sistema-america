const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
// Fix the destroyed panel 6
html = html.replace('                            <div class="card p-4">\n                                <h3 class="section-title justify-center"><i class="ph ph-check-circle"></i> Passo 6: Efetiva', 
`                        <!-- PANEL 6: EFETIVACAO -->
                        <div class="admissao-panel" id="panel-step-6">
                            <div class="card p-4">
                                <h3 class="section-title justify-center"><i class="ph ph-check-circle"></i> Passo 6: Efetiva`);

fs.writeFileSync('frontend/index.html', html, 'utf8');
