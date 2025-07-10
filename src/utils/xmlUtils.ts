/**
 * Formats XML with proper indentation
 * @param xml - The raw XML string to format
 * @returns Clean formatted XML with proper indentation
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
    
    return formatNode(xmlDoc.documentElement);
  } catch (error) {
    console.error('Error formatting XML:', error);
    return xml; // fallback to original XML
  }
};

 