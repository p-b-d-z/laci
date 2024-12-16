'use client';

import React, { createContext } from 'react';
import { AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children, initialState }: { children: React.ReactNode; initialState: AuthContextType }) => {
	return <AuthContext.Provider value={initialState}>{children}</AuthContext.Provider>;
};
