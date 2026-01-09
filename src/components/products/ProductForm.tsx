import CategoryForm from '@/components/categories/CategoryForm';
import BarcodeInput from '@/components/products/BarcodeInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CategoryFormData } from '@/schemas/categorySchema';
import { productSchema, type ProductFormData } from '@/schemas/productSchema';
import { useCategoriesStore } from '@/stores/categoriesStore';
import type { Product } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
}: ProductFormProps) {
  const { categories, fetchCategories, addCategory } = useCategoriesStore();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          barcode: product.barcode || '',
          name: product.name,
          description: product.description || '',
          salePrice: product.salePrice,
          stockQuantity: product.stockQuantity,
          minStock: product.minStock,
          category: product.category || '',
          active: product.active,
        }
      : {
          barcode: '',
          name: '',
          description: '',
          salePrice: 0,
          stockQuantity: 0,
          minStock: 0,
          category: '',
          active: true,
        },
  });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (data: CategoryFormData) => {
    setIsSubmittingCategory(true);
    try {
      // Chama addCategory que já faz o fetchCategories internamente
      await addCategory(data);

      // Aguardar um pouco para garantir que o estado foi atualizado
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Forçar recarregar as categorias para garantir que está atualizado
      await fetchCategories();

      // Seleciona automaticamente a categoria recém-criada
      setValue('category', data.name, { shouldValidate: true });

      // Fecha o modal após sucesso
      setIsCategoryModalOpen(false);
    } catch (error: any) {
      console.error('Error adding category:', error);

      // O erro já foi tratado no store, mas vamos mostrar uma mensagem mais amigável
      const errorMessage =
        error?.message?.includes('UNIQUE') ||
        error?.message?.includes('unique') ||
        error?.toString().includes('UNIQUE') ||
        error?.toString().includes('unique')
          ? 'Já existe uma categoria com este nome'
          : 'Erro ao adicionar categoria. Verifique o console para mais detalhes.';

      alert(errorMessage);

      // Não fecha o modal se houver erro, para o usuário poder tentar novamente
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="barcode">Código de Barras</Label>
          <BarcodeInput
            value={watch('barcode')}
            onChange={(value) =>
              setValue('barcode', value, { shouldValidate: true })
            }
            placeholder="EAN 13 ou EAN 8"
            error={errors.barcode?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <div className="flex gap-2">
            <Select
              id="category"
              {...register('category')}
              value={watch('category') || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('category', e.target.value)
              }
              className="flex-1"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsCategoryModalOpen(true)}
              title="Adicionar nova categoria"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {errors.category && (
            <p className="text-sm text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Produto *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Nome completo do produto"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Descrição detalhada do produto"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="salePrice">Preço de Venda *</Label>
        <Input
          id="salePrice"
          type="number"
          step="0.01"
          {...register('salePrice', { valueAsNumber: true })}
          placeholder="0.00"
        />
        {errors.salePrice && (
          <p className="text-sm text-destructive">
            {errors.salePrice.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stockQuantity">Quantidade em Estoque *</Label>
          <Input
            id="stockQuantity"
            type="number"
            {...register('stockQuantity', { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.stockQuantity && (
            <p className="text-sm text-destructive">
              {errors.stockQuantity.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minStock">Estoque Mínimo *</Label>
          <Input
            id="minStock"
            type="number"
            {...register('minStock', { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.minStock && (
            <p className="text-sm text-destructive">
              {errors.minStock.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          {...register('active')}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="active" className="cursor-pointer">
          Produto ativo
        </Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : product ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
      </form>

      {/* Dialog de categoria FORA do formulário para evitar event bubbling */}
      <Dialog
        open={isCategoryModalOpen}
        onOpenChange={(open) => {
          setIsCategoryModalOpen(open);
          if (!open) {
            setIsSubmittingCategory(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <CategoryForm
            key={isCategoryModalOpen ? 'new' : 'closed'}
            onSubmit={handleAddCategory}
            onCancel={() => setIsCategoryModalOpen(false)}
            isLoading={isSubmittingCategory}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
