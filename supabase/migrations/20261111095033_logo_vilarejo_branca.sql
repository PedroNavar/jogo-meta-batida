-- Troca a logo da Vilarejo pra versão branca (mais visível no fundo escuro do jogo).
update tenant set logo_url = 'https://pedronavar.github.io/jogo-meta-batida/img/logo-vilarejo-branca.png'
where slug = 'vilarejo';
