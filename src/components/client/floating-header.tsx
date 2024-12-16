'use client';

import { useEffect } from 'react';

export function FloatingHeaderScript() {
	useEffect(() => {
		const header = document.getElementById('floatingHeader');
		if (!header) return;

		const handleScroll = () => {
			if (window.scrollY > 0) {
				header.classList.add('shadow-lg');
			} else {
				header.classList.remove('shadow-lg');
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return null;
}
