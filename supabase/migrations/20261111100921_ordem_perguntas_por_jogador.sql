-- Cada jogador recebe a própria ordem embaralhada das perguntas da rodada (gerada quando
-- ele começa a jogar), em vez de uma ordem única compartilhada por todo mundo.
alter table jogador add column if not exists ordem_perguntas int[];
comment on column jogador.ordem_perguntas is 'Permutação dos índices de rodada_pergunta.ordem, gerada ao começar. Null = ordem natural (jogador antigo, antes deste recurso).';
