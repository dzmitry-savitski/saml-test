import forge from 'node-forge';
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
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-${sp.spAcsBinding}"
                    AssertionConsumerServiceURL="${sp.acsUrl}"
                    Destination="${sp.idp.ssoUrl}"
                    ${forceAuthn ? 'ForceAuthn="true"' : ''}
                    ${allowCreate ? 'IsPassive="false"' : ''}>
  <saml:Issuer>${sp.entityId}</saml:Issuer>
  <samlp:NameIDPolicy
    Format="${sp.nameIdFormat}"
    ${allowCreate ? 'AllowCreate="true"' : 'AllowCreate="false"'}/>
</samlp:AuthnRequest>`;

  return samlRequest;
}

/**
 * Signs a SAML request with the SP's private key
 */
export function signAuthnRequest(samlRequest: string, privateKeyPem: string): string {
  try {
    // Parse the private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // Create a canonicalized version of the XML (remove whitespace)
    const canonicalizedXml = samlRequest.replace(/>\s+</g, '><').trim();
    
    // Create signature using RSA-SHA256
    const md = forge.md.sha256.create();
    md.update(canonicalizedXml, 'utf8');
    const signature = privateKey.sign(md);
    const signatureValue = forge.util.encode64(signature);
    
    // Calculate digest
    const digest = forge.md.sha256.create();
    digest.update(canonicalizedXml, 'utf8');
    const digestValue = forge.util.encode64(digest.digest().getBytes());
    
    // Insert signature into the XML
    const signedRequest = canonicalizedXml.replace(
      '<samlp:AuthnRequest',
      `<samlp:AuthnRequest
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#${canonicalizedXml.match(/ID="([^"]+)"/)?.[1] || ''}">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>${digestValue}</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
  </ds:Signature>`
    );
    
    return signedRequest;
  } catch (error) {
    console.error('Error signing SAML request:', error);
    // Return unsigned request if signing fails
    return samlRequest;
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
export function initiateSamlAuth(sp: ServiceProvider, forceAuthn: boolean = false, allowCreate: boolean = true, relayState?: string): void {
  try {
    // Generate the SAML request
    let samlRequest = createAuthnRequest(sp, forceAuthn, allowCreate);
    
    // Sign the request if required
    if (sp.signAuthnRequest && sp.privateKey) {
      samlRequest = signAuthnRequest(samlRequest, sp.privateKey);
    }
    
    // Extract request ID for storage
    const requestIdMatch = samlRequest.match(/ID="([^"]+)"/);
    const requestId = requestIdMatch ? requestIdMatch[1] : generateRequestId();
    
    // Store the request ID for later validation
    storeRequestId(sp.id, requestId);
    
    // Encode the request based on binding
    let encodedRequest: string;
    if (sp.idp.singleSignOnBinding === 'GET') {
      encodedRequest = encodeSamlRequest(samlRequest); // deflate + base64
    } else {
      encodedRequest = base64EncodeSamlRequest(samlRequest); // base64 only
    }
    
    // Use provided relayState or fall back to sp.id
    const finalRelayState = relayState || sp.id;
    
    // Redirect to IDP based on binding
    if (sp.idp.singleSignOnBinding === 'GET') {
      const url = `${sp.idp.ssoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${encodeURIComponent(finalRelayState)}`;
      window.location.href = url;
    } else {
      // POST binding - create a form and submit it
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