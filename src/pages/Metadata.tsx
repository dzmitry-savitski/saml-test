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
        <div className="loading loading-spinner loading-lg"></div>
        {isDownloadMode && <span className="ml-2">Preparing metadata download...</span>}
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="alert alert-error">
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
            className="btn btn-outline btn-sm"
          >
            Back to SP
          </button>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-outline btn-sm"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* SP Info */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Service Provider: {sp.id}</h2>
          <div className="text-sm text-gray-600">
            <p><strong>Entity ID:</strong> {sp.entityId || 'Not configured'}</p>
            <p>
              <strong>ACS URL:</strong> {`${window.location.origin}/acs.html?sp=${spId}`}
              <button
                className="btn btn-ghost btn-xs ml-2"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/acs.html?sp=${spId}`);
                  alert('ACS URL copied to clipboard!');
                }}
              >
                Copy
              </button>
            </p>
            <p><strong>ACS Binding:</strong> {sp.spAcsBinding || 'POST'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Actions</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={!metadataXml}
            >
              Download Metadata
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={copyToClipboard}
              disabled={!metadataXml}
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>

      {/* Metadata XML Display */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Generated Metadata XML</h2>
          
          {!sp.entityId || !sp.acsUrl ? (
            <div className="alert alert-warning">
              <span>Please configure the Entity ID and ACS URL before generating metadata.</span>
            </div>
          ) : (
            <div className="form-control">
              <textarea
                className="textarea textarea-bordered font-mono text-xs h-96"
                value={metadataXml}
                readOnly
                placeholder="Metadata XML will be generated here..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Metadata URL */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Metadata URL</h2>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Share this URL with your Identity Provider:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1 font-mono text-sm"
                value={`${window.location.origin}/sp/${spId}/metadata?download=true`}
                readOnly
              />
              <button
                className="btn btn-outline btn-sm"
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