import { useEffect } from 'react';

import { useThemeStore } from './theme-store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };

    apply();
    if (theme !== 'system') return;

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
