import { es, fr, de, enUS, ja, zhCN, pt, it, ru, ar, type Locale } from 'date-fns/locale';

export const localeMap: Record<string, Locale> = {
    'es': es,
    'es-ES': es,
    'fr': fr,
    'fr-FR': fr,
    'de': de,
    'de-DE': de,
    'en': enUS,
    'en-US': enUS,
    'ja': ja,
    'ja-JP': ja,
    'zh': zhCN,
    'zh-CN': zhCN,
    'pt': pt,
    'pt-PT': pt,
    'pt-BR': pt,
    'it': it,
    'it-IT': it,
    'ru': ru,
    'ru-RU': ru,
    'ar': ar,
    'ar-SA': ar,
};

export const getDateFnsLocale = (localeStr: string | undefined): Locale | undefined => {
    if (!localeStr) return undefined;
    if (localeMap[localeStr]) return localeMap[localeStr];
    // Try language code only (e.g., 'es' from 'es-ES')
    const langCode = localeStr.split('-')[0];
    return localeMap[langCode];
};
