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
    
    apuracaoDiaria.forEach(d => {
        let diaStr = String(d.date || d.dateTimeStr || '').substring(0,10);
        let diaNum = diaStr;
        let diaSemanaStr = '';
        if (diaStr.includes('-')) {
            const p = diaStr.split('-');
            if (p.length === 3) {
                diaNum = `${p[2]}/${p[1]}/${p[0]}`;
                const dt = new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`);
                if (!isNaN(dt.getTime())) diaSemanaStr = diasSemana[dt.getDay()];
            }
        }
        
        let status = '';
        if (d.faltaDiaInteiro) status = 'Falta';
        else if (d.isHoliday) status = 'Feriado: ' + (d.holidayName || '');
        else if (d.dsrConsideradoMinutos > 0 || (d.diasTrabalhados === 0 && d.horasUteis === 0)) status = 'Folga';
        else if (d.idJustification) status = 'Justificado';
        
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
        
        // ── TOTAL NORMAIS ────────────────────────────────────────────────────
        const normaisMin = d.totalHorasTrabalhadas || 0;
        const normais = fmtMin(normaisMin);

        // ── TOTAL NOTURNO: campo direto da API RHID ──────────────────────────
        const noturnMin = d.horasTotalNoturno || d.horasNoturnasNaoExtra || 0;
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

        let previsto = c.escala || '08:00-12:00 13:00-17:48';
        if (status) { previsto = status === 'Falta' ? '' : (status.startsWith('Feriado') ? 'FERIADO' : ''); }

        let ent1_td = status && !e1 ? status : e1;
        let sai1_td = status && !e1 ? (status === 'Falta' ? 'Falta' : '') : s1;

        rowsHtml += `
        <tr>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${diaNum} - ${diaSemanaStr}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9; white-space:nowrap;">${previsto}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${ent1_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${sai1_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${status && !e1 ? (status === 'Falta' ? 'Falta' : '') : e2}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${status && !e1 ? (status === 'Falta' ? 'Falta' : '') : s2}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${e3}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${s3}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${normais}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${noturn}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${status === 'Falta' ? '1' : ''}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${fmtMin(faltaAtrasoMin)}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;"></td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${extra60}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${extra100}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${extraDiurna}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;">${extraNoturna}</td>
        </tr>`;
    });

    const dataAdmissao = c.data_admissao ? c.data_admissao.split('-').reverse().join('/') : '';
    const cpfFmt = safe(c.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    const dataEmissao = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
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
        
        <table style="width: 100%; border-collapse: collapse; font-size: 7px; text-align: left;">
            <thead>
                <tr style="border-bottom: 1px solid #ccc; font-weight: bold; color: #475569;">
                    <th style="padding: 2px 1px;">DIA</th>
                    <th style="padding: 2px 1px; min-width:90px; white-space:nowrap;">PREVISTO</th>
                    <th style="padding: 2px 1px;">ENT. 1</th>
                    <th style="padding: 2px 1px;">SAÍ. 1</th>
                    <th style="padding: 2px 1px;">ENT. 2</th>
                    <th style="padding: 2px 1px;">SAÍ. 2</th>
                    <th style="padding: 2px 1px;">ENT. 3</th>
                    <th style="padding: 2px 1px;">SAÍ. 3</th>
                    <th style="padding: 2px 1px;">TOTAL NORMAIS</th>
                    <th style="padding: 2px 1px;">TOTAL NOTURNO</th>
                    <th style="padding: 2px 1px;">DIA FALTA</th>
                    <th style="padding: 2px 1px;">FALTA E ATRASO</th>
                    <th style="padding: 2px 1px;">ABONO</th>
                    <th style="padding: 2px 1px;">EXTRA 60%</th>
                    <th style="padding: 2px 1px;">EXTRA 100%</th>
                    <th style="padding: 2px 1px;">EXTRA DIURNA</th>
                    <th style="padding: 2px 1px;">EXTRA NOTURNA</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
            <tfoot>
                <tr style="font-weight: bold; border-top: 1px solid #999; background: #f8fafc;">
                    <td colspan="8" style="padding: 3px 1px;">TOTAIS</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalNormais)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalNoturno)}</td>
                    <td style="padding: 3px 1px;"></td>
                    <td style="padding: 3px 1px;">${fmtMin(totalFaltaAtraso)}</td>
                    <td style="padding: 3px 1px;"></td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtra60)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtra100)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtraDiurna)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtraNoturna)}</td>
                </tr>
            </tfoot>
        </table>
        
        <div style="margin-top: 15px; font-size: 7px; color: #64748b;">
            (I)=Incluído, (P)=Pré-assinalado, (M)=Coletor REP-P Mobile/Web, (C)=Coletor REP-P (iDFace/iDFlex)
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 35px; font-size: 8px; text-align: center;">
            <tr>
                <td style="width: 45%; border-top: 1px solid #94a3b8; padding-top: 4px; color: #475569;">${c.nome_completo}</td>
                <td style="width: 10%;"></td>
                <td style="width: 45%; border-top: 1px solid #94a3b8; padding-top: 4px; color: #475569;">AMERICA RENTAL EQUIPAMENTOS LTDA</td>
            </tr>
        </table>
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
