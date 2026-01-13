import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, XCircle, Calendar, User } from 'lucide-react';
import { useProductsStore } from '@/stores/productsStore';

interface ProtocolDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolNumber: string;
  onProtocolCancelled?: () => void;
}

interface StockProtocolMovement {
  id: number;
  protocolId: number;
  productId: number;
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  createdAt: number;
}

interface ProtocolDetails {
  id: number;
  protocolNumber: string;
  type: string;
  status: string;
  referenceId?: number;
  referenceType?: string;
  createdAt: number;
  cancelledAt?: number;
  cancelledBy?: number;
  notes?: string;
  movements: StockProtocolMovement[];
}

const PROTOCOL_TYPE_LABELS: Record<string, string> = {
  sale: 'Venda',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  zero_stock: 'Zeramento',
  inventory: 'Inventário',
};

export default function ProtocolDetailsModal({
  open,
  onOpenChange,
  protocolNumber,
  onProtocolCancelled,
}: ProtocolDetailsModalProps) {
  const { products } = useProductsStore();
  const [protocol, setProtocol] = useState<ProtocolDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (open && protocolNumber) {
      loadProtocolDetails();
    }
  }, [open, protocolNumber]);

  const loadProtocolDetails = async () => {
    setLoading(true);
    try {
      const result = await window.electron.protocol.get(protocolNumber);
      setProtocol(result);
    } catch (error) {
      console.error('Erro ao carregar detalhes do protocolo:', error);
      alert('Erro ao carregar detalhes do protocolo');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProtocol = async () => {
    if (!protocol) return;

    const confirmed = confirm(
      `Tem certeza que deseja cancelar o protocolo ${protocol.protocolNumber}?\n\n` +
      `Esta ação irá reverter todas as ${protocol.movements.length} movimentações de estoque deste protocolo.`
    );

    if (!confirmed) return;

    setCancelling(true);
    try {
      await window.electron.protocol.cancel(protocol.protocolNumber);
      alert(`Protocolo ${protocol.protocolNumber} cancelado com sucesso!`);
      onProtocolCancelled?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao cancelar protocolo:', error);
      alert(error.message || 'Erro ao cancelar protocolo');
    } finally {
      setCancelling(false);
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Produto ID ${productId}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!protocol && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalhes do Protocolo
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre as movimentações de estoque
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando detalhes...
          </div>
        ) : protocol ? (
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número do Protocolo</p>
                  <p className="font-mono font-bold text-lg">{protocol.protocolNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {PROTOCOL_TYPE_LABELS[protocol.type] || protocol.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {protocol.status === 'active' ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        Cancelado
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Data de Criação
                  </p>
                  <p className="font-medium text-sm">{formatDate(protocol.createdAt)}</p>
                </div>
              </div>

              {protocol.cancelledAt && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Cancelado em
                  </p>
                  <p className="font-medium text-sm text-red-600">
                    {formatDate(protocol.cancelledAt)}
                  </p>
                </div>
              )}

              {protocol.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm mt-1">{protocol.notes}</p>
                </div>
              )}
            </div>

            {/* Resumo de Movimentações */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                📊 Resumo das Movimentações
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total de Produtos</p>
                  <p className="font-bold text-lg">{protocol.movements.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantidade Movida</p>
                  <p className="font-bold text-lg">
                    {protocol.movements.reduce((sum, m) => sum + Math.abs(m.quantityChanged), 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo de Movimento</p>
                  <p className="font-bold text-lg">
                    {protocol.movements[0]?.quantityChanged > 0 ? 'Entrada' : 'Saída'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabela de Movimentações */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Movimentações de Estoque ({protocol.movements.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd. Anterior</TableHead>
                      <TableHead className="text-right">Qtd. Alterada</TableHead>
                      <TableHead className="text-right">Qtd. Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {protocol.movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">
                          {getProductName(movement.productId)}
                          <span className="text-xs text-muted-foreground ml-2">
                            (ID: {movement.productId})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {movement.quantityBefore.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span
                            className={
                              movement.quantityChanged > 0
                                ? 'text-green-600 font-semibold'
                                : 'text-red-600 font-semibold'
                            }
                          >
                            {movement.quantityChanged > 0 ? '+' : ''}
                            {movement.quantityChanged.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {movement.quantityAfter.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Alerta se protocolo estiver ativo */}
            {protocol.status === 'active' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-1">
                      Este protocolo está ativo
                    </p>
                    <p className="text-yellow-700">
                      Você pode cancelar este protocolo para reverter todas as movimentações
                      de estoque. Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Protocolo não encontrado
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {protocol && protocol.status === 'active' && (
            <Button
              variant="destructive"
              onClick={handleCancelProtocol}
              disabled={cancelling}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {cancelling ? 'Cancelando...' : 'Cancelar Protocolo'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
