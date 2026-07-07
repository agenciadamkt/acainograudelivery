import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentUrl: string;
  initials: string;
  userId: string;
  onUpload: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-24 h-24',
};

export function AvatarUpload({ currentUrl, initials, userId, onUpload, size = 'md' }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    // Preview imediato
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `avatars/${userId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast.success('Foto atualizada!');
    } catch (err: any) {
      // Tenta criar o bucket se não existir e faz retry
      if (err.message?.includes('Bucket not found') || err.statusCode === 400) {
        toast.error('Bucket "avatars" não encontrado. Crie-o no painel do Supabase Storage.');
      } else {
        toast.error('Erro ao enviar foto: ' + err.message);
      }
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onUpload('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="relative group w-fit">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative rounded-full overflow-hidden transition-all',
          sizeMap[size],
          'ring-2 ring-primary/20 hover:ring-primary/60',
          'focus:outline-none focus:ring-primary'
        )}
        title="Clique para trocar a foto"
      >
        <Avatar className={cn('w-full h-full')}>
          <AvatarImage src={displayUrl} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-black text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay */}
        <div className={cn(
          'absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}>
          {uploading
            ? <Loader2 size={18} className="text-white animate-spin" />
            : <Camera size={18} className="text-white" />
          }
          {!uploading && (
            <span className="text-white text-[9px] font-bold uppercase tracking-wide">Trocar</span>
          )}
        </div>
      </button>

      {/* Botão remover foto */}
      {displayUrl && !uploading && (
        <button
          type="button"
          onClick={clearPreview}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
          title="Remover foto"
        >
          <X size={10} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
