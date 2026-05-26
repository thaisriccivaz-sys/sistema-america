const fs = require('fs');
let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

const oldOpenColab = "window.abrirModalAddCredColab = function() {";
const newOpenColab = `window.abrirModalAddCredColab = function() {
    setTimeout(() => {
        if (typeof window.verificarLimiteColabCred === 'function') window.verificarLimiteColabCred();
    }, 100);`;
    
const oldOpenVeic = "window.abrirModalAddCredVeic = function() {";
const newOpenVeic = `window.abrirModalAddCredVeic = function() {
    setTimeout(() => {
        if (typeof window.verificarLimiteVeicCred === 'function') window.verificarLimiteVeicCred();
    }, 100);`;

if (!credJs.includes("setTimeout(() => {") && credJs.includes(oldOpenColab)) {
    credJs = credJs.replace(oldOpenColab, newOpenColab);
    credJs = credJs.replace(oldOpenVeic, newOpenVeic);
}

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated abrirModalAdd calls.");