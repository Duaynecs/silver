import { useState, useEffect } from 'react';
import { usePaymentMethodsStore } from '@/stores/paymentMethodsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, CreditCard } from 'lucide-react';
import type { PaymentMethod } from '@/types';

export default function PaymentMethods() {
  const {
    paymentMethods,
    loading,
    fetchPaymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
  } = usePaymentMethodsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodName, setMethodName] = useState('');
  const [acceptsChange, setAcceptsChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleOpenModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setMethodName(method.name);
      setAcceptsChange(method.acceptsChange);
    } else {
      setEditingMethod(null);
      setMethodName('');
      setAcceptsChange(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
    setMethodName('');
    setAcceptsChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!methodName.trim()) {
      alert('Por favor, informe o nome da forma de pagamento');
      return;
    }

    setIsSaving(true);
    try {
      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, methodName.trim(), acceptsChange);
      } else {
        await addPaymentMethod(methodName.trim(), acceptsChange);
      }
      handleCloseModal();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Erro ao salvar forma de pagamento');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (confirm(`Tem certeza que deseja desativar a forma de pagamento "${method.name}"?`)) {
      try {
        await deletePaymentMethod(method.id);
      } catch (error) {
        alert('Erro ao desativar forma de pagamento');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            Formas de Pagamento
          </h1>
          <p className="text-muted-foreground">Gerenciamento de formas de pagamento aceitas</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Forma de Pagamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Formas de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma forma de pagamento cadastrada</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Aceita Troco</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-mono">{method.id}</TableCell>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell className="text-center">
                        {method.acceptsChange ? (
                          <span className="text-green-600 font-medium">Sim</span>
                        ) : (
                          <span className="text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(method)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(method)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="methodName">Nome *</Label>
              <Input
                id="methodName"
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
                placeholder="Ex: Dinheiro, PIX, Cartão..."
                disabled={isSaving}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="acceptsChange"
                checked={acceptsChange}
                onChange={(e) => setAcceptsChange(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="acceptsChange" className="cursor-pointer">
                Aceita troco (devolve dinheiro)
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
