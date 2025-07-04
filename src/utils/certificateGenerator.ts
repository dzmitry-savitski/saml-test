import forge from 'node-forge';

export interface CertificatePair {
  privateKey: string;
  certificate: string;
}

export interface EncryptionCertificatePair {
  privateKey: string;
  certificate: string;
}

/**
 * Generates a new RSA key pair and X.509 certificate for SAML signing
 */
export function generateSigningCertificate(commonName: string = 'SAML Service Provider'): CertificatePair {
  // Generate RSA key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  
  // Set public key
  cert.publicKey = keys.publicKey;
  
  // Set certificate details
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1); // Valid for 1 year
  
  // Set subject and issuer (self-signed)
  const attrs = [{
    name: 'commonName',
    value: commonName
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'State'
  }, {
    name: 'localityName',
    value: 'City'
  }, {
    name: 'organizationName',
    value: 'Organization'
  }, {
    shortName: 'OU',
    value: 'Organizational Unit'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Set extensions
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }]
  }]);
  
  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  // Convert to PEM format
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certificatePem = forge.pki.certificateToPem(cert);
  
  return {
    privateKey: privateKeyPem,
    certificate: certificatePem
  };
}

/**
 * Generates a new RSA key pair and X.509 certificate for SAML encryption
 */
export function generateEncryptionCertificate(commonName: string = 'SAML Service Provider Encryption'): EncryptionCertificatePair {
  // Generate RSA key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  
  // Set public key
  cert.publicKey = keys.publicKey;
  
  // Set certificate details
  cert.serialNumber = '02';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1); // Valid for 1 year
  
  // Set subject and issuer (self-signed)
  const attrs = [{
    name: 'commonName',
    value: commonName
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'State'
  }, {
    name: 'localityName',
    value: 'City'
  }, {
    name: 'organizationName',
    value: 'Organization'
  }, {
    shortName: 'OU',
    value: 'Organizational Unit'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Set extensions for encryption
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }]
  }]);
  
  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  // Convert to PEM format
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certificatePem = forge.pki.certificateToPem(cert);
  
  return {
    privateKey: privateKeyPem,
    certificate: certificatePem
  };
}

/**
 * Generates both signing and encryption certificates for a new SP
 */
export function generateSPCertificates(spId: string): {
  signing: CertificatePair;
  encryption: EncryptionCertificatePair;
} {
  const signing = generateSigningCertificate(`SAML SP ${spId} - Signing`);
  const encryption = generateEncryptionCertificate(`SAML SP ${spId} - Encryption`);
  
  return {
    signing,
    encryption
  };
} 