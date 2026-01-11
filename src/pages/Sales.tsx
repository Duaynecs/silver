import { useState, useEffect } from 'react';
import { useCashRegisterStore } from '@/stores/cashRegisterStore';
import { useSalesStore } from '@/stores/salesStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, XCircle, CheckCircle } from 'lucide-react';
import OpenRegisterModal from '@/components/sales/OpenRegisterModal';
import CloseRegisterModal from '@/components/sales/CloseRegisterModal';
import ProductSelector from '@/components/sales/ProductSelector';
import CustomerSelector from '@/components/sales/CustomerSelector';
import ShoppingCart from '@/components/sales/ShoppingCart';
import PaymentSelector from '@/components/sales/PaymentSelector';
import type { Product, Customer } from '@/types';

export default function Sales() {
  const { currentRegister, getCurrentRegister } = useCashRegisterStore();
  const {
    currentSale,
    addItem,
    removeItem,
    updateItemQuantity,
    setDiscount,
    setCustomer,
    addPayment,
    removePayment,
    getFinalAmount,
    getRemainingAmount,
    getChangeAmount,
    completeSale,
    clearSale,
  } = useSalesStore();

  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [closeRegisterModal, setCloseRegisterModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    getCurrentRegister();
  }, [getCurrentRegister]);

  const handleProductSelected = (product: Product, quantity: number) => {
    addItem({
      product,
      quantity,
      unitPrice: product.salePrice,
      discount: 0,
      total: product.salePrice * quantity,
    });
  };

  const handleCustomerSelected = (customer: Customer | null) => {
    setCustomer(customer?.id);
  };

  const handleCompleteSale = async () => {
    if (!currentRegister) {
      alert('Nenhum caixa aberto');
      return;
    }

    if (currentSale.items.length === 0) {
      alert('Adicione produtos ao carrinho');
      return;
    }

    const remaining = getRemainingAmount();
    // Permite uma pequena margem de erro por causa de arredondamento (1 centavo)
    const epsilon = 0.01;
    if (remaining > epsilon) {
      alert(`Pagamento incompleto. Faltam R$ ${remaining.toFixed(2)}`);
      return;
    }

    if (confirm('Confirma a finalização da venda?')) {
      setIsProcessing(true);
      try {
        const saleNumber = await completeSale(currentRegister.id);
        alert(`Venda ${saleNumber} finalizada com sucesso!`);
      } catch (error: any) {
        alert(error.message || 'Erro ao finalizar venda');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCancelSale = () => {
    if (currentSale.items.length > 0) {
      if (confirm('Deseja cancelar a venda atual?')) {
        clearSale();
      }
    }
  };

  // Se não há caixa aberto, mostra apenas o botão de abrir
  if (!currentRegister) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">PDV - Ponto de Venda</h1>
          <p className="text-muted-foreground">Sistema de vendas</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <DollarSign className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Nenhum caixa aberto</p>
                <p className="text-sm text-muted-foreground">
                  Abra o caixa para iniciar as vendas
                </p>
              </div>
              <Button onClick={() => setOpenRegisterModal(true)}>
                Abrir Caixa
              </Button>
            </div>
          </CardContent>
        </Card>

        <OpenRegisterModal
          open={openRegisterModal}
          onOpenChange={setOpenRegisterModal}
          onSuccess={() => getCurrentRegister()}
        />
      </div>
    );
  }

  // Tela principal de vendas
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDV - Ponto de Venda</h1>
          <p className="text-sm text-muted-foreground">
            Caixa aberto • Valor inicial: R$ {(currentRegister.initialAmount ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCloseRegisterModal(true)}
          >
            Fechar Caixa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr,400px] gap-4">
        {/* Coluna esquerda: Produtos e Carrinho */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cliente e Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CustomerSelector
                selectedCustomerId={currentSale.customerId}
                onCustomerSelected={handleCustomerSelected}
              />
              <div className="border-t pt-4">
                <ProductSelector onProductSelected={handleProductSelected} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Carrinho de Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <ShoppingCart
                items={currentSale.items}
                onUpdateQuantity={updateItemQuantity}
                onRemoveItem={removeItem}
                discount={currentSale.discount}
                onDiscountChange={setDiscount}
                hasPayments={currentSale.payments.length > 0}
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Pagamento e Finalização */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentSelector
                payments={currentSale.payments}
                remainingAmount={getRemainingAmount()}
                changeAmount={getChangeAmount()}
                onAddPayment={addPayment}
                onRemovePayment={removePayment}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-primary/10 rounded-md">
                <div className="text-sm text-muted-foreground mb-1">Total a Pagar</div>
                <div className="text-3xl font-bold text-primary">
                  R$ {getFinalAmount().toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelSale}
                  disabled={isProcessing || currentSale.items.length === 0}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleCompleteSale}
                  disabled={isProcessing || currentSale.items.length === 0 || getRemainingAmount() > 0.01}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <OpenRegisterModal
        open={openRegisterModal}
        onOpenChange={setOpenRegisterModal}
        onSuccess={() => getCurrentRegister()}
      />

      <CloseRegisterModal
        open={closeRegisterModal}
        onOpenChange={setCloseRegisterModal}
        onSuccess={() => {
          getCurrentRegister();
          clearSale();
        }}
      />
    </div>
  );
}
