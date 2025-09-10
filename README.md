# Knowledge Weaver — Obsidian Plugin (esqueleto)

Plugin inicial para o Obsidian que analisa notas com uma API de IA (ex: Google Gemini) e gera notas correlacionadas.

O repositório contém um esqueleto TypeScript. Para compilar:

```fish
npm install
npm run build
```

Depois de compilado, copie o conteúdo de `dist/` e `manifest.json` para a pasta de plugins do Obsidian (ou use um bundler conforme sua preferência).

Configurações e uso estarão acessíveis pela paleta de comandos do Obsidian (comando: "Knowledge Weaver: Analyze current note").
