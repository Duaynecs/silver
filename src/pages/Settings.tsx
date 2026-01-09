import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings as SettingsIcon, Percent, Save } from 'lucide-react';

export default function Settings() {
  const { commissionPercentage, loading, fetchSettings, updateCommissionPercentage } = useSettingsStore();
  const [localCommission, setLocalCommission] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setLocalCommission(commissionPercentage.toString());
  }, [commissionPercentage]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    try {
      const percentage = parseFloat(localCommission);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        alert('Por favor, insira uma porcentagem válida entre 0 e 100');
        setIsSaving(false);
        return;
      }

      await updateCommissionPercentage(percentage);
      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      alert('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-8 h-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Comissão sobre Vendas
          </CardTitle>
          <CardDescription>
            Defina a porcentagem de comissão aplicada sobre todas as vendas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1fr,auto] gap-4 items-end max-w-md">
            <div className="space-y-2">
              <Label htmlFor="commission">Porcentagem de Comissão (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={localCommission}
                onChange={(e) => setLocalCommission(e.target.value)}
                placeholder="0.00"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Valor entre 0 e 100. Exemplo: 5 = 5% de comissão
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || loading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          <div className="p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Como funciona:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• A comissão é calculada sobre o valor total de cada venda</li>
              <li>• O cálculo será exibido nos relatórios de vendas</li>
              <li>• Esta configuração se aplica a todas as vendas do sistema</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
