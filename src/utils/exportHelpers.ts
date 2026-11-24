/**
 * Utility functions for exporting CSV reports and formatted printing
 */

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        let str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  };

  const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n'); // UTF-8 BOM for Excel in Spanish
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printExecutiveReport(title: string, subtitle: string, sections: { title: string; rows: string[][] }[]) {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title} - Hecho en Aguascalientes</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; }
        .header { border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
        .badge { background: #d4f63d; color: #0f172a; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; }
        .section-title { font-size: 14px; font-weight: 800; margin-top: 25px; margin-bottom: 10px; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-weight: 700; color: #334155; }
        td { border: 1px solid #e2e8f0; padding: 8px 12px; color: #475569; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${title}</h1>
          <p class="subtitle">${subtitle}</p>
        </div>
        <div class="badge">OFICIAL HECHO EN AGUASCALIENTES</div>
      </div>

      ${sections
        .map(
          (sec) => `
        <div class="section-title">${sec.title}</div>
        <table>
          <thead>
            <tr>
              ${sec.rows[0]?.map((col) => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sec.rows
              .slice(1)
              .map((row) => `<tr>${row.map((col) => `<td>${col}</td>`).join('')}</tr>`)
              .join('')}
          </tbody>
        </table>
      `
        )
        .join('')}

      <div class="footer">
        Plataforma Logística B2B "Hecho en Aguascalientes" · Generado el ${new Date().toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 150);
  }
}
