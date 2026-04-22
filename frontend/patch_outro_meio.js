const fs = require('fs');

// Patch app.js to add action button "Outro Meio"
let js = fs.readFileSync('frontend/app.js', 'utf8');

const target1 = `row.innerHTML = \`
                <td>
                    <div style="font-weight: 500; color: #1e293b;">\${doc.colaborador || '--'}</div>`;
const replace1 = `row.innerHTML = \`
                <td>
                    <div style="font-weight: 500; color: #1e293b;">\${doc.colaborador || '--'}</div>`;

// Wait, let's find the Exact function `loadAssinaturasDigitaisList` or similar!
