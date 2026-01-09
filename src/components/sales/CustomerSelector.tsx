import { useState, useEffect } from 'react';
import { useCustomersStore } from '@/stores/customersStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, X, User } from 'lucide-react';
import type { Customer } from '@/types';

interface CustomerSelectorProps {
  selectedCustomerId?: number;
  onCustomerSelected: (customer: Customer | null) => void;
}

export default function CustomerSelector({ selectedCustomerId, onCustomerSelected }: CustomerSelectorProps) {
  const { customers, fetchCustomers } = useCustomersStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers([]);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(search) ||
        customer.cpfCnpj?.toLowerCase().includes(search) ||
        customer.phone?.toLowerCase().includes(search)
      );
    }).slice(0, 5); // Limita a 5 resultados

    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    onCustomerSelected(customer);
    setSearchTerm('');
    setFilteredCustomers([]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    onCustomerSelected(null);
    setSearchTerm('');
    setFilteredCustomers([]);
  };

  if (selectedCustomer) {
    return (
      <div className="space-y-2">
        <Label>Cliente</Label>
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md border border-primary/20">
          <User className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">{selectedCustomer.name}</div>
            <div className="text-sm text-muted-foreground">
              {selectedCustomer.cpfCnpj && `${selectedCustomer.cpfCnpj}`}
              {selectedCustomer.phone && ` • ${selectedCustomer.phone}`}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearCustomer}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="customerSearch">Cliente (Opcional)</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="customerSearch"
          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />

        {filteredCustomers.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-64 overflow-auto">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelectCustomer(customer)}
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {customer.cpfCnpj && `${customer.cpfCnpj}`}
                  {customer.phone && ` • ${customer.phone}`}
                  {customer.city && ` • ${customer.city}/${customer.state}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Deixe em branco para venda sem identificação de cliente
      </p>
    </div>
  );
}
