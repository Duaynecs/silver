import CategoryForm from '@/components/categories/CategoryForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CategoryFormData } from '@/schemas/categorySchema';
import { useCategoriesStore } from '@/stores/categoriesStore';
import type { Category, CategoryWithChildren, CategoryWithStats } from '@/types';
import { Edit, Plus, Search, Trash2, ChevronRight, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/utils/format';

export default function Categories() {
  const {
    categories,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesTree,
  } = useCategoriesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'productCount' | 'stockQuantity' | 'stockValue'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSort = (column: 'name' | 'productCount' | 'stockQuantity' | 'stockValue') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const filteredCategories = categories
    .filter((category) => {
      const search = searchTerm.toLowerCase();
      return (
        category.name.toLowerCase().includes(search) ||
        category.description?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'productCount':
          aValue = a.productCount || 0;
          bValue = b.productCount || 0;
          break;
        case 'stockQuantity':
          aValue = a.stockQuantity || 0;
          bValue = b.stockQuantity || 0;
          break;
        case 'stockValue':
          aValue = a.stockValue || 0;
          bValue = b.stockValue || 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleOpenModal = (category?: Category) => {
    setEditingCategory(category || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
      } else {
        await addCategory(data);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erro ao salvar categoria. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)
    ) {
      return;
    }

    try {
      await deleteCategory(category.id);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erro ao excluir categoria. Tente novamente.');
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderCategoryTree = (category: CategoryWithChildren): React.ReactNode => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children.length > 0;
    const indentLevel = category.level * 24;

    return (
      <>
        <TableRow key={category.id}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${indentLevel}px` }}>
              {hasChildren && (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="mr-2 hover:bg-accent rounded p-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-8" />}
              <span className="font-medium">{category.name}</span>
            </div>
          </TableCell>
          <TableCell>
            {category.description || (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="text-right">{category.productCount || 0}</TableCell>
          <TableCell className="text-right">{category.stockQuantity || 0}</TableCell>
          <TableCell className="text-right">{formatCurrency(category.stockValue || 0)}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenModal(category)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(category)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && category.children.map(child => renderCategoryTree(child))}
      </>
    );
  };

  const categoriesTree = getCategoriesTree();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">Gerenciamento de categorias</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando categorias...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Nenhuma categoria encontrada'
                  : 'Nenhuma categoria cadastrada'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={viewMode === 'tree' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('tree')}
                >
                  Visualização em Árvore
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  Visualização em Lista
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        className="h-8 px-2"
                      >
                        Nome
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('productCount')}
                        className="h-8 px-2"
                      >
                        Produtos
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('stockQuantity')}
                        className="h-8 px-2"
                      >
                        Estoque
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('stockValue')}
                        className="h-8 px-2"
                      >
                        Valor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode === 'tree' ? (
                    searchTerm ? (
                      filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">
                            {category.name}
                          </TableCell>
                          <TableCell>
                            {category.description || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{category.productCount || 0}</TableCell>
                          <TableCell className="text-right">{category.stockQuantity || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(category.stockValue || 0)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(category)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(category)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      categoriesTree.map(category => renderCategoryTree(category))
                    )
                  ) : (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>
                          {category.description || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{category.productCount || 0}</TableCell>
                        <TableCell className="text-right">{category.stockQuantity || 0}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.stockValue || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editingCategory || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
