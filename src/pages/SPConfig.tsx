import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import type { ServiceProvider } from '../types/samlConfig';
import { generateSPCertificates } from '../utils/certificateGenerator';

const SPConfig: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const navigate = useNavigate();
  const { spList, updateSP } = useSPStore();
  
  const [formData, setFormData] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [idpMetadataUrl, setIdpMetadataUrl] = useState('');
  const [isImportingMetadata, setIsImportingMetadata] = useState(false);
  const hasLoadedData = useRef(false);

  // Load SP data on mount
  useEffect(() => {
    if (!spId) {
      navigate('/');
      return;
    }

    const sp = spList.find(s => s.id === spId);
    if (!sp) {
      navigate('/');
      return;
    }

    // Only set form data if we haven't loaded it yet
    if (!hasLoadedData.current) {
      // Set the ACS URL to the hardcoded format
      const updatedSp = {
        ...sp,
        acsUrl: `${window.location.origin}/sp/${spId}/acs`
      };
      setFormData(updatedSp);
      hasLoadedData.current = true;
    }
    setIsLoading(false);
  }, [spId, spList, navigate]);

  const handleInputChange = (field: string, value: any) => {
    if (!formData) return;

    setFormData(prev => {
      if (!prev) return prev;

      // Handle nested IDP fields
      if (field.startsWith('idp.')) {
        const idpField = field.replace('idp.', '');
        return {
          ...prev,
          idp: {
            ...prev.idp,
            [idpField]: value
          }
        };
      }

      // Handle boolean fields
      if (typeof value === 'boolean') {
        return { ...prev, [field]: value };
      }

      // Handle string fields
      return { ...prev, [field]: value };
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: Record<string, string> = {};

    // SP validation
    if (!formData.entityId?.trim()) {
      newErrors.entityId = 'Entity ID is required';
    }
    if (!formData.certificate?.trim()) {
      newErrors.certificate = 'Certificate is required';
    }
    if (!formData.privateKey?.trim()) {
      newErrors.privateKey = 'Private key is required';
    }
    if (!formData.nameIdFormat?.trim()) {
      newErrors.nameIdFormat = 'NameID Format is required';
    }

    // IDP validation
    if (!formData.idp.entityId?.trim()) {
      newErrors['idp.entityId'] = 'IDP Entity ID is required';
    }
    if (!formData.idp.ssoUrl?.trim()) {
      newErrors['idp.ssoUrl'] = 'IDP SSO URL is required';
    }
    if (!formData.idp.certificate?.trim()) {
      newErrors['idp.certificate'] = 'IDP Certificate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!formData || !spId) return;

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Ensure ACS URL is set correctly
      const updatedFormData = {
        ...formData,
        acsUrl: `${window.location.origin}/sp/${spId}/acs`
      };
      
      updateSP(spId, updatedFormData);
      // Show success message or redirect
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const importIdpMetadata = async () => {
    if (!idpMetadataUrl.trim() || !formData) return;

    setIsImportingMetadata(true);
    try {
      const response = await fetch(idpMetadataUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const xmlText = await response.text();
      
      // Basic XML parsing to extract key information
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Extract EntityDescriptor attributes
      const entityDescriptor = xmlDoc.querySelector('EntityDescriptor');
      if (entityDescriptor) {
        const entityId = entityDescriptor.getAttribute('entityID');
        if (entityId) {
          handleInputChange('idp.entityId', entityId);
        }
      }

      // Extract SSO URL
      const ssoDescriptor = xmlDoc.querySelector('SingleSignOnService');
      if (ssoDescriptor) {
        const location = ssoDescriptor.getAttribute('Location');
        const binding = ssoDescriptor.getAttribute('Binding');
        if (location) {
          handleInputChange('idp.ssoUrl', location);
        }
        if (binding) {
          const isPost = binding.includes('HTTP-POST');
          handleInputChange('idp.singleSignOnBinding', isPost ? 'POST' : 'GET');
        }
      }

      // Extract certificate
      const certElement = xmlDoc.querySelector('X509Certificate');
      if (certElement && certElement.textContent) {
        const cert = `-----BEGIN CERTIFICATE-----\n${certElement.textContent}\n-----END CERTIFICATE-----`;
        handleInputChange('idp.certificate', cert);
      }

      // Store raw metadata
      handleInputChange('idp.rawMetadataXml', xmlText);
      handleInputChange('idp.metadataUrl', idpMetadataUrl);

      alert('IDP metadata imported successfully!');
    } catch (error) {
      console.error('Error importing metadata:', error);
      alert('Error importing metadata. Please check the URL and try again.');
    } finally {
      setIsImportingMetadata(false);
    }
  };

  const regenerateCertificates = () => {
    if (!formData || !spId) return;
    
    if (confirm('This will generate new certificates and keys. This action cannot be undone. Are you sure you want to continue?')) {
      try {
        const certificates = generateSPCertificates(spId);
        
        handleInputChange('privateKey', certificates.signing.privateKey);
        handleInputChange('certificate', certificates.signing.certificate);
        handleInputChange('encryptionKey', certificates.encryption.privateKey);
        handleInputChange('encryptionCertificate', certificates.encryption.certificate);
        
        alert('Certificates regenerated successfully!');
      } catch (error) {
        console.error('Error regenerating certificates:', error);
        alert('Error regenerating certificates. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="alert alert-error">
        <span>Service Provider not found</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Configure Service Provider</h1>
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

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Service Provider Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity ID */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Entity ID *</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`input input-bordered flex-1 ${errors.entityId ? 'input-error' : ''}`}
                  value={formData.entityId}
                  onChange={(e) => handleInputChange('entityId', e.target.value)}
                  placeholder="https://sp.example.com"
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (formData.entityId) {
                      navigator.clipboard.writeText(formData.entityId);
                      alert('Entity ID copied to clipboard!');
                    }
                  }}
                  disabled={!formData.entityId}
                >
                  Copy
                </button>
              </div>
              {errors.entityId && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.entityId}</span>
                </label>
              )}
            </div>

            {/* NameID Format */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">NameID Format *</span>
              </label>
              <select
                className={`select select-bordered ${errors.nameIdFormat ? 'select-error' : ''}`}
                value={formData.nameIdFormat}
                onChange={(e) => handleInputChange('nameIdFormat', e.target.value)}
              >
                <option value="">Select format</option>
                <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">Unspecified</option>
                <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">Email Address</option>
                <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">Persistent</option>
                <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">Transient</option>
                <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:entity">Entity</option>
              </select>
              {errors.nameIdFormat && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.nameIdFormat}</span>
                </label>
              )}
            </div>

            {/* ACS URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">ACS URL</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="input input-bordered bg-gray-100"
                  value={`${window.location.origin}/acs.html?sp=${spId}`}
                  readOnly
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/acs.html?sp=${spId}`);
                    alert('ACS URL copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
              <label className="label">
                <span className="label-text-alt text-gray-500">This is the ACS URL to use in your IDP configuration</span>
              </label>
            </div>

            {/* ACS Binding */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">ACS Binding</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.spAcsBinding}
                onChange={(e) => handleInputChange('spAcsBinding', e.target.value as 'POST' | 'GET')}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4 mt-4">
            <label className="label cursor-pointer">
              <span className="label-text mr-2">Sign AuthnRequest</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formData.signAuthnRequest}
                onChange={(e) => handleInputChange('signAuthnRequest', e.target.checked)}
              />
            </label>
            <label className="label cursor-pointer">
              <span className="label-text mr-2">Allow Create</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formData.allowCreate}
                onChange={(e) => handleInputChange('allowCreate', e.target.checked)}
              />
            </label>
          </div>

          {/* Certificate Management */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Certificates and Keys</h3>
              <button
                className="btn btn-warning btn-sm"
                onClick={regenerateCertificates}
              >
                Regenerate Certificates
              </button>
            </div>
            <div className="alert alert-info">
              <div>
                <h4 className="font-bold">Certificate Information</h4>
                <div className="text-xs">
                  <p>• Signing certificates are used to sign SAML requests and verify responses</p>
                  <p>• Encryption certificates are used to encrypt SAML assertions</p>
                  <p>• Certificates are auto-generated when creating a new SP</p>
                  <p>• Use "Regenerate Certificates" to create new certificates if needed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Certificates and Keys */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Signing Certificate (PEM) *</span>
              </label>
              <textarea
                className={`textarea textarea-bordered h-32 ${errors.certificate ? 'textarea-error' : ''}`}
                value={formData.certificate}
                onChange={(e) => handleInputChange('certificate', e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----..."
              />
              {errors.certificate && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.certificate}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Signing Private Key (PEM) *</span>
              </label>
              <textarea
                className={`textarea textarea-bordered h-32 ${errors.privateKey ? 'textarea-error' : ''}`}
                value={formData.privateKey}
                onChange={(e) => handleInputChange('privateKey', e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----..."
              />
              {errors.privateKey && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.privateKey}</span>
                </label>
              )}
            </div>
          </div>

          {/* Optional Encryption */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Encryption Certificate (PEM)</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32"
                value={formData.encryptionCertificate || ''}
                onChange={(e) => handleInputChange('encryptionCertificate', e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----..."
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Encryption Key (PEM)</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32"
                value={formData.encryptionKey || ''}
                onChange={(e) => handleInputChange('encryptionKey', e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* IDP Configuration */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Identity Provider Configuration</h2>
          
          {/* Metadata Import */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Import IDP Metadata</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="input input-bordered flex-1"
                value={idpMetadataUrl}
                onChange={(e) => setIdpMetadataUrl(e.target.value)}
                placeholder="https://idp.example.com/metadata"
              />
              <button
                className={`btn btn-primary ${isImportingMetadata ? 'loading' : ''}`}
                onClick={importIdpMetadata}
                disabled={!idpMetadataUrl.trim() || isImportingMetadata}
              >
                Import
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* IDP Entity ID */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">IDP Entity ID *</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors['idp.entityId'] ? 'input-error' : ''}`}
                value={formData.idp.entityId}
                onChange={(e) => handleInputChange('idp.entityId', e.target.value)}
                placeholder="https://idp.example.com"
              />
              {errors['idp.entityId'] && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors['idp.entityId']}</span>
                </label>
              )}
            </div>

            {/* SSO URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">SSO URL *</span>
              </label>
              <input
                type="url"
                className={`input input-bordered ${errors['idp.ssoUrl'] ? 'input-error' : ''}`}
                value={formData.idp.ssoUrl}
                onChange={(e) => handleInputChange('idp.ssoUrl', e.target.value)}
                placeholder="https://idp.example.com/sso"
              />
              {errors['idp.ssoUrl'] && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors['idp.ssoUrl']}</span>
                </label>
              )}
            </div>

            {/* SSO Binding */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">SSO Binding</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.idp.singleSignOnBinding}
                onChange={(e) => handleInputChange('idp.singleSignOnBinding', e.target.value as 'POST' | 'GET')}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>

            {/* Want AuthnRequests Signed */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Want AuthnRequests Signed</span>
              </label>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formData.idp.wantAuthnRequestsSigned}
                onChange={(e) => handleInputChange('idp.wantAuthnRequestsSigned', e.target.checked)}
              />
            </div>
          </div>

          {/* IDP Certificate */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">IDP Certificate (PEM) *</span>
            </label>
            <textarea
              className={`textarea textarea-bordered h-32 ${errors['idp.certificate'] ? 'textarea-error' : ''}`}
              value={formData.idp.certificate}
              onChange={(e) => handleInputChange('idp.certificate', e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----..."
            />
            {errors['idp.certificate'] && (
              <label className="label">
                <span className="label-text-alt text-error">{errors['idp.certificate']}</span>
              </label>
            )}
          </div>

          {/* Optional SLO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">SLO URL</span>
              </label>
              <input
                type="url"
                className="input input-bordered"
                value={formData.idp.sloUrl || ''}
                onChange={(e) => handleInputChange('idp.sloUrl', e.target.value)}
                placeholder="https://idp.example.com/slo"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">SLO Binding</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.idp.sloBinding || 'POST'}
                onChange={(e) => handleInputChange('idp.sloBinding', e.target.value as 'POST' | 'GET')}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => navigate('/')}
          className="btn btn-outline"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
          disabled={isSaving}
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default SPConfig; 