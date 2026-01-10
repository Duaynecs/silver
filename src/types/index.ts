// Database Types
export interface Company {
  id: number;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  companyId: number;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: number;
  barcode?: string;
  name: string;
  description?: string;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
  category?: string;
  imagePath?: string;
  companyId: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Customer {
  id: number;
  name: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  companyId: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  acceptsChange: boolean;
  companyId: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  companyId: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CategoryWithStats extends Category {
  productCount?: number;
  stockQuantity?: number;
  stockValue?: number;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  level: number;
  productCount?: number;
  stockQuantity?: number;
  stockValue?: number;
}

export interface CashRegister {
  id: number;
  openingDate: number;
  closingDate?: number;
  initialAmount: number;
  finalAmount?: number;
  expectedAmount?: number;
  difference?: number;
  status: 'open' | 'closed';
  notes?: string;
  companyId: number;
  createdAt: number;
  updatedAt: number;
}

export interface Sale {
  id: number;
  saleNumber: string;
  customerId?: number;
  cashRegisterId?: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  changeAmount: number;
  status: 'completed' | 'cancelled';
  notes?: string;
  saleDate: number;
  companyId: number;
  createdAt: number;
  updatedAt: number;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  createdAt: number;
}

export interface SalePayment {
  id: number;
  saleId: number;
  paymentMethodId: number;
  amount: number;
  createdAt: number;
}

export interface StockMovement {
  id: number;
  productId: number;
  type: 'entrada' | 'saida' | 'ajuste' | 'inventario';
  quantity: number;
  unitCost?: number;
  referenceId?: number;
  referenceType?: string;
  notes?: string;
  movementDate: number;
  companyId: number;
  createdAt: number;
}

// UI Types
export interface SaleItemInput {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface PaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}
