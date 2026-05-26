const fs = require('fs');
const path = 'frontend/index.html';
let content = fs.readFileSync(path, 'utf8');

const target = /<script src="usuarios\.js\?v=\d+"><\/script>/;
const match = content.match(target);

if (match) {
    const version = parseInt(match[0].match(/\d+/)[0]) + 1;
    const replacement = `<script src="usuarios.js?v=${version}"></script>`;
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated cache-buster in index.html for usuarios.js to version " + version);
} else {
    console.log("Regex not matched in index.html!");
}