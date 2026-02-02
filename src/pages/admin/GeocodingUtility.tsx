import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface AddressWithStatus {
    id: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
}

export default function GeocodingUtility() {
    const [addresses, setAddresses] = useState<AddressWithStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ total: 0, withCoords: 0, withoutCoords: 0 });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('customer_addresses')
                .select('id, street, number, neighborhood, city, state, latitude, longitude')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const addressList = (data || []).map(addr => ({
                ...addr,
                status: (addr.latitude && addr.longitude) ? 'success' as const : 'pending' as const
            }));

            setAddresses(addressList);

            const withCoords = addressList.filter(a => a.latitude && a.longitude).length;
            setStats({
                total: addressList.length,
                withCoords,
                withoutCoords: addressList.length - withCoords
            });

        } catch (error) {
            console.error('Error fetching addresses:', error);
            toast.error('Erro ao buscar endereços');
        } finally {
            setIsLoading(false);
        }
    };

    const geocodeAddress = async (address: AddressWithStatus): Promise<{ lat: number; lng: number } | null> => {
        try {
            const fullAddress = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}, ${address.state}, Brazil`;
            const encodedAddress = encodeURIComponent(fullAddress);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'AcaiNoGrauDeliveryApp/1.0'
                    }
                }
            );

            const data = await response.json();

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }

            // Fallback: try with city only
            const cityAddress = `${address.city}, ${address.state}, Brazil`;
            const cityResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityAddress)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'AcaiNoGrauDeliveryApp/1.0'
                    }
                }
            );

            const cityData = await cityResponse.json();

            if (cityData && cityData.length > 0) {
                return {
                    lat: parseFloat(cityData[0].lat),
                    lng: parseFloat(cityData[0].lon)
                };
            }

            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    };

    const processAllAddresses = async () => {
        const pendingAddresses = addresses.filter(a => !a.latitude || !a.longitude);

        if (pendingAddresses.length === 0) {
            toast.info('Todos os endereços já possuem coordenadas!');
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        let processed = 0;
        let successCount = 0;
        let errorCount = 0;

        for (const address of pendingAddresses) {
            // Update status to processing
            setAddresses(prev =>
                prev.map(a => a.id === address.id ? { ...a, status: 'processing' as const } : a)
            );

            // Geocode
            const coords = await geocodeAddress(address);

            if (coords) {
                // Update in database
                const { error } = await supabase
                    .from('customer_addresses')
                    .update({ latitude: coords.lat, longitude: coords.lng })
                    .eq('id', address.id);

                if (!error) {
                    setAddresses(prev =>
                        prev.map(a => a.id === address.id ? {
                            ...a,
                            latitude: coords.lat,
                            longitude: coords.lng,
                            status: 'success' as const
                        } : a)
                    );
                    successCount++;
                } else {
                    setAddresses(prev =>
                        prev.map(a => a.id === address.id ? {
                            ...a,
                            status: 'error' as const,
                            error: error.message
                        } : a)
                    );
                    errorCount++;
                }
            } else {
                setAddresses(prev =>
                    prev.map(a => a.id === address.id ? {
                        ...a,
                        status: 'error' as const,
                        error: 'Endereço não encontrado'
                    } : a)
                );
                errorCount++;
            }

            processed++;
            setProgress((processed / pendingAddresses.length) * 100);

            // Wait 1.1 seconds between requests (Nominatim rate limit)
            if (processed < pendingAddresses.length) {
                await new Promise(resolve => setTimeout(resolve, 1100));
            }
        }

        setIsProcessing(false);
        setStats(prev => ({
            ...prev,
            withCoords: prev.withCoords + successCount,
            withoutCoords: prev.withoutCoords - successCount
        }));

        toast.success(`Processamento concluído! ${successCount} atualizados, ${errorCount} com erro.`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>;
            case 'error':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
            case 'processing':
                return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando</Badge>;
            default:
                return <Badge variant="outline">Pendente</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Geocodificação de Endereços</h1>
                    <p className="text-muted-foreground">Atualizar coordenadas dos endereços para cálculo de frete</p>
                </div>
                <Button variant="outline" onClick={fetchAddresses}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-sm text-muted-foreground">Total de endereços</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.withCoords}</div>
                        <p className="text-sm text-muted-foreground">Com coordenadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">{stats.withoutCoords}</div>
                        <p className="text-sm text-muted-foreground">Sem coordenadas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Action */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Processar Endereços
                    </CardTitle>
                    <CardDescription>
                        Este processo irá buscar as coordenadas de todos os endereços que ainda não possuem latitude/longitude.
                        O processo leva aproximadamente {Math.ceil(stats.withoutCoords * 1.1)} segundos devido ao limite da API.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isProcessing && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-sm text-muted-foreground text-center">
                                {Math.round(progress)}% concluído
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={processAllAddresses}
                        disabled={isProcessing || stats.withoutCoords === 0}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4 mr-2" />
                                Geocodificar {stats.withoutCoords} Endereços
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Endereços</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Endereço</TableHead>
                                <TableHead>Cidade</TableHead>
                                <TableHead>Coordenadas</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {addresses.map((address) => (
                                <TableRow key={address.id}>
                                    <TableCell className="font-medium">
                                        {address.street}, {address.number}
                                        <div className="text-xs text-muted-foreground">{address.neighborhood}</div>
                                    </TableCell>
                                    <TableCell>{address.city} - {address.state}</TableCell>
                                    <TableCell className="text-xs font-mono">
                                        {address.latitude && address.longitude ? (
                                            <span className="text-green-600">
                                                {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(address.status)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
