let _itinLinks = JSON.parse(localStorage.getItem('itin_links') || '[]');

window.renderItinerantesPage = function() {
    const view = document.getElementById('view-logistica-itinerantes');
    if (!view) return;
    
    // Clear the view
    view.innerHTML = `
        <div style="padding: 20px; max-width: 1200px; margin: 0 auto; min-height: 80vh; background:#f8fafc;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px; background:#fff; padding:20px; border-radius:12px; box-shadow:0 2px 4px rgba(0,0,0,0.02); border:1px solid #e2e8f0;">
                <div>
                    <h2 style="margin:0; display:flex; align-items:center; gap:10px; color:#1e293b; font-size:1.4rem;">
                        <i class="ph-bold ph-bluetooth" style="color:#2d9e5f; background:#ecfdf5; padding:8px; border-radius:8px;"></i> 
                        Painel de Tags Bluetooth
                    </h2>
                    <p style="margin:8px 0 0; color:#64748b; font-size:0.95rem;">
                        Gerencie todos os seus links do <strong>Encontre Meu Dispositivo</strong> em um só lugar.
                    </p>
                </div>
                <button onclick="itinerantesAbrirModalNovo()" 
                    style="background:#2d9e5f; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.95rem; box-shadow:0 4px 6px -1px rgba(45,158,95,0.2);"
                    onmouseover="this.style.background='#22c55e'" onmouseout="this.style.background='#2d9e5f'">
                    <i class="ph-bold ph-plus"></i> Adicionar Tag
                </button>
            </div>
            
            <div id="itin-links-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
                <!-- Links rendered here -->
            </div>
        </div>
    `;
    itinerantesRenderizarGrid();
};

window.itinerantesRenderizarGrid = function() {
    const grid = document.getElementById('itin-links-grid');
    if (!grid) return;
    
    if (_itinLinks.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 80px 20px; background:#fff; border:2px dashed #cbd5e1; border-radius:16px;">
                <i class="ph-bold ph-link" style="font-size:3.5rem; color:#cbd5e1; margin-bottom:15px;"></i>
                <h3 style="margin:0 0 10px; color:#475569; font-size:1.3rem;">Nenhuma tag cadastrada</h3>
                <p style="margin:0 auto; color:#64748b; font-size:1rem; max-width:400px; line-height:1.5;">
                    Clique no botão acima para colar os links que você gerou no aplicativo <strong>Encontre Meu Dispositivo</strong>.
                </p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = _itinLinks.map(link => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; box-shadow:0 2px 4px rgba(0,0,0,0.02); display:flex; flex-direction:column; justify-content:space-between; transition:all 0.2s; position:relative;"
             onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.04)'; this.style.borderColor='#cbd5e1';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0';">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="background:#f8fafc; color:#3b82f6; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; border:1px solid #e2e8f0;">
                        <i class="ph-bold ph-map-pin-line"></i>
                    </div>
                    <div>
                        <h4 style="margin:0; color:#1e293b; font-size:1.1rem;">${link.nome}</h4>
                        <span style="color:#64748b; font-size:0.8rem;">Tag Bluetooth (Google)</span>
                    </div>
                </div>
                <button onclick="itinerantesExcluir('${link.id}')" style="background:#f8fafc; border:1px solid transparent; color:#94a3b8; cursor:pointer; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" title="Excluir Tag" onmouseover="this.style.background='#fef2f2'; this.style.color='#ef4444'; this.style.borderColor='#fecaca';" onmouseout="this.style.background='#f8fafc'; this.style.color='#94a3b8'; this.style.borderColor='transparent';">
                    <i class="ph-bold ph-trash" style="font-size:1.1rem;"></i>
                </button>
            </div>
            
            <button onclick="window.open('${link.url}', '_blank')" 
                style="background:#f1f5f9; border:1px solid #e2e8f0; color:#334155; padding:12px; border-radius:8px; width:100%; cursor:pointer; font-weight:600; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s;" 
                onmouseover="this.style.background='#3b82f6'; this.style.color='#fff'; this.style.borderColor='#3b82f6';" 
                onmouseout="this.style.background='#f1f5f9'; this.style.color='#334155'; this.style.borderColor='#e2e8f0';">
                <i class="ph-bold ph-arrow-square-out"></i> Localizar no Mapa
            </button>
        </div>
    `).join('');
};

window.itinerantesAbrirModalNovo = function() {
    const modal = document.createElement('div');
    modal.id = 'modal-itin-novo';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(2px);';
    modal.innerHTML = `
        <div style="background:#fff; width:100%; max-width:500px; border-radius:16px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); overflow:hidden; animation: slideDown 0.3s ease;">
            <div style="padding:20px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                <h3 style="margin:0; color:#1e293b; font-size:1.15rem; display:flex; align-items:center; gap:8px;">
                    <i class="ph-bold ph-link" style="color:#2d9e5f;"></i> Adicionar Nova Tag
                </h3>
                <i class="ph-bold ph-x" style="cursor:pointer; color:#64748b; font-size:1.2rem;" onclick="document.getElementById('modal-itin-novo').remove()" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'"></i>
            </div>
            <div style="padding:24px;">
                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; color:#475569; font-weight:600; font-size:0.9rem;">Nome do Cliente / Aparelho</label>
                    <input type="text" id="itin-input-nome" placeholder="Ex: Caminhão 02 - João Silva" style="width:100%; padding:12px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.95rem; outline:none; transition:all 0.2s;" onfocus="this.style.borderColor='#2d9e5f'; this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)';" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none';">
                </div>
                <div style="margin-bottom:28px;">
                    <label style="display:block; margin-bottom:8px; color:#475569; font-weight:600; font-size:0.9rem;">Link de Compartilhamento</label>
                    <textarea id="itin-input-url" placeholder="Cole aqui o link gerado pelo Google..." style="width:100%; padding:12px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; min-height:100px; resize:vertical; outline:none; transition:all 0.2s;" onfocus="this.style.borderColor='#2d9e5f'; this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)';" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none';"></textarea>
                    <p style="margin:8px 0 0; color:#94a3b8; font-size:0.75rem;">O link deve começar com <em>https://www.google.com/android/find/...</em></p>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:12px;">
                    <button onclick="document.getElementById('modal-itin-novo').remove()" style="background:#f1f5f9; color:#475569; border:none; padding:12px 20px; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.95rem; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Cancelar</button>
                    <button onclick="itinerantesSalvar()" style="background:#2d9e5f; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.95rem; transition:all 0.2s;" onmouseover="this.style.background='#22c55e'" onmouseout="this.style.background='#2d9e5f'">Salvar Tag</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => { document.getElementById('itin-input-nome').focus(); }, 100);
};

window.itinerantesSalvar = function() {
    const nome = document.getElementById('itin-input-nome').value.trim();
    const url = document.getElementById('itin-input-url').value.trim();
    
    if (!nome) return alert('Por favor, digite um nome para identificar a tag.');
    if (!url || !url.includes('google.com')) return alert('Por favor, cole um link válido do Google.');
    
    const id = 'tag_' + Date.now();
    _itinLinks.push({ id, nome, url });
    localStorage.setItem('itin_links', JSON.stringify(_itinLinks));
    
    document.getElementById('modal-itin-novo').remove();
    itinerantesRenderizarGrid();
};

window.itinerantesExcluir = function(id) {
    if (!confirm('Deseja realmente excluir este atalho de tag?')) return;
    _itinLinks = _itinLinks.filter(t => t.id !== id);
    localStorage.setItem('itin_links', JSON.stringify(_itinLinks));
    itinerantesRenderizarGrid();
};
