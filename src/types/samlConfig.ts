// Identity Provider (IDP) configuration
export interface IdentityProviderConfig {
  entityId: string; // IDP Entity ID
  ssoUrl: string; // Single Sign-On URL
  singleSignOnBinding: 'HTTP-POST' | 'HTTP-Redirect'; // SSO binding
  wantAuthnRequestsSigned: boolean; // IDP expects signed AuthnRequests
  sloUrl?: string; // Single Logout URL (optional)
  sloBinding?: 'HTTP-POST' | 'HTTP-Redirect'; // SLO binding (optional)
  certificate: string; // Verification certificate (PEM)
  metadataUrl?: string; // For importing config (optional)
  rawMetadataXml?: string; // For storing imported XML (optional)
  displayName?: string; // Friendly name for UI (optional)
  logoUrl?: string; // Logo for UI (optional)
}

// Service Provider (SP) entity, which holds both SP and IDP config
export interface ServiceProvider {
  id: string; // auto-generated UUID, unique identifier
  name: string; // user-friendly name for display
  entityId: string; // SP Entity ID
  acsUrl: string; // Assertion Consumer Service URL
  spAcsBinding: 'HTTP-POST' | 'HTTP-Redirect'; // ACS binding
  sloUrl?: string; // Single Logout URL (optional)
  spSloBinding?: 'HTTP-POST' | 'HTTP-Redirect'; // SLO binding (optional)
  privateKey: string; // Signing key (PEM)
  certificate: string; // Signing certificate (PEM)
  encryptionKey?: string; // Encryption key (PEM, optional)
  encryptionCertificate?: string; // Encryption certificate (PEM, optional)
  signAuthnRequest: boolean;
  nameIdFormat: string;
  idp: IdentityProviderConfig; // Nested IDP config
} 