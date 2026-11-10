# Contrato da API — Jogo da Meta Batida

Reconstruído por engenharia reversa do frontend (jogador.js, cliente.js, gerente.js,
telao.js, admin.js) e do tráfego observado. É o contrato que o backend novo (Supabase)
precisa cumprir para que o frontend existente funcione sem reescrever as telas.

Convenções do cliente (de `cliente.js` → `api()`):
- GET quando não há body; POST com `Content-Type: application/json` quando há.
- Autenticação do jogador: header `Authorization: Bearer <token>`.
- Todo POST manda `X-Requested-With: jogo`.
- Erro: status != 2xx com corpo `{ "erro": "<mensagem>" }`. 401 derruba para a tela de login.
- Admin usa sessão por cookie (`credentials: same-origin`), não Bearer.

---

## Público / jogador

### GET /api/config?r=<rodadaId?>
Resposta:
```json
{
  "liberado": true,
  "mensagem": "texto opcional no lugar do nome da rodada",
  "rodada": {
    "id": "uuid", "nome": "Gerentes 04/11",
    "segundos": 30, "tempoUnico": true,
    "perguntas": 20, "travada": true,
    "podio": "geral|loja",
    "publico": ["Gerente","Vendedor"],   // só em rodada de regional; filtra cargos
    "loja": "03"                           // rodada presa a uma loja (opcional)
  },
  "lojas": [ { "filial": "03", "rotulo": "03 · Santa Mônica (Vila Velha/ES)" } ],
  "nomes": { "Gerente": ["..."], "Vendedor": ["..."] }  // listas de nomes por cargo (opcional)
}
```

### POST /api/entrar
Body: `{ cargo, nome, loja, rodadaId?, token? }` → `{ "token": "<bearer>" }`

### GET /api/jogador   (Bearer)
Retorna o **estado** do jogador (ver schema de Estado abaixo).

### POST /api/comecar   (Bearer, body `{}`)
Inicia o relógio do jogador (destrava quando a rodada não está travada). Retorna Estado.

### POST /api/responder   (Bearer)
Body: `{ perguntaId, opcao }` → Estado (com `feedback`).
- Resposta repetida: responder de novo retorna **409** (o cliente trata como já registrada).
- A correção e os pontos são decididos **no servidor**. O cliente nunca recebe o gabarito.

### GET /api/ranking?rodadaId=&cargo=
`{ "linhas": [ { "id", "nome", "loja", "cargo", "pontos", "posicao" } ] }`

### Tempo real — SSE hoje, Supabase Realtime no novo
Hoje: `GET /api/eventos?rodadaId=&loja=` (EventSource), evento `ranking`:
```json
{ "rodadaId":"uuid", "top":[{ "id","nome","loja","cargo","pontos" }],
  "liberada": true, "jogando": 12, "terminadas": 3 }
```
No backend novo isto vira uma **subscription Supabase Realtime** no ranking da rodada
(ver `docs/realtime.md`). O payload `ranking` acima é o formato que o telão/jogador esperam.

### Estado (retorno de /api/jogador, /api/comecar, /api/responder)
```json
{
  "situacao": "aguardando|em-jogo|terminou|encerrada",
  "posicao": 4, "posicaoLoja": 2,
  "rodada": { "id","nome","segundos","tempoUnico","perguntas","travada","podio" },
  "jogador": { "id","nome","loja","cargo","pontos","acertos","erros" },
  "pergunta": {                      // ausente quando aguardando/terminou/feedback
    "id","numero","total","tema","texto","produto",
    "imagem":"img-upload/....jpg", "proximaImagem":"...",
    "opcoes":["A","B","C","D"],      // SEM índice da correta
    "restanteMs": 21834, "segundos": 30
  },
  "feedback": { "mensagem":"...", "pontos": 870, "restanteMs": 1500 }  // só logo após responder
}
```

---

## Gerente / Regional  —  POST /api/gerente
Body sempre com `{ senha, acao, ... }`. Senha única de criação (não dá acesso ao admin).
- `acao:"criar"` `{ papel:"Gerente|Regional", responsavel, loja, publico }` → rodada
- `acao:"ver"`     `{ id }` → rodada `{ id, nome, status, travada, emJogo, terminaram, aPostos:[{nome,cargo}] }`
- `acao:"comecar"` `{ id }`  (destrava todos)
- `acao:"resetar"` `{ id }`  (zera pontos, trava de novo)
- `acao:"encerrar"``{ id }`  (fecha; não reabre)

Links gerados pelo gerente: jogo `/?r=<id>`, telão `/telao?r=<id>`.

---

## Admin (RH / instrutor) — sessão por cookie
- POST /api/login `{ senha }` → cookie de sessão
- POST /api/admin/logout `{}`
- GET  /api/admin/estado → `{ rodadas:[...], lojas:[...], perguntas:[...], aprovadas }`
- GET  /api/admin/presenca?rodadaId= → `{ totais:{}, linhas:[{id,nome,cargo,loja,situacao}] }`
- GET  /api/admin/ranking?rodadaId=  → `{ linhas:[{posicao,nome,cargo,loja,acertos,erros,pontos}] }`
- GET  /api/admin/a-postos?rodadaId= → `{ travada, aPostos:[{nome,cargo}], emJogo, terminaram }`
- GET  /api/admin/csv?rodadaId= → CSV (download)
- POST /api/admin/upload (corpo = File binário) → `{ imagem:"img-upload/<arquivo>" }`
- POST /api/admin/perguntas `{ texto,tipo,tema,opcoes[4],correta,segundos,imagem }` (cria pendente)
- POST /api/admin/editar `{ id, texto,tipo,tema,opcoes,correta,segundos,imagem? }`
- POST /api/admin/aprovar `{ id,status } | { todos:true, status }`
- POST /api/admin/remover `{ id }` (desativa)
- POST /api/admin/lista `{ id, texto }` → `{ importados, avisos[] }`  (lista de esperados)
- POST /api/admin/liberar `{ rodadaId, id }`  (apaga participação+pontos do jogador)
- POST /api/admin/rodadas `{ nome, segundos, podio }` (cria)
- POST /api/admin/abrir `{ id, responsavel }`
- POST /api/admin/comecar-todos `{ id }`
- POST /api/admin/resetar `{ id }`
- POST /api/admin/encerrar `{ id }`
- POST /api/admin/segundos `{ id, segundos }`
- POST /api/admin/lojas `{ lojas:[{filial,nome,rotulo}] }`

---

## Regras de negócio observadas (precisam ser honradas no backend)
1. **Gabarito só no servidor.** `pergunta.correta` aparece apenas no admin. Jogador/telão nunca recebem.
2. **Pontuação por velocidade (500–1000), calculada no servidor.** 0 em erro. (Fórmula inferida em `docs/realtime.md`.)
3. **Lista de perguntas congela** quando o 1º jogador entra (`iniciada=true`). Edições depois não afetam rodada iniciada.
4. **Rodada encerrada não reabre.**
5. **Resposta duplicada → 409.**
6. **Nomes únicos por rodada**; "nome já jogou" → usar sobrenome, ou admin "libera" (apaga pontos).
7. **Regional e Outro jogam mas não entram no pódio** (aparecem só na lista do próprio cargo).
8. **Upload de imagem:** ≤ 3 MB, jpg/png/webp. Caminho servido de `/img` ou `/img-upload`,
   validado por `imagemLocal()` (sem `..`).
9. **Multi-cliente (novo):** tudo acima passa a ser por `tenant` (cliente).
