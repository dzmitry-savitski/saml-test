import React from 'react';
import { Input } from './input';
import { Button } from './button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CopyInputProps {
  value: string;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  error?: string;
  copyValue?: string; // Optional: if you want to copy a different value than what's displayed
}

export const CopyInput: React.FC<CopyInputProps> = ({
  value,
  label,
  placeholder,
  readOnly = false,
  onChange,
  className = '',
  error,
  copyValue
}) => {
  const handleCopy = () => {
    const textToCopy = copyValue || value;
    navigator.clipboard.writeText(textToCopy);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <Input
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`pr-10 text-xs ${className} ${error ? 'border-red-500' : ''}`}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          onClick={handleCopy}
          tabIndex={-1}
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}; 