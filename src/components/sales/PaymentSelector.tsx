import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePaymentMethodsStore } from '@/stores/paymentMethodsStore';
import type { PaymentInput } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PaymentSelectorProps {
  payments: PaymentInput[];
  remainingAmount: number;
  changeAmount: number;
  onAddPayment: (payment: PaymentInput) => void;
  onRemovePayment: (index: number) => void;
}

export default function PaymentSelector({
  payments,
  remainingAmount,
  changeAmount,
  onAddPayment,
  onRemovePayment,
}: PaymentSelectorProps) {
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethodsStore();
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [amount, setAmount] = useState(remainingAmount.toString());

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  useEffect(() => {
    // Atualiza o valor sugerido quando o valor restante muda
    if (remainingAmount > 0) {
      setAmount(remainingAmount.toFixed(2));
    }
  }, [remainingAmount]);

  const handleAddPayment = () => {
    if (!selectedMethodId || !amount) {
      alert('Selecione uma forma de pagamento e informe o valor');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Valor inválido');
      return;
    }

    const paymentMethod = paymentMethods.find(
      (pm) => pm.id === parseInt(selectedMethodId)
    );
    if (!paymentMethod) {
      alert('Forma de pagamento não encontrada');
      return;
    }

    // Se o método não aceita troco, valida se o valor não é maior que o restante
    if (!paymentMethod.acceptsChange) {
      const epsilon = 0.01;
      if (paymentAmount > remainingAmount + epsilon) {
        alert(
          `Valor do pagamento (R$ ${paymentAmount.toFixed(
            2
          )}) maior que o valor restante (R$ ${remainingAmount.toFixed(
            2
          )}). Esta forma de pagamento não aceita troco.`
        );
        return;
      }
    }

    onAddPayment({
      paymentMethod,
      amount: paymentAmount,
    });

    // Reset
    setSelectedMethodId('');
    setAmount('');
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,100px,auto] gap-2 items-end">
        <div className="space-y-2">
          <Label className="text-xs">Forma de Pagamento</Label>
          <Select
            value={selectedMethodId || "none"}
            onValueChange={(value) => setSelectedMethodId(value === "none" ? "" : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione...</SelectItem>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id.toString()}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Valor</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-9"
          />
        </div>

        <Button
          type="button"
          onClick={handleAddPayment}
          disabled={remainingAmount <= 0}
          size="sm"
          className="h-9"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {payments.length > 0 && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell>{payment.paymentMethod.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {payment.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePayment(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="p-4 bg-muted rounded-md space-y-2">
        <div className="flex justify-between items-center">
          <span>Total Pago:</span>
          <span className="font-medium">R$ {totalPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">Valor Restante:</span>
          <span
            className={`text-lg font-bold ${
              remainingAmount > 0 ? 'text-destructive' : 'text-green-600'
            }`}
          >
            R$ {remainingAmount.toFixed(2)}
          </span>
        </div>
        {changeAmount > 0 && (
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-bold text-green-600">Troco:</span>
            <span className="text-lg font-bold text-green-600">
              R$ {changeAmount.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
