// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';

export const generateApplicationPDF = (profile) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 128);
  doc.text('High Commission of Australia', 20, 20);
  doc.setFontSize(14);
  doc.text('Visa Application Form', 20, 30);
  
  // Add personal details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  let yPosition = 50;
  
  doc.text(`Surname: ${profile.surname || ''}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Name: ${profile.name || ''}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Passport No: ${profile.passportNo || ''}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Visa Type: ${profile.visaType || ''}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Status: ${profile.applicationStatus || ''}`, 20, yPosition);
  
  // Add more fields as needed...
  
  return doc;
};