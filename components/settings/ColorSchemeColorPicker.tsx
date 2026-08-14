import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WORKFLOW_STATUS_PALETTE } from '../../lib/constants';

export const ColorSchemeColorPicker: React.FC<{
	anchor: HTMLElement | null;
	onClose: () => void;
	onSelect: (color: (typeof WORKFLOW_STATUS_PALETTE)[number]) => void;
}> = ({ anchor, onClose, onSelect }) => {
	const panelRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ top: 0, left: 0 });

	useLayoutEffect(() => {
		if (!anchor) return;
		const rect = anchor.getBoundingClientRect();
		const width = 320;
		const height = 132;
		const margin = 8;
		const left = Math.max(
			margin,
			Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin),
		);
		let top = rect.bottom + margin;
		if (top + height > window.innerHeight - margin) top = rect.top - height - margin;
		setPosition({ top: Math.max(margin, top), left });
	}, [anchor]);

	useEffect(() => {
		if (!anchor) return;
		const onPointerDown = (event: MouseEvent) => {
			const target = event.target as Node;
			if (panelRef.current?.contains(target) || anchor.contains(target)) return;
			onClose();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('mousedown', onPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [anchor, onClose]);

	if (!anchor || typeof document === 'undefined') return null;
	return createPortal(
		<div
			ref={panelRef}
			role="dialog"
			aria-modal="true"
			className="fixed z-[11000] w-80 rounded-xl border border-gray-200/60 bg-white/95 p-2.5 shadow-xl shadow-gray-900/[0.08] backdrop-blur-sm dark:border-gray-600/50 dark:bg-gray-900/95"
			style={position}
		>
			<div className="grid grid-cols-8 gap-2 sm:grid-cols-9">
				{WORKFLOW_STATUS_PALETTE.map((color) => (
					<button
						key={color.id}
						type="button"
						onClick={() => onSelect(color)}
						className={`h-7 w-7 rounded-full ${color.bg} transition hover:ring-2 hover:ring-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
						aria-label={color.id}
					/>
				))}
			</div>
		</div>,
		document.body,
	);
};
