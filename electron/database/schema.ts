import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barcode: text('barcode').unique(),
  name: text('name').notNull(),
  description: text('description'),
  salePrice: real('sale_price').notNull().default(0),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  category: text('category'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cpfCnpj: text('cpf_cnpj').unique(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  number: text('number'),
  neighborhood: text('neighborhood'),
  complement: text('complement'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const paymentMethods = sqliteTable('payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const cashRegister = sqliteTable('cash_register', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openingDate: integer('opening_date', { mode: 'timestamp' }).notNull(),
  closingDate: integer('closing_date', { mode: 'timestamp' }),
  initialAmount: real('initial_amount').notNull().default(0),
  finalAmount: real('final_amount'),
  expectedAmount: real('expected_amount'),
  difference: real('difference'),
  status: text('status').notNull().default('open'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleNumber: text('sale_number').notNull().unique(),
  customerId: integer('customer_id'),
  cashRegisterId: integer('cash_register_id'),
  totalAmount: real('total_amount').notNull(),
  discount: real('discount').notNull().default(0),
  finalAmount: real('final_amount').notNull(),
  status: text('status').notNull().default('completed'),
  notes: text('notes'),
  saleDate: integer('sale_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  productId: integer('product_id').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  discount: real('discount').notNull().default(0),
  total: real('total').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const salePayments = sqliteTable('sale_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  paymentMethodId: integer('payment_method_id').notNull(),
  amount: real('amount').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull(),
  type: text('type').notNull(), // 'entrada', 'saida', 'ajuste', 'inventario'
  quantity: real('quantity').notNull(),
  unitCost: real('unit_cost'),
  referenceId: integer('reference_id'),
  referenceType: text('reference_type'),
  notes: text('notes'),
  movementDate: integer('movement_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const stockProtocols = sqliteTable('stock_protocols', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  protocolNumber: text('protocol_number').notNull().unique(),
  type: text('type').notNull(), // 'sale' | 'purchase' | 'adjustment' | 'zero_stock' | 'inventory'
  status: text('status').notNull().default('active'), // 'active' | 'cancelled'
  referenceId: integer('reference_id'),
  referenceType: text('reference_type'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  cancelledBy: integer('cancelled_by'),
  notes: text('notes'),
});

export const stockProtocolMovements = sqliteTable('stock_protocol_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  protocolId: integer('protocol_id').notNull(),
  productId: integer('product_id').notNull(),
  quantityBefore: real('quantity_before').notNull(),
  quantityAfter: real('quantity_after').notNull(),
  quantityChanged: real('quantity_changed').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
