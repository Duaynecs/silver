import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProductsStore } from '@/stores/productsStore';
import type { Product } from '@/types';
import { Search, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProductSelectorProps {
  onProductSelected: (product: Product, quantity: number) => void;
}

export default function ProductSelector({
  onProductSelected,
}: ProductSelectorProps) {
  const { products, fetchProducts } = useProductsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [productImages, setProductImages] = useState<Record<number, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // Filtra produtos conforme digitação
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.barcode?.toLowerCase().includes(search) ||
          p.category?.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search)
      );
      setFilteredProducts(filtered.slice(0, 10)); // Limita a 10 resultados
      setSelectedIndex(0);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  // Load images for filtered products
  useEffect(() => {
    const images: Record<number, string> = {};
    for (const product of filteredProducts) {
      if (product.imagePath) {
        // Use custom protocol for serving images
        images[product.id] = `silver-image://${product.imagePath}`;
      }
    }
    setProductImages(images);
  }, [filteredProducts]);

  // Detector de leitura de código de barras
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isScanning) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      if (timeDiff > 100) {
        scanBufferRef.current = '';
      }

      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter' && scanBufferRef.current.length > 0) {
        e.preventDefault();
        handleBarcodeScanned(scanBufferRef.current);
        scanBufferRef.current = '';
        setIsScanning(false);
        return;
      }

      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
      }
    };

    if (isScanning) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isScanning]);

  const handleBarcodeScanned = async (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      handleSelectProduct(product);
    } else {
      alert(`Produto com código ${barcode} não encontrado`);
    }
  };

  const handleSelectProduct = (product: Product) => {
    if (product.stockQuantity < quantity) {
      alert(`Estoque insuficiente! Disponível: ${product.stockQuantity}`);
      return;
    }

    onProductSelected(product, quantity);
    setSearchTerm('');
    setFilteredProducts([]);
    setQuantity(1);
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredProducts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[selectedIndex]) {
        handleSelectProduct(filteredProducts[selectedIndex]);
      }
    }
  };

  const handleStartScan = () => {
    setIsScanning(true);
    scanBufferRef.current = '';
    lastKeyTimeRef.current = 0;
    setTimeout(() => setIsScanning(false), 10000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,auto,100px] gap-2">
        <div className="space-y-2">
          <Label>Buscar Produto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite o nome, código ou descrição do produto..."
              className={`pl-10 ${isScanning ? 'ring-2 ring-primary' : ''}`}
              disabled={isScanning}
            />
          </div>
        </div>

        {/* <div className="space-y-2">
          <Label>Ações</Label>
          <Button
            type="button"
            variant={isScanning ? 'default' : 'outline'}
            onClick={handleStartScan}
            disabled={isScanning}
          >
            <Barcode className="w-4 h-4 mr-2" />
            {isScanning ? 'Escaneando...' : 'Escanear'}
          </Button>
        </div> */}

        <div className="space-y-2">
          <Label>Qtd</Label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
          />
        </div>
      </div>

      {filteredProducts.length > 0 && (
        <Card className="absolute z-10 w-full max-w-2xl max-h-[400px] overflow-y-auto">
          <div className="divide-y">
            {filteredProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className={`w-full p-3 text-left hover:bg-accent transition-colors ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
              >
                <div className="flex gap-3 items-start">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-16 h-16 rounded border bg-muted flex items-center justify-center overflow-hidden">
                    {productImages[product.id] ? (
                      <img
                        src={productImages[product.id]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-sm text-muted-foreground mt-0.5 truncate">
                        {product.description}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">
                      {product.barcode && `Código: ${product.barcode} • `}
                      {product.category && `${product.category} • `}
                      Estoque: {product.stockQuantity}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-primary">
                      R$ {product.salePrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
