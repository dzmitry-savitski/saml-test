import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import type { ServiceProvider } from '../types/samlConfig';

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
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-${serviceProvider.spSloBinding || 'POST'}"
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
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-${serviceProvider.spAcsBinding || 'POST'}"
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
      alert('Metadata XML copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SP Metadata</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/sp/${spId}/initiate`)}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Back to SP
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* SP Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Service Provider: {sp.id}</h2>
          <div className="text-sm text-gray-600">
            <p><strong>Entity ID:</strong> {sp.entityId || 'Not configured'}</p>
            <p>
              <strong>ACS URL:</strong> {`${window.location.origin}/acs?sp=${spId}`}
              <button
                className="px-2 py-1 text-xs bg-transparent hover:bg-gray-100 rounded ml-2 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/acs?sp=${spId}`);
                  alert('ACS URL copied to clipboard!');
                }}
              >
                Copy
              </button>
            </p>
            <p><strong>ACS Binding:</strong> POST (fixed)</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Actions</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={handleDownload}
              disabled={!metadataXml}
            >
              Download Metadata
            </button>
            <button
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
              onClick={copyToClipboard}
              disabled={!metadataXml}
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>

      {/* Metadata XML Display */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Generated Metadata XML</h2>
          
          {!sp.entityId || !sp.acsUrl ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <span>Please configure the Entity ID and ACS URL before generating metadata.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs h-96 resize-none focus:outline-none"
                value={metadataXml}
                readOnly
                placeholder="Metadata XML will be generated here..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Metadata URL */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Metadata URL</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Share this URL with your Identity Provider:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none"
                value={`${window.location.origin}/sp/${spId}/metadata?download=true`}
                readOnly
              />
              <button
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/sp/${spId}/metadata?download=true`);
                  alert('Metadata URL copied to clipboard!');
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metadata; 