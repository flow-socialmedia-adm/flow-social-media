import { useEffect } from 'react';

export const useGoogleFont = (fontName?: string) => {
    useEffect(() => {
        if (!fontName) return;

        const fontId = `font-${fontName.replace(/ /g, '-')}`;
        if (document.getElementById(fontId)) return;

        const link = document.createElement('link');
        link.id = fontId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';

        document.head.appendChild(link);
    }, [fontName]);
};
