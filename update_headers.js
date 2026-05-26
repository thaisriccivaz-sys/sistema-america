const fs = require('fs');
const path = 'frontend/index.html';
let content = fs.readFileSync(path, 'utf8');

const regexHeaders = /(<th>Licen(|ç)as<\/th>\s*)<th style="cursor:pointer;/;
const replacementHeaders = `$1<th>Data Limite</th>\n                                        <th style="cursor:pointer;`;

if(content.match(regexHeaders)) {
    content = content.replace(regexHeaders, replacementHeaders);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added Data Limite header in index.html");
} else {
    console.log("Could not find headers");
}