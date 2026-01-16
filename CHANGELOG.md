# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

## [1.0.0] - 2026-01-16

### Adicionado

- Sistema de auto-update com electron-updater
- Suporte a repositório privado no GitHub para atualizações
- GitHub Actions workflow para releases automatizados
- Sistema de migrações de banco de dados melhorado
- Controle de versão do schema do banco de dados
- Documentação do sistema de auto-update

### Alterado

- Refatorado DatabaseManager para código mais limpo e manutenível
- Simplificado sistema de migrações legadas

## [0.9.0] - 2026-01-09

### Adicionado

- Sistema de protocolos para rastreamento de movimentações de estoque
- Página de visualização e gerenciamento de protocolos
- Geração automática de protocolos em vendas, entradas e ajustes de estoque
- Cancelamento de protocolos com reversão de movimentações
- Modal de detalhes do protocolo com histórico de produtos
- Suporte a múltiplas empresas (multi-tenant)
- Clonagem de dados entre empresas
- Sistema de backup automático com política configurável

### Corrigido

- Bug de timezone nos relatórios (UTC vs horário local do Brasil)
- Bug de zeramento de estoque que afetava todas as empresas
- Mapeamento de snake_case para camelCase nos dados do protocolo

## [0.8.0] - 2026-01-06

### Adicionado

- Sistema de caixa com abertura e fechamento
- Relatório de vendas por período
- Relatório de comissões
- Relatório de clientes
- Suporte a troco em vendas com dinheiro
- Campo `accepts_change` em formas de pagamento

### Alterado

- Melhorias na interface do PDV
- Otimização de consultas SQL

## [0.7.0] - 2026-01-03

### Adicionado

- Cadastro de clientes com endereço completo
- Associação de cliente na venda
- Filtros avançados em listagens
- Exportação de relatórios

### Corrigido

- Validação de CPF/CNPJ duplicado por empresa

## [0.6.0] - 2025-12-30

### Adicionado

- Sistema de categorias hierárquicas
- Upload de imagem de produtos
- Busca por código de barras no PDV

### Alterado

- Interface de cadastro de produtos

## [0.5.0] - 2025-12-30

### Adicionado

- PDV (Ponto de Venda) completo
- Múltiplas formas de pagamento por venda
- Desconto global na venda
- Impressão de comprovante (preparado para integração)

## [0.4.0] - 2025-12-29

### Adicionado

- Movimentações de estoque (entrada, saída, ajuste)
- Histórico de movimentações por produto
- Alerta de estoque mínimo no dashboard

## [0.3.0] - 2025-12-29

### Adicionado

- Dashboard com métricas principais
- Gráficos de vendas e estoque
- Resumo financeiro

## [0.2.0] - 2025-12-28

### Adicionado

- CRUD de produtos
- CRUD de categorias
- CRUD de formas de pagamento
- Sistema de autenticação com bcrypt

## [0.1.0] - 2025-12-28

### Adicionado

- Estrutura inicial do projeto
- Configuração Electron + Vite + React
- Banco de dados SQLite com better-sqlite3
- Drizzle ORM para migrations tipadas
- Tailwind CSS para estilização
- Zustand para gerenciamento de estado

---

## Tipos de Mudanças

- **Adicionado** para novas funcionalidades
- **Alterado** para mudanças em funcionalidades existentes
- **Descontinuado** para funcionalidades que serão removidas em breve
- **Removido** para funcionalidades removidas
- **Corrigido** para correção de bugs
- **Segurança** para vulnerabilidades corrigidas
