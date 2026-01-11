import { useState, useEffect } from 'react';
import { useProductsStore } from '@/stores/productsStore';
import { useStockMovementsStore } from '@/stores/stockMovementsStore';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackagePlus, PackageCheck, Search, AlertTriangle, History, Trash2 } from 'lucide-react';
import StockEntryModal from '@/components/inventory/StockEntryModal';
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal';
import ZeroStockModal from '@/components/inventory/ZeroStockModal';
import type { Product } from '@/types';

export default function Inventory() {
  const { products, loading, fetchProducts } = useProductsStore();
  const { movements, fetchMovements } = useStockMovementsStore();
  const { fetchCategories } = useCategoriesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [zeroStockModalOpen, setZeroStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [showMovements, setShowMovements] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchMovements();
    fetchCategories();
  }, [fetchProducts, fetchMovements, fetchCategories]);

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.barcode?.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search)
    );
  });

  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.minStock && p.stockQuantity > 0
  );

  const outOfStockProducts = products.filter((p) => p.stockQuantity === 0);

  const handleEntryClick = (product?: Product) => {
    setSelectedProduct(product);
    setEntryModalOpen(true);
  };

  const handleAdjustmentClick = (product?: Product) => {
    setSelectedProduct(product);
    setAdjustmentModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchProducts();
    fetchMovements();
    setSelectedProduct(undefined);
  };

  const handleZeroStockSuccess = () => {
    fetchProducts();
    fetchMovements();
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

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      entrada: 'Entrada',
      saida: 'Saída',
      ajuste: 'Ajuste',
      inventario: 'Inventário',
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventário</h1>
          <p className="text-muted-foreground">Controle de estoque e movimentações</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showMovements ? 'default' : 'outline'}
            onClick={() => setShowMovements(!showMovements)}
          >
            <History className="w-4 h-4 mr-2" />
            {showMovements ? 'Ver Produtos' : 'Ver Movimentações'}
          </Button>
          <Button variant="outline" onClick={() => handleEntryClick()}>
            <PackagePlus className="w-4 h-4 mr-2" />
            Entrada de Mercadoria
          </Button>
          <Button variant="outline" onClick={() => handleAdjustmentClick()}>
            <PackageCheck className="w-4 h-4 mr-2" />
            Ajuste de Estoque
          </Button>
          <Button variant="destructive" onClick={() => setZeroStockModalOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Zerar Estoque
          </Button>
        </div>
      </div>

      {/* Alertas de Estoque */}
      {!showMovements && (lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {outOfStockProducts.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Produtos sem Estoque ({outOfStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {outOfStockProducts.slice(0, 3).map((p) => (
                    <div key={p.id}>{p.name}</div>
                  ))}
                  {outOfStockProducts.length > 3 && (
                    <div>+ {outOfStockProducts.length - 3} outros</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockProducts.length > 0 && (
            <Card className="border-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Estoque Baixo ({lowStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {lowStockProducts.slice(0, 3).map((p) => (
                    <div key={p.id}>
                      {p.name} ({p.stockQuantity} un.)
                    </div>
                  ))}
                  {lowStockProducts.length > 3 && (
                    <div>+ {lowStockProducts.length - 3} outros</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Visualização de Produtos */}
      {!showMovements && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produtos em Estoque</CardTitle>
              <div className="flex items-center gap-2 w-80">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Estoque Atual</TableHead>
                      <TableHead className="text-center">Estoque Mínimo</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.barcode && (
                              <div className="text-sm text-muted-foreground">
                                Código: {product.barcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-medium ${
                              product.stockQuantity === 0
                                ? 'text-destructive'
                                : product.stockQuantity <= product.minStock
                                ? 'text-orange-500'
                                : ''
                            }`}
                          >
                            {product.stockQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{product.minStock}</TableCell>
                        <TableCell className="text-right">
                          R$ {(product.salePrice || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {((product.salePrice || 0) * product.stockQuantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEntryClick(product)}
                              title="Entrada"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdjustmentClick(product)}
                              title="Ajuste"
                            >
                              <PackageCheck className="w-4 h-4" />
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
      )}

      {/* Visualização de Movimentações */}
      {showMovements && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma movimentação registrada.</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm">
                          {formatDate(movement.movementDate)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{movement.productName}</div>
                            {movement.productBarcode && (
                              <div className="text-sm text-muted-foreground">
                                {movement.productBarcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              movement.type === 'entrada'
                                ? 'bg-green-100 text-green-800'
                                : movement.type === 'saida'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {getMovementTypeLabel(movement.type)}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {movement.quantity > 0 ? '+' : ''}
                          {movement.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {movement.unitCost ? `R$ ${movement.unitCost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <StockEntryModal
        open={entryModalOpen}
        onOpenChange={setEntryModalOpen}
        onSuccess={handleModalSuccess}
        preSelectedProduct={selectedProduct}
      />

      <StockAdjustmentModal
        open={adjustmentModalOpen}
        onOpenChange={setAdjustmentModalOpen}
        onSuccess={handleModalSuccess}
        preSelectedProduct={selectedProduct}
      />

      <ZeroStockModal
        open={zeroStockModalOpen}
        onOpenChange={setZeroStockModalOpen}
        onSuccess={handleZeroStockSuccess}
      />
    </div>
  );
}
