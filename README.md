# App de Frequência

Controle de presença por encontro, com relatório e exportação em PDF.

## Stack

- Front: HTML/CSS/JS puro em `/public`
- API: Vercel Functions em `/api`
- Banco: Neon (PostgreSQL)
- Acesso: PIN de 4 dígitos + escolha do responsável

## Como subir

### 1. Banco

Crie um projeto no Neon e rode o `schema.sql` no SQL Editor.

### 2. Variáveis de ambiente

Na Vercel, em Settings > Environment Variables:

```
DATABASE_URL = postgresql://...   (connection string do Neon)
JWT_SECRET   = uma frase longa e aleatória
```

### 3. PIN

```
npm install
node scripts/gerar-pin.js 1234
```

Copie o UPDATE que aparece e rode no Neon.

### 4. Deploy

```
git init
git add .
git commit -m "primeira versao"
```

Suba para o GitHub e importe o repositório na Vercel.

## Fluxo de trabalho

Trabalhe na branch `dev`, teste local com `vercel dev`, e só faça merge
na `main` quando estiver aprovado. A `main` é o que vai para produção.

Um comando por linha — PowerShell não aceita `&&`.

## Endpoints

| Rota | Métodos | O que faz |
|---|---|---|
| `/api/login` | GET, POST | Lista responsáveis / valida PIN |
| `/api/membros` | GET, POST, PUT, DELETE | Cadastro de pessoas |
| `/api/encontros` | GET, POST | Encontros e status de chamada |
| `/api/presencas` | GET, POST | Chamada em lote |
| `/api/contatos` | GET, POST | Contato feito com quem faltou |
| `/api/relatorio` | GET | Dados do relatório |

Todas exigem `Authorization: Bearer <token>`, menos o `/api/login`.

## Regras que não podem ser esquecidas

- Datas sempre com `toLocaleDateString('en-CA')`. `toISOString()` faz o
  encontro de domingo virar sábado no fuso do Brasil.
- Comparar IDs com `String(a) === String(b)`.
- Não adicionar `Cache-Control` nas chamadas fetch.
- Membro removido é desativado, nunca apagado — o histórico depende dele.

## Telas

| Rota | O que faz |
|---|---|
| `/` | PIN e escolha de quem está preenchendo |
| `/chamada` | Marca presença, abas de membros e visitantes |
| `/relatorio` | Frequência, alertas, encontros sem chamada, PDF |
| `/pessoas` | Cadastro de membros e visitantes |

O PDF sai pelo botão "Salvar PDF", que usa a impressão do próprio
navegador com folha de estilo dedicada. No celular abre "Salvar em
Arquivos"; no computador, "Salvar como PDF".

## Padrão da chamada

Todo mundo começa como ausente. Marca-se quem veio.

## Planilha

O botão "Planilha" no relatório baixa um CSV com a grade completa:
uma linha por pessoa, uma coluna por encontro, `P` para presente e
`F` para falta. Célula vazia significa que a pessoa não estava na
lista naquele encontro.

Abre direto no Excel e no Google Sheets. O separador é ponto e
vírgula e o arquivo começa com BOM, que é o que faz os acentos
aparecerem corretamente no Excel em português.

O filtro de período do relatório também vale para a planilha.
