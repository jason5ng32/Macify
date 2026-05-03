import { mount } from 'svelte';
import App from './App.svelte';
import { initSettings, settings } from '../lib/settings.svelte.js';
import { loadLanguage, resolveLanguage } from '../lib/i18n.svelte.js';

await initSettings();
loadLanguage(resolveLanguage(settings.userLanguage));

mount(App, { target: document.getElementById('app') });
