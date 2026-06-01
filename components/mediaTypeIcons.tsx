import React from 'react';

/**
 * Ícones de tipo de mídia / tarefa no corpo do card.
 * Herdam `currentColor` via classe no TaskCard (`titleText`).
 */

const StrokeIcon: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden
    >
        {children}
    </svg>
);

/** Post estático — moldura arredondada + montanhas */
export const StaticIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <StrokeIcon className={className}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" ry="3" />
        <polyline points="5.5 16 10.1 11.4 13.1 14.4 18.5 9" />
    </StrokeIcon>
);

/** Vídeo — câmera com símbolo de adicionar */
export const VideoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <StrokeIcon className={className}>
        <rect x="3" y="5.5" width="12.5" height="13" rx="2.2" />
        <path d="M15.5 9.2L20.5 6.9V17.1L15.5 14.8" />
        <line x1="9.25" y1="9.1" x2="9.25" y2="14.9" />
        <line x1="6.4" y1="12" x2="12.1" y2="12" />
    </StrokeIcon>
);

/** Carrossel — moldura central com alças laterais */
export const CarouselIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <StrokeIcon className={className}>
        <rect x="6" y="4" width="12" height="16" rx="3" />
        <rect x="2.2" y="6.2" width="3.5" height="11.6" rx="1.6" />
        <rect x="18.3" y="6.2" width="3.5" height="11.6" rx="1.6" />
    </StrokeIcon>
);

/** Reels — claquete arredondada com play */
export const ReelsIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <StrokeIcon className={className}>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
        <line x1="3.8" y1="8.6" x2="20.2" y2="8.6" />
        <line x1="8.1" y1="3.8" x2="11.4" y2="8.3" />
        <line x1="13.3" y1="3.8" x2="16.6" y2="8.3" />
        <polygon points="9.6,11.6 16.6,14.7 9.6,17.8" fill="currentColor" stroke="none" />
    </StrokeIcon>
);

/** Story — círculo tracejado + cruz */
export const StoryIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <StrokeIcon className={className}>
        <circle cx="12" cy="12" r="9" strokeDasharray="4.2 3.2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </StrokeIcon>
);

/**
 * Tarefa geral — documento com linhas e check (visual único para qualquer tarefa).
 * Mantém o nome `StickyNotesTaskIcon` para não quebrar imports existentes.
 */
export const StickyNotesTaskIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <StrokeIcon className={className}>
        <path d="M4.5 4.5h12a1.4 1.4 0 0 1 1.4 1.4v9.6L13.6 19.5H5.9a1.4 1.4 0 0 1-1.4-1.4V4.5Z" />
        <line x1="7.6" y1="8.5"  x2="14.8" y2="8.5"  strokeWidth="1.6" />
        <line x1="7.6" y1="11.6" x2="14.8" y2="11.6" strokeWidth="1.6" />
        <line x1="7.6" y1="14.7" x2="13.4" y2="14.7" strokeWidth="1.6" />
        <polyline points="13.6 16.4 16.6 19.6 21.0 13.7" />
    </StrokeIcon>
);

