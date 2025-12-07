import { createContext, useContext } from 'react';

interface LexicalLocaleContextType {
    locale?: string;
}

export const LexicalLocaleContext = createContext<LexicalLocaleContextType>({});

export const useLexicalLocale = () => useContext(LexicalLocaleContext);
