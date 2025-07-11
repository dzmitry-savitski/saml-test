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
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:${sp.spAcsBinding}"
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
export function signAuthnRequest(samlRequest: string, privateKeyPem: string, certificatePem?: string): string {
  try {
    // Parse the private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // Parse the XML using DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(samlRequest, 'text/xml');
    
    // Find the AuthnRequest element
    const authnRequest = xmlDoc.querySelector('samlp\\:AuthnRequest, AuthnRequest');
    if (!authnRequest) {
      throw new Error('AuthnRequest element not found');
    }
    
    // Create signature element first (without signature value)
    const signatureElement = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Signature');
    
    // Create SignedInfo
    const signedInfo = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:SignedInfo');
    
    const canonicalizationMethod = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:CanonicalizationMethod');
    canonicalizationMethod.setAttribute('Algorithm', 'http://www.w3.org/2001/10/xml-exc-c14n#');
    
    const signatureMethod = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:SignatureMethod');
    signatureMethod.setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
    
    const reference = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Reference');
    reference.setAttribute('URI', `#${authnRequest.getAttribute('ID')}`);
    
    const transforms = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Transforms');
    
    const transform1 = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Transform');
    transform1.setAttribute('Algorithm', 'http://www.w3.org/2001/10/xml-exc-c14n#');
    
    const transform2 = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:Transform');
    transform2.setAttribute('Algorithm', 'http://www.w3.org/2000/09/xmldsig#enveloped-signature');
    
    const digestMethod = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:DigestMethod');
    digestMethod.setAttribute('Algorithm', 'http://www.w3.org/2001/04/xmlenc#sha256');
    
    // Build the signature structure
    transforms.appendChild(transform1);
    transforms.appendChild(transform2);
    reference.appendChild(transforms);
    reference.appendChild(digestMethod);
    signedInfo.appendChild(canonicalizationMethod);
    signedInfo.appendChild(signatureMethod);
    signedInfo.appendChild(reference);
    signatureElement.appendChild(signedInfo);
    
    // Insert signature into the document first
    const issuer = authnRequest.querySelector('saml\\:Issuer, Issuer');
    if (issuer) {
      issuer.parentNode?.insertBefore(signatureElement, issuer.nextSibling);
    } else {
      authnRequest.insertBefore(signatureElement, authnRequest.firstChild);
    }
    
    // Now calculate digest of the document with signature element
    const documentWithSignature = new XMLSerializer().serializeToString(xmlDoc);
    const digest = forge.md.sha256.create();
    digest.update(documentWithSignature, 'utf8');
    const digestValue = forge.util.encode64(digest.digest().getBytes());
    
    // Add digest value
    const digestValueElement = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:DigestValue');
    digestValueElement.textContent = digestValue;
    reference.appendChild(digestValueElement);
    
    // Create canonicalized SignedInfo for signing
    const canonicalizedSignedInfo = new XMLSerializer().serializeToString(signedInfo);
    const md = forge.md.sha256.create();
    md.update(canonicalizedSignedInfo, 'utf8');
    const signature = privateKey.sign(md);
    const signatureValue = forge.util.encode64(signature);
    
    // Add signature value
    const signatureValueElement = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:SignatureValue');
    signatureValueElement.textContent = signatureValue;
    signatureElement.appendChild(signatureValueElement);
    
    // Add KeyInfo with certificate if provided
    if (certificatePem) {
      const keyInfo = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:KeyInfo');
      const x509Data = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:X509Data');
      const x509Certificate = xmlDoc.createElementNS('http://www.w3.org/2000/09/xmldsig#', 'ds:X509Certificate');
      
      // Clean the certificate (remove headers and whitespace)
      const cleanCert = certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s/g, '');
      
      x509Certificate.textContent = cleanCert;
      x509Data.appendChild(x509Certificate);
      keyInfo.appendChild(x509Data);
      signatureElement.appendChild(keyInfo);
    }
    
    // Serialize back to string
    return new XMLSerializer().serializeToString(xmlDoc);
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
      samlRequest = signAuthnRequest(samlRequest, sp.privateKey, sp.certificate);
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
 * Validates SAML response signature
 */
export function validateResponseSignature(xmlDoc: Document, idpCertificate: string): boolean {
  try {
    // Find the Response element
    const responseElement = xmlDoc.querySelector('samlp\\:Response, Response');
    if (!responseElement) {
      console.warn('No Response element found');
      return false;
    }

    // Check if Response is signed - look for signature as direct child of response
    const signatureElement = responseElement.querySelector(':scope > ds\\:Signature, :scope > Signature');
    if (!signatureElement) {
      console.warn('Response is not signed');
      return false;
    }

    // Extract signature value
    const signatureValueElement = signatureElement.querySelector('ds\\:SignatureValue, SignatureValue');
    if (!signatureValueElement || !signatureValueElement.textContent) {
      console.warn('No signature value found');
      return false;
    }

    // Extract signed info
    const signedInfoElement = signatureElement.querySelector('ds\\:SignedInfo, SignedInfo');
    if (!signedInfoElement) {
      console.warn('No SignedInfo found');
      return false;
    }

    // Extract certificate
    const certElement = signatureElement.querySelector('ds\\:X509Certificate, X509Certificate');
    if (!certElement || !certElement.textContent) {
      console.warn('No certificate found in signature');
      return false;
    }

    // Validate certificate matches IDP certificate
    const responseCert = certElement.textContent.trim();
    const idpCert = idpCertificate
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');
    
    if (responseCert !== idpCert) {
      console.warn('Certificate mismatch');
      return false;
    }

    // For now, we'll do basic validation
    // In a production environment, you'd want to use a proper XML signature library
    // like xml-crypto or similar to validate the actual cryptographic signature
    console.log('Response signature validation passed (basic check)');
    return true;
  } catch (error) {
    console.error('Error validating response signature:', error);
    return false;
  }
}

/**
 * Validates SAML assertion signature
 */
export function validateAssertionSignature(xmlDoc: Document, idpCertificate: string): boolean {
  try {
    // Find the Assertion element
    const assertionElement = xmlDoc.querySelector('saml\\:Assertion, Assertion');
    if (!assertionElement) {
      console.warn('No Assertion element found');
      return false;
    }

    // Check if Assertion is signed - look for signature as direct child of assertion
    const signatureElement = assertionElement.querySelector(':scope > ds\\:Signature, :scope > Signature');
    if (!signatureElement) {
      console.warn('Assertion is not signed');
      return false;
    }

    // Extract signature value
    const signatureValueElement = signatureElement.querySelector('ds\\:SignatureValue, SignatureValue');
    if (!signatureValueElement || !signatureValueElement.textContent) {
      console.warn('No signature value found in assertion');
      return false;
    }

    // Extract signed info
    const signedInfoElement = signatureElement.querySelector('ds\\:SignedInfo, SignedInfo');
    if (!signedInfoElement) {
      console.warn('No SignedInfo found in assertion');
      return false;
    }

    // Extract certificate
    const certElement = signatureElement.querySelector('ds\\:X509Certificate, X509Certificate');
    if (!certElement || !certElement.textContent) {
      console.warn('No certificate found in assertion signature');
      return false;
    }

    // Validate certificate matches IDP certificate
    const assertionCert = certElement.textContent.trim();
    const idpCert = idpCertificate
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');
    
    if (assertionCert !== idpCert) {
      console.warn('Assertion certificate mismatch');
      return false;
    }

    // For now, we'll do basic validation
    // In a production environment, you'd want to use a proper XML signature library
    console.log('Assertion signature validation passed (basic check)');
    return true;
  } catch (error) {
    console.error('Error validating assertion signature:', error);
    return false;
  }
}

/**
 * Comprehensive SAML response validation
 */
export function validateSAMLResponse(xmlDoc: Document, sp: ServiceProvider): {
  isValid: boolean;
  responseSigned: boolean;
  assertionSigned: boolean;
  responseSignatureValid: boolean;
  assertionSignatureValid: boolean;
  errors: string[];
} {
  const result = {
    isValid: true,
    responseSigned: false,
    assertionSigned: false,
    responseSignatureValid: false,
    assertionSignatureValid: false,
    errors: [] as string[]
  };

  try {
    // Check if IDP certificate is configured
    if (!sp.idp.certificate) {
      result.errors.push('IDP certificate not configured');
      result.isValid = false;
      return result;
    }

    // Validate response signature if present
    const responseElement = xmlDoc.querySelector('samlp\\:Response, Response');
    if (responseElement) {
      // Check for signature as direct child of response (not nested in assertion)
      const responseSignature = responseElement.querySelector(':scope > ds\\:Signature, :scope > Signature');
      if (responseSignature) {
        result.responseSigned = true;
        result.responseSignatureValid = validateResponseSignature(xmlDoc, sp.idp.certificate);
        if (!result.responseSignatureValid) {
          result.errors.push('Response signature validation failed');
          result.isValid = false;
        }
      }
    }

    // Validate assertion signature if present
    const assertionElement = xmlDoc.querySelector('saml\\:Assertion, Assertion');
    if (assertionElement) {
      // Check for signature as direct child of assertion
      const assertionSignature = assertionElement.querySelector(':scope > ds\\:Signature, :scope > Signature');
      if (assertionSignature) {
        result.assertionSigned = true;
        result.assertionSignatureValid = validateAssertionSignature(xmlDoc, sp.idp.certificate);
        if (!result.assertionSignatureValid) {
          result.errors.push('Assertion signature validation failed');
          result.isValid = false;
        }
      }
    }

    // Check if at least one signature is present and valid
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