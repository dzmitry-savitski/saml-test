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
      // Set the ACS URL to the new format and fix binding to POST
      const updatedSp = {
        ...sp,
        acsUrl: `${window.location.origin}/acs?sp=${spId}`,
        spAcsBinding: 'POST' as const
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
      // Ensure ACS URL is set correctly and binding is POST
      const updatedFormData = {
        ...formData,
        acsUrl: `${window.location.origin}/acs?sp=${spId}`,
        spAcsBinding: 'POST' as const
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Service Provider Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity ID */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Entity ID *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.entityId ? 'border-red-500' : 'border-gray-300'}`}
                  value={formData.entityId}
                  onChange={(e) => handleInputChange('entityId', e.target.value)}
                  placeholder="https://sp.example.com"
                />
                <button
                  type="button"
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                <p className="text-sm text-red-600">{errors.entityId}</p>
              )}
            </div>

            {/* NameID Format */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                NameID Format *
              </label>
              <select
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nameIdFormat ? 'border-red-500' : 'border-gray-300'}`}
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
                <p className="text-sm text-red-600">{errors.nameIdFormat}</p>
              )}
            </div>

            {/* ACS URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                ACS URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                  value={`${window.location.origin}/acs?sp=${spId}`}
                  readOnly
                />
                <button
                  type="button"
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/acs?sp=${spId}`);
                    alert('ACS URL copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-500">This is the ACS URL to use in your IDP configuration</p>
            </div>

            {/* ACS Binding - POST only */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                ACS Binding
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                value="POST"
                readOnly
              />
              <p className="text-sm text-gray-500">Only POST binding is supported</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4 mt-4">
            <label className="flex items-center cursor-pointer">
              <span className="mr-2 text-sm font-medium text-gray-700">Sign AuthnRequest</span>
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                checked={formData.signAuthnRequest}
                onChange={(e) => handleInputChange('signAuthnRequest', e.target.checked)}
              />
            </label>
            <label className="flex items-center cursor-pointer">
              <span className="mr-2 text-sm font-medium text-gray-700">Allow Create</span>
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
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
                className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                onClick={regenerateCertificates}
              >
                Regenerate Certificates
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <h4 className="font-bold text-blue-900">Certificate Information</h4>
                <div className="text-xs text-blue-800 mt-2">
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Signing Certificate (PEM) *
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none ${errors.certificate ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.certificate}
                onChange={(e) => handleInputChange('certificate', e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----..."
              />
              {errors.certificate && (
                <p className="text-sm text-red-600">{errors.certificate}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Signing Private Key (PEM) *
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none ${errors.privateKey ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.privateKey}
                onChange={(e) => handleInputChange('privateKey', e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----..."
              />
              {errors.privateKey && (
                <p className="text-sm text-red-600">{errors.privateKey}</p>
              )}
            </div>
          </div>

          {/* Optional Encryption */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Encryption Certificate (PEM)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                value={formData.encryptionCertificate || ''}
                onChange={(e) => handleInputChange('encryptionCertificate', e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Encryption Key (PEM)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                value={formData.encryptionKey || ''}
                onChange={(e) => handleInputChange('encryptionKey', e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* IDP Configuration */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Identity Provider Configuration</h2>
          
          {/* Metadata Import */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Import IDP Metadata
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={idpMetadataUrl}
                onChange={(e) => setIdpMetadataUrl(e.target.value)}
                placeholder="https://idp.example.com/metadata"
              />
              <button
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ${isImportingMetadata ? 'animate-pulse' : ''}`}
                onClick={importIdpMetadata}
                disabled={!idpMetadataUrl.trim() || isImportingMetadata}
              >
                {isImportingMetadata ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* IDP Entity ID */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                IDP Entity ID *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors['idp.entityId'] ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.idp.entityId}
                onChange={(e) => handleInputChange('idp.entityId', e.target.value)}
                placeholder="https://idp.example.com"
              />
              {errors['idp.entityId'] && (
                <p className="text-sm text-red-600">{errors['idp.entityId']}</p>
              )}
            </div>

            {/* SSO URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                SSO URL *
              </label>
              <input
                type="url"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors['idp.ssoUrl'] ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.idp.ssoUrl}
                onChange={(e) => handleInputChange('idp.ssoUrl', e.target.value)}
                placeholder="https://idp.example.com/sso"
              />
              {errors['idp.ssoUrl'] && (
                <p className="text-sm text-red-600">{errors['idp.ssoUrl']}</p>
              )}
            </div>

            {/* SSO Binding */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                SSO Binding
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.idp.singleSignOnBinding}
                onChange={(e) => handleInputChange('idp.singleSignOnBinding', e.target.value as 'POST' | 'GET')}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>

            {/* Want AuthnRequests Signed */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Want AuthnRequests Signed
              </label>
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                checked={formData.idp.wantAuthnRequestsSigned}
                onChange={(e) => handleInputChange('idp.wantAuthnRequestsSigned', e.target.checked)}
              />
            </div>
          </div>

          {/* IDP Certificate */}
          <div className="space-y-2 mt-4">
            <label className="block text-sm font-medium text-gray-700">
              IDP Certificate (PEM) *
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none ${errors['idp.certificate'] ? 'border-red-500' : 'border-gray-300'}`}
              value={formData.idp.certificate}
              onChange={(e) => handleInputChange('idp.certificate', e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----..."
            />
            {errors['idp.certificate'] && (
              <p className="text-sm text-red-600">{errors['idp.certificate']}</p>
            )}
          </div>

          {/* Optional SLO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                SLO URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.idp.sloUrl || ''}
                onChange={(e) => handleInputChange('idp.sloUrl', e.target.value)}
                placeholder="https://idp.example.com/slo"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                SLO Binding
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ${isSaving ? 'animate-pulse' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default SPConfig; 