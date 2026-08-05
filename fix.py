import sys

with open('frontend/app_homologacao.js', 'r', encoding='latin-1') as f:
    content = f.read()

content = content.replace(
    "const docPagamentos = docs.find(x => x.document_type === 'Pagamentos');\n    const slotPag = createDocSlot('Pagamentos', 'Pagamentos', docPagamentos",
    "const docPagamentos = [...docs].sort((a, b) => b.id - a.id).find(x => x.document_type === 'Pagamentos');\n    const slotPag = createDocSlot('Pagamentos', 'Pagamentos', docPagamentos"
)

content = content.replace(
    "                <select id=\"ass-filter-status\" onchange=\"window.filtrarAssinaturas()\"\n                    style=\"border:1px solid #e2e8f0;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.85rem;color:#334155;background:#fff;cursor:pointer;\">",
    "                <select id=\"digitais-filter-status\" onchange=\"window.filtrarAssinaturas()\"\n                    style=\"border:1px solid #e2e8f0;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.85rem;color:#334155;background:#fff;cursor:pointer;\">"
)

content = content.replace(
    "    const search = (document.getElementById('ass-search')?.value || '').toLowerCase();\n    const filterColab = (document.getElementById('ass-filter-colab')?.value || '').toLowerCase();\n    const filterStatus = document.getElementById('ass-filter-status')?.value || '';",
    "    const search = (document.getElementById('ass-search')?.value || '').toLowerCase();\n    const filterColab = (document.getElementById('ass-filter-colab')?.value || '').toLowerCase();\n    const filterStatus = document.getElementById('digitais-filter-status')?.value || '';"
)

with open('frontend/app_homologacao.js', 'w', encoding='latin-1') as f:
    f.write(content)

print("Replacement complete")
