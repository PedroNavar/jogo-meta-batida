-- Remove os clientes de teste usados pra validar a tela de criar cliente (loja/pergunta/
-- rodada caem em cascata via FK).
delete from tenant where slug in ('qa-cliente', 'qa-browser');
