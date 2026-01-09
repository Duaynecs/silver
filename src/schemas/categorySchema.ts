import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  parentId: z.preprocess(
    (val) => {
      // Converte string vazia, NaN, null para undefined
      if (val === '' || val === null || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return val;
    },
    z.number().optional()
  ),
  active: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
