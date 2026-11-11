-- Suporte do painel ADMIN (pedidos #2, #3, #4, #6, #7 de 2026-11-11):
-- blocos de perguntas (#4) e lixeira de perguntas excluídas, separada de "ocultar" (#7).

-- Bloco: rótulo livre (texto), não uma tabela própria — simples de cadastrar e de filtrar.
alter table pergunta add column if not exists bloco text;
comment on column pergunta.bloco is 'Rótulo livre do lote de perguntas (ex.: "Bloco 1"). Null = sem bloco (perguntas antigas).';

-- Lixeira: diferente de "ativa=false" (ocultar). excluida_em preenchido = foi pro "excluídas",
-- de onde o admin pode restaurar (volta a null).
alter table pergunta add column if not exists excluida_em timestamptz;
comment on column pergunta.excluida_em is 'Não nulo = pergunta excluída (lixeira); null = restaurada/nunca excluída.';

-- Rodada principal (criada pelo admin) guarda qual bloco de perguntas usar ao congelar.
-- Null = comportamento antigo (usa todas as perguntas ativas aprovadas do tenant).
alter table rodada add column if not exists bloco text;
comment on column rodada.bloco is 'Qual pergunta.bloco usar ao congelar as perguntas desta rodada. Null = todas.';
