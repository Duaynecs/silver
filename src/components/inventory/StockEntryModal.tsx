import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProductsStore } from '@/stores/productsStore';
import { useStockMovementsStore } from '@/stores/stockMovementsStore';
import { Search } from 'lucide-react';
import type { Product } from '@/types';

interface StockEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedProduct?: Product;
}

export default function StockEntryModal({
  open,
  onOpenChange,
  onSuccess,
  preSelectedProduct,
}: StockEntryModalProps) {
  const { products, fetchProducts } = useProductsStore();
  const { addEntry, loading } = useStockMovementsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preSelectedProduct || null);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (preSelectedProduct) {
      setSelectedProduct(preSelectedProduct);
      // Campo costPrice foi removido, deixa vazio para o usuário preencher
      setUnitCost('');
    }
  }, [preSelectedProduct]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.barcode?.toLowerCase().includes(search)
      );
      setFilteredProducts(filtered.slice(0, 10));
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) {
      setError('Selecione um produto');
      return;
    }

    const qty = parseInt(quantity);
    const cost = parseFloat(unitCost);

    if (isNaN(qty) || qty <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (isNaN(cost) || cost < 0) {
      setError('Custo unitário inválido');
      return;
    }

    try {
      await addEntry(selectedProduct.id, qty, cost, notes || undefined);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar entrada');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedProduct(preSelectedProduct || null);
      setSearchTerm('');
      setQuantity('');
      setUnitCost('');
      setNotes('');
      setError('');
      setFilteredProducts([]);
      onOpenChange(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // Campo costPrice foi removido, deixa vazio para o usuário preencher
    setUnitCost('');
    setSearchTerm('');
    setFilteredProducts([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrada de Mercadoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!preSelectedProduct && (
            <div className="space-y-2">
              <Label>Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome ou código do produto..."
                  className="pl-10"
                  disabled={loading || !!selectedProduct}
                />
              </div>

              {filteredProducts.length > 0 && !selectedProduct && (
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.barcode && `Código: ${product.barcode} • `}
                        Estoque atual: {product.stockQuantity}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedProduct && (
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{selectedProduct.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedProduct.barcode && `Código: ${selectedProduct.barcode} • `}
                Estoque atual: {selectedProduct.stockQuantity}
              </div>
              {!preSelectedProduct && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                  className="mt-2"
                >
                  Trocar produto
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                disabled={loading || !selectedProduct}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Custo Unitário (R$) *</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
                disabled={loading || !selectedProduct}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações sobre a entrada (opcional)"
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedProduct}>
              {loading ? 'Salvando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
