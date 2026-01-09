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

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedProduct?: Product;
}

export default function StockAdjustmentModal({
  open,
  onOpenChange,
  onSuccess,
  preSelectedProduct,
}: StockAdjustmentModalProps) {
  const { products, fetchProducts } = useProductsStore();
  const { addAdjustment, loading } = useStockMovementsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preSelectedProduct || null);
  const [newQuantity, setNewQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (preSelectedProduct) {
      setSelectedProduct(preSelectedProduct);
      setNewQuantity(preSelectedProduct.stockQuantity.toString());
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

    const qty = parseInt(newQuantity);

    if (isNaN(qty) || qty < 0) {
      setError('Quantidade inválida');
      return;
    }

    try {
      await addAdjustment(selectedProduct.id, qty, notes || undefined);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar ajuste');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedProduct(preSelectedProduct || null);
      setSearchTerm('');
      setNewQuantity('');
      setNotes('');
      setError('');
      setFilteredProducts([]);
      onOpenChange(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setNewQuantity(product.stockQuantity.toString());
    setSearchTerm('');
    setFilteredProducts([]);
  };

  const difference = selectedProduct && newQuantity
    ? parseInt(newQuantity) - selectedProduct.stockQuantity
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de Estoque</DialogTitle>
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
            <>
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

              <div className="space-y-2">
                <Label htmlFor="newQuantity">Nova Quantidade *</Label>
                <Input
                  id="newQuantity"
                  type="number"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="0"
                  disabled={loading}
                  required
                  autoFocus
                />
                {newQuantity && (
                  <p className="text-sm">
                    {difference > 0 && (
                      <span className="text-green-600">+{difference} unidades (entrada)</span>
                    )}
                    {difference < 0 && (
                      <span className="text-red-600">{difference} unidades (saída)</span>
                    )}
                    {difference === 0 && (
                      <span className="text-muted-foreground">Sem alteração</span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Motivo do Ajuste *</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o motivo do ajuste (inventário, perda, dano, etc.)"
              rows={3}
              disabled={loading}
              required
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
            <Button type="submit" disabled={loading || !selectedProduct || difference === 0}>
              {loading ? 'Salvando...' : 'Registrar Ajuste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
