-- Libera a rodada da Vilarejo pra cada jogador começar assim que entrar (sem precisar
-- de um gerente destravando), igual à rodada de teste da Sipolatti. Não há ainda um
-- painel de admin pra essa rodada principal (só /gerente, que só controla rodadas que
-- ele mesmo cria) — ver CONTINUAR-AQUI.md, Passo 3.
update rodada set travada = false where id = '44444444-4444-4444-4444-444444444444';
