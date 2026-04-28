import React from 'react';
import { Moon, Sun, Monitor, Palette, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const MODES = [
  { id: 'light',  label: 'Light',  Icon: Sun,     hint: 'Bright + clean' },
  { id: 'dark',   label: 'Dark',   Icon: Moon,    hint: 'Easy on the eyes' },
  { id: 'system', label: 'System', Icon: Monitor, hint: 'Match your device' },
];

const NotificationsTab = () => {
  const { theme, setTheme, accent, setAccent, accents } = useTheme();

  return (
    <div className="space-y-6">
      {/* Theme mode */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
          <Moon className="w-5 h-5" />
          Theme
        </h2>
        <p className="text-white/60 text-sm mb-5">Pick how GamerGrid looks. Choose from light, dark, or system.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map(({ id, label, Icon, hint }) => {
            const active = theme === id;
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                data-testid={`theme-mode-${id}`}
                className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                  active
                    ? 'border-purple-500 bg-purple-600/20 ring-2 ring-purple-500/40'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${active ? 'text-purple-300' : 'text-white/70'}`} />
                  <span className="font-semibold text-white">{label}</span>
                  {active && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                </div>
                <p className="text-xs text-white/60">{hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent color palette — only meaningful in dark mode but lives here for convenience */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Accent Color
        </h2>
        <p className="text-white/60 text-sm mb-5">
          Personalize highlights and gradients. Pick any of these {accents.length} signature palettes.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {accents.map((a) => {
            const active = accent === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                data-testid={`accent-${a.id}`}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all overflow-hidden ${
                  active
                    ? 'border-white shadow-lg scale-[1.03]'
                    : 'border-white/10 hover:border-white/40'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${a.primary}33, ${a.secondary}33)`,
                }}
              >
                {/* preview dot */}
                <div
                  className="w-10 h-10 rounded-full shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${a.primary}, ${a.secondary})`,
                  }}
                />
                <div className="flex items-center gap-1 text-sm font-semibold text-white">
                  <span>{a.emoji}</span>
                  <span>{a.label}</span>
                </div>
                {active && (
                  <span
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    aria-label="active"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 p-4 rounded-lg border border-white/10 bg-white/5">
          <p className="text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">Live Preview</p>
          <div
            className="rounded-lg p-4"
            style={{ background: 'linear-gradient(135deg, var(--gg-accent), var(--gg-accent-2))' }}
          >
            <p className="text-white font-bold text-lg">GamerGrid · {accents.find((a) => a.id === accent)?.label}</p>
            <p className="text-white/85 text-sm">Buttons, highlights and pro accents now use this palette.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
