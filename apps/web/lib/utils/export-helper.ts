import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

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
  const dateRow = worksheet.addRow([`Fecha de generación: ${new Date().toLocaleString()}`]);
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
  const doc = jsPDF();
  
  // Header Corporativo
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('TENAXIS', 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(title, 14, 30);
  
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 36);
  
  autoTable(doc, {
    head: [headers],
    body: data.map(row => row.map(cell => cell === undefined ? null : cell)),
    startY: 45,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [24, 24, 27], // zinc-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

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
          border: {
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
          children: [new TextRun({ text: `Fecha: ${new Date().toLocaleString()}`, italic: true, size: 20, color: "A1A1AA" })],
          spacing: { after: 400 },
        }),
        table,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
