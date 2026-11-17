# Calm Mind

Aplicação web de bem-estar emocional, feita com HTML, CSS e JavaScript puros (sem frameworks).

**Link da aplicação:** https://calmmind-mu.vercel.app

## O que o site faz

- **Login / cadastro**: Google, Email (com senha) ou Telefone. A senha é guardada apenas como hash (SHA-256 com sal).
- **Mape AI (chat)**: conversa guiada que pergunta como a pessoa se sente e sugere um exercício de respiração ou o diário.
- **Exercícios respiratórios**: três técnicas (Ansiedade 4-7-8, Calma, Relaxamento) com um círculo animado e contagem dos ciclos.
- **Diário das emoções**: cadastrar, editar e apagar entradas, com humor (emoji) e texto.

## Checklist dos critérios de avaliação

| # | Critério | Pontos | Atende? | Por quê |
|---|----------|--------|---------|---------|
| 1 | Deploy e Funcionamento | 2,0 | ✅ | Publicado na Vercel. O `index.html` fica na raiz e carrega `style.css`, `app.js` e as imagens da pasta `img/` por caminhos relativos, sem pastas expostas. |
| 2 | Interatividade sem Recarregamento | 2,0 | ✅ | Todos os formulários (login, telefone, chat e diário) usam `e.preventDefault()` no `submit`. Cadastrar, editar e apagar entradas do diário acontece via JavaScript, sem recarregar a página. |
| 3 | Persistência de Dados | 2,0 | ✅ | Usa `localStorage` para contas, sessão, última tela aberta, histórico do chat e entradas do diário. Ao atualizar (F5), tudo continua na tela. |
| 4 | Estabilidade do Console | 2,0 | ✅ | Leituras e gravações no `localStorage` ficam dentro de `try/catch`, dados corrompidos são tratados e todos os elementos usados pelo JS existem no HTML. Nenhum erro em vermelho no Console (F12). |
| 5 | Adaptabilidade e Responsividade | 2,0 | ✅ | Tag `viewport`, layout fluido e `@media` para 800px, 600px e 380px (menu em coluna, campos e botões em largura total). Acessibilidade: `alt` nas imagens, `<label>` em todos os campos, `lang="pt-BR"`, `aria-label` nos botões de ícone, `role="log"` no chat e `role="alert"` nos erros, para o leitor de tela descrever a aplicação. |

## Como rodar localmente

Basta abrir o arquivo `index.html` no navegador (ou usar a extensão Live Server do VS Code).

## Estrutura

```
index.html   estrutura e telas
style.css    estilos e responsividade
app.js       lógica (login, chat, exercícios, diário, localStorage)
img/         logos e ícones
```
