# CONTINUAR AQUI — Motor novo do Jogo da Meta Batida (multi-cliente)

> Handoff pra outra sessão do Claude Code. Lê isto inteiro antes de agir.
> Idioma do Pedro: português. Ele prefere ação direta (executar, não perguntar à toa)
> e corrigir a causa, não o sintoma. Avise antes de ação cara/inédita.

## 1. O objetivo

A Metta tem um jogo-quiz de vendas ("Jogo da Meta Batida") rodando para o cliente
**Sipolatti** em `https://jogo.187-77-37-136.sslip.io`. Queremos **replicar para outros
clientes** da Metta. Não temos o código-fonte do backend original (só engenharia reversa
do frontend). Decisão: **reconstruir o backend** num stack **grátis** e **multi-cliente**,
**reaproveitando o frontend existente** (que eu já baixei).

## 2. A arquitetura escolhida (e por quê)

- **Supabase (plano grátis)** como motor: Postgres (banco de verdade, aguenta
  concorrência), **Edge Functions** (Deno/TS, lógica no servidor — pontuação por
  velocidade fica protegida), **Broadcast** (tempo real; substitui o SSE do original),
  **Storage** (imagens, depois).
- **Google Sheets** entra depois só como **autoria de conteúdo** (perguntas/lojas por
  cliente), sincronizado pro Supabase. NÃO usar Apps Script como backend: ele não faz
  push em tempo real, trava em ~30 execuções simultâneas e a planilha trava sob
  concorrência — justamente onde este jogo precisa brilhar. Firebase foi descartado
  porque Functions exige plano pago; Supabase Edge Functions são grátis.
- **Frontend reaproveitado**: os 5 módulos JS originais + HTML/CSS/logos.

## 3. O que JÁ ESTÁ FEITO (funcionando e verificado ao vivo)

- Banco criado no Supabase (8 tabelas, RLS ligado). Migration:
  `supabase/migrations/20261110152631_init.sql`.
- Seed da Sipolatti aplicado: 1 tenant, 3 lojas, 5 perguntas Venda 4.0 aprovadas,
  1 rodada aberta (`20261110153748_seed_sipolatti.sql`).
- Edge Function `api` **deployada** com os 6 endpoints do JOGADOR:
  `/config`, `/entrar`, `/jogador`, `/comecar`, `/responder`, `/ranking`.
- **Testado de ponta a ponta via curl** (tudo passou):
  - pontuação por velocidade: resposta rápida correta deu **956 pts** (fórmula 500–1000);
  - gabarito **NÃO vaza** no payload do jogador;
  - resposta repetida → **HTTP 409**;
  - ranking ordena certo.

Teste deixou 2 jogadores de teste na rodada (Pedro Teste 0 pts, Maria Veloz 956 pts).
Pra limpar: `delete from jogador where rodada_id='22222222-2222-2222-2222-222222222222';`

## 4. Dados do projeto Supabase

- Project URL: `https://pmcyfsajhwdjtqwjbjik.supabase.co`
- Project ref: `pmcyfsajhwdjtqwjbjik`  · Org: PedroNavar's Org (FREE) · Região: us-east-1
- **Publishable key (PÚBLICA, pode usar no frontend):**
  `sb_publishable_aUuHpcqxIlf0ZNuEZZWZwg_RcyDQ4vd`
- **service_role / secret key:** NUNCA pedir no chat. As Edge Functions recebem
  `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` **injetadas automaticamente** pelo Supabase
  — não precisa configurar secret pra isso.
- Função: `https://pmcyfsajhwdjtqwjbjik.supabase.co/functions/v1/api/<rota>`
  (chamadas precisam do header `apikey: <publishable key>`).

## 5. Como operar (lições já aprendidas — não repita os tropeços)

- **A CLI do Supabase só resolve via `npx --yes supabase ...`** nesta máquina
  (não há binário no PATH). Versão 3.1.0.
- O projeto **já está logado e linkado** nesta máquina (o login persiste global; o link
  está em `meta-batida/supabase/.temp/`). Numa sessão nova na MESMA máquina, só rodar
  `npx supabase ...` dentro de `meta-batida/`. Se não estiver linkado:
  `npx --yes supabase link --project-ref pmcyfsajhwdjtqwjbjik` (aceita senha vazia).
- **Não precisa de Docker** pra `db push`/`functions deploy` (Docker só pra `supabase start` local).
- `db push` e `functions deploy` pedem confirmação em "agent mode" — adicione `--yes`.
  Use `--remote` no push (ex.: `npx --yes supabase db push --remote --yes </dev/null`).
- Nova mudança de banco = nova migration em `supabase/migrations/<timestamp>_nome.sql`
  (timestamp `date +%Y%m%d%H%M%S`), depois `db push --remote --yes`.
- Deploy da função: `npx --yes supabase functions deploy api --no-verify-jwt --yes </dev/null`.
  O **`--no-verify-jwt` é obrigatório**: o jogador manda nosso Bearer token próprio, não um JWT do Supabase.
- Ambiente é Windows + git-bash: **`/tmp` não existe** — use o scratchpad ou variáveis de shell.
- Fuso/datas no `estado`: o cronômetro usa `pergunta_iniciada_em` (timestamptz) no servidor.

## 6. Mapa de arquivos (em `C:\Users\pedro\OneDrive\Documents\Teste\pessoal\meta-batida\`)

```
docs/contrato-api.md        ← contrato COMPLETO da API (todos endpoints/payloads) + 9 regras
supabase/schema.sql         ← schema legível (fonte da migration init)
supabase/migrations/        ← init + seed (já aplicados no remoto)
supabase/functions/api/index.ts  ← Edge Function (só endpoints do jogador por enquanto)
supabase/config.toml
frontend/                   ← frontend ORIGINAL reaproveitado, AINDA aponta pro sslip.io:
  index.html gerente.html telao.html admin.html jogar.html
  css/ img/ js/{cliente,jogador,gerente,telao,admin}.js
sheets-sync/                ← vazio (fase futura)
```

Leia **docs/contrato-api.md** — é a bíblia do que o backend tem que cumprir.

## 7. PRÓXIMOS PASSOS (em ordem)

### Passo 1 — Ligar o frontend no motor — ✅ FEITO e testado ao vivo em 2026-11-10
`frontend/js/config.js` criado; `cliente.js` prefixa toda chamada com a URL da function +
`apikey`, resolve `?c=sipolatti` para `/config` e `/entrar`, e expõe `conectarRanking()`
(canal Broadcast `rodada:<id>`, evento `ranking`) usado por `jogador.js` e `telao.js` no
lugar do `EventSource` antigo. **Não filtra por loja** (o motor ainda só calcula um top-3
geral por cargo — `podio:'loja'` fica pendente pro Passo 3/4).
Precisou de 1 fix no backend: `Access-Control-Allow-Headers` da function não liberava
`apikey`/`x-client-info` (o supabase-js manda sempre) — função redeployada com o header
liberado. Testado ponta a ponta no browser (servindo `frontend/` em `http://localhost:5180`,
config em `pessoal/.claude/launch.json` → `"meta-batida"`): login, pergunta, pontuação e
pódio ao vivo em **duas abas separadas** (jogador + telão) via Broadcast, tudo OK.
**Pendência:** sobraram jogadores de teste na rodada `22222222-...-222222222222`
(`Teste Broadcast` e outro de teste); `supabase db push` ficou bloqueado pelo classificador
de permissão desta sessão (aparece como "Production Deploy") — rodar manualmente quando
quiser aplicar `supabase/migrations/20261110162529_limpar_teste_motor.sql`:
```
npx --yes supabase db push --remote --yes
```

### Passo 1 (texto original, já aplicado acima — mantido como referência)
O frontend chama rotas relativas `/api/...` e usa `EventSource('/api/eventos')`. Adaptar:
1. Criar `frontend/js/config.js` exportando:
   ```js
   export const SUPABASE_URL = "https://pmcyfsajhwdjtqwjbjik.supabase.co";
   export const SUPABASE_KEY = "sb_publishable_aUuHpcqxIlf0ZNuEZZWZwg_RcyDQ4vd";
   export const API = SUPABASE_URL + "/functions/v1/api";
   ```
2. Em `js/cliente.js`, função `api(rota,...)`: prefixar a rota com `API` (trocar
   `fetch(rota,...)` por `fetch(API + rota.replace('/api',''),...)`) e **sempre** mandar
   header `apikey: SUPABASE_KEY` (além do `Authorization: Bearer` quando houver token).
3. **Tempo real**: trocar `EventSource('/api/eventos...')` (em `jogador.js` e `telao.js`)
   por subscription do supabase-js no canal Broadcast:
   ```js
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
   const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
   const ch = sb.channel(`rodada:${rodadaId}`)
     .on("broadcast", { event: "ranking" }, ({payload}) => { /* = evento 'ranking' antigo */ })
     .subscribe();
   ```
   O payload do broadcast tem o MESMO formato do evento SSE `ranking`
   (`{rodadaId, top, liberada, jogando, terminadas}`). A função já emite via
   `emitirRanking()` após entrar/comecar/responder.
4. Testar no navegador (preview_start / browser pane) e, pra celular, publicar (passo 2).
   O contrato de `config?c=sipolatti` precisa do slug do tenant — o frontend tem que
   mandar `?c=sipolatti` (ou resolver tenant por subdomínio depois).

### Passo 2 — Publicar o frontend num host estático grátis — ✅ FEITO em 2026-11-10
Publicado via **GitHub Pages**, grátis (repo público): https://pedronavar.github.io/jogo-meta-batida/
Repo: https://github.com/PedroNavar/jogo-meta-batida (separado do segundo cérebro).
Deploy automático via `.github/workflows/pages.yml` a cada push em `frontend/`.
Precisou trocar os caminhos absolutos (`/css`, `/js`, `/img`) por relativos — GitHub Pages
de projeto serve numa subpasta (`/jogo-meta-batida/`), não na raiz do domínio.

### Passo 3a — Endpoint de GERENTE — ✅ FEITO em 2026-11-10 (admin ainda falta)
`POST /gerente` implementado em `api/index.ts` (acoes: criar/ver/comecar/resetar/encerrar).
Senha verificada via **pgcrypto** (bcrypt) no próprio Postgres — funções
`verificar_senha_gerente/admin` e `definir_senha_gerente/admin` em
`supabase/migrations/20261110164300_senhas_gerente_admin.sql`. **A Edge Function nunca
lê o hash puro**, só chama a função via `.rpc()`. As senhas reais de cada tenant foram
definidas à parte (fora do git, repo é público — ver memória da sessão ou perguntar ao Pedro).
`ver`/`comecar`/`resetar`/`encerrar` só funcionam em rodadas com `grupo=true` (criadas pelo
próprio gerente); a rodada "principal" de cada tenant (ex.: "Teste motor", "Meta Batida
Vilarejo") só pode ser controlada por **admin** — que ainda não existe (resto do Passo 3).

### Multi-cliente: Vilarejo — ✅ primeiro cliente replicado, em 2026-11-10
Tenant `vilarejo` criado (schema já era multi-tenant desde o início): 9 lojas, 20 perguntas
(30s cada), 1 rodada aberta (`travada=false`, autoatendimento — sem painel de admin ainda
pra essa rodada principal) e a lista de 9 vendedores esperados. Frontend: **mesmo `css/`
e `js/` da Sipolatti**, só o HTML + logo mudam, numa subpasta própria
(`frontend/vilarejo/`, publicada em `/vilarejo/`). `config.js` agora resolve o tenant pelo
nome da subpasta na URL (lista `CLIENTES_CONHECIDOS`), não mais fixo em `'sipolatti'` —
**replicar pra um cliente novo = criar a subpasta + o tenant no banco**, sem duplicar JS/CSS.
Link: https://pedronavar.github.io/jogo-meta-batida/vilarejo/
Também corrigido: `gerente.js`/`admin.js` geravam os links de telão/jogo com
`location.origin` (perdia a subpasta); agora usam `baseUrl()` (`new URL('.', location.href)`).

### Passo 3b — Endpoints de ADMIN (ainda NÃO existem na função)
Implementar no mesmo `api/index.ts` (ou função separada) conforme docs/contrato-api.md:
- Admin (sessão por cookie no original — no novo, pode ser login que devolve um token de
  admin, ou Supabase Auth): `/api/login`, `/api/admin/estado|presenca|ranking|a-postos|
  csv|upload|perguntas|editar|aprovar|remover|lista|liberar|rodadas|abrir|comecar-todos|
  resetar|segundos|lojas|logout`.
- Upload de imagem → Supabase Storage (bucket `img-upload`, validar ≤3MB jpg/png/webp).
- Senhas de gerente/admin: hoje o seed tem `senha_*_hash='TODO-hash'`. Implementar hash
  de verdade (bcrypt/argon via Deno) e um jeito de cadastrar por tenant.

### Passo 4 — Multi-cliente de verdade
- Resolver tenant por subdomínio (`sipolatti.jogo.metta...`) ou `?c=slug`.
- Marca por tenant (logo_url, cor_primaria) aplicada no frontend.
- Perguntas `base=true` (Venda 4.0) compartilhadas: ao criar um tenant novo, copiar as base.
- Painel admin central da Metta vendo todos os tenants (futuro).

## 8. Pendências de SEGURANÇA (não esquecer)
- A **senha do admin do jogo atual** da Sipolatti e a senha de criar rodada estão em
  **texto puro** em documentos que circulam fora deste repositório (fora do escopo deste
  diretório — não repetir os valores aqui). Rotacionar e tirar dos documentos.
- No motor novo: senhas sempre em hash; nunca devolver `pergunta.correta` ao jogador/telão
  (já garantido na função atual — manter).

## 9. Regras de negócio que o backend TEM que honrar (resumo; detalhes no contrato)
1. Gabarito só no servidor. 2. Pontuação 500–1000 por velocidade, no servidor, 0 se erra.
3. Lista de perguntas congela na entrada do 1º jogador (`rodada.iniciada`, snapshot em
   `rodada_pergunta`). 4. Rodada encerrada não reabre. 5. Resposta repetida → 409.
6. Nome único por rodada. 7. Regional e Outro jogam mas não entram no pódio.
8. Upload ≤3MB jpg/png/webp, caminho validado (sem `..`). 9. Tudo por tenant.
