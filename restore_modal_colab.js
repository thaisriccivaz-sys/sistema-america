const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const modalHTML = `
    <!-- MODAL: SELECIONAR COLABORADOR PARA CREDENCIAMENTO -->
    <div id="modal-cred-colab" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Selecionar Colaboradores</h3>
                <span class="close-modal" onclick="window.fecharModalAddCredColab()">&times;</span>
            </div>
            <div class="modal-body">
                <input type="text" id="busca-cred-colab" class="form-control" placeholder="Buscar colaborador..." onkeyup="window.filtrarListaCred('lista-selecao-colab', this.value)" style="margin-bottom: 15px;">
                <div id="lista-selecao-colab" style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px;">
                    <!-- Preenchido via JS -->
                </div>
            </div>
            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap: 10px; margin-top: 15px;">
                <button class="btn btn-outline" onclick="window.fecharModalAddCredColab()">Cancelar</button>
                <button id="btn-todos-colabs" class="btn btn-secondary" onclick="window.selecionarTodosColabs()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">Selecionar Todos</button>
                <button class="btn btn-primary" onclick="window.confirmarSelecaoCredColab()">Adicionar Selecionados</button>
            </div>
        </div>
    </div>
`;

const target = '<!-- MODAL: SELECIONAR VEICULO PARA CREDENCIAMENTO -->';
if (html.includes(target) && !html.includes('id="modal-cred-colab"')) {
    html = html.replace(target, modalHTML + '\n    ' + target);
    fs.writeFileSync('frontend/index.html', html, 'utf8');
    console.log('Modal restaurado.');
} else {
    console.log('Target not found or modal already exists.');
}
