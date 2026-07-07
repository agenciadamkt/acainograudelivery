'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, RefreshCw, Copy, Check } from 'lucide-react';
import { useRandomQuote, useFavoriteQuote } from '@/hooks/useQuotes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuoteWidgetProps {
  categoryId?: number;
}

export function QuoteWidget({ categoryId }: QuoteWidgetProps) {
  const { data: quote, isLoading, refetch, isFetching } = useRandomQuote(categoryId);
  const favoriteMutation = useFavoriteQuote();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quote) return;
    
    setIsFavorited(true);
    try {
      await favoriteMutation.mutateAsync(quote.id);
    } catch {
      setIsFavorited(false);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(false);
    refetch();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quote) return;
    navigator.clipboard.writeText(`"${quote.text}" — ${quote.author_name}`);
    setIsCopied(true);
    toast.success('Citação copiada!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading && !quote) {
    return (
      <div className="bg-transparent p-5 my-4 animate-pulse h-32" />
    );
  }

  if (!quote) return null;

  return (
    <div 
      className={cn(
        "group relative overflow-hidden transition-all duration-150 my-4",
        "flex flex-col justify-between bg-transparent",
        "p-2 md:py-4 min-h-[130px]"
      )}
    >
      {/* Decorative vertical line */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] opacity-70 rounded-full" 
           style={{ backgroundColor: quote.author_color || '#667EEA' }} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={quote.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col justify-between h-full pl-6"
        >
          {/* Quote Text */}
          <p 
            className="font-medium not-italic m-0 text-xl md:text-2xl leading-relaxed text-slate-700 dark:text-slate-200 mb-6"
          >
            "{quote.text}"
          </p>

          {/* Footer: Author and Category */}
          <div className="flex justify-between items-center">
             <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span 
                  className="font-bold m-0 text-base md:text-lg"
                  style={{ color: quote.author_color || '#667EEA' }}
                >
                  {quote.author_name}
                </span>
                
                <span 
                  className={cn(
                    "font-bold tracking-wider uppercase px-3 py-1 rounded-full border-[1.5px] items-center text-[11px] w-fit opacity-80"
                  )}
                  style={{ 
                    color: quote.author_color || '#667EEA', 
                    borderColor: quote.author_color || '#667EEA'
                  }}
                >
                  {quote.category_name}
                </span>
             </div>

             {/* Actions */}
             <div className="flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
               <button
                  onClick={handleCopy}
                  className="flex items-center justify-center p-2 rounded-full transition-colors focus:outline-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
               >
                  {isCopied ? <Check size={18} /> : <Copy size={18} />}
               </button>
               
               <button
                  onClick={handleFavorite}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-full transition-colors focus:outline-none",
                    isFavorited 
                      ? "text-red-500 bg-red-50 dark:bg-red-900/20" 
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
               >
                  <Heart size={18} className={cn(isFavorited && "fill-current")} />
               </button>

               <button
                  onClick={handleNext}
                  disabled={isFetching}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-full transition-colors focus:outline-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
                    isFetching && "opacity-50 cursor-not-allowed"
                  )}
               >
                  <RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
               </button>
             </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
