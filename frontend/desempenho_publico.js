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

    const dpt = (colab.departamento || colab.cargo || '').toLowerCase();
    let groupKey = 'geral';
    if (dpt.includes('lideran') || dpt.includes('líder') || dpt.includes('lider') || dpt.includes('gerent')) {
        groupKey = 'lideranca';
    }

    // fallback caso a chave não exista no window.AVALIACAO_QUESTIONS
    if (!window.AVALIACAO_QUESTIONS.desempenho[groupKey]) {
        groupKey = 'geral';
    }

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

    categories.forEach(cat => {
        html += `<div class="category-title">${cat}</div>`;
        html += `<table>
            <thead>
                <tr>
                    <th style="width: 55%;">Critério Avaliado</th>
                    <th style="width: 15%; text-align:center;">Nota (1 a 5)</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        questions[cat].forEach((q, idx) => {
            if (!q || !q.trim()) return;
            const val = (savedAnswers[cat] && savedAnswers[cat][idx]) ? savedAnswers[cat][idx] : '';
            
            html += `
                <tr>
                    <td>${q}</td>
                    <td style="text-align:center;">
                        <select class="form-control" data-cat="${cat}" data-idx="${idx}" required ${isFinalizado ? 'disabled' : ''}>
                            <option value="">Selecione...</option>
                            <option value="1" ${val == '1' ? 'selected' : ''}>1 - Ruim</option>
                            <option value="2" ${val == '2' ? 'selected' : ''}>2 - Regular</option>
                            <option value="3" ${val == '3' ? 'selected' : ''}>3 - Bom</option>
                            <option value="4" ${val == '4' ? 'selected' : ''}>4 - Muito Bom</option>
                            <option value="5" ${val == '5' ? 'selected' : ''}>5 - Excelente</option>
                        </select>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
    });

    // Observações Gerais
    const obsVal = savedAnswers.__obs__ || '';
    html += `
        <div class="category-title">Observações Gerais</div>
        <div style="margin-bottom: 2rem;">
            <textarea id="observacoes_gerais" class="form-control" rows="4" placeholder="Adicione comentários ou observações sobre o desempenho do colaborador..." ${isFinalizado ? 'disabled' : ''}>${obsVal}</textarea>
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
            formEl.querySelectorAll('select[required]').forEach(sel => {
                if (!sel.value) allFilled = false;
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
    document.querySelectorAll('#form-desempenho-publico select[data-cat]').forEach(sel => {
        const cat = sel.getAttribute('data-cat');
        const idx = sel.getAttribute('data-idx');
        if (!respostas[cat]) respostas[cat] = {};
        respostas[cat][idx] = sel.value;
    });

    const obs = document.getElementById('observacoes_gerais').value;
    if (obs.trim()) {
        respostas.__obs__ = obs;
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
