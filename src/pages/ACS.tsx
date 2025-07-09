import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import { getStoredRequestId, clearStoredRequestId, decodeSamlResponse } from '../utils/samlUtils';
import type { ServiceProvider } from '../types/samlConfig';

interface SAMLResponse {
  nameId?: string;
  attributes: Record<string, string[]>;
  rawXml: string;
  requestId?: string;
  relayState?: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

const ACS: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { spList } = useSPStore();
  
  const [sp, setSp] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [samlResponse, setSamlResponse] = useState<SAMLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProcessedResponse, setHasProcessedResponse] = useState(false);

    // Load SP data and process SAML response on mount
  useEffect(() => {
    if (!spId) {
      setError('No Service Provider ID provided');
      setIsLoading(false);
      return;
    }

    // Wait for SP list to be loaded from localStorage
    if (spList.length === 0) {
      console.log('SP list is empty, waiting for data to load...');
      return; // Don't set error yet, wait for data to load
    }

    const foundSp = spList.find(s => s.id === spId);
    if (!foundSp) {
      console.error('SP not found:', { spId, availableSPs: spList.map(s => s.id) });
      setError(`Service Provider not found: ${spId}`);
      setIsLoading(false);
      return;
    }

    setSp(foundSp);
    
    // Only process SAML response once after SP is loaded
    if (!hasProcessedResponse) {
      const responseId = searchParams.get('response');
      if (responseId) {
        setHasProcessedResponse(true);
        // Fetch SAML data from API using response ID
        fetchSamlDataFromSession(responseId, foundSp, spId);
      } else {
        setError('No response ID found in URL parameters');
        setIsLoading(false);
      }
    }
  }, [spId, spList, hasProcessedResponse]);



  const fetchSamlDataFromSession = async (responseId: string, sp: ServiceProvider, urlSpId: string) => {
    try {
      const response = await fetch('/acs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseId: responseId })
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('SAML session not found or expired');
        } else if (response.status === 410) {
          setError('SAML session has expired');
        } else {
          setError(`Failed to fetch SAML data: ${response.statusText}`);
        }
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      console.log('SAML data received:', { 
        spId: data.spId, 
        currentSpId: sp.id, 
        urlSpId: urlSpId,
        relayState: data.relayState 
      });
      
      // Verify SP ID matches
      if (data.spId !== urlSpId) {
        console.warn('SP ID mismatch:', { sessionSpId: data.spId, urlSpId });
      }
      
      // Process the SAML response data
      processSAMLResponseData(data.samlResponse, sp, data.relayState || undefined);
      
    } catch (error) {
      console.error('Error fetching SAML data from session:', error);
      setError(`Failed to fetch SAML data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const processSAMLResponseData = (encodedResponse: string, sp: ServiceProvider, relayState?: string) => {
    try {
      // Decode the SAML response
      const xmlResponse = decodeSamlResponse(encodedResponse);
      
      // Parse the XML to extract information
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML in SAML response');
      }
      
      // Extract NameID
      const nameIdElement = xmlDoc.querySelector('saml\\:NameID, NameID');
      const nameId = nameIdElement?.textContent || undefined;
      
      // Extract attributes
      const attributes: Record<string, string[]> = {};
      const attributeElements = xmlDoc.querySelectorAll('saml\\:Attribute, Attribute');
      
      attributeElements.forEach(attr => {
        const name = attr.getAttribute('Name');
        if (name) {
          const values: string[] = [];
          const valueElements = attr.querySelectorAll('saml\\:AttributeValue, AttributeValue');
          valueElements.forEach(val => {
            if (val.textContent) {
              values.push(val.textContent);
            }
          });
          attributes[name] = values;
        }
      });
      
      // Extract request ID for validation
      const inResponseTo = xmlDoc.querySelector('samlp\\:Response, Response')?.getAttribute('InResponseTo');
      
      // Validate request ID if available
      const storedRequestId = getStoredRequestId(sp.id);
      if (storedRequestId && inResponseTo && storedRequestId !== inResponseTo) {
        console.warn('Request ID mismatch - possible replay attack');
      }
      
      // Clear stored request ID after successful processing
      if (storedRequestId) {
        clearStoredRequestId(sp.id);
      }
      
      setSamlResponse({
        nameId,
        attributes,
        rawXml: xmlResponse,
        requestId: inResponseTo || undefined,
        relayState,
        status: 'success'
      });
      
    } catch (error) {
      console.error('Error processing SAML response data:', error);
      setError(`Failed to process SAML response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">SAML Response Error</h1>
          <button 
            onClick={() => navigate('/')}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>
        
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <span>{error}</span>
        </div>
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
        <h1 className="text-2xl font-bold">SAML Response</h1>
        <button 
          onClick={() => navigate('/')}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Back to List
        </button>
      </div>

      {/* SP Info */}
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
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              onClick={() => navigate(`/sp/${spId}/initiate`)}
            >
              Initiate Auth
            </button>
          </div>
        </div>
      </div>

      {/* SAML Response Content */}
      {samlResponse && (
        <div className="space-y-6">
          {/* Status */}
          <div className={`px-4 py-3 rounded ${samlResponse.status === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            <div>
              <h3 className="font-bold">
                {samlResponse.status === 'success' ? 'Authentication Successful' : 'Authentication Failed'}
              </h3>
              {samlResponse.errorMessage && (
                <div className="text-sm">{samlResponse.errorMessage}</div>
              )}
            </div>
          </div>

          {/* NameID */}
          {samlResponse.nameId && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">NameID</h2>
                <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                  {samlResponse.nameId}
                </div>
              </div>
            </div>
          )}

          {/* Attributes */}
          {Object.keys(samlResponse.attributes).length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Attributes</h2>
                <div className="space-y-2">
                  {Object.entries(samlResponse.attributes).map(([name, values]) => (
                    <div key={name} className="border-b border-gray-300 pb-2">
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-sm">
                        {values.map((value, index) => (
                          <div key={index} className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                            {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Request ID */}
          {samlResponse.requestId && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Request ID</h2>
                <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                  {samlResponse.requestId}
                </div>
              </div>
            </div>
          )}

          {/* Relay State */}
          {samlResponse.relayState && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Relay State</h2>
                <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                  {samlResponse.relayState}
                </div>
              </div>
            </div>
          )}

          {/* Raw XML */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Raw SAML XML</h2>
              <div className="space-y-2">
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs resize-none"
                  rows={15}
                  value={samlResponse.rawXml}
                  readOnly
                />
              </div>
              <div className="flex justify-end mt-4">
                <button
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(samlResponse.rawXml);
                    alert('Raw XML copied to clipboard!');
                  }}
                >
                  Copy XML
                </button>
              </div>
            </div>
          </div>


        </div>
      )}
    </div>
  );
};

export default ACS; 