import { validateEAN } from '@/utils/barcode';
import { z } from 'zod';

export const productSchema = z.object({
  barcode: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Opcional
        return validateEAN(val).isValid;
      },
      {
        message:
          'Código de barras inválido. Deve ser um EAN-13 ou EAN-8 válido',
      }
    ),
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  salePrice: z.number().min(0, 'Preço de venda deve ser maior ou igual a zero'),
  stockQuantity: z
    .number()
    .int()
    .min(0, 'Quantidade deve ser maior ou igual a zero'),
  minStock: z
    .number()
    .int()
    .min(0, 'Estoque mínimo deve ser maior ou igual a zero'),
  category: z.string().optional(),
  imagePath: z.string().optional(),
  active: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;
