/*
This context allows the retrieval of cookies in child pages (pops-wrapper)
*/
import React, { createContext, useContext } from 'react';
import { MmmmCookie } from '@/types';

const CookiesContext = createContext<MmmmCookie | null>(null);

export const CookiesProvider: React.FC<{ cookies: MmmmCookie; children: React.ReactNode }> = ({ cookies, children }) => {
	return <CookiesContext.Provider value={cookies}>{children}</CookiesContext.Provider>;
};

export const useProviderCookies = () => {
	return useContext(CookiesContext);
};
