import { useState } from 'react';
import { Plus, Trash2, Video, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useProductVideos, useCreateProductVideo, useDeleteProductVideo } from '@/hooks/useProducts';

interface ProductVideosManagerProps {
    productId: string;
}

export function ProductVideosManager({ productId }: ProductVideosManagerProps) {
    const { data: videos, isLoading } = useProductVideos(productId);
    const createVideo = useCreateProductVideo();
    const deleteVideo = useDeleteProductVideo();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [newVideo, setNewVideo] = useState({
        video_url: '',
        title: '',
        description: ''
    });

    const handleSave = () => {
        if (!newVideo.video_url) return;

        createVideo.mutate({
            product_id: productId,
            video_url: newVideo.video_url,
            title: newVideo.title,
            description: newVideo.description
        }, {
            onSuccess: () => {
                setIsDialogOpen(false);
                setNewVideo({ video_url: '', title: '', description: '' });
            }
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja remover este vídeo?')) {
            deleteVideo.mutate({ id, productId });
        }
    };

    if (isLoading) return <div>Carregando vídeos...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Galeria de Vídeos (Stories)</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Adicionar Vídeo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="url">URL do YouTube, Shorts ou MP4</Label>
                                <Input
                                    id="url"
                                    placeholder="https://youtube.com/shorts/..."
                                    value={newVideo.video_url}
                                    onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Título (Opcional)</Label>
                                <Input
                                    id="title"
                                    placeholder="Ex: Detalhes do Açaí"
                                    value={newVideo.title}
                                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc">Descrição / Legenda (Opcional)</Label>
                                <Input
                                    id="desc"
                                    placeholder="Legenda que aparece no story"
                                    value={newVideo.description}
                                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSave} disabled={createVideo.isPending}>
                                {createVideo.isPending ? 'Salvando...' : 'Adicionar Vídeo'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos?.length === 0 && (
                    <div className="col-span-full py-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        Nenhum vídeo extra cadastrado.
                        <br />
                        <span className="text-xs">O vídeo principal do cadastro do produto ainda será exibido se existir.</span>
                    </div>
                )}

                {videos?.map((video: any) => (
                    <Card key={video.id} className="overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 overflow-hidden">
                                    <div className="flex items-center gap-2 font-medium truncate">
                                        <Video className="h-4 w-4 text-primary" />
                                        {video.title || 'Sem título'}
                                    </div>
                                    <a
                                        href={video.video_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-muted-foreground flex items-center gap-1 hover:underline truncate"
                                    >
                                        {video.video_url} <ExternalLink className="h-3 w-3" />
                                    </a>
                                    {video.description && (
                                        <p className="text-xs text-muted-foreground truncate">{video.description}</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                    onClick={() => handleDelete(video.id)}
                                    disabled={deleteVideo.isPending}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
