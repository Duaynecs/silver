import CompanyForm from '@/components/companies/CompanyForm';
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
import type { CompanyFormData } from '@/schemas/companySchema';
import { useCompaniesStore } from '@/stores/companiesStore';
import type { Company } from '@/types';
import { Building2, CheckCircle2, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Companies() {
  const {
    companies,
    currentCompanyId,
    loading,
    error,
    fetchCompanies,
    addCompany,
    updateCompany,
    deleteCompany,
    setCurrentCompany,
  } = useCompaniesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredCompanies = companies.filter((company) => {
    const search = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(search) ||
      company.cnpj?.toLowerCase().includes(search) ||
      company.city?.toLowerCase().includes(search)
    );
  });

  const handleOpenModal = (company?: Company) => {
    setEditingCompany(company || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
      } else {
        await addCompany(data);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Erro ao salvar empresa. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (company.id === currentCompanyId) {
      alert('Não é possível excluir a empresa atualmente selecionada.');
      return;
    }

    if (
      !confirm(`Tem certeza que deseja excluir a empresa "${company.name}"?`)
    ) {
      return;
    }

    try {
      await deleteCompany(company.id);
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Erro ao excluir empresa. Tente novamente.');
    }
  };

  const handleSelectCompany = (companyId: number) => {
    if (
      confirm(
        'Ao trocar de empresa, você será redirecionado para a tela inicial. Deseja continuar?'
      )
    ) {
      setCurrentCompany(companyId);
      window.location.href = '/'; // Redireciona para a home
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gerenciamento de empresas</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
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
                placeholder="Buscar por nome, CNPJ ou cidade..."
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
              <p className="text-muted-foreground">Carregando empresas...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Nenhuma empresa encontrada'
                  : 'Nenhuma empresa cadastrada'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    className={
                      company.id === currentCompanyId ? 'bg-primary/5' : ''
                    }
                  >
                    <TableCell>
                      {company.id === currentCompanyId ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <button
                          onClick={() => handleSelectCompany(company.id)}
                          className="text-muted-foreground hover:text-primary"
                          title="Selecionar esta empresa"
                        >
                          <Building2 className="w-5 h-5" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.name}
                      {company.id === currentCompanyId && (
                        <span className="ml-2 text-xs text-primary font-normal">
                          (Atual)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.cnpj || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.city && company.state
                        ? `${company.city}/${company.state}`
                        : company.city || (
                            <span className="text-muted-foreground">-</span>
                          )}
                    </TableCell>
                    <TableCell>
                      {company.phone || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(company)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company)}
                          disabled={company.id === currentCompanyId}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
          </DialogHeader>
          <CompanyForm
            company={editingCompany || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
