# App de Frequência — Especificação

Documento fechado a partir das decisões tomadas. Serve de referência
durante o desenvolvimento e evita retrabalho.

---

## 1. Problema

Hoje a lista de presença é digitada à mão a cada encontro e enviada como
texto no grupo. Isso significa:

- retrabalho semanal reescrevendo os mesmos ~36 nomes
- contagem manual de presentes e ausentes
- nenhum histórico consultável (ninguém sabe quem faltou 3 vezes seguidas)
- categoria "nunca vão" mantida de cabeça
- nenhum registro de quem contatou quem faltou

## 2. Usuários

Quatro pessoas com acesso: **Paulo** (líder), **Italo**, **Marlon** e
**Washington**.

Não há papéis diferentes por enquanto — todos podem fazer tudo. O que
diferencia é o registro de **quem** fez cada ação.

## 3. Regra de escala

Cada encontro precisa ter a chamada preenchida por pelo menos um dos três
responsáveis (Italo, Marlon, Washington).

O app registra quem preencheu e sinaliza no dashboard os encontros que
ficaram **sem chamada**.

> Isso substitui a leitura anterior da regra "-1 de 3", que estava
> transcrita errada no áudio.

## 4. Encontros

Dois tipos contam: **domingo** e **quarta**.

O app permite criar outros tipos depois sem mudar o banco (o campo é texto
com constraint, não enum rígido).

## 5. Pessoas

Duas categorias:

| Categoria | Descrição |
|---|---|
| Membro | Pessoa da rede, entra na contagem principal |
| Visitante | Convidado, vinculado a quem convidou |

O vínculo `convidado_por` reproduz o formato atual da lista —
"Jonathan (Bluma)" vira Jonathan, visitante, convidado por Bluma.

### Status automático

Calculado por faltas consecutivas, não marcado à mão:

| Faltas seguidas | Status |
|---|---|
| 0–1 | Normal |
| 2–3 | **Alerta** — aparece no painel de contato |
| 4+ | **Afastado** — equivale ao atual "nunca vão" |

Os dois números ficam em tabela de configuração, editáveis sem mexer no
código.

## 6. Registro de contato

Quando alguém falta, qualquer um dos quatro pode registrar o contato feito:

- quem contatou
- data
- resposta da pessoa (texto livre)

É o que transforma a lista em acompanhamento de verdade. Sem isso o app é
só uma planilha bonita.

## 7. Telas

1. **PIN** — quatro dígitos, escolha do nome na primeira vez, salvo no
   aparelho
2. **Chamada** — data, tipo do encontro, lista de nomes, toque alterna
   presente/ausente, salva em lote
3. **Dashboard** — totais, encontros sem chamada, painel de alerta e
   afastados
4. **Pessoas** — cadastro, edição, marcar visitante e quem convidou
5. **Contatos** — registrar e consultar contatos feitos
6. **Exportar** — gera o texto no formato atual do grupo e copia para
   colar no WhatsApp

A tela 6 é o que garante adoção. O grupo continua recebendo o mesmo
formato de sempre.

## 8. Stack

| Camada | Escolha |
|---|---|
| Front | HTML/CSS/JS puro, hospedado na Vercel |
| API | Vercel Functions (`/api`) |
| Banco | Neon (PostgreSQL, plano gratuito) |
| Acesso | PIN de 4 dígitos com hash bcrypt |

Custo total: R$ 0.

## 9. Fora do escopo desta versão

- Bot de WhatsApp (exige API oficial paga)
- Importação do histórico antigo
- Escala automática de quem preenche
- Relatórios em PDF
- App nativo

## 10. Pendências antes de codar

1. Confirmar os limites de 2 e 4 faltas
2. Confirmar se o "Paulo" da categoria afastados é o mesmo Paulo líder
3. Revisar a grafia dos nomes do seed
