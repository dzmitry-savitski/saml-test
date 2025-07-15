import React from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light';
import { Button } from './button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

// Register only the XML language
SyntaxHighlighter.registerLanguage('xml', xml);

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'xml',
  showLineNumbers = true,
  maxHeight = '400px',
  className = ''
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div 
        className="rounded-md border overflow-hidden"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          customStyle={{
            margin: 0,
            fontSize: '12px',
            lineHeight: '1.4',
            padding: '16px',
            background: 'transparent',
            maxHeight: maxHeight,
            overflowY: 'auto'
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
      
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}; 