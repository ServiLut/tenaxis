import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { formatBogotaDateTime } from '../../utils/date-utils';

export interface ExportData {
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
  filename: string;
  title: string;
}

export const exportToExcel = async ({ headers, data, filename, title }: ExportData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Datos');

  // Title Row
  const titleRow = worksheet.addRow([title.toUpperCase()]);
  titleRow.font = { name: 'Arial Black', size: 16, color: { argb: 'FF18181B' } };
  worksheet.mergeCells(`A1:${String.fromCharCode(64 + headers.length)}1`);
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.height = 30;

  // Date Row
  const dateRow = worksheet.addRow([`Fecha de generación: ${formatBogotaDateTime(new Date())}`]);
  dateRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF71717A' } };
  worksheet.mergeCells(`A2:${String.fromCharCode(64 + headers.length)}2`);
  dateRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  worksheet.addRow([]); // Spacer

  // Header Row
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF18181B' },
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  headerRow.height = 25;

  // Data Rows
  data.forEach((rowData) => {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.font = { size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        right: { style: 'thin', color: { argb: 'FFE4E4E7' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, i) => {
    let maxLength = headers[i].length;
    data.forEach(row => {
      const cellValue = row[i];
      if (cellValue) {
        maxLength = Math.max(maxLength, cellValue.toString().length);
      }
    });
    column.width = maxLength < 12 ? 12 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToPDF = ({ headers, data, filename, title }: ExportData) => {
  const doc = new jsPDF();
  const brandColor: [number, number, number] = [1, 173, 251]; // #01ADFB
  const darkZinc: [number, number, number] = [24, 24, 27];
  const mutedZinc: [number, number, number] = [113, 113, 122];
  
  // --- HEADER DE MARCA ---
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, 210, 15, 'F'); // Barra superior delgada
  
  // Logo y Nombre
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
  doc.text('TENAXIS', 15, 35);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedZinc[0], mutedZinc[1], mutedZinc[2]);
  doc.text('SISTEMA INTEGRAL DE GESTIÓN OPERATIVA', 15, 40);

  // Etiqueta de Documento
  doc.setFillColor(244, 244, 245);
  doc.rect(140, 25, 55, 20, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text('CUENTA DE COBRO', 145, 33);
  doc.setFontSize(8);
  doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
  doc.text(`REF: ${Date.now().toString().slice(-8)}`, 145, 38);

  // --- BLOQUES DE INFORMACIÓN (Grid) ---
  doc.setDrawColor(228, 228, 231);
  doc.line(15, 50, 195, 50); // Línea divisoria superior

  // Título Principal
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
  
  const cleanTitle = title.split('\n')[0];
  doc.text(cleanTitle, 15, 62);

  // Información del Colaborador vs Datos de Pago
  const details = title.split('\n').slice(1).filter(line => line.trim() !== '');
  
  // Columna Izquierda: Identificación
  doc.setFontSize(8);
  doc.setTextColor(mutedZinc[0], mutedZinc[1], mutedZinc[2]);
  doc.text('INFORMACIÓN DEL PRESTADOR', 15, 72);
  doc.setFontSize(9);
  doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
  doc.setFont("helvetica", "bold");
  
  let leftY = 78;
  details.slice(0, 2).forEach(line => {
    doc.text(line.replace('|', '').trim(), 15, leftY);
    leftY += 5;
  });

  // Columna Derecha: Pago
  doc.setFontSize(8);
  doc.setTextColor(mutedZinc[0], mutedZinc[1], mutedZinc[2]);
  doc.text('DETALLES DE LIQUIDACIÓN', 110, 72);
  doc.setFontSize(9);
  doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
  
  let rightY = 78;
  details.slice(2).forEach(line => {
    doc.text(line.replace('|', '').trim(), 110, rightY);
    rightY += 5;
  });

  // --- TABLA DE ACTIVIDADES ---
  autoTable(doc, {
    head: [headers],
    body: data.map((row, _index) => {
      // Si es la última fila (totales), le damos un tratamiento especial
      return row.map(cell => cell === undefined ? null : cell);
    }),
    startY: 100,
    margin: { left: 15, right: 15 },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      font: "helvetica",
      lineColor: [244, 244, 245],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didParseCell: (data) => {
      // Estilo para la fila de TOTALES
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = brandColor;
        data.cell.styles.fontSize = 10;
      }
    },
    columnStyles: {
      [headers.length - 1]: { halign: 'right' }
    }
  });

  // --- SECCIÓN DE FIRMA Y LEGAL ---
  const finalY =         ((doc as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).lastAutoTable?.finalY ?? 0) + 25;
  
  doc.setFontSize(8);
  doc.setTextColor(mutedZinc[0], mutedZinc[1], mutedZinc[2]);
  doc.setFont("helvetica", "normal");
  const legalText = "Certifico que la información aquí consignada es veraz y corresponde a los servicios efectivamente prestados durante el periodo mencionado.";
  doc.text(legalText, 15, finalY);

  doc.line(15, finalY + 20, 80, finalY + 20); // Línea de firma
  doc.setFont("helvetica", "bold");
  doc.text("FIRMA DEL PRESTADOR", 15, finalY + 25);
  doc.setFont("helvetica", "normal");
  doc.text("C.C. ____________________", 15, finalY + 30);

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `Página ${i} de ${pageCount} | Documento Autenticado Tenaxis Cloud | Generado el ${formatBogotaDateTime(new Date())}`,
      15,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  doc.save(`${filename}.pdf`);
};

export const exportToWord = async ({ headers, data, filename, title }: ExportData) => {
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: h.toUpperCase(), bold: true, color: "FFFFFF", size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 }
          })],
          shading: { fill: "18181B" },
          verticalAlign: AlignmentType.CENTER
        })),
      }),
      ...data.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: String(cell || ''), size: 16 })],
            alignment: AlignmentType.LEFT,
            spacing: { before: 80, after: 80 }
          })],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E4E4E7" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E4E4E7" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E4E4E7" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E4E4E7" },
          }
        })),
      })),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
          size: { orientation: 'landscape' }
        }
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: "TENAXIS", bold: true, size: 48, color: "18181B" })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, color: "71717A" })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Fecha: ${formatBogotaDateTime(new Date())}`, italics: true, size: 20, color: "A1A1AA" })],
          spacing: { after: 400 },
        }),
        table,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
