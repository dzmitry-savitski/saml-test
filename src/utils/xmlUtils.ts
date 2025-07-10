/**
 * Formats XML with proper indentation and syntax highlighting
 * @param xml - The raw XML string to format
 * @returns Formatted XML with HTML syntax highlighting
 */
export const formatXml = (xml: string): string => {
  try {
    // Parse and format XML with proper indentation
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    
    // Create a formatted XML string with proper indentation
    const formatNode = (node: Node, indent: number = 0): string => {
      const spaces = '  '.repeat(indent);
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        return text ? `${spaces}${text}\n` : '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName;
        const attributes = Array.from(element.attributes)
          .map(attr => `${attr.name}="${attr.value}"`)
          .join(' ');
        
        const hasChildren = element.children.length > 0 || 
          (element.textContent && element.textContent.trim() && element.children.length === 0);
        
        if (!hasChildren) {
          // Self-closing tag
          return `${spaces}<${tagName}${attributes ? ' ' + attributes : ''} />\n`;
        }
        
        let result = `${spaces}<${tagName}${attributes ? ' ' + attributes : ''}>`;
        
        // Add children
        const children = Array.from(element.childNodes);
        if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
          // Simple text content
          const text = children[0].textContent?.trim();
          if (text) {
            result += text;
          }
        } else {
          // Complex content with children
          result += '\n';
          children.forEach(child => {
            result += formatNode(child, indent + 1);
          });
          result += spaces;
        }
        
        result += `</${tagName}>\n`;
        return result;
      }
      
      return '';
    };
    
    const formatted = formatNode(xmlDoc.documentElement);
    
    // Add syntax highlighting
    return formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;(\/?)([^>]*?)&gt;/g, (_, slash, content) => {
        const isClosing = slash === '/';
        const isSelfClosing = content.endsWith('/');
        const tagName = content.split(' ')[0];
        
        let color = '#0066cc'; // default blue for tags
        if (isClosing) color = '#cc0066'; // red for closing tags
        if (isSelfClosing) color = '#666666'; // gray for self-closing tags
        if (tagName.startsWith('saml:')) color = '#006600'; // green for SAML elements
        if (tagName.startsWith('samlp:')) color = '#660066'; // purple for SAML protocol elements
        if (tagName.startsWith('ds:')) color = '#cc6600'; // orange for signature elements
        if (tagName.startsWith('md:')) color = '#006666'; // teal for metadata elements
        
        return `<span style="color: ${color}">&lt;${slash}${content}&gt;</span>`;
      })
      .replace(/&amp;([^;]+);/g, '<span style="color: #666666">&amp;$1;</span>') // entities
      .replace(/([a-zA-Z-]+)=&quot;([^&]*?)&quot;/g, '<span style="color: #cc0066">$1</span>=<span style="color: #006600">&quot;$2&quot;</span>'); // attributes
  } catch (error) {
    console.error('Error formatting XML:', error);
    return xml; // fallback to original XML
  }
};

/**
 * Removes HTML syntax highlighting tags from formatted XML
 * @param formattedXml - XML with HTML syntax highlighting
 * @returns Clean formatted XML without HTML tags
 */
export const removeXmlHighlighting = (formattedXml: string): string => {
  return formattedXml.replace(/<[^>]*>/g, '');
}; 