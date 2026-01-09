# Silver - Sistema de Controle de Estoque

Sistema desktop de controle de estoque desenvolvido com Electron, React e SQLite.

## Funcionalidades

- ✅ Autenticação de usuário
- ✅ Dashboard com visão geral
- 📦 Cadastro de produtos com código de barras
- 👥 Cadastro de clientes
- 🛒 PDV (Ponto de Venda) com controle de caixa
- 📊 Controle de inventário e movimentações
- 📈 Relatórios de vendas
- 💰 Formas de pagamento configuráveis

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Electron
- **Banco de Dados**: SQLite (Better-SQLite3)
- **ORM**: Drizzle ORM
- **Estado**: Zustand
- **Estilização**: TailwindCSS + Shadcn/ui
- **Formulários**: React Hook Form + Zod

## Instalação

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run electron:dev

# Build para produção
npm run build

# Build específico para plataforma
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Credenciais Padrão

- **Usuário**: admin
- **Senha**: admin

## Estrutura do Projeto

```
silver/
├── electron/              # Código do Electron (main process)
│   ├── main.ts           # Processo principal
│   ├── preload.ts        # Script de preload
│   └── database/         # Gerenciamento do banco de dados
├── src/                  # Código React (renderer process)
│   ├── components/       # Componentes reutilizáveis
│   ├── pages/           # Páginas da aplicação
│   ├── stores/          # Estados Zustand
│   ├── types/           # Definições TypeScript
│   └── utils/           # Utilitários
├── package.json
└── vite.config.ts
```

## Schema do Banco de Dados

- **users**: Usuários do sistema
- **products**: Produtos cadastrados
- **customers**: Clientes
- **payment_methods**: Formas de pagamento
- **cash_register**: Controle de caixa
- **sales**: Vendas realizadas
- **sale_items**: Itens de cada venda
- **sale_payments**: Pagamentos de cada venda
- **stock_movements**: Movimentações de estoque

## Desenvolvimento

O projeto está estruturado para facilitar o desenvolvimento incremental. As páginas principais já estão criadas e conectadas ao sistema de roteamento.

### Próximos Passos

1. Implementar CRUD completo de Produtos
2. Implementar CRUD completo de Clientes
3. Desenvolver tela de PDV (Vendas)
4. Implementar controle de Inventário
5. Criar Relatórios detalhados
6. Adicionar configurações do sistema

## Licença

MIT
