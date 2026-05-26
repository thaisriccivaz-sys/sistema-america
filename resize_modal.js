const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const search = '<div id="modal-solicitar-credenciamento" class="modal" style="z-index:9998; padding:20px;">\n                    <div class="modal-content" style="max-width: 900px; height: calc(100vh - 40px);';

if (html.includes(search)) {
    html = html.replace(search, '<div id="modal-solicitar-credenciamento" class="modal" style="z-index:9998; padding:20px;">\n                    <div class="modal-content" style="width: 95vw; max-width: 1600px; height: calc(100vh - 40px);');
    fs.writeFileSync('frontend/index.html', html, 'utf8');
    console.log('Modal resized');
} else {
    // try a more generic replacement
    const search2 = 'id="modal-solicitar-credenciamento"';
    const idx = html.indexOf(search2);
    if (idx !== -1) {
        const nextContent = html.indexOf('class="modal-content"', idx);
        const styleStart = html.indexOf('style="', nextContent) + 7;
        const styleEnd = html.indexOf('"', styleStart);
        let style = html.substring(styleStart, styleEnd);
        style = style.replace('max-width: 900px;', 'width: 95vw; max-width: 1600px;');
        html = html.substring(0, styleStart) + style + html.substring(styleEnd);
        fs.writeFileSync('frontend/index.html', html, 'utf8');
        console.log('Modal resized generically');
    } else {
        console.log('modal not found');
    }
}
