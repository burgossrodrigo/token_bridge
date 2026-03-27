# Abordagem: Sessão como Produção + Aprendizado

## A ideia

Em vez de pedir ao AI para escrever os arquivos diretamente, usamos a sessão assim:

1. **AI mostra o código** — mas não aplica
2. **AI explica as seções pertinentes** — conceitos do ecossistema, padrões, armadilhas
3. **Dev implementa por conta própria** — copia/adapta com entendimento
4. **AI revisa o resultado** — aponta erros, sugere melhorias, valida

O resultado: você entrega código em produção E absorve o conceito. Não é só copiar.

---

## Por que funciona

- Ler código explicado é muito mais eficaz do que ler documentação fria
- Implementar manualmente (mesmo copiando) força o cérebro a processar a estrutura
- A revisão no final fecha o loop — você descobre o que entendeu errado sem quebrar produção
- Você pode fazer perguntas durante a implementação com contexto real

---

## Como acionar

Quando pedir ajuda para implementar algo novo, adicione:

> "Me mostra como tem que ser, explica coisas pertinentes e revisa depois que eu terminar."

Isso sinaliza o modo: **show → explain → you implement → review**.

---

## O que o AI explica por padrão nesse modo

- Por que essa estrutura (não só o que é)
- Diferenças em relação ao que você já conhece (ex: Solidity vs Anchor)
- Armadilhas comuns de junior no ecossistema
- O que o framework/compilador faz por você (magia invisível)
- Quando usar padrão A vs padrão B

---

## Exemplo de sessão (este projeto)

**Contexto:** Anchor/Rust, implementando instruções de bridge.

**Conceitos explicados:**
- `CpiContext::new` vs `CpiContext::new_with_signer` — quando o PDA assina
- `has_one =` — equivalente ao `onlyOwner` do Solidity, sem boilerplate
- `Option<Account<'info, T>>` — contas opcionais com validação condicional
- `/// CHECK:` — por que o Anchor exige documentar `AccountInfo` sem tipo
- `ctx.bumps.nome_da_conta` — como o Anchor expõe o bump canônico do PDA
- `token::mint =` e `token::authority =` — constraints que validam campos do TokenAccount
- `close = payer` vs `is_active = false` — duas estratégias para "remover" estado

---

## Estrutura dos arquivos implementados nessa sessão

```
programs/bridge/src/instructions/
├── bridge_send.rs       — burn SPL + emit TokenSent
├── bridge_receive.rs    — mint SPL via PDA signer + emit TokenReceived
├── set_bridge_status.rs — liga/desliga bridge_on
├── set_admin.rs         — cria AdminConfig PDA
└── remove_admin.rs      — desativa is_active no AdminConfig
```

Depois de implementar todos, atualizar:
- `instructions/mod.rs` — adicionar pub mod + pub use para cada novo arquivo
- `lib.rs` — registrar cada instrução no bloco `#[program]`

Então rodar:
```bash
cd contracts/solana
anchor build
```
