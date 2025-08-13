# Gerador de usuários sintéticos para o setor de energia renovável (Brasil)

## Visão geral
Este script Node.js chama a API da OpenAI para gerar exatamente 50 linhas de usuários fictícios, plausíveis e não relacionados a pessoas reais, voltados ao contexto de energia eólica e solar no Brasil. A saída inclui:
- `usuarios_energia_renovavel.csv` (separador “;” e cabeçalho)
- `prompt.txt` (com o prompt utilizado)

## Requisitos
- Node.js 18+ (recomendado 18 ou superior)
- Chave de API da OpenAI com acesso ao modelo configurado (`chatgpt-4o-latest` por padrão)
- Conexão com a internet
- Windows, macOS ou Linux

## Estrutura sugerida do projeto

``` 
seu-projeto/
├─ index.js              # seu script (ajuste o nome conforme o seu arquivo)
├─ package.json
├─ .env                  # suas variáveis de ambiente (não versionar)
└─ (arquivos gerados na execução)
├─ usuarios_energia_renovavel.csv
└─ prompt.txt

 ```

# Node 
```
https://nodejs.org/pt/download
```

### Puxar ou extrair a imagem de Docker da Node.js:
docker pull node:20-alpine

### Criar um contentor de Node.js e iniciar uma sessão de Shell:
docker run -it --rm --entrypoint sh node:20-alpine

### Consultar a versão da Node.js:
node -v
### Consultar a versão da npm:
npm -v



 ## Instalação
1) Crie uma pasta e adicione o script (por exemplo, `index.js`).

2) Inicialize o projeto e instale dependências:
```bash
npm init -y
npm install openai dotenv 
```

3) Configure o projeto como ES Module no package.json:

```
{
  "name": "usuarios-energia",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "dotenv": "^16.4.0",
    "openai": "^4.0.0"
  }
}
```

# Configuração
Crie um arquivo ```.env ``` na raiz com sua chave:

```
OPENAI_API_KEY=coloque_sua_chave_aqui
```

# No script, verifique:

## Const do modelo (altere se necessário):

```
const MODEL = "chatgpt-4o-latest"; // ou "gpt-4o-mini", etc.
```

```
const PROMPT = "PROMPT A SER USADO PELO MODELO (LLM)
```

# Execução

Via script NPM:

```
npm start
```

# diretamente com Node:

## No Terminal execute:

```
node index.js
```

ou 

```
node script.js
```

dependendo do nome do arquivo.

# Saída esperada no terminal:

### Concluído com sucesso. Linhas válidas salvas: 50 - exatamente 50 .

### Arquivo CSV: <caminho>/usuarios_energia_renovavel.csv

### Prompt salvo em <caminho>/prompt.txt.

# Chamas de API para outros serviços de AI

```
Considere sempre verificar na documentação oficial do modelo escolhido que será utilizado no script, (Exemplo de Documentação: TESS AI, Anthropic, Google Gemini, OpenAI Docs etc...) Para criar uma chamada personalizada de API.
```

### Observações

```
Modelos (LLMS) possuem diferentes formas de serem utilizados via API.
```
