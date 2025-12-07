import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateGradeLetter } from './gradeUtils';

interface Grade {
  subject: string;
  grade: number;
  total?: string | number;
}

interface Student {
  name: string;
  student_id: string;
  batch_number?: string | null;
}

export const exportGradeReport = async (
  student: Student,
  grades: Grade[],
  averageGrade: number,
  options?: {
    openInNewTab?: boolean;
    showGradeLetter?: boolean;
    courseTitle?: string;
    remark?: string;
    logoPath?: string; // path under public/, e.g. '/report-stamp.png'
  }
) => {
  const showGradeLetter = options?.showGradeLetter ?? true;
  const doc = new jsPDF();

  // Try to embed logo/stamp if present at given path (public accessible)
  // Logo embedding removed to reduce PDF size. If needed, enable by
  // restoring image fetch/addImage logic here.

  // Header (exact requested text)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BILALUL HABESHI TRAINING CENTER', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Student Grade Report', 105, 30, { align: 'center' });

  // Student info block (left-aligned)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Name:', 20, 48);
  doc.text(student.name || '', 60, 48);
  doc.text('Student ID:', 20, 55);
  doc.text(student.student_id || '', 60, 55);
  doc.text('Batch No:', 20, 62);
  doc.text(student.batch_number || '', 60, 62);
  doc.text('Course:', 20, 69);
  doc.text(options?.courseTitle || '', 60, 69);
  doc.text('Date:', 150, 48, { align: 'right' });
  doc.text(new Date().toLocaleDateString(), 180, 48, { align: 'right' });

  // Table: No | Subject | Grade | Remark
  const tableData = grades.map((g, idx) => [
    (idx + 1).toString(),
    g.subject,
    g.total ? `${g.grade} / ${g.total}` : `${g.grade}%`,
    ''
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['No', 'Subject', 'Grade', 'Remark']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 30 }
    }
  });

  // After table: signature lines and official footer text
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 14 : 100;
  // Official footer text (immediately below table)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('The Grade Report is Official When Signed & Scaled by the Registrar', 105, finalY, { align: 'center' });

  const sigY = finalY + 12;
  doc.setFont('helvetica', 'normal');
  doc.text('Department Head__________________', 20, sigY);
  doc.text('Registrar:_______________________', 115, sigY);

  // Generate PDF as blob for mobile compatibility
  const pdfBlob = doc.output('blob');
  const fileName = `${student.student_id}_Grade_Report.pdf`;

  const blobUrl = URL.createObjectURL(pdfBlob);
  if (options?.openInNewTab) {
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return { saved: true, opened: true };
  } else {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);
    return { saved: true, opened: false };
  }
};
