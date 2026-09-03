const fs = require('fs');
let code = fs.readFileSync('frontend/equipes.js', 'utf8');

// The popup HTML needs to be injected into the DOM.
const popupHtml = \
<!-- Modal de Habilidades -->
<div id="eq-habilidades-modal" class="eq-modal-overlay" style="display:none;z-index:9999;">
  <div class="eq-modal" style="max-width:400px;">
    <h3 style="margin-top:0;margin-bottom:1rem;color:#0f172a;font-size:1.1rem;">Habilidades do Colaborador</h3>
    <div id="eq-hab-colab-name" style="margin-bottom:1rem;font-weight:600;color:#334155;"></div>
    
    <div id="eq-hab-checkboxes" style="display:flex;flex-direction:column;gap:8px;margin-bottom:1.5rem;">
      <!-- Preenchido via JS -->
    </div>

    <!-- Div para Thais.Ricci -->
    <div id="eq-hab-thais-area" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid #e2e8f0;">
      <label style="display:flex;align-items:center;gap:8px;font-weight:600;color:#ef4444;cursor:pointer;">
        <input type="checkbox" id="eq-hab-destaque-check">
        Destacar com borda vermelha
      </label>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:1.5rem;">
      <button class="eq-btn-sec" onclick="document.getElementById('eq-habilidades-modal').style.display='none'">Cancelar</button>
      <button class="eq-btn-primary" onclick="window._eqSalvarHabilidades()">Salvar</button>
    </div>
  </div>
</div>
\;

if (!code.includes('eq-habilidades-modal')) {
    code = code.replace(
        /(<div id="eq-modal" class="eq-modal-overlay" style="display:none;">)/,
        popupHtml + '\n'
    );
}

// Now replace the onclick handler on the card:
// onclick="window._eqToggleDestaque(event, \)" -> onclick="window._eqAbrirHabilidades(event, \)"
code = code.replace(
    /onclick="window\._eqToggleDestaque\(event, \$\{m\.colaborador_id\|\|m\.id\}\)"/g,
    'onclick="window._eqAbrirHabilidades(event, )"'
);

// Add the JS functions for opening and saving skills
const jsFunctions = \
window._eqHabColabId = null;
window._eqAbrirHabilidades = function(e, colabId) {
    if (e.target.closest('button') || e.target.closest('.ph-x')) return;
    window._eqHabColabId = colabId;
    
    // Buscar o colaborador
    let colab = null;
    _equipes.forEach(eq => {
        const m = eq.membros.find(x => (x.colaborador_id||x.id) === colabId);
        if (m) colab = m;
    });
    if (!colab) colab = _semEquipe.find(x => (x.colaborador_id||x.id) === colabId);
    if (!colab) return;

    document.getElementById('eq-hab-colab-name').textContent = colab.nome_completo || colab.nome || '';
    
    // Regras de Habilidades
    const cargo = (colab.cargo || colab.funcao || '').toLowerCase();
    const cnh = (colab.cnh_categoria || '').toUpperCase();
    
    const isLider = cargo.includes('líder') || cargo.includes('lider');
    const isMotorista = cargo.includes('motorista');
    const cnhCaminhao = ['C', 'D', 'E', 'AC', 'AD', 'AE'].includes(cnh);
    
    let skillsDisponiveis = [];
    if (isLider) {
        skillsDisponiveis = ['Caminhão', 'Carretinha', 'VAC', 'Reparos', 'Montagem', 'Desmontagem'];
    } else if (isMotorista) {
        skillsDisponiveis = ['Carretinha', 'VAC', 'Reparos', 'Montagem', 'Desmontagem'];
        if (cnhCaminhao) skillsDisponiveis.unshift('Caminhão');
    } else {
        // Ajudantes
        skillsDisponiveis = ['VAC', 'Reparos', 'Montagem', 'Desmontagem'];
    }

    // Parse habilidades atuais
    let habsAtuais = [];
    try {
        if (colab.habilidades_equipe) habsAtuais = JSON.parse(colab.habilidades_equipe);
    } catch(e) {}

    // Renderizar checkboxes
    const container = document.getElementById('eq-hab-checkboxes');
    container.innerHTML = skillsDisponiveis.map(sk => {
        const checked = habsAtuais.includes(sk) ? 'checked' : '';
        return \\\
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" class="eq-hab-chk" value="\\\" \\\>
                \\\
            </label>
        \\\;
    }).join('');

    // Checkbox da Thais
    const erpUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
    const isThais = (erpUser.username === 'Thais.Ricci' || erpUser.nome === 'Thais.Ricci');
    
    const thaisArea = document.getElementById('eq-hab-thais-area');
    const thaisCheck = document.getElementById('eq-hab-destaque-check');
    if (isThais) {
        thaisArea.style.display = 'block';
        thaisCheck.checked = (colab.destaque_equipe === 1);
    } else {
        thaisArea.style.display = 'none';
        thaisCheck.checked = false;
    }

    document.getElementById('eq-habilidades-modal').style.display = 'flex';
};

window._eqSalvarHabilidades = async function() {
    const colabId = window._eqHabColabId;
    if (!colabId) return;

    const inputs = document.querySelectorAll('.eq-hab-chk');
    const selecionadas = Array.from(inputs).filter(i => i.checked).map(i => i.value);

    const erpUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
    const isThais = (erpUser.username === 'Thais.Ricci' || erpUser.nome === 'Thais.Ricci');
    const querDestaque = isThais ? document.getElementById('eq-hab-destaque-check').checked : null;

    try {
        // Salvar habilidades
        const resHab = await _eq_patch(\\\/colaboradores/\\\/habilidades_equipe\\\, { habilidades: JSON.stringify(selecionadas) });
        
        // Atualizar nos dados locais
        if (resHab.sucesso) {
            let colab = null;
            _equipes.forEach(eq => {
                const m = eq.membros.find(x => (x.colaborador_id||x.id) === colabId);
                if (m) { m.habilidades_equipe = JSON.stringify(selecionadas); colab = m; }
            });
            if (!colab) {
                const sem = _semEquipe.find(x => (x.colaborador_id||x.id) === colabId);
                if (sem) { sem.habilidades_equipe = JSON.stringify(selecionadas); colab = sem; }
            }

            // Se for a Thais e ela mudou o destaque, disparar a requisição de destaque
            if (isThais && colab) {
                const destaqueAtual = (colab.destaque_equipe === 1);
                if (destaqueAtual !== querDestaque) {
                    await _eq_patch(\\\/colaboradores/\\\/destaque\\\, {});
                    colab.destaque_equipe = querDestaque ? 1 : 0;
                }
            }

            document.getElementById('eq-habilidades-modal').style.display = 'none';
            const board = document.getElementById('equipes-board');
            if (board) board.innerHTML = _renderBoard(_busca);
            _reRenderFora();
            const { vEq } = _getVirtualData();
            const reservaEq = vEq.find(eq => eq.nome === 'Equipe Reserva');
            const intermitenteEq = vEq.find(eq => eq.nome === 'Equipe Intermitente');
            if (reservaEq) _reRenderColuna(reservaEq.id);
            if (intermitenteEq) _reRenderColuna(intermitenteEq.id);
        }
    } catch (err) {
        console.error('Erro ao salvar habilidades:', err);
        alert('Erro ao salvar.');
    }
};
\;

if (!code.includes('window._eqAbrirHabilidades')) {
    code = code.replace(
        /window\._eqToggleDestaque = async function\(e, colabId\) \{[\s\S]*?^\};\n/m,
        '$&\n' + jsFunctions
    );
}

// Modify the border logic to only show for Thais.Ricci
code = code.replace(
    /if \(m\.destaque_equipe === 1\) \{\s*borderStyle \+= 'border-color:#ef4444;border-width:2px;border-style:solid;';\s*\}/,
    \const erpUserEq = JSON.parse(localStorage.getItem('erp_user') || '{}');\n  const isThaisEq = (erpUserEq.username === 'Thais.Ricci' || erpUserEq.nome === 'Thais.Ricci');\n  if (m.destaque_equipe === 1 && isThaisEq) {\n      borderStyle += 'border-color:#ef4444;border-width:2px;border-style:solid;';\n  }\
);

fs.writeFileSync('frontend/equipes.js', code);
console.log('Fixed equipes UI');
