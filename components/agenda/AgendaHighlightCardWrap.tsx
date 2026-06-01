import React from 'react';

type AgendaHighlightCardWrapProps = {
	children: React.ReactNode;
	state: 'focused' | 'dimmed' | 'normal';
	ringClass?: string;
	scrollRef?: React.Ref<HTMLDivElement>;
};

/** Envelope visual: foco + anel pulsante ou esmaecimento do restante da grade. */
const AgendaHighlightCardWrap: React.FC<AgendaHighlightCardWrapProps> = ({
	children,
	state,
	ringClass = 'ring-amber-400',
	scrollRef,
}) => {
	if (state === 'normal') {
		return <>{children}</>;
	}

	return (
		<div
			ref={scrollRef}
			data-agenda-highlight={state}
			className={
				state === 'dimmed'
					? 'rounded-lg opacity-45 pointer-events-none transition-opacity duration-200'
					: `relative z-10 rounded-lg opacity-100 ring-2 ring-offset-1 transition-opacity duration-200 animate-agenda-highlight-pulse ${ringClass}`
			}
		>
			{children}
		</div>
	);
};

export default AgendaHighlightCardWrap;
