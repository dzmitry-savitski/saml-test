import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import { initiateSamlAuth, createAuthnRequest, signAuthnRequest, encodeSamlRequest, base64EncodeSamlRequest } from '../utils/samlUtils';
import type { ServiceProvider } from '../types/samlConfig';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../components/ui/PageHeader';
import { BackButtons } from '../components/ui/BackButtons';
import { SectionCard } from '../components/ui/SectionCard';

const Initiate: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const navigate = useNavigate();
  const { spList, deleteSP } = useSPStore();
  const [sp, setSp] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forceAuthn, setForceAuthn] = useState(false);
  const [allowCreate, setAllowCreate] = useState(true);
  const [relayState, setRelayState] = useState(() => {
    const random = Math.random().toString(36).substring(2, 10);
    return `relaystate-random-${random}`;
  });
  const [isInitiating, setIsInitiating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [samlRequestPreview, setSamlRequestPreview] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    deleteSP(spId);
    navigate('/');
  };

  const handlePreviewRequest = async () => {
    if (!sp) return;
    try {
      let samlRequest = createAuthnRequest(sp, forceAuthn, allowCreate);
      if (sp.signAuthnRequest && sp.privateKey) {
        samlRequest = await signAuthnRequest(samlRequest, sp.privateKey);
      }
      let encodedRequest: string;
      if (sp.idp.singleSignOnBinding === 'HTTP-Redirect') {
        encodedRequest = encodeSamlRequest(samlRequest);
      } else {
        encodedRequest = base64EncodeSamlRequest(samlRequest);
      }
      setSamlRequestPreview(encodedRequest);
      setShowPreview(true);
    } catch (error) {
      alert(`Failed to generate SAML request preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleInitiateAuth = () => {
    if (!sp) return;
    setIsInitiating(true);
    try {
      initiateSamlAuth(sp, forceAuthn, allowCreate, relayState);
    } catch (error) {
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
      <Alert variant="destructive" className="max-w-xl mx-auto mt-8">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Service Provider not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Test Authentication">
        <BackButtons spId={spId} showBackToSP={false} />
      </PageHeader>

      {/* Test Authentication Section */}
      <SectionCard>
        <div className="space-y-4">
          {/* SP ID (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service Provider ID</label>
            <div className="relative">
              <Input
                value={sp.id}
                readOnly
                className="pr-10 text-xs font-mono bg-gray-100"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(sp.id);
                  toast.success('SP ID copied!');
                }}
                tabIndex={-1}
                aria-label="Copy SP ID"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Info fields as non-editable inputs with copy icon */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entity ID</label>
              <div className="relative">
                <Input
                  value={sp.entityId || 'Not configured'}
                  readOnly
                  className="pr-10 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(sp.entityId || '');
                    toast.success('Entity ID copied!');
                  }}
                  tabIndex={-1}
                  aria-label="Copy Entity ID"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ACS URL</label>
              <div className="relative">
                <Input
                  value={sp.acsUrl || 'Not configured'}
                  readOnly
                  className="pr-10 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(sp.acsUrl || '');
                    toast.success('ACS URL copied!');
                  }}
                  tabIndex={-1}
                  aria-label="Copy ACS URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">IDP</label>
              <div className="relative">
                <Input
                  value={sp.idp.entityId || 'Not configured'}
                  readOnly
                  className="pr-10 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(sp.idp.entityId || '');
                    toast.success('IDP copied!');
                  }}
                  tabIndex={-1}
                  aria-label="Copy IDP"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SSO URL</label>
              <div className="relative">
                <Input
                  value={sp.idp.ssoUrl || 'Not configured'}
                  readOnly
                  className="pr-10 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(sp.idp.ssoUrl || '');
                    toast.success('SSO URL copied!');
                  }}
                  tabIndex={-1}
                  aria-label="Copy SSO URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center cursor-pointer">
              <span className="mr-2 text-sm font-medium text-gray-700">Force Re-authentication</span>
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                checked={forceAuthn}
                onChange={(e) => setForceAuthn(e.target.checked)}
              />
            </label>
            <label className="flex items-center cursor-pointer">
              <span className="mr-2 text-sm font-medium text-gray-700">Allow Create</span>
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                checked={allowCreate}
                onChange={(e) => setAllowCreate(e.target.checked)}
              />
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">RelayState</label>
            <Input
              value={relayState}
              onChange={(e) => setRelayState(e.target.value)}
              placeholder="Enter RelayState parameter"
              className="text-sm"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePreviewRequest}
              disabled={!sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl}
            >
              Preview Request
            </Button>
            <Button
              variant="default"
              className={`flex-1 ${isInitiating ? 'animate-pulse' : ''}`}
              onClick={handleInitiateAuth}
              disabled={isInitiating || !sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl}
            >
              {isInitiating ? 'Initiating...' : 'Start Authentication'}
            </Button>
          </div>

          {(!sp.entityId || !sp.idp.entityId || !sp.idp.ssoUrl) && (
            <Alert variant="default" className="mt-4 bg-yellow-50 border-yellow-200 text-yellow-800">
              <AlertDescription>
                Please configure the Service Provider and Identity Provider settings before initiating authentication.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SectionCard>

      {/* Configuration Section */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Configuration</h2>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate(`/sp/${spId}/config`)}
            >
              Configure
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/sp/${spId}/metadata`)}
            >
              Metadata
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{sp?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAML Request Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">SAML Request Preview</h3>
            <div className="space-y-4 h-full">
              <div className="space-y-2 flex-1 min-h-0">
                <label className="block text-sm font-medium text-gray-700">
                  Encoded SAML Request (Base64 + Deflate)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs resize-none overflow-y-auto"
                  rows={12}
                  value={samlRequestPreview}
                  readOnly
                  style={{ maxHeight: '400px' }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(samlRequestPreview);
                    toast.success('SAML Request copied to clipboard!');
                  }}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setShowPreview(false);
                    handleInitiateAuth();
                  }}
                >
                  Send Request
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Initiate; 