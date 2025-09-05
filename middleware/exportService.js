const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// === UTILS ===
function getMonth(date) {
  return new Date(date).getMonth(); // 0 = Janvier
}

function getQuarter(month) {
  return Math.floor(month / 3) + 1; // 1 à 4
}

function safeString(val) {
  if (val === undefined || val === null) return '';
  return val.toString();
}

// Fonction pour dessiner l'en-tête du tableau détaillé
function drawTableHeader(doc, startX, startY, colWidths) {
  doc.font('Helvetica-Bold').fontSize(12);
  const headers = [
    'Date',
    'Article',
    'Réf',
    'Qte',
    'Revenu',
    'Internet',
    'Magasin',
  ];
  let x = startX;
  headers.forEach((h, i) => {
    doc.rect(x, startY, colWidths[i], 20).stroke();
    doc.text(h, x + 2, startY + 5, {
      width: colWidths[i] - 4,
      align: 'center',
    });
    x += colWidths[i];
  });
  return startY + 20; // nouvelle position Y pour la première ligne
}

exports.exportToPDF = async (orders, annee, mois = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
      });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // === TITRE ===
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(
          `Rapport complet des ventes ${mois ? 'mois n° :' + mois : ''}${
            annee ? ' - ' + annee : ' (toutes années)'
          }`,
          { align: 'center' }
        );
      doc.moveDown();

      // === Totaux ===
      let totalAnnuel = 0;
      let qteTotalAnnuel = 0;
      let totalMagasin = 0;
      let totalInternet = 0;
      const totalParMois = Array(12).fill(0);
      let qteParMois = Array(12).fill(0);
      const totalParTrimestre = Array(4).fill(0);

      // === Table détaillée ===
      const colWidths = [90, 280, 80, 50, 70, 70, 70]; // Date, Article, Réf, Qte, Revenu, Internet, Magasin
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      let startX =
        doc.page.margins.left +
        (pageWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
      let startY = doc.y;

      let y = drawTableHeader(doc, startX, startY, colWidths);

      orders.forEach((order) => {
        order.articles.forEach((a) => {
          // Nouvelle page si nécessaire
          if (y + 20 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
            startX =
              doc.page.margins.left +
              (pageWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
            y = drawTableHeader(doc, startX, doc.page.margins.top, colWidths);
          }

          const revenu = a.quantite * a.prixUnitaire;
          totalAnnuel += revenu;
          qteTotalAnnuel += a.quantite;
          if (order.internet) totalInternet += revenu;
          else totalMagasin += revenu;

          const mois = getMonth(order.date);
          totalParMois[mois] += revenu;
          qteParMois[mois] += a.quantite;

          const trimestre = getQuarter(mois) - 1;
          totalParTrimestre[trimestre] += revenu;

          const row = [
            new Date(order.date).toLocaleDateString(),
            `${a.categorie || ''} ${a.nom || ''}`,
            a.reference || '',
            a.quantite || 0,
            revenu.toFixed(2),
            order.internet ? 'X' : '',
            !order.internet ? 'X' : '',
          ];

          let x = startX;
          row.forEach((val, i) => {
            doc.rect(x, y, colWidths[i], 20).stroke();
            doc.font('Helvetica').fontSize(10);
            doc.text(safeString(val), x + 2, y + 5, {
              width: colWidths[i] - 4,
              align: 'center',
              ellipsis: true,
            });
            x += colWidths[i];
          });

          y += 20;
        });
      });

      doc.addPage();

      // === Quantités et revenus annuels ===
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(
          `Quantités et revenus annuels${
            annee ? ' - ' + annee : ' (toutes années)'
          }`,
          { align: 'center' }
        );

      doc.moveDown();

      const tableCols = [200, 100];
      startX =
        doc.page.margins.left +
        (pageWidth - tableCols.reduce((a, b) => a + b, 0)) / 2;
      startY = doc.y;
      const rows = [
        ['Qte total des ventes', qteTotalAnnuel],
        ['Revenu magasin', totalMagasin.toFixed(2)],
        ['Revenu internet', totalInternet.toFixed(2)],
        ['Revenu BRUT', (totalMagasin + totalInternet).toFixed(2)],
        [
          'Revenu NET',
          (totalMagasin + totalInternet - totalAnnuel * 0.128).toFixed(2),
        ],
      ];

      rows.forEach((r, idx) => {
        let x = startX;
        doc.font('Helvetica').fontSize(10);
        doc.rect(x, startY + idx * 20, tableCols[0], 20).stroke();
        doc.text(r[0], x + 2, startY + idx * 20 + 5, {
          width: tableCols[0] - 4,
        });
        x += tableCols[0];
        doc.rect(x, startY + idx * 20, tableCols[1], 20).stroke();
        doc.text(r[1].toString(), x + 2, startY + idx * 20 + 5, {
          width: tableCols[1] - 4,
          align: 'center',
        });
      });

      doc.addPage();

      // === Trimestre avec progression ===
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(
          `Trimestre - Totaux et progression${
            annee ? ' - ' + annee : ' (toutes années)'
          }`,
          { align: 'center' }
        );
      doc.moveDown();

      const headersTrimestre = [
        'Trimestre',
        'Total €',
        'URSSAF',
        'Progression %',
      ];
      const colTrimestre = [100, 100, 100, 100];
      startX =
        doc.page.margins.left +
        (pageWidth - colTrimestre.reduce((a, b) => a + b, 0)) / 2;
      startY = doc.y;

      // header trimestre
      let x = startX;
      headersTrimestre.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(10);
        doc.rect(x, startY, colTrimestre[i], 20).stroke();
        doc.text(h, x + 2, startY + 5, {
          width: colTrimestre[i] - 4,
          align: 'center',
        });
        x += colTrimestre[i];
      });

      y = startY + 20;
      for (let i = 0; i < 4; i++) {
        const total = totalParTrimestre[i];
        const ursaff = total * 0.128;
        const prog =
          i > 0
            ? ((total - totalParTrimestre[i - 1]) / totalParTrimestre[i - 1]) *
              100
            : 0;

        const row = [
          `Trimestre ${i + 1}`,
          total.toFixed(2),
          ursaff.toFixed(2),
          prog.toFixed(2) + ' %',
        ];
        x = startX;
        row.forEach((val, j) => {
          doc.font('Helvetica').fontSize(10);
          doc.rect(x, y, colTrimestre[j], 20).stroke();
          doc.text(safeString(val), x + 2, y + 5, {
            width: colTrimestre[j] - 4,
            align: 'center',
          });
          x += colTrimestre[j];
        });
        y += 20;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// === EXCEL ===
exports.exportToExcel = async (orders, annee, mois = null) => {
  const workbook = new ExcelJS.Workbook();

  // --- Feuille 1 : Ventes détaillées ---
  const sheet = workbook.addWorksheet(
    `Ventes détaillées ${mois ? 'mois n° ' + mois : ''}${
      annee ? ' - ' + annee : ' (toutes années)'
    }`
  );

  sheet.addRow([
    'Date',
    'Article',
    'Référence',
    'Quantité',
    'Revenu',
    'Internet',
    'Magasin',
  ]);

  let totalParMois = Array(12).fill(0);
  let qteParMois = Array(12).fill(0);
  let totalParTrimestre = Array(4).fill(0);
  let totalAnnuel = 0;
  let qteTotalAnnuel = 0;
  let totalMagasin = 0;
  let totalInternet = 0;

  orders.forEach((order) => {
    order.articles.forEach((a) => {
      const revenu = a.quantite * a.prixUnitaire;
      totalAnnuel += revenu;
      qteTotalAnnuel += a.quantite;

      if (order.internet) totalInternet += revenu;
      else totalMagasin += revenu;

      const mois = getMonth(order.date);
      totalParMois[mois] += revenu;
      qteParMois[mois] += a.quantite;

      const trimestre = getQuarter(mois) - 1;
      totalParTrimestre[trimestre] += revenu;

      sheet.addRow([
        new Date(order.date).toLocaleDateString(),
        `${a.categorie || ''} ${a.nom || ''}`,
        a.reference || '',
        a.quantite || 0,
        revenu.toFixed(2),
        order.internet ? 'X' : '',
        !order.internet ? 'X' : '',
      ]);
    });
  });

  // Ligne vide + total annuel
  sheet.addRow([]);
  sheet.addRow(['', '', '', 'Total annuel', totalAnnuel.toFixed(2), '', '']);

  // Mise en forme
  sheet.columns.forEach((col) => (col.width = 20));
  sheet.getRow(1).font = { bold: true };

  // --- Feuille 2 : Quantités et revenus annuels ---
  const sheetAnnuel = workbook.addWorksheet(
    `Annuel${annee ? ' ' + annee : ''}`
  );
  sheetAnnuel.addRow([
    `Quantités et revenus annuels${annee ? ' - ' + annee : ''}`,
  ]);
  sheetAnnuel.addRow([]);
  sheetAnnuel.addRow(['Qte total des ventes', qteTotalAnnuel]);
  sheetAnnuel.addRow(['Revenu magasin', totalMagasin.toFixed(2)]);
  sheetAnnuel.addRow(['Revenu internet', totalInternet.toFixed(2)]);
  sheetAnnuel.addRow([
    'Revenu BRUT',
    (totalMagasin + totalInternet).toFixed(2),
  ]);
  sheetAnnuel.addRow([
    'Revenu NET',
    (totalMagasin + totalInternet - totalAnnuel * 0.128).toFixed(2),
  ]);

  sheetAnnuel.columns.forEach((col) => (col.width = 30));
  sheetAnnuel.getRow(1).font = { bold: true };

  // --- Feuille 3 : Sous-totaux par mois ---
  const sheetMois = workbook.addWorksheet(`Mois${annee ? ' ' + annee : ''}`);
  sheetMois.addRow(['Mois', 'Quantité vendue', 'Revenu']);
  const moisNoms = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  for (let i = 0; i < 12; i++) {
    sheetMois.addRow([moisNoms[i], qteParMois[i], totalParMois[i].toFixed(2)]);
  }
  sheetMois.columns.forEach((col) => (col.width = 25));
  sheetMois.getRow(1).font = { bold: true };

  // --- Feuille 4 : Trimestres ---
  const sheetTrimestre = workbook.addWorksheet(
    `Trimestres${annee ? ' ' + annee : ''}`
  );
  sheetTrimestre.addRow([
    `Trimestre - Totaux et progression${annee ? ' - ' + annee : ''}`,
  ]);
  sheetTrimestre.addRow([]);
  sheetTrimestre.addRow([
    'Trimestre',
    'Total €',
    'URSSAF (12,8%)',
    'Progression %',
  ]);

  for (let i = 0; i < 4; i++) {
    const total = totalParTrimestre[i];
    const urssaf = total * 0.128;
    const prog =
      i > 0 && totalParTrimestre[i - 1] > 0
        ? ((total - totalParTrimestre[i - 1]) / totalParTrimestre[i - 1]) * 100
        : 0;

    sheetTrimestre.addRow([
      `Trimestre ${i + 1}`,
      total.toFixed(2),
      urssaf.toFixed(2),
      prog.toFixed(2) + ' %',
    ]);
  }

  sheetTrimestre.columns.forEach((col) => (col.width = 25));
  sheetTrimestre.getRow(3).font = { bold: true };

  return workbook.xlsx.writeBuffer();
};
