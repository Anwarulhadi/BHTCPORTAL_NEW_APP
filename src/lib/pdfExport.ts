import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateGradeLetter } from './gradeUtils';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FileOpener } from '@capacitor-community/file-opener';

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
  doc.text('Bialul Habeshi Photography and Videography Training Center', 105, 20, { align: 'center' });

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

  // Process grades to merge Bonus and Continuous Assessment
  const processedGrades: Grade[] = [];
  let continuousAssessmentSum = 0;
  let hasContinuousAssessment = false;

  grades.forEach(g => {
    const subjectLower = g.subject.toLowerCase().trim();
    if (subjectLower === 'bonus' || subjectLower === 'continuous assessment') {
      continuousAssessmentSum += g.grade;
      hasContinuousAssessment = true;
    } else {
      processedGrades.push(g);
    }
  });

  if (hasContinuousAssessment) {
    processedGrades.push({
      subject: 'Continuous Assessment',
      grade: continuousAssessmentSum,
      total: undefined
    });
  }

  // Table: No | Subject | Grade | Remark
  const tableData = processedGrades.map((g, idx) => [
    (idx + 1).toString(),
    g.subject,
    g.total ? `${g.grade} / ${g.total}` : `${g.grade}%`,
    ''
  ]);

  // Calculate total sum
  const totalSum = processedGrades.reduce((acc, curr) => acc + curr.grade, 0);
  const finalGradeLetter = calculateGradeLetter(totalSum);

  // Add Summary Row
  tableData.push([
    '',
    'TOTAL',
    `${totalSum}`,
    ''
  ]);
  
  // Add Grade Letter Row
  tableData.push([
    '',
    'FINAL GRADE',
    `${finalGradeLetter}`,
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
    },
    didParseCell: (data) => {
      // Bold the summary rows
      if (data.row.index >= processedGrades.length) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 1) {
           data.cell.styles.halign = 'right';
        }
      }
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

  // Grade Conversion Table
  const conversionY = sigY + 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  // Add the green bar indicator
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(20, conversionY - 4, 2, 5, 'F');
  doc.text('Grade Letter Conversion', 24, conversionY);

  autoTable(doc, {
    startY: conversionY + 5,
    head: [['Percentage (%)', 'Grade Letter']],
    body: [
      ['95 - 100', 'A+'],
      ['92 - 94.99', 'A'],
      ['89 - 91.99', 'A-'],
      ['86 - 88.99', 'B+'],
      ['83 - 85.99', 'B'],
      ['80 - 82.99', 'B-'],
      ['77 - 79.99', 'C+'],
      ['74 - 76.99', 'C'],
      ['< 74', 'NON CMPITANT']
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [248, 250, 252], // Slate 50
      textColor: [100, 116, 139], // Slate 500
      fontStyle: 'bold',
      fontSize: 10,
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.1
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [51, 65, 85], // Slate 700
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 50, halign: 'left' },
      1: { cellWidth: 50, halign: 'left', fontStyle: 'bold' }
    },
    margin: { left: 20 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const grade = data.cell.raw as string;
        if (['A+', 'A', 'A-'].includes(grade)) {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald 500
        } else if (['B+', 'B', 'B-'].includes(grade)) {
          data.cell.styles.textColor = [37, 99, 235]; // Blue 600
        } else if (['C+', 'C'].includes(grade)) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber 600
        } else if (grade === 'NON CMPITANT') {
          data.cell.styles.textColor = [220, 38, 38]; // Red 600
        }
      }
      // Special styling for the last row (NON CMPITANT) background
      if (data.section === 'body' && data.row.index === 8) {
          data.cell.styles.fillColor = [254, 242, 242]; // Red 50
      }
    }
  });

  // Generate PDF as blob for mobile compatibility
  // Use ArrayBuffer for faster base64 conversion
  const pdfArrayBuffer = doc.output('arraybuffer');
  // Sanitize filename to remove invalid characters like slashes
  const sanitizedId = (student.student_id || 'unknown').replace(/[^a-z0-9]/gi, '_');
  const timestamp = new Date().getTime();
  const fileName = `${sanitizedId}_Grade_Report_${timestamp}.pdf`;

  if (Capacitor.isNativePlatform()) {
    let loadingToastId: string | number | undefined;
    try {
      loadingToastId = toast.loading('Exporting PDF, please wait...');
    } catch {}
    try {
      // Request permissions first
      if (Capacitor.getPlatform() === 'android') {
        try {
          const perm = await Filesystem.checkPermissions();
          if (perm.publicStorage !== 'granted') {
            const req = await Filesystem.requestPermissions();
            if (req.publicStorage !== 'granted') {
              toast.error('Storage permission denied');
              return { saved: false, opened: false };
            }
          }
        } catch (permErr) {
          console.warn('Permission check failed, attempting write anyway', permErr);
        }
      }

      // Fast base64 conversion from ArrayBuffer
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
      });
      
      const fileUri = result.uri;

      // Schedule Local Notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Download Complete',
            body: `Grade Report saved to Documents/${fileName}. Tap to open.`,
            id: Math.floor(Date.now() % 2147483647),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: {
              filePath: fileUri
            }
          }
        ]
      });

      // Add listener for notification click to open file
      LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
        if (notification.notification.extra?.filePath) {
           try {
             await FileOpener.open({
               filePath: notification.notification.extra.filePath,
               contentType: 'application/pdf'
             });
           } catch (err) {
             console.error('Error opening file', err);
             toast.error('Could not open file automatically. Please check your Documents folder.');
           }
        }
      });

      toast.success(`Saved to Documents/${fileName}`);
      if (loadingToastId) toast.dismiss(loadingToastId);
      
      // Try to open immediately as well for better UX
      try {
         await FileOpener.open({
            filePath: fileUri,
            contentType: 'application/pdf'
         });
      } catch (e) {
         // Ignore immediate open error, user has notification
      }

      return { saved: true, opened: false };
    } catch (e: any) {
      if (loadingToastId) toast.dismiss(loadingToastId);
      console.error('Filesystem write error', e);
      toast.error(`Failed to save file: ${e.message || e}`);
      return { saved: false, opened: false };
    }
  }

  // For web, create pdfBlob from ArrayBuffer
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
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





