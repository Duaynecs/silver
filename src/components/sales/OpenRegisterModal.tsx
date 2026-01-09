import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCashRegisterStore } from '@/stores/cashRegisterStore';

interface OpenRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function OpenRegisterModal({ open, onOpenChange, onSuccess }: OpenRegisterModalProps) {
  const { openRegister, loading } = useCashRegisterStore();
  const [initialAmount, setInitialAmount] = useState('0');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Valor inicial inválido');
      return;
    }

    try {
      await openRegister(amount);
      setInitialAmount('0');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir caixa');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setInitialAmount('0');
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initialAmount">Valor Inicial (R$)</Label>
            <Input
              id="initialAmount"
              type="number"
              step="0.01"
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="0.00"
              disabled={loading}
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              Digite o valor em dinheiro que está no caixa para iniciar as vendas
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
