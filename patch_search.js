const fs = require('fs');
let code = fs.readFileSync('frontend/index.html', 'utf8');

const regex = /<input type="text" placeholder="Pesquisar MTR por número, OS ou gerador\.\.\." oninput="window\.filtrarMTR\(this\.value\)" oninput="window\.filtrarMTR\(this\.value\)" style="([^"]+)">/;

if (regex.test(code)) {
    code = code.replace(regex, '<input type="search" autocomplete="off" name="mtr_busca" spellcheck="false" placeholder="Pesquisar MTR por número, OS ou gerador..." oninput="window.filtrarMTR(this.value)" style="$1">');
    fs.writeFileSync('frontend/index.html', code);
    console.log('PATCH SEARCH OK');
} else {
    console.log('REGEX SEARCH FAIL');
}
