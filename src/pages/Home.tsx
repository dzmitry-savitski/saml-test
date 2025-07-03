import React, { useState } from 'react';
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
  const { spList, addSP, deleteSP } = useSPStore();
  const [newId, setNewId] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Service Providers</h1>
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
            <button
              className="bg-red-500 text-white px-2 py-1 rounded"
              onClick={() => deleteSP(sp.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home; 