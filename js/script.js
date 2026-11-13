"use strict";

/* ==========================================================
   Pokédex – consumo da PokéAPI com fetch
   O HTML tem só um contêiner vazio (#grade). Todos os cards
   são criados aqui com createElement e inseridos com appendChild.
   ========================================================== */

const API_URL = "https://pokeapi.co/api/v2";
const POR_PAGINA = 24;
const CHAVE_FAVORITOS = "pokedex:favoritos";

/* Nome em português e cores de cada tipo.
   "texto" é a cor da letra que mantém boa leitura sobre a cor do tipo. */
const TIPOS = {
  normal:   { nome: "Normal",    cor: "#a8a77a", texto: "#1d2433" },
  fire:     { nome: "Fogo",      cor: "#ee8130", texto: "#1d2433" },
  water:    { nome: "Água",      cor: "#6390f0", texto: "#1d2433" },
  electric: { nome: "Elétrico",  cor: "#f7d02c", texto: "#1d2433" },
  grass:    { nome: "Planta",    cor: "#7ac74c", texto: "#1d2433" },
  ice:      { nome: "Gelo",      cor: "#96d9d6", texto: "#1d2433" },
  fighting: { nome: "Lutador",   cor: "#c22e28", texto: "#ffffff" },
  poison:   { nome: "Veneno",    cor: "#a33ea1", texto: "#ffffff" },
  ground:   { nome: "Terra",     cor: "#e2bf65", texto: "#1d2433" },
  flying:   { nome: "Voador",    cor: "#a98ff3", texto: "#1d2433" },
  psychic:  { nome: "Psíquico",  cor: "#f95587", texto: "#1d2433" },
  bug:      { nome: "Inseto",    cor: "#a6b91a", texto: "#1d2433" },
  rock:     { nome: "Pedra",     cor: "#b6a136", texto: "#1d2433" },
  ghost:    { nome: "Fantasma",  cor: "#735797", texto: "#ffffff" },
  dragon:   { nome: "Dragão",    cor: "#6f35fc", texto: "#ffffff" },
  dark:     { nome: "Sombrio",   cor: "#705746", texto: "#ffffff" },
  steel:    { nome: "Aço",       cor: "#b7b7ce", texto: "#1d2433" },
  fairy:    { nome: "Fada",      cor: "#d685ad", texto: "#1d2433" },
};
const TIPO_PADRAO = { nome: "Desconhecido", cor: "#8a94a6", texto: "#ffffff" };

/* Atributos exibidos no card (nome da API -> rótulo em português) */
const ATRIBUTOS = {
  hp: "HP",
  attack: "Ataque",
  defense: "Defesa",
  speed: "Velocidade",
};
const ATRIBUTO_MAXIMO_BARRA = 160;

/* ---------- Estado da página ---------- */

const estado = {
  pokemons: [],          // cache local: tudo que já veio da API nesta visita
  deslocamento: 0,       // "offset" da próxima página
  total: 0,              // quantidade total informada pela API
  carregando: false,
  somenteFavoritos: false,
  termo: "",
  favoritos: lerFavoritos(),
};

let acaoRepetir = carregarPagina; // o que o botão "Tentar de novo" executa

/* ---------- Elementos da página ---------- */

const grade = document.getElementById("grade");
const statusEl = document.getElementById("status");
const erroEl = document.getElementById("erro");
const erroTexto = document.getElementById("erro-texto");
const pokebola = document.getElementById("pokebola");
const formBusca = document.getElementById("form-busca");
const campoBusca = document.getElementById("busca");
const btnFavoritos = document.getElementById("btn-favoritos");
const textoFavoritos = document.getElementById("texto-favoritos");
const btnMais = document.getElementById("btn-mais");
const btnTentarDeNovo = document.getElementById("btn-tentar-de-novo");

const formatoNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/* ==========================================================
   1. Consumo da API (fetch + then)
   ========================================================== */

/* Confere se a resposta HTTP deu certo e converte o corpo de JSON para objeto. */
function verificarResposta(resposta) {
  if (!resposta.ok) {
    throw new Error("A PokéAPI respondeu com erro " + resposta.status + ".");
  }
  return resposta.json();
}

/* Busca uma página da lista e, para cada item, os detalhes do Pokémon. */
function carregarPagina() {
  if (estado.carregando) {
    return Promise.resolve();
  }
  acaoRepetir = carregarPagina;
  esconderErro();
  definirCarregando(true);

  const url = API_URL + "/pokemon?limit=" + POR_PAGINA + "&offset=" + estado.deslocamento;

  return fetch(url)
    .then(verificarResposta)
    .then(function (lista) {
      // A lista traz só { name, url }. Os detalhes (imagem, tipos, stats)
      // ficam em outra URL, então fazemos um fetch por Pokémon, em paralelo.
      estado.total = lista.count;
      const pedidos = lista.results.map(function (item) {
        return fetch(item.url).then(verificarResposta);
      });
      return Promise.all(pedidos);
    })
    .then(function (detalhes) {
      estado.pokemons.push(...detalhes);
      estado.deslocamento += POR_PAGINA;
    })
    .catch(mostrarErro)
    .finally(function () {
      definirCarregando(false);
      renderizar();
      atualizarBotaoMais();
    });
}

/* Procura um Pokémon que ainda não foi carregado (por nome ou número). */
function buscarNaApi(termo) {
  const alvo = termo.trim().toLowerCase().replace(/^#/, "");
  if (!alvo || estado.carregando) {
    return Promise.resolve();
  }
  acaoRepetir = function () {
    return buscarNaApi(termo);
  };
  esconderErro();
  definirCarregando(true);

  return fetch(API_URL + "/pokemon/" + encodeURIComponent(alvo))
    .then(function (resposta) {
      return resposta.status === 404 ? null : verificarResposta(resposta);
    })
    .then(function (pokemon) {
      if (!pokemon) {
        definirStatus('Nenhum Pokémon encontrado para "' + termo.trim() + '". Confira o nome ou o número.');
        return;
      }
      if (!estado.pokemons.some(function (p) { return p.id === pokemon.id; })) {
        estado.pokemons.push(pokemon);
      }
      renderizar();
    })
    .catch(mostrarErro)
    .finally(function () {
      definirCarregando(false);
    });
}

/* Garante que os favoritos salvos de visitas anteriores estejam no cache. */
function carregarFavoritosFaltantes() {
  const faltantes = Array.from(estado.favoritos).filter(function (id) {
    return !estado.pokemons.some(function (p) { return p.id === id; });
  });
  if (faltantes.length === 0 || estado.carregando) {
    return Promise.resolve();
  }
  acaoRepetir = function () {
    return carregarFavoritosFaltantes().then(renderizar);
  };
  esconderErro();
  definirCarregando(true);

  const pedidos = faltantes.map(function (id) {
    return fetch(API_URL + "/pokemon/" + id).then(verificarResposta);
  });

  return Promise.all(pedidos)
    .then(function (lista) {
      estado.pokemons.push(...lista);
    })
    .catch(mostrarErro)
    .finally(function () {
      definirCarregando(false);
    });
}

/* ==========================================================
   2. Criação dos cards (createElement + appendChild)
   ========================================================== */

/* Cria um elemento com classe e texto. Usa textContent (nunca innerHTML)
   para que o texto vindo da API não possa injetar HTML na página. */
function criar(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) {
    elemento.className = classe;
  }
  if (texto !== undefined) {
    elemento.textContent = texto;
  }
  return elemento;
}

function formatarNome(nome) {
  return nome
    .split("-")
    .map(function (parte) { return parte.charAt(0).toUpperCase() + parte.slice(1); })
    .join(" ");
}

function urlImagem(pokemon) {
  const sprites = pokemon.sprites || {};
  const arte = sprites.other && sprites.other["official-artwork"];
  return (arte && arte.front_default) || sprites.front_default || "";
}

function criarIconeCoracao() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const caminho = document.createElementNS(ns, "path");
  caminho.setAttribute(
    "d",
    "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 4.5 6.3 4.5c2.1 0 3.7 1.2 4.7 2.8l1 1.5 1-1.5c1-1.6 2.6-2.8 4.7-2.8 3.7 0 5.4 3.9 3.9 7.3C19.5 16.4 12 21 12 21z"
  );
  svg.appendChild(caminho);
  return svg;
}

function criarBotaoFavorito(pokemon, nome) {
  const botao = criar("button", "card__favorito");
  botao.type = "button";
  botao.setAttribute("aria-label", "Favoritar " + nome);
  botao.setAttribute("aria-pressed", String(estado.favoritos.has(pokemon.id)));
  botao.appendChild(criarIconeCoracao());

  botao.addEventListener("click", function () {
    alternarFavorito(pokemon.id, botao);
  });
  return botao;
}

function criarTipos(pokemon) {
  const lista = criar("ul", "card__tipos");
  pokemon.types.forEach(function (entrada) {
    const tipo = TIPOS[entrada.type.name] || TIPO_PADRAO;
    const item = criar("li", "card__tipo", tipo.nome);
    item.style.background = tipo.cor;
    item.style.color = tipo.texto;
    lista.appendChild(item);
  });
  return lista;
}

function criarMedida(rotulo, valor) {
  const grupo = criar("div");
  grupo.appendChild(criar("dt", "", rotulo));
  grupo.appendChild(criar("dd", "", valor));
  return grupo;
}

function criarAtributos(pokemon) {
  const lista = criar("ul", "card__stats");
  pokemon.stats.forEach(function (entrada) {
    const rotulo = ATRIBUTOS[entrada.stat.name];
    if (!rotulo) {
      return;
    }
    const valor = entrada.base_stat;
    const porcentagem = Math.min((valor / ATRIBUTO_MAXIMO_BARRA) * 100, 100);

    const linha = criar("li", "stat");
    linha.appendChild(criar("span", "stat__nome", rotulo));

    const barra = criar("span", "stat__barra");
    const preenchimento = criar("span", "stat__preenchimento");
    preenchimento.style.width = porcentagem + "%";
    barra.appendChild(preenchimento);
    linha.appendChild(barra);

    linha.appendChild(criar("span", "stat__valor", String(valor)));
    lista.appendChild(linha);
  });
  return lista;
}

/* Monta o card completo de um Pokémon. */
function criarCard(pokemon) {
  const nome = formatarNome(pokemon.name);
  const tipoPrincipal = (pokemon.types[0] && TIPOS[pokemon.types[0].type.name]) || TIPO_PADRAO;

  const card = criar("article", "card");
  card.style.setProperty("--tipo", tipoPrincipal.cor);
  card.dataset.id = String(pokemon.id);

  // Topo: número na Pokédex e coração de favorito
  const topo = criar("div", "card__topo");
  topo.appendChild(criar("span", "card__numero", "#" + String(pokemon.id).padStart(3, "0")));
  topo.appendChild(criarBotaoFavorito(pokemon, nome));
  card.appendChild(topo);

  // Nome
  card.appendChild(criar("h3", "card__nome", nome));

  // Imagem
  const moldura = criar("div", "card__imagem");
  const endereco = urlImagem(pokemon);
  if (endereco) {
    const imagem = criar("img");
    imagem.src = endereco;
    imagem.alt = "Ilustração de " + nome;
    imagem.width = 475;
    imagem.height = 475;
    imagem.loading = "lazy";
    moldura.appendChild(imagem);
  } else {
    moldura.appendChild(criar("span", "", "Sem imagem"));
  }
  card.appendChild(moldura);

  // Tipos, altura, peso e atributos (status do personagem)
  card.appendChild(criarTipos(pokemon));

  const medidas = criar("dl", "card__medidas");
  medidas.appendChild(criarMedida("Altura", formatoNumero.format(pokemon.height / 10) + " m"));
  medidas.appendChild(criarMedida("Peso", formatoNumero.format(pokemon.weight / 10) + " kg"));
  card.appendChild(medidas);

  card.appendChild(criarAtributos(pokemon));

  return card;
}

/* ==========================================================
   3. Exibição na tela
   ========================================================== */

function passaNoFiltro(pokemon) {
  if (estado.somenteFavoritos && !estado.favoritos.has(pokemon.id)) {
    return false;
  }
  const termo = estado.termo.trim().toLowerCase().replace(/^#/, "");
  if (!termo) {
    return true;
  }
  return pokemon.name.includes(termo) || String(pokemon.id) === termo;
}

/* Limpa a grade e cria de novo os cards que passam no filtro. */
function renderizar() {
  const visiveis = estado.pokemons
    .filter(passaNoFiltro)
    .sort(function (a, b) { return a.id - b.id; });

  grade.replaceChildren();
  visiveis.forEach(function (pokemon) {
    grade.appendChild(criarCard(pokemon));
  });

  atualizarStatus(visiveis.length);
  atualizarContadorFavoritos();
}

function atualizarStatus(quantidade) {
  if (quantidade === 0 && estado.somenteFavoritos) {
    definirStatus("Nenhum favorito por aqui ainda. Toque no coração de um card para guardá-lo.");
  } else if (quantidade === 0 && estado.termo.trim()) {
    definirStatus('Nenhum Pokémon carregado corresponde a "' + estado.termo.trim() + '". Pressione Enter para procurar na PokéAPI.');
  } else if (quantidade === 0) {
    definirStatus("");
  } else {
    const complemento = estado.total ? " (a PokéAPI tem " + estado.total + " no total)" : "";
    definirStatus("Exibindo " + quantidade + " Pokémon" + complemento + ".");
  }
}

function definirStatus(texto) {
  statusEl.textContent = texto;
}

function definirCarregando(valor) {
  estado.carregando = valor;
  pokebola.classList.toggle("girando", valor);
  grade.setAttribute("aria-busy", String(valor));
  btnMais.disabled = valor;
  if (valor) {
    definirStatus("Carregando Pokémon…");
  }
}

function mostrarErro(erro) {
  const semConexao = erro instanceof TypeError;
  erroTexto.textContent = semConexao
    ? "Não foi possível conectar à PokéAPI. Verifique sua internet e tente de novo."
    : erro.message;
  erroEl.hidden = false;
  atualizarBotaoMais();
}

function esconderErro() {
  erroEl.hidden = true;
}

function atualizarBotaoMais() {
  const acabou = estado.total > 0 && estado.deslocamento >= estado.total;
  btnMais.parentElement.hidden = acabou || !erroEl.hidden;
}

/* ==========================================================
   4. Favoritos (salvos no navegador com localStorage)
   ========================================================== */

function lerFavoritos() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS) || "[]");
    return new Set(Array.isArray(dados) ? dados.map(Number) : []);
  } catch (erro) {
    return new Set();
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(Array.from(estado.favoritos)));
  } catch (erro) {
    // Sem localStorage (modo privado, por exemplo): os favoritos valem só até fechar a página.
  }
}

function alternarFavorito(id, botao) {
  if (estado.favoritos.has(id)) {
    estado.favoritos.delete(id);
  } else {
    estado.favoritos.add(id);
  }
  salvarFavoritos();
  botao.setAttribute("aria-pressed", String(estado.favoritos.has(id)));
  atualizarContadorFavoritos();

  if (estado.somenteFavoritos) {
    renderizar();
  }
}

function atualizarContadorFavoritos() {
  textoFavoritos.textContent = "Favoritos (" + estado.favoritos.size + ")";
}

/* ==========================================================
   5. Eventos e início
   ========================================================== */

campoBusca.addEventListener("input", function () {
  estado.termo = campoBusca.value;
  renderizar();
});

formBusca.addEventListener("submit", function (evento) {
  evento.preventDefault();
  const temResultado = estado.pokemons.some(passaNoFiltro);
  if (estado.termo.trim() && !temResultado) {
    buscarNaApi(estado.termo);
  }
});

btnFavoritos.addEventListener("click", function () {
  estado.somenteFavoritos = !estado.somenteFavoritos;
  btnFavoritos.setAttribute("aria-pressed", String(estado.somenteFavoritos));
  renderizar();
  if (estado.somenteFavoritos) {
    carregarFavoritosFaltantes().then(renderizar);
  }
});

btnMais.addEventListener("click", carregarPagina);

btnTentarDeNovo.addEventListener("click", function () {
  acaoRepetir();
});

atualizarContadorFavoritos();
carregarPagina();
