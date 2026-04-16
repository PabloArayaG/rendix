import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Expense } from '../types/database';
import { formatCurrency, formatShortDate } from './utils';

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materiales', labor: 'Mano de obra', equipment: 'Equipos/maquinaria',
  transport: 'Transporte', services: 'Servicios contratados', permits: 'Permisos/licencias',
  utilities: 'Servicios públicos', insurance: 'Seguros', supplies: 'Insumos/suministros',
  subcontractors: 'Subcontratistas', tools: 'Herramientas', safety: 'Seguridad/EPP',
  administration: 'Gastos administrativos', salary: 'Sueldos', food: 'Alimentación',
  accommodation: 'Hospedaje', fuel: 'Combustible', other: 'Otros', general: 'General',
};

const STATUS_LABELS: Record<string, string> = {
  provision: 'Provisión', paid: 'Pagado', credit: 'Crédito', advance: 'Anticipo',
};

const ORANGE  = [234, 88, 12]  as [number, number, number];
const GRAY_50 = [249, 250, 251] as [number, number, number];
const GRAY_100= [243, 244, 246] as [number, number, number];
const GRAY_400= [156, 163, 175] as [number, number, number];
const GRAY_700= [55,  65,  81]  as [number, number, number];
const GRAY_900= [17,  24,  39]  as [number, number, number];
const WHITE   = [255, 255, 255] as [number, number, number];

export function generateProjectPdf(project: Project, expenses: Expense[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = W - 14;
  let y = 0;

  /* ── helpers ── */
  const setFont = (size: number, style: 'normal' | 'bold' = 'normal', color = GRAY_900) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
  };
  const line = (yPos: number, color = GRAY_100) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(marginL, yPos, marginR, yPos);
  };

  /* ═══════════════════════════════════════════════
     HEADER
  ═══════════════════════════════════════════════ */
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, W, 22, 'F');

  setFont(13, 'bold', WHITE);
  doc.text('RENDIX', marginL, 13);
  setFont(8, 'normal', [255, 200, 150]);
  doc.text('Gestión Financiera de Proyectos', marginL, 18.5);

  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  setFont(7, 'normal', [255, 220, 180]);
  doc.text(`Generado el ${today}`, marginR, 14, { align: 'right' });

  y = 30;

  /* ── Título del proyecto ── */
  setFont(17, 'bold');
  doc.text(project.name, marginL, y);
  y += 6;

  setFont(9, 'normal', GRAY_400);
  doc.text(`${project.custom_id}  ·  ${project.client}`, marginL, y);

  // Badge estado
  const statusLabel = project.status === 'completed' ? 'Terminado' : 'En Proceso';
  const badgeColor: [number, number, number] = project.status === 'completed' ? [16, 185, 129] : [59, 130, 246];
  const bW = doc.getTextWidth(statusLabel) + 6;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(marginR - bW, y - 5.5, bW, 6.5, 1.5, 1.5, 'F');
  setFont(8, 'bold', WHITE);
  doc.text(statusLabel, marginR - bW / 2, y - 0.5, { align: 'center' });
  y += 10;

  line(y); y += 6;

  /* ═══════════════════════════════════════════════
     KPI CARDS (4 columnas)
  ═══════════════════════════════════════════════ */
  const kpis = [
    { label: 'Venta Neta',  value: formatCurrency(project.sale_amount)  },
    { label: 'Costo Real',  value: formatCurrency(project.real_cost)    },
    { label: 'Margen Real', value: formatCurrency(project.real_margin)  },
    { label: '% Margen',    value: `${project.sale_amount > 0 ? ((project.real_margin / project.sale_amount) * 100).toFixed(1) : '0.0'}%` },
  ];
  const cardW = (W - marginL * 2 - 9) / 4;

  kpis.forEach(({ label, value }, i) => {
    const x = marginL + i * (cardW + 3);
    doc.setFillColor(...GRAY_50);
    doc.setDrawColor(...GRAY_100);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'FD');

    setFont(7, 'normal', GRAY_400);
    doc.text(label.toUpperCase(), x + cardW / 2, y + 5.5, { align: 'center' });

    setFont(9, 'bold', GRAY_900);
    doc.text(value, x + cardW / 2, y + 13, { align: 'center' });
  });
  y += 24;

  /* ═══════════════════════════════════════════════
     INFORMACIÓN DEL PROYECTO (2 columnas)
  ═══════════════════════════════════════════════ */
  const colW = (W - marginL * 2 - 6) / 2;

  const leftInfo = [
    ['Cliente',             project.client],
    ['ID Proyecto',         project.custom_id],
    project.start_date ? ['Fecha inicio', formatShortDate(project.start_date)] : null,
    project.end_date   ? ['Fecha término', formatShortDate(project.end_date)]  : null,
    ['Costo proyectado',    formatCurrency(project.projected_cost)],
    ['Margen proyectado',   formatCurrency(project.projected_margin)],
  ].filter(Boolean) as [string, string][];

  const rightInfo = [
    project.purchase_order ? ['OC',             project.purchase_order] : null,
    project.hes            ? ['HES',            project.hes]            : null,
    project.sale_invoice   ? ['Factura venta',  project.sale_invoice]   : null,
    project.notes          ? ['Notas',          project.notes]          : null,
  ].filter(Boolean) as [string, string][];

  const renderInfoBlock = (rows: [string, string][], xStart: number) => {
    let localY = y;
    rows.forEach(([label, val]) => {
      setFont(7, 'normal', GRAY_400);
      doc.text(label, xStart, localY);
      setFont(8, 'bold', GRAY_700);
      const maxW = colW - 28;
      const lines = doc.splitTextToSize(val, maxW);
      doc.text(lines, xStart + 28, localY);
      localY += lines.length > 1 ? lines.length * 4.5 : 5.5;
    });
    return localY;
  };

  const yLeft  = renderInfoBlock(leftInfo,  marginL);
  const yRight = rightInfo.length > 0 ? renderInfoBlock(rightInfo, marginL + colW + 6) : y;
  y = Math.max(yLeft, yRight) + 4;

  line(y); y += 7;

  /* ═══════════════════════════════════════════════
     TABLA DE GASTOS
  ═══════════════════════════════════════════════ */
  setFont(11, 'bold', GRAY_900);
  doc.text('Detalle de Gastos', marginL, y);
  y += 6;

  const totalNet   = expenses.reduce((s, e) => s + (e.net_amount || 0), 0);
  const totalIva   = expenses.reduce((s, e) => s + (e.tax_amount || 0), 0);
  const totalBruto = expenses.reduce((s, e) => s + e.amount, 0);

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: 14 },
    head: [['Descripción', 'Categoría', 'Proveedor', 'Fecha', 'Estado', 'Neto', 'IVA', 'Total']],
    body: expenses.map(e => [
      e.description,
      CATEGORY_LABELS[e.category] || e.category,
      e.supplier || '—',
      formatShortDate(e.date),
      STATUS_LABELS[e.status] || e.status,
      formatCurrency(e.net_amount || 0),
      formatCurrency(e.tax_amount || 0),
      formatCurrency(e.amount),
    ]),
    foot: [['', '', '', '', 'TOTAL', formatCurrency(totalNet), formatCurrency(totalIva), formatCurrency(totalBruto)]],
    styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', textColor: GRAY_700 },
    headStyles: { fillColor: GRAY_900, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: ORANGE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: GRAY_50 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { cellWidth: 17 },
      4: { cellWidth: 18 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...ORANGE);
      doc.rect(0, pageH - 10, W, 10, 'F');
      setFont(7, 'normal', WHITE);
      doc.text(`${project.name}  ·  ${project.custom_id}`, marginL, pageH - 4);
      doc.text(`Página ${data.pageNumber}`, marginR, pageH - 4, { align: 'right' });
    },
  });

  const filename = `Rendix_${project.custom_id}_${project.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
