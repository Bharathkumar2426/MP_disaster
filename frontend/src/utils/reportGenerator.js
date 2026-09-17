import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Exports disasters data as a professional PDF Situation Report (SitRep).
 * @param {Array} disasters - List of disaster objects
 * @param {Object} metadata - Optional metadata (user, organization, etc.)
 */
export function exportDisastersPDF(disasters = [], metadata = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const generatedAt = new Date().toLocaleString();
  const userName = metadata.userName || "System Coordinator";

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, "F");

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DISASTER MANAGEMENT SYSTEM", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Official Incident Situation Report (SitRep)", 14, 24);
  doc.text(`Generated: ${generatedAt} | By: ${userName}`, 14, 30);

  // Summary Metrics Box
  const total = disasters.length;
  const highSev = disasters.filter((d) => d.severity?.toUpperCase() === "HIGH").length;
  const activeCount = disasters.filter((d) => d.status?.toUpperCase() === "ACTIVE").length;
  const resolvedCount = total - activeCount;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, 182, 18, 2, 2, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Incidents: ${total}`, 20, 53);
  doc.text(`Active Crises: ${activeCount}`, 68, 53);
  doc.setTextColor(220, 38, 38);
  doc.text(`High Severity: ${highSev}`, 116, 53);
  doc.setTextColor(22, 163, 74);
  doc.text(`Controlled/Resolved: ${resolvedCount}`, 155, 53);

  // Table
  const tableData = disasters.map((d, index) => [
    index + 1,
    d.disasterName || "N/A",
    d.district || "N/A",
    d.severity || "LOW",
    d.status || "ACTIVE",
    d.reportedDate ? new Date(d.reportedDate).toLocaleDateString() : "Recent",
    d.requiredResources || "Standard Response",
  ]);

  doc.autoTable({
    startY: 66,
    head: [["#", "Incident Name", "District", "Severity", "Status", "Date", "Required Resources"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 38 },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 42 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = String(data.cell.raw).toUpperCase();
        if (val === "HIGH") data.cell.styles.textColor = [220, 38, 38];
        else if (val === "MEDIUM") data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [22, 163, 74];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Disaster Management System — Page ${i} of ${pageCount} | Confidential Emergency Document`,
      14,
      290
    );
  }

  doc.save(`Disaster_SitRep_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exports data as a CSV file.
 * @param {Array} data - Array of objects
 * @param {string} filename - Output filename
 */
export function exportToCSV(data = [], filename = "disaster_data.csv") {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  data.forEach((row) => {
    const values = headers.map((header) => {
      const escaped = ("" + (row[header] ?? "")).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
