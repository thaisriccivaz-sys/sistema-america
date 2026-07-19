
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\app.js'

with open(f, 'r', encoding='utf-8', errors='replace') as fh:
    content = fh.read()

# 1. Add conf-integracao to BREADCRUMB_MAP
old_breadcrumb = "    'integracao': { path: 'Integração', code: 'RHAD06' },"
new_breadcrumb = "    'integracao': { path: 'Integração', code: 'RHAD06' },\n    'conf-integracao': { path: 'Diretoria → Conf. Integração', code: 'DIR007' },"

if old_breadcrumb in content:
    content = content.replace(old_breadcrumb, new_breadcrumb)
    print('✅ conf-integracao added to BREADCRUMB_MAP')
else:
    print('⚠️ BREADCRUMB_MAP marker not found exactly')

# 2. Modify finalizarAdmissao to call integration API
old_finalize = """window.finalizarAdmissao = async function () {
    if (!viewedColaborador) return;

    if (!confirm(`Confirmar a admissão definitiva de ${viewedColaborador.nome_completo}?\\n\\nO colaborador passará para o status \"Em Integração\".`)) return;

    try {
        await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            status: 'Em Integração',
            admissao_status: 'Concluída'
        });

        // Atualizar o objeto local
        viewedColaborador.status = 'Em Integração';
        if (viewedColaborador) viewedColaborador.status = 'Em Integração';

        // Toast de sucesso
        if (typeof admissaoToast === 'function') {
            admissaoToast(`✅ ${viewedColaborador.nome_completo} admitido com sucesso! Agora em Integração.`, 'success');
        } else {
            alert('Admissão realizada com sucesso! O colaborador agora está Em Integração.');
        }

        // Navegar para módulo de integração
        setTimeout(() => {
            if (typeof navigateTo === 'function') navigateTo('integracao');
            // Recarregar lista de colaboradores para refletir o novo status
            if (typeof loadColaboradores === 'function') loadColaboradores();
        }, 800);
    } catch (e) {
        alert('Erro ao finalizar admissão: ' + e.message);
    }
};"""

new_finalize = """window.finalizarAdmissao = async function () {
    if (!viewedColaborador) return;

    if (!confirm(`Confirmar a admissão definitiva de ${viewedColaborador.nome_completo}?\\n\\nO colaborador passará para o status \"Em Integração\" e os responsáveis serão notificados.`)) return;

    try {
        // Atualizar status na admissão
        await apiPut(`/colaboradores/${viewedColaborador.id}`, {
            status: 'Em Integração',
            admissao_status: 'Concluída'
        });

        // Atualizar o objeto local
        viewedColaborador.status = 'Em Integração';

        // Disparar processo de integração (cria passos + envia e-mails)
        try {
            const token = window.currentToken || localStorage.getItem('erp_token');
            const integRes = await fetch(`/api/integracao/iniciar/${viewedColaborador.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const integData = await integRes.json();
            if (integData.ok) {
                console.log(`[INTEGRAÇÃO] Processo iniciado: ${integData.processo_id}, passos: ${integData.passos_criados}`);
                // Atualizar badge imediatamente
                if (typeof window.atualizarBadgeIntegracao === 'function') {
                    setTimeout(() => window.atualizarBadgeIntegracao(), 1000);
                }
            }
        } catch(integErr) {
            console.warn('[INTEGRAÇÃO] Aviso ao iniciar processo de integração:', integErr.message);
        }

        // Toast de sucesso
        if (typeof admissaoToast === 'function') {
            admissaoToast(`✅ ${viewedColaborador.nome_completo} admitido com sucesso! Processo de integração iniciado.`, 'success');
        } else {
            alert('Admissão realizada com sucesso! O processo de integração foi iniciado e os responsáveis notificados.');
        }

        // Navegar para módulo de integração
        setTimeout(() => {
            if (typeof navigateTo === 'function') navigateTo('integracao');
            if (typeof loadColaboradores === 'function') loadColaboradores();
        }, 800);
    } catch (e) {
        alert('Erro ao finalizar admissão: ' + e.message);
    }
};"""

if old_finalize in content:
    content = content.replace(old_finalize, new_finalize)
    print('✅ finalizarAdmissao updated to trigger integration')
else:
    print('⚠️ finalizarAdmissao exact match not found - trying partial')
    # Try to find it
    import re
    m = re.search(r'window\.finalizarAdmissao = async function.*?^\};', content, re.DOTALL | re.MULTILINE)
    if m:
        print(f'Found at: {m.start()}-{m.end()}, length: {m.end()-m.start()}')
    else:
        print('Not found at all')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print(f'app.js written. Size: {len(content)} chars')
