import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  customerSchema,
  type CustomerFormData,
} from '@/schemas/customerSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import CpfCnpjInput from '@/components/customers/CpfCnpjInput';
import type { Customer } from '@/types';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Estados brasileiros
const STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export default function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading,
}: CustomerFormProps) {
  const [fetchingCep, setFetchingCep] = useState(false);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [lastCep, setLastCep] = useState('');
  const [lastCnpj, setLastCnpj] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [cepMessage, setCepMessage] = useState('');
  const [cnpjMessage, setCnpjMessage] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          cpfCnpj: customer.cpfCnpj || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          number: customer.number || '',
          neighborhood: customer.neighborhood || '',
          complement: customer.complement || '',
          city: customer.city || '',
          state: customer.state || '',
          zipCode: customer.zipCode || '',
          notes: customer.notes || '',
          active: customer.active,
        }
      : {
          name: '',
          cpfCnpj: '',
          phone: '',
          email: '',
          address: '',
          number: '',
          neighborhood: '',
          complement: '',
          city: '',
          state: '',
          zipCode: '',
          notes: '',
          active: true,
        },
  });

  const zipCode = watch('zipCode');
  const cpfCnpj = watch('cpfCnpj');

  // Marca que o load inicial terminou após um pequeno delay
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Busca endereço por CEP
  useEffect(() => {
    if (isInitialLoad) return; // Não busca no load inicial

    const cleanCep = zipCode?.replace(/\D/g, '');
    if (cleanCep && cleanCep.length === 8 && cleanCep !== lastCep) {
      setLastCep(cleanCep);
      fetchAddressByCep(cleanCep);
    }
  }, [zipCode]);

  // Busca dados por CNPJ
  useEffect(() => {
    if (isInitialLoad) return; // Não busca no load inicial

    const cleanCnpj = cpfCnpj?.replace(/\D/g, '');
    if (cleanCnpj && cleanCnpj.length === 14 && cleanCnpj !== lastCnpj) {
      setLastCnpj(cleanCnpj);
      fetchDataByCnpj(cleanCnpj);
    }
  }, [cpfCnpj]);

  const fetchAddressByCep = async (cep: string) => {
    setFetchingCep(true);
    setCepMessage('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('CEP não encontrado');

      const data = await response.json();

      if (data.erro) {
        setCepMessage('CEP não encontrado');
        return;
      }

      // Preenche os campos automaticamente
      setValue('address', data.logradouro || '');
      setValue('neighborhood', data.bairro || '');
      setValue('city', data.localidade || '');
      setValue('state', data.uf || '');

      setCepMessage('Endereço encontrado!');
      setTimeout(() => setCepMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setCepMessage('Erro ao buscar CEP');
    } finally {
      setFetchingCep(false);
    }
  };

  const fetchDataByCnpj = async (cnpj: string) => {
    setFetchingCnpj(true);
    setCnpjMessage('');
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`
      );
      if (!response.ok) throw new Error('CNPJ não encontrado');

      const data = await response.json();

      // Preenche os campos automaticamente
      setValue('name', data.razao_social || data.nome_fantasia || '');
      setValue('email', data.email || '');
      setValue('phone', data.ddd_telefone_1 || '');
      setValue('address', data.logradouro || '');
      setValue('number', data.numero || '');
      setValue('neighborhood', data.bairro || '');
      setValue('complement', data.complemento || '');
      setValue('city', data.municipio || '');
      setValue('state', data.uf || '');
      setValue('zipCode', data.cep?.replace(/\D/g, '') || '');

      setCnpjMessage('Dados encontrados!');
      setTimeout(() => setCnpjMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      setCnpjMessage('CNPJ não encontrado');
    } finally {
      setFetchingCnpj(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
          <div className="relative">
            <CpfCnpjInput
              value={watch('cpfCnpj')}
              onChange={(value) => setValue('cpfCnpj', value)}
              placeholder="CPF ou CNPJ"
            />
            {fetchingCnpj && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {errors.cpfCnpj && (
            <p className="text-sm text-destructive">{errors.cpfCnpj.message}</p>
          )}
          {fetchingCnpj && (
            <p className="text-sm text-blue-600">Buscando dados do CNPJ...</p>
          )}
          {!fetchingCnpj && cnpjMessage && (
            <p
              className={`text-sm ${
                cnpjMessage.includes('encontrados')
                  ? 'text-green-600'
                  : 'text-orange-600'
              }`}
            >
              {cnpjMessage}
            </p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register('name')} placeholder="Nome completo" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="email@exemplo.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="(00) 00000-0000"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">CEP</Label>
          <div className="relative">
            <Input
              id="zipCode"
              {...register('zipCode')}
              placeholder="00000-000"
            />
            {fetchingCep && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {errors.zipCode && (
            <p className="text-sm text-destructive">{errors.zipCode.message}</p>
          )}
          {fetchingCep && (
            <p className="text-sm text-blue-600">Buscando endereço...</p>
          )}
          {!fetchingCep && cepMessage && (
            <p
              className={`text-sm ${
                cepMessage.includes('encontrado!')
                  ? 'text-green-600'
                  : 'text-orange-600'
              }`}
            >
              {cepMessage}
            </p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="address">Endereço (Rua/Avenida)</Label>
          <Input
            id="address"
            {...register('address')}
            placeholder="Nome da rua ou avenida"
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input id="number" {...register('number')} placeholder="Número" />
          {errors.number && (
            <p className="text-sm text-destructive">{errors.number.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            {...register('neighborhood')}
            placeholder="Nome do bairro"
          />
          {errors.neighborhood && (
            <p className="text-sm text-destructive">
              {errors.neighborhood.message}
            </p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            {...register('complement')}
            placeholder="Apartamento, bloco, etc."
          />
          {errors.complement && (
            <p className="text-sm text-destructive">
              {errors.complement.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...register('city')} placeholder="Nome da cidade" />
          {errors.city && (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Select id="state" {...register('state')}>
            <option value="">Selecione...</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
          {errors.state && (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Informações adicionais sobre o cliente"
            rows={3}
          />
          {errors.notes && (
            <p className="text-sm text-destructive">{errors.notes.message}</p>
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
          Cliente ativo
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
          {isLoading ? 'Salvando...' : customer ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}
