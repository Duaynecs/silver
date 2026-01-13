import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Filter, Eye, XCircle, Calendar } from 'lucide-react';
import ProtocolDetailsModal from '@/components/protocols/ProtocolDetailsModal';

interface Protocol {
  id: number;
  protocolNumber: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'zero_stock' | 'inventory';
  status: 'active' | 'cancelled';
  referenceId?: number;
  referenceType?: string;
  createdAt: number;
  cancelledAt?: number;
  cancelledBy?: number;
  notes?: string;
}

const PROTOCOL_TYPE_LABELS = {
  sale: 'Venda',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  zero_stock: 'Zeramento',
  inventory: 'Inventário',
};

const PROTOCOL_TYPE_COLORS = {
  sale: 'bg-green-100 text-green-800',
  purchase: 'bg-blue-100 text-blue-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
  zero_stock: 'bg-red-100 text-red-800',
  inventory: 'bg-purple-100 text-purple-800',
};

export default function Protocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Filtros
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProtocolNumber, setFilterProtocolNumber] = useState('');

  useEffect(() => {
    loadProtocols();
  }, []);

  const loadProtocols = async () => {
    setLoading(true);
    try {
      const filters: any = {};

      if (filterType !== 'all') {
        filters.type = filterType;
      }

      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }

      if (filterStartDate) {
        filters.startDate = new Date(filterStartDate).getTime();
      }

      if (filterEndDate) {
        filters.endDate = new Date(filterEndDate + 'T23:59:59').getTime();
      }

      const result = await window.electron.protocol.list(filters);
      setProtocols(result || []);
    } catch (error) {
      console.error('Erro ao carregar protocolos:', error);
      alert('Erro ao carregar protocolos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (protocolNumber: string) => {
    setSelectedProtocol(protocolNumber);
    setDetailsModalOpen(true);
  };

  const handleCancelProtocol = async (protocolNumber: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja cancelar o protocolo ${protocolNumber}?\n\n` +
      `Esta ação irá reverter todas as movimentações de estoque deste protocolo.`
    );

    if (!confirmed) return;

    try {
      await window.electron.protocol.cancel(protocolNumber);
      alert(`Protocolo ${protocolNumber} cancelado com sucesso!`);
      loadProtocols(); // Recarrega a lista
    } catch (error: any) {
      console.error('Erro ao cancelar protocolo:', error);
      alert(error.message || 'Erro ao cancelar protocolo');
    }
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

  // Filtrar protocolos localmente pelo número do protocolo
  const filteredProtocols = protocols.filter(protocol => {
    if (!filterProtocolNumber) return true;
    return protocol.protocolNumber.toLowerCase().includes(filterProtocolNumber.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Protocolos de Estoque
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todos os protocolos de movimentação de estoque
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre os protocolos por tipo, status e período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Número do Protocolo</Label>
              <Input
                placeholder="Ex: PRT-2024-000001"
                value={filterProtocolNumber}
                onChange={(e) => setFilterProtocolNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="purchase">Compra</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="zero_stock">Zeramento</SelectItem>
                  <SelectItem value="inventory">Inventário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={loadProtocols} disabled={loading}>
              {loading ? 'Carregando...' : 'Aplicar Filtros'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterProtocolNumber('');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Protocolos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Protocolos Registrados ({filteredProtocols.length})
          </CardTitle>
          <CardDescription>
            Lista de todos os protocolos de movimentação de estoque
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProtocols.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum protocolo encontrado com os filtros selecionados</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProtocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-mono font-medium">
                        {protocol.protocolNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PROTOCOL_TYPE_COLORS[protocol.type]}
                        >
                          {PROTOCOL_TYPE_LABELS[protocol.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {protocol.status === 'active' ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            Cancelado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(protocol.createdAt)}
                        </div>
                        {protocol.cancelledAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Cancelado: {formatDate(protocol.cancelledAt)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {protocol.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(protocol.protocolNumber)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Detalhes
                          </Button>
                          {protocol.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelProtocol(protocol.protocolNumber)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
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

      {/* Modal de Detalhes */}
      {selectedProtocol && (
        <ProtocolDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          protocolNumber={selectedProtocol}
          onProtocolCancelled={loadProtocols}
        />
      )}
    </div>
  );
}
