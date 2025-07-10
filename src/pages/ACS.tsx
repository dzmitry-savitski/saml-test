import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSPStore } from '../hooks/useSPStore';
import { getStoredRequestId, clearStoredRequestId, decodeSamlResponse, validateSAMLResponse } from '../utils/samlUtils';
import { formatXml } from '../utils/xmlUtils';
import { CodeBlock } from '../components/ui/CodeBlock';
import type { ServiceProvider } from '../types/samlConfig';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/PageHeader';
import { BackButtons } from '../components/ui/BackButtons';
import { SectionCard } from '../components/ui/SectionCard';
import { Alert, AlertDescription } from '../components/ui/alert';


interface SAMLResponse {
  nameId?: string;
  attributes: Record<string, string[]>;
  rawXml: string;
  requestId?: string;
  relayState?: string;
  status: 'success' | 'error';
  errorMessage?: string;
  validation?: {
    isValid: boolean;
    responseSigned: boolean;
    assertionSigned: boolean;
    responseSignatureValid: boolean;
    assertionSignatureValid: boolean;
    errors: string[];
  };
}

const ACS: React.FC = () => {
  const { spId } = useParams<{ spId: string }>();
  const [searchParams] = useSearchParams();
  const { spList } = useSPStore();
  
  const [sp, setSp] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [samlResponse, setSamlResponse] = useState<SAMLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProcessedResponse, setHasProcessedResponse] = useState(false);
  const [showFormattedXml, setShowFormattedXml] = useState(true);
  const [formattedXml, setFormattedXml] = useState<string>('');
  const [rawXml, setRawXml] = useState<string>('');

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
        // Fetch SAML data from sessionStorage using response ID
        fetchSamlDataFromSessionStorage(responseId, foundSp, spId);
      } else {
        setError('No response ID found in URL parameters');
        setIsLoading(false);
      }
    }
  }, [spId, spList, hasProcessedResponse]);





  const fetchSamlDataFromSessionStorage = (responseId: string, sp: ServiceProvider, urlSpId: string) => {
    try {
      const key = `saml-response-${responseId}`;
      const stored = sessionStorage.getItem(key);
      if (!stored) {
        setError('SAML response not found in session storage or already used.');
        setIsLoading(false);
        return;
      }
      const data = JSON.parse(stored);
      // Remove from sessionStorage after reading (one-time use)
      sessionStorage.removeItem(key);
      // Check expiry
      if (!data.expiresAt || Date.now() > data.expiresAt) {
        setError('SAML response has expired.');
        setIsLoading(false);
        return;
      }
      // Verify SP ID matches
      if (data.spId !== urlSpId) {
        console.warn('SP ID mismatch:', { sessionSpId: data.spId, urlSpId });
      }
      // Process the SAML response data
      processSAMLResponseData(data.samlResponse, sp, data.relayState || undefined);
    } catch (error) {
      console.error('Error fetching SAML data from sessionStorage:', error);
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

      // Validate SAML response signatures
      const validation = validateSAMLResponse(xmlDoc, sp);
      
      // Format the XML for display
      const formatted = formatXml(xmlResponse);
      setFormattedXml(formatted);
      setRawXml(xmlResponse);
      
      setSamlResponse({
        nameId,
        attributes,
        rawXml: xmlResponse,
        requestId: inResponseTo || undefined,
        relayState,
        status: 'success',
        validation
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
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader title="SAML Response Error">
          <BackButtons showBackToSP={false} />
        </PageHeader>
        
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!sp) {
    return (
      <Alert variant="destructive" className="max-w-xl mx-auto mt-8">
        <AlertDescription>Service Provider not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title={`SP: ${sp.name}`}>
        <BackButtons spId={spId} />
      </PageHeader>

      {/* SAML Response Content */}
      {samlResponse && (
        <div className="space-y-6">

          {/* SAML Response Details */}
          <SectionCard>
            <div className="space-y-6">
              {/* NameID */}
              {samlResponse.nameId && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">NameID</h3>
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                    {samlResponse.nameId}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {Object.keys(samlResponse.attributes).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Attributes</h3>
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
              )}

              {/* Request ID */}
              {samlResponse.requestId && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Request ID</h3>
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                    {samlResponse.requestId}
                  </div>
                </div>
              )}

              {/* Relay State */}
              {samlResponse.relayState && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Relay State</h3>
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                    {samlResponse.relayState}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Signature Validation */}
          {samlResponse.validation && (
            <SectionCard>
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Signature Validation</h2>
                
                {/* Show red alert if no signatures present */}
                {!samlResponse.validation.responseSigned && !samlResponse.validation.assertionSigned && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      This SAML response contains no signatures at all and is not secure!
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Show signature details for both response and assertion */}
                <div className="space-y-3 text-sm">
                  {/* Response signature info */}
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium">Response Signed:</span>
                      <span className="ml-2">{samlResponse.validation.responseSigned ? 'Yes' : 'No'}</span>
                    </div>
                    {samlResponse.validation.responseSigned && (
                      <div>
                        <span className="font-medium">Response Signature Valid:</span>
                        <span className={`ml-2 ${samlResponse.validation.responseSignatureValid ? 'text-green-600' : 'text-red-600'}`}>
                          {samlResponse.validation.responseSignatureValid ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Assertion signature info */}
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium">Assertion Signed:</span>
                      <span className="ml-2">{samlResponse.validation.assertionSigned ? 'Yes' : 'No'}</span>
                    </div>
                    {samlResponse.validation.assertionSigned && (
                      <div>
                        <span className="font-medium">Assertion Signature Valid:</span>
                        <span className={`ml-2 ${samlResponse.validation.assertionSignatureValid ? 'text-green-600' : 'text-red-600'}`}>
                          {samlResponse.validation.assertionSignatureValid ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {samlResponse.validation.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-red-600">Errors:</span>
                    <ul className="list-disc list-inside text-red-600 text-sm mt-1">
                      {samlResponse.validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Raw XML */}
          <SectionCard>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">SAML Response XML</h2>
                <div className="flex gap-2">
                  <Button
                    variant={showFormattedXml ? "outline" : "default"}
                    size="sm"
                    onClick={() => setShowFormattedXml(false)}
                  >
                    Raw
                  </Button>
                  <Button
                    variant={showFormattedXml ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFormattedXml(true)}
                  >
                    Formatted
                  </Button>
                </div>
              </div>
              
              <CodeBlock
                code={showFormattedXml ? formattedXml : rawXml}
                language="xml"
                showLineNumbers={true}
                maxHeight="400px"
                copyButtonText={`Copy ${showFormattedXml ? 'Formatted' : 'Raw'} XML`}
              />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default ACS; 