import { ReactNode } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import LogoCircular from "@/assets/logo-circular.png";

interface FeedbackModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode; // Actions/Buttons
    icon?: string;
}

export function FeedbackModal({
    isOpen,
    onOpenChange,
    title,
    description,
    children,
    icon,
}: FeedbackModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[400px] [&>button]:left-4 [&>button]:right-auto rounded-[32px] p-8 gap-6 border-none shadow-2xl"
            >
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Logo / Icon */}
                    <div className="relative">
                        <img
                            src={icon || LogoCircular}
                            alt="Icon"
                            className="w-32 h-32 object-contain animate-in zoom-in-50 duration-300"
                        />
                    </div>

                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-2xl font-bold text-center leading-tight">
                            {title}
                        </DialogTitle>
                        {description && (
                            <DialogDescription className="text-base text-center text-muted-foreground leading-relaxed">
                                {description}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {children && (
                        <div className="w-full flex flex-col gap-3 pt-2">
                            {children}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
