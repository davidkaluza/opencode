import React from 'react';
import { X, RotateCcw } from 'lucide-react';

const DEFAULTS = {
  background: '#33312B',
  surface: '#33312B',
  accent: '#C09537',
  muted: '#888888',
};

const FIELDS = [
  { key: 'background', label: 'Hintergrund', desc: 'Seitenhintergrund' },
  { key: 'surface', label: 'Karten', desc: 'Karten & Oberflächen' },
  { key: 'accent', label: 'Akzent', desc: 'Rahmen, Buttons, Hervorhebungen' },
  { key: 'muted', label: 'Muted', desc: 'deaktivierte Texte & Linien' },
];

const Settings = ({ colors, onChange, onClose }) => {
  const handleChange = (key, val) => {
    onChange({ ...colors, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70" onClick={onClose}>
      <div className="bg-surface border border-accent w-full max-w-[400px] mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-title-mono font-bold uppercase">Einstellungen</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between border border-accent p-3">
              <div>
                <div className="text-xs-mono uppercase">{f.label}</div>
                <div className="text-[0.7rem] text-muted">{f.desc}</div>
              </div>
              <input
                type="color"
                value={colors[f.key] || DEFAULTS[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer bg-transparent"
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => onChange({ ...DEFAULTS })}
          className="flex items-center gap-2 text-xs-mono text-muted hover:text-white border border-accent px-3 py-1.5 transition-colors"
        >
          <RotateCcw size={14} /> Standard
        </button>
      </div>
    </div>
  );
};

export default Settings;
