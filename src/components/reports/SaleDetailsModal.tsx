import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReportsStore, type SaleDetail } from '@/stores/reportsStore';

interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: number | null;
}

export default function SaleDetailsModal({
  open,
  onOpenChange,
  saleId,
}: SaleDetailsModalProps) {
  const { fetchSaleDetails } = useReportsStore();
  const [saleDetails, setSaleDetails] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && saleId) {
      loadSaleDetails();
    }
  }, [open, saleId]);

  const loadSaleDetails = async () => {
    if (!saleId) return;

    setLoading(true);
    try {
      const details = await fetchSaleDetails(saleId);
      setSaleDetails(details);
    } catch (error) {
      console.error('Error loading sale details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        )}

        {!loading && !saleDetails && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Venda não encontrada</p>
          </div>
        )}

        {!loading && saleDetails && (
          <div className="space-y-4">
            {/* Cabeçalho da Venda */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
              <div>
                <p className="text-sm text-muted-foreground">Número da Venda</p>
                <p className="font-bold">{saleDetails.saleNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data/Hora</p>
                <p className="font-medium">{formatDate(saleDetails.saleDate)}</p>
              </div>
              {saleDetails.customerName && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{saleDetails.customerName}</p>
                </div>
              )}
            </div>

            {/* Itens da Venda */}
            <div>
              <h3 className="font-semibold mb-2">Itens da Venda</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Desc.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleDetails.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagamentos */}
            <div>
              <h3 className="font-semibold mb-2">Formas de Pagamento</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleDetails.payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {payment.paymentMethodName}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totais */}
            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(saleDetails.totalAmount)}</span>
              </div>
              {saleDetails.discount > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span>Desconto:</span>
                  <span className="font-medium">-{formatCurrency(saleDetails.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(saleDetails.finalAmount)}</span>
              </div>
              {saleDetails.changeAmount > 0 && (
                <div className="flex justify-between items-center text-green-600 border-t pt-2">
                  <span className="font-bold">Troco:</span>
                  <span className="font-bold">{formatCurrency(saleDetails.changeAmount)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
