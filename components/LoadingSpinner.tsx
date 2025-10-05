import React from 'react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center space-y-3">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
    <p className="text-[#FF6B35] font-semibold">{text}</p>
  </div>
);

export default LoadingSpinner;