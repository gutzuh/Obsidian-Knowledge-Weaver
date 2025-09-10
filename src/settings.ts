import { App, PluginSettingTab, Setting } from 'obsidian';
import { KnowledgeWeaverSettings } from './types';
import KnowledgeWeaverPlugin from './main';

export const DEFAULT_SETTINGS: KnowledgeWeaverSettings = {
  apiKey: '',
  model: 'gemini-2.5-flash-preview-05-20',
  destinationFolder: 'KnowledgeWeaver/insights',
  apiEndpointTemplate: 'https://api.generativeai.google/v1/models/{model}:generate'
};

export class KnowledgeWeaverSettingTab extends PluginSettingTab {
  plugin: KnowledgeWeaverPlugin;

  constructor(app: App, plugin: KnowledgeWeaverPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Knowledge Weaver Settings' });

    new Setting(containerEl)
      .setName('Google Gemini API Key')
      .setDesc('Chave da API para autenticar requisições ao Gemini')
      .addText(text => text
        .setPlaceholder('Enter API key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Modelo Gemini a ser usado')
      .addText(text => text
        .setPlaceholder(this.plugin.settings.model)
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Destination folder')
      .setDesc('Pasta onde as notas geradas serão salvas')
      .addText(text => text
        .setPlaceholder(this.plugin.settings.destinationFolder)
        .setValue(this.plugin.settings.destinationFolder)
        .onChange(async (value) => {
          this.plugin.settings.destinationFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API endpoint template')
      .setDesc('Formato da URL de chamada (use {model} como placeholder)')
      .addText(text => text
        .setPlaceholder(this.plugin.settings.apiEndpointTemplate)
        .setValue(this.plugin.settings.apiEndpointTemplate)
        .onChange(async (value) => {
          this.plugin.settings.apiEndpointTemplate = value.trim();
          await this.plugin.saveSettings();
        }));
  }
}
