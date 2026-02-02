import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import qz from 'qz-tray';
import { toast } from 'sonner';
import { setupQzSecurity } from '@/utils/printing/qz-security';

interface PrinterContextType {
    isConnected: boolean;
    printers: string[];
    selectedPrinter: string | null;
    connect: (silent?: boolean) => Promise<void>;
    disconnect: () => Promise<void>;
    printRaw: (data: any[]) => Promise<boolean>;
    setSelectedPrinter: (printer: string) => void;
    isPrinting: boolean;
    connectionError: string | null;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export const PrinterProvider = ({ children }: { children: ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [printers, setPrinters] = useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinterState] = useState<string | null>(
        localStorage.getItem('selected_printer')
    );
    const [isPrinting, setIsPrinting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Connect to QZ Tray
    const connect = useCallback(async (silent: boolean = false) => {
        try {
            // Setup security (anonymous mode for development)
            setupQzSecurity();

            // Check if already connected
            if (qz.websocket.isActive()) {
                setIsConnected(true);
                setConnectionError(null);

                // Just refresh printer list
                try {
                    const foundPrinters = await qz.printers.find();
                    setPrinters(Array.isArray(foundPrinters) ? foundPrinters : [foundPrinters]);
                } catch (e) {
                    console.warn("Could not fetch printers:", e);
                }
                return;
            }

            // Try to connect
            await qz.websocket.connect();
            setIsConnected(true);
            setConnectionError(null);

            if (!silent) {
                toast.success("✅ Conectado ao QZ Tray!");
            }

            // Find available printers
            try {
                const foundPrinters = await qz.printers.find();
                const printerList = Array.isArray(foundPrinters) ? foundPrinters : [foundPrinters];
                setPrinters(printerList);

                // Auto-select first printer if none selected
                if (!selectedPrinter && printerList.length > 0) {
                    const defaultPrinter = printerList.find(p =>
                        p.toLowerCase().includes('thermal') ||
                        p.toLowerCase().includes('bematech') ||
                        p.toLowerCase().includes('epson')
                    ) || printerList[0];

                    setSelectedPrinterState(defaultPrinter);
                    localStorage.setItem('selected_printer', defaultPrinter);

                    if (!silent) {
                        toast.info(`Impressora selecionada: ${defaultPrinter}`);
                    }
                }
            } catch (e) {
                console.warn("Could not fetch printers:", e);
            }

        } catch (err: any) {
            console.error("QZ Connection Error:", err);
            setIsConnected(false);

            const errorMessage = err?.message || "Erro desconhecido";
            setConnectionError(errorMessage);

            if (!silent) {
                if (errorMessage.includes("Unable to connect")) {
                    toast.error("QZ Tray não encontrado. Verifique se está instalado e em execução.", {
                        duration: 5000,
                        action: {
                            label: "Baixar",
                            onClick: () => window.open('https://qz.io/download/', '_blank')
                        }
                    });
                } else {
                    toast.error(`Erro ao conectar com QZ Tray: ${errorMessage}`);
                }
            }
        }
    }, [selectedPrinter]);

    // Disconnect from QZ Tray
    const disconnect = useCallback(async () => {
        try {
            if (qz.websocket.isActive()) {
                await qz.websocket.disconnect();
            }
            setIsConnected(false);
            setPrinters([]);
        } catch (err) {
            console.error("Disconnect error:", err);
        }
    }, []);

    // Print raw ESC/POS commands
    const printRaw = useCallback(async (data: any[]): Promise<boolean> => {
        if (!selectedPrinter) {
            toast.error("Nenhuma impressora selecionada");
            return false;
        }

        if (!isConnected) {
            toast.error("QZ Tray não conectado");
            return false;
        }

        setIsPrinting(true);
        try {
            const config = qz.configs.create(selectedPrinter, {
                encoding: 'UTF-8'
            });
            await qz.print(config, data);
            toast.success("🖨️ Enviado para impressora!");
            return true;
        } catch (error: any) {
            console.error("Print error:", error);
            toast.error(`Erro ao imprimir: ${error?.message || 'Erro desconhecido'}`);
            return false;
        } finally {
            setIsPrinting(false);
        }
    }, [selectedPrinter, isConnected]);

    // Set selected printer
    const setSelectedPrinter = useCallback((printer: string) => {
        setSelectedPrinterState(printer);
        localStorage.setItem('selected_printer', printer);
        toast.success(`Impressora selecionada: ${printer}`);
    }, []);

    // Auto-connect on mount and cleanup on unmount
    useEffect(() => {
        // Try silent connect after a short delay
        const timer = setTimeout(() => {
            connect(true);
        }, 1000);

        return () => {
            clearTimeout(timer);
            if (qz.websocket.isActive()) {
                qz.websocket.disconnect().catch(console.error);
            }
        };
    }, []);

    // Reconnect on websocket closed
    useEffect(() => {
        const handleClose = () => {
            console.log("QZ Tray connection closed");
            setIsConnected(false);
        };

        qz.websocket.setClosedCallbacks(handleClose);

        return () => {
            qz.websocket.setClosedCallbacks(() => { });
        };
    }, []);

    return (
        <PrinterContext.Provider value={{
            isConnected,
            printers,
            selectedPrinter,
            connect,
            disconnect,
            printRaw,
            setSelectedPrinter,
            isPrinting,
            connectionError
        }}>
            {children}
        </PrinterContext.Provider>
    );
};

export const usePrinter = () => {
    const context = useContext(PrinterContext);
    if (!context) {
        throw new Error('usePrinter must be used within a PrinterProvider');
    }
    return context;
};
