import { create } from 'zustand'

export type PageName =
  | 'home'
  | 'chat'
  | 'login'
  | 'signup'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'admin'
  | 'admin-reports'
  | 'admin-users'
  | 'admin-bans'
  | 'admin-logs'
  | 'admin-settings'
  | 'admin-analytics'

export interface User {
  id: string
  name: string
  email: string
  role: string
  token: string
}

export interface AnonymousUser {
  id: string
  username: string
  gender: 'male' | 'female' | 'other'
  fingerprint: string
}

interface AppState {
  currentPage: PageName
  previousPage: PageName | null
  user: User | null
  isAnonymous: boolean
  anonymousUser: AnonymousUser | null
  language: 'en' | 'bn'
  chatState: 'idle' | 'selecting-gender' | 'connecting' | 'matched' | 'disconnected'
  partnerInfo: { id: string; name: string; type: string } | null

  navigateTo: (page: PageName) => void
  goBack: () => void
  setUser: (user: User | null) => void
  setAnonymousUser: (user: AnonymousUser | null) => void
  logout: () => void
  toggleLanguage: () => void
  setChatState: (state: AppState['chatState']) => void
  setPartnerInfo: (partner: { id: string; name: string; type: string } | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'home',
  previousPage: null,
  user: null,
  isAnonymous: true,
  anonymousUser: null,
  language: 'en',
  chatState: 'idle',
  partnerInfo: null,

  navigateTo: (page) =>
    set((state) => ({
      previousPage: state.currentPage,
      currentPage: page,
    })),

  goBack: () =>
    set((state) => ({
      currentPage: state.previousPage || 'home',
      previousPage: null,
    })),

  setUser: (user) =>
    set({
      user,
      isAnonymous: !user,
    }),

  setAnonymousUser: (user) =>
    set({
      anonymousUser: user,
      isAnonymous: true,
      user: null,
    }),

  logout: () =>
    set({
      user: null,
      isAnonymous: true,
      currentPage: 'home',
    }),

  toggleLanguage: () =>
    set((state) => ({
      language: state.language === 'en' ? 'bn' : 'en',
    })),

  setChatState: (chatState) => set({ chatState }),
  setPartnerInfo: (partnerInfo) => set({ partnerInfo }),
}))
