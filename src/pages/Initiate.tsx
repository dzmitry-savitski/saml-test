import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import { initiateSamlAuth, createAuthnRequest, signAuthnRequest, encodeSamlRequest, base64EncodeSamlRequest } from '../utils/samlUtils';
import type { ServiceProvider } from '../types/samlConfig';

const Initiate: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const navigate = useNavigate();
  const { spList, deleteSP } = useSPStore();
  
  const [sp, setSp] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forceAuthn, setForceAuthn] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [samlRequestPreview, setSamlRequestPreview] = useState<string>('');

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

  const handleDelete = () => {
    if (!spId || !sp) return;
    
    if (confirm(`Are you sure you want to delete the Service Provider "${sp.id}"?`)) {
      deleteSP(spId);
      navigate('/');
    }
  };

  const handlePreviewRequest = () => {
    if (!sp) return;
    
    try {
      // Generate the SAML request
      let samlRequest = createAuthnRequest(sp, forceAuthn);
      
      // Sign the request if required
      if (sp.signAuthnRequest && sp.privateKey) {
        samlRequest = signAuthnRequest(samlRequest, sp.privateKey);
      }
      
      // Encode the request based on binding
      let encodedRequest: string;
      if (sp.idp.singleSignOnBinding === 'GET') {
        encodedRequest = encodeSamlRequest(samlRequest);
      } else {
        encodedRequest = base64EncodeSamlRequest(samlRequest);
      }
      
      setSamlRequestPreview(encodedRequest);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to generate SAML request preview:', error);
      alert(`Failed to generate SAML request preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleInitiateAuth = () => {
    if (!sp) return;
    
    setIsInitiating(true);
    
    try {
      // Initiate SAML authentication
      initiateSamlAuth(sp, forceAuthn);
      // Note: initiateSamlAuth will handle the redirect, so we don't need to do anything else here
    } catch (error) {
      console.error('Failed to initiate SAML authentication:', error);
      alert(`Failed to initiate SAML authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsInitiating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <h1 className="text-2xl font-bold">SAML Authentication</h1>
        <button 
          onClick={() => navigate('/')}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Back to List
        </button>
      </div>

      {/* SP Info and Navigation */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Service Provider: {sp.id}</h2>
          
          <div className="flex gap-2 flex-wrap">
            <button
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={() => navigate(`/sp/${spId}/config`)}
            >
              Configure
            </button>
            <button
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              onClick={() => navigate(`/sp/${spId}/metadata`)}
            >
              Metadata
            </button>
            <button
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Authentication Initiation */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Initiate Authentication</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <span className="mr-2 text-sm font-medium text-gray-700">Force Re-authentication</span>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  checked={forceAuthn}
                  onChange={(e) => setForceAuthn(e.target.checked)}
                />
              </label>
              <p className="text-sm text-gray-500">When enabled, the user will be forced to re-authenticate even if they have an active session.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <h3 className="font-bold text-blue-900">Ready to authenticate</h3>
                <div className="text-xs text-blue-800 mt-2">
                  <p>
                    <strong>Entity ID:</strong> {sp.entityId || 'Not configured'}
                    {sp.entityId && (
                      <button
                        className="px-2 py-1 text-xs bg-transparent hover:bg-blue-100 rounded ml-2 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(sp.entityId);
                          alert('Entity ID copied to clipboard!');
                        }}
                      >
                        Copy
                      </button>
                    )}
                  </p>
                  <p><strong>IDP:</strong> {sp.idp.entityId || 'Not configured'}</p>
                  <p><strong>SSO URL:</strong> {sp.idp.ssoUrl || 'Not configured'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={handlePreviewRequest}
                disabled={!sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl}
              >
                Preview Request
              </button>
              <button
                className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ${isInitiating ? 'animate-pulse' : ''}`}
                onClick={handleInitiateAuth}
                disabled={isInitiating || !sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl}
              >
                {isInitiating ? 'Initiating...' : 'Start Authentication'}
              </button>
            </div>

            {(!sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl) && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                <span>Please configure the Service Provider and Identity Provider settings before initiating authentication.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          
          <div className="flex gap-2 flex-wrap">
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onClick={() => navigate(`/sp/${spId}/acs`)}
            >
              View ACS Page
            </button>
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onClick={() => {
                const url = `${window.location.origin}/sp/${spId}/acs`;
                navigator.clipboard.writeText(url);
                alert('ACS URL copied to clipboard!');
              }}
            >
              Copy ACS URL
            </button>
          </div>
        </div>
      </div>

      {/* SAML Request Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <h3 className="font-bold text-lg mb-4">SAML Request Preview</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Encoded SAML Request (Base64 + Deflate)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs resize-none"
                  rows={8}
                  value={samlRequestPreview}
                  readOnly
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(samlRequestPreview);
                    alert('SAML Request copied to clipboard!');
                  }}
                >
                  Copy to Clipboard
                </button>
                <button
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setShowPreview(false);
                    handleInitiateAuth();
                  }}
                >
                  Send Request
                </button>
                <button
                  className="px-3 py-1 text-sm bg-transparent hover:bg-gray-100 rounded transition-colors"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          <div className="absolute inset-0" onClick={() => setShowPreview(false)}></div>
        </div>
      )}
    </div>
  );
};

export default Initiate; 