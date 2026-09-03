/**
 * fix_mercado_parser_final.js
 * Reescreve o bloco de parsing do mercado com regex correta e lógica robusta
 * Baseado na inspeção real dos PDFs:
 * - Linha de total: '|- \t- \t- \t- \t- \tR$ 183,28 R$ 0,00 \tR$ 183,28 R$ 0,00 \t-'
 * - O primeiro valor R$ na linha de totais = total do colaborador
 */
const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const oldBlock = `            try {
                const { PDFParse } = require('pdf-parse');
                const _mercParser = new PDFParse({ verbosity: 0, data: file.buffer });
                const _mercData = await _mercParser.getText();
                // getText() retorna objeto { text: '...' } — garantir que é string
                text = (typeof _mercData === 'string') ? _mercData : (_mercData.text || '');
            } catch (e) {
                console.error('Erro ao parsear PDF do mercado:', e.message);
                text = '';
            }
            
            // Buscar linha com regex /^\\|?-?[\\t -]+R\\$\\s*([\\d,.]+)/m ou buscar a linha com R$ 0,00 que contém o total
            const matchTotal = text.match(/^\\|?[\\t -]+R\\$\\s*([\\d,.]+)/m) || text.match(/R\\$\\s*([\\d,.]+)[\\s\\t]*R\\$\\s*0,00/i);
            
            if (matchTotal && matchTotal[1]) {
                valor = parseFloat(matchTotal[1].replace(',', '.'));
            } else {
                // Fallback: tentar encontrar o total de outra forma
                const matchFallback = text.match(/-\\s+R\\$\\s*([\\d,.]+)\\s+R\\$\\s*0,00/i) || text.match(/R\\$\\s*([\\d,.]+)/);
                if (matchFallback && matchFallback[1]) {
                    valor = parseFloat(matchFallback[1].replace(',', '.'));
                }
            }`;

const oldBlockCRLF = oldBlock.replace(/\n/g, '\r\n');

const newBlock = `            try {
                const { PDFParse } = require('pdf-parse');
                const _mParser = new PDFParse({ verbosity: 0, data: file.buffer });
                const _mData = await _mParser.getText();
                text = (_mData && typeof _mData.text === 'string') ? _mData.text : (typeof _mData === 'string' ? _mData : '');
            } catch (e) {
                console.error('[mercado-pdf-parse] Erro:', e.message);
                text = '';
            }
            
            // Extrair o valor total do PDF
            // Linha de total do Mercado Berlim: '|- \\t- \\t- \\t- \\t- \\tR$ 183,28 R$ 0,00 ...'
            // Estratégia: encontrar a linha com múltiplos '-' e R$ 0,00 (linha de totais)
            const linhasTxt = (typeof text === 'string') ? text.split('\\n') : [];
            let totalLineTxt = '';
            // Preferir linha que tem R$ X,XX R$ 0,00 (indicador de linha de total)
            for (const ln of linhasTxt) {
                if (ln.indexOf('R$ 0,00') !== -1 || ln.indexOf('R$\\t0,00') !== -1 || ln.indexOf('0,00') !== -1) {
                    // Linha de total tem pelo menos 2 valores monetários e traços
                    if ((ln.match(/R\\$/g) || []).length >= 2) {
                        totalLineTxt = ln;
                        break;
                    }
                }
            }
            if (totalLineTxt) {
                // Pegar o primeiro valor R$ desta linha
                const mV = totalLineTxt.match(/R\\$\\s*([\\d]+(?:[.,][\\d]+)?)/);
                if (mV && mV[1]) {
                    valor = parseFloat(mV[1].replace(',', '.'));
                }
            }
            if (!valor && typeof text === 'string' && text.length > 0) {
                // Fallback: pegar todos os valores monetários e retornar o maior (= total)
                const todosValores = [];
                const regV = /R\\$\\s*([\\d]+(?:[.,][\\d]+)?)/g;
                let mFB;
                while ((mFB = regV.exec(text)) !== null) {
                    const v = parseFloat(mFB[1].replace(',', '.'));
                    if (!isNaN(v) && v > 0) todosValores.push(v);
                }
                if (todosValores.length > 0) valor = Math.max(...todosValores);
            }`;

let found = false;
if (code.indexOf(oldBlock) !== -1) {
    code = code.replace(oldBlock, newBlock);
    found = true;
    console.log('✅ Fix (LF): bloco parser mercado substituído');
} else if (code.indexOf(oldBlockCRLF) !== -1) {
    code = code.replace(oldBlockCRLF, newBlock);
    found = true;
    console.log('✅ Fix (CRLF): bloco parser mercado substituído');
}

if (!found) {
    // Tentar localização por âncora única
    const anchor = "// Buscar linha com regex /^\\\\|?-?[\\\\t -]+R\\\\$\\\\s*([\\\\d,.]+)/m";
    const anchorSimple = '// Buscar linha com regex';
    const idx = code.indexOf(anchorSimple);
    if (idx !== -1) {
        console.log('Âncora simples encontrada em idx:', idx);
        // Encontrar o bloco try/catch que veio antes (vai até 'catch (e)')
        const tryStart = code.lastIndexOf('try {', idx);
        // Encontrar o fim do bloco if(!valor...) depois
        let braceDepth = 0; let inBlock = false; let blockEnd = idx;
        for (let i = idx; i < code.length; i++) {
            if (code[i] === '{') { braceDepth++; inBlock = true; }
            if (code[i] === '}') { braceDepth--; if (inBlock && braceDepth === 0) { blockEnd = i + 1; break; } }
        }
        // Encontrar o if(!valor) logo em seguida
        const ifNoValor = code.indexOf('if (!valor', blockEnd);
        let finalEnd = blockEnd;
        if (ifNoValor !== -1 && ifNoValor < blockEnd + 300) {
            let d2 = 0; let started2 = false;
            for (let i = ifNoValor; i < code.length; i++) {
                if (code[i] === '{') { d2++; started2 = true; }
                if (code[i] === '}') { d2--; if (started2 && d2 === 0) { finalEnd = i + 1; break; } }
            }
        }
        code = code.substring(0, tryStart) + newBlock + code.substring(finalEnd);
        found = true;
        console.log('✅ Fix (âncora simples): bloco parser mercado substituído');
    }
}

if (!found) { console.log('❌ Nenhuma âncora encontrada — bloco não substituído'); }

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Backend salvo, tamanho:', code.length);
