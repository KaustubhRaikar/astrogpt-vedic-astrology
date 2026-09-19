import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

export interface ChartPdfDetails {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  ascendant: string;
  division: 'D1' | 'D9' | 'D10' | string;
}

/**
 * Format a clean filename following the spec: {name}-{division}-kundali.{ext}
 * Example: Asha-D1-kundali.png / Asha-D1-kundali.pdf
 */
export function getChartFilename(name: string, division: string, extension: 'png' | 'pdf'): string {
  const cleanName = (name || 'Vedic_Chart')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');
  const cleanDiv = (division || 'D1').toUpperCase();
  return `${cleanName}-${cleanDiv}-kundali.${extension}`;
}

/**
 * Capture a ViewShot ref to a PNG temp file URI.
 */
export async function captureChartImage(viewShotRef: any): Promise<string> {
  if (!viewShotRef?.current?.capture) {
    throw new Error('ViewShot reference is not ready.');
  }

  const uri = await viewShotRef.current.capture();
  if (!uri) {
    throw new Error('Failed to capture chart image.');
  }
  return uri;
}

/**
 * Share image via native OS share sheet with proper filename.
 */
export async function shareChartImage(imageUri: string, filename: string): Promise<void> {
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  // Copy to cache directory with clean filename for sharing prompt
  const targetUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({
    from: imageUri,
    to: targetUri,
  });

  await Sharing.shareAsync(targetUri, {
    mimeType: 'image/png',
    dialogTitle: `Share ${filename}`,
    UTI: 'public.png',
  });
}

/**
 * Save captured chart image directly to device photo library.
 */
export async function saveChartToGallery(imageUri: string): Promise<{ success: boolean; message?: string }> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    return {
      success: false,
      message: 'Permission to access photo library was denied.',
    };
  }

  try {
    await MediaLibrary.saveToLibraryAsync(imageUri);
    return {
      success: true,
      message: 'Saved birth chart image to photo gallery.',
    };
  } catch (err: any) {
    console.error('Error saving image to photo gallery:', err);
    return {
      success: false,
      message: err.message || 'Failed to save image to photo gallery.',
    };
  }
}

/**
 * HTML template generator for 1-page PDF birth chart report.
 */
export function buildChartPdfHtml(details: ChartPdfDetails, base64Image: string): string {
  const divisionLabel =
    details.division === 'D1'
      ? 'D1 Rashi Chart'
      : details.division === 'D9'
      ? 'D9 Navamsha Chart'
      : details.division === 'D10'
      ? 'D10 Dashamsha Chart'
      : `${details.division} Chart`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${details.name} - ${details.division} Kundali</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0d0f17;
          color: #f3f4f6;
          padding: 32px 24px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .card {
          max-width: 680px;
          margin: 0 auto;
          background: #141724;
          border: 1px solid #2d3348;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .header {
          text-align: center;
          border-bottom: 1px solid #2d3348;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .logo-title {
          font-size: 24px;
          font-weight: 700;
          color: #d4af37;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .subtitle {
          font-size: 14px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
          background: #1c2033;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #282e46;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #9ca3af;
          margin-bottom: 2px;
        }
        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #f3f4f6;
        }
        .chart-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          background: #0d0f17;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #282e46;
          margin-bottom: 20px;
        }
        .chart-img {
          width: 100%;
          max-width: 480px;
          height: auto;
          border-radius: 8px;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #6b7280;
          padding-top: 12px;
          border-top: 1px solid #2d3348;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-title">Vedic Birth Chart Kundali</div>
          <div class="subtitle">${details.name} &bull; ${divisionLabel}</div>
        </div>

        <div class="grid">
          <div class="info-item">
            <span class="info-label">Name</span>
            <span class="info-value">${details.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Division Chart</span>
            <span class="info-value">${divisionLabel}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date of Birth</span>
            <span class="info-value">${details.dateOfBirth}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Time of Birth</span>
            <span class="info-value">${details.timeOfBirth}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Place of Birth</span>
            <span class="info-value">${details.placeOfBirth}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ascendant (Lagna)</span>
            <span class="info-value" style="color: #d4af37;">${details.ascendant}</span>
          </div>
        </div>

        <div class="chart-wrapper">
          <img class="chart-img" src="data:image/png;base64,${base64Image}" alt="Kundali Birth Chart" />
        </div>

        <div class="footer">
          Generated by AI Astro &bull; Client-side High Precision Vedic Engine
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Capture chart image, construct single-page PDF with birth metadata, and trigger native share.
 */
export async function exportAndSharePdf(
  imageUri: string,
  details: ChartPdfDetails,
  filename: string
): Promise<void> {
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  // Convert PNG image file to base64
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Build HTML template
  const htmlContent = buildChartPdfHtml(details, base64Image);

  // Generate PDF file
  const { uri: generatedPdfUri } = await Print.printToFileAsync({
    html: htmlContent,
  });

  // Rename / copy generated PDF file to target filename in cache
  const targetPdfUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({
    from: generatedPdfUri,
    to: targetPdfUri,
  });

  // Open native OS share sheet
  await Sharing.shareAsync(targetPdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${filename}`,
    UTI: 'com.adobe.pdf',
  });
}
