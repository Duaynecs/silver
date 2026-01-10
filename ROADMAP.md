# Silver - Roadmap de Funcionalidades

## 📋 Próximas Atualizações

### 1. Imagens de Produtos ✅ CONCLUÍDO
**Prioridade:** Alta
**Descrição:** Adicionar campo para upload e gerenciamento de imagens de produtos

**Tarefas:**
- [x] Criar campo de upload de imagem no formulário de cadastro de produtos
- [x] Implementar armazenamento local das imagens
- [x] Adicionar pré-visualização da imagem no formulário
- [x] Exibir imagem do produto na tela de vendas (PDV)
- [x] Permitir edição/remoção de imagens

**Arquivos implementados:**
- `src/components/products/ProductForm.tsx` ✅
- `src/components/sales/ProductSelector.tsx` ✅
- `src/stores/productsStore.ts` ✅
- `electron/main.ts` (IPC handlers para imagens) ✅
- `electron/preload.ts` (expor APIs de imagem) ✅
- `electron/database/manager.ts` (migração image_path) ✅
- `src/types/index.ts` (interface Product) ✅
- `src/types/electron.d.ts` (tipos TypeScript) ✅
- `src/schemas/productSchema.ts` (validação) ✅

**Data de conclusão:** 09/01/2026

---

### 2. Configuração de Caminho do Backup ✅ CONCLUÍDO
**Prioridade:** Média
**Descrição:** Permitir que o usuário escolha onde os backups serão armazenados

**Tarefas:**
- [x] Adicionar campo de configuração para caminho do backup
- [x] Implementar seletor de diretório (dialog do Electron)
- [x] Validar permissões de escrita no diretório escolhido
- [x] Salvar configuração no banco de dados
- [x] Atualizar função de backup para usar o caminho configurado

**Arquivos implementados:**
- `src/pages/Settings.tsx` ✅
- `electron/main.ts` (handlers IPC backup:selectDirectory, backup:setPath, backup:getPath) ✅
- `electron/preload.ts` (expor APIs de backup path) ✅
- `src/types/electron.d.ts` (tipos TypeScript) ✅
- Tabela `settings` (armazenamento do caminho) ✅

**Data de conclusão:** 10/01/2026

---

### 3. Configuração de Política de Backup ✅ CONCLUÍDO
**Prioridade:** Média
**Descrição:** Configurar frequência de backup e período de retenção

**Tarefas:**
- [x] Adicionar configurações de frequência (1-168 horas)
- [x] Adicionar configuração de retenção (1-365 backups)
- [x] Implementar limpeza automática de backups antigos
- [x] Permitir backup manual a qualquer momento (já existia)
- [x] Reiniciar intervalo de backup ao alterar configurações
- [x] Validação de valores de frequência e retenção

**Arquivos implementados:**
- `src/pages/Settings.tsx` ✅
- `electron/main.ts` (funções getBackupFrequency, getBackupRetention, restartAutoBackup, handlers IPC) ✅
- `electron/preload.ts` (expor APIs de política) ✅
- `src/types/electron.d.ts` (interface BackupPolicy) ✅
- Tabela `settings` (backup_frequency, backup_retention) ✅

**Data de conclusão:** 10/01/2026

---

### 4. Dashboard - Informações de Estoque ✅ CONCLUÍDO
**Prioridade:** Alta
**Descrição:** Exibir no dashboard quantidade total de produtos em estoque e valor total

**Tarefas:**
- [x] Criar query para calcular quantidade total de itens em estoque
- [x] Criar query para calcular valor total do estoque (preço de venda × quantidade)
- [x] Adicionar cards no dashboard com essas informações
- [x] Implementar atualização automática dos dados
- [x] Adicionar filtro por empresa (multi-company)

**Arquivos implementados:**
- `src/pages/Dashboard.tsx` ✅

**Data de conclusão:** 09/01/2026

---

### 5. Categorias - Estatísticas de Produtos e Estoque ✅ CONCLUÍDO
**Prioridade:** Média
**Descrição:** Exibir quantidade de produtos, estoque e valor por categoria

**Tarefas:**
- [x] Adicionar coluna de estatísticas na listagem de categorias
- [x] Criar queries agregadas por categoria:
  - Quantidade de produtos na categoria
  - Quantidade total em estoque
  - Valor total do estoque
- [x] Exibir informações na tabela de categorias
- [x] Adicionar ordenação por essas métricas

**Arquivos implementados:**
- `src/pages/Categories.tsx` ✅
- `src/stores/categoriesStore.ts` ✅
- `src/types/index.ts` (interfaces CategoryWithStats e CategoryWithChildren) ✅

**Data de conclusão:** 10/01/2026

---

### 6. Busca de Produtos na Venda - Incluir Descrição ✅ CONCLUÍDO
**Prioridade:** Alta
**Descrição:** Ao buscar produtos no PDV, incluir a descrição do produto no resultado da pesquisa

**Tarefas:**
- [x] Modificar query de busca de produtos para incluir campo `description`
- [x] Atualizar componente `ProductSelector` para exibir descrição
- [x] Ajustar layout para mostrar descrição abaixo do nome
- [x] Implementar busca também pela descrição (não só nome/código)

**Arquivos implementados:**
- `src/components/sales/ProductSelector.tsx` ✅

**Data de conclusão:** 09/01/2026

---

### 7. Alterar Senha do Usuário ✅ CONCLUÍDO
**Prioridade:** Alta
**Descrição:** Criar interface para que o usuário possa alterar sua própria senha

**Tarefas:**
- [x] Criar modal/página de alteração de senha
- [x] Implementar validações:
  - Senha atual correta
  - Nova senha com requisitos mínimos
  - Confirmação de nova senha
- [x] Implementar hash seguro de senha (bcrypt)
- [x] Adicionar opção na página de Configurações
- [x] Mostrar feedback de sucesso/erro
- [x] **IMPORTANTE:** Implementar autenticação adequada com bcrypt

**Arquivos implementados:**
- `src/components/auth/ChangePasswordModal.tsx` ✅
- `src/stores/authStore.ts` ✅
- `electron/main.ts` (handlers de autenticação) ✅
- `electron/database/manager.ts` (migração de senhas) ✅
- `electron/preload.ts` (expor APIs de autenticação) ✅
- `src/types/electron.d.ts` (tipos TypeScript) ✅
- `src/pages/Settings.tsx` (interface de usuário) ✅

**Data de conclusão:** 09/01/2026

---

### 8. Clonagem de Dados Entre Empresas
**Prioridade:** Baixa
**Descrição:** Permitir copiar produtos, clientes, categorias e formas de pagamento de uma empresa para outra

**Tarefas:**
- [ ] Criar interface de clonagem com:
  - Seleção de empresa origem
  - Seleção de empresa destino
  - Checkboxes para escolher o que clonar (produtos, clientes, etc)
- [ ] Implementar lógica de clonagem:
  - Produtos (sem duplicar por barcode já existente)
  - Clientes (sem duplicar por CPF/CNPJ já existente)
  - Categorias (criar se não existir)
  - Formas de pagamento
- [ ] Adicionar opção de atualizar dados existentes ou apenas inserir novos
- [ ] Mostrar progresso da clonagem
- [ ] Gerar relatório do que foi clonado
- [ ] Implementar validações e tratamento de erros

**Arquivos principais:**
- `src/pages/DataCloning.tsx` (criar)
- `src/stores/cloningStore.ts` (criar)
- `electron/database/cloning.ts` (criar)

---

### 9. Sistema de Atualização Automática
**Prioridade:** Crítica (Antes de Produção)
**Descrição:** Implementar sistema de atualização automática da aplicação para distribuição de novas versões

**Tarefas:**
- [ ] Decidir estratégia de atualização (ver seção de discussão técnica abaixo)
- [ ] Configurar servidor de distribuição de updates
- [ ] Implementar notificação de nova versão disponível
- [ ] Criar interface de download e instalação de updates
- [ ] Implementar verificação de integridade (assinatura digital)
- [ ] Adicionar opções de configuração:
  - Atualização automática vs manual
  - Canal de atualizações (stable, beta)
- [ ] Implementar sistema de rollback em caso de falha
- [ ] Criar logs de atualização
- [ ] Adicionar release notes/changelog na notificação
- [ ] Testar processo completo de atualização
- [ ] Documentar processo de build e release

**Arquivos principais:**
- `electron/updater/` (criar módulo de atualização)
- `electron/main.ts` (integrar verificação de updates)
- `src/components/updater/` (UI de notificação e progresso)
- `package.json` (configurar electron-builder para updates)

**Opções a discutir:**
1. **electron-updater** (recomendado) - Integrado com electron-builder
2. **Servidor próprio** vs **GitHub Releases**
3. Estratégia de versionamento semântico
4. Frequência de verificação de updates
5. Updates obrigatórios vs opcionais

---

## 🎯 Ordem de Implementação DEFINIDA

**✅ Ordem aprovada pelo cliente:**

1. ~~**Alterar Senha do Usuário** (#7) - ⚠️ CRÍTICO - Segurança~~ ✅ **CONCLUÍDO** (09/01/2026)
2. ~~**Dashboard com Informações de Estoque** (#4) - Valor de negócio imediato~~ ✅ **CONCLUÍDO** (09/01/2026)
3. ~~**Busca de Produtos com Descrição no PDV** (#6) - Melhoria de UX~~ ✅ **CONCLUÍDO** (09/01/2026)
4. ~~**Imagens de Produtos** (#1) - Visual e identificação~~ ✅ **CONCLUÍDO** (09/01/2026)
5. ~~**Estatísticas por Categoria** (#5) - Gestão de estoque~~ ✅ **CONCLUÍDO** (10/01/2026)
6. ~~**Caminho do Backup** (#2) - Configuração essencial~~ ✅ **CONCLUÍDO** (10/01/2026)
7. ~~**Política de Backup** (#3) - Retenção e automação~~ ✅ **CONCLUÍDO** (10/01/2026)
8. **Clonagem de Dados Entre Empresas** (#8) - Funcionalidade avançada ⏳ **PRÓXIMO**
9. **Sistema de Atualização em Produção** (#9) - ⚠️ CRÍTICO - Deploy

**Status:** 🚀 Em andamento - 7 de 9 funcionalidades concluídas (78%)

---

## 💬 Discussão Técnica: Sistema de Atualização (#9)

### Opções de Implementação

#### 1️⃣ electron-updater (Recomendado ⭐)

**Vantagens:**
- ✅ Integração nativa com electron-builder
- ✅ Suporte a múltiplas plataformas (Windows, macOS, Linux)
- ✅ Auto-assinatura de código incluída
- ✅ Instalação silenciosa ou com UI
- ✅ Rollback automático em caso de falha
- ✅ Suporte a delta updates (apenas diferenças)
- ✅ Comunidade ativa e bem documentado

**Desvantagens:**
- ❌ Requer configuração de servidor de updates
- ❌ Custos de hospedagem (se não usar GitHub)

**Implementação básica:**
```typescript
// electron/main.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', (info) => {
  // Notificar usuário
});

autoUpdater.on('update-downloaded', (info) => {
  // Perguntar se quer instalar agora
  dialog.showMessageBox({
    type: 'info',
    title: 'Atualização Pronta',
    message: 'Nova versão baixada. Reiniciar agora?',
    buttons: ['Reiniciar', 'Mais Tarde']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

---

#### 2️⃣ Servidor de Distribuição

**Opções:**

**A) GitHub Releases (Gratuito ⭐)**
- Hospedagem gratuita ilimitada
- Versionamento automático via git tags
- electron-updater tem suporte nativo
- Simples de configurar

```json
// package.json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "seu-usuario",
      "repo": "silver"
    }
  }
}
```

**B) Servidor Próprio (S3, DigitalOcean, etc)**
- Controle total
- Pode adicionar analytics
- Requer manutenção
- Custos mensais

```json
{
  "build": {
    "publish": {
      "provider": "s3",
      "bucket": "silver-updates",
      "region": "us-east-1"
    }
  }
}
```

**C) Hazel (Servidor Simples)**
- Open-source, fácil de hospedar
- Para releases do GitHub
- URL próprio

---

#### 3️⃣ Estratégias de Atualização

**Opção A: Atualização Silenciosa (Recomendado)**
- Baixa em background
- Notifica quando pronto
- Usuário decide quando instalar
- Menos intrusivo

**Opção B: Atualização Forçada**
- Bloqueia app até atualizar
- Útil para atualizações críticas de segurança
- Pode frustrar usuários

**Opção C: Atualização Agendada**
- Verifica em horários específicos
- Instala quando app está fechado
- Melhor UX

---

### 🎯 Recomendação para Silver

**Configuração Ideal:**

1. **Biblioteca:** `electron-updater`
2. **Hospedagem:** GitHub Releases (gratuito, simples)
3. **Estratégia:** Atualização silenciosa com notificação
4. **Canais:**
   - `stable` - Para clientes em produção
   - `beta` - Para testes (opcional)
5. **Frequência:** Verificar a cada 6 horas quando app abre
6. **Versionamento:** Semântico (1.0.0, 1.1.0, 2.0.0)

---

### 📦 Processo de Release Recomendado

```bash
# 1. Atualizar versão no package.json
npm version patch  # 0.1.0 -> 0.1.1
# ou
npm version minor  # 0.1.0 -> 0.2.0
# ou
npm version major  # 0.1.0 -> 1.0.0

# 2. Build para todas as plataformas
npm run build
npm run build:win
npm run build:mac
npm run build:linux

# 3. Publicar no GitHub
git push && git push --tags

# 4. Criar release no GitHub com:
# - Tag da versão (v0.1.1)
# - Changelog (o que mudou)
# - Anexar binários gerados

# 5. electron-updater detecta automaticamente!
```

---

### 🔐 Segurança de Updates

**Essencial:**
1. **Assinatura de Código:**
   - Windows: Certificado Code Signing ($$$)
   - macOS: Apple Developer ID ($99/ano)
   - Linux: Não requer

2. **Verificação de Integridade:**
   - electron-updater verifica SHA512 automaticamente
   - Impede downloads corrompidos ou adulterados

3. **HTTPS Obrigatório:**
   - Sempre usar conexão segura
   - GitHub já fornece

---

### 🚀 Implementação em Fases

**Fase 1: Setup Básico**
```bash
npm install electron-updater
```

**Fase 2: Configuração**
```json
// package.json
{
  "version": "0.1.0",
  "build": {
    "appId": "com.silver.app",
    "productName": "Silver",
    "publish": {
      "provider": "github",
      "owner": "duayne",
      "repo": "silver"
    }
  }
}
```

**Fase 3: Código Principal**
```typescript
// electron/main.ts
import { autoUpdater } from 'electron-updater';

// Configurar
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Verificar updates ao iniciar
app.on('ready', () => {
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000); // Aguardar 3s após abrir
});

// Eventos
autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow.webContents.send('update-downloaded', info);
});
```

**Fase 4: Interface**
```tsx
// src/components/updater/UpdateNotification.tsx
export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.electron.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      // Mostrar toast/modal
    });

    window.electron.onDownloadProgress((progress) => {
      setProgress(progress.percent);
    });

    window.electron.onUpdateDownloaded(() => {
      // Perguntar se quer instalar
    });
  }, []);

  // ... UI
}
```

---

### 📊 Comparação de Custos

| Opção | Custo Mensal | Complexidade | Controle |
|-------|--------------|--------------|----------|
| GitHub Releases | **Gratuito** | Baixa | Médio |
| AWS S3 | ~$5-20 | Média | Alto |
| DigitalOcean Spaces | ~$5 | Média | Alto |
| Servidor Próprio | $20-100 | Alta | Total |

**Recomendação:** Começar com GitHub Releases (gratuito) e migrar apenas se necessário.

---

### ⚠️ Considerações Importantes

1. **Banco de Dados:**
   - Fazer backup automático antes de atualizar
   - Incluir migrações de schema nas releases
   - Testar rollback de schema

2. **Downtime:**
   - App precisa fechar para atualizar
   - Salvar estado antes de fechar
   - Avisar usuário sobre dados não salvos

3. **Usuários Múltiplos:**
   - Sistema multi-company pode ter múltiplos usuários
   - Coordenar atualizações (talvez fora do horário comercial)
   - Opção de adiar update

4. **Testes:**
   - Testar atualização de CADA versão anterior
   - Testar em ambientes limpos
   - Beta testers antes de release público

---

### 💭 Perguntas para Definir

1. **Quando verificar updates?**
   - ✅ Ao iniciar app (+ a cada 6h)
   - ❌ Apenas manualmente
   - ⚠️ Em intervalos fixos (pode ser intrusivo)

2. **Como notificar usuário?**
   - ✅ Toast discreto no canto
   - ✅ Badge no menu
   - ❌ Modal bloqueante (muito intrusivo)

3. **Quando instalar?**
   - ✅ Quando usuário fechar o app
   - ✅ Quando usuário clicar "instalar agora"
   - ❌ Imediatamente (perde trabalho não salvo)

4. **Updates obrigatórios?**
   - ✅ Permitir adiar por X dias
   - ✅ Forçar apenas updates críticos de segurança
   - ❌ Sempre opcional (pode ter usuários desatualizados)

5. **Canal de updates?**
   - ✅ Apenas stable (mais simples)
   - ⚠️ Stable + Beta (requer infraestrutura dupla)

---

### 🎯 Decisão Rápida

**Se quiser começar simples:**
1. Use `electron-updater` + GitHub Releases
2. Verificação ao iniciar app
3. Download automático em background
4. Notificação toast quando pronto
5. Instalação ao fechar app ou quando usuário clicar
6. Versionamento semântico (1.0.0)

**Tempo de implementação:** ~2-3 dias
**Custo:** Gratuito
**Manutenção:** Mínima

---

---

## 📝 Notas Técnicas

### Segurança
- ~~**CRÍTICO:** A implementação atual armazena senhas em texto plano. Implementar bcrypt/argon2 é urgente (#7)~~ ✅ **RESOLVIDO** - Senhas agora usam bcrypt com migração automática
- Validar permissões antes de permitir clonagem de dados (#8)

### Performance
- Implementar cache para estatísticas de estoque (#4, #5)
- Otimizar queries agregadas com índices apropriados
- Considerar paginação na clonagem de dados (#8)

### Multi-company
- Todas as funcionalidades devem respeitar o isolamento por empresa
- Clonagem deve ter controles de acesso apropriados

### Backup
- Testar recuperação de backups regularmente
- Implementar backup incremental para otimizar espaço
- Adicionar criptografia opcional para backups

---

**Última atualização:** 10/01/2026
**Versão atual:** 0.1.0
**Funcionalidades concluídas:** 7 de 9 (78%)
**Próxima funcionalidade:** Clonagem de Dados Entre Empresas (#8)
