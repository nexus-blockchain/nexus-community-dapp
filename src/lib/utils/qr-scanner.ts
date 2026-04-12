import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

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
