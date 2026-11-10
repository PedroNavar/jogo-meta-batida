-- Limpa as rodadas de teste criadas ao verificar o endpoint /gerente
-- (jogador é removido em cascata; a própria rodada criada pelo teste também sai,
-- diferente da "Teste motor" seedada, que fica como ambiente fixo de testes).
delete from rodada where id in (
  '4524c67d-f417-4eb4-975f-e783fcffa1ff',
  'e38d6261-cc00-49a2-abff-7c84ac42df80'
);
