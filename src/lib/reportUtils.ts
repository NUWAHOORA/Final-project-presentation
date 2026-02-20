import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Event } from '@/hooks/useEvents';

export interface ReportFilters {
    dateFrom: string;
    dateTo: string;
    status: string;   // '' = all
    category: string; // '' = all
}

/** Apply filters to events and return filtered list. */
export function filterEvents(events: Event[], filters: ReportFilters): Event[] {
    return events.filter((e) => {
        if (filters.dateFrom && e.date < filters.dateFrom) return false;
        if (filters.dateTo && e.date > filters.dateTo) return false;
        if (filters.status && e.status !== filters.status) return false;
        if (filters.category && e.category !== filters.category) return false;
        return true;
    });
}

/** Build table rows for both CSV and PDF. */
function buildRows(events: Event[]): string[][] {
    return events.map((e) => [
        e.title,
        e.date,
        e.time,
        e.venue,
        e.category,
        e.organizer_name || 'Unknown',
        String(e.registered_count),
        String(e.attended_count),
        e.status,
    ]);
}

const HEADERS = [
    'Event Name',
    'Date',
    'Time',
    'Location',
    'Category',
    'Organizer',
    'Registrations',
    'Attended',
    'Status',
];

/** Download filtered events as a CSV file. */
export function downloadCSV(events: Event[], filters: ReportFilters): void {
    const filtered = filterEvents(events, filters);
    if (filtered.length === 0) throw new Error('No events match the selected filters.');

    const rows = buildRows(filtered);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const csvLines = [
        HEADERS.map(escape).join(','),
        ...rows.map((r) => r.map(escape).join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Download filtered events as a PDF file. */
export function downloadPDF(events: Event[], filters: ReportFilters): void {
    const filtered = filterEvents(events, filters);
    if (filtered.length === 0) throw new Error('No events match the selected filters.');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart-UEMS Events Report', 14, 16);

    // Subtitle / filter summary
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const subtitle = [
        filters.dateFrom || filters.dateTo
            ? `Date: ${filters.dateFrom || 'any'} → ${filters.dateTo || 'any'}`
            : null,
        filters.status ? `Status: ${filters.status}` : null,
        filters.category ? `Category: ${filters.category}` : null,
        `Generated: ${new Date().toLocaleString()}`,
    ]
        .filter(Boolean)
        .join('   |   ');
    doc.text(subtitle, 14, 23);

    autoTable(doc, {
        startY: 28,
        head: [HEADERS],
        body: buildRows(filtered),
        headStyles: {
            fillColor: [79, 70, 229], // indigo-600
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { cellWidth: 45 }, // Event Name
            3: { cellWidth: 35 }, // Location
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            // Footer with page number
            const pageSize = doc.internal.pageSize;
            doc.setFontSize(7);
            doc.text(
                `Page ${data.pageNumber}`,
                pageSize.getWidth() - 20,
                pageSize.getHeight() - 6
            );
        },
    });

    doc.save(`events-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
