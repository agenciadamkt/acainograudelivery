import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors={false} // Desativando richColors nativo para usar nossa customização total via CSS
      expand={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast grid grid-cols-[auto_1fr] items-center gap-3 w-full p-4 rounded-xl shadow-2xl border transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full",

          // Estilo Padrão (Info/Default) - Branco/Zinc
          title: "font-semibold text-base",
          description: "text-sm opacity-90",
          actionButton: "font-semibold rounded-lg px-3 py-2",
          cancelButton: "font-semibold rounded-lg px-3 py-2",

          // Sucesso - Verde Vibrante
          success:
            "!bg-emerald-100 !text-emerald-800 !border-emerald-200 dark:!bg-emerald-900 dark:!text-emerald-50 dark:!border-emerald-800",

          // Erro - Vermelho Vibrante
          error:
            "!bg-red-100 !text-red-800 !border-red-200 dark:!bg-red-900 dark:!text-red-50 dark:!border-red-800",

          // Aviso - Amarelo/Laranja Vibrante
          warning:
            "!bg-amber-100 !text-amber-800 !border-amber-200 dark:!bg-amber-900 dark:!text-amber-50 dark:!border-amber-800",

          // Info - Azul Vibrante
          info:
            "!bg-blue-100 !text-blue-800 !border-blue-200 dark:!bg-blue-900 dark:!text-blue-50 dark:!border-blue-800",
        },
        style: {
          minWidth: '320px',
          maxWidth: '420px',
          fontFamily: 'inherit',
        }
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
