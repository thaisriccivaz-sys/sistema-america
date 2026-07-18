window.filterTabsList = function (q) {
    q = (q || '').toLowerCase().trim();
    document.querySelectorAll('#tabs-list li').forEach(li => {
        const text = li.textContent.trim().toLowerCase();
        // Never hide the hidden ones (Boletim, Conjuge) unless they match
        const originallyHidden = li.id === 'tab-conjuge' || false /* Boletim de ocorrencia removido */;
        if (!q) {
            li.style.display = originallyHidden ? 'none' : '';
        } else {
            li.style.display = text.includes(q) ? '' : 'none';
        }
    });
};


// ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
