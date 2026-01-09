import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBackupStore } from '@/stores/backupStore';
import { Download, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Backup() {
  const { backups, loading, error, fetchBackups, createBackup, restoreBackup, deleteBackup } =
    useBackupStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    if (backupName.trim() && !/^[a-zA-Z0-9_-]+$/.test(backupName.trim())) {
      alert('Nome do backup deve conter apenas letras, números, hífens e underscores');
      return;
    }

    setIsProcessing(true);
    try {
      const filename = await createBackup(backupName.trim() || undefined);
      alert(`Backup criado com sucesso: ${filename}`);
      setIsCreateModalOpen(false);
      setBackupName('');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Erro ao criar backup. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (
      !confirm(
        `Tem certeza que deseja restaurar o backup "${filename}"?\n\nTodos os dados atuais serão substituídos e a aplicação será reiniciada.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await restoreBackup(filename);
      // A página será recarregada automaticamente após o restore
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Erro ao restaurar backup. Tente novamente.');
      setIsProcessing(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Tem certeza que deseja excluir o backup "${filename}"?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteBackup(filename);
      alert('Backup excluído com sucesso');
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Erro ao excluir backup. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backup e Restauração</h1>
          <p className="text-muted-foreground">
            Gerencie backups do banco de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchBackups()}
            disabled={loading || isProcessing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} disabled={isProcessing}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Backup
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Backups Disponíveis</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum backup encontrado. Crie o primeiro backup para começar.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Arquivo</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell className="font-medium">
                      {backup.filename}
                    </TableCell>
                    <TableCell>{formatDate(backup.createdAt)}</TableCell>
                    <TableCell>{formatFileSize(backup.size)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={isProcessing}
                          title="Restaurar backup"
                        >
                          <Upload className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBackup(backup.filename)}
                          disabled={isProcessing}
                          title="Excluir backup"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backupName">
                Nome do Backup (Opcional)
              </Label>
              <Input
                id="backupName"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Ex: antes_da_atualizacao"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar apenas a data/hora. Use apenas letras,
                números, hífens e underscores.
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setBackupName('');
                }}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateBackup} disabled={isProcessing}>
                {isProcessing ? 'Criando...' : 'Criar Backup'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
