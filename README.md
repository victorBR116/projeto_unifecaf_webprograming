# Pokédex – Front-End com a PokéAPI

Site estático feito com **HTML, CSS e JavaScript puros** (sem frameworks) que consome a [PokéAPI](https://pokeapi.co/) com `fetch` e cria os cards dos Pokémon dinamicamente.

Trabalho da disciplina Web Development Front-End (UniFECAF).

## O que o site faz

- Busca os Pokémon na PokéAPI assim que a página abre (24 por vez, com o botão "Carregar mais").
- Cria cada card com `document.createElement` e insere na página com `appendChild`. O `index.html` tem só um contêiner vazio (`#grade`).
- Cada card mostra nome, número, imagem oficial, tipos, altura, peso e atributos (HP, Ataque, Defesa e Velocidade).
- Coração de favorito em cada card, salvo no `localStorage`, com filtro "Favoritos".
- Busca por nome ou número. Se o Pokémon ainda não foi carregado, o Enter procura direto na API.
- Mensagens de carregamento e de erro (com botão "Tentar de novo").
- Layout responsivo.

## Como rodar

Não precisa instalar nada. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code). É preciso estar conectado à internet.

## Estrutura

```
pokedex-pokeapi/
├── index.html
├── css/style.css
├── js/script.js
└── README.md
```

## API utilizada

- Documentação: https://pokeapi.co/docs/v2
- Endpoints usados: `GET /pokemon?limit=24&offset=0` (lista) e `GET /pokemon/{id ou nome}` (detalhes)
- Sem token ou cadastro. Somente leitura (GET). A política de uso pede que as respostas sejam guardadas em cache, e o site faz isso em memória durante a visita.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos (mantendo a estrutura acima).
2. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. Depois de alguns minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
