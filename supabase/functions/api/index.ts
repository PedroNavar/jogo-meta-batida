// ============================================================================
// Edge Function `api` — motor do Jogo da Meta Batida (endpoints do jogador)
// Roteia /functions/v1/api/<rota>. Usa service role (injetada pelo Supabase),
// então ignora RLS e devolve só o que o contrato permite — nunca o gabarito.
// Tempo real: Broadcast no canal `rodada:<id>`, evento `ranking` (formato do SSE antigo).
// Contrato: docs/contrato-api.md. Pontuação 500–1000 por velocidade, no servidor.
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-requested-with, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);

const PODIO_CARGOS = ["Vendedor", "Gerente"]; // Regional e Outro jogam mas não entram no pódio

// ---- Broadcast do ranking (equivalente ao evento SSE "ranking") ------------
async function emitirRanking(rodadaId: string) {
  const payload = await montarRanking(rodadaId);
  await fetch(`${URL_SB}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    body: JSON.stringify({
      messages: [{ topic: `rodada:${rodadaId}`, event: "ranking", payload, private: false }],
    }),
  }).catch(() => {});
}

async function montarRanking(rodadaId: string) {
  const { data: rodada } = await db.from("rodada").select("*").eq("id", rodadaId).single();
  const { data: jogadores } = await db.from("jogador")
    .select("id,nome,loja,cargo,pontos,situacao").eq("rodada_id", rodadaId);
  const js = jogadores ?? [];
  const top = js.filter((j) => PODIO_CARGOS.includes(j.cargo) && j.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos).slice(0, 3)
    .map((j) => ({ id: j.id, nome: j.nome, loja: j.loja, cargo: j.cargo, pontos: j.pontos }));
  return {
    rodadaId,
    top,
    liberada: rodada?.status === "aberta" && !rodada?.travada,
    jogando: js.filter((j) => j.situacao === "em-jogo").length,
    terminadas: js.filter((j) => j.situacao === "terminou").length,
  };
}

// ---- Resolução de tenant / rodada ------------------------------------------
async function tenantPorSlug(slug: string | null) {
  const q = db.from("tenant").select("*");
  const { data } = slug ? await q.eq("slug", slug).maybeSingle() : await q.limit(1).maybeSingle();
  return data;
}
async function rodadaAtiva(tenantId: string, rodadaId: string | null) {
  if (rodadaId) {
    const { data } = await db.from("rodada").select("*").eq("id", rodadaId).maybeSingle();
    return data;
  }
  const { data } = await db.from("rodada").select("*")
    .eq("tenant_id", tenantId).eq("grupo", false).eq("status", "aberta")
    .order("aberta_em", { ascending: false }).limit(1).maybeSingle();
  return data;
}

// ---- Congela a lista de perguntas na entrada do 1º jogador ------------------
async function congelar(rodada: any) {
  if (rodada.iniciada) return;
  const { data: perguntas } = await db.from("pergunta").select("*")
    .eq("tenant_id", rodada.tenant_id).eq("ativa", true).eq("status", "aprovada")
    .order("criado_em", { ascending: true });
  const lista = (perguntas ?? []).slice(0, 20);
  const linhas = lista.map((q: any, i: number) => ({
    rodada_id: rodada.id, ordem: i, pergunta_id: q.id,
    texto: q.texto, tema: q.tema, produto: null,
    opcoes: q.opcoes, correta: q.correta, segundos: q.segundos, imagem: q.imagem,
  }));
  if (linhas.length) await db.from("rodada_pergunta").insert(linhas);
  await db.from("rodada").update({ iniciada: true }).eq("id", rodada.id);
  rodada.iniciada = true;
}

async function perguntasDaRodada(rodadaId: string) {
  const { data } = await db.from("rodada_pergunta").select("*").eq("rodada_id", rodadaId).order("ordem");
  return data ?? [];
}

// ---- Rodada vista pelo gerente/regional (resumo + a postos) ----------------
async function verRodada(rodadaId: string) {
  const { data: rodada } = await db.from("rodada").select("*").eq("id", rodadaId).single();
  const { data: jogadores } = await db.from("jogador").select("nome,cargo,situacao").eq("rodada_id", rodadaId);
  const js = jogadores ?? [];
  return {
    id: rodada.id, nome: rodada.nome, status: rodada.status, travada: rodada.travada,
    emJogo: js.filter((j) => j.situacao === "em-jogo").length,
    terminaram: js.filter((j) => j.situacao === "terminou").length,
    aPostos: js.filter((j) => j.situacao === "aguardando").map((j) => ({ nome: j.nome, cargo: j.cargo })),
  };
}
const PUBLICO_POR_OPCAO: Record<string, string[]> = {
  vendedores: ["Vendedor"], gerentes: ["Gerente"], ambos: ["Vendedor", "Gerente"],
};

// ---- Posição do jogador (entre os elegíveis ao pódio) ----------------------
async function posicoes(rodadaId: string) {
  const { data } = await db.from("jogador").select("id,cargo,loja,pontos").eq("rodada_id", rodadaId);
  const js = data ?? [];
  const elegiveis = js.filter((j) => PODIO_CARGOS.includes(j.cargo) && j.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos);
  const geral = new Map(elegiveis.map((j, i) => [j.id, i + 1]));
  return { geral, js };
}

// ---- Monta o Estado do jogador (retorno de jogador/comecar/responder) ------
async function estadoDe(token: string, feedback?: any) {
  const { data: j } = await db.from("jogador").select("*").eq("token", token).maybeSingle();
  if (!j) return { _404: true };
  const { data: rodada } = await db.from("rodada").select("*").eq("id", j.rodada_id).single();
  const perguntas = await perguntasDaRodada(j.rodada_id);
  const total = perguntas.length;
  const { geral } = await posicoes(j.rodada_id);

  const base: any = {
    rodada: {
      id: rodada.id, nome: rodada.nome, segundos: rodada.segundos,
      tempoUnico: true, perguntas: total, travada: rodada.travada, podio: rodada.podio,
    },
    jogador: {
      id: j.id, nome: j.nome, loja: j.loja, cargo: j.cargo,
      pontos: j.pontos, acertos: j.acertos, erros: j.erros,
    },
    posicao: geral.get(j.id) ?? null,
    posicaoLoja: null,
  };

  if (rodada.status === "encerrada") return { ...base, situacao: "encerrada" };
  if (feedback) return { ...base, situacao: "em-jogo", feedback };
  if (j.situacao === "terminou" || j.indice_atual >= total) return { ...base, situacao: "terminou" };
  if (j.situacao === "aguardando") return { ...base, situacao: "aguardando" };

  // em-jogo: devolve a pergunta atual SEM o gabarito
  const q = perguntas[j.indice_atual];
  if (!q) return { ...base, situacao: "terminou" };
  const segs = q.segundos ?? rodada.segundos;
  const totalMs = segs * 1000;
  const inicio = j.pergunta_iniciada_em ? new Date(j.pergunta_iniciada_em).getTime() : Date.now();
  const restanteMs = Math.max(0, totalMs - (Date.now() - inicio));
  const prox = perguntas[j.indice_atual + 1];
  return {
    ...base, situacao: "em-jogo",
    pergunta: {
      id: q.pergunta_id, numero: j.indice_atual + 1, total,
      tema: q.tema, texto: q.texto, produto: q.produto,
      imagem: q.imagem, proximaImagem: prox?.imagem ?? null,
      opcoes: q.opcoes, restanteMs, segundos: segs,
    },
  };
}

// ============================================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const rota = url.pathname.replace(/^\/functions\/v1\/api/, "").replace(/^\/api/, "") || "/";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  let body: any = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { body = {}; } }

  try {
    // ---------------- GET /config ----------------
    if (rota === "/config" && req.method === "GET") {
      const tenant = await tenantPorSlug(url.searchParams.get("c"));
      if (!tenant) return erro("Cliente não encontrado.", 404);
      const rodada = await rodadaAtiva(tenant.id, url.searchParams.get("r"));
      const { data: lojas } = await db.from("loja").select("filial,rotulo").eq("tenant_id", tenant.id);
      const nomes: Record<string, string[]> = {};
      if (rodada) {
        const { data: esp } = await db.from("esperado").select("nome,cargo").eq("rodada_id", rodada.id);
        for (const e of esp ?? []) { if (e.cargo) (nomes[e.cargo] ??= []).push(e.nome); }
      }
      return json({
        liberado: !!rodada && rodada.status === "aberta",
        mensagem: rodada ? null : (tenant.mensagem_home ?? "Aguarde o instrutor abrir o jogo"),
        rodada: rodada ? {
          id: rodada.id, nome: rodada.nome, segundos: rodada.segundos, tempoUnico: true,
          perguntas: (await perguntasDaRodada(rodada.id)).length || null,
          travada: rodada.travada, podio: rodada.podio,
          publico: rodada.publico, loja: rodada.loja,
        } : null,
        lojas: lojas ?? [],
        nomes,
      });
    }

    // ---------------- POST /entrar ----------------
    if (rota === "/entrar" && req.method === "POST") {
      const tenant = await tenantPorSlug(url.searchParams.get("c"));
      if (!tenant) return erro("Cliente não encontrado.", 404);
      const rodada = await rodadaAtiva(tenant.id, body.rodadaId ?? null);
      if (!rodada || rodada.status !== "aberta") return erro("A rodada não está liberada.", 409);
      const nome = String(body.nome ?? "").trim();
      if (!nome) return erro("Informe seu nome.");
      const cargo = String(body.cargo ?? "").trim() || "Vendedor";
      const loja = body.loja || null;

      const { data: existente } = await db.from("jogador").select("id,token")
        .eq("rodada_id", rodada.id).eq("nome", nome).maybeSingle();
      if (existente) {
        if (body.token && body.token === existente.token) return json({ token: existente.token });
        return erro("Esse nome já jogou. Use seu sobrenome, ou peça ao instrutor para liberar.", 409);
      }
      await congelar(rodada);
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      const { error } = await db.from("jogador").insert({
        rodada_id: rodada.id, nome, cargo, loja, token,
        situacao: rodada.travada ? "aguardando" : "aguardando",
      });
      if (error) return erro("Não foi possível entrar. Tente outro nome.", 409);
      await emitirRanking(rodada.id);
      return json({ token });
    }

    // ---------------- GET /jogador ----------------
    if (rota === "/jogador" && req.method === "GET") {
      if (!bearer) return erro("Sem autenticação.", 401);
      const e = await estadoDe(bearer);
      if ((e as any)._404) return erro("Participação não encontrada.", 401);
      return json(e);
    }

    // ---------------- POST /comecar ----------------
    if (rota === "/comecar" && req.method === "POST") {
      if (!bearer) return erro("Sem autenticação.", 401);
      const { data: j } = await db.from("jogador").select("*").eq("token", bearer).maybeSingle();
      if (!j) return erro("Participação não encontrada.", 401);
      const { data: rodada } = await db.from("rodada").select("*").eq("id", j.rodada_id).single();
      if (rodada.status !== "aberta") return json(await estadoDe(bearer));
      if (rodada.travada) return json(await estadoDe(bearer)); // continua aguardando
      if (j.situacao === "aguardando") {
        await db.from("jogador").update({
          situacao: "em-jogo", indice_atual: 0, pergunta_iniciada_em: new Date().toISOString(),
        }).eq("id", j.id);
        await emitirRanking(rodada.id);
      }
      return json(await estadoDe(bearer));
    }

    // ---------------- POST /responder ----------------
    if (rota === "/responder" && req.method === "POST") {
      if (!bearer) return erro("Sem autenticação.", 401);
      const { data: j } = await db.from("jogador").select("*").eq("token", bearer).maybeSingle();
      if (!j) return erro("Participação não encontrada.", 401);
      const { data: rodada } = await db.from("rodada").select("*").eq("id", j.rodada_id).single();
      if (rodada.status !== "aberta" || j.situacao !== "em-jogo") return erro("Fora de jogo.", 409);
      const perguntas = await perguntasDaRodada(j.rodada_id);
      const q = perguntas[j.indice_atual];
      if (!q || q.pergunta_id !== body.perguntaId) return erro("Pergunta fora de sincronia.", 409);

      // resposta repetida -> 409 (o cliente trata como já registrada)
      const { data: jaRespondeu } = await db.from("resposta").select("ordem")
        .eq("jogador_id", j.id).eq("ordem", j.indice_atual).maybeSingle();
      if (jaRespondeu) return erro("Resposta já registrada.", 409);

      const segs = q.segundos ?? rodada.segundos;
      const totalMs = segs * 1000;
      const inicio = j.pergunta_iniciada_em ? new Date(j.pergunta_iniciada_em).getTime() : Date.now();
      const restanteMs = Math.max(0, totalMs - (Date.now() - inicio));
      const acertou = Number(body.opcao) === q.correta;
      // Pontuação por velocidade (inferida do contrato): 500 na trave, 1000 instantâneo, 0 se erra.
      const pontos = acertou ? Math.round(500 + 500 * (restanteMs / totalMs)) : 0;

      await db.from("resposta").insert({
        jogador_id: j.id, ordem: j.indice_atual, opcao: Number(body.opcao),
        acertou, pontos, ms: totalMs - restanteMs,
      });
      const proximo = j.indice_atual + 1;
      const terminou = proximo >= perguntas.length;
      await db.from("jogador").update({
        pontos: j.pontos + pontos,
        acertos: j.acertos + (acertou ? 1 : 0),
        erros: j.erros + (acertou ? 0 : 1),
        indice_atual: proximo,
        situacao: terminou ? "terminou" : "em-jogo",
        pergunta_iniciada_em: terminou ? null : new Date().toISOString(),
      }).eq("id", j.id);
      await emitirRanking(rodada.id);

      const feedback = {
        mensagem: acertou ? `Você acertou! +${pontos} pontos` : "Resposta incorreta.",
        pontos, restanteMs: 2500,
      };
      return json(await estadoDe(bearer, terminou ? undefined : feedback));
    }

    // ---------------- POST /gerente ----------------
    if (rota === "/gerente" && req.method === "POST") {
      const tenant = await tenantPorSlug(url.searchParams.get("c"));
      if (!tenant) return erro("Cliente não encontrado.", 404);
      const { data: senhaOk } = await db.rpc("verificar_senha_gerente", {
        p_tenant_id: tenant.id, p_senha: String(body.senha ?? ""),
      });
      if (!senhaOk) return erro("Senha incorreta.", 401);

      if (body.acao === "criar") {
        const papel = body.papel === "Regional" ? "Regional" : "Gerente";
        const responsavel = String(body.responsavel ?? "").trim();
        if (!responsavel) return erro("Informe seu nome.");
        const loja = papel === "Gerente" ? (body.loja || null) : null;
        const publico = papel === "Regional" ? (PUBLICO_POR_OPCAO[body.publico] ?? null) : null;
        const { data: nova, error } = await db.from("rodada").insert({
          tenant_id: tenant.id,
          nome: (papel === "Regional" ? "Rodada regional de " : "Rodada de ") + responsavel,
          status: "aberta", segundos: 30, podio: loja ? "loja" : "geral",
          responsavel, travada: true, grupo: true, loja, publico,
          criada_por: "gerente", aberta_em: new Date().toISOString(),
        }).select("id").single();
        if (error || !nova) return erro("Não foi possível criar a rodada.", 500);
        return json(await verRodada(nova.id));
      }

      const { data: rodada } = await db.from("rodada").select("id,grupo")
        .eq("id", body.id).eq("tenant_id", tenant.id).maybeSingle();
      if (!rodada || !rodada.grupo) return erro("Rodada não encontrada.", 404);
      const id = rodada.id;

      if (body.acao === "ver") return json(await verRodada(id));

      if (body.acao === "comecar") {
        await db.from("rodada").update({ travada: false }).eq("id", id).eq("status", "aberta");
        await db.from("jogador").update({
          situacao: "em-jogo", indice_atual: 0, pergunta_iniciada_em: new Date().toISOString(),
        }).eq("rodada_id", id).eq("situacao", "aguardando");
        await emitirRanking(id);
        return json(await verRodada(id));
      }

      if (body.acao === "resetar") {
        const { data: jogadores } = await db.from("jogador").select("id").eq("rodada_id", id);
        const ids = (jogadores ?? []).map((j) => j.id);
        if (ids.length) await db.from("resposta").delete().in("jogador_id", ids);
        await db.from("jogador").update({
          pontos: 0, acertos: 0, erros: 0, situacao: "aguardando", indice_atual: 0, pergunta_iniciada_em: null,
        }).eq("rodada_id", id);
        await db.from("rodada").update({ travada: true }).eq("id", id);
        await emitirRanking(id);
        return json(await verRodada(id));
      }

      if (body.acao === "encerrar") {
        await db.from("rodada").update({ status: "encerrada", encerrada_em: new Date().toISOString() }).eq("id", id);
        await emitirRanking(id);
        return json(await verRodada(id));
      }

      return erro("Ação inválida: " + body.acao);
    }

    // ---------------- GET /ranking ----------------
    if (rota === "/ranking" && req.method === "GET") {
      const rodadaId = url.searchParams.get("rodadaId");
      const cargo = url.searchParams.get("cargo");
      if (!rodadaId) return erro("rodadaId obrigatório.");
      let q = db.from("jogador").select("id,nome,loja,cargo,pontos").eq("rodada_id", rodadaId);
      if (cargo) q = q.eq("cargo", cargo);
      const { data } = await q;
      const linhas = (data ?? []).sort((a, b) => b.pontos - a.pontos)
        .map((p, i) => ({ id: p.id, nome: p.nome, loja: p.loja, cargo: p.cargo, pontos: p.pontos, posicao: i + 1 }));
      return json({ linhas });
    }

    return erro("Rota não encontrada: " + rota, 404);
  } catch (e) {
    return erro("Erro interno: " + (e as Error).message, 500);
  }
});
