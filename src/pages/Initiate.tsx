import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import type { ServiceProvider } from '../types/samlConfig';

const Initiate: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const navigate = useNavigate();
  const { spList, deleteSP } = useSPStore();
  
  const [sp, setSp] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forceAuthn, setForceAuthn] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);

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

  const handleInitiateAuth = () => {
    if (!sp) return;
    
    setIsInitiating(true);
    
    // TODO: Implement actual SAML request generation and redirect
    // For now, just show a placeholder
    alert('SAML authentication initiation would happen here. This is a placeholder for the actual SAML request generation and redirect to the IDP.');
    
    setIsInitiating(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
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
        <h1 className="text-2xl font-bold">SAML Authentication</h1>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-outline btn-sm"
        >
          Back to List
        </button>
      </div>

      {/* SP Info and Navigation */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Service Provider: {sp.id}</h2>
          
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/sp/${spId}/config`)}
            >
              Configure
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/sp/${spId}/metadata`)}
            >
              Metadata
            </button>
            <button
              className="btn btn-error btn-sm"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Authentication Initiation */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Initiate Authentication</h2>
          
          <div className="space-y-4">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Force Re-authentication</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={forceAuthn}
                  onChange={(e) => setForceAuthn(e.target.checked)}
                />
              </label>
              <label className="label">
                <span className="label-text-alt">When enabled, the user will be forced to re-authenticate even if they have an active session.</span>
              </label>
            </div>

            <div className="alert alert-info">
              <div>
                <h3 className="font-bold">Ready to authenticate</h3>
                <div className="text-xs">
                  <p><strong>Entity ID:</strong> {sp.entityId || 'Not configured'}</p>
                  <p><strong>IDP:</strong> {sp.idp.entityId || 'Not configured'}</p>
                  <p><strong>SSO URL:</strong> {sp.idp.ssoUrl || 'Not configured'}</p>
                </div>
              </div>
            </div>

            <button
              className={`btn btn-primary w-full ${isInitiating ? 'loading' : ''}`}
              onClick={handleInitiateAuth}
              disabled={isInitiating || !sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl}
            >
              {isInitiating ? 'Initiating...' : 'Start Authentication'}
            </button>

            {(!sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl) && (
              <div className="alert alert-warning">
                <span>Please configure the Service Provider and Identity Provider settings before initiating authentication.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Quick Actions</h2>
          
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate(`/sp/${spId}/acs`)}
            >
              View ACS Page
            </button>
            <button
              className="btn btn-outline btn-sm"
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
    </div>
  );
};

export default Initiate; 