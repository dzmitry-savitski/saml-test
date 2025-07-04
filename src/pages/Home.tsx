import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import type { ServiceProvider } from '../types/samlConfig';

const emptySP = (id: string): ServiceProvider => ({
  id,
  entityId: '',
  acsUrl: '',
  spAcsBinding: 'POST',
  sloUrl: '',
  spSloBinding: 'POST',
  privateKey: '',
  certificate: '',
  encryptionKey: '',
  encryptionCertificate: '',
  signAuthnRequest: false,
  allowCreate: false,
  nameIdFormat: '',
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
});

const idPattern = /^[a-zA-Z0-9-]+$/;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { spList, addSP, deleteSP, setSpList } = useSPStore();
  const [newId, setNewId] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newId.trim()) {
      setError('ID is required.');
      return;
    }
    if (!idPattern.test(newId)) {
      setError('ID can only contain letters, numbers, and hyphens.');
      return;
    }
    if (spList.some(sp => sp.id === newId)) {
      setError('ID already exists. Please choose a unique ID.');
      return;
    }
    addSP(emptySP(newId));
    setNewId('');
    setError('');
  };

  const handleExport = () => {
    const data = JSON.stringify(spList, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saml-service-providers.json';
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
      } catch (err) {
        setError('Failed to import: Invalid or malformed JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = '';
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Service Providers</h1>
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          className="bg-green-500 text-white px-4 py-1 rounded"
          onClick={handleExport}
        >
          Export JSON
        </button>
        <button
          className="bg-yellow-500 text-white px-4 py-1 rounded"
          onClick={handleImportClick}
        >
          Import JSON
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>
      <div className="mb-4 flex gap-2 flex-col sm:flex-row">
        <input
          className="border px-2 py-1 rounded"
          type="text"
          placeholder="SP ID (letters, numbers, hyphens)"
          value={newId}
          onChange={e => setNewId(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-1 rounded"
          onClick={handleAdd}
        >
          Add SP
        </button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="space-y-2">
        {spList.length === 0 && <li className="text-gray-500">No Service Providers yet.</li>}
        {spList.map(sp => (
          <li key={sp.id} className="flex items-center justify-between border p-2 rounded">
            <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded mr-2">{sp.id}</span>
            <div className="flex gap-2">
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => navigate(`/sp/${sp.id}/config`)}
              >
                Configure
              </button>
              <button
                className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => navigate(`/sp/${sp.id}/initiate`)}
              >
                Initiate
              </button>
              <button
                className="bg-purple-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => navigate(`/sp/${sp.id}/acs`)}
              >
                ACS
              </button>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => deleteSP(sp.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home; 