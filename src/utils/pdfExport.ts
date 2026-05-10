import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { ClientProfile } from '../context/AppContext';

export const exportToPDF = (profile: ClientProfile, shopName: string) => {
  const doc = new jsPDF() as any;

  // Header
  doc.setFont('serif', 'bold');
  doc.setFontSize(22);
  doc.text(shopName, 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Measurement Certificate', 105, 28, { align: 'center' });

  // Client Info
  doc.setDrawColor(240);
  doc.line(20, 35, 190, 35);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT DETAILS', 20, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${profile.customer_name}`, 20, 52);
  doc.text(`Date: ${new Date(profile.date).toLocaleDateString()}`, 20, 58);
  doc.text(`Garment: ${profile.garment || 'Custom'}`, 20, 64);
  doc.text(`Delivery Date: ${profile.delivery_date ? new Date(profile.delivery_date).toLocaleDateString() : 'N/A'}`, 20, 70);

  // Financials
  doc.text(`Total Cost: ₦${(profile.total_cost || 0).toLocaleString()}`, 130, 52);
  doc.text(`Amount Paid: ₦${(profile.amount_paid || 0).toLocaleString()}`, 130, 58);
  doc.text(`Balance: ₦${(profile.total_cost - profile.amount_paid || 0).toLocaleString()}`, 130, 64);

  // Measurements Table
  const measurements: [string, string][] = [];
  const parseData = (dataObj: any, prefix = '') => {
    if (!dataObj) return;
    for (const [key, value] of Object.entries(dataObj)) {
      if (typeof value === 'number') {
        measurements.push([prefix ? `${prefix} ${key}`.toUpperCase() : key.toUpperCase(), `${value} ${profile.unit || 'in'}`]);
      } else if (typeof value === 'object' && value !== null) {
        parseData(value, key);
      }
    }
  };
  parseData(profile.data);

  doc.autoTable({
    startY: 80,
    head: [['Measurement Part', 'Value']],
    body: measurements,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(180);
  doc.text('Generated via TailorVoice A.I.', 105, finalY, { align: 'center' });

  doc.save(`${profile.customer_name.replace(/\s+/g, '_')}_Measurements.pdf`);
};
