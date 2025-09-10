# Knowledge Weaver — Obsidian plugin

Knowledge Weaver é um plugin para Obsidian que ajuda a transformar suas notas em pequenas unidades de conhecimento geradas por IA.

Funcionalidades principais
- Analisa a nota atual (ou varre o cofre) e extrai frontmatter e tags como contexto.
- Envia o conteúdo para uma API generativa (ex.: Google Gemini) e recebe um JSON estruturado com resumo, pontos-chave, explicações, exemplos, exercícios, flashcards, recursos e tópicos relacionados.
- Gera automaticamente novas notas Markdown por tópico em uma pasta configurável.
- Opções de diagnóstico e dry-run para inspecionar respostas da API e simular escrita de arquivos sem alterá-los.

Comandos importantes
- "Analyze current note with AI": gera as notas no diretório configurado.
- "Dry-run analyze (show planned files)": mostra quais arquivos seriam criados, sem escrever nada.
- "Gemini diagnostic (raw request)": exibe a resposta bruta da API para depuração.
- "Show debug logs" / "Save debug logs": inspeção e salvamento de logs do plugin.

Instalação e configuração
1. Instale/build do plugin (projeto em TypeScript; bundle via esbuild). Há um script que copia o bundle para a pasta de plugins do Obsidian.
2. Abra as Settings do plugin no Obsidian e informe sua chave API/Token (suporta `X-goog-api-key` ou Bearer token).
3. Defina `destinationFolder` nas settings para onde as notas geradas devem ser salvas.
4. Abra uma nota e execute o comando de análise.

Privacidade e custos
- O texto completo da nota é enviado ao provedor da API — não enviar informações sensíveis sem revisão.  
- Uso da API pode gerar custos e está sujeito a limites de taxa do provedor escolhido.

Limitações conhecidas
- Modelos podem retornar formatos variados (o plugin tenta parsear JSON dentro de blocos code fenced, etc.), mas resultados inconsistentes podem ocorrer.
- Requer chave válida; sem autenticação as chamadas falham.

Contribuição
- Pull requests e issues são bem-vindos. Para alterações que afetem o runtime do plugin no Obsidian, mantenha o bundle compatível (single-file) para evitar problemas de carregamento.

Licença
- MIT

