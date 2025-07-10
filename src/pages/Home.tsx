import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import type { ServiceProvider } from '../types/samlConfig';
import { generateSPCertificates } from '../utils/certificateGenerator';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Edit, Trash2 } from 'lucide-react';
import { SectionCard } from '../components/ui/SectionCard';

const emptySP = (name: string): ServiceProvider => {
  const id = crypto.randomUUID();
  // Generate certificates for the new SP
  const certificates = generateSPCertificates(id);
  
  return {
    id,
    name,
    entityId: id,
    acsUrl: `${window.location.origin}/acs?sp=${id}`,
    spAcsBinding: 'POST' as const,
    sloUrl: '',
    spSloBinding: 'POST',
    privateKey: certificates.signing.privateKey,
    certificate: certificates.signing.certificate,
    encryptionKey: certificates.encryption.privateKey,
    encryptionCertificate: certificates.encryption.certificate,
    signAuthnRequest: false,
    allowCreate: false,
    nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    idp: {
      entityId: '',
      ssoUrl: '',
      singleSignOnBinding: 'POST',
      wantAuthnRequestsSigned: false,
      sloUrl: '',
      sloBinding: 'POST',
      certificate: '',
      metadataUrl: '',
      rawMetadataXml: '',
      displayName: '',
      logoUrl: '',
    },
  };
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { spList, addSP, setSpList, deleteSP } = useSPStore();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [spToDelete, setSpToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newName.trim() || !/\S/.test(newName)) {
      setError('Name is required and must contain at least one non-whitespace character.');
      return;
    }
    if (spList.some(sp => sp.name === newName)) {
      setError('Name already exists. Please choose a unique name.');
      return;
    }
    addSP(emptySP(newName));
    setNewName('');
    setError('');
  };

  const handleExport = () => {
    const data = JSON.stringify(spList, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saml-test-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Invalid format');
        // Optionally: validate each item is a ServiceProvider
        setSpList(parsed);
        setError('');
      } catch {
        setError('Failed to import: Invalid or malformed JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = '';
  };

  const handleDeleteClick = (spId: string) => {
    setSpToDelete(spId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (spToDelete) {
      deleteSP(spToDelete);
      setDeleteDialogOpen(false);
      setSpToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSpToDelete(null);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col">
        {/* Main Content */}
        <main className="flex-1 p-4">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Service Providers Section */}
            <SectionCard>
              <h1 className="text-2xl font-bold mb-4">Service Providers</h1>
              <div className="mb-6 flex gap-2 flex-col sm:flex-row">
                <input
                  className="border px-2 py-1 rounded flex-1"
                  type="text"
                  placeholder="SP Name (required)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <Button variant="default" onClick={handleAdd}>Add SP</Button>
              </div>
              {error && <div className="text-red-500 mb-2">{error}</div>}
              <ul className="space-y-2">
                {spList.length === 0 && <li className="text-gray-500">No Service Providers yet.</li>}
                {spList.map(sp => (
                  <li key={sp.id} className="flex items-center justify-between border p-2 rounded hover:bg-gray-50">
                    <Button
                      variant="ghost"
                      className="text-sm bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer"
                      onClick={() => navigate(`/sp/${sp.id}/initiate`)}
                    >
                      {sp.name}
                    </Button>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/sp/${sp.id}/config`)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Edit</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(sp.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Configuration Section */}
            <SectionCard>
              <h2 className="text-xl font-bold mb-4">Configuration</h2>
              <div className="flex gap-2 flex-wrap">
                <Button variant="default" onClick={handleExport}>Export Config</Button>
                <Button variant="secondary" onClick={handleImportClick}>Import Config</Button>
                <input
                  type="file"
                  accept="application/json"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImport}
                />
              </div>
            </SectionCard>
          </div>
        </main>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Service Provider</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{spList.find(sp => sp.id === spToDelete)?.name || spToDelete}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default Home; 