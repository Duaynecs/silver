import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { useProductsStore } from '@/stores/productsStore';
import { useCompaniesStore } from '@/stores/companiesStore';

interface ZeroStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ZeroStockModal({
  open,
  onOpenChange,
  onSuccess,
}: ZeroStockModalProps) {
  const { categories } = useCategoriesStore();
  const { products } = useProductsStore();
  const { currentCompanyId } = useCompaniesStore();

  const [step, setStep] = useState(1);
  const [scope, setScope] = useState<'all' | 'category'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const CONFIRMATION_PHRASE = 'ZERAR ESTOQUE';

  useEffect(() => {
    if (!open) {
      // Reset ao fechar
      setStep(1);
      setScope('all');
      setSelectedCategory('');
      setConfirmationText('');
      setIsProcessing(false);
    }
  }, [open]);

  const getAffectedProductsCount = () => {
    if (scope === 'all') {
      return products.filter(p => p.stockQuantity > 0).length;
    } else {
      return products.filter(
        p => p.category === selectedCategory && p.stockQuantity > 0
      ).length;
    }
  };

  const getTotalStockValue = () => {
    const affectedProducts = scope === 'all'
      ? products.filter(p => p.stockQuantity > 0)
      : products.filter(p => p.category === selectedCategory && p.stockQuantity > 0);

    return affectedProducts.reduce(
      (sum, p) => sum + (p.stockQuantity * (p.salePrice || 0)),
      0
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (scope === 'category' && !selectedCategory) {
        alert('Por favor, selecione uma categoria');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleConfirm = async () => {
    if (!currentCompanyId) {
      alert('Nenhuma empresa selecionada. Por favor, selecione uma empresa antes de zerar o estoque.');
      return;
    }

    if (confirmationText !== CONFIRMATION_PHRASE) {
      alert(`Digite exatamente: ${CONFIRMATION_PHRASE}`);
      return;
    }

    setIsProcessing(true);

    try {
      let result;
      if (scope === 'all') {
        result = await window.electron.inventory.zeroAllStock(currentCompanyId);
      } else {
        result = await window.electron.inventory.zeroStockByCategory(currentCompanyId, selectedCategory);
      }

      if (result.protocolNumber) {
        alert(
          `Estoque zerado com sucesso!\n\n` +
          `Produtos afetados: ${result.affectedProducts}\n` +
          `Protocolo: ${result.protocolNumber}\n\n` +
          `Este protocolo pode ser cancelado para reverter a operação.`
        );
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao zerar estoque:', error);
      alert(error.message || 'Erro ao zerar estoque');
    } finally {
      setIsProcessing(false);
    }
  };

  const affectedCount = getAffectedProductsCount();
  const totalValue = getTotalStockValue();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Zerar Estoque - Etapa {step} de 3
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível e irá zerar o estoque dos produtos selecionados.
          </DialogDescription>
        </DialogHeader>

        {/* Etapa 1: Seleção do escopo */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ ATENÇÃO: Esta operação é IRREVERSÍVEL
              </p>
              <p className="text-sm text-muted-foreground">
                Ao zerar o estoque, todos os produtos selecionados terão sua quantidade
                definida como zero. Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o que deseja zerar</Label>
                <Select
                  value={scope}
                  onValueChange={(value: 'all' | 'category') => {
                    setScope(value);
                    setSelectedCategory('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o estoque (todos os produtos)</SelectItem>
                    <SelectItem value="category">Estoque de uma categoria específica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === 'category' && (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Etapa 2: Resumo e revisão */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-800 mb-2">
                📊 Resumo da Operação
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escopo:</span>
                  <span className="font-medium">
                    {scope === 'all'
                      ? 'Todo o estoque'
                      : `Categoria: ${selectedCategory}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produtos afetados:</span>
                  <span className="font-medium text-destructive">{affectedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total em estoque:</span>
                  <span className="font-medium text-destructive">
                    R$ {totalValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ Você está prestes a:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Zerar o estoque de {affectedCount} produto(s)</li>
                <li>Eliminar R$ {totalValue.toFixed(2)} em valor de estoque</li>
                <li>Esta operação NÃO pode ser desfeita</li>
                {scope === 'category' && (
                  <li>Apenas produtos da categoria "{selectedCategory}" serão afetados</li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Revise cuidadosamente as informações acima antes de prosseguir.
              </p>
            </div>
          </div>
        )}

        {/* Etapa 3: Confirmação final */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-3">
                🔒 CONFIRMAÇÃO FINAL OBRIGATÓRIA
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Para confirmar que você está ciente de que esta ação é IRREVERSÍVEL
                e irá zerar o estoque de <strong>{affectedCount} produto(s)</strong>,
                digite exatamente a frase abaixo:
              </p>
              <div className="p-3 bg-background border rounded font-mono text-center text-lg font-bold">
                {CONFIRMATION_PHRASE}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">Digite a frase de confirmação</Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                className="font-mono text-center"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Cole ou digite exatamente como mostrado acima (incluindo maiúsculas)
              </p>
            </div>

            {confirmationText && confirmationText !== CONFIRMATION_PHRASE && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ⚠️ O texto não corresponde. Digite exatamente: <strong>{CONFIRMATION_PHRASE}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <div>
            {step > 1 && !isProcessing && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext} variant="destructive">
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={confirmationText !== CONFIRMATION_PHRASE || isProcessing}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isProcessing ? 'Zerando Estoque...' : 'Confirmar e Zerar Estoque'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
