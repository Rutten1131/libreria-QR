import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GenerarProformaParams {
  nombreLibreria: string;
  telefonoLibreria?: string;
  direccionLibreria?: string;
  pedidoId?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  itemsDisponibles: Array<{ nombre: string; cantidad: number }>;
  itemsFaltantes: Array<{ nombre: string }>;
  total: number;
}

export function descargarProformaDirectoPdf(params: GenerarProformaParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // #0f172a
  const slateColor: [number, number, number] = [100, 116, 139]; // #64748b

  // 1. Título y datos de la Papelería
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(params.nombreLibreria.toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.text('Proforma Oficial de Cotización de Útiles Escolares', 14, 23);
  if (params.telefonoLibreria) {
    doc.text(`WhatsApp: +${params.telefonoLibreria}`, 14, 28);
  }

  // 2. Metadatos de la cotización (Derecha)
  const pedidoCodigo = params.pedidoId ? `#${params.pedidoId.slice(-8).toUpperCase()}` : 'COTIZACION';
  const fechaHoy = new Date().toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(pedidoCodigo, 196, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.text(fechaHoy, 196, 23, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 32, 196, 32);

  // 3. Tarjeta de Datos del Cliente
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 14, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.text('CLIENTE / SOLICITANTE:', 18, 40);
  doc.text('WHATSAPP / CONTACTO:', 110, 40);

  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(params.clienteNombre || 'Cliente WhatsApp', 18, 45);
  doc.text(params.clienteTelefono || 'WhatsApp', 110, 45);

  // 4. Tabla de materiales disponibles (SIN precios unitarios ni subtotales)
  const tableRows = params.itemsDisponibles.map((it, idx) => [
    (idx + 1).toString(),
    it.nombre,
    it.cantidad.toString(),
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['#', 'Material / Útil Escolar', 'Cant.']],
    body: tableRows.length > 0 ? tableRows : [['-', 'Ninguno emparejado automáticamente', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 60;

  // 5. Sección de artículos NO disponibles en stock (si existen)
  if (params.itemsFaltantes.length > 0) {
    if (finalY > 230) {
      doc.addPage();
      finalY = 20;
    }

    const boxHeight = 8 + params.itemsFaltantes.length * 4.5;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(254, 243, 199);
    doc.roundedRect(14, finalY, 182, boxHeight, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`ARTÍCULOS NO DISPONIBLES EN STOCK (${params.itemsFaltantes.length}):`, 18, finalY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 53, 15);
    params.itemsFaltantes.forEach((f, i) => {
      doc.text(`• ${f.nombre}`, 20, finalY + 9.5 + i * 4.5);
    });

    finalY += boxHeight + 6;
  }

  // 6. Recuadro de Total General (Sin desglose de precios individuales)
  if (finalY > 245) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(120, finalY, 76, 18, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.text(`Útiles encontrados: ${params.itemsDisponibles.length}`, 124, finalY + 5.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`TOTAL ESTIMADO: $${params.total.toFixed(2)}`, 124, finalY + 13);

  // 7. Pie de página
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.text(
    `Proforma generada por ${params.nombreLibreria}. Válida sujeta a stock físico en local.`,
    105,
    285,
    { align: 'center' }
  );

  // 8. DESCARGA DIRECTA DEL ARCHIVO .PDF
  const cleanName = params.nombreLibreria.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanCodigo = pedidoCodigo.replace('#', '');
  doc.save(`Proforma_${cleanName}_${cleanCodigo}.pdf`);
}
