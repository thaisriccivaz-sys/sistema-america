
import sys, re

# ── Fix 1: index.html ─────────────────────────────────────────────────────────
html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'

with open(html_file, 'r', encoding='utf-8', errors='replace') as fh:
    html = fh.read()

# 1a. Fix modal: remove duplicate display:flex that overrides display:none
old_modal_style = 'style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;"'
new_modal_style = 'style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;"'

if old_modal_style in html:
    html = html.replace(old_modal_style, new_modal_style)
    print('OK Fix modal display:flex conflict')
else:
    print('WARN modal style not found exactly, trying regex')
    html = re.sub(
        r'(id="modal-conf-integ-passo" style=")display:none;(position:fixed[^"]*?)display:flex;(align-items:center;justify-content:center;")',
        r'\1display:none;\2\3',
        html
    )
    print('OK modal style fixed via regex')

# 1b. Add standalone INTEGRAÇÃO dept-item between RH and Logística
new_integ_dept = '''
            <!-- Integração - Dinâmico (cinza/vermelho) -->
            <div class="dept-item" id="dept-item-integracao" style="--dept-color:#6b7280; --dept-bg:#f3f4f6;">
                <button class="dept-btn" title="Integração" id="dept-btn-integracao">
                    <i class="ph ph-handshake"></i>
                    <span>Integra&ccedil;&atilde;o</span>
                </button>
                <div class="dept-submenu" id="sub-integracao">
                    <div class="dept-submenu-header" style="color:#6b7280;" id="dept-integ-header"><i class="ph ph-handshake"></i> Integração</div>
                    <a href="#" class="nav-item" data-target="integracao" id="nav-integracao-item"
                       onclick="navigateTo('integracao'); return false;"><i class="ph ph-list-checks"></i>
                        Processo de Integração <span id="integracao-badge" style="display:none;background:#ef4444;color:#fff;border-radius:50%;font-size:0.65rem;font-weight:700;padding:1px 5px;margin-left:4px;min-width:16px;text-align:center;line-height:16px;">0</span></a>
                </div>
            </div>

'''

# Insert before Logística
logistica_marker = '<!-- Log&iacute;stica - Verde -->'
if logistica_marker in html:
    html = html.replace(logistica_marker, new_integ_dept + logistica_marker)
    print('OK Integração dept-item added before Logística')
else:
    # Try alternative
    logistica_marker2 = '<!-- Logística - Verde -->'
    if logistica_marker2 in html:
        html = html.replace(logistica_marker2, new_integ_dept + logistica_marker2)
        print('OK Integração dept-item added (alt marker)')
    else:
        # Insert before the Logística dept-item div directly
        logistica_div = '<div class="dept-item" style="--dept-color:#2d9e5f; --dept-bg:#d6f5e5;">'
        if logistica_div in html:
            html = html.replace(logistica_div, new_integ_dept + logistica_div, 1)
            print('OK Integração dept-item added (div marker)')
        else:
            print('WARN could not find Logística insertion point')

# 1c. Remove the old Integração nav-item from RH submenu (it's now standalone)
# Keep a simplified reference (without badge span since badge is now in standalone)
old_rh_integ = '<a href="#" class="nav-item" data-target="integracao" id="nav-integracao-item"><i class="ph ph-users-three"></i>\n                        Integra&ccedil;&atilde;o <span id="integracao-badge" style="display:none;background:#ef4444;color:#fff;border-radius:50%;font-size:0.65rem;font-weight:700;padding:1px 5px;margin-left:4px;min-width:16px;text-align:center;line-height:16px;">0</span></a>'
# Remove it (since we have the standalone now)
if old_rh_integ in html:
    html = html.replace(old_rh_integ, '')
    print('OK Removed duplicate Integração from RH submenu')
else:
    # Try to remove whatever the patched version looks like
    html = re.sub(
        r'<a href="#" class="nav-item" data-target="integracao"[^>]*><i class="ph ph-users-three"></i>\s*Integra[^<]*(?:<span[^>]*>[^<]*</span>)?\s*</a>',
        '',
        html
    )
    print('OK Removed via regex')

with open(html_file, 'w', encoding='utf-8') as fh:
    fh.write(html)

print(f'index.html written. Size: {len(html)} chars')
