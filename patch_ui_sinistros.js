const fs = require('fs');
const file = 'frontend/sinistros.js';
let content = fs.readFileSync(file, 'utf8');

const searchHtml = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                <div class="input-group">
                                    <label>Parcelamento</label>
                                    <select id="sin-parcelas" class="form-control">
                                        <option value="1">1x</option>
                                        <option value="2">2x</option>
                                        <option value="3">3x</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Valor da Parcela (R$)</label>
                                    <input type="text" id="sin-valor-parcela" class="form-control" placeholder="0,00">
                                </div>
                            </div>
                            <p style="margin:10px 0 5px; font-weight:600; font-size:0.85rem;">Deseja anexar orçamentos?</p>
                            <div style="display:flex; gap:1.5rem; margin-bottom:8px;">
                                <label style="cursor:pointer;"><input type="radio" name="sin-orcamento" value="Sim" onclick="document.getElementById('sin-orc-upload').style.display='block'"> Sim</label>
                                <label style="cursor:pointer;"><input type="radio" name="sin-orcamento" value="Não" checked onclick="document.getElementById('sin-orc-upload').style.display='none'"> Não</label>
                            </div>
                            <div id="sin-orc-upload" style="display:none;">
                                <input type="file" id="sin-file-orcamentos" accept=".pdf,image/*" multiple class="form-control" style="font-size:0.8rem;">
                            </div>`;

const replaceHtml = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                <div class="input-group">
                                    <label>Valor Total do Desconto (R$)</label>
                                    <input type="text" id="sin-valor-total" class="form-control" placeholder="0,00" oninput="window._calcSinParcela()">
                                </div>
                                <div class="input-group">
                                    <label>Parcelamento</label>
                                    <select id="sin-parcelas" class="form-control" onchange="window._calcSinParcela()">
                                        <option value="1">1x</option>
                                        <option value="2">2x</option>
                                        <option value="3">3x</option>
                                        <option value="4">4x</option>
                                        <option value="5">5x</option>
                                        <option value="6">6x</option>
                                        <option value="7">7x</option>
                                        <option value="8">8x</option>
                                        <option value="9">9x</option>
                                        <option value="10">10x</option>
                                        <option value="11">11x</option>
                                        <option value="12">12x</option>
                                    </select>
                                    <small id="sin-valor-parcela-display" style="display:block; margin-top:4px; font-weight:600; color:#059669;">Parcela: R$ 0,00</small>
                                </div>
                            </div>
                            <p style="margin:10px 0 5px; font-weight:600; font-size:0.85rem;">Deseja anexar orçamentos?</p>
                            <div style="display:flex; gap:1.5rem; margin-bottom:8px;">
                                <label style="cursor:pointer;"><input type="radio" name="sin-orcamento" value="Sim" onclick="document.getElementById('sin-orc-upload').style.display='block'"> Sim</label>
                                <label style="cursor:pointer;"><input type="radio" name="sin-orcamento" value="Não" checked onclick="document.getElementById('sin-orc-upload').style.display='none'"> Não</label>
                            </div>
                            <div id="sin-orc-upload" style="display:none; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:10px;">
                                <div id="sin-orcamentos-list" style="display:flex; flex-direction:column; gap:8px;">
                                    <input type="file" name="sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem;">
                                </div>
                                <button type="button" class="btn btn-sm" onclick="window._addSinOrcField()" style="margin-top:8px; width:100%; border:1px dashed #cbd5e1; background:#fff; color:#475569;"><i class="ph ph-plus"></i> Anexar mais documentos</button>
                            </div>`;

content = content.replace(searchHtml, replaceHtml);

if (!content.includes('window._addSinOrcField =')) {
    content += `\nwindow._addSinOrcField = function() {
    const list = document.getElementById('sin-orcamentos-list');
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'sin_orc_file';
    input.accept = '.pdf,image/*';
    input.className = 'form-control';
    input.style.fontSize = '0.8rem';
    list.appendChild(input);
};

window._calcSinParcela = function() {
    const vTotalStr = document.getElementById('sin-valor-total').value || '0';
    const vTotalRaw = parseFloat(vTotalStr.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    const qtd = parseInt(document.getElementById('sin-parcelas').value) || 1;
    const vParcela = vTotalRaw / qtd;
    
    document.getElementById('sin-valor-parcela-display').innerText = 'Parcela: R$ ' + vParcela.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    // Guarda o valor formatado num atributo oculto no elemento de parcelas
    document.getElementById('sin-parcelas').dataset.valor_parcela = vParcela.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
};\n`;
}

// Em formData.append('valor_parcela', document.getElementById('sin-valor-parcela').value);
const searchFormData1 = "formData.append('valor_parcela', document.getElementById('sin-valor-parcela').value);";
const replaceFormData1 = "formData.append('valor_parcela', document.getElementById('sin-parcelas').dataset.valor_parcela || '0,00');\n        formData.append('valor_total', document.getElementById('sin-valor-total').value);";
content = content.replace(searchFormData1, replaceFormData1);

// Em const filesOrc = document.getElementById('sin-file-orcamentos').files;
const searchOrcFiles = `const filesOrc = document.getElementById('sin-file-orcamentos').files;
            if (filesOrc.length > 0) {
                const orcsBase64 = [];
                for (const f of filesOrc) {`;

const replaceOrcFiles = `const fileInputs = document.querySelectorAll('input[name="sin_orc_file"]');
            const filesOrc = [];
            fileInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesOrc.push(f); });
            if (filesOrc.length > 0) {
                const orcsBase64 = [];
                for (const f of filesOrc) {`;

content = content.replace(searchOrcFiles, replaceOrcFiles);

fs.writeFileSync(file, content, 'utf8');
console.log('UI patch applied');
