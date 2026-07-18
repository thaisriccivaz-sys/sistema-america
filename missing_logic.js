// ==========================================
// SEARCH & BOOKMARKS LOGIC
// ==========================================

window._pageBookmarks = JSON.parse(localStorage.getItem('pageBookmarks') || '[]');

function getNormalizedPageSearchData() {
    const pages = [];
    for (const [key, obj] of Object.entries(BREADCRUMB_MAP)) {
        const parts = obj.path.split('ÔåÆ').map(p => p.trim());
        const rootPath = parts[0];

        let targetKey = key;
        let rootCode = obj.code;

        // Se a tela for interna (sem c├│digo), redireciona o clique para a root (a raiz, ex: Colaboradores)
        if (!obj.code) {
            const rootEntry = Object.entries(BREADCRUMB_MAP).find(([k, v]) => v.path === rootPath && v.code);
            if (rootEntry) {
                targetKey = rootEntry[0];
                rootCode = rootEntry[1].code;
            } else {
                // Algumas rotas ra├¡zes podem variar os nomes, tentar dedu├º├Áes cruas:
                if (rootPath.includes('Colaboradores')) {
                    targetKey = 'colaboradores'; rootCode = 'RHCL00';
                } else if (rootPath.includes('EPI')) {
                    targetKey = 'ficha-epi'; rootCode = 'RHEPI01';
                }
            }
        }

        pages.push({ key: targetKey, name: obj.path, code: rootCode });
    }
    return pages;
}

window.handlePageSearch = function (q) {
    const resDiv = document.getElementById('page-search-results');
    if (!resDiv) return;
    q = (q || '').toLowerCase().trim();
    if (!q) { resDiv.style.display = 'none'; return; }

    const all = getNormalizedPageSearchData();
    const filtered = all.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));

    if (filtered.length === 0) {
        resDiv.innerHTML = '<div style="padding:10px; color:#64748b; font-size:0.85rem;">Nenhuma p├ígina encontrada.</div>';
    } else {
        resDiv.innerHTML = filtered.map(p => {
            const tMeta = getTabMeta(p.key) || { color: '#64748b', icon: 'ph-browsers', title: p.name };
            const color = tMeta.color || '#f503c5';

            let menuName = 'RH';
            let menuIcon = 'ph-users';
            if (color === '#d9480f') { menuName = 'Diretoria'; menuIcon = 'ph-crown'; }
            else if (color === '#2d9e5f' || color === '#1e3a5f') { menuName = 'Log├¡stica'; menuIcon = 'ph-truck'; }
            else if (color === '#1971c2') { menuName = 'Financeiro'; menuIcon = 'ph-currency-dollar'; }
            else if (color === '#7048e8') { menuName = 'Comercial'; menuIcon = 'ph-handshake'; }
            else if (color === '#e67700') { menuName = 'Administrativo'; menuIcon = 'ph-gear'; }

            let screenName = tMeta.title || p.name;
            if (p.key.startsWith('tab:')) screenName = 'Prontu├írio: ' + (p.key.replace('tab:', '') || screenName);

            return `
            <div onclick="abrirAbaOuNavegar('${p.key}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; font-size:0.85rem; display:flex; align-items:center; gap:8px; color:${color}; font-weight:600;">
                <i class="ph ${menuIcon}" style="font-size:1.1rem;"></i>
                <span>${menuName}</span>
                <span style="color:#cbd5e1; margin:0 4px;">-</span>
                <i class="ph ${tMeta.icon || 'ph-browsers'}" style="font-size:1.1rem;"></i>
                <span>${screenName}</span>
            </div>
            `;
        }).join('');
    }
    resDiv.style.display = 'block';
};

window.abrirAbaOuNavegar = function (key) {
    if (key.startsWith('tab:')) {
        const tabName = key.replace('tab:', '');
        const li = document.querySelector(`#tabs-list li[data-tab="${tabName}"]`);
        if (li) {
            // Se estivermos fora do prontu├írio, n├úo rola assim direto sem abrir o colab. 
            // Mas vamos assumir que o usu├írio s├│ favorita as abas quando est├í num colaborador
            renderTabContent(tabName, li.textContent.trim());
        }
    } else {
        navigateTo(key);
    }
    document.getElementById('page-search-results').style.display = 'none';
};

window.toggleBookmarkCurrentPage = function () {
    if (!window.currentBreadcrumbKey) return;
    const idx = window._pageBookmarks.indexOf(window.currentBreadcrumbKey);
    if (idx >= 0) {
        window._pageBookmarks.splice(idx, 1);
    } else {
        window._pageBookmarks.push(window.currentBreadcrumbKey);
    }
    localStorage.setItem('pageBookmarks', JSON.stringify(window._pageBookmarks));
    renderBookmarks();
};

window.renderBookmarks = function () {
    const list = document.getElementById('bookmarks-list');
    const starBtn = document.getElementById('btn-star-page');
    if (!list || !starBtn) return;

    // Update star button state (filled or outline)
    if (window._pageBookmarks.includes(window.currentBreadcrumbKey)) {
        starBtn.innerHTML = '<i class="ph-fill ph-star"></i>';
    } else {
        starBtn.innerHTML = '<i class="ph ph-star"></i>';
    }

    list.innerHTML = window._pageBookmarks.map(key => {
        const obj = BREADCRUMB_MAP[key];
        if (!obj) return ''; // entrada n├úo mapeada - ignorar com seguran├ºa

        // Ignorar tabs ou caminhos com setas, a menos que seja usuarios-permissoes ou form-usuario
        if ((obj.path.includes('ÔåÆ') && key !== 'usuarios-permissoes' && key !== 'form-usuario') || key.startsWith('tab:')) return '';

        // Detecta a cor certa com base no TAB_META
        const tabMeta = TAB_META[key];
        let btnColor = tabMeta ? tabMeta.color : '#f503c5';
        if (!tabMeta) {
            if (obj.path.includes('Diretoria')) btnColor = '#d9480f';
        }

        let btnLabel = obj.path;
        if (key === 'usuarios-permissoes' || key === 'form-usuario') {
            btnLabel = 'Usu├írios';
        }
        if (key === 'pagamentos-massa') {
            btnLabel = 'Docs. em Massa';
        }
        if (key === 'recibos') {
            btnLabel = 'Recibos';
        }

        return `<button onclick="abrirAbaOuNavegar('${key}')" style="background:${btnColor}; color:white; border:none; border-radius:16px; padding:4px 12px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(0,0,0,0.2); transition:transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">${btnLabel}</button>`;
    }).join('');
};

// Hook renderBookmarks inside navigateTo and renderTabContent
const _oldNavigateTo = window.navigateTo;
window.navigateTo = function (viewId, pushState) {
    _oldNavigateTo.call(window, viewId, pushState);
    if (typeof renderBookmarks === 'function') renderBookmarks();
};
const _oldRenderTabContent = window.renderTabContent;
window.renderTabContent = function (tabId, tabName, force) {
    if (_oldRenderTabContent) _oldRenderTabContent.call(window, tabId, tabName, force);
    if (typeof renderBookmarks === 'function') renderBookmarks();
};

// Start hooks
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderBookmarks, 500);
});

// ==========================================
// SIDEBAR TOGGLE
// ==========================================
window._sidebarCollapsed = false;

window.toggleSidebar = function () {
    const sidebar = document.getElementById('app-sidebar');
    const wrapper = document.querySelector('.main-wrapper');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;
    window._sidebarCollapsed = !window._sidebarCollapsed;
    sidebar.classList.toggle('collapsed', window._sidebarCollapsed);
    wrapper && wrapper.classList.toggle('sidebar-collapsed', window._sidebarCollapsed);
    if (icon) {
        icon.className = window._sidebarCollapsed ? 'ph ph-sidebar-simple-duotone' : 'ph ph-sidebar-simple';
    }
    localStorage.setItem('sidebarCollapsed', window._sidebarCollapsed ? '1' : '0');
};

// Restore sidebar state on load
(function () {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === '1') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const sidebar = document.getElementById('app-sidebar');
                const wrapper = document.querySelector('.main-wrapper');
                const icon = document.getElementById('sidebar-toggle-icon');
                if (sidebar) sidebar.classList.add('collapsed');
                if (wrapper) wrapper.classList.add('sidebar-collapsed');
                if (icon) icon.className = 'ph ph-sidebar-simple-duotone';
                window._sidebarCollapsed = true;
            }, 100);
        });
    }
})();

