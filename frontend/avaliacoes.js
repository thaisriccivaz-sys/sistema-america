// AVALIACAO_QUESTIONS movido para avaliacoes_perguntas.js


let chartDonut = null;
let chartBar = null;

window.renderAvaliacaoTab = async function(container) {
    if (!viewedColaborador) return;
    const colabId = viewedColaborador.id;
    const dept = viewedColaborador.departamento || viewedColaborador.cargo || '';
    const cargo = viewedColaborador.cargo || '';

    // Carregar templates do banco e injetar no AVALIACAO_QUESTIONS antes de fazer o match
    try {
        const templatesDb = await apiGet('/avaliacao-templates').catch(() => []);
        if (Array.isArray(templatesDb) && templatesDb.length > 0) {
            for (const t of templatesDb) {
                const tipo = (t.tipo || '').toLowerCase();
                const chave = (t.grupo_key || '').trim();
                if (!tipo || !chave) continue;
                // Garante que a seção do tipo existe
                if (!AVALIACAO_QUESTIONS[tipo]) AVALIACAO_QUESTIONS[tipo] = {};
                // Só injeta se ainda não existir para não sobrescrever hardcoded com dado vazio
                try {
                    const cats = JSON.parse(t.categorias_json || '{}');
                    if (cats && Object.keys(cats).length > 0) {
                        // Registra uma entrada por cada chave separada por vírgula
                        for (const k of chave.split(',').map(s => s.trim()).filter(Boolean)) {
                            AVALIACAO_QUESTIONS[tipo][k] = cats;
                        }
                    }
                } catch(e) { /* categorias_json malformed */ }
            }
        }
    } catch(e) {
        console.warn('[Avaliação] Não foi possível carregar templates do banco:', e);
    }

    // Identificar qual grupo usar para satisfação e desempenho (auto-detectado pelo departamento)
    
    let defaultSatisfacao = window.matchTemplateGroup('satisfacao', dept, cargo);
    let defaultDesempenho = window.matchTemplateGroup('desempenho', dept, cargo);
    let defaultExperiencia = window.matchTemplateGroup('experiencia', dept, cargo);

    // Montar lista de grupos disponíveis por tipo
    const groupOptionsSatisfacao = Object.keys(AVALIACAO_QUESTIONS.satisfacao);
    const groupOptionsDesempenho = Object.keys(AVALIACAO_QUESTIONS.desempenho);
    const groupOptionsExperiencia = Object.keys(AVALIACAO_QUESTIONS.experiencia || {});

    // Persistência de tipo, ano e grupo
    if (!window.tabPersistence) window.tabPersistence = {};
    const currentYear = new Date().getFullYear();
    const dataAdmissao = viewedColaborador.data_admissao ? new Date(viewedColaborador.data_admissao).getFullYear() : currentYear;
    const anos = [];
    for (let y = dataAdmissao; y <= currentYear; y++) anos.push(y);
    if (!anos.includes(currentYear)) anos.push(currentYear);

    let selectedYear = window.tabPersistence['av-year-select'] ? parseInt(window.tabPersistence['av-year-select']) : currentYear;
    let selectedTipo = window.tabPersistence['av-tipo-select'] || 'desempenho';

    // Grupo persistido ou padrão pelo departamento
    const pkSat = `av-group-satisfacao-${colabId}`;
    const pkDes = `av-group-desempenho-${colabId}`;
    const pkExp = `av-group-experiencia-${colabId}`;
    if (!window.tabPersistence[pkSat]) window.tabPersistence[pkSat] = defaultSatisfacao;
    if (!window.tabPersistence[pkDes]) window.tabPersistence[pkDes] = defaultDesempenho;
    if (!window.tabPersistence[pkExp]) window.tabPersistence[pkExp] = defaultExperiencia;

    let groupKey = selectedTipo === 'satisfacao' ? window.tabPersistence[pkSat] 
                 : (selectedTipo === 'experiencia' ? window.tabPersistence[pkExp] : window.tabPersistence[pkDes]);

    // Garantir que o groupKey existe em AVALIACAO_QUESTIONS
    const safeGroupKey = (AVALIACAO_QUESTIONS[selectedTipo] && AVALIACAO_QUESTIONS[selectedTipo][groupKey]) ? groupKey
        : (selectedTipo === 'satisfacao' ? defaultSatisfacao : (selectedTipo === 'experiencia' ? defaultExperiencia : defaultDesempenho));

    const questions = AVALIACAO_QUESTIONS[selectedTipo] && safeGroupKey ? AVALIACAO_QUESTIONS[selectedTipo][safeGroupKey] : undefined;
    const categories = questions ? Object.keys(questions) : [];

    container.innerHTML = '<p style="color:#64748b; padding:1rem;">Carregando avaliações...</p>';

    // Fetch avaliacoes
    const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`).catch(() => []);

    
    const renderDashboard = (year, tipo) => {
        if (!questions) {
            let actionsHtml = `<div style="flex:1; padding:2rem; text-align:center; color:#ef4444; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; margin-top:1rem;">
                <i class="ph ph-warning" style="font-size:2rem; margin-bottom:0.5rem;"></i><br>
                <strong>Template não configurado.</strong><br>
                Não há um template de ${tipo} cadastrado para o cargo ou departamento deste colaborador (${dept || 'Não informado'}).
            </div>`;
            
            container.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap:wrap; gap:1rem;">
                    
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        <!-- Tipo de Avaliacao -->
                        <div style="display:flex; align-items:center; gap:0.5rem; background:#fff; padding:0.3rem; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05); flex-wrap:wrap;">
                            <button onclick="window.tabPersistence['av-tipo-select']='desempenho'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                    style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'desempenho' ? 'background:#0ea5e9; color:#fff; box-shadow:0 2px 4px rgba(14,165,233,0.3);' : 'background:transparent; color:#64748b;'}">
                                <i class="ph ph-trend-up" style="font-size:1.2rem;"></i> Desempenho
                            </button>
                            <button onclick="window.tabPersistence['av-tipo-select']='satisfacao'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                    style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'satisfacao' ? 'background:#8b5cf6; color:#fff; box-shadow:0 2px 4px rgba(139,92,246,0.3);' : 'background:transparent; color:#64748b;'}">
                                <i class="ph ph-smiley" style="font-size:1.2rem;"></i> Satisfação
                            </button>
                            <button onclick="window.tabPersistence['av-tipo-select']='experiencia'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                    style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'experiencia' ? 'background:#f59e0b; color:#fff; box-shadow:0 2px 4px rgba(245,158,11,0.3);' : 'background:transparent; color:#64748b;'}">
                                <i class="ph ph-medal" style="font-size:1.2rem;"></i> Experiência
                            </button>
                        </div>
                    </div>
                </div>
                ${actionsHtml}
            `;
            return;
        }

        // Filtrar do ano atual E do tipo atual
        const avYear = avaliacoes.filter(a => Number(a.ano) === Number(year) && a.tipo === tipo);
        
        const trimestersData = { 1: {}, 2: {}, 3: {}, 4: {} };
        const trimestersOverall = { 1: null, 2: null, 3: null, 4: null };

        avYear.forEach(av => {
            const res = JSON.parse(av.respostas_json);
            let totalSum = 0; let totalCount = 0;
            categories.forEach(cat => {
                const catAnswers = res[cat] || {};
                let sum = 0; let count = 0;
                Object.values(catAnswers).forEach(val => {
                    const n = parseFloat(val);
                    if (!isNaN(n)) { sum += n; count++; }
                });
                const metric = tipo === 'experiencia' ? sum : (count > 0 ? (sum / count) : null);
                trimestersData[av.trimestre][cat] = metric;
                if (metric !== null) { totalSum += metric; totalCount++; }
            });
            trimestersOverall[av.trimestre] = tipo === 'experiencia' ? totalSum : (totalCount > 0 ? (totalSum / totalCount) : null);
        });

        // Trimestre Mappings for UI
        const trimestreToMonth = {
            1: 'Janeiro (1º Trim.)',
            2: 'Abril (2º Trim.)',
            3: 'Julho (3º Trim.)',
            4: 'Outubro (4º Trim.)'
        };

        // Action Steps
        let actionsHtml = `<div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">`;
        const dateRightNow = new Date();
        const anoAtual = dateRightNow.getFullYear();
        const mesAtual = dateRightNow.getMonth() + 1; // 1 a 12

        const maxTrim = tipo === 'experiencia' ? 1 : 4;
        for (let t=1; t<=maxTrim; t++) {
            const hasData = trimestersOverall[t] !== null;

            if (!hasData && tipo !== 'experiencia') {
                let releaseMonth; // 1-indexed
                if (t === 1) releaseMonth = 1;
                else if (t === 2) releaseMonth = 4;
                else if (t === 3) releaseMonth = 7;
                else if (t === 4) releaseMonth = 10;
                
                const releaseDay = (tipo === 'desempenho') ? 15 : 1;
                const releaseDate = new Date(year, releaseMonth - 1, releaseDay);
                
                if (dateRightNow < releaseDate) {
                    continue;
                }
            }

            let perc = 0;
            let avId = null;
            let avStatusHtml = '';
            let avUrl = null;
            if (hasData) {
                const av = avYear.find(a=>a.trimestre===t);
                avUrl = av.pdf_url;
                avId = av.id;
                const res = JSON.parse(av.respostas_json);
                // Recupera o groupKey salvo dentro do JSON (campo __grupo__) para garantir
                // que o formulário abra com o mesmo template, mesmo que auto-detect falhe
                const savedGrupo = res.__grupo__;
                if (savedGrupo && AVALIACAO_QUESTIONS[tipo] && AVALIACAO_QUESTIONS[tipo][savedGrupo]) {
                    av.__resolvedGroupKey__ = savedGrupo;
                }

                if (tipo === 'experiencia' && res.__status__) {
                    const corStatus = res.__status__ === 'Aprovado' ? '#16a34a' : (res.__status__ === 'Reprovado' ? '#ef4444' : '#f59e0b');
                    avStatusHtml = `<span style="display:inline-block; border-radius:999px; background:${corStatus}22; color:${corStatus}; border:1px solid ${corStatus}; padding:2px 8px; font-size:0.7rem; font-weight:700; margin-bottom:0.5rem; text-transform:uppercase;">${res.__status__}</span>`;
                }

                let totalQ = 0, ansQ = 0;

                // -----------------------------------------------------------------------
                // CÁLCULO DE % CORRETO:
                // Usa o template do __grupo__ SALVO no JSON da avaliação, não o template
                // do departamento atual. Isso garante que mudanças no template ou no
                // mapeamento dept→grupo não derrubem o % de avaliações já preenchidas.
                // -----------------------------------------------------------------------
                const grupoParaPerc = savedGrupo && AVALIACAO_QUESTIONS[tipo] && AVALIACAO_QUESTIONS[tipo][savedGrupo]
                    ? savedGrupo   // template usado na época do preenchimento
                    : null;

                const questionsParaPerc = grupoParaPerc
                    ? AVALIACAO_QUESTIONS[tipo][grupoParaPerc]
                    : null;

                if (questionsParaPerc) {
                    // Caso ideal: temos o template exato que foi usado no preenchimento
                    Object.keys(questionsParaPerc).forEach(cat => {
                        (questionsParaPerc[cat] || []).forEach((q, i) => {
                            if (q && q.trim()) {
                                totalQ++;
                                if (res[cat] && res[cat][i]) ansQ++;
                            }
                        });
                    });
                } else {
                    // Fallback: __grupo__ não existe ou template sumiu do banco.
                    // Conta diretamente pelas categorias do respostas_json — o que foi salvo.
                    const resCats = Object.keys(res).filter(k =>
                        k !== '__obs__' && k !== '__status__' && k !== '__grupo__' && k !== '__categorias_snapshot__'
                    );
                    if (resCats.length > 0) {
                        for (const cat of resCats) {
                            if (res[cat] && typeof res[cat] === 'object') {
                                // Conta chaves numéricas (índices de perguntas) que têm valor
                                const keys = Object.keys(res[cat]);
                                totalQ += keys.length;
                                ansQ += keys.filter(k => res[cat][k]).length;
                            }
                        }
                    } else {
                        // Último fallback: usa o template atual do departamento
                        Object.keys(questions).forEach(cat => {
                            (questions[cat] || []).forEach((q, i) => {
                                if (q && q.trim()) {
                                    totalQ++;
                                    if (res[cat] && res[cat][i]) ansQ++;
                                }
                            });
                        });
                    }
                }
                perc = totalQ > 0 ? Math.round((ansQ / totalQ) * 100) : 0;
            }
            
            const isFull = perc === 100;

            actionsHtml += `
                <div style="flex:1; min-width:200px; background:#fff; border:1px solid ${hasData?'#0ea5e9':'#cbd5e1'}; border-radius:8px; padding:1.2rem; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.05); position:relative;">
                    ${perc > 0 ? `<div style="position:absolute; top:-10px; right:-10px; background:${isFull?'#16a34a':'#f59e0b'}; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.2); font-size:0.7rem; font-weight:700;">${perc}%</div>` : ''}
                    <h6 style="margin:0 0 0.3rem; color:#0f4c81; font-size:0.75rem; text-transform:uppercase; opacity:0.8;">${tipo==='desempenho'?'Avaliação de Desempenho':(tipo==='experiencia'?'Avaliação de Experiência':'Avaliação de Satisfação')}</h6>
                    ${(!isFull) ? avStatusHtml : ''}
                    <h5 style="margin:0 0 0.5rem; color:#334155;">${tipo==='experiencia' ? 'Realizar Avaliação' : trimestreToMonth[t]}</h5>
                    ${hasData ? `<p style="font-size:1.5rem; font-weight:800; color:#475569; margin:0 0 1rem;">${tipo==='experiencia' ? Math.round(trimestersOverall[t]) : trimestersOverall[t].toFixed(1)} <sub style="font-size:0.7rem;color:#64748b;">${tipo==='experiencia'?'Soma Total':'Média'}</sub></p>` : `<p style="font-size:0.85rem; color:#94a3b8; margin:0 0 1rem;">Disponível para Preenchimento</p>`}
                    
                    ${(isFull && tipo === 'experiencia') ? `
                        <div style="margin-bottom:1.5rem; border:1px solid #cbd5e1; background:#f8fafc; padding:0.75rem; border-radius:8px; display:flex; flex-direction:column; align-items:center; gap:0.5rem; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                            <label style="font-size:0.8rem; font-weight:700; color:#334155;">RESULTADO DA EXPERIÊNCIA:</label>
                            <select onchange="updateExperienciaStatus('${tipo}', ${year}, ${t}, this.value)" style="border:1.5px solid ${avStatusHtml ? (avStatusHtml.includes('Aprovado') ? '#16a34a': '#ef4444') : '#94a3b8'}; border-radius:6px; padding:0.4rem 0.8rem; font-size:0.9rem; font-weight:800; color:${avStatusHtml ? (avStatusHtml.includes('Aprovado') ? '#16a34a': '#ef4444') : '#0f4c81'}; outline:none; background:#fff; cursor:pointer; width:100%; text-align:center;">
                                <option value="" disabled ${!avStatusHtml ? 'selected' : ''}>-- PENDENTE DE RESULTADO --</option>
                                <option value="Aprovado" ${avStatusHtml.includes('Aprovado') ? 'selected' : ''}>Aprovado</option>
                                <option value="Reprovado" ${avStatusHtml.includes('Reprovado') ? 'selected' : ''}>Reprovado</option>
                            </select>
                        </div>
                    ` : ''}

                    <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
                        ${(() => {
                            const av = hasData ? avYear.find(a=>a.trimestre===t) : null;
                            const effectiveGroupKey = (av && av.__resolvedGroupKey__) ? av.__resolvedGroupKey__ : safeGroupKey;
                            return `<button onclick="openFormAvaliacao('${tipo}', ${year}, ${t}, '${effectiveGroupKey}')" style="background:${isFull?'#083566':'#0ea5e9'}; color:#fff; border:none; padding:0.4rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.8rem; flex:1;">
                                <i class="ph ph-note-pencil"></i> ${hasData ? (isFull ? 'Editar' : 'Continuar') : 'Preencher'}
                            </button>
                            ${isFull ? (tipo === 'desempenho' && avUrl && avUrl !== 'null' && avUrl !== 'undefined' ? `
                            <button onclick="window.open('${avUrl}', '_blank')" style="background:#0f4c81; color:#fff; border:none; padding:0.4rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center;" title="Visualizar PDF Assinado">
                                <i class="ph ph-eye"></i>
                            </button>
                            ` : `
                            <button onclick="viewAvaliacaoPDF('${tipo}', ${year}, ${t}, '${effectiveGroupKey}')" style="background:#10b981; color:#fff; border:none; padding:0.4rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center;" title="Visualizar Avaliação em PDF">
                                <i class="ph ph-eye"></i>
                            </button>`) : ''}
                            ${hasData ? `<button onclick="deleteAvaliacao(${avId})" style="background:#ef4444; color:#fff; border:none; padding:0.4rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center;" title="Excluir Avaliação Definitivamente">
                                <i class="ph ph-trash"></i>
                            </button>` : ''}`;
                        })()}
                    </div>
                </div>
            `;
        }
        
        // Se após o loop não houver quadros a mostrar (ex: ano futuro), adiciona mensagem
        if (actionsHtml === `<div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">`) {
            actionsHtml += `<div style="flex:1; padding:2rem; text-align:center; color:#64748b; font-size:0.9rem; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">Nenhuma avaliação liberada para este ano até o momento. Aguarde o mês correspondente.</div>`;
        }
        
        actionsHtml += `</div>`;

        // Renderizar a tela de fato
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap:wrap; gap:1rem;">
                
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <!-- Tipo de Avaliacao -->
                    <div style="display:flex; align-items:center; gap:0.5rem; background:#fff; padding:0.3rem; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05); flex-wrap:wrap;">
                        <button onclick="window.tabPersistence['av-tipo-select']='desempenho'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'desempenho' ? 'background:#0ea5e9; color:#fff; box-shadow:0 2px 4px rgba(14,165,233,0.3);' : 'background:transparent; color:#64748b;'}">
                            <i class="ph ph-trend-up" style="font-size:1.2rem;"></i> Desempenho
                        </button>
                        <button onclick="window.tabPersistence['av-tipo-select']='satisfacao'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'satisfacao' ? 'background:#8b5cf6; color:#fff; box-shadow:0 2px 4px rgba(139,92,246,0.3);' : 'background:transparent; color:#64748b;'}">
                            <i class="ph ph-smiley" style="font-size:1.2rem;"></i> Satisfação
                        </button>
                        <button onclick="window.tabPersistence['av-tipo-select']='experiencia'; renderAvaliacaoTab(document.getElementById('docs-list-container'));" 
                                style="display:flex; align-items:center; gap:0.5rem; border:none; border-radius:6px; padding:0.6rem 1rem; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.9rem; ${tipo === 'experiencia' ? 'background:#f59e0b; color:#fff; box-shadow:0 2px 4px rgba(245,158,11,0.3);' : 'background:transparent; color:#64748b;'}">
                            <i class="ph ph-medal" style="font-size:1.2rem;"></i> Experiência
                        </button>
                    </div>
                    <!-- Departamento / Grupo de perguntas - REMOVIDO CONFORME SOLICITACAO -->
                    <div style="display:none; align-items:center; gap:0.6rem;">
                        <i class="ph ph-buildings" style="color:#0f4c81; font-size:1.1rem;"></i>
                        <label style="font-size:0.85rem; font-weight:700; color:#0f4c81; white-space:nowrap;">Formulário para:</label>
                        <select onchange="window.tabPersistence['${tipo === 'satisfacao' ? pkSat : (tipo === 'experiencia' ? pkExp : pkDes)}']=this.value; renderAvaliacaoTab(document.getElementById('docs-list-container'));" style="padding:0.4rem 0.75rem; border-radius:6px; border:1.5px solid #0f4c81; font-weight:600; background:#eff6ff; color:#0f4c81; cursor:pointer; font-size:0.88rem;">
                            ${(tipo === 'satisfacao' ? groupOptionsSatisfacao : (tipo === 'experiencia' ? groupOptionsExperiencia : groupOptionsDesempenho)).map(g => `<option value="${g}" ${g === safeGroupKey ? 'selected':''}>${g.charAt(0).toUpperCase()+g.slice(1).replace(/_/g,' ')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <label style="font-size:0.9rem; font-weight:600; color:#475569;">Ano Base:</label>
                    <select id="av-year-select" style="padding:0.5rem; border-radius:6px; border:1px solid #cbd5e1; font-weight:600; background:#fff; color:#334155; cursor:pointer;" onchange="window.tabPersistence['av-year-select']=this.value; renderAvaliacaoTab(document.getElementById('docs-list-container'));">
                        ${anos.map(y => `<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Charts Container -->
            <div style="display:flex; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap; justify-content:center;">
                <div style="${tipo === 'experiencia' ? 'width:100%; max-width:900px;' : 'flex:1; min-width:300px;'} background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <h5 style="margin:0 0 1rem; text-align:center; color:#334155; font-size:1.1rem;">${tipo === 'experiencia' ? 'Desempenho por Categoria' : 'Desempenho por Categoria Trimestral'}</h5>
                    <div style="position:relative; height:${tipo === 'experiencia' ? '300px' : '380px'}; width:100%; margin:0 auto;"><canvas id="chart-competencias"></canvas></div>
                </div>
                ${tipo === 'experiencia' ? '' : `
                <div style="flex:1; min-width:300px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <h5 style="margin:0 0 1rem; text-align:center; color:#334155; font-size:1.1rem;">Evolução Trimestral Geral</h5>
                    <div style="position:relative; height:380px; width:100%; margin:0 auto;"><canvas id="chart-medias"></canvas></div>
                </div>
                `}
            </div>

            ${actionsHtml}
        `;

        // Renderizar Charts (depois do innerHTML)
        setTimeout(() => {
            if (typeof Chart === 'undefined') return;
            
            const categoriesList = categories;
            const datasetsBar = [];
            const barColors = [
                { bg: 'rgba(14, 165, 233, 0.9)', border: '#0ea5e9' }, // 1º Trim: Azul
                { bg: 'rgba(168, 85, 247, 0.9)', border: '#a855f7' }, // 2º Trim: Roxo
                { bg: 'rgba(34, 197, 94, 0.9)', border: '#22c55e' }, // 3º Trim: Verde
                { bg: 'rgba(236, 72, 153, 0.9)', border: '#ec4899' }  // 4º Trim: Rosa
            ];
            const legendLabelsTrim = { 1: '1º Trimestre', 2: '2º Trimestre', 3: '3º Trimestre', 4: '4º Trimestre' };

            const maxDatasetTrim = tipo === 'experiencia' ? 1 : 4;
            const trimsArray = Array.from({length: maxDatasetTrim}, (_, i) => i + 1);

            trimsArray.forEach(t => {
                const dataPoints = categories.map(cat => trimestersData[t][cat] ? parseFloat(trimestersData[t][cat].toFixed(2)) : null);
                datasetsBar.push({
                    label: tipo === 'experiencia' ? 'Pontuação Oitda' : legendLabelsTrim[t],
                    data: dataPoints,
                    backgroundColor: barColors[t-1].bg,
                    borderColor: barColors[t-1].border,
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                });
            });

            if (chartDonut) chartDonut.destroy();
            const ctxDonut = document.getElementById('chart-competencias')?.getContext('2d');
            if (ctxDonut) {
                // Formatação multi-linhas (split em duas partes se >2 palavras)
                const formattedLabels = categoriesList.map(c => {
                    const words = c.trim().split(/\s+/);
                    if (words.length > 2) {
                        const mid = Math.ceil(words.length / 2);
                        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
                    }
                    return c;
                });

                chartDonut = new Chart(ctxDonut, {
                    type: 'bar',
                    data: {
                        labels: formattedLabels,
                        datasets: datasetsBar
                    },
                    options: { 
                        indexAxis: 'y', 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { 
                            x: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
                            y: { ticks: { font: { size: 10 } } }
                        },
                        plugins: { 
                            legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                            tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + (c.raw ? c.raw : '0'); } } }
                        } 
                    }
                });
            }

            if (chartBar) chartBar.destroy();
            const ctxBar = document.getElementById('chart-medias')?.getContext('2d');
            if (ctxBar) {
                // Gráfico 2: Evolução (Linha)
                chartBar = new Chart(ctxBar, {
                    type: 'line',
                    data: {
                        labels: [trimestreToMonth[1], trimestreToMonth[2], trimestreToMonth[3], trimestreToMonth[4]],
                        datasets: [{ 
                            label: 'Média Geral', 
                            data: [trimestersOverall[1], trimestersOverall[2], trimestersOverall[3], trimestersOverall[4]], 
                            borderColor: '#10b981', 
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            borderWidth: 3,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#10b981',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            fill: true,
                            tension: 0.4 // Linha suave
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } },
                        plugins: { 
                            legend: { display: false },
                            tooltip: { callbacks: { label: function(c) { return 'Nota: ' + (c.raw ? c.raw.toFixed(2) : '0'); } } }
                        }
                    }
                });
            }
        }, 100);
    };

    renderDashboard(selectedYear, selectedTipo);

    // Auto-open logic for email links
    setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autoOpenDesempenho') === '1') {
            const anoParam = parseInt(params.get('ano'));
            const triParam = parseInt(params.get('trimestre'));
            if (anoParam && triParam) {
                // Ensure we only open it once per session to avoid infinite loops on refresh
                if (!window.sessionStorage.getItem('desempenhoOpened_' + colabId)) {
                    window.sessionStorage.setItem('desempenhoOpened_' + colabId, '1');
                    window.openFormAvaliacao('desempenho', anoParam, triParam, 'default');
                }
            }
        }
    }, 600);
};

window.openFormAvaliacao = async function(tipo, ano, trimestre, groupKey) {
    const colabId = viewedColaborador.id;
    const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`).catch(() => []);
    const existing = avaliacoes.find(a => Number(a.ano) === Number(ano) && Number(a.trimestre) === Number(trimestre) && a.tipo === tipo);
    let savedAnswers = {};
    let savedObs = {};
    window._existingAvaliacaoJson = null; // limpa antes de definir
    if (existing) {
        window._existingAvaliacaoJson = existing.respostas_json || null;
        savedAnswers = JSON.parse(existing.respostas_json || '{}');
        if (savedAnswers.__obs__) {
            savedObs = savedAnswers.__obs__;
        }
        // Se o groupKey passado for inválido (null, "null", sem template carregado),
        // tenta recuperar o __grupo__ salvo dentro do próprio respostas_json
        const passedKeyInvalid = !groupKey || groupKey === 'null' || groupKey === 'undefined'
            || !AVALIACAO_QUESTIONS[tipo] || !AVALIACAO_QUESTIONS[tipo][groupKey];
        if (passedKeyInvalid && savedAnswers.__grupo__) {
            const savedKey = savedAnswers.__grupo__;
            if (AVALIACAO_QUESTIONS[tipo] && AVALIACAO_QUESTIONS[tipo][savedKey]) {
                groupKey = savedKey;
            }
        }
    }

    // Verificação final: se groupKey ainda for inválido, mostrar erro amigável
    if (!groupKey || groupKey === 'null' || !AVALIACAO_QUESTIONS[tipo] || !AVALIACAO_QUESTIONS[tipo][groupKey]) {
        Swal.fire({
            icon: 'warning',
            title: 'Template não encontrado',
            html: `Não foi possível identificar o template de avaliação para este colaborador.<br><br>Acesse <b>RH → Avaliações → Templates</b> e cadastre um template para o cargo/departamento deste colaborador.`,
            confirmButtonText: 'Entendido'
        });
        return;
    }

    let questions = null;

    // -----------------------------------------------------------------------
    // SOLUÇÃO DO SUMIÇO DE RESPOSTAS:
    // Se o template for editado lá no "Gerenciar Avaliações" (ex: mudar o nome
    // de uma categoria), o form tentaria abrir usando as novas categorias, mas 
    // os dados foram salvos com as categorias antigas. Isso fazia as respostas
    // aparecerem em branco e se perderem ao salvar.
    // O __categorias_snapshot__ guarda o template EXATO usado na época.
    // -----------------------------------------------------------------------
    if (existing && savedAnswers) {
        if (savedAnswers.__categorias_snapshot__) {
            try {
                const snap = JSON.parse(savedAnswers.__categorias_snapshot__);
                if (snap && Object.keys(snap).length > 0) {
                    questions = snap;
                }
            } catch(e) {}
        }
        
        // Fallback se não tiver snapshot: constrói um básico pelas respostas
        if (!questions) {
            const savedCats = Object.keys(savedAnswers).filter(k => 
                k !== '__obs__' && k !== '__status__' && k !== '__grupo__' && k !== '__categorias_snapshot__'
            );
            const currentTemplate = AVALIACAO_QUESTIONS[tipo][groupKey];
            const currentCats = currentTemplate ? Object.keys(currentTemplate) : [];
            
            // Se as categorias salvas não baterem com o template atual, reconstrói
            if (savedCats.length > 0 && (!currentTemplate || !savedCats.every(sc => currentCats.includes(sc)))) {
                const rebuilt = {};
                for (const sc of savedCats) {
                    const ans = savedAnswers[sc];
                    if (ans && typeof ans === 'object') {
                        const maxIdx = Math.max(...Object.keys(ans).map(Number));
                        // Tenta usar as perguntas do template atual se a categoria existir, senao gera placeholder
                        rebuilt[sc] = currentTemplate && currentTemplate[sc] 
                            ? currentTemplate[sc] 
                            : Array.from({ length: maxIdx + 1 }, (_, i) => `Pergunta ${i + 1} (${sc})`);
                    }
                }
                if (Object.keys(rebuilt).length > 0) questions = rebuilt;
            }
        }
    }

    if (!questions) {
        questions = AVALIACAO_QUESTIONS[tipo][groupKey];
    }

    // -----------------------------------------------------------------------
    // MAPEAMENTO DE NOTAS POR POSIÇÃO:
    // As notas podem estar salvas sob nomes de categorias ANTIGOS (ex: "Organização
    // e Rotina de Trabalho") enquanto o snapshot/template atual usa nomes NOVOS
    // (ex: "Rotina e Carga de Trabalho"). Para não perder essas notas, mapeamos
    // as categorias por POSIÇÃO quando o nome exato não bate.
    // -----------------------------------------------------------------------
    const categories = Object.keys(questions);
    if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        // Pega as categorias com NOTAS salvas (exclui campos de sistema)
        const savedScoreCats = Object.keys(savedAnswers).filter(k =>
            k !== '__obs__' && k !== '__status__' && k !== '__grupo__' && k !== '__categorias_snapshot__'
        );
        // Para cada categoria do template atual, verifica se existe no savedAnswers
        // Se não existir pelo nome, tenta pegar pela POSIÇÃO da categoria antiga
        categories.forEach((newCat, idx) => {
            if (!savedAnswers[newCat] && savedScoreCats[idx]) {
                // Nome não bate, mas existe uma categoria na mesma posição → mapeia
                savedAnswers[newCat] = savedAnswers[savedScoreCats[idx]];
            }
        });
        // Faz o mesmo para as observações
        if (savedAnswers.__obs__) {
            const savedObsCats = Object.keys(savedAnswers.__obs__);
            categories.forEach((newCat, idx) => {
                if (!savedAnswers.__obs__[newCat] && savedObsCats[idx]) {
                    savedAnswers.__obs__[newCat] = savedAnswers.__obs__[savedObsCats[idx]];
                }
            });
            savedObs = savedAnswers.__obs__;
        }
    }
    
    const trimestreToMonth = {1: 'Janeiro (1º Trim.)', 2: 'Abril (2º Trim.)', 3: 'Julho (3º Trim.)', 4: 'Setembro (4º Trim.)'};

    let globalTotalQ_init = 0;
    let globalAnsQ_init = 0;
    categories.forEach(cat => {
        questions[cat].forEach((q, i) => {
            if (q && q.trim()) {
                globalTotalQ_init++;
                if (savedAnswers[cat] && savedAnswers[cat][i]) globalAnsQ_init++;
            }
        });
    });
    const globalPerc_init = globalTotalQ_init > 0 ? Math.round((globalAnsQ_init / globalTotalQ_init) * 100) : 0;
    const globalColor_init = globalPerc_init === 100 ? '#16a34a' : 'rgba(255,255,255,0.2)';
    const titleStr = tipo === 'experiencia' ? 'Avaliação de Experiência' : ((tipo === 'desempenho' ? 'Avaliação de Desempenho' : 'Avaliação de Satisfação') + ' - ' + trimestreToMonth[trimestre] + ' / ' + ano);

    // Guarda o template ATIVO (que pode ter sido reconstruído do snapshot) para que
    // saveAvaliacao use exatamente o mesmo objeto ao salvar — evita descasamento de índices.
    window._activeAvaliacaoQuestions = questions;

    let html = `
        <div style="background:#fff; border-radius:0; width:100%; height:100%; display:flex; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="padding:1.5rem; background:#0f4c81; color:#fff; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <h3 style="margin:0; font-size:1.25rem;">${titleStr}</h3>
                    <span id="global-perc-badge" style="background:${globalColor_init}; border-radius:20px; padding:4px 12px; font-size:0.85rem; font-weight:700; transition:background 0.3s, color 0.3s;">${globalPerc_init}% Concluído</span>
                </div>
                <button onclick="document.getElementById('modal-avaliacao').remove()" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:2rem; overflow-y:auto; flex:1; background:#f8fafc;">
                <p style="margin-top:0; margin-bottom:1.5rem; color:#0f4c81; font-size:1.05rem; font-weight:700; background:#e0f2fe; padding:12px 16px; border-radius:8px; border-left:5px solid #0ea5e9; box-shadow:0 2px 4px rgba(14,165,233,0.15);">
                    Avalie cada critério (1 Muito ruim - 2 Ruim - 3 Médio - 4 Bom - 5 Muito bom) e adicione uma observação caso aplicável.
                </p>
                <form id="form-avaliacao-perguntas">
    `;

    categories.forEach((cat, catIdx) => {
        let totalQ = 0;
        let ansQ = 0;
        questions[cat].forEach((q, i) => {
            if (q && q.trim()) {
                totalQ++;
                if (savedAnswers[cat] && savedAnswers[cat][i]) ansQ++;
            }
        });
        let perc = totalQ > 0 ? Math.round((ansQ/totalQ)*100) : 0;
        const completeColor = perc === 100 ? '#16a34a' : '#0ea5e9';

        html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:1.5rem; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="background:#f1f5f9; padding:0.75rem 1rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; color:#334155;">${catIdx+1}. ${cat}</span>
                    <div style="display:flex; align-items:center; gap:0.5rem; width:100px;">
                        <span style="font-size:0.75rem; font-weight:700; color:${completeColor};" id="perc-text-av${catIdx}">${perc}%</span>
                        <div style="flex:1; background:#cbd5e1; height:6px; border-radius:3px; overflow:hidden;">
                            <div id="perc-bar-av${catIdx}" style="width:${perc}%; height:100%; background:${completeColor}; transition:width 0.3s, background 0.3s;"></div>
                        </div>
                    </div>
                </div>
                <div style="padding:1rem;">
        `;
        questions[cat].forEach((q, i) => {
            if (!q || !q.trim()) return;
            const val = savedAnswers[cat] ? savedAnswers[cat][i] : null;
            const obsStr = (savedObs[cat] && savedObs[cat][i]) ? savedObs[cat][i] : '';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:1.5rem; padding:0.75rem 0; border-bottom:1px dashed #e2e8f0; flex-wrap:wrap;">
                    <div style="width:35%; min-width:280px; font-size:0.95rem; color:#475569; font-weight:500;">${q}</div>
                    <div style="flex:1; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <div style="display:flex; gap:0.35rem; flex-shrink:0;">
            `;
            
            const qColors = { 1:'#ef4444', 2:'#f97316', 3:'#eab308', 4:'#84cc16', 5:'#22c55e' };
            const bgColors = { 1:'#fee2e2', 2:'#ffedd5', 3:'#fef3c7', 4:'#ecfccb', 5:'#dcfce7' };
            
            for(let v=1; v<=5; v++) {
                const checked = (val == v) ? 'checked' : '';
                const c = qColors[v]; const bg = bgColors[v];
                html += `
                    <label style="cursor:pointer; position:relative; margin:0;" title="Nota ${v}">
                        <input type="radio" name="av_${catIdx}_${i}" value="${v}" ${checked} style="position:absolute; opacity:0; pointer-events:none;" onchange="updateAvaliacaoProgress(${catIdx}, ${totalQ})">
                        <div class="radio-nota" style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:700; font-size:0.85rem; border:1px solid #cbd5e1; background: ${checked?bg:'#fff'}; color: ${checked?'#fff':c}; border-color:${checked?c:'#cbd5e1'}; transition:all 0.15s;" 
                             onclick="this.parentElement.parentElement.querySelectorAll('.radio-nota').forEach(el=>{el.style.background='#fff'; el.style.color=el.dataset.color; el.style.borderColor='#cbd5e1'}); this.style.background=this.dataset.bg; this.style.color='#fff'; this.style.borderColor=this.dataset.color;"
                             data-color="${c}" data-bg="${c}">
                            ${v}
                        </div>
                    </label>
                `;
            }
            html += `           </div>
                        <input type="text" name="av_obs_${catIdx}_${i}" value="${obsStr}" placeholder="Observação (opcional)..." style="flex:1; min-width:250px; padding:0.4rem 0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; color:#334155; height:32px; box-sizing:border-box;">
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    });

    html += `
                </form>
            </div>
            <div style="padding:1.5rem; border-top:1px solid #e2e8f0; background:#fff; display:flex; justify-content:space-between; align-items:center;">
                <span id="form-av-error" style="color:#e03131; font-size:0.85rem; font-weight:600;"></span>
                <input type="hidden" id="av_hidden_status" value="${savedAnswers.__status__ || ''}">
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <button type="button" onclick="document.getElementById('modal-avaliacao').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="button" onclick="saveAvaliacao('${tipo}', ${ano}, ${trimestre}, '${groupKey}')" class="btn btn-primary"><i class="ph ph-check"></i> Salvar Respostas</button>
                </div>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.id = 'modal-avaliacao';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; padding:0; box-sizing:border-box;';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
};

window.updateAvaliacaoProgress = function(catIdx, totalQ) {
    const form = document.getElementById('form-avaliacao-perguntas');
    let ansQ = 0;
    for (let i=0; i<totalQ; i++) {
        const rads = form.elements[`av_${catIdx}_${i}`];
        if (rads && Array.from(rads).find(r => r.checked)) ansQ++;
    }
    const perc = Math.round((ansQ/totalQ)*100);
    const textEl = document.getElementById(`perc-text-av${catIdx}`);
    const barEl = document.getElementById(`perc-bar-av${catIdx}`);
    if (textEl && barEl) {
        textEl.textContent = `${perc}%`;
        barEl.style.width = `${perc}%`;
        const color = perc === 100 ? '#16a34a' : '#0ea5e9';
        textEl.style.color = color;
        barEl.style.background = color;
    }

    // Calcula e atualiza o badge geral no topo
    const allRads = form.querySelectorAll('input[type="radio"]:checked');
    const allInputs = form.querySelectorAll('input[type="radio"]');
    const globalTotal = allInputs.length / 5;
    const globalAns = allRads.length;
    const globalPerc = globalTotal > 0 ? Math.round((globalAns / globalTotal) * 100) : 0;
    
    const globalBadge = document.getElementById('global-perc-badge');
    if (globalBadge) {
        globalBadge.textContent = `${globalPerc}% Concluído`;
        globalBadge.style.background = globalPerc === 100 ? '#16a34a' : 'rgba(255,255,255,0.2)';
    }
}

window.saveAvaliacao = async function(tipo, ano, trimestre, groupKey) {
    // Usa o template ATIVO que foi usado para renderizar o form (guardado em window._activeAvaliacaoQuestions).
    // Isso garante que os índices av_0_0, av_1_0, etc. sejam lidos com as mesmas categorias
    // que foram usadas ao montar o HTML — mesmo que o template tenha sido reconstruído do snapshot.
    const activeQuestions = window._activeAvaliacaoQuestions
        || (AVALIACAO_QUESTIONS[tipo] && AVALIACAO_QUESTIONS[tipo][groupKey])
        || {};
    const categories = Object.keys(activeQuestions);

    const form = document.getElementById('form-avaliacao-perguntas');
    // CRÍTICO: começar do JSON existente no banco, não do zero.
    // Se começarmos do zero, as notas salvas em categorias antigas (com nomes diferentes)
    // são perdidas na sobrescrita. Carregamos o JSON atual e só atualizamos as
    // categorias do template ativo, preservando o resto.
    let respostas = {};
    if (window._existingAvaliacaoJson) {
        try { respostas = JSON.parse(window._existingAvaliacaoJson); } catch(e) {}
    }
    respostas.__obs__ = respostas.__obs__ || {};
    const errSpan = document.getElementById('form-av-error');


    let totalQ = 0;
    let ansQ = 0;

    categories.forEach((cat, catIdx) => {
        respostas[cat] = {};
        respostas.__obs__[cat] = {};
        const catQuestions = activeQuestions[cat] || [];
        catQuestions.forEach((q, i) => {
            if (!q || !q.trim()) return; // ignora perguntas em branco (igual ao display)
            totalQ++;
            const rads = form.elements[`av_${catIdx}_${i}`];
            if (rads && rads.length) {
                const selected = Array.from(rads).find(r => r.checked);
                if (selected) {
                    respostas[cat][i] = selected.value;
                    ansQ++;
                }
            }
            const obsInput = form.elements[`av_obs_${catIdx}_${i}`];
            if (obsInput && obsInput.value.trim().length > 0) {
                respostas.__obs__[cat][i] = obsInput.value.trim();
            }
        });
    });

    const hiddenStatusEl = document.getElementById('av_hidden_status');
    if (hiddenStatusEl && hiddenStatusEl.value) {
        respostas.__status__ = hiddenStatusEl.value;
    }

    // Salva o groupKey dentro do JSON para recuperação futura
    respostas.__grupo__ = groupKey;

    // SNAPSHOT DAS PERGUNTAS: salva o template completo junto com as respostas.
    // Isso garante que, mesmo que o template seja editado ou removido no futuro,
    // o formulário possa ser reaberto mostrando as perguntas e respostas originais.
    respostas.__categorias_snapshot__ = JSON.stringify(activeQuestions);

    const is100Percent = (totalQ > 0 && ansQ === totalQ);

    try {
        errSpan.textContent = 'Salvando...';
        await apiPost('/avaliacoes', { colaborador_id: viewedColaborador.id, tipo, ano, trimestre, respostas_json: JSON.stringify(respostas) });
        
        // Se estiver 100%, gera o PDF e salva
        if (is100Percent && typeof html2pdf !== 'undefined') {
            errSpan.textContent = 'Gerando PDF...';
            await generateAndUploadEvaluationPDF(viewedColaborador.id, viewedColaborador.nome_completo, tipo, ano, trimestre, groupKey, respostas);
        }

        const modal = document.getElementById('modal-avaliacao');
        if (modal) modal.remove();
        
        renderAvaliacaoTab(document.getElementById('docs-list-container'));
        
        // Recarregar a lista de colaboradores (Atualiza views de Gestão/Feedback)
        if (typeof window.loadColaboradores === 'function') {
            window.loadColaboradores();
        }

        alert(tipo === 'experiencia' ? 'Avaliação de experiência salva com sucesso!' : 'Avaliação do ' + trimestre + 'º trimestre salva!');
    } catch(e) {
        errSpan.textContent = '';
        alert('Erro ao salvar avaliação: ' + e.message);
    }
};

window.deleteAvaliacao = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.')) return;
    try {
        await apiDelete(`/avaliacoes/${id}`);
        alert('Avaliação excluída com sucesso!');
        renderAvaliacaoTab(document.getElementById('docs-list-container'));
    } catch (e) {
        alert('Erro ao excluir avaliação: ' + e.message);
    }
};

// ============================================================
// MOTOR DE PDF - usa jsPDF DIRETAMENTE (sem html2canvas)
// Solução definitiva: gera o PDF programaticamente, sem DOM
// ============================================================
async function buildAvaliacaoPDF(nome, tipo, ano, trimestre, groupKey, respostas) {
    // jsPDF está bundled no html2pdf.bundle.min.js como window.jspdf.jsPDF
    const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!JsPDF) throw new Error('jsPDF não encontrado. Verifique se html2pdf.bundle.min.js está carregado.');

    const doc = new JsPDF('p', 'mm', 'a4');
    const PW = 210; // largura A4 mm
    const PH = 297; // altura A4 mm
    const ML = 14;  // margem esquerda
    const MR = 14;  // margem direita
    const CW = PW - ML - MR; // largura do conteúdo
    let y = 12;

    // Cores
    const C_BLUE   = [15, 76, 129];
    const C_LBLUE  = [240, 247, 255];
    const C_GRAY   = [71, 85, 105];
    const C_LGRAY  = [248, 250, 252];
    const C_WHITE  = [255, 255, 255];
    const C_LINE   = [203, 213, 225];

    const checkPage = (needed) => {
        if (y + needed > PH - 12) { doc.addPage(); y = 12; }
    };

    // --- LOGO ---
    try {
        const resp = await fetch('/assets/logo-header.png');
        const blob = await resp.blob();
        const imgObj = await new Promise((res, rej) => {
            const r = new FileReader(); 
            r.onload = () => {
                const img = new Image();
                img.onload = () => res({ b64: r.result, w: img.width, h: img.height });
                img.onerror = rej;
                img.src = r.result;
            };
            r.onerror = rej;
            r.readAsDataURL(blob);
        });
        const ratio = imgObj.w / imgObj.h;
        const logoW = CW;
        const logoH = CW / ratio;
        doc.addImage(imgObj.b64, 'PNG', ML, y, logoW, logoH);
        y += logoH + 4;
    } catch(e) { y += 3; }

    // --- TÍTULO ---
    const tipoText = tipo === 'desempenho' ? 'Avaliação de Desempenho' : (tipo === 'experiencia' ? 'Avaliação de Experiência' : 'Avaliação de Satisfação');
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_BLUE);
    doc.text(tipoText, PW / 2, y, { align: 'center' });
    y += 6;

    // --- SUBTÍTULO ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (tipo === 'experiencia' && respostas.__status__) {
        const isAprovadoStr = respostas.__status__ === 'Aprovado';
        doc.setTextColor(isAprovadoStr ? 22 : 239, isAprovadoStr ? 163 : 68, isAprovadoStr ? 74 : 68);
        doc.setFont('helvetica', 'bold');
    } else {
        doc.setTextColor(...C_GRAY);
    }
    doc.text(`Colaborador: ${nome}  |  Ano: ${ano}  |  ${trimestre}º Trimestre`, PW / 2, y, { align: 'center' });
    y += 4;

    // --- DIVISOR ---
    doc.setDrawColor(...C_LINE);
    doc.setLineWidth(0.4);
    doc.line(ML, y, PW - MR, y);
    y += 5;

    // --- CATEGORIAS ---
    const cats = Object.keys(AVALIACAO_QUESTIONS[tipo][groupKey]);
    let totalScore = 0, totalQs = 0;

    cats.forEach((cat, cIdx) => {
        const questions = AVALIACAO_QUESTIONS[tipo][groupKey][cat];
        let catTotal = 0, catCount = 0;

        const rows = questions.map((q, i) => {
            const nota = respostas[cat] ? respostas[cat][i] : null;
            if (nota) { catTotal += parseFloat(nota); catCount++; }
            let obsText = '';
            if (respostas.__obs__ && respostas.__obs__[cat] && respostas.__obs__[cat][i]) {
                obsText = respostas.__obs__[cat][i];
            }
            const finalText = obsText ? `${q}\n[Observação: ${obsText}]` : (q || '');
            return { q: finalText, nota: nota || '-' };
        });
        const catMetric = tipo === 'experiencia' ? catTotal : (catCount > 0 ? (catTotal / catCount).toFixed(2) : '0.00');
        totalScore += catTotal; totalQs += catCount;

        // Calcular altura necessária da categoria
        const rowHeight = 7.5;
        const catBlockH = 8 + rows.length * rowHeight;
        checkPage(catBlockH);

        // Cabeçalho da categoria
        doc.setFillColor(...C_LBLUE);
        doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, 'F');
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_BLUE);
        doc.text(`${cIdx + 1}. ${cat}`, ML + 3, y + 5.5);
        doc.text(`${tipo==='experiencia'?'Soma':'Média'}: ${catMetric}`, PW - MR - 3, y + 5.5, { align: 'right' });
        y += 9;

        // Linhas de perguntas
        rows.forEach(({ q, nota }, qi) => {
            checkPage(rowHeight + 2);

            // Fundo alternado
            if (qi % 2 === 0) {
                doc.setFillColor(...C_LGRAY);
                doc.rect(ML, y - 1, CW, rowHeight, 'F');
            }

            // Texto da pergunta (com quebra de linha automática)
            const maxQW = CW - 22;
            const lines = doc.splitTextToSize(q, maxQW);
            const rowH = Math.max(rowHeight, lines.length * 4 + 2);

            // Verificar quebra de página para linhas longas
            if (y + rowH > PH - 12) { doc.addPage(); y = 12; }

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C_GRAY);
            doc.text(lines, ML + 2, y + 4);

            // Nota alinhada à direita
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C_BLUE);
            doc.text(`Nota: ${nota}`, PW - MR - 2, y + 4, { align: 'right' });

            // Linha separadora sutil
            doc.setDrawColor(...C_LINE);
            doc.setLineWidth(0.15);
            doc.line(ML, y + rowH - 0.5, PW - MR, y + rowH - 0.5);

            y += rowH;
        });

        y += 3; // espaço entre categorias
    });

    // --- MÉDIA/SOMA TOTAL ---
    const overallMetric = tipo === 'experiencia' ? totalScore : (totalQs > 0 ? (totalScore / totalQs).toFixed(2) : '0.00');
    checkPage(14);
    if (tipo === 'experiencia' && respostas.__status__) {
        const isAprov = respostas.__status__ === 'Aprovado';
        doc.setFillColor(isAprov ? 22 : 239, isAprov ? 163 : 68, isAprov ? 74 : 68);
    } else {
        doc.setFillColor(...C_BLUE);
    }
    doc.roundedRect(ML, y, CW, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_WHITE);
    if (tipo === 'experiencia' && respostas.__status__) {
        doc.text(`Apoio Final de Experiência: ${respostas.__status__.toUpperCase()}  |  Soma Total Alcançada: ${overallMetric}`, PW / 2, y + 8, { align: 'center' });
    } else {
        doc.text(`${tipo==='experiencia'?'Soma':'Média'} Total Alcançada: ${overallMetric}`, PW - MR - 5, y + 8, { align: 'right' });
    }
    y += 16;

    // --- GRÁFICOS (nova página) ---
    const graph1Canvas = document.getElementById('chart-competencias');
    const graph2Canvas = document.getElementById('chart-medias');

    if (graph1Canvas || graph2Canvas) {
        doc.addPage();
        y = 12;

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_BLUE);
        doc.text('Análise Gráfica dos Resultados', PW / 2, y, { align: 'center' });
        y += 5;
        doc.setDrawColor(...C_LINE);
        doc.setLineWidth(0.4);
        doc.line(ML, y, PW - MR, y);
        y += 8;

        const addGraph = (canvas, label) => {
            if (!canvas) return;
            try {
                const imgData = canvas.toDataURL('image/png');
                const ratio = canvas.width / canvas.height;
                const maxW = CW;
                const maxH = 90;
                let imgW = maxW;
                let imgH = imgW / ratio;
                if (imgH > maxH) { imgH = maxH; imgW = imgH * ratio; }

                checkPage(imgH + 15);
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C_GRAY);
                doc.text(label, PW / 2, y, { align: 'center' });
                y += 5;

                doc.addImage(imgData, 'PNG', ML + (CW - imgW) / 2, y, imgW, imgH);
                y += imgH + 10;
            } catch(e) { console.warn('Gráfico não pôde ser inserido:', e); }
        };

        addGraph(graph1Canvas, 'Desempenho por Categoria');
        addGraph(graph2Canvas, 'Evolução Trimestral Geral');
    }

    return doc;
}

// ============================================================
// FUNÇÃO DE SALVAR (Upload automático)
// ============================================================
async function generateAndUploadEvaluationPDF(colabId, nome, tipo, ano, trimestre, groupKey, respostas) {
    const nomeFormated = tipo === 'desempenho' ? 'Avaliacao_de_Desempenho' : (tipo === 'experiencia' ? 'Avaliacao_de_Experiencia' : 'Avaliacao_de_Satisfacao');
    const safeNome = nome.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `${nomeFormated}_${trimestre}_${ano}_${safeNome.toUpperCase()}.pdf`;

    try {
        const doc = await buildAvaliacaoPDF(nome, tipo, ano, trimestre, groupKey, respostas);
        const pdfBlob = doc.output('blob');

        const formData = new FormData();
        formData.append('file', new File([pdfBlob], fileName, { type: 'application/pdf' }));
        formData.append('colaborador_id', colabId.toString());
        
        let docTypeStr = 'Avaliação de Desempenho';
        if (tipo === 'satisfacao') docTypeStr = 'Avaliação de Satisfação';
        else if (tipo === 'experiencia') docTypeStr = 'Avaliação de Experiência';
        formData.append('document_type', docTypeStr);
        
        formData.append('tab_name', 'AVALIACAO');
        formData.append('year', ano.toString());
        formData.append('month', trimestre.toString());

        const response = await fetch('/api/documentos', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });
        if (!response.ok) throw new Error(`Falha no upload: ${response.statusText}`);
        console.log('PDF gerado e enviado com sucesso:', fileName);
    } catch(e) {
        console.error('Erro ao gerar PDF da Avaliação:', e);
    }
}

// ============================================================
// BOTÃO VISUALIZAR - Abre PDF para download/preview
// ============================================================
window.viewAvaliacaoPDF = async function(tipo, ano, trimestre, groupKey) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        alert('A biblioteca de PDF ainda não foi carregada. Aguarde e tente novamente.');
        return;
    }

    const colabId = viewedColaborador.id;
    const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`).catch(() => []);
    const av = avaliacoes.find(a => Number(a.ano) === Number(ano) && Number(a.trimestre) === Number(trimestre) && a.tipo === tipo);
    if (!av || !av.respostas_json) {
        alert('Respostas não encontradas no servidor para gerar a visualização.');
        return;
    }
    const respostas = JSON.parse(av.respostas_json);

    // Overlay de carregamento
    const overlay = document.createElement('div');
    overlay.id = 'pdf-preview-avaliacao-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="color:#fff;font-size:1.1rem;display:flex;flex-direction:column;align-items:center;gap:1rem;">
        <div style="width:40px;height:40px;border:4px solid #0ea5e9;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span style="font-weight:600;">Gerando PDF...</span>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(overlay);

    try {
        const nome = viewedColaborador.nome_completo;
        const safeNome = nome.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g, '');
        const nomeBase = tipo === 'desempenho' ? 'Avaliacao_de_Desempenho' : (tipo === 'experiencia' ? 'Avaliacao_de_Experiencia' : 'Avaliacao_de_Satisfacao');
        const fileName = `${nomeBase}_${trimestre}_${ano}_${safeNome.toUpperCase()}.pdf`;

        const doc = await buildAvaliacaoPDF(nome, tipo, ano, trimestre, groupKey, respostas);
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        overlay.style.justifyContent = 'flex-start';
        overlay.innerHTML = `
            <div style="width:100%;padding:14px 28px;background:#1e293b;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 10px rgba(0,0,0,0.5);flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-file-pdf" style="color:#0ea5e9;font-size:1.8rem;"></i>
                    <h3 style="margin:0;color:#fff;font-size:1rem;font-weight:600;">${fileName}</h3>
                </div>
                <div style="display:flex;gap:12px;align-items:center;">
                    <a href="${blobUrl}" download="${fileName}" style="background:#10b981;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:700;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:7px;font-size:0.9rem;">
                        <i class="ph ph-download-simple"></i> Baixar PDF
                    </a>
                    <button onclick="document.getElementById('pdf-preview-avaliacao-overlay').remove();URL.revokeObjectURL('${blobUrl}');" style="background:#ef4444;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;font-size:0.9rem;">
                        <i class="ph ph-x"></i> Fechar
                    </button>
                </div>
            </div>
            <div style="flex:1;width:100%;display:flex;justify-content:center;padding:20px;box-sizing:border-box;">
                <iframe src="${blobUrl}" style="width:100%;max-width:1000px;height:100%;border:none;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.4);"></iframe>
            </div>
        `;
    } catch(e) {
        alert('Erro ao gerar PDF: ' + e.message);
        if (document.body.contains(overlay)) overlay.remove();
    }
}

window.updateExperienciaStatus = async function(tipo, ano, trim, newStatus) {
    const colabId = viewedColaborador.id;
    try {
        const avaliacoes = await apiGet(`/colaboradores/${colabId}/avaliacoes`);
        const av = avaliacoes.find(a => a.tipo === tipo && Number(a.ano) === Number(ano) && Number(a.trimestre) === Number(trim));
        if (!av) return;
        
        const res = JSON.parse(av.respostas_json);
        res.__status__ = newStatus;
        
        await apiPost('/avaliacoes', { colaborador_id: colabId, tipo: tipo, ano: ano, trimestre: trim, respostas_json: JSON.stringify(res) });
        
        // Regerar o PDF de forma transparente caso tenha ficado full (100%)
        let isFull = true;
        const groupKeys = Object.keys(AVALIACAO_QUESTIONS[tipo]);
        // descobrindo groupKey original
        let groupKeyToSave = groupKeys[0];
        const resCats = Object.keys(res).filter(k => k !== '__status__' && k !== '__obs__');
        if (resCats.length > 0) {
            for (let gk of groupKeys) {
                if (AVALIACAO_QUESTIONS[tipo][gk] && AVALIACAO_QUESTIONS[tipo][gk][resCats[0]]) {
                    groupKeyToSave = gk; break;
                }
            }
        }
        
        if (typeof html2pdf !== 'undefined') {
            await generateAndUploadEvaluationPDF(colabId, viewedColaborador.nome_completo, tipo, ano, trim, groupKeyToSave, res);
        }

        renderAvaliacaoTab(document.getElementById('docs-list-container'));
        alert('Resultado Final da Experiência atualizado!');
    } catch(e) {
        alert('Erro ao atualizar resultado: ' + e.message);
    }
}
