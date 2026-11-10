-- Limpa os jogadores de teste deixados pelos testes manuais (curl + verificação do frontend)
-- na rodada seed "Teste motor". Respostas são removidas em cascata (FK ON DELETE CASCADE).
delete from jogador where rodada_id = '22222222-2222-2222-2222-222222222222';
