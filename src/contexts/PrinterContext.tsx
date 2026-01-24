import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import qz from 'qz-tray';
import { toast } from 'sonner';

interface PrinterContextType {
    isConnected: boolean;
    printers: string[];
    selectedPrinter: string | null;
    connect: (silent?: boolean) => Promise<void>;
    printRaw: (data: any[]) => Promise<void>;
    setSelectedPrinter: (printer: string) => void;
    isPrinting: boolean;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

import { setupQzSecurity } from '@/utils/printing/qz-security';

export const PrinterProvider = ({ children }: { children: ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);

    // Remove separate security setup effect - move to connect()
    /* 
    useEffect(() => {
        setupQzSecurity();
    }, []); 
    */

    const [printers, setPrinters] = useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string | null>(
        localStorage.getItem('selected_printer')
    );
    const [isPrinting, setIsPrinting] = useState(false);

    // Initialize QZ Tray connection
    const connect = async (silent: boolean = false) => {
        try {
            // Setup security before connecting
            setupQzSecurity();

            if (!qz.websocket.isActive()) {
                await qz.websocket.connect();
                setIsConnected(true);
                if (!silent) toast.success("Conectado ao serviço de impressão");

                // Find printers
                const foundPrinters = await qz.printers.find();
                setPrinters(foundPrinters);
            }
        } catch (err) {
            console.error(err);
            if (!silent) {
                toast.error("Erro ao conectar com QZ Tray. Verifique se o programa está aberto.");
            }
            setIsConnected(false);
        }
    };

    useEffect(() => {
        return () => {
            if (qz.websocket.isActive()) {
                qz.websocket.disconnect();
            }
        };
    }, []);

    const printRaw = async (data: any[]) => {
        if (!selectedPrinter) {
            toast.error("Nenhuma impressora selecionada");
            return;
        }

        setIsPrinting(true);
        try {
            const config = qz.configs.create(selectedPrinter);
            await qz.print(config, data);
            toast.success("Enviado para impressora");
        } catch (error) {
            console.error("Print error:", error);
            toast.error("Erro ao imprimir");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSetPrinter = (printer: string) => {
        setSelectedPrinter(printer);
        localStorage.setItem('selected_printer', printer);
    };

    return (
        <PrinterContext.Provider value={{
            isConnected,
            printers,
            selectedPrinter,
            connect,
            printRaw,
            setSelectedPrinter: handleSetPrinter,
            isPrinting
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
