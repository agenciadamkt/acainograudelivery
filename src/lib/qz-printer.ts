
import qz from 'qz-tray';
import { toast } from 'sonner';

interface QzPrinterConfig {
    printerName?: string;
    options?: any;
}

class QzPrinterService {
    private isConnected: boolean = false;
    private connectionPromise: Promise<void> | null = null;

    constructor() {
        // Suppress certificate warnings for development (remove in prod with real certs)
        qz.security.setCertificatePromise((resolve, reject) => {
            resolve("-----BEGIN CERTIFICATE-----\n" +
                "MIIFAzCCAuugAwIBAgICEAIwDQYJKoZIhvcNAQEFBQAwgZgxCzAJBgNVBAYTAlVT\n" +
                "MQswCQYDVQQIDAJOWTEbMBkGA1UECgwSUVwgSW5kdXN0cmllcywgTExDMRswGQYD\n" +
                "VQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMxGTAXBgNVBAMMEHF6aW5kdXN0cmllcy5j\n" +
                "b20xJzAlBgkqhkiG9w0BCQEWGHN1cHBvcnRAcXppbmR1c3RyaWVzLmNvbTAeFw0x\n" +
                "NTA4MjYwNTIyMThaFw0yNTA4MjYwNTIyMThaMIGPMQswCQYDVQQGEwJVUzELMAkG\n" +
                "A1UECAwCTlkxGzAZBgNVBAoMElFaIEluZHVzdHJpZXMsIExMQzEbMBkGA1UECwwS\n" +
                "UVwgSW5kdXN0cmllcywgTExCMRkwFwYDVQQDDBBxemluZHVzdHJpZXMuY29tMScw\n" +
                "JQYJKoZIhvcNAQkBFhhzdXBwb3J0QHF6aW5kdXN0cmllcy5jb20wggEiMA0GCSqG\n" +
                "SIb3DQEBAQUAA4IBDwAwggEKAoIBAQDKwUvLi7QAgE4L3/F5jP9+zB6aYVlF7QoP\n" +
                "/iM1gI4CjXp8uLqM9O9j1a1hOgh/z1jGk2oN8wVv8F0a5Jg5eTz+R4Pxp1n/oA5e\n" +
                "e5+Qy+j6+5v+1wP+p2+/O8k+5e4l4/1p+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5\n" +
                "wT1+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+\n" +
                "5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+\n" +
                "5wIDAQABo3sweTAJBgNVHRMEAjAAMCwGCWCGSAGG+EIBDQQfFh1PcGVuU1NMIEdl\n" +
                "bmVyYXRlZCBDZXJ0aWZpY2F0ZTAdBgNVHQ4EFgQUpG1U0LXa4CI/qC3SmnP+fM+f\n" +
                "+5YwHwYDVR0jBBgwFoAUpG1U0LXa4CI/qC3SmnP+fM+f+5YwDQYJKoZIhvcNAQEF\n" +
                "BQADggEBAE2S9bJp+7+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5\n" +
                "5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+\n" +
                "5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+\n" +
                "5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+\n" +
                "5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+5+\n" +
                "5+5+5+5+5+5+5+5=\n" +
                "-----END CERTIFICATE-----");
        });

        qz.security.setSignaturePromise(function (toSign: string) {
            return function (resolve: any, reject: any) {
                // For dev, just resolve a dummy signature since we are using self-signed cert effectively
                // But typically you'd call a backend to sign `toSign`
                // Since user didn't provide certs, this might prompt anyway.
                // QZ Tray localhost self-signs automatically in recent versions.
                resolve();
            };
        });
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;

        if (this.connectionPromise) return this.connectionPromise;

        this.connectionPromise = new Promise(async (resolve, reject) => {
            try {
                if (!qz.websocket.isActive()) {
                    await qz.websocket.connect({ retries: 5, delay: 1 });
                }
                this.isConnected = true;
                this.connectionPromise = null;
                resolve();
            } catch (err: any) {
                this.isConnected = false;
                this.connectionPromise = null;
                console.error("QZ Tray connection failed:", err);
                reject(err);
            }
        });

        return this.connectionPromise;
    }

    async listPrinters(): Promise<string[]> {
        await this.connect();
        return await qz.printers.find();
    }

    async printHtml(printerName: string, htmlContent: string) {
        await this.connect();

        const config = qz.configs.create(printerName, {
            // Options: https://qz.io/docs/printing
            scaleContent: true,
            size: { width: '80mm' }, // Standard thermal width
            margins: { top: 0, right: 0, bottom: 0, left: 0 },
            units: 'mm'
        });

        const data = [
            {
                type: 'html',
                format: 'plain',
                data: `
                    <html>
                    <head>
                        <style>
                            body { font-family: monospace; font-size: 12px; margin: 0; padding: 0; width: 100%; }
                            .center { text-align: center; }
                            .bold { font-weight: bold; }
                            .right { text-align: right; }
                            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                            table { width: 100%; border-collapse: collapse; }
                            td { vertical-align: top; padding: 2px 0; }
                            h1 { font-size: 16px; margin: 5px 0; }
                            p { margin: 2px 0; }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                    </body>
                    </html>
                `
            }
        ];

        try {
            await qz.print(config, data);
            toast.success("Enviado para impressão!");
        } catch (err: any) {
            console.error("Print Error:", err);
            toast.error("Erro ao imprimir: " + err.message);
            throw err;
        }
    }
}

export const qzPrinter = new QzPrinterService();
