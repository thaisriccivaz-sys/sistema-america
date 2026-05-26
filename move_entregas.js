const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Find the module block
const startComment = '<!-- Módulo Logística: Entregas -->';
const endBlockIdx = html.indexOf('<!-- App Shell (ERP Layout) -->');
if(html.includes(startComment) && endBlockIdx > -1) {
    const startIdx = html.indexOf(startComment);
    const block = html.substring(startIdx, endBlockIdx);
    
    // Remove the block from its current location
    html = html.slice(0, startIdx) + html.slice(endBlockIdx);
    
    // Insert inside app-main-content
    const mainContentStart = html.indexOf('<div id="app-main-content">');
    if(mainContentStart > -1) {
        const insertPos = html.indexOf('>', mainContentStart) + 1;
        html = html.slice(0, insertPos) + '\n' + block + html.slice(insertPos);
        fs.writeFileSync('frontend/index.html', html);
        console.log('Moved module to app-main-content');
    } else {
        console.log('app-main-content not found');
    }
} else {
    console.log('Module not found at top');
}
