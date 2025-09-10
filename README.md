Knowledge Weaver — Obsidian plugin

Um plugin Obsidian que resume notas Markdown, sugere tópicos relacionados e gera notas adicionais usando a API generativa (ex.: Google Gemini).

Principais pontos:
- Configurar a chave/API no settings do plugin.
- Executar o comando "Analyze current note with AI" para gerar notas.
- A pasta de destino é configurável nas settings.

Projeto em TypeScript — build via esbuild; bundle já inclui um instalador para copiar o plugin para sua pasta Obsidian.

Licença: MIT
# Knowledge Weaver — Obsidian Plugin (esqueleto)

Plugin inicial para o Obsidian que analisa notas com uma API de IA (ex: Google Gemini) e gera notas correlacionadas.

O repositório contém um esqueleto TypeScript. Para compilar:

```fish
npm install
npm run build
```

Depois de compilado, copie o conteúdo de `dist/` e `manifest.json` para a pasta de plugins do Obsidian (ou use um bundler conforme sua preferência).

Configurações e uso estarão acessíveis pela paleta de comandos do Obsidian (comando: "Knowledge Weaver: Analyze current note").
