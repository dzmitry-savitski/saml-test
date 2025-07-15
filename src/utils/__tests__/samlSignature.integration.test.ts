import { describe, it, expect } from 'vitest';
import { signAuthnRequest } from '../samlUtils';
import { generateSigningCertificate } from '../certificateGenerator';
import { createAuthnRequest } from '../samlUtils';


describe('SAML Signature Integration', () => {
  it('should produce the valid signature', async () => {
    // 1. Generate a key pair and certificate
    const { privateKey, certificate } = await generateSigningCertificate('IntegrationTestSP');

    // 2. Create a minimal ServiceProvider config
    const sp = {
      id: 'test-sp',
      name: 'Integration Test SP',
      entityId: 'urn:test:sp',
      acsUrl: 'http://localhost/acs',
      spAcsBinding: 'HTTP-POST' as const,
      signAuthnRequest: true,
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      privateKey,
      certificate,
      idp: {
        entityId: 'urn:test:idp',
        ssoUrl: 'http://localhost/sso',
        singleSignOnBinding: 'HTTP-POST' as const,
        wantAuthnRequestsSigned: true,
        certificate: certificate,
      },
    };
    // 3. Create an unsigned SAML request
    const unsignedRequest = createAuthnRequest(sp);
    console.log('Raw request:', unsignedRequest);
    expect(unsignedRequest).toBeTruthy();

    // 4. Sign using our method
    const signedRequest = await signAuthnRequest(unsignedRequest, privateKey, certificate);
    console.log('Signed Request:', signedRequest);
    expect(signedRequest).toBeTruthy();


    const { SignedXml, Parse } = await import('xmldsigjs');

    const signedDocument = Parse(signedRequest);
    const xmlSignature = signedDocument.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature");
    const signedXml = new SignedXml(signedDocument);
    signedXml.LoadXml(xmlSignature[0]);
    const valid = await signedXml.Verify();
    expect(valid).toBeTruthy();
  });
}); 