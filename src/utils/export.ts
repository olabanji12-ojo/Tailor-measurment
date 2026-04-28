import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (customerName: string, data: Record<string, number>, unit: string) => {
  const doc = new jsPDF();

  // Add Title
  doc.setFontSize(22);
  doc.setTextColor(197, 163, 103); // Gold color from theme
  doc.text('TailorVoice Measurement Sheet', 14, 20);

  // Add Customer Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Client: ${customerName}`, 14, 35);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 42);
  doc.text(`Units: ${unit.toUpperCase()}`, 14, 49);

  // Add Table
  const tableData = Object.entries(data).map(([key, value]) => [
    key.toUpperCase(),
    `${value} ${unit}`
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Measurement Part', 'Value']],
    body: tableData,
    headStyles: { fillColor: [197, 163, 103] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Built with TailorVoice AI', 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`${customerName.replace(/\s+/g, '_')}_measurements.pdf`);
};
