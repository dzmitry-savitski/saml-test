import React from 'react';

interface CertificateTextareaProps {
  value: string;
  label: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export const CertificateTextarea: React.FC<CertificateTextareaProps> = ({
  value,
  label,
  placeholder,
  onChange,
  error,
  required = false,
  className = ''
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>
      <textarea
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none text-xs font-mono ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}; 