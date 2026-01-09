import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCompaniesStore } from '@/stores/companiesStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SelectCompanyDialog from '@/components/companies/SelectCompanyDialog';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);

  const login = useAuthStore((state) => state.login);
  const { setCurrentCompany, fetchCompanies } = useCompaniesStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);

      if (success) {
        // Busca as empresas disponíveis
        await fetchCompanies();

        // Acessa as empresas após o fetch
        const currentCompanies = useCompaniesStore.getState().companies;

        // Se tiver apenas 1 empresa, seleciona automaticamente
        if (currentCompanies.length === 1) {
          setCurrentCompany(currentCompanies[0].id);
          navigate('/');
        } else if (currentCompanies.length > 1) {
          // Se tiver mais de 1, mostra o dialog
          setShowCompanyDialog(true);
        } else {
          // Se não tiver nenhuma empresa
          setError('Nenhuma empresa cadastrada. Contate o administrador.');
        }
      } else {
        setError('Usuário ou senha inválidos');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (companyId: number) => {
    setCurrentCompany(companyId);
    setShowCompanyDialog(false);
    navigate('/');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Silver</CardTitle>
            <CardDescription>Sistema de Controle de Estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-xs text-center text-muted-foreground mt-4">
                Usuário padrão: <strong>admin</strong> | Senha: <strong>admin</strong>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <SelectCompanyDialog
        open={showCompanyDialog}
        onSelectCompany={handleSelectCompany}
      />
    </>
  );
}
