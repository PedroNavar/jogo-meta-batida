-- Remove o jogador de teste do Pedro ("Chiquinho gavião") na rodada principal da Vilarejo,
-- e o jogador usado pra validar a correção do cronômetro (ver commit do fix).
delete from jogador where id in (
  'd760d022-6d9c-452d-8862-3203e74ddc77',
  '756e43b6-2b86-4092-99ef-473ad46b441d'
);
