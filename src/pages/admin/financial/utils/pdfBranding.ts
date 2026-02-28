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

export async function addPdfBranding(doc: jsPDF, centerName?: string): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const logoSize = 18;
    const logoX = pageWidth - margin - logoSize;
    const logoY = 4;

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
    const textY = 14;

    // Center Name (Top Left)
    if (centerName) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128); // #6B7280
        doc.text(`CD: ${centerName}`, margin, 18);
    }

    // "OS" - Purple
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(124, 58, 237); // #7C3AED (Violet-600)
    doc.text('OS', textEndX, textY, { align: 'right' });

    // Calculate width of "OS" to position "Grau" correctly
    const osWidth = doc.getTextWidth('OS');

    // "Grau" - Dark
    doc.setTextColor(26, 26, 26); // #1A1A1A
    doc.text('Grau', textEndX - osWidth, textY, { align: 'right' });

    // Subtitle
    // Aligned to the right, matching the end of "OS" text (textEndX)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // #6B7280 (Gray-500)
    doc.text('Sistema Operacional da Franquia', textEndX, textY + 5, { align: 'right' });

    // Divider line
    doc.setDrawColor(229, 231, 235); // #E5E7EB
    doc.setLineWidth(0.5);
    doc.line(margin, 26, pageWidth - margin, 26);

    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    return 30; // Y offset to start content
}
