# Sistema de Auto-Update do Silver

## Visão Geral

O Silver utiliza o `electron-updater` para gerenciar atualizações automáticas via GitHub Releases.

## Configuração

### 1. Token do GitHub (Repositório Privado)

Para repositórios privados, é necessário configurar um token de acesso do GitHub.

#### No Cliente (Usuário Final)

Crie um arquivo de configuração em um dos seguintes locais:

**Windows:**
```
%APPDATA%/silver/app-update.yml
```

**macOS:**
```
~/Library/Application Support/silver/app-update.yml
```

**Linux:**
```
~/.config/silver/app-update.yml
```

Conteúdo do arquivo:
```yaml
provider: github
owner: duayne
repo: silver
private: true
token: ghp_seu_token_aqui
```

#### Via Variável de Ambiente

Alternativamente, defina a variável de ambiente antes de iniciar o aplicativo:

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN = "ghp_seu_token_aqui"
```

**macOS/Linux:**
```bash
export GH_TOKEN="ghp_seu_token_aqui"
```

### 2. Gerar Token do GitHub

1. Acesse [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Clique em "Generate new token (classic)"
3. Selecione os escopos:
   - `repo` (acesso completo a repositórios privados)
4. Copie o token gerado

**Importante:** O token precisa apenas de permissão de leitura para baixar releases.

## Publicando uma Nova Versão

### 1. Atualizar a Versão

Edite o arquivo `package.json` e atualize o campo `version`:

```json
{
  "version": "1.0.0"
}
```

### 2. Criar Tag e Commit

```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

### 3. Build e Publicação Manual (Local)

```bash
# Configura o token
export GH_TOKEN="seu_token_com_permissao_de_escrita"

# Publica para todas as plataformas
npm run release

# Ou para uma plataforma específica
npm run release:win
npm run release:mac
npm run release:linux
```

### 4. Build via GitHub Actions (Recomendado)

O workflow já está configurado para buildar e publicar automaticamente quando uma tag `v*` é criada.

**Pré-requisito:** Configure o secret `GH_TOKEN` no repositório:
1. Vá em Settings > Secrets and variables > Actions
2. Adicione um novo secret chamado `GH_TOKEN`
3. Cole seu token com permissão de escrita em releases

## Comportamento das Atualizações

### Verificação Automática
- O app verifica atualizações 3 segundos após iniciar
- Verificações periódicas a cada 4 horas

### Fluxo de Atualização
1. **Verificação**: O app consulta os GitHub Releases
2. **Download**: Se houver versão nova, baixa em segundo plano
3. **Instalação**: Atualização é instalada ao fechar o app

### Rollback

Se uma versão apresentar problemas:

1. **Via GitHub**: Publique uma nova versão com a correção
2. **Manual**: O usuário pode baixar uma versão anterior diretamente dos releases

O sistema mantém um histórico das últimas 5 versões instaladas em:
```
[userData]/installer-cache/version-history.json
```

## API no Frontend

O frontend pode interagir com o updater via `window.electron.updater`:

```typescript
// Verificar atualizações manualmente
await window.electron.updater.check();

// Obter estado atual
const state = await window.electron.updater.getState();

// Obter informações de versão
const info = await window.electron.updater.getVersionInfo();

// Escutar eventos de atualização
const unsubscribe = window.electron.updater.onStatus((data) => {
  console.log('Status:', data.status, data.data);
});

// Status possíveis:
// - 'checking': Verificando atualizações
// - 'available': Atualização disponível
// - 'not-available': Sem atualizações
// - 'downloading': Baixando atualização
// - 'downloaded': Download completo
// - 'error': Erro na atualização
```

## Troubleshooting

### Atualização não funciona em desenvolvimento
O auto-updater está desabilitado em modo de desenvolvimento. Teste apenas em builds de produção.

### Erro de autenticação
Verifique se o token do GitHub está correto e tem as permissões necessárias.

### Erro "Cannot find latest.yml"
O arquivo `latest.yml` (ou `latest-mac.yml`) é gerado automaticamente durante o build. Certifique-se de usar `--publish always` no comando de build.

### Logs
Os logs do updater são salvos em:

**Windows:**
```
%APPDATA%/silver/logs/
```

**macOS:**
```
~/Library/Logs/silver/
```

**Linux:**
```
~/.config/silver/logs/
```
