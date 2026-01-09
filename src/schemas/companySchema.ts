import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2, 'Use a sigla do estado (ex: SP)').optional(),
  zipCode: z.string().optional(),
  active: z.boolean().default(true),
});

export type CompanyFormData = z.infer<typeof companySchema>;
