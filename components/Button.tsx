import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  // Reduced padding from py-3 to py-2.5 for a sleeker look
  const baseStyles = "px-5 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-sm md:text-base tracking-wide";
  
  const variants = {
    // Primary: Enhanced Metallic Silver gradient. Lighter top, slightly darker bottom for 3D metallic effect.
    primary: "bg-gradient-to-b from-white via-slate-200 to-slate-300 text-slate-900 hover:from-white hover:via-slate-100 hover:to-slate-200 border border-slate-400/50 shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-[0.98]",
    
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 shadow-md",
    
    outline: "bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};