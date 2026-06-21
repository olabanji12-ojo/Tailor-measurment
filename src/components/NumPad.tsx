import React, { useState, useEffect } from 'react';

interface NumPadProps {
  activePart: string;
  currentValue: number | undefined;
  onConfirm: (value: number) => void;
  onNext: (value: number) => void;
  onClear: () => void;
  onClose: () => void;
  unit: string;
}

export const NumPad: React.FC<NumPadProps> = ({ activePart, currentValue, onConfirm, onNext, onClear, onClose, unit }) => {
  const [input, setInput] = useState(currentValue?.toString() || '');

  // Reset input whenever we move to a new measurement part
  useEffect(() => {
    setInput(currentValue?.toString() || '');
  }, [activePart, currentValue]);

  const handleKey = (key: string) => {
    if (key === 'DEL') {
      setInput(p => p.slice(0, -1));
      return;
    }
    if (key === '.' && input.includes('.')) return;
    if (input.length >= 5) return;
    setInput(p => p + key);
  };

  const numericValue = parseFloat(input);
  const isValid = !isNaN(numericValue) && numericValue > 0;

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'DEL'];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full rounded-t-[48px] z-[70] animate-bottom-sheet shadow-2xl overflow-hidden">

        {/* Active Part Header */}
        <div className="bg-gray-50/80 px-10 pt-8 pb-6 text-center border-b border-gray-50">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 mb-1">Recording</p>
          <h2 className="text-3xl font-black capitalize text-gray-800 tracking-tight">{activePart}</h2>
          {/* Live Preview */}
          <div className="mt-4 h-16 flex items-center justify-center">
            {input ? (
              <span className="text-6xl font-black text-primary tracking-tight">
                {input}
                <span className="text-xl font-bold text-gray-300 ml-2">{unit}</span>
              </span>
            ) : (
              <span className="text-5xl font-black text-gray-100">—</span>
            )}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2 p-6">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`h-16 rounded-2xl text-xl font-black transition-all active:scale-90 ${
                key === 'DEL'
                  ? 'bg-gray-100 text-gray-500 text-sm'
                  : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
              }`}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* CLEAR single value */}
        {currentValue !== undefined && (
          <div className="px-6 pb-2">
            <button
              onClick={onClear}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-red-100 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
            >
              ✕ Clear This Value
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-10">
          <button
            onClick={() => { if (isValid) onConfirm(numericValue); }}
            disabled={!isValid}
            className={`py-5 rounded-[28px] font-black text-sm tracking-widest uppercase transition-all ${
              isValid ? 'bg-gray-100 text-gray-600 active:scale-95' : 'bg-gray-50 text-gray-200'
            }`}
          >
            SAVE
          </button>
          <button
            onClick={() => { if (isValid) onNext(numericValue); }}
            disabled={!isValid}
            className={`py-5 rounded-[28px] font-black text-sm tracking-widest uppercase transition-all shadow-lg ${
              isValid ? 'bg-primary text-white active:scale-95 shadow-primary/20' : 'bg-gray-100 text-gray-300'
            }`}
          >
            NEXT →
          </button>
        </div>
      </div>
    </div>
  );
};
