-- Remove o jogador de teste usado pra verificar a rodada da Vilarejo (usei o nome real
-- de um dos 9 esperados pra testar a lista "Escolha seu nome" — sem isso ele não
-- conseguiria entrar de novo, por causa do nome único por rodada).
delete from jogador where rodada_id = '44444444-4444-4444-4444-444444444444';
