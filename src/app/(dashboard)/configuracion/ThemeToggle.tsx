'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        Apariencia del Sistema
      </h3>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => changeTheme('light')}
          className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Sun size={16} />
          Modo Claro
        </button>
        
        <button 
          onClick={() => changeTheme('dark')}
          className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Moon size={16} />
          Modo Oscuro
        </button>

        <button 
          onClick={() => changeTheme('system')}
          className={`btn ${theme === 'system' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Monitor size={16} />
          Automático (Sistema)
        </button>
      </div>
    </div>
  );
}
