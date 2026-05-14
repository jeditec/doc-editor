import { ref } from 'vue'

export const THEMES = {
  dark: [
    { value: 'tokyo-night', label: '🌙 Tokyo Night' },
    { value: 'nord', label: '❄️ Nord' },
    { value: 'dracula', label: '🧛 Dracula' },
    { value: 'solarized-dark', label: '🌊 Solarized Dark' },
    { value: 'catppuccin-mocha', label: '☕ Catppuccin Mocha' },
    { value: 'one-dark', label: '⚛️ One Dark' },
    { value: 'gruvbox-dark', label: '🟧 Gruvbox Dark' },
    { value: 'monokai-pro', label: '🎨 Monokai Pro' },
    { value: 'synthwave', label: '🌆 Synthwave \'84' },
    { value: 'github-dark', label: '🐙 GitHub Dark' },
    { value: 'oceanic-next', label: '🌊 Oceanic Next' },
  ],
  light: [
    { value: 'tokyo-night-light', label: '🌙 Tokyo Night Light' },
    { value: 'nord-light', label: '❄️ Nord Light' },
    { value: 'dracula-light', label: '🧛 Dracula Light' },
    { value: 'solarized-light', label: '🌊 Solarized Light' },
    { value: 'catppuccin-latte', label: '☕ Catppuccin Latte' },
    { value: 'one-light', label: '⚛️ One Light' },
    { value: 'gruvbox-light', label: '🟧 Gruvbox Light' },
    { value: 'monokai-pro-light', label: '🎨 Monokai Pro Light' },
    { value: 'synthwave-light', label: '🌆 Synthwave Light' },
    { value: 'github-light', label: '🐙 GitHub Light' },
    { value: 'oceanic-light', label: '🌊 Oceanic Light' },
  ],
}

export function useThemes() {
  const currentTheme = ref(localStorage.getItem('doc-editor-theme') || '')

  function changeTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName)
    localStorage.setItem('doc-editor-theme', themeName)
    currentTheme.value = themeName
  }

  function initTheme() {
    let saved = localStorage.getItem('doc-editor-theme')
    if (!saved) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      saved = prefersDark ? 'tokyo-night' : 'github-light'
    }
    document.documentElement.setAttribute('data-theme', saved)
    currentTheme.value = saved
  }

  return {
    THEMES,
    currentTheme,
    changeTheme,
    initTheme,
  }
}
