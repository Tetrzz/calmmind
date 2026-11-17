// ===== Calm Mind - app.js =====

// ---------- Funções para salvar e ler dados do navegador ----------
// Tudo fica dentro de try/catch: se o navegador bloquear o armazenamento
// (modo privado, cookies desativados) ou o dado estiver corrompido, o site
// continua funcionando em vez de quebrar.
function salvar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    console.warn('Não foi possível salvar "' + chave + '" no navegador.');
  }
}

function ler(chave, padrao) {
  try {
    var texto = localStorage.getItem(chave);
    if (texto === null) {
      return padrao;
    }
    return JSON.parse(texto);
  } catch (erro) {
    return padrao;
  }
}

function apagar(chave) {
  try {
    localStorage.removeItem(chave);
  } catch (erro) {
    // sem armazenamento disponível, não há o que apagar
  }
}

// lê uma lista; se o dado salvo não for uma lista, usa uma lista vazia
function lerLista(chave) {
  var dado = ler(chave, []);
  return Array.isArray(dado) ? dado : [];
}

// ---------- Senhas ----------
// A senha não é guardada em texto puro: salvamos só o "hash" (SHA-256 com sal).
// Observação: sem servidor isso é uma proteção básica, não segurança real.
function bytesParaHex(bytes) {
  return Array.prototype.map.call(bytes, function (b) {
    return ('0' + b.toString(16)).slice(-2);
  }).join('');
}

function novoSal() {
  var bytes = new Uint8Array(12);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesParaHex(bytes);
}

function hashSenha(senha, sal) {
  // crypto.subtle só existe em páginas seguras (https ou localhost)
  if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
    return Promise.resolve('txt:' + senha);
  }
  var dados = new TextEncoder().encode(sal + ':' + senha);
  return window.crypto.subtle.digest('SHA-256', dados).then(function (resultado) {
    return bytesParaHex(new Uint8Array(resultado));
  });
}

function temConta(contas, email) {
  return Object.prototype.hasOwnProperty.call(contas, email);
}

// ---------- Trocar de tela ----------
var telasInternas = ['chat', 'exercises', 'diary'];

function mostrarTela(id) {
  pararRespiracao();

  // sair do diário no meio de uma edição cancela a edição
  if (id !== 'diary' && editandoId !== null) {
    cancelarEdicao();
  }

  var telas = document.querySelectorAll('.screen');
  for (var i = 0; i < telas.length; i++) {
    telas[i].classList.remove('active');
  }
  document.getElementById(id).classList.add('active');

  // lembra a última tela (para voltar nela ao recarregar a página)
  if (telasInternas.indexOf(id) !== -1 || id === 'menu') {
    salvar('telaAtual', id);
  }

  window.scrollTo(0, 0);

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
var caixaNome = document.getElementById('f-name-field'); // campo + label
var campoSenha = document.getElementById('f-pass');
var msgErro = document.getElementById('f-error');

function voltarLogin() {
  opcoesLogin.classList.remove('hidden');
  caixaCadastro.classList.remove('hidden');
  formLogin.classList.add('hidden');
  formTelefone.classList.add('hidden');
  msgErro.textContent = '';
  document.getElementById('login-title').textContent = 'Fazer login';
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
      caixaNome.classList.add('hidden');
      campoNome.required = false;
      campoSenha.setAttribute('autocomplete', 'current-password');
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
  caixaNome.classList.remove('hidden');
  campoNome.required = true;
  campoSenha.setAttribute('autocomplete', 'new-password');
  document.getElementById('login-title').textContent = 'Criar conta';
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
  if (!contas || typeof contas !== 'object' || Array.isArray(contas)) {
    contas = {}; // dado corrompido: recomeça sem contas
  }
  var botao = document.getElementById('f-submit');

  msgErro.textContent = '';

  if (modoCadastro) {
    if (temConta(contas, email)) {
      msgErro.textContent = 'Esse email já tem uma conta.';
      return;
    }
    var nome = campoNome.value.trim();
    var sal = novoSal();
    botao.disabled = true;
    hashSenha(senha, sal).then(function (hash) {
      botao.disabled = false;
      contas[email] = { nome: nome, sal: sal, hash: hash };
      salvar('contas', contas);
      entrar(nome);
    });
    return;
  }

  if (!temConta(contas, email)) {
    msgErro.textContent = 'Conta não encontrada. Volte e crie uma conta.';
    return;
  }

  var conta = contas[email];
  botao.disabled = true;

  // contas criadas antes do hash têm a senha em texto: aceita e já converte
  if (conta.hash === undefined) {
    botao.disabled = false;
    if (conta.senha !== senha) {
      msgErro.textContent = 'Senha incorreta.';
      return;
    }
    var salNovo = novoSal();
    hashSenha(senha, salNovo).then(function (hash) {
      contas[email] = { nome: conta.nome, sal: salNovo, hash: hash };
      salvar('contas', contas);
      entrar(conta.nome);
    });
    return;
  }

  hashSenha(senha, conta.sal).then(function (hash) {
    botao.disabled = false;
    if (hash !== conta.hash) {
      msgErro.textContent = 'Senha incorreta.';
    } else {
      entrar(conta.nome);
    }
  });
});

formTelefone.addEventListener('submit', function (e) {
  e.preventDefault();
  entrar('Telefone');
});

document.getElementById('logout').addEventListener('click', function () {
  apagar('sessao');
  apagar('telaAtual');
  apagar('chat');
  reiniciarChat();
  formLogin.reset();
  voltarLogin();
  mostrarTela('login');
});

// ---------- Chatbot (Mape AI) ----------
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
    positivo: true,
    exercicio: null,
    pergunta: 'Que bom ouvir isso! O que fez o seu dia ser bom?' }
];

// guarda a conversa e o ponto em que ela parou
var MAX_MENSAGENS = 100; // limite do histórico guardado

// lê o chat salvo; se o formato estiver estranho, devolve um chat vazio
function lerChatSalvo() {
  var dados = ler('chat', null);
  if (!dados || !Array.isArray(dados.mensagens)) {
    return { mensagens: [], etapa: 0, assunto: null };
  }
  return dados;
}

function salvarChat(mensagem) {
  var dados = lerChatSalvo();
  if (mensagem) {
    dados.mensagens.push(mensagem);
    if (dados.mensagens.length > MAX_MENSAGENS) {
      dados.mensagens = dados.mensagens.slice(-MAX_MENSAGENS);
    }
  }
  dados.etapa = etapaChat;
  dados.assunto = (assuntoAtual === null) ? null : assuntos.indexOf(assuntoAtual);
  salvar('chat', dados);
}

function reiniciarChat() {
  chatIniciado = false;
  etapaChat = 0;
  assuntoAtual = null;
  caixaMensagens.innerHTML = '';
  caixaRapida.innerHTML = '';
}

function adicionarMensagem(texto, quem, botao, temporaria) {
  var div = document.createElement('div');
  div.className = 'msg ' + quem;

  var nome = document.createElement('span');
  nome.className = 'who';
  nome.textContent = (quem === 'bot') ? 'Mape' : 'Você';

  div.appendChild(nome);
  div.appendChild(document.createTextNode(texto));
  if (botao) {
    div.appendChild(botao);
  }

  caixaMensagens.appendChild(div);
  caixaMensagens.scrollTop = caixaMensagens.scrollHeight;

  // mensagens de verdade vão para o localStorage ("digitando..." não)
  if (!temporaria) {
    salvarChat({ texto: texto, quem: quem });
  }
  return div;
}

// o bot "digita" por um instante antes de responder
function botFala(texto, botao) {
  var digitando = adicionarMensagem('digitando...', 'bot', null, true);
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

  // se já existe uma conversa salva, restaura ela
  var salvo = lerChatSalvo();
  if (salvo.mensagens.length > 0) {
    etapaChat = (salvo.etapa === 1 || salvo.etapa === 2) ? salvo.etapa : 0;
    assuntoAtual = assuntos[salvo.assunto] || null;
    if (etapaChat === 1 && assuntoAtual === null) {
      etapaChat = 0; // estado incompleto: volta ao começo da conversa
    }
    for (var i = 0; i < salvo.mensagens.length; i++) {
      var m = salvo.mensagens[i];
      var div = document.createElement('div');
      div.className = 'msg ' + m.quem;
      var nome = document.createElement('span');
      nome.className = 'who';
      nome.textContent = (m.quem === 'bot') ? 'Mape' : 'Você';
      div.appendChild(nome);
      div.appendChild(document.createTextNode(m.texto));
      caixaMensagens.appendChild(div);
    }
    caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
    return;
  }

  botFala('Como você está se sentindo hoje?');
  mostrarRespostasRapidas(['Nervoso', 'Ansioso', 'Triste', 'Cansado', 'Bem']);
}

function acharAssunto(texto) {
  // "não estou bem" não pode ser tratado como "estou bem"
  var negou = /\bn[ãa]o\b/.test(texto);

  for (var i = 0; i < assuntos.length; i++) {
    for (var j = 0; j < assuntos[i].palavras.length; j++) {
      if (texto.indexOf(assuntos[i].palavras[j]) !== -1) {
        if (assuntos[i].positivo && negou) {
          return assuntos[1];
        }
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
      salvarChat();
      botFala(assunto.pergunta);
    } else {
      botFala('Entendi. Pode me contar um pouco mais sobre o que você sente?');
    }
  } else if (etapaChat === 1) {
    etapaChat = 2;
    salvarChat();
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
var editandoId = null; // id da entrada que está sendo editada (null = nova entrada)

var formDiario = document.getElementById('diary-form');
var campoDiario = document.getElementById('diary-text');
var botaoSalvarDiario = document.getElementById('diary-submit');
var botaoCancelarEdicao = document.getElementById('diary-cancel');
var avisoEdicao = document.getElementById('diary-editing');

var botoesHumor = document.querySelectorAll('#moods button');

// marca o humor escolhido (ou limpa, se vier vazio)
function escolherHumor(humor) {
  humorEscolhido = humor;
  for (var x = 0; x < botoesHumor.length; x++) {
    var ativo = humor !== '' && botoesHumor[x].getAttribute('data-mood') === humor;
    botoesHumor[x].classList.toggle('selected', ativo);
    botoesHumor[x].setAttribute('aria-pressed', ativo ? 'true' : 'false');
  }
}

for (var n = 0; n < botoesHumor.length; n++) {
  botoesHumor[n].addEventListener('click', function () {
    var humor = this.getAttribute('data-mood');
    // clicar de novo no humor já marcado tira a marcação
    escolherHumor(humor === humorEscolhido ? '' : humor);
  });
}

function textoData(iso, comHora) {
  var opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (comHora) {
    opcoes.hour = '2-digit';
    opcoes.minute = '2-digit';
  }
  return new Date(iso).toLocaleString('pt-BR', opcoes);
}

// ---- edição de entradas ----
function iniciarEdicao(id) {
  var entrada = lerLista('diario').filter(function (item) {
    return item.id === id;
  })[0];
  if (!entrada) return;

  editandoId = id;
  escolherHumor(entrada.humor || '');
  campoDiario.value = entrada.texto;
  botaoSalvarDiario.textContent = 'Salvar alterações';
  botaoCancelarEdicao.classList.remove('hidden');
  avisoEdicao.textContent = 'Editando a entrada de ' + textoData(entrada.data, false);
  avisoEdicao.classList.remove('hidden');

  mostrarEntradas();
  var menosMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  formDiario.scrollIntoView({ behavior: menosMovimento ? 'auto' : 'smooth', block: 'start' });
  campoDiario.focus();
}

function cancelarEdicao() {
  editandoId = null;
  campoDiario.value = '';
  escolherHumor('');
  botaoSalvarDiario.textContent = 'Salvar entrada';
  botaoCancelarEdicao.classList.add('hidden');
  avisoEdicao.classList.add('hidden');
  mostrarEntradas();
}

botaoCancelarEdicao.addEventListener('click', cancelarEdicao);

function mostrarEntradas() {
  var area = document.getElementById('entries');
  var lista = lerLista('diario');
  area.innerHTML = '';

  if (lista.length === 0) {
    area.innerHTML = '<p class="empty">Nenhuma entrada ainda. Escreva a primeira!</p>';
    return;
  }

  for (var i = 0; i < lista.length; i++) {
    var entrada = lista[i];

    var div = document.createElement('div');
    div.className = 'entry';
    if (entrada.id === editandoId) {
      div.classList.add('editing');
    }

    var titulo = document.createElement('h4');
    var data = new Date(entrada.data);
    var dataTexto = data.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });
    titulo.textContent = (entrada.humor || '📝') + ' ' + dataTexto;

    var texto = document.createElement('p');
    texto.textContent = entrada.texto;

    var editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'edit';
    editar.textContent = '✎';
    editar.title = 'Editar';
    editar.setAttribute('aria-label', 'Editar entrada de ' + dataTexto);
    editar.setAttribute('data-id', entrada.id);
    editar.addEventListener('click', function () {
      iniciarEdicao(Number(this.getAttribute('data-id')));
    });

    var apagar = document.createElement('button');
    apagar.type = 'button';
    apagar.className = 'del';
    apagar.textContent = '✕';
    apagar.title = 'Apagar';
    apagar.setAttribute('aria-label', 'Apagar entrada de ' + dataTexto);
    apagar.setAttribute('data-id', entrada.id);
    apagar.addEventListener('click', function () {
      if (!confirm('Apagar esta entrada do diário? Isso não pode ser desfeito.')) {
        return;
      }
      var id = Number(this.getAttribute('data-id'));
      var todas = lerLista('diario');
      var restantes = todas.filter(function (item) {
        return item.id !== id;
      });
      salvar('diario', restantes);
      if (editandoId === id) {
        cancelarEdicao(); // já renderiza de novo
      } else {
        mostrarEntradas();
      }
    });

    div.appendChild(titulo);
    div.appendChild(texto);
    if (entrada.editadoEm) {
      var editado = document.createElement('small');
      editado.className = 'edited';
      editado.textContent = 'Editado em ' + textoData(entrada.editadoEm, true);
      div.appendChild(editado);
    }
    div.appendChild(editar);
    div.appendChild(apagar);
    area.appendChild(div);
  }
}

formDiario.addEventListener('submit', function (e) {
  e.preventDefault();

  var texto = campoDiario.value.trim();
  if (texto === '') return;

  var lista = lerLista('diario');

  if (editandoId !== null) {
    // salvando uma edição: muda humor e texto, mantém id e data originais
    var achou = false;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === editandoId) {
        lista[i].humor = humorEscolhido;
        lista[i].texto = texto;
        lista[i].editadoEm = new Date().toISOString();
        achou = true;
      }
    }
    if (achou) {
      salvar('diario', lista);
    }
    cancelarEdicao(); // limpa o formulário e mostra a lista atualizada
    return;
  }

  lista.unshift({
    id: Date.now(),
    data: new Date().toISOString(),
    humor: humorEscolhido,
    texto: texto
  });
  salvar('diario', lista);

  campoDiario.value = '';
  escolherHumor('');
  mostrarEntradas();
});

// ---------- Ao abrir o site ----------
setTimeout(function () {
  if (ler('sessao', null) !== null) {
    var ultima = ler('telaAtual', 'menu');
    if (ultima !== 'menu' && telasInternas.indexOf(ultima) === -1) {
      ultima = 'menu';
    }
    mostrarTela(ultima);
  } else {
    voltarLogin();
    mostrarTela('login');
  }
}, 2000);
