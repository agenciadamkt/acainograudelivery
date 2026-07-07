import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface BrandedLoaderProps {
  label?: string;
  minHeight?: string;
}

export function BrandedLoader({ label = "Sincronizando Dados...", minHeight = "400px" }: BrandedLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[${minHeight}] gap-6`}>
      <motion.div
        animate={{ 
          y: [0, -15, 0],
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2.5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        
        <img 
          src="/logo-192x192.png" 
          className="h-24 w-24 object-contain relative z-10 drop-shadow-2xl" 
          alt="Mascote" 
        />
      </motion.div>
      
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
          {label}
        </div>
        <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-purple-400 to-purple-700"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
