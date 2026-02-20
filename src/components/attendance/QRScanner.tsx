import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: string) => void;
    fps?: number;
    qrbox?: number | { width: number; height: number };
    aspectRatio?: number;
    disableFlip?: boolean;
}

export const QRScanner = ({
    onScanSuccess,
    onScanFailure,
    fps = 10,
    qrbox = 250,
    aspectRatio = 1.0,
    disableFlip = false,
}: QRScannerProps) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize the scanner
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps,
                qrbox,
                aspectRatio,
                disableFlip,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                // Set to true to use the local camera if available
                rememberLastUsedCamera: true,
            },
      /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                onScanSuccess(decodedText);
            },
            (error) => {
                if (onScanFailure) {
                    onScanFailure(error);
                }
            }
        );

        scannerRef.current = scanner;

        // Cleanup on unmount
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((error) => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, [onScanSuccess, onScanFailure, fps, qrbox, aspectRatio, disableFlip]);

    return (
        <div className="w-full max-w-lg mx-auto overflow-hidden rounded-xl border border-border bg-black">
            <div id="qr-reader" className="w-full" />
        </div>
    );
};
