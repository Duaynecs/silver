import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Building2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useCompaniesStore } from '@/stores/companiesStore';
import type { CloningOptions, CloningReport } from '@/types/electron';

export default function DataCloning() {
  const { companies, fetchCompanies } = useCompaniesStore();
  const [sourceCompanyId, setSourceCompanyId] = useState<number | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<number | null>(null);
  const [updateMode, setUpdateMode] = useState<'insert' | 'upsert'>('insert');
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [report, setReport] = useState<CloningReport | null>(null);
  const [error, setError] = useState<string>('');

  const [options, setOptions] = useState({
    categories: true,
    products: true,
    customers: true,
    paymentMethods: true,
  });

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOptionChange = (key: keyof CloningOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const sourceCompany = companies.find((c) => c.id === sourceCompanyId);
  const targetCompany = companies.find((c) => c.id === targetCompanyId);

  const availableTargetCompanies = companies.filter((c) => c.id !== sourceCompanyId);

  const canStartCloning =
    sourceCompanyId &&
    targetCompanyId &&
    sourceCompanyId !== targetCompanyId &&
    (options.categories || options.products || options.customers || options.paymentMethods);

  const handleStartCloning = async () => {
    if (!canStartCloning || !sourceCompanyId || !targetCompanyId) return;

    setIsCloning(true);
    setProgress('Iniciando clonagem...');
    setError('');
    setReport(null);

    try {
      const cloningOptions: CloningOptions = {
        ...options,
        updateMode,
      };

      const result = await window.electron.cloning.cloneData(
        sourceCompanyId,
        targetCompanyId,
        cloningOptions
      );

      setProgress('Clonagem concluída!');
      setReport(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar clonagem');
      setProgress('');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Copy className="w-8 h-8" />
          Clonagem de Dados
        </h1>
        <p className="text-muted-foreground">
          Copie dados entre empresas do sistema
        </p>
      </div>

      {/* Seleção de Empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Empresas
          </CardTitle>
          <CardDescription>
            Selecione a empresa origem e destino para a clonagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sourceCompany">Empresa Origem</Label>
              <Select
                value={sourceCompanyId?.toString() || ''}
                onValueChange={(value) => {
                  setSourceCompanyId(parseInt(value, 10));
                  // Reset target if it's the same as source
                  if (targetCompanyId === parseInt(value, 10)) {
                    setTargetCompanyId(null);
                  }
                }}
                disabled={isCloning}
              >
                <SelectTrigger id="sourceCompany">
                  <SelectValue placeholder="Selecione a empresa origem" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceCompany && (
                <p className="text-xs text-muted-foreground">
                  Os dados serão copiados DESTA empresa
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCompany">Empresa Destino</Label>
              <Select
                value={targetCompanyId?.toString() || ''}
                onValueChange={(value) => setTargetCompanyId(parseInt(value, 10))}
                disabled={!sourceCompanyId || isCloning}
              >
                <SelectTrigger id="targetCompany">
                  <SelectValue placeholder="Selecione a empresa destino" />
                </SelectTrigger>
                <SelectContent>
                  {availableTargetCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetCompany && (
                <p className="text-xs text-muted-foreground">
                  Os dados serão copiados PARA esta empresa
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opções de Clonagem */}
      <Card>
        <CardHeader>
          <CardTitle>Dados a Clonar</CardTitle>
          <CardDescription>
            Selecione quais dados deseja copiar da empresa origem para a destino
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="categories"
                checked={options.categories}
                onCheckedChange={(checked) =>
                  handleOptionChange('categories', checked as boolean)
                }
                disabled={isCloning}
              />
              <label
                htmlFor="categories"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Categorias
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="products"
                checked={options.products}
                onCheckedChange={(checked) =>
                  handleOptionChange('products', checked as boolean)
                }
                disabled={isCloning}
              />
              <label
                htmlFor="products"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Produtos
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="customers"
                checked={options.customers}
                onCheckedChange={(checked) =>
                  handleOptionChange('customers', checked as boolean)
                }
                disabled={isCloning}
              />
              <label
                htmlFor="customers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Clientes
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="paymentMethods"
                checked={options.paymentMethods}
                onCheckedChange={(checked) =>
                  handleOptionChange('paymentMethods', checked as boolean)
                }
                disabled={isCloning}
              />
              <label
                htmlFor="paymentMethods"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Formas de Pagamento
              </label>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <Label>Modo de Atualização</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insertMode"
                  checked={updateMode === 'insert'}
                  onCheckedChange={(checked) => {
                    if (checked) setUpdateMode('insert');
                  }}
                  disabled={isCloning}
                />
                <label
                  htmlFor="insertMode"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Apenas inserir novos (não atualizar existentes)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="upsertMode"
                  checked={updateMode === 'upsert'}
                  onCheckedChange={(checked) => {
                    if (checked) setUpdateMode('upsert');
                  }}
                  disabled={isCloning}
                />
                <label
                  htmlFor="upsertMode"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Atualizar dados existentes (por barcode/CPF/CNPJ)
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ação */}
      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={handleStartCloning}
              disabled={!canStartCloning || isCloning}
              className="flex items-center gap-2"
              size="lg"
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Clonando...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Iniciar Clonagem
                </>
              )}
            </Button>

            {isCloning && progress && (
              <p className="text-sm text-muted-foreground">{progress}</p>
            )}
          </div>

          {!canStartCloning && !isCloning && (
            <p className="text-sm text-muted-foreground mt-2">
              Selecione as empresas e pelo menos um tipo de dado para iniciar
            </p>
          )}
        </CardContent>
      </Card>

      {/* Relatório */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Relatório de Clonagem
            </CardTitle>
            <CardDescription>
              Resumo dos dados clonados de "{sourceCompany?.name}" para "{targetCompany?.name}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {options.categories && (
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span className="font-medium">Categorias:</span>
                  <span className="text-sm">
                    {report.categories.inserted} inseridas, {report.categories.updated} atualizadas,{' '}
                    {report.categories.skipped} ignoradas
                  </span>
                </div>
              )}

              {options.products && (
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span className="font-medium">Produtos:</span>
                  <span className="text-sm">
                    {report.products.inserted} inseridos, {report.products.updated} atualizados,{' '}
                    {report.products.skipped} ignorados
                  </span>
                </div>
              )}

              {options.customers && (
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span className="font-medium">Clientes:</span>
                  <span className="text-sm">
                    {report.customers.inserted} inseridos, {report.customers.updated} atualizados,{' '}
                    {report.customers.skipped} ignorados
                  </span>
                </div>
              )}

              {options.paymentMethods && (
                <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                  <span className="font-medium">Formas de Pagamento:</span>
                  <span className="text-sm">
                    {report.paymentMethods.inserted} inseridas,{' '}
                    {report.paymentMethods.updated} atualizadas,{' '}
                    {report.paymentMethods.skipped} ignoradas
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• A clonagem NÃO remove dados existentes na empresa destino</li>
            <li>• Produtos são identificados por código de barras (se houver)</li>
            <li>• Clientes são identificados por CPF/CNPJ</li>
            <li>• Categorias são identificadas por nome</li>
            <li>• Formas de pagamento são identificadas por nome</li>
            <li>• No modo "Apenas inserir", dados já existentes serão ignorados</li>
            <li>• No modo "Atualizar", dados existentes serão sobrescritos com os da origem</li>
            <li>• Recomenda-se fazer backup antes de realizar clonagem com atualização</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
