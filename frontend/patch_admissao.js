const fs = require('fs');

/* 1) APP.JS FIXES */
let js = fs.readFileSync('frontend/app.js', 'utf8');

if (!js.includes("document.getElementById(`step-${s}`).classList")) {
    js = js.replace(/window\.nextAdmissaoStep = function\(step, preventScroll = false\) \{/, 
`window.nextAdmissaoStep = function(step, preventScroll = false) {
    window.currentActiveAdmissaoStep = step;
    document.querySelectorAll('.admissao-stepper .step-item').forEach(s => s.classList.remove('active'));
    let activeStepEl = document.getElementById('step-' + step);
    if(activeStepEl) activeStepEl.classList.add('active');
`);
    fs.writeFileSync('frontend/app.js', js, 'utf8');
    console.log('App.js stepper active updated');
}

/* 2) INDEX.HTML FIXES */
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Move digital certificate banner ABOVE documents
// Finding where the docs container is vs where the banner is
const bannerStart = html.indexOf('<div class="certificado-banner"');
if(bannerStart !== -1) {
    const bannerEnd = html.indexOf('</div>', bannerStart) + 6;
    let bannerStr = html.substring(bannerStart, bannerEnd);

    // Remove banner from its current position securely by taking substring of full HTML
    const part1 = html.substring(0, bannerStart);
    const part2 = html.substring(bannerEnd);
    html = part1 + part2;
    
    // Find the documents search bar <div class="input-group" style="margin-bottom: 1.5rem;">
    const searchBarPos = html.indexOf('<div class="input-group" style="margin-bottom: 1.5rem;">'); // Passo 2 search for doc
    if(searchBarPos !== -1) {
        html = html.substring(0, searchBarPos) + bannerStr + "\n<br/>" + html.substring(searchBarPos);
    }
}

// Ensure panel 6 uses inline display logic if class active is failing
html = html.replace('id="panel-step-6"', 'id="panel-step-6" style="display:none;"');

fs.writeFileSync('frontend/index.html', html, 'utf8');
