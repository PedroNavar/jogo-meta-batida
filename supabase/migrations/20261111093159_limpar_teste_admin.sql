-- Limpa os dados usados pra testar o novo painel admin (rodada, jogador e perguntas de QA).
delete from rodada where id = '689407e1-c62d-42b3-af9f-8e1fbd5d80d2';
delete from pergunta where id in (
  '3a05b085-d717-4902-9ea5-6b06f8eb9829',
  '0a039418-2ebd-4705-a5f2-40db71c4f862'
);
