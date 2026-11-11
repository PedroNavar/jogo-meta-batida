-- Limpa os dados usados pra testar: edição de pergunta (com imagem/bloco) e o
-- embaralhamento por jogador (3 jogadores de teste na rodada principal da Vilarejo).
delete from pergunta where id = 'a4833c92-09d7-450f-a2a6-d7458d69997e';
delete from jogador where id in (
  '9c3259cc-3028-4eb9-be35-f06f551865b4',
  '0a7c9407-0d95-4566-8690-e889a51490c4',
  'e3f73910-d740-4882-bdfe-412e4cbc3f71'
);
