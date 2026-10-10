import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'text';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  children,
  disabled = false,
  className = '',
  type = 'button',
  id,
}) => {
  const baseClasses =
    'rounded-full flex items-center justify-center font-sans font-bold text-xs tracking-widest uppercase transition-all duration-300 active:scale-[0.96] select-none disabled:opacity-40 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-primary text-white shadow-lg shadow-primary/10 hover:bg-primary/95',
    secondary: 'bg-bg-secondary border border-accent/40 text-primary hover:border-accent/80',
    text: 'bg-transparent text-accent hover:text-accent/80',
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
