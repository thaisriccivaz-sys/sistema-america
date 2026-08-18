const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'testes_candidatos.js');
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('function _renderDet(c) {');
const endStr = 'window._tcUpDoc = async function';
const endIdx = content.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.log("Could not find start or end");
    process.exit(1);
}

// Find the last "    };\n\n" before window._tcUpDoc
const blockBefore = content.substring(startIdx, endIdx);
const matchEnd = blockBefore.lastIndexOf('    };\n');
if (matchEnd === -1) {
    console.log("Could not find end of function");
    process.exit(1);
}

const patchContent = fs.readFileSync('C:\\\\Users\\\\thais\\\\.gemini\\\\antigravity\\\\brain\\\\94fd2244-9b57-4b88-bdbf-864cc1f6e8ac\\\\scratch\\\\patch_script.js', 'utf8');
const newFuncStart = patchContent.indexOf('function _renderDet(c) {');
const newFuncEnd = patchContent.lastIndexOf('}');
const newFunc = patchContent.substring(newFuncStart, newFuncEnd + 1);

const finalContent = content.substring(0, startIdx) + newFunc + "\n\n    " + content.substring(endIdx);
fs.writeFileSync(file, finalContent, 'utf8');
console.log('Successfully patched _renderDet!');
