import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrinter } from "@/contexts/PrinterContext";
import { Printer, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function PrinterSettingsTab() {
    const { isConnected, printers, selectedPrinter, connect, setSelectedPrinter, printRaw, isPrinting } = usePrinter();
    const testRef = useRef<HTMLDivElement>(null);

    const handleTestPrint = async () => {
        // ESC/POS Command to print "Hello World" + Cut Paper
        // ESC @ = Initialize
        // ESC a 1 = Center align
        // GS V 66 0 = Cut paper
        const testData = [
            '\x1B\x40',          // Initialize
            '\x1B\x61\x01',      // Center
            '\x1B\x45\x01',      // Bold On
            'AÇAI NO GRAU\n',
            '\x1B\x45\x00',      // Bold Off
            'Teste de Impressão\n',
            '--------------------------------\n',
            'Impressora Configurada!\n',
            '\x1B\x61\x00',      // Left Align
            'Se voce esta lendo isso,\n',
            'a impressao RAW esta funcionando.\n',
            '\n\n\n',
            '\x1D\x56\x41\x00'   // Cut Paper (Generic)
        ];

        await printRaw(testData);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Configuração de Impressora</h2>
                    <p className="text-sm text-muted-foreground">Configure a impressora térmica para pedidos</p>
                </div>
                <Badge variant={isConnected ? "default" : "destructive"} className={isConnected ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                    {isConnected ? (
                        <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Conectado (QZ Tray)</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Desconectado</span>
                        </div>
                    )}
                </Badge>
            </div>

            <Separator />

            {!isConnected && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p className="font-semibold mb-1">QZ Tray Não Detectado</p>
                    <p className="mb-3">Para imprimir automaticamente, você precisa instalar o software QZ Tray no computador.</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open('https://qz.io/download/', '_blank')}>
                            Baixar QZ Tray
                        </Button>
                        <Button size="sm" onClick={() => connect()}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Tentar Reconectar
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-4 max-w-sm">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Selecione a Impressora</label>
                    <div className="flex gap-2">
                        <Select value={selectedPrinter || ""} onValueChange={setSelectedPrinter} disabled={!isConnected}>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha uma impressora..." />
                            </SelectTrigger>
                            <SelectContent>
                                {printers.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => connect()} title="Atualizar Lista">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Button
                    onClick={handleTestPrint}
                    disabled={!isConnected || !selectedPrinter || isPrinting}
                >
                    <Printer className="w-4 h-4 mr-2" />
                    {isPrinting ? "Imprimindo..." : "Imprimir Teste"}
                </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-8">
                <p><strong>Dica:</strong> Para melhores resultados, use uma impressora térmica compatível com ESC/POS (ex: Bematech, Epson).</p>
            </div>
        </div>
    );
}
