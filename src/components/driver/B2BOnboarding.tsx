import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Building2,
    FileCheck,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    CreditCard,
    FileText,
    Shield,
    ChevronRight,
    ChevronLeft,
    Search,
    Landmark,
    ScrollText,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    validateAndRegisterCNPJ,
    getActiveB2BTerms,
    acceptB2BTerms,
    registerBankAccount,
    checkDriverCompliance,
    displayCNPJ,
    isValidCNPJFormat,
    formatCNPJ,
    BRAZILIAN_BANKS,
    getBankName,
    type CNPJValidationResult,
    type B2BTerms,
    type BankAccountData,
    type DriverCompliance,
} from '@/services/b2bCompliance';

interface B2BOnboardingProps {
    driverId: string;
    driverName: string;
    onComplete?: (compliance: DriverCompliance) => void;
    onSkip?: () => void;
}

type OnboardingStep = 'cnpj' | 'terms' | 'bank' | 'complete';

export default function B2BOnboarding({
    driverId,
    driverName,
    onComplete,
    onSkip,
}: B2BOnboardingProps) {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('cnpj');
    const [isLoading, setIsLoading] = useState(false);

    // CNPJ State
    const [cnpj, setCnpj] = useState('');
    const [cnpjResult, setCnpjResult] = useState<CNPJValidationResult | null>(null);
    const [cnpjError, setCnpjError] = useState<string | null>(null);

    // Terms State
    const [terms, setTerms] = useState<B2BTerms | null>(null);
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const termsScrollRef = useRef<HTMLDivElement>(null);

    // Bank State
    const [bankData, setBankData] = useState<BankAccountData>({
        bankCode: '',
        bankName: '',
        agency: '',
        accountNumber: '',
        accountType: 'corrente',
        holderName: '',
        holderDocument: '',
        holderDocumentType: 'cnpj',
    });

    // Compliance State
    const [compliance, setCompliance] = useState<DriverCompliance | null>(null);

    // Load terms on mount
    useEffect(() => {
        loadTerms();
    }, []);

    const loadTerms = async () => {
        const termsData = await getActiveB2BTerms();
        if (termsData) {
            setTerms(termsData);
        }
    };

    // Handle terms scroll
    const handleTermsScroll = () => {
        if (termsScrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = termsScrollRef.current;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
            if (isAtBottom) {
                setHasScrolledToEnd(true);
            }
        }
    };

    // Step 1: Validate CNPJ
    const handleValidateCNPJ = async () => {
        if (!isValidCNPJFormat(cnpj)) {
            setCnpjError('CNPJ deve conter 14 dígitos');
            return;
        }

        setIsLoading(true);
        setCnpjError(null);

        try {
            const result = await validateAndRegisterCNPJ(driverId, cnpj);
            setCnpjResult(result);

            if (result.mei_status === 'rejected') {
                setCnpjError(result.rejection_reason || 'Apenas MEIs ativos podem operar no Marketplace');
            } else {
                toast.success('CNPJ validado com sucesso!');
                // Auto preencher dados bancários
                setBankData(prev => ({
                    ...prev,
                    holderName: result.razao_social,
                    holderDocument: formatCNPJ(cnpj),
                }));
            }
        } catch (error: any) {
            setCnpjError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Accept Terms
    const handleAcceptTerms = async () => {
        if (!terms || !hasScrolledToEnd || !termsAccepted) {
            toast.error('Você deve ler todo o documento e marcar a declaração');
            return;
        }

        setIsLoading(true);

        try {
            const declarationText = `EU, ${cnpjResult?.razao_social || driverName}, na qualidade de representante legal do MEI CNPJ ${displayCNPJ(cnpj)}, DECLARO que sou uma EMPRESA INDEPENDENTE e presto serviços de LOGÍSTICA para o Marketplace Açaí no Grau.`;

            const result = await acceptB2BTerms(
                driverId,
                terms.id,
                declarationText,
                hasScrolledToEnd,
                {
                    userAgent: navigator.userAgent,
                }
            );

            if (result.success) {
                toast.success('Termos aceitos com sucesso!');
                setCurrentStep('bank');
            } else {
                toast.error(result.error || 'Erro ao aceitar termos');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Register Bank Account
    const handleRegisterBank = async () => {
        if (!bankData.bankCode || !bankData.agency || !bankData.accountNumber) {
            toast.error('Preencha todos os dados bancários');
            return;
        }

        setIsLoading(true);

        try {
            const result = await registerBankAccount(driverId, {
                ...bankData,
                bankName: getBankName(bankData.bankCode),
            });

            if (result.success) {
                if (result.warning) {
                    toast.warning(result.warning);
                } else {
                    toast.success('Conta bancária registrada com sucesso!');
                }

                // Check final compliance
                const complianceResult = await checkDriverCompliance(driverId);
                setCompliance(complianceResult);
                setCurrentStep('complete');

                if (onComplete) {
                    onComplete(complianceResult);
                }
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Format CNPJ input
    const handleCNPJChange = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 14);
        let formatted = cleaned;
        if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
        if (cleaned.length > 5) formatted = formatted.slice(0, 6) + '.' + cleaned.slice(5);
        if (cleaned.length > 8) formatted = formatted.slice(0, 10) + '/' + cleaned.slice(8);
        if (cleaned.length > 12) formatted = formatted.slice(0, 15) + '-' + cleaned.slice(12);
        setCnpj(formatted);
    };

    const steps = [
        { id: 'cnpj', label: 'CNPJ/MEI', icon: Building2 },
        { id: 'terms', label: 'Termos B2B', icon: ScrollText },
        { id: 'bank', label: 'Conta PJ', icon: Landmark },
        { id: 'complete', label: 'Concluído', icon: CheckCircle2 },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-between px-4">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex items-center">
                            <div className={cn(
                                "flex flex-col items-center",
                                idx > 0 && "ml-2"
                            )}>
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    isCompleted && "bg-green-500 text-white",
                                    isCurrent && "bg-primary text-white ring-2 ring-primary/30",
                                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                                )}>
                                    {isCompleted ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-xs mt-1 font-medium",
                                    isCurrent && "text-primary",
                                    !isCurrent && "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={cn(
                                    "w-12 h-1 mx-2 rounded",
                                    isCompleted ? "bg-green-500" : "bg-muted"
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step 1: CNPJ Validation */}
            {currentStep === 'cnpj' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
                            Validação de CNPJ/MEI
                        </CardTitle>
                        <CardDescription>
                            Informe o CNPJ do seu MEI para validação junto à Receita Federal.
                            Apenas MEIs ativos podem operar no Marketplace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ *</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="cnpj"
                                    placeholder="00.000.000/0000-00"
                                    value={cnpj}
                                    onChange={(e) => handleCNPJChange(e.target.value)}
                                    maxLength={18}
                                    className="font-mono"
                                />
                                <Button onClick={handleValidateCNPJ} disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {cnpjError && (
                            <Alert variant="destructive">
                                <XCircle className="w-4 h-4" />
                                <AlertTitle>Validação Falhou</AlertTitle>
                                <AlertDescription>{cnpjError}</AlertDescription>
                            </Alert>
                        )}

                        {cnpjResult && !cnpjError && (
                            <div className="space-y-4">
                                <Alert variant={cnpjResult.mei_status === 'active' ? 'default' : 'default'}
                                    className={cn(
                                        cnpjResult.mei_status === 'active' && "border-green-500 bg-green-50",
                                        cnpjResult.mei_status === 'divergent' && "border-yellow-500 bg-yellow-50"
                                    )}>
                                    {cnpjResult.mei_status === 'active' ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                    )}
                                    <AlertTitle className={cn(
                                        cnpjResult.mei_status === 'active' && "text-green-700",
                                        cnpjResult.mei_status === 'divergent' && "text-yellow-700"
                                    )}>
                                        {cnpjResult.mei_status === 'active' ? 'MEI Ativo e Validado!' : 'MEI com Divergência'}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {cnpjResult.cnae_warning || 'Seu MEI está regular e apto a operar.'}
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Razão Social</p>
                                        <p className="font-medium">{cnpjResult.razao_social}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Nome Fantasia</p>
                                        <p className="font-medium">{cnpjResult.nome_fantasia || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Situação</p>
                                        <Badge className="bg-green-500">{cnpjResult.situacao}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">CNAE Principal</p>
                                        <p className="font-medium text-xs">{cnpjResult.cnae_principal}</p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={() => setCurrentStep('terms')}
                                    disabled={cnpjResult.mei_status === 'rejected'}
                                >
                                    Continuar
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Terms Acceptance */}
            {currentStep === 'terms' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-primary" />
                            Termos de Prestação de Serviços B2B
                        </CardTitle>
                        <CardDescription>
                            Leia atentamente os termos abaixo. Você deve rolar até o final para aceitar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {terms ? (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline">{terms.version}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                        Vigência: {new Date(terms.effective_date).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <div
                                    ref={termsScrollRef}
                                    onScroll={handleTermsScroll}
                                    className="h-64 overflow-y-auto border rounded-lg p-4 bg-muted/30 text-sm whitespace-pre-wrap"
                                >
                                    {terms.content}
                                </div>

                                <div className={cn(
                                    "flex items-center gap-2 p-2 rounded",
                                    hasScrolledToEnd ? "bg-green-50" : "bg-yellow-50"
                                )}>
                                    {hasScrolledToEnd ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                    )}
                                    <span className={cn(
                                        "text-sm",
                                        hasScrolledToEnd ? "text-green-700" : "text-yellow-700"
                                    )}>
                                        {hasScrolledToEnd
                                            ? 'Documento lido completamente'
                                            : 'Role até o final para continuar'}
                                    </span>
                                </div>

                                <Separator />

                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="terms-accept"
                                            checked={termsAccepted}
                                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                            disabled={!hasScrolledToEnd}
                                        />
                                        <label htmlFor="terms-accept" className="text-sm cursor-pointer">
                                            <strong>Declaro que sou uma empresa independente</strong> e presto serviços de
                                            logística para o Marketplace Açaí no Grau. Reconheço que não sou empregado,
                                            tenho autonomia para definir minha jornada e assumo os riscos da minha
                                            atividade empresarial.
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setCurrentStep('cnpj')}>
                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleAcceptTerms}
                                        disabled={!hasScrolledToEnd || !termsAccepted || isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <FileCheck className="w-4 h-4 mr-2" />
                                        )}
                                        Aceitar e Continuar
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <Skeleton className="h-64" />
                                <Skeleton className="h-10" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Bank Account */}
            {currentStep === 'bank' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-primary" />
                            Conta Bancária para Recebimentos
                        </CardTitle>
                        <CardDescription>
                            Informe a conta para receber seus pagamentos. Recomendamos conta PJ vinculada ao seu CNPJ.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Banco *</Label>
                                <Select
                                    value={bankData.bankCode}
                                    onValueChange={(value) => setBankData(prev => ({ ...prev, bankCode: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o banco" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BRAZILIAN_BANKS.map(bank => (
                                            <SelectItem key={bank.code} value={bank.code}>
                                                {bank.code} - {bank.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Agência *</Label>
                                <Input
                                    placeholder="0000"
                                    value={bankData.agency}
                                    onChange={(e) => setBankData(prev => ({ ...prev, agency: e.target.value }))}
                                    maxLength={6}
                                />
                            </div>

                            <div>
                                <Label>Conta *</Label>
                                <Input
                                    placeholder="00000-0"
                                    value={bankData.accountNumber}
                                    onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    maxLength={15}
                                />
                            </div>

                            <div className="col-span-2">
                                <Label>Tipo de Conta *</Label>
                                <Select
                                    value={bankData.accountType}
                                    onValueChange={(value) => setBankData(prev => ({ ...prev, accountType: value as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                                        <SelectItem value="poupanca">Poupança</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2">
                                <Label>Nome do Titular *</Label>
                                <Input
                                    placeholder="Nome conforme cadastro no banco"
                                    value={bankData.holderName}
                                    onChange={(e) => setBankData(prev => ({ ...prev, holderName: e.target.value }))}
                                />
                            </div>

                            <div>
                                <Label>Tipo de Documento *</Label>
                                <Select
                                    value={bankData.holderDocumentType}
                                    onValueChange={(value) => setBankData(prev => ({ ...prev, holderDocumentType: value as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cnpj">CNPJ do MEI</SelectItem>
                                        <SelectItem value="cpf">CPF do Titular</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Documento *</Label>
                                <Input
                                    placeholder={bankData.holderDocumentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                                    value={bankData.holderDocument}
                                    onChange={(e) => setBankData(prev => ({ ...prev, holderDocument: e.target.value }))}
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <Alert>
                            <Shield className="w-4 h-4" />
                            <AlertTitle>Segurança Jurídica</AlertTitle>
                            <AlertDescription>
                                Para garantir a caracterização B2B, os pagamentos são realizados apenas para
                                contas vinculadas ao CNPJ do MEI ou ao CPF do titular responsável.
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setCurrentStep('terms')}>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleRegisterBank}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <CreditCard className="w-4 h-4 mr-2" />
                                )}
                                Finalizar Cadastro
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Complete */}
            {currentStep === 'complete' && compliance && (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-green-700">
                                Cadastro B2B Concluído!
                            </h2>
                            <p className="text-green-600 mt-1">
                                Você está apto a operar no Marketplace Açaí no Grau
                            </p>
                        </div>

                        <div className="bg-white rounded-lg p-4 text-left space-y-2">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm">CNPJ validado: {compliance.checks.cnpj_value}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm">Termos B2B aceitos (v{compliance.checks.terms_version})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm">Conta bancária configurada</span>
                            </div>
                        </div>

                        {compliance.warnings.length > 0 && (
                            <Alert className="text-left">
                                <AlertTriangle className="w-4 h-4" />
                                <AlertTitle>Avisos</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside text-sm">
                                        {compliance.warnings.map((w, i) => (
                                            <li key={i}>{w}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button onClick={() => onComplete?.(compliance)} className="w-full">
                            Começar a Entregar
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
