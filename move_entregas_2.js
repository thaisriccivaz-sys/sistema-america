const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const startComment = '<!-- Módulo Logística: Entregas -->';
const endBlockIdx = html.indexOf('<!-- App Shell (ERP Layout) -->');
if(html.includes(startComment) && endBlockIdx > -1) {
    const startIdx = html.indexOf(startComment);
    const block = html.substring(startIdx, endBlockIdx);
    
    // Remove the block
    html = html.slice(0, startIdx) + html.slice(endBlockIdx);
    
    // Insert after <main class="content-area" ...>
    const mainAreaRegex = /<main class="content-area"[^>]*>/;
    const match = html.match(mainAreaRegex);
    if(match) {
        const insertPos = match.index + match[0].length;
        html = html.slice(0, insertPos) + '\n' + block.replace('class="content-view"', 'class="content-view"') + html.slice(insertPos);
        
        // Also ensure it is a section instead of div if necessary, but div is fine.
        fs.writeFileSync('frontend/index.html', html);
        console.log('Moved module to main content area');
    } else {
        console.log('main area not found');
    }
} else {
    console.log('Module not found at top');
}
