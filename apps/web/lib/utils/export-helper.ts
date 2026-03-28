import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { formatBogotaDateTime } from '../../utils/date-utils';

export interface ExportData {
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
  filename: string;
  title: string;
}

export interface ExportDataset {
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
  title: string;
  sheetName?: string;
}

export interface MultiExportOptions {
  datasets: ExportDataset[];
  filename: string;
  mainTitle: string;
}

export const exportToExcel = async ({ headers, data, filename, title }: ExportData) => {
  await exportMultiToExcel({
    datasets: [{ headers, data, title, sheetName: 'Datos' }],
    filename,
    mainTitle: title
  });
};

export const exportMultiToExcel = async ({ datasets, filename, mainTitle: _mainTitle }: MultiExportOptions) => {
  const workbook = new ExcelJS.Workbook();

  for (const dataset of datasets) {
    const { headers, data, title, sheetName } = dataset;
    const worksheet = workbook.addWorksheet(sheetName || 'Datos');

    // Title Row
    const titleRow = worksheet.addRow([title.toUpperCase()]);
    titleRow.font = { name: 'Arial Black', size: 16, color: { argb: 'FF18181B' } };
    worksheet.mergeCells(`A1:${String.fromCharCode(64 + Math.max(headers.length, 1))}1`);
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 30;

    // Date Row
    const dateRow = worksheet.addRow([`Fecha de generación: ${formatBogotaDateTime(new Date())}`]);
    dateRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF71717A' } };
    worksheet.mergeCells(`A2:${String.fromCharCode(64 + Math.max(headers.length, 1))}2`);
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
      let maxLength = headers[i]?.length || 10;
      data.forEach(row => {
        const cellValue = row[i];
        if (cellValue) {
          maxLength = Math.max(maxLength, cellValue.toString().length);
        }
      });
      column.width = maxLength < 12 ? 12 : maxLength + 2;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToPDF = ({ headers, data, filename, title }: ExportData) => {
  exportMultiToPDF({
    datasets: [{ headers, data, title }],
    filename,
    mainTitle: title
  });
};

export const exportMultiToPDF = ({ datasets, filename, mainTitle: _mainTitle }: MultiExportOptions) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const brandColor: [number, number, number] = [1, 173, 251]; // #01ADFB
  const darkZinc: [number, number, number] = [24, 24, 27];
  const mutedZinc: [number, number, number] = [113, 113, 122];
  
  datasets.forEach((dataset, index) => {
    if (index > 0) doc.addPage();

    const { headers, data, title } = dataset;

    // --- HEADER DE MARCA ---
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, 297, 15, 'F'); // Barra superior delgada (Landscape A4 is 297mm wide)
    
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
    doc.rect(220, 25, 62, 20, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('REPORTE OPERATIVO', 225, 33);
    doc.setFontSize(8);
    doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
    doc.text(`GEN: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 225, 38);

    // Título Principal
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkZinc[0], darkZinc[1], darkZinc[2]);
    doc.text(title.toUpperCase(), 15, 60);

    // --- TABLA DE ACTIVIDADES ---
    autoTable(doc, {
      head: [headers],
      body: data.map((row) => row.map(cell => cell === undefined ? null : cell)),
      startY: 70,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        font: "helvetica",
        lineColor: [244, 244, 245],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 8,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      }
    });
  });

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
  await exportMultiToWord({
    datasets: [{ headers, data, title }],
    filename,
    mainTitle: title
  });
};

export const exportMultiToWord = async ({ datasets, filename, mainTitle: _mainTitle }: MultiExportOptions) => {
  const sections = datasets.map(dataset => {
    const { headers, data, title } = dataset;
    return {
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
        new Table({
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
        }),
      ],
    };
  });

  const doc = new Document({
    sections: sections as ConstructorParameters<typeof Document>[0]["sections"]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
