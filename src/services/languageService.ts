// Service de gestion multi-langues (Français FR, Créole Haïtien HT, Anglais EN)

export type Language = 'FR' | 'HT' | 'EN';

export interface Translations {
  [key: string]: {
    FR: string;
    HT: string;
    EN: string;
  };
}

export const TRANSLATIONS: Translations = {
  header_title: {
    FR: "Terminal de Trading Algorithmique",
    HT: "Terminal Tradin Ak Algorithme",
    EN: "Algorithmic Trading Terminal"
  },
  deposit: {
    FR: "Créditer",
    HT: "Depoze",
    EN: "Deposit"
  },
  withdraw: {
    FR: "Retirer",
    HT: "Retire",
    EN: "Withdraw"
  },
  settings: {
    FR: "Configuration",
    HT: "Konfigirasyon",
    EN: "Settings"
  },
  vault: {
    FR: "Coffre-Fort (10%)",
    HT: "Kòf-Fò (10%)",
    EN: "Reserve Vault (10%)"
  },
  panic_kill: {
    FR: "Arrêt d'Urgence",
    HT: "Rete An Ijans",
    EN: "Panic Kill Switch"
  }
};

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'FR';
  const saved = localStorage.getItem('algo_trade_lang') as Language;
  if (saved === 'FR' || saved === 'HT' || saved === 'EN') return saved;
  return 'FR';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('algo_trade_lang', lang);
}

export function t(key: string, lang: Language = 'FR'): string {
  if (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) {
    return TRANSLATIONS[key][lang];
  }
  return key;
}
