import * as asn1js from "asn1js";
import {
  Certificate,
  AttributeTypeAndValue,
  RelativeDistinguishedNames,
  Time,
  Extension,
  BasicConstraints,
} from "pkijs";

// Helper: ArrayBuffer to PEM
function toPEM(buffer: ArrayBuffer, label: string): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END ${label}-----`;
}

export async function generateKeyPairAndCertificate(commonName: string): Promise<{
  privateKeyPem: string;
  certificatePem: string;
}> {
  // 1. Generate key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );

  // 2. Create certificate
  const cert = new Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: Math.floor(Math.random() * 1000000) });
  cert.issuer = new RelativeDistinguishedNames({
    typesAndValues: [
      new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: commonName }) })
    ]
  });
  cert.subject = cert.issuer;
  const now = new Date();
  cert.notBefore = new Time({ type: 0, value: now });
  cert.notAfter = new Time({ type: 0, value: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) });
  await cert.subjectPublicKeyInfo.importKey(keyPair.publicKey);

  // 3. Extensions (optional, but recommended)
  // KeyUsage: digitalSignature(0), keyEncipherment(2), keyCertSign(5)
  // BitString: 1001001 (from right: bit 0 = digitalSignature, 2 = keyEncipherment, 5 = keyCertSign)
  const keyUsageBits = new Uint8Array([0b00100011]); // digitalSignature + keyEncipherment + keyCertSign
  cert.extensions = [
    new Extension({
      extnID: "2.5.29.19",
      critical: true,
      extnValue: new BasicConstraints({ cA: true, pathLenConstraint: 0 }).toSchema().toBER(false)
    }),
    new Extension({
      extnID: "2.5.29.15",
      critical: true,
      extnValue: new asn1js.BitString({ valueHex: keyUsageBits.buffer }).toBER(false)
    })
  ];

  // 4. Sign certificate
  await cert.sign(keyPair.privateKey, "SHA-256");

  // 5. Export as PEM
  const certBuffer = cert.toSchema().toBER(false);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    privateKeyPem: toPEM(privateKeyBuffer, "PRIVATE KEY"),
    certificatePem: toPEM(certBuffer, "CERTIFICATE")
  };
}

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
export async function generateSigningCertificate(commonName: string = 'SAML Service Provider'): Promise<CertificatePair> {
  const { privateKeyPem, certificatePem } = await generateKeyPairAndCertificate(commonName);
  
  return {
    privateKey: privateKeyPem,
    certificate: certificatePem
  };
}

/**
 * Generates a new RSA key pair and X.509 certificate for SAML encryption
 */
export async function generateEncryptionCertificate(commonName: string = 'SAML Service Provider Encryption'): Promise<EncryptionCertificatePair> {
  const { privateKeyPem, certificatePem } = await generateKeyPairAndCertificate(commonName);
  
  return {
    privateKey: privateKeyPem,
    certificate: certificatePem
  };
}

/**
 * Generates both signing and encryption certificates for a new SP
 */
export async function generateSPCertificates(spId: string): Promise<{
  signing: CertificatePair;
  encryption: EncryptionCertificatePair;
}> {
  const signing = await generateSigningCertificate(`SAML SP ${spId} - Signing`);
  const encryption = await generateEncryptionCertificate(`SAML SP ${spId} - Encryption`);
  
  return {
    signing,
    encryption
  };
}

 