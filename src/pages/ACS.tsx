import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import { getStoredRequestId, clearStoredRequestId, decodeSamlRequest } from '../utils/samlUtils';
import type { ServiceProvider } from '../types/samlConfig';

interface SAMLResponse {
  nameId?: string;
  attributes: Record<string, string[]>;
  rawXml: string;
  requestId?: string;
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

  // Load SP data and process SAML response on mount
  useEffect(() => {
    if (!spId) {
      setError('No Service Provider ID provided');
      setIsLoading(false);
      return;
    }

    const foundSp = spList.find(s => s.id === spId);
    if (!foundSp) {
      setError('Service Provider not found');
      setIsLoading(false);
      return;
    }

    setSp(foundSp);
    
    // Process SAML response from URL parameters
    processSAMLResponse(foundSp);
  }, [spId, spList]);

  const processSAMLResponse = (sp: ServiceProvider) => {
    try {
      // Get SAML response from URL parameters
      const samlResponseParam = searchParams.get('SAMLResponse');
      const samlRequestParam = searchParams.get('SAMLRequest');
      const relayState = searchParams.get('RelayState');
      
      if (!samlResponseParam && !samlRequestParam) {
        setError('No SAML response or request found in URL parameters');
        setIsLoading(false);
        return;
      }

      if (samlResponseParam) {
        // Process SAML Response (successful authentication)
        processSAMLResponseData(samlResponseParam, sp);
      } else if (samlRequestParam) {
        // Process SAML Request (error response)
        processSAMLRequestData(samlRequestParam, sp);
      }
    } catch (error) {
      console.error('Error processing SAML response:', error);
      setError(`Failed to process SAML response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const processSAMLResponseData = (encodedResponse: string, sp: ServiceProvider) => {
    try {
      // Decode the SAML response
      const xmlResponse = decodeSamlRequest(encodedResponse);
      
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
        status: 'success'
      });
      
    } catch (error) {
      console.error('Error processing SAML response data:', error);
      setError(`Failed to process SAML response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const processSAMLRequestData = (encodedRequest: string, sp: ServiceProvider) => {
    try {
      // Decode the SAML request (error response)
      const xmlRequest = decodeSamlRequest(encodedRequest);
      
      // Parse the XML to extract error information
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlRequest, 'text/xml');
      
      // Extract error status
      const statusCodeElement = xmlDoc.querySelector('samlp\\:StatusCode, StatusCode');
      const statusMessageElement = xmlDoc.querySelector('samlp\\:StatusMessage, StatusMessage');
      
      const errorMessage = statusMessageElement?.textContent || 'Authentication failed';
      
      setSamlResponse({
        nameId: undefined,
        attributes: {},
        rawXml: xmlRequest,
        status: 'error',
        errorMessage
      });
      
    } catch (error) {
      console.error('Error processing SAML request data:', error);
      setError(`Failed to process SAML request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
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
            className="btn btn-outline btn-sm"
          >
            Back to List
          </button>
        </div>
        
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
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
        <h1 className="text-2xl font-bold">SAML Response</h1>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-outline btn-sm"
        >
          Back to List
        </button>
      </div>

      {/* SP Info */}
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
              className="btn btn-accent btn-sm"
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
          <div className={`alert ${samlResponse.status === 'success' ? 'alert-success' : 'alert-error'}`}>
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
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">NameID</h2>
                <div className="bg-base-200 p-4 rounded-lg font-mono text-sm">
                  {samlResponse.nameId}
                </div>
              </div>
            </div>
          )}

          {/* Attributes */}
          {Object.keys(samlResponse.attributes).length > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Attributes</h2>
                <div className="space-y-2">
                  {Object.entries(samlResponse.attributes).map(([name, values]) => (
                    <div key={name} className="border-b border-base-300 pb-2">
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-sm">
                        {values.map((value, index) => (
                          <div key={index} className="bg-base-200 p-2 rounded mt-1 font-mono text-xs">
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
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Request ID</h2>
                <div className="bg-base-200 p-4 rounded-lg font-mono text-sm">
                  {samlResponse.requestId}
                </div>
              </div>
            </div>
          )}

          {/* Raw XML */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Raw SAML XML</h2>
              <div className="form-control">
                <textarea
                  className="textarea textarea-bordered font-mono text-xs"
                  rows={15}
                  value={samlResponse.rawXml}
                  readOnly
                />
              </div>
              <div className="card-actions justify-end mt-4">
                <button
                  className="btn btn-outline btn-sm"
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