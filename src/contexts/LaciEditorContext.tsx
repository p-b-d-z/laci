'use client';

import React, { createContext, useState, useContext } from 'react';

type LaciEditorContextType = {
	activeEditor: string | null;
	setActiveEditor: (id: string | null) => void;
};

const LaciEditorContext = createContext<LaciEditorContextType | undefined>(undefined);

export function LaciEditorProvider({ children }: { children: React.ReactNode }) {
	const [activeEditor, setActiveEditor] = useState<string | null>(null);

	return <LaciEditorContext.Provider value={{ activeEditor, setActiveEditor }}>{children}</LaciEditorContext.Provider>;
}

export function useLaciEditor() {
	const context = useContext(LaciEditorContext);
	if (context === undefined) {
		throw new Error('useLaciEditor must be used within a LaciEditorProvider');
	}
	return context;
}
