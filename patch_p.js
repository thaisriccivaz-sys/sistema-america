const fs = require('fs');
let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');

const oldTrHtml = `    let destNome = '-';
    try {
        const p = JSON.parse(m.payload_json || '{}');`;

const newTrHtml = `    let destNome = '-';
    let p = {};
    try {
        p = JSON.parse(m.payload_json || '{}');`;

if(mtrJs.includes(oldTrHtml)) {
    mtrJs = mtrJs.replace(oldTrHtml, newTrHtml);
    fs.writeFileSync('frontend/mtr.js', mtrJs);
    console.log('PATCHED P');
} else {
    console.log('COULD NOT PATCH P');
}
