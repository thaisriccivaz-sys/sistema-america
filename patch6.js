const fs = require('fs');
let c = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

const target = `        // Limpa disponibilidade antiga (pode estar desatualizada se o resumo é de outro dia)
        _rrVeiculos.forEach(v => { v._dispMotorista = null; v._dispAjudante = null; });

        // Tenta extrair a data do nome (formato "DD-MM-YYYY ...") para re-consultar disponibilidade
        const nomeResumo = data.nome || '';
        const mData = nomeResumo.match(/(\\d{2})-(\\d{2})-(\\d{4})/);
        const dataHistorico = mData ? \`\${mData[3]}-\${mData[2]}-\${mData[1]}\` : null;
        window._rrDataRotaAtual = dataHistorico;

        _rrCurrentId = data.id;
        _rrRenderCorpo(); // renderiza sem disp (limpo)`;

const replacement = `        // Limpa disponibilidade antiga (pode estar desatualizada se o resumo é de outro dia)
        _rrVeiculos.forEach(v => { v._dispMotorista = null; v._dispAjudante = null; });

        // Tenta extrair a data do nome (formato "DD-MM-YYYY ...") para re-consultar disponibilidade
        const nomeResumo = data.nome || '';
        const mData = nomeResumo.match(/(\\d{2})-(\\d{2})-(\\d{4})/);
        const dataHistorico = mData ? \`\${mData[3]}-\${mData[2]}-\${mData[1]}\` : null;
        window._rrDataRotaAtual = dataHistorico;

        _rrCurrentId = data.id;

        // --- CARREGAR FOTOS E CAPACIDADES ATUAIS ---
        let frotaMap = {};
        let fotoMap  = {};
        try {
            const [resFrota, resColab] = await Promise.all([
                fetch('/api/frota/veiculos',      { headers: _rrAuthHeaders() }),
                fetch('/api/colaboradores/resumo', { headers: _rrAuthHeaders() })
            ]);
            if (resFrota.ok) {
                const list = await resFrota.json();
                list.forEach(item => {
                    const placaNorm = (item.placa || '').replace(/[-\\s]/g, '').toUpperCase();
                    frotaMap[placaNorm] = { carga: parseInt(item.capacidade_carga) || 0, temCadastro: item.capacidade_carga !== null && item.capacidade_carga !== '' };
                });
            }
            if (resColab.ok) {
                const list = await resColab.json();
                list.forEach(c => { fotoMap[(c.nome_completo || '').toLowerCase().trim()] = \`/api/colaboradores/foto/\${c.id}\`; });
            }
        } catch(e) {
            console.error('[RR] Erro ao buscar dados atualizados', e);
        }

        _rrVeiculos.forEach(v => {
            v._fotoMotorista = fotoMap[(v.motorista || '').toLowerCase().trim()] || null;
            v._fotoAjudante  = fotoMap[(v.ajudante  || '').toLowerCase().trim()] || null;

            const placaNorm = (v.veiculo || '').split(' ')[0].replace(/[-\\s]/g, '').toUpperCase();
            const info = frotaMap[placaNorm];
            v._maxCarga = info ? info.carga : null;
            v._temCadastroCarga = info ? info.temCadastro : false;
        });

        // Recalcular alertas
        function _somaProd(os) {
            const pArr = (os.produtos && os.produtos.length) ? os.produtos : [os.produto];
            let t = 0;
            pArr.forEach(ps => { const m=(ps||'').trim().match(/^(\\d+)\\s+(.+)/); if(m) t+=parseInt(m[1]); });
            return t;
        }

        _rrVeiculos.forEach(v => {
            v.alertaCarga = null;
            v.alertaCargaValor = null;
            if (!v._temCadastroCarga) return;

            let totalEntregas = 0;
            (v.os||[]).forEach(os => {
                if (os.tipo === 'ENTREGA') totalEntregas += _somaProd(os);
            });
            let cargaAtual = totalEntregas;
            let sobrecarga = false;
            let erroAtingido = 0;

            if (cargaAtual > v._maxCarga) { sobrecarga = true; erroAtingido = cargaAtual; }
            (v.os||[]).forEach(os => {
                if (sobrecarga) return;
                const qtd = _somaProd(os);
                if (!qtd) return;
                if (os.tipo === 'ENTREGA') cargaAtual -= qtd;
                else if (os.tipo === 'RETIRADA') {
                    cargaAtual += qtd;
                    if (cargaAtual > v._maxCarga) { sobrecarga = true; erroAtingido = cargaAtual; }
                }
            });
            if (sobrecarga) {
                v.alertaCarga = \`Capacidade excedida! Este veículo suporta \${v._maxCarga} banheiros, mas a rota projeta \${erroAtingido} simultâneos. Verifique a rota.\`;
            }
        });

        _rrRenderCorpo(); // renderiza sem disp (limpo)`;

c = c.replace(target, replacement);
fs.writeFileSync('frontend/resumo_rota.js', c);
