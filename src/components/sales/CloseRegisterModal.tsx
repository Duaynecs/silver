import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCashRegisterStore } from '@/stores/cashRegisterStore';

interface CloseRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CloseRegisterModal({ open, onOpenChange, onSuccess }: CloseRegisterModalProps) {
  const { currentRegister, closeRegister, loading } = useCashRegisterStore();
  const [finalAmount, setFinalAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && currentRegister) {
      // Calcula o valor esperado
      calculateExpectedAmount();
    }
  }, [open, currentRegister]);

  const calculateExpectedAmount = async () => {
    if (!currentRegister) return;

    try {
      const result = await window.electron.db.query(
        `SELECT
          cr.initial_amount,
          COALESCE(SUM(s.final_amount), 0) as total_sales
        FROM cash_register cr
        LEFT JOIN sales s ON s.cash_register_id = cr.id AND s.status = 'completed'
        WHERE cr.id = ?
        GROUP BY cr.id`,
        [currentRegister.id]
      );

      if (result && result.length > 0) {
        const { initial_amount, total_sales } = result[0];
        setExpectedAmount(initial_amount + total_sales);
      }
    } catch (error) {
      console.error('Error calculating expected amount:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(finalAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Valor final inválido');
      return;
    }

    try {
      await closeRegister(amount, notes || undefined);
      setFinalAmount('0');
      setNotes('');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao fechar caixa');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFinalAmount('0');
      setNotes('');
      setError('');
      onOpenChange(false);
    }
  };

  const difference = parseFloat(finalAmount) - expectedAmount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Inicial</Label>
              <div className="p-2 bg-muted rounded-md text-center font-medium">
                R$ {(currentRegister?.initialAmount ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor Esperado</Label>
              <div className="p-2 bg-muted rounded-md text-center font-medium">
                R$ {expectedAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="finalAmount">Valor Final em Caixa (R$) *</Label>
            <Input
              id="finalAmount"
              type="number"
              step="0.01"
              min="0"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="0.00"
              disabled={loading}
              autoFocus
              required
            />
            <p className="text-sm text-muted-foreground">
              Conte todo o dinheiro que está no caixa
            </p>
          </div>

          {finalAmount && parseFloat(finalAmount) > 0 && (
            <div className="p-3 rounded-md bg-muted">
              <div className="flex justify-between items-center">
                <span className="font-medium">Diferença:</span>
                <span className={`text-lg font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {Math.abs(difference).toFixed(2)}
                  {difference > 0 && ' (sobra)'}
                  {difference < 0 && ' (falta)'}
                  {difference === 0 && ' (exato)'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o fechamento (opcional)"
              rows={3}
              disabled={loading}
            />
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
              {loading ? 'Fechando...' : 'Fechar Caixa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
