/**
 * ARENA VOICE — VOTO POPULAR
 * Utilitários Oficiais de Exportação de Relatórios (Etapa 6)
 *
 * Suporte a:
 * - CSV (com BOM UTF-8 e separador ';' para compatibilidade direta com Excel BR)
 * - Excel (.xls / SpreadsheetML estruturado com estilos e tipagem)
 * - PDF (Relatório executivo oficial para impressão e geração em PDF via browser print)
 *
 * Segurança:
 * - Não exporta identificadores anônimos (UIDs) ou dados sensíveis.
 */

import { ProjectScoringResult } from './scoring';

/**
 * Dispara o download de um arquivo no navegador
 */
function triggerDownload(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Exportação em CSV com UTF-8 BOM e delimitador ';'
 */
export function exportToCSV(
  results: ProjectScoringResult[],
  eventName: string = 'Arena Voice 2026'
): void {
  const bom = '\uFEFF';
  const headers = [
    'Posição',
    'Projeto',
    'Total de Votos',
    'Média Inovação',
    'Média Impacto',
    'Média Desenvolvimento',
    'Média Geral',
    '% do Voto Popular',
    'Pontos Voto Popular (máx 20)',
  ];

  const rows = results.map((r) => {
    const posicao = r.rank !== null ? `${r.rank}º Lugar${r.tie ? ' (Empate)' : ''}` : 'Sem classificação';
    return [
      `"${posicao}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      r.totalVotes,
      `"${r.formattedInnovation}"`,
      `"${r.formattedImpact}"`,
      `"${r.formattedDevelopment}"`,
      `"${r.formattedGeneral}"`,
      `"${r.formattedPercentage}"`,
      `"${r.formattedPoints}"`,
    ].join(';');
  });

  const metadata = [
    `"ARENA VOICE — VOTO POPULAR — RELATÓRIO OFICIAL"`,
    `"Evento: ${eventName}"`,
    `"Data de Emissão: ${new Date().toLocaleString('pt-BR')}"`,
    `"Regra: Voto Popular equivale a 20% da nota final (máximo 20 pontos)"`,
    '',
  ].join('\r\n');

  const csvContent = bom + metadata + headers.join(';') + '\r\n' + rows.join('\r\n');
  const filename = `arena-voice-resultados-${new Date().toISOString().slice(0, 10)}.csv`;

  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * 2. Exportação em Excel (SpreadsheetML XML compatível com Microsoft Excel e Google Sheets)
 */
export function exportToExcel(
  results: ProjectScoringResult[],
  eventName: string = 'Arena Voice 2026'
): void {
  const sanitize = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const rowsXml = results
    .map((r) => {
      const posicao = r.rank !== null ? `${r.rank}º` : '-';
      return `
      <Row>
        <Cell ss:StyleID="CenterText"><Data ss:Type="String">${posicao}</Data></Cell>
        <Cell ss:StyleID="BoldText"><Data ss:Type="String">${sanitize(r.name)}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.totalVotes}</Data></Cell>
        <Cell ss:StyleID="Decimal"><Data ss:Type="${r.hasEvaluations ? 'Number' : 'String'}">${r.hasEvaluations ? r.rawInnovation?.toFixed(2) : 'Sem avaliações'}</Data></Cell>
        <Cell ss:StyleID="Decimal"><Data ss:Type="${r.hasEvaluations ? 'Number' : 'String'}">${r.hasEvaluations ? r.rawImpact?.toFixed(2) : 'Sem avaliações'}</Data></Cell>
        <Cell ss:StyleID="Decimal"><Data ss:Type="${r.hasEvaluations ? 'Number' : 'String'}">${r.hasEvaluations ? r.rawDevelopment?.toFixed(2) : 'Sem avaliações'}</Data></Cell>
        <Cell ss:StyleID="GeneralAverage"><Data ss:Type="${r.hasEvaluations ? 'Number' : 'String'}">${r.hasEvaluations ? r.rawGeneral?.toFixed(2) : 'Sem avaliações'}</Data></Cell>
        <Cell ss:StyleID="Percent"><Data ss:Type="${r.hasEvaluations ? 'Number' : 'String'}">${r.hasEvaluations ? (r.rawPercentage! / 100).toFixed(4) : 'Sem avaliações'}</Data></Cell>
        <Cell ss:StyleID="PointsFinal"><Data ss:Type="${r.hasEvaluations ? 'Number' : 'String'}">${r.hasEvaluations ? r.rawPoints?.toFixed(2) : 'Sem avaliações'}</Data></Cell>
      </Row>`;
    })
    .join('');

  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D4AF37"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0B1526" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Color="#D4AF37" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#555555" ss:Italic="1"/>
  </Style>
  <Style ss:ID="CenterText">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="BoldText">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Number">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="Decimal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0.0"/>
  </Style>
  <Style ss:ID="GeneralAverage">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#F0F4F8" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="0.0"/>
  </Style>
  <Style ss:ID="Percent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="PointsFinal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Color="#B8860B" ss:Bold="1"/>
   <Interior ss:Color="#FFFBE6" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="0.0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Voto Popular - Resultados">
  <Table ss:ExpandedColumnCount="9" x:FullColumns="1" x:FullRows="1">
   <Column ss:Width="60"/>
   <Column ss:Width="260"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">ARENA VOICE — VOTO POPULAR • RESULTADOS OFICIAIS</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="8" ss:StyleID="Subtitle"><Data ss:Type="String">Evento: ${sanitize(eventName)} | Emissão: ${new Date().toLocaleString('pt-BR')} | Máximo de 20 pontos (Pesos iguais nos 3 critérios)</Data></Cell>
   </Row>
   <Row ss:Height="10"/>
   <Row ss:Height="24" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Posição</Data></Cell>
    <Cell><Data ss:Type="String">Projeto</Data></Cell>
    <Cell><Data ss:Type="String">Votos Válidos</Data></Cell>
    <Cell><Data ss:Type="String">Inovação (1-5)</Data></Cell>
    <Cell><Data ss:Type="String">Impacto (1-5)</Data></Cell>
    <Cell><Data ss:Type="String">Salto Desenv. (1-5)</Data></Cell>
    <Cell><Data ss:Type="String">Média Geral</Data></Cell>
    <Cell><Data ss:Type="String">% dos 20%</Data></Cell>
    <Cell><Data ss:Type="String">Pontuação (20 pts)</Data></Cell>
   </Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const filename = `arena-voice-resultados-${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(excelXml, filename, 'application/vnd.ms-excel');
}

/**
 * 3. Exportação em PDF via janela de impressão formatada em alta definição
 */
export function exportToPDF(
  results: ProjectScoringResult[],
  eventName: string = 'Arena Voice 2026'
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const rowsHtml = results
    .map((r) => {
      const badgeColor =
        r.rank === 1
          ? 'background: #FFD700; color: #000; font-weight: bold;'
          : r.rank === 2
          ? 'background: #C0C0C0; color: #000; font-weight: bold;'
          : r.rank === 3
          ? 'background: #CD7F32; color: #fff; font-weight: bold;'
          : 'background: #333; color: #eee;';

      const rankText = r.rank !== null ? `${r.rank}º` : '-';

      return `
      <tr>
        <td style="text-align: center;"><span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; ${badgeColor}">${rankText}</span></td>
        <td style="font-weight: 600;">${r.name}</td>
        <td style="text-align: center;">${r.totalVotes}</td>
        <td style="text-align: center;">${r.formattedInnovation}</td>
        <td style="text-align: center;">${r.formattedImpact}</td>
        <td style="text-align: center;">${r.formattedDevelopment}</td>
        <td style="text-align: center; font-weight: bold; background: #fafafa;">${r.formattedGeneral}</td>
        <td style="text-align: center;">${r.formattedPercentage}</td>
        <td style="text-align: center; font-weight: bold; font-size: 13px; color: #b8860b; background: #fffbe6;">${r.formattedPoints}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório Oficial — Arena Voice Voto Popular</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      padding: 32px;
      margin: 0;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #D4AF37;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
      color: #081422;
    }
    .subtitle {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    .badge-event {
      display: inline-block;
      background: #081422;
      color: #D4AF37;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 16px;
    }
    th {
      background: #081422;
      color: #fff;
      text-transform: uppercase;
      font-size: 10px;
      padding: 10px 8px;
      border: 1px solid #081422;
    }
    td {
      padding: 9px 8px;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) td {
      background-color: #fcfcfc;
    }
    .rules-box {
      margin-top: 24px;
      padding: 14px 18px;
      background: #f8f9fa;
      border-left: 4px solid #F20524;
      font-size: 11px;
      color: #444;
      line-height: 1.5;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #888;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">ARENA VOICE — VOTO POPULAR</h1>
      <p class="subtitle">Consolidação Oficial de Resultados e Classificação</p>
    </div>
    <div class="badge-event">
      ${eventName}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px;">Rank</th>
        <th>Projeto</th>
        <th style="width: 70px;">Votos</th>
        <th style="width: 80px;">Inovação</th>
        <th style="width: 80px;">Impacto</th>
        <th style="width: 80px;">Salto Desenv.</th>
        <th style="width: 80px;">Média Geral</th>
        <th style="width: 80px;">% Voto Pop.</th>
        <th style="width: 100px;">Pontos (20 pts)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="rules-box">
    <strong>Critérios e Diretrizes Oficiais:</strong><br/>
    • O Voto Popular equivale estritamente a 20% da avaliação geral da Arena Voice (máximo de 20 pontos).<br/>
    • Os 3 critérios avaliados possuem pesos estritamente iguais: <code>Média Geral = (Inovação + Impacto + Desenvolvimento) / 3</code>.<br/>
    • <code>Pontuação = (Média Geral / 5) × 20</code> | <code>Percentual = (Média Geral / 5) × 100%</code>.<br/>
    • Ordenação realizada com precisão matemática completa, respeitando empates reais na classificação.
  </div>

  <div class="footer">
    <span>Emitido em: ${new Date().toLocaleString('pt-BR')}</span>
    <span>Arena Voice • Sistema de Votação Popular em Tempo Real</span>
    <span>Documento de Auditoria Interna</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

