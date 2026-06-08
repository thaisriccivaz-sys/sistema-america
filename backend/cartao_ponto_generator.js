const fs = require('fs');
const path = require('path');
const htmlPdf = require('html-pdf-node');
const { PDFDocument } = require('pdf-lib');
const rhidPonto = require('./routes/controlid.js');

function fmtMin(m) {
    if (!m) return '';
    const hrs = Math.floor(m / 60).toString().padStart(2, '0');
    const mns = (m % 60).toString().padStart(2, '0');
    return `${hrs}:${mns}`;
}

function safe(v) { return v || ''; }

function getLogoB64() {
    try {
        const logoPath = path.join(__dirname, '../frontend/assets/logo-header.png');
        if (fs.existsSync(logoPath)) {
            const buf = fs.readFileSync(logoPath);
            return 'data:image/png;base64,' + buf.toString('base64');
        }
    } catch(e) {}
    return null;
}

function buildCartaoPontoHtml(c, apuracaoDiaria, mes, ano, mesNome) {
    const logoB64 = getLogoB64();
    const numMatricula = safe(c.matricula_esocial) || safe(c.numero_registro) || safe(c.matricula) || '0';
    
    let rowsHtml = '';
    let totalNormais = 0, totalNoturno = 0, totalExtra60 = 0, totalExtra100 = 0;
    let totalExtraDiurna = 0, totalExtraNoturna = 0, totalFaltaAtraso = 0;
    const diasSemana = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
    let horarioContratualInfo = null;
    
    apuracaoDiaria.forEach(d => {
        let diaStr = String(d.date || d.dateTimeStr || '').substring(0,10);
        let diaNum = diaStr;
        let diaSemanaStr = '';
        if (diaStr.includes('-')) {
            const p = diaStr.split('-');
            if (p.length === 3) {
                diaNum = `${p[2]}/${p[1]}/${p[0]}`;
                // IMPORTANTE: manter formato YYYY-MM-DD para o construtor Date interpretar corretamente
                const dtFmt = p[0].length === 4 ? `${p[0]}-${p[1]}-${p[2]}` : `${p[2]}-${p[1]}-${p[0]}`;
                const dt = new Date(`${dtFmt}T12:00:00`);
                if (!isNaN(dt.getTime())) diaSemanaStr = diasSemana[dt.getDay()];

            }
        }
        
        // ── Classificação do status do dia (MESMA lógica da Conferência de Ponto) ──────
        // ORDEM IMPORTA: folga/feriado deve ser verificado ANTES de faltaDiaInteiro,
        // pois o RHID pode retornar faltaDiaInteiro=true em dias de folga agendada
        // quando o colaborador tem horário contratual todos os dias (7x0) mas não bateu ponto.
        let status = '';
        const stRaw = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
        const isFolgaSt  = stRaw.includes('folg') || stRaw.includes('dsr');
        const isFolgaFlag = d.folga === true;
        const isDSRMin   = (d.dsrConsideradoMinutos || 0) > 0;
        const semHorario  = ((d.idHorarioContratual || 0) === 0 && (d.strHorarioContratualSimples || '').trim() === '');
        const horasTrab   = (d.totalHorasTrabalhadas || 0) + (d.horasTotalNoturno || 0);
        const trabalhou   = (d.diasTrabalhados || 0) > 0 || horasTrab > 0;

        if (d.isHoliday) {
            status = 'Feriado: ' + (d.holidayName || '');
        } else if (isFolgaSt || isFolgaFlag || isDSRMin) {
            // DSR/FOLGA explícito da API — mas se trabalhou >= 6h, é dia trabalhado (ex: 10/05 Naelson)
            if (horasTrab >= 360) status = ''; // trabalhado — sem status especial
            else status = 'Folga';
        } else if (d.idJustification) {
            // Justificativa cadastrada no RHID (atestado, autorização supervisora, etc.)
            const obsJust = (d.toolTipAlert || '').toLowerCase();
            if (obsJust.includes('atestado') || obsJust.includes('medic')) {
                status = 'Atestado Médico';
            } else {
                status = 'Justificado';
            }
        } else if (semHorario && !trabalhou) {
            // Dia sem horário contratual e sem trabalho = folga implícita (ex: DSR de 6x1)
            status = 'Folga';
        } else if (d.faltaDiaInteiro) {
            // Só considera falta se nenhuma das condições acima se aplicar
            status = 'Falta';
        }
        
        let marcacoes = [];
        if (d.listAfdtManutencao && d.listAfdtManutencao.length > 0) {
            marcacoes = d.listAfdtManutencao.map(m => {
                const h = Math.floor(m.hora/100).toString().padStart(2,'0');
                const mn = (m.hora%100).toString().padStart(2,'0');
                return h + ':' + mn + (m.isManual ? ' (I)' : '') + (m.isPreAssigned ? ' (P)' : '');
            });
        } else if (d.marcacoes && Array.isArray(d.marcacoes)) {
            marcacoes = d.marcacoes.map(m => m.hora || m.time || m);
        }

        const e1 = marcacoes[0] || '';
        const s1 = marcacoes[1] || '';
        const e2 = marcacoes[2] || '';
        const s2 = marcacoes[3] || '';
        const e3 = marcacoes[4] || '';
        const s3 = marcacoes[5] || '';
        
        // ── TOTAL NORMAIS: soma exclusiva de horas diurnas + noturnas ────────
        // Na API RHID, colaboradores diurnos usam totalHorasTrabalhadas;
        // colaboradores noturnos usam horasTotalNoturno. São campos exclusivos.
        const normaisMin = (d.totalHorasTrabalhadas || 0) + (d.horasTotalNoturno || 0);
        const normais = fmtMin(normaisMin);

        // ── TOTAL NOTURNO: horas genuinamente noturnas (suplemento) ──────────
        // Se totalHorasTrabalhadas=0, é contrato noturno puro → noturno fica vazio
        const noturnMin = (d.totalHorasTrabalhadas > 0) ? (d.horasNoturnasNaoExtra || 0) : 0;
        const noturn = fmtMin(noturnMin);

        // ── EXTRA DIURNA e EXTRA NOTURNA: campos diretos da API RHID ─────────
        // extraDiurna = total de horas extras diurnas do dia (independente do percentual)
        // extraNoturna = total de horas extras noturnas do dia
        const extraDiurnaMin = d.extraDiurna || d.extraAdicionadaDiurna || 0;
        const extraNocturnaMin = d.extraNoturna || d.extraAdicionadaNoturna || 0;
        const extraDiurna = fmtMin(extraDiurnaMin);
        const extraNoturna = fmtMin(extraNocturnaMin);

        // ── EXTRA 60% / EXTRA 100%: classificados por dia da semana e feriado ─
        // Domingo e Feriado → 100%; Demais dias (Seg-Sab) → 60%
        // O campo extraDiurna da API RHID já contém o valor correto de horas extras
        let extra60Min = 0, extra100Min = 0;
        const totalExtraMin = extraDiurnaMin + extraNocturnaMin || d.horasExtrasCalculadas || 0;
        if (d.isHoliday || diaSemanaStr === 'DOM') {
            extra100Min = totalExtraMin;
        } else {
            extra60Min = totalExtraMin;
        }
        const extra60 = fmtMin(extra60Min);
        const extra100 = fmtMin(extra100Min);


        // ── FALTA E ATRASO ───────────────────────────────────────────────────
        const faltaAtrasoMin = d.horasFaltaAtraso || 0;

        // ── ACUMULADORES ─────────────────────────────────────────────────────
        totalNormais      += normaisMin;
        totalNoturno      += noturnMin;
        totalExtra60      += extra60Min;
        totalExtra100     += extra100Min;
        totalExtraDiurna  += extraDiurnaMin;
        totalExtraNoturna += extraNocturnaMin;
        totalFaltaAtraso  += faltaAtrasoMin;

        // ── HORÁRIO CONTRATUAL: coleta da primeira iteração com escala definida ───
        if (!horarioContratualInfo && d.idHorarioContratual && d.strHorarioContratualSimples && d.strHorarioContratualSimples.trim()) {
            horarioContratualInfo = {
                codigo: String(d.idHorarioContratual).padStart(5, '0'),
                horario: d.strHorarioContratualSimples
            };
        }

        // ── OBSERVAÇÕES: toolTipAlert + razões de pontos tratados ──────────────
        const obsLinhas = [];
        if (d.toolTipAlert && d.toolTipAlert.trim()) {
            const alertText = d.toolTipAlert.trim();
            if (!alertText.toLowerCase().includes('extra acima de 10 min')) {
                obsLinhas.push(alertText);
            }
        }
        if (d.listAfdtManutencao) {
            d.listAfdtManutencao.forEach(m => {
                if (m.reason && m.reason.trim()) {
                    const reasonLower = m.reason.toLowerCase();
                    if (!reasonLower.includes('batida autom')) {
                        const tipoOcorr = m.oculto ? '[D] ' : (m.isManual ? '[I] ' : '');
                        obsLinhas.push(tipoOcorr + m.reason.trim());
                    }
                }
            });
        }
        
        let faltaRanges = [];
        let otherObs = [];
        
        for (let obs of obsLinhas) {
            // Check if it matches "Falta no período entre XX:XX e YY:YY" (with or without [I]/[D] prefix)
            let m = obs.match(/Falta no período entre ([\d]{2}:[\d]{2}) e ([\d]{2}:[\d]{2})/i);
            if (m) {
                if (m[1] !== m[2]) {
                    faltaRanges.push(`${m[1]} e ${m[2]}`);
                }
            } else {
                otherObs.push(obs);
            }
        }
        
        let finalObs = Array.from(new Set(otherObs));
        if (faltaRanges.length > 0) {
            finalObs.push('Falta no período entre ' + Array.from(new Set(faltaRanges)).join(', '));
        } else if (obsLinhas.some(o => o.toLowerCase().includes('falta no período entre'))) {
            // Fallback just in case it didn't match the regex but had the text
            finalObs.push('Falta no período');
        }

        const obsText = finalObs.join(' | ');

        let previsto = c.escala || '08:00-12:00 13:00-17:48';
        let ent1_td, sai1_td, ent2_td, sai2_td;

        if (status.startsWith('Feriado') && !e1) {
            previsto = 'FERIADO';
            ent1_td = status; sai1_td = ''; ent2_td = ''; sai2_td = '';
        } else if (status === 'Folga' && !e1) {
            ent1_td = 'Folga'; sai1_td = ''; ent2_td = ''; sai2_td = '';
        } else if (status === 'Atestado Médico' && !e1) {
            ent1_td = 'Atestado Médico'; sai1_td = ''; ent2_td = 'Atestado Médico'; sai2_td = '';
        } else if (status === 'Justificado' && !e1) {
            ent1_td = 'Justificado'; sai1_td = ''; ent2_td = ''; sai2_td = '';
        } else if (status === 'Falta' && !e1) {
            previsto = '';
            ent1_td = 'Falta'; sai1_td = 'Falta'; ent2_td = 'Falta'; sai2_td = 'Falta';
        } else {
            ent1_td = e1; sai1_td = s1; ent2_td = e2; sai2_td = s2;
            if (status.startsWith('Feriado')) previsto = 'FERIADO';
        }

        rowsHtml += `
        <tr>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${diaNum} - ${diaSemanaStr}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;word-break:break-all;">${previsto}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${ent1_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${sai1_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${ent2_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${sai2_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${normais}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${noturn}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;text-align:center;">${status === 'Falta' ? '1' : ''}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${fmtMin(faltaAtrasoMin)}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extra60}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extra100}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extraDiurna}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extraNoturna}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;color:#111;font-size:6.5px;word-break:break-word;white-space:normal;">${obsText}</td>
        </tr>`;
    });

    const dataAdmissao = c.data_admissao ? c.data_admissao.split('-').reverse().join('/') : '';
    const cpfFmt = safe(c.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    const tzOpts = { timeZone: 'America/Sao_Paulo' };
    const dataEmissao = new Date().toLocaleDateString('pt-BR', tzOpts) + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tzOpts });
    const ultimoDia = new Date(ano, mes, 0).getDate();
    
    const logoBlock = logoB64 ? `<img src="${logoB64}" style="max-height: 35px;" />` : `<div style="background:#1e3a5f;padding:5px;"><span style="color:#fff;font-size:12px;font-weight:900;">AMERICA RENTAL</span></div>`;

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Cartao de Ponto</title></head>
    <body style="margin:0;padding:0;">
    <div style="font-family: Arial, sans-serif; font-size: 8px; color: #111; page-break-inside: avoid; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
            <tr>
                <td style="width: 30%; vertical-align: top;">
                    ${logoBlock}
                </td>
                <td style="width: 40%; vertical-align: top; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold; line-height: 1;">Cartão</div>
                    <div style="font-size: 20px; font-weight: normal; color: #4b4b4b; line-height: 1;">de Ponto</div>
                    <div style="font-size: 10px; font-weight: bold; color: #e30613; margin-top: 5px;">DE 01/${mes}/${ano} ATÉ ${ultimoDia}/${mes}/${ano}</div>
                </td>
                <td style="width: 30%; vertical-align: top; text-align: right;">
                    <span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: normal; color: #4b4b4b; letter-spacing: -0.5px;">Control </span><span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #e30613;">iD</span><br/>
                    <div style="font-size: 8px; color: #e30613; margin-top: 4px;">Página 1 de 1</div>
                    <div style="font-size: 7px; color: #666; margin-top: 2px;">Emitido em ${dataEmissao}</div>
                </td>
            </tr>
        </table>
        
        <div style="border-top: 1px solid #999; margin-bottom: 5px;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 5px;">
            <tr>
                <td colspan="2" style="padding: 2px 0;"><strong>NOME DA EMPRESA:</strong> AMERICA RENTAL EQUIPAMENTOS LTDA</td>
            </tr>
            <tr>
                <td style="padding: 2px 0; width: 50%;"><strong>CNPJ DA EMPRESA:</strong> 03434448000101</td>
                <td style="padding: 2px 0; width: 50%;"><strong>INSCRIÇÃO ESTADUAL DA EMPRESA:</strong> 336.715.410.116</td>
            </tr>
            <tr>
                <td style="padding: 2px 0;"><strong>NOME DO FUNCIONÁRIO:</strong> ${c.nome_completo}</td>
                <td style="padding: 2px 0;"><strong>CPF DO FUNCIONÁRIO:</strong> ${cpfFmt}</td>
            </tr>
            <tr>
                <td style="padding: 2px 0;"><strong>PIS DO FUNCIONÁRIO:</strong> ${safe(c.pis)}</td>
                <td style="padding: 2px 0;"><strong>DATA DE ADMISSÃO DO FUNCIONÁRIO:</strong> ${dataAdmissao}</td>
            </tr>
            <tr>
                <td style="padding: 2px 0;"><strong>NOME DO CARGO:</strong> ${safe(c.cargo)}</td>
                <td style="padding: 2px 0;"><strong>NÚMERO DE MATRÍCULA:</strong> ${numMatricula}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 2px 0;"><strong>NOME DO DEPARTAMENTO:</strong> ${safe(c.departamento)}</td>
            </tr>
        </table>
        
        <div style="border-top: 1px solid #999; margin-bottom: 5px;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 7px; text-align: left; table-layout: fixed;"><colgroup><col style="width:10%"><col style="width:12%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:6%"><col style="width:5%"><col style="width:4%"><col style="width:5%"><col style="width:4%"><col style="width:4%"><col style="width:5%"><col style="width:5%"><col style="width:24%"></colgroup>
            <thead>
                <tr style="border-bottom: 1px solid #ccc; font-weight: bold; color: #475569;">
                    <th style="padding: 2px 1px; word-break:break-word;">DIA</th>
                    <th style="padding: 2px 1px; word-break:break-word;">PREVISTO</th>
                    <th style="padding: 2px 1px; word-break:break-word;">ENT. 1</th>
                    <th style="padding: 2px 1px; word-break:break-word;">SAÍ. 1</th>
                    <th style="padding: 2px 1px; word-break:break-word;">ENT. 2</th>
                    <th style="padding: 2px 1px; word-break:break-word;">SAÍ. 2</th>
                    <th style="padding: 2px 1px; word-break:break-word;">TOTAL NORMAIS</th>
                    <th style="padding: 2px 1px; word-break:break-word;">TOTAL NOTURNO</th>
                    <th style="padding: 2px 1px; word-break:break-word;">DIA FALTA</th>
                    <th style="padding: 2px 1px; word-break:break-word;">FALTA E ATRASO</th>
                    <th style="padding: 2px 1px; word-break:break-word;">EXTRA 60%</th>
                    <th style="padding: 2px 1px; word-break:break-word;">EXTRA 100%</th>
                    <th style="padding: 2px 1px; word-break:break-word;">EXTRA DIURNA</th>
                    <th style="padding: 2px 1px; word-break:break-word;">EXTRA NOTURNA</th>
                    <th style="padding: 2px 1px; word-break:break-word;">OBSERVAÇÕES</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
            <tfoot>
                <tr style="font-weight: bold; border-top: 1px solid #999; background: #f8fafc;">
                    <td colspan="6" style="padding: 3px 1px;">TOTAIS</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalNormais)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalNoturno)}</td>
                    <td style="padding: 3px 1px;"></td>
                    <td style="padding: 3px 1px;">${fmtMin(totalFaltaAtraso)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtra60)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtra100)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtraDiurna)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtraNoturna)}</td>
                    <td style="padding: 3px 1px;"></td>
                </tr>
            </tfoot>
        </table>
        
        ${(() => {
            if (!horarioContratualInfo) return '';
            const periodos = horarioContratualInfo.horario.split(/[\r\n]+/).filter(p => p.trim());
            let headerCols = '';
            let dataCols = '';
            periodos.forEach((p, i) => {
                const parts = p.trim().split('-');
                const ent = parts[0] ? parts[0].trim() : '';
                const sai = parts[1] ? parts[1].trim() : '';
                headerCols += `<th style="padding:2px 8px;border:1px solid #ccc;background:#f1f5f9;">ENT</th><th style="padding:2px 8px;border:1px solid #ccc;background:#f1f5f9;">SAI</th>`;
                dataCols   += `<td style="padding:3px 8px;border:1px solid #ccc;">${ent}</td><td style="padding:3px 8px;border:1px solid #ccc;">${sai}</td>`;
            });
            return `
            <div style="margin-top:20px;">
                <div style="font-size:11px;font-weight:bold;margin-bottom:6px;">Horários Contratuais do Empregado</div>
                <table style="border-collapse:collapse;font-size:8px;">
                    <thead>
                        <tr>
                            <th style="padding:2px 8px;border:1px solid #ccc;background:#f1f5f9;">CÓDIGO DO HORÁRIO (CH)</th>
                            ${headerCols}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding:3px 8px;border:1px solid #ccc;">${horarioContratualInfo.codigo}</td>
                            ${dataCols}
                        </tr>
                    </tbody>
                </table>
                <div style="margin-top:8px;font-size:7px;color:#64748b;">(I)=Incluído, (P)=Pré-assinalado, (D)=Desconsiderado</div>
            </div>`;
        })()}

    </div></body></html>`;

}

async function mergePdfPonto(originalPdfBuffer, colab, apuracaoDiaria, mes, ano, mesNome) {
    if (!apuracaoDiaria || apuracaoDiaria.length === 0) return originalPdfBuffer;
    
    try {
        const html = buildCartaoPontoHtml(colab, apuracaoDiaria, mes, ano, mesNome);
        const generatedPdfs = await htmlPdf.generatePdfs([{ content: html }], { format: 'A4', margin: { top: '0', bottom: '0', left: '0', right: '0' }, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        
        const mergedPdf = await PDFDocument.create();
        
        const pontoDoc = await PDFDocument.load(generatedPdfs[0].buffer);
        const originalDoc = await PDFDocument.load(originalPdfBuffer);
        
        const copiedPontoPages = await mergedPdf.copyPages(pontoDoc, pontoDoc.getPageIndices());
        copiedPontoPages.forEach(p => mergedPdf.addPage(p));
        
        const copiedOriginalPages = await mergedPdf.copyPages(originalDoc, originalDoc.getPageIndices());
        copiedOriginalPages.forEach(p => mergedPdf.addPage(p));
        
        const mergedBytes = await mergedPdf.save();
        return Buffer.from(mergedBytes);
    } catch(e) {
        console.error('[CARTAO PONTO GENERATOR] Erro ao dar merge do ponto:', e);
        return originalPdfBuffer; // Em caso de erro do Ponto, não para o fluxo!
    }
}

module.exports = { mergePdfPonto };
