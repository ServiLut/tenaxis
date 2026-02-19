import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export interface ExportData {
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
  filename: string;
  title: string;
}

export const exportToExcel = ({ headers, data, filename }: ExportData) => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  
  // Style could be limited with basic xlsx, but we can set column widths
  const max_width = headers.reduce((w, h, i) => {
    const col_data = data.map(row => String(row[i] || '').length);
    return Math.max(w, h.length, ...col_data);
  }, 10);
  
  worksheet['!cols'] = headers.map(() => ({ wch: max_width + 2 }));

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = ({ headers, data, filename, title }: ExportData) => {
  const doc = new jsPDF();
  
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
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })],
            alignment: AlignmentType.CENTER 
          })],
          shading: { fill: "18181B" }
        })),
      }),
      ...data.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: String(cell || '') })],
            alignment: AlignmentType.LEFT 
          })],
        })),
      })),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "TENAXIS",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: `Fecha de generación: ${new Date().toLocaleString()}`,
          spacing: { after: 400 },
        }),
        table,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
