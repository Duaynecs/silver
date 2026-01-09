import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  categorySchema,
  type CategoryFormData,
} from '@/schemas/categorySchema';
import type { Category } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCategoriesStore } from '@/stores/categoriesStore';

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CategoryForm({
  category,
  onSubmit,
  onCancel,
  isLoading,
}: CategoryFormProps) {
  const { categories } = useCategoriesStore();

  // Filtra categorias válidas (não pode ser pai de si mesma)
  const availableParentCategories = categories.filter(
    (cat) => !category || cat.id !== category.id
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description || '',
          parentId: category.parentId || undefined,
          active: category.active,
        }
      : {
          name: '',
          description: '',
          parentId: undefined,
          active: true,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Categoria *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ex: Eletrônicos, Alimentos, Roupas"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentId">Categoria Pai (Opcional)</Label>
        <Select
          id="parentId"
          {...register('parentId', { valueAsNumber: true })}
        >
          <option value="">Nenhuma (Categoria raiz)</option>
          {availableParentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          Selecione uma categoria pai para criar uma subcategoria
        </p>
        {errors.parentId && (
          <p className="text-sm text-destructive">{errors.parentId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Descrição da categoria (opcional)"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          {...register('active')}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="active" className="cursor-pointer">
          Categoria ativa
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
          {isLoading ? 'Salvando...' : category ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}
