import sys, re

content = open('frontend/sac.js', 'r', encoding='utf-8', errors='ignore').read()

# Replace const -> let
content = content.replace('const OCCURRENCES_BY_TYPE = {', 'let OCCURRENCES_BY_TYPE = {')

# Replace loadTickets
pattern_load = re.compile(r'async function loadTickets\(\) \{.*?if \(!_tickets\) _tickets = \[\];\s*\}', re.DOTALL)
new_load = '''async function loadTickets() {
    try {
      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [ticketsRes, deptsRes, usersRes, occsRes] = await Promise.all([
        fetch('/api/sac/tickets', { headers }),
        fetch('/api/departamentos', { headers }).catch(() => null),
        fetch('/api/usuarios', { headers }).catch(() => null),
        fetch('/api/sac/ocorrencias', { headers }).catch(() => null)
      ]);
      if (ticketsRes.ok) _tickets = await ticketsRes.json();
      if (deptsRes && deptsRes.ok) _globalDepartamentos = await deptsRes.json();
      if (usersRes && usersRes.ok) window._sacUsersList = await usersRes.json();
      if (occsRes && occsRes.ok) {
        const occs = await occsRes.json();
        window._sacOccurrencesRaw = occs;
        const updatedOccurrences = {};
        occs.forEach(o => {
            if (!updatedOccurrences[o.type_key]) updatedOccurrences[o.type_key] = [];
            updatedOccurrences[o.type_key].push(o.description);
        });
        if (Object.keys(updatedOccurrences).length > 0) {
            OCCURRENCES_BY_TYPE = { ...OCCURRENCES_BY_TYPE, ...updatedOccurrences };
        }
      }
    } catch(e) { console.error('[SAC] Erro ao carregar chamados/ocorrencias', e); }
    if (!_tickets) _tickets = [];
  }'''

if pattern_load.search(content):
    content = pattern_load.sub(new_load, content)
else:
    print('Failed to find loadTickets')

# Replace renderConfig
pattern_render = re.compile(r'function renderConfig\(container\) \{.*?\}\s*// ── WIZARD', re.DOTALL)
new_render = '''function renderConfig(container) {
    const typesList = Object.entries(TICKET_TYPES);
    const rawOccs = window._sacOccurrencesRaw || [];
    
    let html = `
    <div style="padding:20px;overflow-y:auto;height:100%;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:8px;">
          <i class="ph ph-sliders-horizontal" style="color:#f97316;"></i> Tipos de Ocorrência por Chamado
        </h3>
        <button onclick="window._sacOpenNewOccModal()" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;font-size:0.85rem;">
          <i class="ph ph-plus"></i> Nova Ocorrência
        </button>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
    `;

    typesList.forEach(([typeKey, typeDef]) => {
      const occsForType = rawOccs.filter(o => o.type_key === typeKey);
      
      html += `
        <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;font-weight:600;color:#334155;">
            ${typeDef.icon} ${typeDef.name}
          </div>
          <div style="padding:12px 16px;">
            ${occsForType.length === 0 ? '<p style="margin:0;color:#94a3b8;font-size:0.85rem;">Nenhuma ocorrência cadastrada.</p>' : `
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <tbody>
                  ${occsForType.map(o => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:8px;color:#475569;">${o.description}</td>
                      <td style="padding:8px;text-align:right;width:80px;">
                        <button onclick="window._sacEditOcc(${o.id})" style="background:transparent;border:none;color:#3b82f6;cursor:pointer;padding:4px;" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button onclick="window._sacDeleteOcc(${o.id})" style="background:transparent;border:none;color:#ef4444;cursor:pointer;padding:4px;" title="Excluir"><i class="ph ph-trash"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;
    });

    html += `
      </div>
    </div>`;
    
    container.innerHTML = html;
  }

  // ── WIZARD'''

if pattern_render.search(content):
    content = pattern_render.sub(lambda m: new_render, content)
else:
    print('Failed to find renderConfig')

open('frontend/sac.js', 'w', encoding='utf-8').write(content)
print('Done.')
