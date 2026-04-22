const fs = require('fs');

try {
    let html = fs.readFileSync('frontend/index.html', 'utf8');

    // 1. Remove view-departamentos completely
    html = html.replace(/<!-- VIEW: DEPARTAMENTOS -->[\s\S]*?<section id="view-departamentos" class="content-view">[\s\S]*?<\/section>/, '');
    
    // 2. Add sub-tabs to view-cargos
    const targetString = '<div id="cargo-header-actions" class="header-actions" style="display: none; gap: 0.75rem;">';
    const splitIndex = html.indexOf(targetString);
    if(splitIndex > -1) {
        // we want to place the tabs right AFTER the end of the page-header div
        const afterHeader = html.indexOf('</div>\r\n                    <div class="card p-4">', splitIndex);
        if(afterHeader > -1) {
            const tabs = </div>

                    <!-- ABAS INTERNAS (CARGOS E DEPARTAMENTOS) -->
                    <div style="display: flex; gap: 4px; padding: 0 1rem; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; background: var(--bg-main);">
                        <button class="btn-sub-tab active" id="tab-btn-cargos" onclick="switchCargoDeptoTab('cargos')" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid var(--primary-color); color: var(--primary-color); font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: -2px;">
                            <i class="ph ph-briefcase"></i> Cargos
                        </button>
                        <button class="btn-sub-tab" id="tab-btn-departamentos" onclick="switchCargoDeptoTab('departamentos')" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-bottom: -2px;">
                            <i class="ph ph-buildings"></i> Departamentos
                        </button>
                    </div>

                    <!-- TAB 1: GESTÃO DE CARGOS -->
                    <div id="tab-content-cargos">;
            
            // Reconstruct HTML
            html = html.substring(0, afterHeader) + tabs + '\r\n                    <div class="card p-4">' + html.substring(afterHeader + 30);
            
            // Find the end of view-cargos content, which is before <!-- VIEW: DEPARTAMENTOS --> or </section>
            const endSection = html.indexOf('</section>', html.indexOf('id="view-cargos"'));
            if(endSection > -1) {
                const depTab = 
                    </div>
                    <!-- TAB 2: GESTÃO DE DEPARTAMENTOS -->
                    <div id="tab-content-departamentos" style="display: none;">
                        <div class="card mb-4 p-4">
                            <form id="form-departamento" class="flex-between" style="gap: 1rem;">
                                <input type="text" id="novo-departamento-nome" placeholder="Nome do Novo Departamento" style="flex-grow: 1;">
                                <button type="submit" class="btn btn-primary"><i class="ph ph-plus"></i> Adicionar Depto</button>
                            </form>
                        </div>
                        <div class="card">
                            <table class="table">
                                <thead><tr><th>ID</th><th>Nome do Departamento</th><th>Ações</th></tr></thead>
                                <tbody id="table-departamentos"></tbody>
                            </table>
                        </div>
                    </div>
                ;
                html = html.substring(0, endSection) + depTab + html.substring(endSection);
            }
        }
    }
    fs.writeFileSync('frontend/index.html', html);
    console.log("HTML replaced");

    // JS
    let appJs = fs.readFileSync('frontend/app.js', 'utf8');
    if(!appJs.includes('switchCargoDeptoTab')) {
        appJs += 
window.switchCargoDeptoTab = function(tab) {
    document.getElementById('tab-btn-cargos').style.color = '#64748b';
    document.getElementById('tab-btn-cargos').style.borderBottomColor = 'transparent';
    document.getElementById('tab-btn-cargos').style.fontWeight = '500';
    
    document.getElementById('tab-btn-departamentos').style.color = '#64748b';
    document.getElementById('tab-btn-departamentos').style.borderBottomColor = 'transparent';
    document.getElementById('tab-btn-departamentos').style.fontWeight = '500';
    
    document.getElementById('tab-content-cargos').style.display = 'none';
    document.getElementById('tab-content-departamentos').style.display = 'none';
    
    document.getElementById('tab-btn-' + tab).style.color = 'var(--primary-color)';
    document.getElementById('tab-btn-' + tab).style.borderBottomColor = 'var(--primary-color)';
    document.getElementById('tab-btn-' + tab).style.fontWeight = '600';
    document.getElementById('tab-content-' + tab).style.display = 'block';
};
;
        fs.writeFileSync('frontend/app.js', appJs);
    }
} catch(e) { console.error(e); }
