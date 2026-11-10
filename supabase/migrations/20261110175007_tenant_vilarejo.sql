-- Novo tenant: Vilarejo. Mesma base multi-cliente da Sipolatti, lojas/perguntas/rodada
-- próprias. Senha de gerente/admin definida à parte (definir_senha_gerente/admin), fora
-- do controle de versão — repo é público, senha nunca entra em texto puro aqui.
insert into tenant (id, slug, nome, mensagem_home, logo_url, senha_gerente_hash, senha_admin_hash)
values ('33333333-3333-3333-3333-333333333333','vilarejo','Vilarejo',
        'Meta Batida Vilarejo',
        'https://pedronavar.github.io/jogo-meta-batida/img/logo-vilarejo.png',
        'TODO-hash','TODO-hash')
on conflict (slug) do nothing;

insert into loja (tenant_id, filial, rotulo, nome) values
 ('33333333-3333-3333-3333-333333333333','televendas','Televendas','Televendas'),
 ('33333333-3333-3333-3333-333333333333','marica','Maricá','Maricá'),
 ('33333333-3333-3333-3333-333333333333','araruama','Araruama','Araruama'),
 ('33333333-3333-3333-3333-333333333333','rio-das-ostras','Rio das Ostras','Rio das Ostras'),
 ('33333333-3333-3333-3333-333333333333','campos-dos-goytacazes','Campos dos Goytacazes','Campos dos Goytacazes'),
 ('33333333-3333-3333-3333-333333333333','niteroi','Niterói','Niterói'),
 ('33333333-3333-3333-3333-333333333333','cabo-frio','Cabo Frio','Cabo Frio'),
 ('33333333-3333-3333-3333-333333333333','buzios','Búzios','Búzios'),
 ('33333333-3333-3333-3333-333333333333','macae','Macaé','Macaé')
on conflict do nothing;

insert into pergunta (tenant_id, texto, tipo, tema, opcoes, correta, status, ativa, base, segundos) values
 ('33333333-3333-3333-3333-333333333333','Cliente diz: "Só estou olhando." Qual devolução segue o método?','Venda','Aborde',
   array['"Fica à vontade, qualquer coisa me chama."','"Posso te ajudar em alguma coisa?"','"Ótimo! Qual ambiente você está pesquisando?"','"Hoje temos promoção de porcelanato."'],2,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual destes NÃO faz parte da anexação do porcelanato?','Produto','Revestimento',
   array['Rodapé','Soleira de granito','Kit de limpeza pós-obra','Tinta acrílica'],3,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual destas perguntas é aberta?','Venda','Visualize',
   array['"É para o banheiro?"','"Como vai ser usado esse ambiente?"','"Já tem a argamassa?"','"Prefere o 90x90?"'],1,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual up-selling o projeto sugere no revestimento?','Produto','Revestimento',
   array['Grande formato, como 90x90 e 120x120','A linha mais barata','O mesmo piso em outra cor','Revestimento só de parede'],0,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual pergunta abre a venda adicional?','Venda','Visualize',
   array['"Para quando você precisa?"','"Já olhou em outra loja?"','"O que mais você vai trocar nesse banheiro?"','"Qual investimento tem em mente?"'],2,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Reforma de banheiro: além do revestimento, o que completa a obra?','Produto','Banheiro',
   array['Só o rejunte','Metais e louças do ambiente','Tinta e esquadrias','Kit de limpeza pós-obra'],1,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual fala é um benefício customizado?','Venda','Encante',
   array['"É um porcelanato retificado."','"É fácil de limpar."','"É o mais vendido da loja."','"Você disse que tem filhos pequenos: esse é fácil de limpar."'],3,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','"Meu marido acha que não precisa de argamassa especial." Qual argumento usar?','Produto','Anexação',
   array['"É regra da loja."','"Material básico em produto premium é pneu velho em carro zero."','"Dou a argamassa de brinde."','"Qualquer argamassa serve."'],1,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','O cliente diz que o porcelanato "está caro". Qual é o primeiro passo?','Venda','Negocie',
   array['Argumentar','Perguntar','Empatia','Pedir permissão'],2,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual up-selling de conveniência o projeto sugere?','Produto','Conveniência',
   array['Garantia estendida','Frete grátis','Kit de ferramentas','Tinta superlavável e metal de fácil limpeza'],3,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual é a fala certa ao conceder um desconto?','Venda','Negocie',
   array['"Se eu conseguir, fechamos agora com argamassa e rejunte?"','"Vou tentar, mas não prometo."','"Posso dar 5%, tudo bem?"','"Mas esse já é o menor preço."'],0,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Em 2026, a Vilarejo recebeu o prêmio ANAMACO pelo:','Loja','Autoridade',
   array['3º ano seguido','5º ano seguido','8º ano seguido','10º ano seguido'],2,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Qual destas falas é um sinal de compra?','Venda','Decida',
   array['"Vou dar uma olhada."','"Entrega até sexta em Búzios?"','"Só estou pesquisando."','"Preciso ver com calma."'],1,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Onde fica o centro de distribuição da Vilarejo?','Loja','Logística',
   array['Rio das Ostras','Cabo Frio','Araruama','Macaé'],0,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','"Prefere receber o porcelanato na sexta ou no sábado?" é qual técnica?','Venda','Decida',
   array['Direto','Por concessão','Palavras "mágicas"','Por alternativa'],3,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','O cliente achou o porcelanato mais barato na internet. Qual argumento valoriza a Vilarejo?','Loja','Diferencial',
   array['"Lá pode ser falsificado."','"Cubro o preço deles."','"Aqui você leva com pronta entrega e eu resolvo se der problema."','"Nosso preço é tabelado."'],2,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','O que é persistir, e não insistir, num orçamento em aberto?','Venda','Amplie',
   array['Trazer algo novo a cada contato','Reenviar o mesmo orçamento','Cobrar a decisão todo dia','Dar desconto em todo contato'],0,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Quais são as três alavancas do ticket médio no projeto?','Loja','Ticket',
   array['Desconto, prazo e frete','Itens por nota, valor agregado e menos desconto','Volume, promoção e parcelamento','Atendimentos, conversão e prazo'],1,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','A quem pedir indicação para o Indica Vilarejo?','Venda','Amplie',
   array['A todos, menos ao descontente','Só a quem comprou','Só a cliente antigo','Só depois da entrega'],0,'aprovada',true,false,30),
 ('33333333-3333-3333-3333-333333333333','Porcelanato grande formato: qual item ajuda a evitar desnível entre as peças?','Produto','Revestimento',
   array['Rejunte','Rodapé','Soleira de granito','Espaçadores e niveladores'],3,'aprovada',true,false,30)
on conflict do nothing;

insert into rodada (id, tenant_id, nome, status, segundos, podio, travada, iniciada, grupo, criada_por, aberta_em)
values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333',
        'Meta Batida Vilarejo','aberta',30,'geral',true,false,false,'admin',now())
on conflict (id) do nothing;

insert into esperado (rodada_id, nome, loja, cargo) values
 ('44444444-4444-4444-4444-444444444444','Ana Paula da Silva Felix Feliciano','televendas','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Clauciane Prazeres do Nascimento','marica','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Gleicy Kellin Machado Miranda','araruama','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Jhonathan Cardoso Viana','rio-das-ostras','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Liliane Minguta de Azeredo','campos-dos-goytacazes','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Lucimere Oliveira da Costa','niteroi','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Rosemeire Leonardo Izidoro','cabo-frio','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Suli Fernandes de Araújo','buzios','Vendedor'),
 ('44444444-4444-4444-4444-444444444444','Viviane Paulino Adão','macae','Vendedor');
