// ── Credenciais SIGOR - Frontend ──────────────────────────────────────────────

// Carregar credenciais atuais ao entrar na tela
window.initConfigSigor = async function () {
  try {
    const res = await fetch('/api/config/sigor', {
      headers: { 'Authorization': `Bearer ${window.currentToken}` }
    });
    const d = await res.json();
    if (d.hom) {
      document.getElementById('hom-cpfcnpj').value = d.hom.cpfCnpj || '';
      document.getElementById('hom-senha').value = d.hom.senha || '';
      document.getElementById('hom-unidade').value = d.hom.unidade || '';
    }
    if (d.prod) {
      document.getElementById('prod-cpfcnpj').value = d.prod.cpfCnpj || '';
      document.getElementById('prod-senha').value = d.prod.senha || '';
      document.getElementById('prod-unidade').value = d.prod.unidade || '';
    }
  } catch (e) {
    console.error('[SIGOR-CFG] Erro ao carregar:', e);
  }
};

// Salvar credenciais
window.salvarCredenciaisSigor = async function () {
  const payload = {
    hom: {
      cpfCnpj: document.getElementById('hom-cpfcnpj').value.trim().replace(/\D/g, ''),
      senha: document.getElementById('hom-senha').value.trim(),
      unidade: document.getElementById('hom-unidade').value.trim()
    },
    prod: {
      cpfCnpj: document.getElementById('prod-cpfcnpj').value.trim().replace(/\D/g, ''),
      senha: document.getElementById('prod-senha').value.trim(),
      unidade: document.getElementById('prod-unidade').value.trim()
    }
  };

  const msg = document.getElementById('sigor-save-msg');
  msg.textContent = 'Salvando...';

  try {
    const res = await fetch('/api/config/sigor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.erro || 'Erro ao salvar');
    msg.style.color = '#10b981';
    msg.textContent = '✅ Salvo! As credenciais serão usadas nas próximas requisições.';
    setTimeout(() => { msg.textContent = ''; }, 5000);
  } catch (e) {
    msg.style.color = '#ef4444';
    msg.textContent = '❌ ' + e.message;
  }
};

// Testar conexão com a API SIGOR
window.testarSigor = async function (env) {
  const statusEl = document.getElementById(`sigor-${env}-status`);
  statusEl.textContent = 'Testando...';
  statusEl.style.background = '#fef3c7';
  statusEl.style.color = '#92400e';

  try {
    const res = await fetch(`/api/config/sigor/testar?env=${env}`, {
      headers: { 'Authorization': `Bearer ${window.currentToken}` }
    });
    const d = await res.json();
    if (d.ok) {
      statusEl.textContent = '✅ Conectado';
      statusEl.style.background = '#d1fae5';
      statusEl.style.color = '#065f46';
    } else {
      statusEl.textContent = '❌ ' + (d.mensagem || 'Falhou');
      statusEl.style.background = '#fee2e2';
      statusEl.style.color = '#7f1d1d';
    }
  } catch (e) {
    statusEl.textContent = '❌ Erro';
    statusEl.style.background = '#fee2e2';
    statusEl.style.color = '#7f1d1d';
  }
};

// Mostrar/ocultar senha
window.toggleSenhaSigor = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  const btn = el.nextElementSibling;
  if (btn) btn.querySelector('i').className = el.type === 'password' ? 'ph ph-eye' : 'ph ph-eye-slash';
};
