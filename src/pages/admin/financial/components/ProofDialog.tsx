
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ExternalLink } from "lucide-react";
import { useState } from "react";

interface ProofDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
}

export function ProofDialog({ open, onOpenChange, url }: ProofDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (!url) return null;

    const handleDownload = async () => {
        setIsLoading(true);
        try {
            // Tenta baixar via Blob
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Network response was not ok');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `comprovante-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(link);
        } catch (error) {
            console.error("Erro ao baixar imagem:", error);
            // Fallback: Abre em nova aba
            window.open(url, '_blank');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-gray-800 h-[85vh] flex flex-col">
                {/* Image area - flex-1 with min-h-0 prevents it from pushing the bar away */}
                <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black w-full overflow-hidden">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"
                        title="Fechar"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <img
                        src={url}
                        alt="Comprovante"
                        className="max-w-full max-h-full object-contain p-4"
                    />
                </div>

                {/* Action bar - always visible at bottom with shrink-0 */}
                <div className="shrink-0 bg-white/10 px-4 py-3 flex justify-between items-center backdrop-blur-sm w-full border-t border-white/10">
                    <span className="text-white/60 text-sm ml-2">Visualização do Comprovante</span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.open(url, '_blank')} className="gap-2 bg-transparent text-white border-white/20 hover:bg-white/10">
                            <ExternalLink className="h-4 w-4" /> Abrir Original
                        </Button>
                        <Button variant="default" onClick={handleDownload} disabled={isLoading} className="gap-2 bg-white text-black hover:bg-gray-200">
                            <Download className="h-4 w-4" />
                            {isLoading ? 'Baixando...' : 'Baixar'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
