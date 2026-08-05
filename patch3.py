import sys, re

content = open('frontend/sac.js', 'r', encoding='utf-8', errors='ignore').read()

new_functions = '''
  // ── OCCURRENCES CRUD ───────────────────────────────────────────────────
  window._sacOpenNewOccModal = function() {
    window._sacCurrentEditOccId = null;
    document.getElementById('sac-occ-modal-title').innerText = 'Nova Ocorrência';
    document.getElementById('sac-occ-type').value = 'manutencao';
    document.getElementById('sac-occ-desc').value = '';
    document.getElementById('sac-occ-modal').style.display = 'flex';
  };

  window._sacEditOcc = function(id) {
    const rawOccs = window._sacOccurrencesRaw || [];
    const occ = rawOccs.find(o => o.id === id);
    if (!occ) return;
    window._sacCurrentEditOccId = id;
    document.getElementById('sac-occ-modal-title').innerText = 'Editar Ocorrência';
    document.getElementById('sac-occ-type').value = occ.type_key;
    document.getElementById('sac-occ-desc').value = occ.description;
    document.getElementById('sac-occ-modal').style.display = 'flex';
  };

  window._sacCloseOccModal = function() {
    document.getElementById('sac-occ-modal').style.display = 'none';
  };

  window._sacSaveOcc = async function() {
    const type_key = document.getElementById('sac-occ-type').value;
    const description = document.getElementById('sac-occ-desc').value.trim();
    if (!description) { showToast('Descrição é obrigatória', 'error'); return; }

    const id = window._sacCurrentEditOccId;
    const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
    
    try {
      let res;
      if (id) {
        res = await fetch(`/api/sac/ocorrencias/${id}`, {
          method: 'PUT',
          headers: {'Authorization':'Bearer '+token, 'Content-Type':'application/json'},
          body: JSON.stringify({ type_key, description })
        });
      } else {
        res = await fetch('/api/sac/ocorrencias', {
          method: 'POST',
          headers: {'Authorization':'Bearer '+token, 'Content-Type':'application/json'},
          body: JSON.stringify({ type_key, description })
        });
      }
      
      if (res.ok) {
        showToast('Ocorrência salva!', 'success');
        _sacCloseOccModal();
        await loadTickets(); // Reloads occurrences globally
        renderAll(); // Re-render current view (Config)
      } else {
        showToast('Erro ao salvar', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro de conexão', 'error');
    }
  };

  window._sacDeleteOcc = async function(id) {
    if (!confirm('Deseja realmente excluir esta ocorrência?')) return;
    const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
    try {
      const res = await fetch(`/api/sac/ocorrencias/${id}`, {
        method: 'DELETE',
        headers: {'Authorization':'Bearer '+token}
      });
      if (res.ok) {
        showToast('Ocorrência excluída!', 'success');
        await loadTickets();
        renderAll();
      } else {
        showToast('Erro ao excluir', 'error');
      }
    } catch(e) {
      console.error(e);
      showToast('Erro de conexão', 'error');
    }
  };

  // Add the modal HTML to body if not exists
  if (!document.getElementById('sac-occ-modal')) {
    const modalHtml = `
      <div id="sac-occ-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(2px);">
        <div style="background:#fff;width:100%;max-width:400px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);overflow:hidden;">
          <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
            <h3 id="sac-occ-modal-title" style="margin:0;font-size:1.05rem;color:#1e293b;font-weight:700;">Nova Ocorrência</h3>
            <button onclick="window._sacCloseOccModal()" style="background:transparent;border:none;font-size:1.2rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
          </div>
          <div style="padding:20px;">
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:6px;">Tipo de Chamado</label>
              <select id="sac-occ-type" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem;outline:none;">
                ${Object.entries(TICKET_TYPES).map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('')}
              </select>
            </div>
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:6px;">Descrição</label>
              <input type="text" id="sac-occ-desc" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem;outline:none;box-sizing:border-box;" placeholder="Ex: Produto entregue errado..." />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
              <button onclick="window._sacCloseOccModal()" style="padding:8px 16px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Cancelar</button>
              <button onclick="window._sacSaveOcc()" style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Salvar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // ── WIZARD
'''

content = content.replace('  // ── WIZARD', new_functions)
open('frontend/sac.js', 'w', encoding='utf-8').write(content)
print('Done.')
