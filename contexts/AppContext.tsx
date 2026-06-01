import React, { createContext } from 'react';
import type { AppContextType } from '../types';

/**
 * Contexto da aplicação. Definido em arquivo separado para garantir uma única
 * referência em todos os chunks (main e lazy), evitando que páginas lazy
 * recebam null ao usar useContext.
 */
export const AppContext = createContext<AppContextType | null>(null);
