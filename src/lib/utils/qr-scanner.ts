import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import jsQR from 'jsqr';

/**
 * Scan a QR code using the device camera.
 * Returns the decoded string content.
 * Throws if not running on a native platform or scan fails.
 */
export async function scanQrCode(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('NOT_NATIVE');
  }

  const result = await CapacitorBarcodeScanner.scanBarcode({
    hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
  });

  if (!result.ScanResult) {
    throw new Error('SCAN_CANCELLED');
  }

  return result.ScanResult;
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('INVALID_IMAGE'));
    };
    image.src = url;
  });
}

/** Decode a QR code from an image selected from the photo album/file picker. */
export async function scanQrCodeFromImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE');
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImage(file);
  } catch {
    throw new Error('INVALID_IMAGE');
  }

  const width = source.width;
  const height = source.height;
  if (!width || !height) {
    if ('close' in source) source.close();
    throw new Error('INVALID_IMAGE');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    if ('close' in source) source.close();
    throw new Error('INVALID_IMAGE');
  }

  context.drawImage(source, 0, 0, width, height);
  if ('close' in source) source.close();

  let imageData: ImageData;
  try {
    imageData = context.getImageData(0, 0, width, height);
  } catch {
    throw new Error('INVALID_IMAGE');
  }

  const result = jsQR(imageData.data, width, height);
  if (!result?.data) {
    throw new Error('NO_QR_FOUND');
  }

  return result.data.trim();
}
