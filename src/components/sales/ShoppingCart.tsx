import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Minus, Plus } from 'lucide-react';
import type { SaleItemInput } from '@/types';

interface ShoppingCartProps {
  items: SaleItemInput[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  hasPayments: boolean;
}

export default function ShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  discount,
  onDiscountChange,
  hasPayments,
}: ShoppingCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  const handleBlockedAction = () => {
    alert('Não é possível alterar os itens do carrinho após adicionar pagamentos. Remova os pagamentos primeiro.');
  };

  return (
    <div className="space-y-4">
      {hasPayments && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          ⚠️ Itens bloqueados: remova os pagamentos para alterar o carrinho
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Carrinho vazio</p>
          <p className="text-sm">Adicione produtos para iniciar a venda</p>
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-32">Qtd</TableHead>
                  <TableHead className="w-28 text-right">Preço Unit.</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        {item.product.barcode && (
                          <div className="text-sm text-muted-foreground">
                            Código: {item.product.barcode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => hasPayments ? handleBlockedAction() : onUpdateQuantity(index, item.quantity - 1)}
                          disabled={item.quantity <= 1 || hasPayments}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            if (hasPayments) {
                              handleBlockedAction();
                              return;
                            }
                            const qty = parseInt(e.target.value) || 1;
                            onUpdateQuantity(index, Math.max(1, qty));
                          }}
                          className="w-16 text-center"
                          disabled={hasPayments}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => hasPayments ? handleBlockedAction() : onUpdateQuantity(index, item.quantity + 1)}
                          disabled={hasPayments}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {item.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => hasPayments ? handleBlockedAction() : onRemoveItem(index)}
                        disabled={hasPayments}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 p-4 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span>Subtotal:</span>
              <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span>Desconto:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={discount}
                  onChange={(e) => {
                    if (hasPayments) {
                      handleBlockedAction();
                      return;
                    }
                    const value = parseFloat(e.target.value) || 0;
                    onDiscountChange(Math.min(value, subtotal));
                  }}
                  className="w-24 text-right"
                  disabled={hasPayments}
                />
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
