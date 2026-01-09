import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CpfCnpjInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CpfCnpjInput({ value, onChange, placeholder }: CpfCnpjInputProps) {
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const formatCpfCnpj = (value: string): string => {
    // Remove tudo que não é dígito
    const cleaned = value.replace(/\D/g, '');

    // Formata como CPF (xxx.xxx.xxx-xx)
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }

    // Formata como CNPJ (xx.xxx.xxx/xxxx-xx)
    return cleaned
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpfCnpj(e.target.value);
    setInputValue(formatted);
    onChange(formatted);
  };

  return (
    <Input
      type="text"
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder || 'CPF ou CNPJ'}
      maxLength={18} // CNPJ formatado tem 18 caracteres
    />
  );
}
