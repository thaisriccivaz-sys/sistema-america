// frontend/sort_table.js

window.sortTable = function(th) {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Ignore if table is empty or loading
    if (rows.length === 0 || rows[0].querySelector('td[colspan]')) return;
    
    // Ignore "Ações" column
    if (th.innerText.toLowerCase().includes('aç')) return;
    
    const index = Array.from(th.parentNode.children).indexOf(th);
    const currentDir = th.dataset.sortDir || 'desc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    
    // Reset arrows on all other headers
    Array.from(th.parentNode.children).forEach(sibling => {
        sibling.dataset.sortDir = '';
        const icon = sibling.querySelector('i.ph-sort-ascending, i.ph-sort-descending, i.ph-arrows-down-up');
        if (icon) {
            icon.className = 'ph ph-arrows-down-up';
            icon.style.color = '#94a3b8';
        }
        sibling.style.background = sibling.dataset.origBg || sibling.style.background;
    });
    
    // Set current header arrow
    th.dataset.sortDir = newDir;
    let icon = th.querySelector('i.ph-sort-ascending, i.ph-sort-descending, i.ph-arrows-down-up');
    if (!icon) {
        th.innerHTML += ' <i class="ph ph-arrows-down-up" style="font-size:0.85em; margin-left:4px;"></i>';
        icon = th.querySelector('i');
    }
    icon.className = newDir === 'asc' ? 'ph ph-sort-ascending' : 'ph ph-sort-descending';
    icon.style.color = '#e67700'; // highlight color
    
    // Sort logic
    rows.sort((a, b) => {
        let aText = (a.children[index]?.innerText || '').trim();
        let bText = (b.children[index]?.innerText || '').trim();
        
        // Date DD/MM/YYYY or DD/MM/YYYY HH:MM
        const parseDate = (str) => {
            const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m) return new Date(m[3], m[2]-1, m[1]).getTime();
            return null;
        };
        const aDate = parseDate(aText);
        const bDate = parseDate(bText);
        if (aDate !== null && bDate !== null) {
            return newDir === 'asc' ? aDate - bDate : bDate - aDate;
        }
        
        // Numbers (handle R$ and formatting)
        let aClean = aText.replace(/[^\d.,\-]/g, '');
        let bClean = bText.replace(/[^\d.,\-]/g, '');
        if(aClean.includes(',') && aClean.indexOf(',') > aClean.indexOf('.')) {
             aClean = aClean.replace(/\./g, '').replace(',', '.');
        } else if (aClean.includes(',')) {
             aClean = aClean.replace(',', '.');
        }
        if(bClean.includes(',') && bClean.indexOf(',') > bClean.indexOf('.')) {
             bClean = bClean.replace(/\./g, '').replace(',', '.');
        } else if (bClean.includes(',')) {
             bClean = bClean.replace(',', '.');
        }

        const aNum = parseFloat(aClean);
        const bNum = parseFloat(bClean);
        
        if (!isNaN(aNum) && !isNaN(bNum) && /\d/.test(aText) && /\d/.test(bText)) {
             return newDir === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // String fallback
        return newDir === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
};
