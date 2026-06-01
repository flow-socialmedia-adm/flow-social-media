# Ajuste de planos por clientes de agência

Documento de referência para **limites por conta de agência**, **previsibilidade de custo** (armazenamento) e **opção enterprise**.

---

## Objetivo

- Limitar a quantidade de **clientes cadastrados por agência** conforme o plano contratado.
- Permitir **prever custos** de object storage (ex.: Cloudflare R2, Backblaze B2) com base no pior caso por agência.
- Oferecer plano **ilimitado** apenas via **contato comercial** (Enterprise).

---

## Premissa de armazenamento (planejamento interno)

| Item | Valor |
|------|--------|
| Estimativa por cliente | ~**300 MB** de mídia no pior caso (logotipos, fotos, elementos gráficos, ícones) |
| Uso | **Interno** para dimensionar custo; não é obrigatório expor “300 MB por cliente” ao cliente final |

**Fórmula (estimativa por agência):**  
`armazenamento_máximo_estimado ≈ clientes_máximos_do_plano × 300 MB`

---

## Planos sugeridos

| Plano | Máx. clientes / agência | Storage estimado (300 MB/cliente) | Perfil típico |
|-------|-------------------------|-----------------------------------|---------------|
| **Start** | **5** | ~**1,5 GB** | Agência pequena |
| **Pro** | **15** | ~**4,5 GB** | Agência em crescimento |
| **Business** | **40** ou **50** | ~**12 GB** ou ~**15 GB** | Agência com carteira maior |
| **Enterprise** | **Ilimitado** (negociado) | Conforme contrato | Grandes contas; contato comercial |

**Business:** escolher **40** ou **50** conforme posicionamento de preço; a lógica proporcional permanece.

---

## Enterprise — “Ilimitado com contato comercial”

- Sem teto fixo de clientes na aplicação **ou** teto muito alto, definido em **contrato**.
- Entrada: formulário / botão **“Falar com vendas”**.
- Permite margem e limites (clientes, storage, SLA) negociados caso a caso.

---

## Benefícios do modelo

1. **Previsibilidade** de custo de storage por agência.
2. **Comunicação clara:** “Até X clientes no seu plano”.
3. **Alinhado a SaaS** que limitam recursos (projetos, contatos, assentos) por plano.
4. **Enterprise** cobre exceções sem quebrar os três planos self-service.

---

## Próximos passos (produto / operação)

- Definir **preços** de Start, Pro e Business.
- No sistema: **bloquear** cadastro de novo cliente ao atingir o limite (mensagem + upgrade / contato).
- Opcional: **teto de armazenamento por agência** ou política de uso para picos atípicos.
- Contrato / termos: limites por plano e menção ao plano Enterprise.

---

## Referência rápida de custo (object storage)

Ordem de grandeza com **~300 MB por cliente** (apenas storage; egress e requests variam por provedor):

| Clientes máx. / agência | ~GB por agência (pior caso) |
|-------------------------|-----------------------------|
| 5 | ~1,5 |
| 15 | ~4,5 |
| 40 | ~12 |
| 50 | ~15 |

---

*Última atualização: documento gerado para consulta futura no repositório do projeto.*
