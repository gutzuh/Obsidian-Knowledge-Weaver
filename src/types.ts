export interface KnowledgeWeaverSettings {
  apiKey: string;
  model: string;
  destinationFolder: string;
  apiEndpointTemplate: string; // should include {model} placeholder
}

export interface NoteNode {
  path: string;
  title: string;
  tags: string[];
  status: 'not_analyzed' | 'analyzed';
}

export interface GeminiResponse {
  resumo_conciso: string;
  pontos_chave: string[];
  topicos_correlacionados: Array<{
    titulo_sugerido: string;
    conteudo_explicativo: string;
    exemplos_praticos?: string[];
    exercicios_praticos?: string[];
    questoes_fixacao?: string[];
    flashcards?: Array<{ pergunta: string; resposta: string }>;
    recursos?: Array<{ titulo: string; url: string }>;
    dificuldade?: string;
    estimativa_tempo_minutos?: number | null;
    [key: string]: any;
  }>;
}
