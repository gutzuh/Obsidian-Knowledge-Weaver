import { App, Plugin, Notice } from 'obsidian';
import { Modal, Setting } from 'obsidian';
import { logDebug, getDebugLogs, saveDebugLogsToFile } from './logger';
import { KnowledgeWeaverSettings, NoteNode } from './types';
import { DEFAULT_SETTINGS, KnowledgeWeaverSettingTab } from './settings';
import { scanVault } from './noteScanner';
import { callGeminiApi } from './geminiApi';
import { callGeminiRaw } from './geminiApi';
import { createNotesFromGemini } from './noteCreator';

export default class KnowledgeWeaverPlugin extends Plugin {
  settings!: KnowledgeWeaverSettings;
  // raw plugin data (contents of data.json if present)
  pluginData: Record<string, any> = {};

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new KnowledgeWeaverSettingTab(this.app, this));

    this.addCommand({
      id: 'kw-analyze-current-note',
      name: 'Knowledge Weaver: Analyze current note with AI',
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice('No active file to analyze.');
          return;
        }

  logDebug(`Starting analysis for file: ${file.path}`);
  new Notice('Knowledge Weaver: Analisando nota com a IA...');

        try {
          const text = await this.app.vault.read(file);
          const content = stripFrontmatter(text);
          logDebug(`Read note length: ${content.length}`);

          // build prompt
          const prompt = buildPrompt(content);

          const resp = await callGeminiApi(this.settings, prompt);
          logDebug(`Received Gemini response with ${resp.topicos_correlacionados?.length || 0} topics`);

          // build original node
          const cache = this.app.metadataCache.getFileCache(file) as any | undefined;
          const tagsField = cache?.frontmatter?.tags;
          let tags: string[] = [];
          if (Array.isArray(tagsField)) tags = tagsField.map((t: any) => String(t));
          else if (typeof tagsField === 'string') tags = tagsField.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);

          const original: NoteNode = {
            path: file.path,
            title: file.basename,
            tags,
            status: 'analyzed'
          };

          const created = await createNotesFromGemini(this.app, this.settings, original, resp);
          logDebug(`Created ${created} new notes from Gemini response`);

          new Notice(`Análise concluída! ${created} novas notas foram criadas.`);
        } catch (e: any) {
          console.error(e);
          logDebug('Error during analysis: ' + String(e));
          new Notice('Erro ao contatar a API do Gemini. Verifique sua chave de API e conexão. Veja o console para detalhes.');
        }
      }
    });

    // Add context menu item for files (right-click)
    this.registerEvent(this.app.workspace.on('file-menu', (menu: any, file: any) => {
      // `file` is an AbstractFile; ensure it's a markdown file
      if (!file || file.extension !== 'md') return;

      menu.addItem((item: any) => {
        item.setTitle('Knowledge Weaver: Analisar com IA')
          .setIcon('brain')
          .onClick(async () => {
            new Notice('Knowledge Weaver: Analisando nota com a IA...');
            try {
              const text = await this.app.vault.read(file);
              const content = stripFrontmatter(text);
              const prompt = buildPrompt(content);
              const resp = await callGeminiApi(this.settings, prompt);

              const cache = this.app.metadataCache.getFileCache(file) as any | undefined;
              const tagsField = cache?.frontmatter?.tags;
              let tags: string[] = [];
              if (Array.isArray(tagsField)) tags = tagsField.map((t: any) => String(t));
              else if (typeof tagsField === 'string') tags = tagsField.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);

              const original: NoteNode = {
                path: file.path,
                title: file.basename,
                tags,
                status: 'analyzed'
              };

              const created = await createNotesFromGemini(this.app, this.settings, original, resp);
              new Notice(`Análise concluída! ${created} novas notas foram criadas.`);
            } catch (e: any) {
              console.error(e);
              new Notice('Erro na análise. Veja o console para detalhes.');
            }
          });
      });
    }));

    this.addCommand({
      id: 'kw-scan-vault',
      name: 'Knowledge Weaver: Scan vault for tagged notes',
      callback: async () => {
        const nodes = await scanVault(this.app);
        new Notice(`Knowledge Weaver: Encontradas ${nodes.length} notas com tags.`);
      }
    });

    this.addCommand({
      id: 'kw-diagnostic-gemini-raw',
      name: 'Knowledge Weaver: Gemini diagnostic (raw request)',
      callback: async () => {
        new Notice('Knowledge Weaver: Running Gemini diagnostic...');
        try {
          const prompt = 'Hello from Knowledge Weaver diagnostic. Return a short JSON {"ok":true} if reachable.';
          const resp = await callGeminiRaw(this.settings, prompt);
          // show modal with raw response
          const modal = new class DiagnosticModal extends Modal {
            constructor(app: App, public resp: any) { super(app); }
            onOpen() {
              const { contentEl } = this;
              contentEl.createEl('h3', { text: 'Gemini Diagnostic' });
              contentEl.createEl('pre', { text: `status: ${this.resp.status}\n\n${this.resp.rawText}` });
            }
            onClose() { this.contentEl.empty(); }
          }(this.app, resp);
          modal.open();
        } catch (e: any) {
          new Notice('Diagnostic failed: ' + String(e));
          console.error(e);
        }
      }
    });

    this.addCommand({
      id: 'kw-show-logs',
      name: 'Knowledge Weaver: Show debug logs',
      callback: async () => {
        try {
          const logs = getDebugLogs().join('\n');
          const modal = new class LogsModal extends Modal {
            constructor(app: App, public logs: string) { super(app); }
            onOpen() {
              const { contentEl } = this;
              contentEl.createEl('h3', { text: 'Knowledge Weaver Logs' });
              contentEl.createEl('pre', { text: this.logs });
            }
            onClose() { this.contentEl.empty(); }
          }(this.app, logs);
          modal.open();
        } catch (e: any) {
          new Notice('Unable to show logs: ' + String(e));
        }
      }
    });

    this.addCommand({
      id: 'kw-save-logs',
      name: 'Knowledge Weaver: Save debug logs to plugin folder',
      callback: async () => {
        try {
          const base = (this.app.vault.adapter as any).basePath;
          const pluginFolder = base + '/.obsidian/plugins/knowledge-weaver';
          const dest = pluginFolder + '/knowledge-weaver.log';
          await saveDebugLogsToFile(dest);
          new Notice('Logs saved to ' + dest);
        } catch (e: any) {
          new Notice('Unable to save logs: ' + String(e));
        }
      }
    });
  }

  onunload() {
    console.log('Knowledge Weaver unloaded');
  }

  async loadSettings() {
    const loaded = await this.loadData();
    // store raw plugin data for later inspection
    this.pluginData = (loaded && typeof loaded === 'object') ? Object.assign({}, loaded) : {};

    // Merge any recognised fields from pluginData into settings safely
    const merged = Object.assign({}, DEFAULT_SETTINGS) as any;
    // copy known setting keys from loaded
    const known = ['apiKey', 'model', 'destinationFolder', 'apiEndpointTemplate'];
    for (const k of known) {
      if (loaded && Object.prototype.hasOwnProperty.call(loaded, k)) merged[k] = (loaded as any)[k];
    }

    this.settings = merged as KnowledgeWeaverSettings;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

function stripFrontmatter(text: string) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

function buildPrompt(content: string) {
  return `System: Você é um especialista em análise de conteúdo e síntese de conhecimento. Sua tarefa é ler o texto fornecido, extrair os conceitos essenciais e sugerir novos tópicos de exploração. Responda estritamente no formato JSON, conforme o schema abaixo.\n\nSchema JSON de Resposta:\n{\n  "resumo_conciso": "string",\n  "pontos_chave": ["string"],\n  "topicos_correlacionados": [\n    {\n      "titulo_sugerido": "string",\n      "conteudo_explicativo": "string"\n    }\n  ]\n}\n\nTexto para Análise:\n"""\n${content}\n"""`;
}
