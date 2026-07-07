import jsPDF from 'jspdf';
import logoCircularUrl from '@/assets/logo-acai.png';

/**
 * Adds the GrauOS branding header to any jsPDF document.
 * Logo on the right side with "GrauOS" + "Sistema Operacional da Franquia".
 * Returns the Y offset to start content after the header.
 */
const LOGO_WIDTH = 300; // Resize target width
const LOGO_HEIGHT = 300; // Resize target height
let cachedLogoBase64: string | null = null;

async function loadLogoBase64(): Promise<string> {
    if (cachedLogoBase64) return cachedLogoBase64;

    // 1. Fetch the image
    const response = await fetch(logoCircularUrl);
    const blob = await response.blob();
    const originalBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });

    // 2. Resize using Canvas
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Keep aspect ratio
            const scale = Math.min(LOGO_WIDTH / img.width, LOGO_HEIGHT / img.height);
            const w = img.width * scale;
            const h = img.height * scale;

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                // Export as PNG to preserve transparency
                // PNG compression is lossless, but resizing the canvas earlier significantly reduces data size
                cachedLogoBase64 = canvas.toDataURL('image/png');
                resolve(cachedLogoBase64);
            } else {
                // Fallback to original if context fails
                cachedLogoBase64 = originalBase64;
                resolve(originalBase64);
            }
        };
        img.onerror = () => {
            resolve(''); // Fail silently
        };
        img.src = originalBase64;
    });
}

export async function addPdfBranding(doc: jsPDF, centerName?: string, compact = false): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const logoSize = compact ? 13.5 : 18;
    const logoX = pageWidth - margin - logoSize;
    const logoY = compact ? 3 : 4;

    // Load and add logo
    try {
        const logoData = await loadLogoBase64();
        doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
        // If logo fails to load, just skip it
    }

    // Text Positioning
    // We want the text to end to the left of the logo with some padding
    const textEndX = logoX - 2;
    const textY = compact ? 10.5 : 14;

    // Center Name (Top Left)
    if (centerName) {
        doc.setFontSize(compact ? 9 : 10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128); // #6B7280
        doc.text(`CD: ${centerName}`, margin, compact ? 13 : 18);
    }

    // "OS" - Purple
    doc.setFontSize(compact ? 17 : 22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(124, 58, 237); // #7C3AED (Violet-600)
    doc.text('OS', textEndX, textY, { align: 'right' });

    // Calculate width of "OS" to position "Grau" correctly
    const osWidth = doc.getTextWidth('OS');

    // "Grau" - Dark
    doc.setTextColor(26, 26, 26); // #1A1A1A
    doc.text('Grau', textEndX - osWidth, textY, { align: 'right' });

    // Trademark (®)
    doc.setFontSize(compact ? 6.5 : 8);
    doc.setTextColor(124, 58, 237); // #7C3AED
    doc.text('®', textEndX + 0.5, textY - (compact ? 3 : 4), { align: 'left' });

    // Subtitle
    // Aligned to the right, matching the end of "OS" text (textEndX)
    doc.setFontSize(compact ? 7.5 : 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // #6B7280 (Gray-500)
    doc.text('Sistema Operacional da Franquia', textEndX, textY + (compact ? 4 : 5), { align: 'right' });

    // Divider line — roxo institucional sutil, em vez de só cinza
    const dividerY = compact ? 19 : 26;
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(compact ? 0.6 : 0.5);
    doc.line(margin, dividerY, margin + 14, dividerY);
    doc.setDrawColor(229, 231, 235); // #E5E7EB
    doc.setLineWidth(0.5);
    doc.line(margin + 14, dividerY, pageWidth - margin, dividerY);

    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    return compact ? 23 : 30; // Y offset to start content
}
