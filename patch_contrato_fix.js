/**
 * patch_contrato_fix.js — v2
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const startStr = '  window._sacBuscarContrato = async function(contratoVal) {';
const endStr = '\r\n\r\n  window._sacBuscarOSLogistica';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx === -1) { console.error('START not found'); process.exit(1); }
if (endIdx === -1) { console.error('END not found'); process.exit(1); }

console.log('Replacing from', startIdx, 'to', endIdx);
console.log('Old fn preview:', JSON.stringify(code.substring(endIdx-30, endIdx+30)));

const newFn = `  window._sacBuscarContrato = async function(contratoVal) {
    _sacWiz('cnpjCpf', contratoVal);
    const num = (contratoVal || '').trim();
    if (!num) return;

    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/os/buscar?contrato=' + encodeURIComponent(num), {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });

        if (!res.ok) {
            showToast('Nenhuma OS encontrada para este contrato.', 'info');
            return;
        }

        const rawLista = await res.json();

        const fixStr = (str) => {
            if (!str || typeof str !== 'string') return str;
            try { if (/[\\xC2\\xC3][\\x80-\\xBF]/.test(str)) return decodeURIComponent(escape(str)); } catch(e) {}
            return str;
        };
        if (Array.isArray(rawLista)) {
            rawLista.forEach(r => {
                if (r.endereco) r.endereco = fixStr(r.endereco);
                if (r.cliente)  r.cliente  = fixStr(r.cliente);
            });
        }

        const osList = Array.isArray(rawLista) ? rawLista : (rawLista.data || []);
        if (!osList.length) {
            showToast('Nenhuma OS encontrada para este contrato no histórico.', 'info');
            return;
        }

        const clienteNome = osList[0].cliente || '';
        const _clienteLimpo = window._stripEmojis(clienteNome);

        // Build address list with OS prefix
        const enderecosFormatados = osList.map(o => {
            const ender = [o.endereco, o.complemento].filter(Boolean).join(', ');
            return {
                original: ender,
                label: o.numero_os ? \`OS \${o.numero_os} - \${ender}\` : ender,
                os: o
            };
        }).filter(x => x.original);

        const labelsUnicos = [...new Set(enderecosFormatados.map(e => e.label))];

        // Show address selection modal if multiple
        const _enderRes = labelsUnicos.length > 1
            ? await _sacEscolherEndereco(labelsUnicos, _clienteLimpo || clienteNome, osList)
            : { label: labelsUnicos[0] || '', todos: false };

        const labelSelecionado = _enderRes ? _enderRes.label : null;

        if (labelsUnicos.length > 1 && labelSelecionado === null) return;

        const selecionado = enderecosFormatados.find(e => e.label === labelSelecionado) || enderecosFormatados[0];
        const enderecoFinal = selecionado ? selecionado.original : '';

        // Get OS entries for selected address
        let osDoEndereco;
        if (selecionado && selecionado.os && selecionado.os.numero_os) {
            osDoEndereco = osList.filter(o => o.numero_os === selecionado.os.numero_os);
        } else {
            osDoEndereco = osList.filter(o => [o.endereco, o.complemento].filter(Boolean).join(', ') === enderecoFinal);
        }
        const os = osDoEndereco[0] || osList[0];

        // Parse products
        const _parseProds = (o) => { try { return JSON.parse(o.produtos || '[]'); } catch(e) { return []; } };

        const SAC_EQUIP_ICONS = {
            'STD OBRA': '\u{1F6BB}', 'STD EVENTO': '\u{1F6BB}',
            'LX OBRA': '\u{1F6BB}', 'LX EVENTO': '\u{1F6BB}',
            'EXL OBRA': '\u{1F6BB}', 'EXL EVENTO': '\u{1F6BB}',
            'PCD OBRA': '\u267F', 'PCD EVENTO': '\u267F',
            'CHUVEIRO OBRA': '\u{1F6BF}', 'CHUVEIRO EVENTO': '\u{1F6BF}',
            'MICTÓRIO OBRA': '\u{1F4A7}', 'MICTÓRIO EVENTO': '\u{1F4A7}',
            'PBII OBRA': '\u{1F9FC}', 'PBII EVENTO': '\u{1F9FC}',
            'PBIII OBRA': '\u{1F9FC}', 'PBIII EVENTO': '\u{1F9FC}',
            'GUARITA INDIVIDUAL OBRA': '\u2B1C', 'GUARITA INDIVIDUAL EVENTO': '\u2B1C',
            'GUARITA DUPLA OBRA': '\u26AA', 'GUARITA DUPLA EVENTO': '\u26AA',
            'LIMPA FOSSA OBRA': '\u{1F4A7}', 'LIMPA FOSSA EVENTO': '\u{1F4A7}',
            'CARRINHO': '\u{1F6E4}', 'CAIXA DAGUA': '\u{1F9CA}'
        };

        const todosProds = osDoEndereco.flatMap(o => _parseProds(o).map(p => {
            const icone = SAC_EQUIP_ICONS[p.desc] || '';
            return (icone ? \`\${icone} \` : '') + [p.qtd, p.desc].filter(Boolean).join('x ');
        }));
        const prodsUnicos = [...new Set(todosProds)].filter(Boolean);
        const precisaModal = prodsUnicos.length > 1 || (prodsUnicos.length === 1 && (() => {
            const m = prodsUnicos[0].match(/(\\d+)x /);
            return m && parseInt(m[1]) > 1;
        })());
        const equipFinal = precisaModal
            ? await _sacEscolherEquipamento(prodsUnicos, _clienteLimpo || os.cliente || '', enderecoFinal)
            : (prodsUnicos[0] || _parseProds(os)[0]?.desc || '');
        if (equipFinal === null) return;

        // Fill wizard fields
        _wiz.clientName = _clienteLimpo || os.cliente || '';
        _wiz.cnpjCpf    = num;
        _wiz.osNumber   = os.numero_os || os.numero || '';
        _wiz.equipment  = equipFinal;
        _wiz.address    = enderecoFinal;

        if (!_wiz.contacts || _wiz.contacts.length === 0) {
            _wiz.contacts = [{ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' }];
        }
        if (os.responsavel) _wiz.contacts[0].name  = os.responsavel;
        if (os.telefone)    _wiz.contacts[0].phone = os.telefone;
        if (os.email)       _wiz.contacts[0].email = os.email;

        renderWizard();
        showToast('Dados preenchidos via Contrato!', 'success');

    } catch (e) {
        console.error('Erro ao buscar contrato:', e);
        showToast('Erro de conexão ao buscar contrato.', 'error');
    }
  }`;

code = code.substring(0, startIdx) + newFn + code.substring(endIdx);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('✅ _sacBuscarContrato rewritten');
console.log('File size:', fs.statSync('frontend/sac.js').size);

// Verifications
const c2 = fs.readFileSync('frontend/sac.js', 'utf8');
const fnStart = c2.indexOf('window._sacBuscarContrato');
const fnEnd   = c2.indexOf('window._sacBuscarOSLogistica');
const fnBody  = c2.substring(fnStart, fnEnd);
console.log('Has _sacEscolherEndereco:', fnBody.includes('_sacEscolherEndereco'));
console.log('Has _sacEscolherEquipamento:', fnBody.includes('_sacEscolherEquipamento'));
console.log('Has _wiz.osNumber:', fnBody.includes('_wiz.osNumber'));
console.log('Has _stripEmojis:', fnBody.includes('_stripEmojis'));
