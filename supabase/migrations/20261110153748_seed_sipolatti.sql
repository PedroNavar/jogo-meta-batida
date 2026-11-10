-- Seed de teste (prototype). Senhas são placeholders até o admin/gerente existirem.
insert into tenant (id, slug, nome, mensagem_home, senha_gerente_hash, senha_admin_hash)
values ('11111111-1111-1111-1111-111111111111','sipolatti','Sipolatti',
        'Meta Batida Sipolatti','TODO-hash','TODO-hash')
on conflict (slug) do nothing;

insert into loja (tenant_id, filial, rotulo, nome) values
 ('11111111-1111-1111-1111-111111111111','03','03 · Santa Mônica (Vila Velha/ES)','Santa Mônica'),
 ('11111111-1111-1111-1111-111111111111','10','10 · Goiabeiras (Vitória/ES)','Goiabeiras'),
 ('11111111-1111-1111-1111-111111111111','21','21 · Guarapari (Guarapari/ES)','Guarapari')
on conflict do nothing;

insert into pergunta (tenant_id, texto, tipo, tema, opcoes, correta, status, ativa, base) values
 ('11111111-1111-1111-1111-111111111111','Na Abordagem, qual é o primeiro objetivo com o cliente?','Venda 4.0','Abordagem',
   array['Fechar a venda rápido','Criar conexão e quebrar o gelo','Mostrar o produto mais caro','Pedir o contato'],1,'aprovada',true,true),
 ('11111111-1111-1111-1111-111111111111','Visualizar a necessidade do cliente significa principalmente:','Venda 4.0','Visualize',
   array['Falar das promoções','Fazer perguntas e ouvir','Mostrar o catálogo inteiro','Oferecer desconto'],1,'aprovada',true,true),
 ('11111111-1111-1111-1111-111111111111','Encantar o cliente está mais ligado a:','Venda 4.0','Encante',
   array['Baixar o preço','Entregar além do esperado','Falar rápido','Insistir na compra'],1,'aprovada',true,true),
 ('11111111-1111-1111-1111-111111111111','Ao Negociar, diante de objeção de preço o ideal é:','Venda 4.0','Negocie',
   array['Dar desconto na hora','Reforçar valor antes do preço','Encerrar o atendimento','Mudar de produto'],1,'aprovada',true,true),
 ('11111111-1111-1111-1111-111111111111','Ampliar a venda (pós) significa:','Venda 4.0','Amplie',
   array['Esquecer o cliente','Oferecer complementos e manter relação','Cobrar avaliação','Vender pelo menor preço'],1,'aprovada',true,true)
on conflict do nothing;

insert into rodada (id, tenant_id, nome, status, segundos, podio, travada, iniciada, grupo, criada_por, aberta_em)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',
        'Teste motor','aberta',30,'geral',false,false,false,'admin',now())
on conflict (id) do nothing;
