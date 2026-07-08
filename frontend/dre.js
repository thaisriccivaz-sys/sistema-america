// ══════════════════════════════════════════════════════════════════════
// DRE (DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO) MODULE
// ══════════════════════════════════════════════════════════════════════

let dreChartInstance = null;

window.initDRE = async function() {
    const container = document.getElementById('view-financeiro-dre');
    if (!container) return;

    // Se o HTML principal da DRE ainda não foi montado, montamos agora
    if (!document.getElementById('dre-main-card')) {
        container.innerHTML = `
            <style>
                .dre-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-family: 'Inter', sans-serif;
                    margin-top: 1rem;
                }
                .dre-table th {
                    background: #f8fafc;
                    border-bottom: 2px solid #cbd5e1;
                    color: #475569;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.72rem;
                    padding: 12px 16px;
                    letter-spacing: 0.05em;
                }
                .dre-table td {
                    padding: 10px 16px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 0.88rem;
                    color: #334155;
                    vertical-align: middle;
                }
                .dre-row-result {
                    background: rgba(25, 113, 194, 0.06) !important;
                    font-weight: 700;
                }
                .dre-row-result td {
                    border-top: 1px solid rgba(25, 113, 194, 0.15);
                    border-bottom: 2px solid rgba(25, 113, 194, 0.2);
                    color: #1e3a8a !important;
                }
                .dre-input-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }
                .dre-currency-symbol {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #64748b;
                }
                .dre-input {
                    text-align: right;
                    width: 180px;
                    padding: 6px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    outline: none;
                    font-size: 0.85rem;
                    color: #1e293b;
                    font-weight: 600;
                    background: #fff;
                    transition: all 0.15s;
                    height: 34px;
                }
                .dre-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                    background: #fff;
                }
                .dre-input[readonly] {
                    background: transparent;
                    border-color: transparent;
                    color: #1e3a8a;
                    font-weight: 800;
                    font-size: 0.95rem;
                    cursor: not-allowed;
                }
                .dre-indent-1 {
                    padding-left: 2.25rem !important;
                }
                .dre-indent-2 {
                    padding-left: 3.5rem !important;
                }
                .dre-table tr:hover:not(.dre-row-result) {
                    background: #f8fafc;
                }
            </style>

            <!-- Cabeçalho Principal -->
            <div class="page-header flex-between" style="position:sticky; top:60px; z-index:20; background:var(--bg-main); padding:1.25rem 0; margin-top:-1.5rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:1.5rem;">
                    <div style="width:60px; height:60px; border-radius:50%; border:2px dashed #1971c2; display:flex; align-items:center; justify-content:center; background:#e6f0fa; color:#1971c2; font-size:1.8rem;">
                        <i class="ph ph-presentation-chart"></i>
                    </div>
                    <div>
                        <h1 style="margin:0; font-size:1.85rem; font-weight:700; color:#334155;">DRE</h1>
                        <p style="margin:4px 0 0; color:#64748b; font-size:0.9rem;">Demonstrativo do Resultado do Exercício.</p>
                    </div>
                </div>
                
                <!-- Filtros e Ações de Período -->
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <div style="display:inline-flex; align-items:center; background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:4px 10px; height:38px; gap:6px;">
                        <i class="ph ph-calendar" style="color:#64748b; font-size:1.1rem;"></i>
                        <select id="dre-filtro-mes" style="border:none; background:none; font-size:0.85rem; font-weight:600; color:#334155; outline:none; cursor:pointer;" onchange="window.loadDREData()">
                            <option value="01">Janeiro</option>
                            <option value="02">Fevereiro</option>
                            <option value="03">Março</option>
                            <option value="04">Abril</option>
                            <option value="05">Maio</option>
                            <option value="06">Junho</option>
                            <option value="07">Julho</option>
                            <option value="08">Agosto</option>
                            <option value="09">Setembro</option>
                            <option value="10">Outubro</option>
                            <option value="11">Novembro</option>
                            <option value="12">Dezembro</option>
                        </select>
                        <select id="dre-filtro-ano" style="border:none; background:none; font-size:0.85rem; font-weight:600; color:#334155; outline:none; cursor:pointer;" onchange="window.loadDREData()">
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026" selected>2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                        </select>
                    </div>

                    <button class="btn btn-primary" onclick="window.loadDREData()" title="Recarregar dados" style="background:#e2e8f0; color:#475569; border:none; width:38px; height:38px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                    </button>
                    <button class="btn btn-primary" onclick="window.saveDREData()" style="background:#16a34a; border-color:#16a34a; font-weight:600; font-size:0.85rem; height:38px; display:inline-flex; align-items:center; gap:6px; transition:0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                        <i class="ph ph-check" style="font-size:1.15rem;"></i> Salvar
                    </button>
                </div>
            </div>

            <!-- Corpo Principal: Tabela Financeira -->
            <div id="dre-main-card" class="card p-4" style="margin-bottom: 2rem;">
                <div style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ph-table" style="color:#1971c2; font-size:1.2rem;"></i> Estrutura do DRE
                </div>
                <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem;">
                    * Preencha os campos editáveis. O sistema calculará as fórmulas e atualizará os indicadores reativos dinamicamente.
                </div>

                <div style="overflow-x:auto;">
                    <table class="dre-table">
                        <thead>
                            <tr>
                                <th style="text-align:left;">Descrição da Linha</th>
                                <th style="text-align:right; width:220px;">Valor (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- BLOCO 1: RECEITAS -->
                            <tr>
                                <td style="font-weight: 600;"><i class="ph ph-plus" style="font-size:0.8rem; color:#16a34a; margin-right:4px;"></i> Receita Operacional Bruta</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-input-currency">R$</span>
                                        <input type="number" id="dre-val-receita-bruta" class="dre-input" value="0.00" step="0.01" oninput="window.recalculateDRE()">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td class="dre-indent-1" style="color: #475569;"><i class="ph ph-minus" style="font-size:0.8rem; color:#ef4444; margin-right:4px;"></i> Deduções / Impostos</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-input-currency">R$</span>
                                        <input type="number" id="dre-val-deducoes" class="dre-input" value="0.00" step="0.01" oninput="window.recalculateDRE()">
                                    </div>
                                </td>
                            </tr>
                            <tr class="dre-row-result">
                                <td style="font-size:0.92rem; text-transform:uppercase; letter-spacing:0.02em;">(=) Receita Líquida</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-currency-symbol">R$</span>
                                        <input type="text" id="dre-val-receita-liquida" class="dre-input" readonly value="0,00">
                                    </div>
                                </td>
                            </tr>

                            <!-- BLOCO 2: CUSTOS -->
                            <tr>
                                <td style="font-weight: 600;"><i class="ph ph-minus" style="font-size:0.8rem; color:#ef4444; margin-right:4px;"></i> CMV / CPV (Custo de Mercadorias / Serviços)</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-input-currency">R$</span>
                                        <input type="number" id="dre-val-cmv-cpv" class="dre-input" value="0.00" step="0.01" oninput="window.recalculateDRE()">
                                    </div>
                                </td>
                            </tr>
                            <tr class="dre-row-result">
                                <td style="font-size:0.92rem; text-transform:uppercase; letter-spacing:0.02em;">(=) Lucro Bruto</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-currency-symbol">R$</span>
                                        <input type="text" id="dre-val-lucro-bruto" class="dre-input" readonly value="0,00">
                                    </div>
                                </td>
                            </tr>

                            <!-- BLOCO 3: DESPESAS -->
                            <tr>
                                <td style="font-weight: 600;"><i class="ph ph-minus" style="font-size:0.8rem; color:#ef4444; margin-right:4px;"></i> Despesas Operacionais</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-input-currency">R$</span>
                                        <input type="number" id="dre-val-despesas-operacionais" class="dre-input" value="0.00" step="0.01" oninput="window.recalculateDRE()">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td class="dre-indent-1" style="color: #475569;"><i class="ph ph-minus" style="font-size:0.8rem; color:#ef4444; margin-right:4px;"></i> Despesas Administrativas</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-input-currency">R$</span>
                                        <input type="number" id="dre-val-despesas-administrativas" class="dre-input" value="0.00" step="0.01" oninput="window.recalculateDRE()">
                                    </div>
                                </td>
                            </tr>
                            <tr class="dre-row-result">
                                <td style="font-size:0.92rem; text-transform:uppercase; letter-spacing:0.02em;">(=) EBITDA</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-currency-symbol">R$</span>
                                        <input type="text" id="dre-val-ebitda" class="dre-input" readonly value="0,00">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: 600;"><i class="ph ph-minus" style="font-size:0.8rem; color:#ef4444; margin-right:4px;"></i> Despesas Financeiras</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-input-currency">R$</span>
                                        <input type="number" id="dre-val-despesas-financeiras" class="dre-input" value="0.00" step="0.01" oninput="window.recalculateDRE()">
                                    </div>
                                </td>
                            </tr>
                            <tr class="dre-row-result" style="background: rgba(22, 163, 74, 0.08) !important;">
                                <td style="font-size:0.96rem; text-transform:uppercase; letter-spacing:0.03em; color: #15803d !important;">(=) Resultado Líquido do Exercício</td>
                                <td>
                                    <div class="dre-input-wrapper">
                                        <span class="dre-currency-symbol" style="color: #15803d !important;">R$</span>
                                        <input type="text" id="dre-val-resultado-liquido" class="dre-input" readonly value="0,00" style="color: #15803d !important;">
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Gráfico de Evolução -->
            <div class="card p-4">
                <div style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ph-chart-bar" style="color:#1971c2; font-size:1.2rem;"></i> Evolução Anual
                </div>
                <div id="dre-ano-rotulo" style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem;">
                    Evolução mensal da Receita Líquida vs Resultado Líquido no ano de 2026.
                </div>
                <div style="height: 320px; position: relative;">
                    <canvas id="dre-evolution-chart"></canvas>
                </div>
            </div>
        `;

        // Configura o ano correto no filtro
        const currentYear = new Date().getFullYear();
        const yearSelect = document.getElementById('dre-filtro-ano');
        if (yearSelect) {
            yearSelect.value = String(currentYear);
        }

        // Configura o mês correto no filtro
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const monthSelect = document.getElementById('dre-filtro-mes');
        if (monthSelect) {
            monthSelect.value = currentMonth;
        }
    }

    // Carrega os dados reais do banco
    await window.loadDREData();
};

window.recalculateDRE = function() {
    const receitaBruta = parseFloat(document.getElementById('dre-val-receita-bruta').value) || 0;
    const deducoes = parseFloat(document.getElementById('dre-val-deducoes').value) || 0;
    const cmvCpv = parseFloat(document.getElementById('dre-val-cmv-cpv').value) || 0;
    const despesasOperacionais = parseFloat(document.getElementById('dre-val-despesas-operacionais').value) || 0;
    const despesasFinanceiras = parseFloat(document.getElementById('dre-val-despesas-financeiras').value) || 0;

    // 1. Receita Líquida
    const receitaLiquida = receitaBruta - deducoes;
    document.getElementById('dre-val-receita-liquida').value = formatCurrency(receitaLiquida);

    // 2. Lucro Bruto
    const lucroBruto = receitaLiquida - cmvCpv;
    document.getElementById('dre-val-lucro-bruto').value = formatCurrency(lucroBruto);

    // 3. EBITDA (Lucro Bruto - Despesas Operacionais)
    const ebitda = lucroBruto - despesasOperacionais;
    document.getElementById('dre-val-ebitda').value = formatCurrency(ebitda);

    // 4. Resultado Líquido (EBITDA - Despesas Financeiras)
    const resultadoLiquido = ebitda - despesasFinanceiras;
    document.getElementById('dre-val-resultado-liquido').value = formatCurrency(resultadoLiquido);
};

window.loadDREData = async function() {
    const mes = document.getElementById('dre-filtro-mes').value;
    const ano = document.getElementById('dre-filtro-ano').value;
    const periodo = `${ano}-${mes}`;

    try {
        const res = await apiGet(`/financeiro/dre/${periodo}`);
        if (res) {
            document.getElementById('dre-val-receita-bruta').value = (res.receita_bruta || 0).toFixed(2);
            document.getElementById('dre-val-deducoes').value = (res.deducoes || 0).toFixed(2);
            document.getElementById('dre-val-cmv-cpv').value = (res.cmv_cpv || 0).toFixed(2);
            document.getElementById('dre-val-despesas-operacionais').value = (res.despesas_operacionais || 0).toFixed(2);
            document.getElementById('dre-val-despesas-administrativas').value = (res.despesas_administrativas || 0).toFixed(2);
            document.getElementById('dre-val-despesas-financeiras').value = (res.despesas_financeiras || 0).toFixed(2);
        }

        // Executa o recálculo inicial e renderiza o gráfico de evolução
        window.recalculateDRE();
        await window.updateDREChart(ano);
    } catch (e) {
        console.error('Erro ao carregar dados do DRE:', e);
    }
};

window.saveDREData = async function() {
    const mes = document.getElementById('dre-filtro-mes').value;
    const ano = document.getElementById('dre-filtro-ano').value;
    const periodo = `${ano}-${mes}`;

    const payload = {
        receita_bruta: parseFloat(document.getElementById('dre-val-receita-bruta').value) || 0,
        deducoes: parseFloat(document.getElementById('dre-val-deducoes').value) || 0,
        cmv_cpv: parseFloat(document.getElementById('dre-val-cmv-cpv').value) || 0,
        despesas_operacionais: parseFloat(document.getElementById('dre-val-despesas-operacionais').value) || 0,
        despesas_administrativas: parseFloat(document.getElementById('dre-val-despesas-administrativas').value) || 0,
        despesas_financeiras: parseFloat(document.getElementById('dre-val-despesas-financeiras').value) || 0
    };

    try {
        const res = await apiPost(`/financeiro/dre/${periodo}`, payload);
        if (res && res.success) {
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('DRE salvo com sucesso!');
            } else {
                Swal.fire('Sucesso', 'DRE salvo com sucesso!', 'success');
            }
            await window.updateDREChart(ano);
        } else {
            Swal.fire('Erro', 'Erro ao salvar DRE: ' + (res ? res.error : 'Erro desconhecido.'), 'error');
        }
    } catch (e) {
        console.error('Erro ao salvar dados do DRE:', e);
        Swal.fire('Erro', 'Erro de rede ou servidor ao salvar DRE.', 'error');
    }
};

window.updateDREChart = async function(ano) {
    const rLabel = document.getElementById('dre-ano-rotulo');
    if (rLabel) {
        rLabel.innerText = `Evolução mensal da Receita Líquida vs Resultado Líquido no ano de ${ano}.`;
    }

    try {
        const rows = await apiGet(`/financeiro/dre-evolucao/${ano}`) || [];
        
        // Mapeia os 12 meses
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dataReceitaLiquida = Array(12).fill(0);
        const dataResultadoLiquido = Array(12).fill(0);

        rows.forEach(r => {
            const mPart = parseInt(r.periodo.split('-')[1], 10);
            if (mPart >= 1 && mPart <= 12) {
                const rLiq = (r.receita_bruta || 0) - (r.deducoes || 0);
                const ebitda = rLiq - (r.cmv_cpv || 0) - (r.despesas_operacionais || 0);
                const rNet = ebitda - (r.despesas_financeiras || 0);

                dataReceitaLiquida[mPart - 1] = rLiq;
                dataResultadoLiquido[mPart - 1] = rNet;
            }
        });

        // Se o gráfico já existe, destruímos ele para criar outro atualizado
        if (dreChartInstance) {
            dreChartInstance.destroy();
        }

        const ctx = document.getElementById('dre-evolution-chart');
        if (!ctx) return;

        dreChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: mesesNomes,
                datasets: [
                    {
                        label: 'Receita Líquida',
                        data: dataReceitaLiquida,
                        backgroundColor: 'rgba(25, 113, 194, 0.85)',
                        borderColor: '#1971c2',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Resultado Líquido',
                        data: dataResultadoLiquido,
                        backgroundColor: 'rgba(34, 197, 94, 0.85)',
                        borderColor: '#22c55e',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: 'Inter', size: 11, weight: '600' },
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.raw !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.raw);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Inter', size: 10, weight: '600' },
                            color: '#64748b'
                        }
                    },
                    y: {
                        ticks: {
                            font: { family: 'Inter', size: 10 },
                            color: '#64748b',
                            callback: function(value) {
                                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
                            }
                        },
                        grid: {
                            color: '#f1f5f9'
                        }
                    }
                }
            }
        });

    } catch (e) {
        console.error('Erro ao renderizar gráfico do DRE:', e);
    }
};

function formatCurrency(val) {
    if (isNaN(val) || val === null || val === undefined) return '0,00';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
