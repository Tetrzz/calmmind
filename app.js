// ===== Calm Mind - app.js =====

// ---------- Funções para salvar e ler dados do navegador ----------
function salvar(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

function ler(chave, padrao) {
  var texto = localStorage.getItem(chave);
  if (texto === null) {
    return padrao;
  }
  return JSON.parse(texto);
}

// ---------- Trocar de tela ----------
var telasInternas = ['chat', 'exercises', 'diary'];

function mostrarTela(id) {
  pararRespiracao();

  var telas = document.querySelectorAll('.screen');
  for (var i = 0; i < telas.length; i++) {
    telas[i].classList.remove('active');
  }
  document.getElementById(id).classList.add('active');

  // a barra do topo só aparece nas telas internas e no menu
  var topbar = document.getElementById('topbar');
  if (telasInternas.indexOf(id) !== -1 || id === 'menu') {
    topbar.classList.remove('hidden');
  } else {
    topbar.classList.add('hidden');
  }

  // marca o botão da tela atual na barra
  var botoes = document.querySelectorAll('.nav-btn');
  for (var j = 0; j < botoes.length; j++) {
    if (botoes[j].getAttribute('data-go') === id) {
      botoes[j].classList.add('active');
    } else {
      botoes[j].classList.remove('active');
    }
  }

  if (id === 'chat') iniciarChat();
  if (id === 'diary') mostrarEntradas();
  if (id === 'exercises') mostrarListaExercicios();
}

// todo botão com data-go leva para a tela indicada
var botoesIr = document.querySelectorAll('[data-go]');
for (var i = 0; i < botoesIr.length; i++) {
  botoesIr[i].addEventListener('click', function () {
    mostrarTela(this.getAttribute('data-go'));
  });
}

// ---------- Login ----------
var modoCadastro = false;

var opcoesLogin = document.getElementById('login-options');
var formLogin = document.getElementById('login-form');
var formTelefone = document.getElementById('phone-form');
var caixaCadastro = document.getElementById('signup-box');
var campoNome = document.getElementById('f-name');
var msgErro = document.getElementById('f-error');

function voltarLogin() {
  opcoesLogin.classList.remove('hidden');
  caixaCadastro.classList.remove('hidden');
  formLogin.classList.add('hidden');
  formTelefone.classList.add('hidden');
  msgErro.textContent = '';
  modoCadastro = false;
}

function entrar(nome) {
  salvar('sessao', { nome: nome });
  mostrarTela('logged');
  setTimeout(function () {
    mostrarTela('menu');
  }, 2500);
}

// botões Google / Email / Telefone
var botoesLogin = document.querySelectorAll('[data-login]');
for (var k = 0; k < botoesLogin.length; k++) {
  botoesLogin[k].addEventListener('click', function () {
    var tipo = this.getAttribute('data-login');

    if (tipo === 'Google') {
      entrar('Google');
      return;
    }

    opcoesLogin.classList.add('hidden');
    caixaCadastro.classList.add('hidden');

    if (tipo === 'Email') {
      modoCadastro = false;
      campoNome.classList.add('hidden');
      campoNome.required = false;
      document.getElementById('f-submit').textContent = 'Entrar';
      formLogin.classList.remove('hidden');
    } else {
      formTelefone.classList.remove('hidden');
    }
  });
}

document.getElementById('btn-signup').addEventListener('click', function () {
  modoCadastro = true;
  opcoesLogin.classList.add('hidden');
  caixaCadastro.classList.add('hidden');
  campoNome.classList.remove('hidden');
  campoNome.required = true;
  document.getElementById('f-submit').textContent = 'Criar conta';
  formLogin.classList.remove('hidden');
});

document.getElementById('f-back').addEventListener('click', voltarLogin);
document.getElementById('p-back').addEventListener('click', voltarLogin);

formLogin.addEventListener('submit', function (e) {
  e.preventDefault();

  var email = document.getElementById('f-email').value.trim().toLowerCase();
  var senha = document.getElementById('f-pass').value;
  var contas = ler('contas', {});

  if (modoCadastro) {
    if (contas[email]) {
      msgErro.textContent = 'Esse email já tem uma conta.';
      return;
    }
    contas[email] = { senha: senha, nome: campoNome.value.trim() };
    salvar('contas', contas);
    entrar(contas[email].nome);
  } else {
    var conta = contas[email];
    if (!conta) {
      msgErro.textContent = 'Conta não encontrada. Volte e crie uma conta.';
    } else if (conta.senha !== senha) {
      msgErro.textContent = 'Senha incorreta.';
    } else {
      entrar(conta.nome);
    }
  }
});

formTelefone.addEventListener('submit', function (e) {
  e.preventDefault();
  entrar('Telefone');
});

document.getElementById('logout').addEventListener('click', function () {
  localStorage.removeItem('sessao');
  formLogin.reset();
  voltarLogin();
  mostrarTela('login');
});

// ---------- Chatbot (Mapé AI) ----------
var chatIniciado = false;
var etapaChat = 0; // 0 = perguntou o sentimento, 1 = perguntou a causa, 2 = sugeriu exercício
var assuntoAtual = null;

var caixaMensagens = document.getElementById('messages');
var caixaRapida = document.getElementById('quick');

// assuntos que o bot entende (palavras-chave) e qual exercício sugerir
var assuntos = [
  { palavras: ['nervos', 'ansio', 'agitad', 'preocupad', 'estress', 'panico', 'pânico'],
    exercicio: 0,
    pergunta: 'Sinto muito que você esteja assim. E o que causou isso?' },
  { palavras: ['trist', 'desanim', 'chatead', 'sozinh', 'chor'],
    exercicio: 1,
    pergunta: 'Obrigado por me contar. Quer dizer o que aconteceu?' },
  { palavras: ['cansad', 'exaust', 'sono', 'insonia', 'insônia'],
    exercicio: 2,
    pergunta: 'Parece que seu corpo está pedindo uma pausa. O que tem pesado mais?' },
  { palavras: ['bem', 'feliz', 'otimo', 'ótimo', 'tranquil', 'alegre'],
    exercicio: null,
    pergunta: 'Que bom ouvir isso! O que fez o seu dia ser bom?' }
];

function adicionarMensagem(texto, quem, botao) {
  var div = document.createElement('div');
  div.className = 'msg ' + quem;

  var nome = document.createElement('span');
  nome.className = 'who';
  nome.textContent = (quem === 'bot') ? 'Mapé' : 'Você';

  div.appendChild(nome);
  div.appendChild(document.createTextNode(texto));
  if (botao) {
    div.appendChild(botao);
  }

  caixaMensagens.appendChild(div);
  caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
  return div;
}

// o bot "digita" por um instante antes de responder
function botFala(texto, botao) {
  var digitando = adicionarMensagem('digitando...', 'bot');
  setTimeout(function () {
    digitando.remove();
    adicionarMensagem(texto, 'bot', botao);
  }, 800);
}

function mostrarRespostasRapidas(lista) {
  caixaRapida.innerHTML = '';
  for (var i = 0; i < lista.length; i++) {
    var b = document.createElement('button');
    b.textContent = lista[i];
    b.addEventListener('click', function () {
      enviarMensagem(this.textContent);
    });
    caixaRapida.appendChild(b);
  }
}

function botaoExercicio(indice, texto) {
  var b = document.createElement('button');
  b.className = 'btn primary';
  b.textContent = texto;
  b.addEventListener('click', function () {
    mostrarTela('exercises');
    abrirExercicio(indice);
  });
  return b;
}

function iniciarChat() {
  if (chatIniciado) return;
  chatIniciado = true;
  botFala('Como você está se sentindo hoje?');
  mostrarRespostasRapidas(['Nervoso', 'Ansioso', 'Triste', 'Cansado', 'Bem']);
}

function acharAssunto(texto) {
  for (var i = 0; i < assuntos.length; i++) {
    for (var j = 0; j < assuntos[i].palavras.length; j++) {
      if (texto.indexOf(assuntos[i].palavras[j]) !== -1) {
        return assuntos[i];
      }
    }
  }
  return null;
}

function enviarMensagem(texto) {
  texto = texto.trim();
  if (texto === '') return;

  adicionarMensagem(texto, 'user');
  document.getElementById('chat-input').value = '';
  mostrarRespostasRapidas([]);

  var minusculo = texto.toLowerCase();

  // pedidos diretos
  if (minusculo.indexOf('exerc') !== -1 || minusculo.indexOf('respira') !== -1) {
    var opcoes = document.createElement('div');
    for (var i = 0; i < exercicios.length; i++) {
      opcoes.appendChild(botaoExercicio(i, exercicios[i].nome));
    }
    botFala('Posso te guiar numa respiração agora. Escolha uma:', opcoes);
    return;
  }

  if (minusculo.indexOf('diário') !== -1 || minusculo.indexOf('diario') !== -1) {
    var abrir = document.createElement('button');
    abrir.className = 'btn primary';
    abrir.textContent = 'Abrir diário';
    abrir.addEventListener('click', function () {
      mostrarTela('diary');
    });
    botFala('Escrever ajuda a organizar os sentimentos. Quer abrir o diário?', abrir);
    return;
  }

  // conversa em etapas
  if (etapaChat === 0) {
    var assunto = acharAssunto(minusculo);
    if (assunto) {
      assuntoAtual = assunto;
      etapaChat = 1;
      botFala(assunto.pergunta);
    } else {
      botFala('Entendi. Pode me contar um pouco mais sobre o que você sente?');
    }
  } else if (etapaChat === 1) {
    etapaChat = 2;
    if (assuntoAtual.exercicio !== null) {
      botFala('Faz sentido se sentir assim. Respirar com calma pode ajudar agora. Que tal este exercício?',
        botaoExercicio(assuntoAtual.exercicio, 'Fazer exercício'));
    } else {
      botFala('Que ótimo! Anotar isso no diário ajuda a lembrar dos bons momentos.');
    }
  } else {
    var respostas = [
      'Estou aqui com você. Quer tentar um exercício de respiração ou registrar no diário?',
      'Obrigado por compartilhar. Você não precisa resolver tudo agora.',
      'Se quiser, posso te guiar numa respiração. É só pedir "exercício".'
    ];
    var sorteio = Math.floor(Math.random() * respostas.length);
    botFala(respostas[sorteio]);
    mostrarRespostasRapidas(['Exercício', 'Diário']);
  }
}

document.getElementById('chat-form').addEventListener('submit', function (e) {
  e.preventDefault();
  enviarMensagem(document.getElementById('chat-input').value);
});

// ---------- Exercícios de respiração ----------
// cada fase: [nome, segundos, tamanho do círculo]
var exercicios = [
  {
    nome: 'Ansiedade',
    sub: 'Respiração 4-7-8',
    passos: [
      '1º Passo: Puxe o ar pelo nariz contando até 4.',
      '2º Passo: Prenda a respiração por 7 segundos.',
      '3º Passo: Solte o ar pela boca contando até 8.',
      '4º Passo: Repita o ciclo algumas vezes.'
    ],
    fases: [['Inspire', 4, 1.9], ['Segure', 7, 1.9], ['Solte', 8, 1]],
    ciclos: 4
  },
  {
    nome: 'Calma',
    sub: 'Respiração quadrada',
    passos: [
      '1º Passo: Puxe o ar pelo nariz contando até 4.',
      '2º Passo: Prenda a respiração por 4 segundos.',
      '3º Passo: Solte o ar pela boca contando até 4.',
      '4º Passo: Fique sem ar por 4 segundos.'
    ],
    fases: [['Inspire', 4, 1.9], ['Segure', 4, 1.9], ['Solte', 4, 1], ['Pause', 4, 1]],
    ciclos: 4
  },
  {
    nome: 'Relaxamento',
    sub: 'Respiração abdominal',
    passos: [
      '1º Passo: Puxe o ar pelo nariz, enchendo a barriga.',
      '2º Passo: Segure o ar por 2 segundos.',
      '3º Passo: Solte o ar lentamente pela boca.',
      '4º Passo: Repita calmamente.'
    ],
    fases: [['Inspire', 4, 1.9], ['Segure', 2, 1.9], ['Solte', 6, 1]],
    ciclos: 5
  }
];

var exercicioAtual = null;
var timerRespiracao = null;
var circulo = document.getElementById('breath');
var textoCirculo = document.getElementById('breath-text');
var textoCiclos = document.getElementById('cycles');
var botaoIniciar = document.getElementById('ex-start');

function mostrarListaExercicios() {
  document.getElementById('ex-list').classList.remove('hidden');
  document.getElementById('ex-detail').classList.add('hidden');
}

function abrirExercicio(indice) {
  exercicioAtual = exercicios[indice];

  document.getElementById('ex-list').classList.add('hidden');
  document.getElementById('ex-detail').classList.remove('hidden');
  document.getElementById('ex-name').textContent = 'Exercício: ' + exercicioAtual.nome;
  document.getElementById('ex-sub').textContent = exercicioAtual.sub;

  var lista = document.getElementById('ex-steps');
  lista.innerHTML = '';
  for (var i = 0; i < exercicioAtual.passos.length; i++) {
    var li = document.createElement('li');
    li.textContent = exercicioAtual.passos[i];
    lista.appendChild(li);
  }
  reiniciarRespiracao();
}

var botoesEx = document.querySelectorAll('[data-ex]');
for (var m = 0; m < botoesEx.length; m++) {
  botoesEx[m].addEventListener('click', function () {
    abrirExercicio(Number(this.getAttribute('data-ex')));
  });
}

document.getElementById('ex-back').addEventListener('click', function () {
  pararRespiracao();
  mostrarListaExercicios();
});

function pararRespiracao() {
  clearInterval(timerRespiracao);
  timerRespiracao = null;
}

function reiniciarRespiracao() {
  pararRespiracao();
  circulo.style.transitionDuration = '0.5s';
  circulo.style.transform = 'scale(1)';
  textoCirculo.textContent = 'Pronto?';
  textoCiclos.textContent = '';
  botaoIniciar.textContent = 'Iniciar';
}

botaoIniciar.addEventListener('click', function () {
  // se já está rodando, o botão para o exercício
  if (timerRespiracao !== null) {
    reiniciarRespiracao();
    return;
  }

  botaoIniciar.textContent = 'Parar';

  var ciclo = 1;
  var fase = 0;
  var restante = 0;
  var tamanhoAnterior = 1;

  function comecarFase() {
    var f = exercicioAtual.fases[fase];
    restante = f[1];

    // o círculo cresce ou encolhe durante o tempo da fase
    if (f[2] === tamanhoAnterior) {
      circulo.style.transitionDuration = '0.3s';
    } else {
      circulo.style.transitionDuration = f[1] + 's';
    }
    circulo.style.transform = 'scale(' + f[2] + ')';
    tamanhoAnterior = f[2];

    textoCirculo.textContent = f[0] + ' ' + restante;
    textoCiclos.textContent = 'Ciclo ' + ciclo + ' de ' + exercicioAtual.ciclos;
  }

  comecarFase();

  // a cada 1 segundo diminui a contagem
  timerRespiracao = setInterval(function () {
    restante--;

    if (restante > 0) {
      textoCirculo.textContent = exercicioAtual.fases[fase][0] + ' ' + restante;
      return;
    }

    // acabou a fase, vai para a próxima
    fase++;
    if (fase >= exercicioAtual.fases.length) {
      fase = 0;
      ciclo++;
      if (ciclo > exercicioAtual.ciclos) {
        pararRespiracao();
        textoCirculo.textContent = 'Muito bem!';
        textoCiclos.textContent = 'Exercício concluído!';
        botaoIniciar.textContent = 'Repetir';
        return;
      }
    }
    comecarFase();
  }, 1000);
});

// ---------- Diário ----------
var humorEscolhido = '';

var botoesHumor = document.querySelectorAll('#moods button');
for (var n = 0; n < botoesHumor.length; n++) {
  botoesHumor[n].addEventListener('click', function () {
    humorEscolhido = this.getAttribute('data-mood');
    for (var x = 0; x < botoesHumor.length; x++) {
      botoesHumor[x].classList.remove('selected');
    }
    this.classList.add('selected');
  });
}

function mostrarEntradas() {
  var area = document.getElementById('entries');
  var lista = ler('diario', []);
  area.innerHTML = '';

  if (lista.length === 0) {
    area.innerHTML = '<p class="empty">Nenhuma entrada ainda. Escreva a primeira!</p>';
    return;
  }

  for (var i = 0; i < lista.length; i++) {
    var entrada = lista[i];

    var div = document.createElement('div');
    div.className = 'entry';

    var titulo = document.createElement('h4');
    var data = new Date(entrada.data);
    var dataTexto = data.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });
    titulo.textContent = (entrada.humor || '📝') + ' ' + dataTexto;

    var texto = document.createElement('p');
    texto.textContent = entrada.texto;

    var apagar = document.createElement('button');
    apagar.className = 'del';
    apagar.textContent = '✕';
    apagar.title = 'Apagar';
    apagar.setAttribute('data-id', entrada.id);
    apagar.addEventListener('click', function () {
      var id = Number(this.getAttribute('data-id'));
      var todas = ler('diario', []);
      var restantes = todas.filter(function (item) {
        return item.id !== id;
      });
      salvar('diario', restantes);
      mostrarEntradas();
    });

    div.appendChild(titulo);
    div.appendChild(texto);
    div.appendChild(apagar);
    area.appendChild(div);
  }
}

document.getElementById('diary-form').addEventListener('submit', function (e) {
  e.preventDefault();

  var campo = document.getElementById('diary-text');
  var texto = campo.value.trim();
  if (texto === '') return;

  var lista = ler('diario', []);
  lista.unshift({
    id: Date.now(),
    data: new Date().toISOString(),
    humor: humorEscolhido,
    texto: texto
  });
  salvar('diario', lista);

  campo.value = '';
  humorEscolhido = '';
  for (var i = 0; i < botoesHumor.length; i++) {
    botoesHumor[i].classList.remove('selected');
  }
  mostrarEntradas();
});

// ---------- Ao abrir o site ----------
setTimeout(function () {
  if (ler('sessao', null) !== null) {
    mostrarTela('menu');
  } else {
    voltarLogin();
    mostrarTela('login');
  }
}, 2000);
