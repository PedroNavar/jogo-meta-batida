-- Até agora, se o jogador não respondia a tempo, ele ficava travado na mesma pergunta
-- pra sempre (nunca avançava, nunca contava como erro) — bug confirmado em teste ao vivo
-- em 2026-11-14. A correção faz o servidor registrar o tempo esgotado como erro (0 pts)
-- e avançar pra próxima pergunta. Pra isso, opcao precisa aceitar NULL (jogador não
-- escolheu nenhuma opção), distinto de "respondeu errado".
alter table resposta alter column opcao drop not null;
alter table resposta drop constraint resposta_opcao_check;
alter table resposta add constraint resposta_opcao_check check (opcao is null or opcao between 0 and 3);
