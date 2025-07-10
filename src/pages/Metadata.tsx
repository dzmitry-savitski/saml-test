import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import type { ServiceProvider } from '../types/samlConfig';
import { Button } from '../components/ui/button';
import { CopyInput } from '../components/ui/CopyInput';
import { toast } from 'sonner';
import { PageHeader } from '../components/ui/PageHeader';
import { BackButtons } from '../components/ui/BackButtons';
import { SectionCard } from '../components/ui/SectionCard';

const Metadata: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { spList } = useSPStore();
  
  const [sp, setSp] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metadataXml, setMetadataXml] = useState<string>('');
  const isDownloadMode = searchParams.get('download') === 'true';

  // Load SP data on mount
  useEffect(() => {
    if (!spId) {
      navigate('/');
      return;
    }

    const foundSp = spList.find(s => s.id === spId);
    if (!foundSp) {
      navigate('/');
      return;
    }

    setSp(foundSp);
    setIsLoading(false);
  }, [spId, spList, navigate]);

  // Generate metadata XML when SP data changes
  useEffect(() => {
    if (!sp) return;

    const xml = generateMetadataXml(sp);
    setMetadataXml(xml);

    // If in download mode, trigger download and redirect
    if (isDownloadMode) {
      downloadMetadata(xml, sp.id);
      setTimeout(() => {
        navigate(`/sp/${spId}/metadata`);
      }, 100);
    }
  }, [sp, isDownloadMode, spId, navigate]);

  const downloadMetadata = (metadataXml: string, spId: string) => {
    const blob = new Blob([metadataXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spId}-metadata.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMetadataXml = (serviceProvider: ServiceProvider): string => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" 
                     entityID="${serviceProvider.entityId || ''}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    ${serviceProvider.sloUrl ? `<md:SingleLogoutService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:${serviceProvider.spSloBinding || 'HTTP-POST'}"
      Location="${serviceProvider.sloUrl}" />` : ''}
    ${serviceProvider.certificate ? `<md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${serviceProvider.certificate.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '')}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>` : ''}
    ${serviceProvider.encryptionCertificate ? `<md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${serviceProvider.encryptionCertificate.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '')}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>` : ''}
    <md:NameIDFormat>${serviceProvider.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'}</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:${serviceProvider.spAcsBinding || 'HTTP-POST'}"
      Location="${serviceProvider.acsUrl || ''}"
      index="0" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    return xml;
  };

  const handleDownload = () => {
    if (!spId) return;
    navigate(`/sp/${spId}/metadata?download=true`);
  };

  const copyToClipboard = () => {
    if (!metadataXml) return;
    
    navigator.clipboard.writeText(metadataXml).then(() => {
      toast.success('Metadata XML copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        {isDownloadMode && <span className="ml-2">Preparing metadata download...</span>}
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <span>Service Provider not found</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="SP Metadata">
        <BackButtons spId={spId} />
      </PageHeader>

      {/* SP Info */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Service Provider: {sp.name}</h2>
          
          {/* Info fields as non-editable inputs with copy icon */}
          <div className="space-y-4">
            <CopyInput
              value={sp.entityId || 'Not configured'}
              label="Entity ID"
              readOnly
            />
            <CopyInput
              value={`${window.location.origin}/acs?sp=${spId}`}
              label="ACS URL"
              readOnly
            />
            <CopyInput
              value="HTTP-POST"
              label="ACS Binding"
              readOnly
              copyValue="HTTP-POST"
            />
          </div>
        </div>
      </SectionCard>

      {/* Metadata XML Display */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Generated Metadata XML</h2>
          
          {!sp.entityId || !sp.acsUrl ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <span>Please configure the Entity ID and ACS URL before generating metadata.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs h-96 resize-none focus:outline-none overflow-y-auto"
                value={metadataXml}
                readOnly
                placeholder="Metadata XML will be generated here..."
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!metadataXml}
                >
                  Download Metadata
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  disabled={!metadataXml}
                >
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default Metadata; 