# CONTINUAR AQUI — Motor novo do Jogo da Meta Batida (multi-cliente)

> Handoff pra outra sessão do Claude Code. Lê isto inteiro antes de agir.
> Idioma do Pedro: português. Ele prefere ação direta (executar, não perguntar à toa)
> e corrigir a causa, não o sintoma. Avise antes de ação cara/inédita.
>
> **A seção 10** ("Pedidos do Pedro em 2026-11-11") tem os 7 pedidos mais recentes — todos
> já implementados e testados (painel admin novo: rodadas com trava, perguntas em lote,
> blocos, lixeira, CSV detalhado, tela de feedback). Leia as "Limitações conhecidas" no fim
> dela antes de expor o admin pra mais alguém além do Pedro.

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
docs/contrato-api.md        ← contrato da API do sistema ANTIGO (reverse engineering) — base
                               de referência, mas a seção 10 deste arquivo AMPLIA/MUDA o
                               escopo do admin em relação a ele.
supabase/schema.sql         ← schema legível (fonte da migration init; já desatualizado
                               em relação às migrations novas — ver supabase/migrations/)
supabase/migrations/        ← TODAS as migrations aplicadas no remoto, em ordem (ver lista
                               abaixo; rodar `ls supabase/migrations/` pra conferir a atual)
supabase/functions/api/index.ts  ← Edge Function única: endpoints do jogador + /gerente.
                               Admin (Passo 3b) ainda não existe aqui.
supabase/config.toml
frontend/                   ← frontend reaproveitado, JÁ ligado ao motor novo:
  index.html gerente.html telao.html admin.html   (Sipolatti, na raiz)
  vilarejo/{index,gerente,telao,admin}.html         (Vilarejo, mesmo css/js)
  css/ img/ js/{cliente,jogador,gerente,telao,admin,config}.js
  js/config.js resolve o tenant pela subpasta da URL (CLIENTES_CONHECIDOS=['vilarejo'])
sheets-sync/                ← vazio (fase futura)
.github/workflows/pages.yml ← publica frontend/ no GitHub Pages a cada push
```

**Publicado:** https://pedronavar.github.io/jogo-meta-batida/ (Sipolatti) e .../vilarejo/
(Vilarejo). Repo: https://github.com/PedroNavar/jogo-meta-batida (público — nunca commitar
senha em texto puro, ver seção 8).

Leia **docs/contrato-api.md** pra entender o sistema antigo, mas siga a **seção 10** deste
arquivo pro que falta fazer de verdade — ela já corrige/amplia pontos do contrato antigo.

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

### Correção do CRONÔMETRO — ✅ FEITO em 2026-11-10 (fim da sessão)
Bug: `pergunta_iniciada_em` era carimbado no servidor no INSTANTE em que o jogador avançava
(em `/comecar` e `/responder`), antes de ele sequer ver a próxima pergunta na tela — qualquer
atraso de rede/processamento virava tempo perdido do cronômetro (perguntas chegavam a abrir
já em 24-26s de 30s). Corrigido: `/comecar`, `/responder` e o `comecar` do `/gerente` agora
deixam `pergunta_iniciada_em = null` ao avançar; `estadoDe()` carimba **lazy**, na primeira
leitura que realmente entrega a pergunta pro jogador (dentro do próprio `GET /jogador`).
Testado simulando 5s de atraso proposital: a próxima pergunta chegou com 29,8s de 30s.
Deployado. **Ver pedido #1 abaixo — a tela de feedback que falta é o que resta desse problema.**

### Passo 3b — Endpoints de ADMIN (ainda NÃO existem na função)
**IMPORTANTE:** antes de implementar, ler a seção 10 abaixo ("Pedidos do Pedro em
2026-11-11") — ela MUDA/AMPLIA o escopo do admin em relação ao que está escrito aqui
embaixo (que é só o que foi levantado por engenharia reversa do sistema antigo).
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

## 10. PEDIDOS DO PEDRO EM 2026-11-11 — ✅ TODOS IMPLEMENTADOS e testados em 2026-11-11

> Registrados antes de implementar (sessão perto do limite semanal), e implementados na
> sessão seguinte, no mesmo dia. Todos testados via curl E no browser (local, porta 5180).
> Deployado: função redeployada, migrations aplicadas, frontend publicado no GitHub Pages.

### Pedidos extras, na mesma sessão: editar pergunta, embaralhar por jogador — ✅ FEITO
Depois de testar o painel, o Pedro pediu mais 3 ajustes:
1. **Editar pergunta (com imagem)**: cada pergunta ativa/oculta no admin agora tem um
   botão "Editar" que abre um formulário pré-preenchido (texto, tipo, tema, 4 opções,
   correta, segundos, bloco, imagem) e salva via `pergunta-editar` (já existia no
   backend, só faltava o botão no frontend). Testado: editei texto e adicionei uma URL
   de imagem numa pergunta existente, confirmei via curl que persistiu.
2. **Campo "Bloco" com sugestão**: os campos de bloco (cadastro em lote e edição) agora
   têm um `<datalist>` com os blocos já cadastrados, pra reaproveitar o nome certo.
   (O relato de "bloco criado não aparece no seletor" era porque nenhuma pergunta tinha
   bloco preenchido ainda — testei criar uma com bloco e ela apareceu certinho no
   seletor de criar rodada; não era bug.)
3. **Perguntas em ordem aleatória, DIFERENTE pra cada jogador** (não uma ordem única
   compartilhada por todo mundo na rodada): nova coluna `jogador.ordem_perguntas int[]`
   (migration `20261111100921`) — uma permutação dos índices das perguntas congeladas,
   sorteada (Fisher-Yates) quando o jogador começa (`/comecar` individual, e
   `comecarTodos()` usado por `/gerente` e `/admin`, gera uma ordem própria POR
   jogador, não uma só pra todos). `estadoDe()`, `/responder`, `jogador-detalhe` e o
   CSV do admin todos passaram a indexar a pergunta atual por
   `ordem_perguntas[indice_atual]` em vez de `indice_atual` direto. Resetar a rodada
   limpa `ordem_perguntas` (sorteia de novo na próxima vez que o jogador começar).
   Testado: 3 jogadores começando a mesma rodada da Vilarejo (20 perguntas) receberam
   3 primeiras perguntas diferentes; `jogador-detalhe` de um deles bateu certinho com a
   pergunta que ele realmente recebeu primeiro. **Efeito colateral do CSV**: a coluna
   "P1" agora significa "a 1ª pergunta que ESSE jogador pegou", não uma pergunta fixa
   igual pra todo mundo — não dá mais pra comparar coluna a coluna entre jogadores
   diferentes achando que é a mesma pergunta (mas `texto`/`tema` no detalhe por jogador
   deixam claro qual pergunta era).

### #1 — Tela de "você acertou / errou + pontos" — ✅ FEITO
`frontend/js/jogador.js`, `responder()`: agora usa a resposta direta de `/api/responder`
(já vem com `feedback` embutido) chamando `renderizar(e)` com ela, em vez de descartá-la e
buscar de novo via `sincronizar()` (que nunca incluía feedback — essa era a causa raiz).
Também elimina 1 round-trip de rede por resposta. Testado: "Você acertou! +923 pontos"
aparece corretamente antes da próxima pergunta carregar.

### #2 — Painel ADM: detalhe por jogador + CSV com colunas de pergunta — ✅ FEITO
`POST /admin {acao:"jogador-detalhe", jogadorId}` devolve, pra cada pergunta da rodada
congelada: texto, tema, opção escolhida, opção **correta** (gabarito — só aparece aqui,
nunca pro jogador/telão) e se acertou. No admin novo (`frontend/js/admin.js`), clicar no
nome na lista de "Ver ranking" abre esse detalhe num `<dialog>`.
`GET /admin/csv?c=&rodadaId=&senha=` devolve CSV (BOM UTF-8, delimitado por vírgula) com
nome/cargo/loja/pontos/acertos/erros + 2 colunas por pergunta ("P1 resposta","P1 certo", …).
Testado via curl: saída conferida linha a linha, bate com o que o jogador respondeu.

### #3 — Início só quando o ADM mandar — ✅ FEITO
Rodadas criadas pelo admin (`acao:"rodada-criar"`) nascem **sempre `travada=true`**.
`acao:"rodada-comecar-todos"` (reaproveita a mesma lógica do `/gerente`, extraída pra
`comecarTodos()`) destrava a rodada e põe todo "aguardando" em "em-jogo" de uma vez, com
`pergunta_iniciada_em=null` (cronômetro de cada um só começa quando ELE buscar a 1ª
pergunta — não quando o admin aperta o botão). Testado via curl: jogador tenta `/comecar`
com a rodada travada → continua "aguardando"; admin chama `rodada-comecar-todos` → jogador
consegue começar. A rodada principal da Vilarejo (criada antes desse recurso existir)
**continua `travada=false`** (auto-atendimento) — se quiser trocar pra exigir start do
admin, rodar `update rodada set travada=true where id='44444444-...'` numa migration nova.

### #4 — Blocos de perguntas — ✅ FEITO
Migration `20261111091534_admin_blocos_exclusao.sql`: `pergunta.bloco text` (rótulo livre,
null = sem bloco) e `rodada.bloco text` (qual bloco usar; null = todas as perguntas do
tenant, comportamento antigo preservado). `congelar()` em `api/index.ts` filtra por
`pergunta.bloco` quando `rodada.bloco` está definido. No admin: cadastro de pergunta tem
campo "Bloco"; criar rodada tem um `<select>` com os blocos que já têm pergunta. Testado
via curl: rodada criada com `bloco:"Bloco QA"` só puxou as 2 perguntas daquele bloco (de um
total de 5+ do tenant).

### #5 — Imagem da pergunta é opcional — ✅ FEITO (era só a UI; o banco já permitia)
Cadastro em lote aceita pergunta sem imagem (campo vazio = `null`, não bloqueia). **Mas:
não existe upload de arquivo** — o campo é uma URL de imagem (texto), não um seletor de
arquivo/Storage. Se precisar de upload de verdade (bucket do Supabase Storage), isso ainda
não foi feito — ficou mais simples assim e resolve o pedido original (imagem nunca
obrigatória), mas é uma limitação a saber.

### #6 — Cadastro de perguntas em LOTE — ✅ FEITO
Painel admin (aba "Perguntas"): botão "+ Nova pergunta" adiciona uma linha de formulário
(texto, tipo, tema, 4 opções, correta, segundos, bloco, imagem — só texto/opções/correta
são obrigatórios); "Salvar todas" manda tudo de uma vez pra
`POST /admin {acao:"perguntas-criar", perguntas:[...]}`, que insere o lote inteiro
(`status:'aprovada', ativa:true` direto — **sem etapa de aprovação separada**, diferente do
sistema antigo; foi uma simplificação deliberada, já que o próprio admin que cadastra).
Isso também destrava a automação do Pedro: ela pode chamar essa rota direto com um array de
perguntas sem imagem, sem precisar resolver upload de arquivo no meio do fluxo.

### #7 — Lixeira de perguntas excluídas (separado de ocultar) — ✅ FEITO
Migration adiciona `pergunta.excluida_em timestamptz` (null = não excluída). No admin, 3
listas: Ativas (`ativa=true, excluida_em null`), Ocultas (`ativa=false, excluida_em null`,
ação "Reativar") e Excluídas (`excluida_em not null`, ação "Restaurar" — **só limpa
`excluida_em`, não mexe no `ativa`**: uma pergunta oculta que foi excluída volta oculta, não
ativa). Testado via curl: ocultar → excluir → aparece em "excluídas" → restaurar → volta
pra "ocultas" (não pra "ativas") — confirmado.

### Bug real encontrado pelo Pedro: admin não mostrava o link da rodada — ✅ CORRIGIDO
Rodada criada pelo admin não tinha como ser compartilhada: só `/gerente.html` mostrava os
campos "Link do jogo"/"Link do telão" depois de criar; o admin não mostrava nada parecido
em nenhuma rodada. Corrigido: cada card de rodada em `frontend/js/admin.js` agora tem os
dois links (jogo e telão), com campo pra copiar — usando `baseUrl()` (mesmo helper do
gerente), então funciona certo tanto na raiz quanto em `/vilarejo/`.

### Outros ajustes da mesma sessão
- **Logo da Vilarejo trocada** pela versão branca (a escura sumia no fundo preto do jogo) —
  `frontend/img/logo-vilarejo-branca.png`, referenciada nas 4 páginas de `frontend/vilarejo/`
  e no `tenant.logo_url` (migration `20261111095033`).
- **Senhas reais da Sipolatti definidas** (admin e gerente — dadas pelo Pedro em chat),
  substituindo as de teste. Vilarejo continua com as senhas de teste já registradas na
  seção "Passo 3a" acima, até o Pedro passar as reais dela também.

### Limitações conhecidas desta implementação (decisões deliberadas, não bugs)
- **Sem sessão de admin de verdade**: cada chamada de `/admin` manda a senha no corpo (o
  `admin.js` guarda em memória depois do login), igual ao `/gerente` — mais simples que
  cookie/token, mas a senha late na aba do navegador enquanto a sessão dura.
- **CSV manda a senha na query string** (`GET /admin/csv?...&senha=`) pra poder ser um link
  clicável/`target=_blank` — aceitável pro uso do Pedro, mas não é o ideal de segurança
  (senha pode ficar no histórico do navegador).
- **Sem upload de imagem de verdade** (ver #5 acima) — campo é só uma URL.
- Essas 3 limitações eram parte do escopo original do Passo 3b/contrato antigo
  (sessão por cookie, upload pra Storage) que foi conscientemente simplificado agora pra
  entregar os 7 pedidos rápido. Rotacionar/revisar antes de abrir o admin pra alguém além
  do Pedro.

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
