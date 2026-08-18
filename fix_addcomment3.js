const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const regex1 = /document\.getElementById\('new-comment-text'\)\.value\s*=\s*txt;\s*SAC\.addComment\(\`\$\\\{ticket\.id\}\`\);/g;
const replacement1 = `const commentBox = document.getElementById('new-comment-text');\n                  if (commentBox) commentBox.value = txt;\n                  SAC.addComment(\`\\${ticket.id}\`, txt);`;

code = code.replace(regex1, replacement1);

const regex2 = /async function addComment\(ticketId\)\s*\{/g;
const replacement2 = `async function addComment(ticketId, directText = null) {`;
code = code.replace(regex2, replacement2);

const regex3 = /const textInput = document\.getElementById\('new-comment-text'\);\s*const text = textInput \? textInput\.value\.trim\(\) : '';/g;
const replacement3 = `const textInput = document.getElementById('new-comment-text');\n      const text = directText ? directText.trim() : (textInput ? textInput.value.trim() : '');`;
code = code.replace(regex3, replacement3);

const regex4 = /addComment\(ticketId\)\s*\{\s*return\s*addComment\(ticketId\);\s*\}/g;
const replacement4 = `addComment(ticketId, txt) { return addComment(ticketId, txt); }`;
code = code.replace(regex4, replacement4);

fs.writeFileSync('frontend/sac.js', code);
console.log('Fixed addComment logic with regex');
