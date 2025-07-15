import pako from 'pako';
import type { ServiceProvider } from '../types/samlConfig';

// Session storage key prefix for storing request IDs
const REQUEST_ID_PREFIX = 'saml_request_';

/**
 * Generates a unique request ID for SAML authentication
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `_${timestamp}${random}`;
}

/**
 * Stores the request ID in session storage for later validation
 */
export function storeRequestId(spId: string, requestId: string): void {
  const key = `${REQUEST_ID_PREFIX}${spId}`;
  sessionStorage.setItem(key, requestId);
}

/**
 * Retrieves the stored request ID for validation
 */
export function getStoredRequestId(spId: string): string | null {
  const key = `${REQUEST_ID_PREFIX}${spId}`;
  return sessionStorage.getItem(key);
}

/**
 * Removes the stored request ID after successful validation
 */
export function clearStoredRequestId(spId: string): void {
  const key = `${REQUEST_ID_PREFIX}${spId}`;
  sessionStorage.removeItem(key);
}

/**
 * Creates a SAML AuthnRequest XML
 */
export function createAuthnRequest(sp: ServiceProvider, forceAuthn: boolean = false, allowCreate: boolean = true): string {
  const requestId = generateRequestId();
  const issueInstant = new Date().toISOString();
  
  // Create the SAML request XML
  const samlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:${sp.spAcsBinding}"
                    AssertionConsumerServiceURL="${sp.acsUrl}"
                    Destination="${sp.idp.ssoUrl}"
                    ${forceAuthn ? 'ForceAuthn="true"' : ''}>
  <saml:Issuer>${sp.entityId}</saml:Issuer>
  <samlp:NameIDPolicy
    Format="${sp.nameIdFormat}"
    ${allowCreate ? 'AllowCreate="true"' : 'AllowCreate="false"'}/>
</samlp:AuthnRequest>`;

  return samlRequest;
}

/**
 * Signs a SAML request with the SP's private key using xmldsigjs
 */
export async function signAuthnRequest(samlRequest: string, privateKeyPem: string, certificatePem?: string): Promise<string> {
  try {
    // Parse the XML using DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(samlRequest, 'text/xml');
    
    // Find the AuthnRequest element
    const authnRequest = xmlDoc.querySelector('samlp\\:AuthnRequest, AuthnRequest');
    if (!authnRequest) {
      throw new Error('AuthnRequest element not found');
    }
    
    const requestId = authnRequest.getAttribute('ID');
    if (!requestId) {
      throw new Error('AuthnRequest must have an ID attribute');
    }
    
    const { SignedXml, Parse } = await import('xmldsigjs');
    
    // Parse the document with xmldsigjs
    const parsedDoc = Parse(samlRequest);
    
    // Convert PEM private key to CryptoKey - Web Crypto API expects PKCS#8 format
    const privateKey = await convertPemToCryptoKey(privateKeyPem, 'private');
    
    // Create SignedXml instance
    const signedXml = new SignedXml();
    // Set exclusive canonicalization using the correct property chain
    // signedXml.XmlSignature.SignedInfo.CanonicalizationMethod.Algorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    // // Try to set prefix to empty string to use default namespace (like xml-crypto)
    // (signedXml as any).prefix = '';

    // Prepare x509 option if certificate is provided
    let signOptions: any = {
      references: [
        {
          hash: 'SHA-256',
          transforms: ['enveloped', 'exc-c14n'], // Use 'exc-c14n' for exclusive canonicalization
          uri: `#${requestId}` // Set the URI to reference the element by ID
        }
      ]
    };
    if (certificatePem) {
      signOptions.x509 = [pemToBase64(certificatePem)];
    }
    
    // Sign the document
    await signedXml.Sign(
      { name: 'RSASSA-PKCS1-v1_5' }, // algorithm
      privateKey, // private key
      parsedDoc, // document to sign
      signOptions
    );
    
    const issuer = parsedDoc.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "Issuer")[0];
    const signature = signedXml.GetXml()?.getRootNode();
    if (issuer && signature && issuer.parentNode) {
      issuer.parentNode.insertBefore(signature, issuer.nextSibling);
    }
    const signedXmlString = new XMLSerializer().serializeToString(parsedDoc);

    return signedXmlString;
  } catch (error) {
    console.error('Error signing SAML request:', error);
    // Return unsigned request if signing fails
    return samlRequest;
  }
}

/**
 * Helper to extract base64 from PEM
 */
function pemToBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
}

/**
 * Converts PEM format key/certificate to CryptoKey
 */
async function convertPemToCryptoKey(pem: string, type: 'public' | 'private'): Promise<CryptoKey> {
  try {
    // Remove PEM headers and decode base64
    const base64 = pemToBase64(pem);
    const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    
    if (type === 'private') {
      // Import private key - PKCS#8 format
      // xmldsigjs needs the key to be extractable for KeyInfo generation
      return await window.crypto.subtle.importKey(
        'pkcs8',
        binary,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        true, // extractable = true for xmldsigjs
        ['sign']
      );
    } else {
      // For certificates, we need to extract the public key from the X.509 certificate
      // First, parse the certificate to get the public key
      const { Certificate } = await import('pkijs');
      const cert = await Certificate.fromBER(binary);
      
      // Export the public key from the certificate
      const publicKeyBuffer = cert.subjectPublicKeyInfo.toSchema().toBER(false);
      
      // Import the public key
      return await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['verify']
      );
    }
  } catch (error) {
    console.error(`Error converting PEM to CryptoKey (${type}):`, error);
    console.error('PEM content:', pem.substring(0, 100) + '...');
    throw new Error(`Failed to convert ${type} key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encodes SAML request for transmission (base64 + deflate)
 */
export function encodeSamlRequest(samlRequest: string): string {
  // First compress the XML using raw deflate (no zlib headers)
  const compressed = pako.deflate(samlRequest, { level: 9, raw: true });
  // Then encode to base64
  return btoa(String.fromCharCode(...compressed));
}

/**
 * Decodes SAML request from transmission format (base64 + deflate)
 */
export function decodeSamlRequest(encodedRequest: string): string {
  try {
    // Decode from base64
    const compressed = Uint8Array.from(atob(encodedRequest), c => c.charCodeAt(0));
    // Inflate the compressed data
    const xml = pako.inflate(compressed, { to: 'string' });
    return xml;
  } catch (error) {
    console.error('Error decoding SAML request:', error);
    throw new Error('Invalid SAML request encoding');
  }
}

/**
 * Decodes SAML response from transmission format (base64 only, no compression)
 */
export function decodeSamlResponse(encodedResponse: string): string {
  try {
    // Decode from base64 only (no compression for SAML responses)
    const xml = atob(encodedResponse);
    return xml;
  } catch (error) {
    console.error('Error decoding SAML response:', error);
    throw new Error('Invalid SAML response encoding');
  }
}

/**
 * Encodes SAML request for POST binding (base64 only, no compression)
 */
export function base64EncodeSamlRequest(samlRequest: string): string {
  return btoa(unescape(encodeURIComponent(samlRequest)));
}

/**
 * Initiates SAML authentication by redirecting to IDP
 */
export async function initiateSamlAuth(sp: ServiceProvider, forceAuthn: boolean = false, allowCreate: boolean = true, relayState?: string): Promise<void> {
  try {
    // Generate the SAML request
    let samlRequest = createAuthnRequest(sp, forceAuthn, allowCreate);
    
    // Sign the request if required
    if (sp.signAuthnRequest && sp.privateKey) {
      samlRequest = await signAuthnRequest(samlRequest, sp.privateKey, sp.certificate);
    }
    
    // Extract request ID for storage
    const requestIdMatch = samlRequest.match(/ID="([^"]+)"/);
    const requestId = requestIdMatch ? requestIdMatch[1] : generateRequestId();
    
    // Store the request ID for later validation
    storeRequestId(sp.id, requestId);
    
    // Encode the request based on binding
    let encodedRequest: string;
    if (sp.idp.singleSignOnBinding === 'HTTP-Redirect') {
      encodedRequest = encodeSamlRequest(samlRequest); // deflate + base64
    } else {
      encodedRequest = base64EncodeSamlRequest(samlRequest); // base64 only
    }
    
    // Use provided relayState or fall back to sp.id
    const finalRelayState = relayState || sp.id;
    
    // Redirect to IDP based on binding
    if (sp.idp.singleSignOnBinding === 'HTTP-Redirect') {
      const url = `${sp.idp.ssoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${encodeURIComponent(finalRelayState)}`;
      window.location.href = url;
    } else {
      // HTTP-POST binding - create a form and submit it
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = sp.idp.ssoUrl;
      form.style.display = 'none';
      
      const samlInput = document.createElement('input');
      samlInput.type = 'hidden';
      samlInput.name = 'SAMLRequest';
      samlInput.value = encodedRequest;
      
      const relayInput = document.createElement('input');
      relayInput.type = 'hidden';
      relayInput.name = 'RelayState';
      relayInput.value = finalRelayState;
      
      form.appendChild(samlInput);
      form.appendChild(relayInput);
      document.body.appendChild(form);
      form.submit();
    }
  } catch (error) {
    console.error('Error initiating SAML authentication:', error);
    throw new Error('Failed to initiate SAML authentication');
  }
} 

/**
 * Validates SAML response signature using xmldsigjs (async)
 */
export async function validateResponseSignature(xmlDoc: Document): Promise<boolean> {
  try {
    // The Response element is always the root in SAML responses
    const responseElement = xmlDoc.documentElement;
    if (!responseElement || !responseElement.tagName.includes('Response')) {
      console.warn('No Response element found at root');
      return false;
    }
    
    // Find signature by namespace
    const signatures = xmlDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    
    if (signatures.length === 0) {
      console.warn('Response is not signed');
      return false;
    }
    
    // Find the signature that's a direct child of the response (root)
    let responseSignature: Element | null = null;
    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      if (sig.parentElement === responseElement) {
        responseSignature = sig;
        break;
      }
    }
    
    if (!responseSignature) {
      console.warn('Response signature not found');
      return false;
    }
    
    const { SignedXml, Parse } = await import('xmldsigjs');
    
    // Create a wrapper document to work around xmldsigjs ID lookup issues
    // xmldsigjs has trouble finding elements by ID when they are the root element
    // By wrapping the Response in another element, we make it a child element
    // which xmldsigjs can find reliably using getElementById
    const wrapperXml = `<?xml version="1.0" encoding="UTF-8"?>
<wrapper xmlns:saml2p="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
${xmlDoc.documentElement.outerHTML}
</wrapper>`;
    
    const parsedDoc = Parse(wrapperXml);
    
    // Find the signature in the parsed document
    const parsedSignatures = parsedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    let parsedResponseSignature: Element | null = null;
    
    for (let i = 0; i < parsedSignatures.length; i++) {
      const sig = parsedSignatures[i];
      const parent = sig.parentElement;
      if (parent && parent.tagName.includes('Response')) {
        parsedResponseSignature = sig;
        break;
      }
    }
    
    if (!parsedResponseSignature) {
      console.warn('Response signature not found in parsed document');
      return false;
    }
    
    const signedXml = new SignedXml(parsedDoc);
    signedXml.LoadXml(parsedResponseSignature);
    
    const isValid = await signedXml.Verify();
    if (isValid) {
      console.log('Response signature validation passed');
    } else {
      console.warn('Response signature validation failed');
    }
    return isValid;
  } catch (error) {
    console.error('Error validating response signature:', error);
    return false;
  }
}

/**
 * Validates SAML assertion signature using xmldsigjs (async)
 */
export async function validateAssertionSignature(xmlDoc: Document): Promise<boolean> {
  try {
    const assertionElement = xmlDoc.querySelector('saml\\:Assertion, Assertion');
    if (!assertionElement) {
      console.warn('No Assertion element found');
      return false;
    }
    
    console.log('Assertion element ID:', assertionElement.getAttribute('ID'));
    
    // Find signature by namespace
    const signatures = xmlDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    
    if (signatures.length === 0) {
      console.warn('Assertion is not signed');
      return false;
    }
    
    // Find the signature that's a direct child of the assertion
    let assertionSignature: Element | null = null;
    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      if (sig.parentElement === assertionElement) {
        assertionSignature = sig;
        console.log(`Found assertion signature at index ${i}`);
        break;
      }
    }
    
    if (!assertionSignature) {
      console.warn('Assertion signature not found');
      return false;
    }
    
    // Debug the signature structure
    const reference = assertionSignature.querySelector('ds\\:Reference, Reference');
    if (reference) {
      console.log('Assertion Reference URI:', reference.getAttribute('URI'));
    }
    
    const { SignedXml, Parse } = await import('xmldsigjs');
    
    // Parse the entire document
    const parsedDoc = Parse(xmlDoc.documentElement.outerHTML);
    
    // Find the signature in the parsed document
    const parsedSignatures = parsedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    let parsedAssertionSignature: Element | null = null;
    
    for (let i = 0; i < parsedSignatures.length; i++) {
      const sig = parsedSignatures[i];
      const parent = sig.parentElement;
      if (parent && parent.tagName.includes('Assertion')) {
        parsedAssertionSignature = sig;
        console.log(`Found assertion signature in parsed doc at index ${i}`);
        break;
      }
    }
    
    if (!parsedAssertionSignature) {
      console.warn('Assertion signature not found in parsed document');
      return false;
    }
    
    const signedXml = new SignedXml(parsedDoc);
    signedXml.LoadXml(parsedAssertionSignature);
    
    console.log('Attempting to verify assertion signature...');
    const isValid = await signedXml.Verify();
    if (isValid) {
      console.log('Assertion signature validation passed');
    } else {
      console.warn('Assertion signature validation failed');
    }
    return isValid;
  } catch (error) {
    console.error('Error validating assertion signature:', error);
    return false;
  }
}

/**
 * Comprehensive SAML response validation (async)
 */
export async function validateSAMLResponse(xmlDoc: Document, sp: ServiceProvider): Promise<{
  isValid: boolean;
  responseSigned: boolean;
  assertionSigned: boolean;
  responseSignatureValid: boolean;
  assertionSignatureValid: boolean;
  errors: string[];
}> {
  const result = {
    isValid: true,
    responseSigned: false,
    assertionSigned: false,
    responseSignatureValid: false,
    assertionSignatureValid: false,
    errors: [] as string[]
  };
  try {
    if (!sp.idp.certificate) {
      result.errors.push('IDP certificate not configured');
      result.isValid = false;
      return result;
    }
    const responseElement = xmlDoc.querySelector('samlp\\:Response, Response');
    if (responseElement) {
      const responseSignature = responseElement.querySelector(':scope > ds\\:Signature, :scope > Signature');
      if (responseSignature) {
        result.responseSigned = true;
        result.responseSignatureValid = await validateResponseSignature(xmlDoc);
        if (!result.responseSignatureValid) {
          result.errors.push('Response signature validation failed');
          result.isValid = false;
        }
      }
    }
    const assertionElement = xmlDoc.querySelector('saml\\:Assertion, Assertion');
    if (assertionElement) {
      const assertionSignature = assertionElement.querySelector(':scope > ds\\:Signature, :scope > Signature');
      if (assertionSignature) {
        result.assertionSigned = true;
        result.assertionSignatureValid = await validateAssertionSignature(xmlDoc);
        if (!result.assertionSignatureValid) {
          result.errors.push('Assertion signature validation failed');
          result.isValid = false;
        }
      }
    }
    if (!result.responseSigned && !result.assertionSigned) {
      result.errors.push('Neither response nor assertion is signed');
      result.isValid = false;
    }
    return result;
  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
    return result;
  }
} 