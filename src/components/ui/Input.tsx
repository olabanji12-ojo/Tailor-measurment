import React, { useState } from 'react';

interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  id,
  className = '',
  disabled = false,
  autoComplete,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const isFloating = isFocused || value.length > 0;

  return (
    <div className={`relative w-full flex flex-col pt-5 ${className}`}>
      {/* Floating Label */}
      <label
        htmlFor={id}
        className={`absolute left-0 pointer-events-none transition-all duration-300 origin-left ${
          isFloating
            ? 'top-0 scale-[0.8] text-accent font-bold tracking-widest uppercase'
            : 'top-7 scale-100 text-text-muted tracking-wide font-sans'
        }`}
      >
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>

      {/* Input Element */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isFocused ? placeholder : ''}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full h-12 bg-transparent text-primary text-base font-sans outline-none pb-2 border-b border-border-subtle focus:border-transparent transition-colors z-10 disabled:opacity-40"
      />

      {/* Sliding Gold Underline */}
      <div
        className={`absolute bottom-0 h-[2px] bg-accent transition-all duration-350 ${
          isFocused ? 'w-full left-0 scale-x-100' : 'w-0 left-1/2 scale-x-0'
        } origin-center`}
      />
    </div>
  );
};
