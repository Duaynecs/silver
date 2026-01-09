import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCompaniesStore } from '@/stores/companiesStore';
import { Building2 } from 'lucide-react';
import { useEffect } from 'react';

interface SelectCompanyDialogProps {
  open: boolean;
  onSelectCompany: (companyId: number) => void;
}

export default function SelectCompanyDialog({
  open,
  onSelectCompany,
}: SelectCompanyDialogProps) {
  const { companies, loading, fetchCompanies } = useCompaniesStore();

  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open, fetchCompanies]);

  const handleSelectCompany = (companyId: number) => {
    onSelectCompany(companyId);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Selecione uma Empresa</DialogTitle>
          <DialogDescription>
            Escolha a empresa para iniciar o trabalho
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando empresas...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contate o administrador do sistema
              </p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {companies.map((company) => (
                <Button
                  key={company.id}
                  variant="outline"
                  className="h-auto p-4 justify-start hover:bg-primary/5 hover:border-primary"
                  onClick={() => handleSelectCompany(company.id)}
                >
                  <Building2 className="w-6 h-6 mr-3 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold">{company.name}</div>
                    {(company.cnpj || company.city) && (
                      <div className="text-sm text-muted-foreground">
                        {company.cnpj && <span>CNPJ: {company.cnpj}</span>}
                        {company.cnpj && company.city && <span> • </span>}
                        {company.city && company.state && (
                          <span>
                            {company.city}/{company.state}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
