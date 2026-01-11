import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings as SettingsIcon, Percent, Save, Lock, Key, FolderOpen, Copy } from 'lucide-react';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';

export default function Settings() {
  const navigate = useNavigate();
  const { commissionPercentage, loading, fetchSettings, updateCommissionPercentage } = useSettingsStore();
  const [localCommission, setLocalCommission] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const [backupPathSuccess, setBackupPathSuccess] = useState('');
  const [backupFrequency, setBackupFrequency] = useState('24');
  const [backupRetention, setBackupRetention] = useState('7');
  const [backupPolicySuccess, setBackupPolicySuccess] = useState('');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadBackupPath();
    loadBackupPolicy();
  }, [fetchSettings]);

  useEffect(() => {
    setLocalCommission(commissionPercentage.toString());
  }, [commissionPercentage]);

  const loadBackupPath = async () => {
    try {
      const path = await window.electron.backup.getPath();
      setBackupPath(path);
    } catch (error) {
      console.error('Erro ao carregar caminho de backup:', error);
    }
  };

  const loadBackupPolicy = async () => {
    try {
      const policy = await window.electron.backup.getPolicy();
      setBackupFrequency(policy.frequency.toString());
      setBackupRetention(policy.retention.toString());
    } catch (error) {
      console.error('Erro ao carregar política de backup:', error);
    }
  };

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

  const handleChangeBackupPath = async () => {
    setBackupPathSuccess('');
    try {
      const selectedPath = await window.electron.backup.selectDirectory();
      if (selectedPath) {
        const newPath = await window.electron.backup.setPath(selectedPath);
        setBackupPath(newPath);
        setBackupPathSuccess('Caminho de backup atualizado com sucesso!');
        setTimeout(() => setBackupPathSuccess(''), 3000);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao alterar caminho de backup');
    }
  };

  const handleSaveBackupPolicy = async () => {
    setIsSavingPolicy(true);
    setBackupPolicySuccess('');
    try {
      const frequency = parseInt(backupFrequency, 10);
      const retention = parseInt(backupRetention, 10);

      if (isNaN(frequency) || frequency < 1 || frequency > 168) {
        alert('Frequência deve estar entre 1 e 168 horas (1 semana)');
        setIsSavingPolicy(false);
        return;
      }

      if (isNaN(retention) || retention < 1 || retention > 365) {
        alert('Retenção deve estar entre 1 e 365 backups');
        setIsSavingPolicy(false);
        return;
      }

      await window.electron.backup.setPolicy(frequency, retention);
      setBackupPolicySuccess('Política de backup atualizada com sucesso!');
      setTimeout(() => setBackupPolicySuccess(''), 3000);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar política de backup');
    } finally {
      setIsSavingPolicy(false);
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
          <div className="space-y-2 max-w-md">
            <Label htmlFor="commission">Porcentagem de Comissão (%)</Label>
            <div className="flex gap-2">
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
                className="flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={isSaving || loading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Valor entre 0 e 100. Exemplo: 5 = 5% de comissão
            </p>
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

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Backup
          </CardTitle>
          <CardDescription>
            Configure onde os backups do sistema serão armazenados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1 flex-1 mr-4">
              <h3 className="font-medium">Diretório de Backup</h3>
              <p className="text-sm text-muted-foreground break-all">
                {backupPath || 'Carregando...'}
              </p>
            </div>
            <Button
              onClick={handleChangeBackupPath}
              variant="outline"
              className="flex items-center gap-2 flex-shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
              Alterar Diretório
            </Button>
          </div>

          {backupPathSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{backupPathSuccess}</p>
            </div>
          )}

          <div className="space-y-4 mt-6">
            <h3 className="font-medium">Política de Backup</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Frequência (horas)</Label>
                <Input
                  id="backupFrequency"
                  type="number"
                  min="1"
                  max="168"
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  disabled={loading || isSavingPolicy}
                />
                <p className="text-xs text-muted-foreground">
                  Intervalo entre backups automáticos (1-168 horas)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="backupRetention">Retenção (quantidade)</Label>
                <Input
                  id="backupRetention"
                  type="number"
                  min="1"
                  max="365"
                  value={backupRetention}
                  onChange={(e) => setBackupRetention(e.target.value)}
                  disabled={loading || isSavingPolicy}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de backups automáticos a manter (1-365)
                </p>
              </div>
            </div>
            <Button
              onClick={handleSaveBackupPolicy}
              disabled={isSavingPolicy || loading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSavingPolicy ? 'Salvando...' : 'Salvar Política'}
            </Button>
          </div>

          {backupPolicySuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md mt-4">
              <p className="text-sm text-green-700">{backupPolicySuccess}</p>
            </div>
          )}

          <div className="p-4 bg-muted rounded-md mt-4">
            <h3 className="font-medium mb-2">Informações:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Backups automáticos são criados conforme a frequência configurada</li>
              <li>• Backups mais antigos são removidos automaticamente conforme a retenção configurada</li>
              <li>• Você pode criar backups manuais a qualquer momento na tela de Backup</li>
              <li>• Certifique-se de que o diretório escolhido tem permissão de escrita</li>
              <li>• Alterar a frequência reinicia o intervalo de backup automático</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Segurança e Autenticação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Gerencie suas configurações de segurança e autenticação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <h3 className="font-medium">Senha de Acesso</h3>
              <p className="text-sm text-muted-foreground">
                Altere sua senha de acesso ao sistema
              </p>
            </div>
            <Button
              onClick={() => setChangePasswordModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ferramentas Administrativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Ferramentas Administrativas
          </CardTitle>
          <CardDescription>
            Ferramentas avançadas para gerenciamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <h3 className="font-medium">Clonagem de Dados</h3>
              <p className="text-sm text-muted-foreground">
                Copie categorias, produtos, clientes e formas de pagamento entre empresas
              </p>
            </div>
            <Button
              onClick={() => navigate('/data-cloning')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Abrir Clonagem
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        open={changePasswordModalOpen}
        onOpenChange={setChangePasswordModalOpen}
      />
    </div>
  );
}
