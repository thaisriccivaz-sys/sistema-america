window.loadPublicDesempenho = async function(token) {
    try {
        const res = await fetch(`/api/desempenho/publico?token=${token}`);
        const data = await res.json();
        
        if (!res.ok) {
            document.getElementById('public-desempenho-content').innerHTML = `
                <div style="text-align:center; padding: 2rem;">
                    <i class="ph ph-warning-circle" style="font-size:3rem; color:#dc2626;"></i>
                    <h3 style="margin-top:1rem; color:#dc2626;">Link Inválido ou Expirado</h3>
                    <p style="color:#64748b; margin-top:0.5rem;">${data.error || 'Não foi possível carregar o formulário.'}</p>
                </div>
            `;
            return;
        }

        renderPublicDesempenhoForm(data.colaborador, data.ano, data.trimestre, data.avaliacao, token);
    } catch (e) {
        console.error(e);
        document.getElementById('public-desempenho-content').innerHTML = `<div style="text-align:center;color:#dc2626;">Erro de conexão.</div>`;
    }
};

window.renderPublicDesempenhoForm = function(colab, ano, trimestre, avaliacao, token) {
    let html = `
        <div style="margin-bottom:2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
            <p style="margin:0 0 12px 0; color:#64748b; font-weight:600; text-transform:uppercase; font-size:0.85rem;">Colaborador</p>
            <div style="display:flex;align-items:center;gap:12px;">
                ${colab.foto_base64 ? `<img src="${colab.foto_base64}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;">` : `<div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#64748b;font-size:1.2rem;">${colab.nome_completo.charAt(0)}</div>`}
                <div>
                    <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">${colab.nome_completo}</h3>
                    <p style="margin:4px 0 0; color:#475569;">${colab.cargo || ''} - ${colab.departamento || ''}</p>
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <p style="margin:0; color:#475569;"><strong>Período da Avaliação:</strong> ${trimestre}º Trimestre de ${ano}</p>
            </div>
        </div>
    `;

    const groupKey = window.matchTemplateGroup('desempenho', colab.departamento, colab.cargo);

    const questions = window.AVALIACAO_QUESTIONS.desempenho[groupKey];
    const categories = Object.keys(questions);
    
    let savedAnswers = {};
    if (avaliacao && avaliacao.respostas_json) {
        try {
            savedAnswers = JSON.parse(avaliacao.respostas_json);
        } catch(e) {}
    }

    let isFinalizado = avaliacao && avaliacao.situacao === 'finalizado';

    if (isFinalizado) {
        html += `
            <div class="alert-info" style="margin-bottom: 2rem; display: flex; align-items: center; gap: 10px;">
                <i class="ph ph-check-circle" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Avaliação Finalizada</strong><br>
                    Esta avaliação já foi preenchida e finalizada. Você pode visualizar as respostas abaixo.
                </div>
            </div>
        `;
    } else if (avaliacao && avaliacao.situacao === 'iniciado') {
        html += `
            <div style="background: #fffbeb; color: #b45309; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; display: flex; align-items: center; gap: 10px;">
                <i class="ph ph-clock-counter-clockwise" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Rascunho Encontrado</strong><br>
                    Você já iniciou esta avaliação. Continue de onde parou.
                </div>
            </div>
        `;
    }

    html += `<form id="form-desempenho-publico">`;

    html += `
        <div style="margin-bottom: 2rem;">
            <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#334155;">Nome do Avaliador (Gestor/Responsável) *</label>
            <input type="text" id="responsavel_nome" class="form-control" value="${avaliacao && avaliacao.responsavel_nome ? avaliacao.responsavel_nome : colab.responsavel_nome || ''}" placeholder="Seu nome" required ${isFinalizado ? 'disabled' : ''}>
        </div>
    `;

    html += `
        <div style="background:#f8fafc;border-radius:10px;padding:0.75rem 1.25rem;margin-bottom:1.25rem;border:1px solid #e2e8f0;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span style="font-size:0.75rem;font-weight:700;color:#475569;margin-right:4px;">LEGENDA:</span>
            <span style="background:#dc2626;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">1 Muito Ruim</span>
            <span style="background:#ea580c;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">2 Ruim</span>
            <span style="background:#ca8a04;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">3 Médio</span>
            <span style="background:#65a30d;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">4 Bom</span>
            <span style="background:#16a34a;color:#fff;border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">5 Muito Bom</span>
        </div>
    `;

    categories.forEach((cat, catIdx) => {
        html += `<div class="category-title" style="background:#1e3a5f;color:#fff;padding:0.6rem 1rem;border-radius:8px;font-weight:700;font-size:0.85rem;letter-spacing:0.5px;margin-bottom:0.75rem;">${cat}</div>`;
        html += `<div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;min-width:600px;">
            <thead>
                <tr>
                    <th style="width: 40%; text-align:left;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Critério Avaliado</th>
                    <th style="width: 220px; text-align:center;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Nota (1 a 5)</th>
                    <th style="width: auto; text-align:left;padding:8px 12px;background:#f1f5f9;color:#475569;font-weight:600;border:1px solid #e2e8f0;">Obs.</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        questions[cat].forEach((q, idx) => {
            if (!q || !q.trim()) return;
            const nota = (savedAnswers[cat] && savedAnswers[cat][idx]) ? parseInt(savedAnswers[cat][idx]) : 0;
            let obsVal = '';
            if (savedAnswers.__obs__ && savedAnswers.__obs__[cat] && savedAnswers.__obs__[cat][idx]) {
                obsVal = savedAnswers.__obs__[cat][idx];
            }
            
            const scoreColors = ['', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a'];
            const scoreLabels = ['', '1', '2', '3', '4', '5'];

            let botoesNota = '';
            if (isFinalizado) {
                const cor = nota >= 1 && nota <= 5 ? scoreColors[nota] : '#94a3b8';
                const label = nota >= 1 && nota <= 5 ? scoreLabels[nota] : '-';
                botoesNota = `
                    <input type="hidden" class="nota-input" data-cat="${cat}" data-idx="${idx}" id="nota-${catIdx}-${idx}" value="${nota}">
                    <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:${cor};color:#fff;font-weight:800;font-size:1rem;line-height:36px;text-align:center;">${label}</span>
                `;
            } else {
                botoesNota = `<input type="hidden" class="nota-input" data-cat="${cat}" data-idx="${idx}" id="nota-${catIdx}-${idx}" value="${nota}">
                <div style="display:flex;gap:4px;justify-content:center;">` +
                [1,2,3,4,5].map(n => {
                    const cor = scoreColors[n];
                    const selected = nota === n ? `box-shadow:0 0 0 3px ${cor}50;transform:scale(1.15);` : 'opacity:0.4;';
                    return `<button type="button" onclick="selecionarPublicNotaDesempenho(${catIdx}, ${idx}, ${n})" 
                        id="btn-nota-${catIdx}-${idx}-${n}"
                        style="width:34px;height:34px;border-radius:50%;background:${cor};color:#fff;border:2px solid ${cor};font-weight:800;font-size:0.85rem;cursor:pointer;transition:all 0.15s;${selected}">${n}</button>`;
                }).join('') +
                `</div>`;
            }

            html += `
                <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">${q}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">
                        ${botoesNota}
                    </td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">
                        <input type="text" class="obs-input" data-cat="${cat}" data-idx="${idx}" value="${obsVal}" ${isFinalizado ? 'disabled' : ''}
                            style="width:100%;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;outline:none;box-sizing:border-box;${isFinalizado ? 'background:#f8fafc;' : ''}">
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
    });

    // Observações Gerais
    const obsGeraisVal = savedAnswers.__obs_gerais__ || (savedAnswers.__obs__ && savedAnswers.__obs__.info_adicional) || '';
    html += `
        <div class="category-title">Observações Gerais</div>
        <div style="margin-bottom: 2rem;">
            <textarea id="observacoes_gerais" class="form-control" rows="4" placeholder="Adicione comentários ou observações sobre o desempenho do colaborador..." ${isFinalizado ? 'disabled' : ''}>${obsGeraisVal}</textarea>
        </div>
    `;

    if (!isFinalizado) {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2rem;">
                <button type="button" id="btn-rascunho" class="btn-salvar" style="background: #475569;">
                    <i class="ph ph-floppy-disk"></i> Salvar Rascunho
                </button>
                <button type="submit" id="btn-finalizar" class="btn-salvar">
                    <i class="ph ph-check-circle"></i> Finalizar Avaliação
                </button>
            </div>
        `;
    }

    html += `</form>`;
    
    document.getElementById('public-desempenho-content').innerHTML = html;

    if (!isFinalizado) {
        const formEl = document.getElementById('form-desempenho-publico');
        
        // Salvar Rascunho
        document.getElementById('btn-rascunho').addEventListener('click', async () => {
            await saveDesempenho(token, 'rascunho', false);
        });

        // Finalizar
        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Verificar se todas as selects obrigatórias foram preenchidas
            let allFilled = true;
            formEl.querySelectorAll('.nota-input').forEach(input => {
                if (!input.value || input.value === '0') allFilled = false;
            });
            
            if (!allFilled) {
                Swal.fire('Atenção', 'Por favor, preencha todas as notas antes de finalizar.', 'warning');
                return;
            }

            const result = await Swal.fire({
                title: 'Finalizar Avaliação?',
                text: "Após finalizar, você não poderá mais alterar as notas e a avaliação será gravada no prontuário do colaborador.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#1d4ed8',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sim, finalizar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                await saveDesempenho(token, 'finalizar', true);
            }
        });
    }
};

async function saveDesempenho(token, acao, isFinalizar) {
    const btnId = isFinalizar ? 'btn-finalizar' : 'btn-rascunho';
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Salvando...';
    }

    const respostas = {};
    const obs = {};

    document.querySelectorAll('.nota-input').forEach(input => {
        const cat = input.getAttribute('data-cat');
        const idx = input.getAttribute('data-idx');
        if (!respostas[cat]) respostas[cat] = {};
        respostas[cat][idx] = input.value;
    });

    document.querySelectorAll('.obs-input').forEach(input => {
        const cat = input.getAttribute('data-cat');
        const idx = input.getAttribute('data-idx');
        if (!obs[cat]) obs[cat] = {};
        obs[cat][idx] = input.value;
    });

    respostas.__obs__ = obs;

    const obsGerais = document.getElementById('observacoes_gerais').value;
    if (obsGerais.trim()) {
        respostas.__obs_gerais__ = obsGerais;
    }

    const responsavelNome = document.getElementById('responsavel_nome').value;

    try {
        const res = await fetch(`/api/desempenho/publico/${acao}?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                respostas_json: JSON.stringify(respostas),
                responsavel_nome: responsavelNome
            })
        });

        const data = await res.json();
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = isFinalizar ? '<i class="ph ph-check-circle"></i> Finalizar Avaliação' : '<i class="ph ph-floppy-disk"></i> Salvar Rascunho';
        }

        if (!res.ok) {
            Swal.fire('Erro', data.error || 'Ocorreu um erro ao salvar.', 'error');
            return;
        }

        if (isFinalizar) {
            Swal.fire({
                title: 'Sucesso!',
                text: 'Avaliação finalizada com sucesso! Você pode fechar esta página.',
                icon: 'success',
                confirmButtonColor: '#1d4ed8'
            }).then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire({
                title: 'Rascunho Salvo',
                text: 'Suas respostas parciais foram salvas com sucesso. Você pode voltar depois para finalizar.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }

    } catch (e) {
        console.error(e);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = isFinalizar ? '<i class="ph ph-check-circle"></i> Finalizar Avaliação' : '<i class="ph ph-floppy-disk"></i> Salvar Rascunho';
        }
        Swal.fire('Erro', 'Erro de conexão com o servidor.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token && window.loadPublicDesempenho) {
        window.loadPublicDesempenho(token);
    } else {
        document.getElementById('public-desempenho-content').innerHTML = `
            <div style="text-align:center; padding: 2rem;">
                <i class="ph ph-warning-circle" style="font-size:3.5rem; color:#dc2626;"></i>
                <h3 style="margin-top:1rem; color:#dc2626; font-size:1.5rem;">Link Inválido</h3>
                <p style="color:#475569; margin-top:0.5rem;">Por favor, verifique se copiou corretamente o link recebido por e-mail.</p>
            </div>
        `;
    }
});

const _publicDesempenhoScoreColors = ['', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a'];
window.selecionarPublicNotaDesempenho = function(catIdx, idx, nota) {
    const hidden = document.getElementById(`nota-${catIdx}-${idx}`);
    if (hidden) hidden.value = nota;
    for (let n = 1; n <= 5; n++) {
        const btn = document.getElementById(`btn-nota-${catIdx}-${idx}-${n}`);
        if (!btn) continue;
        if (n === nota) {
            btn.style.opacity = '1';
            btn.style.boxShadow = `0 0 0 3px ${_publicDesempenhoScoreColors[n]}50`;
            btn.style.transform = 'scale(1.15)';
        } else {
            btn.style.opacity = '0.4';
            btn.style.boxShadow = '';
            btn.style.transform = '';
        }
    }
};
