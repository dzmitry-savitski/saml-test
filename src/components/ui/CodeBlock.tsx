import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from './button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  copyButtonText?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'xml',
  showLineNumbers = true,
  maxHeight = '400px',
  className = '',
  copyButtonText = 'Copy'
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
        >
          <Copy className="h-3 w-3 mr-1" />
          {copyButtonText}
        </Button>
      </div>
      
      <div 
        className="rounded-md border overflow-hidden"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            fontSize: '12px',
            lineHeight: '1.4',
            padding: '16px',
            background: 'transparent',
            maxHeight: 'none'
          }}
          lineNumberStyle={{
            color: '#6b7280',
            fontSize: '11px',
            minWidth: '2em'
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}; 