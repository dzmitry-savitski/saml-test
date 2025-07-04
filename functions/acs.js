// In-memory storage for SAML sessions
const samlSessions = new Map();

export async function onRequestPost(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Check if this is a response retrieval request (no sp parameter means it's a retrieval request)
  const spId = url.searchParams.get('sp');
  
  if (!spId) {
    // This is a retrieval request - get response ID from JSON body
    try {
      const body = await request.json();
      const responseId = body.responseId;
      
      if (!responseId) {
        return new Response('Response ID not provided in request body', { status: 400 });
      }
      
      // Get session data
      const sessionData = samlSessions.get(responseId);
      
      if (!sessionData) {
        return new Response('Session not found or expired', { status: 404 });
      }
      
      // Check if session has expired
      if (sessionData.expiresAt < Date.now()) {
        samlSessions.delete(responseId);
        return new Response('Session expired', { status: 410 });
      }
      
      // Return SAML data as JSON
      const response = new Response(JSON.stringify({
        samlResponse: sessionData.samlResponse,
        relayState: sessionData.relayState,
        spId: sessionData.spId
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      // Delete the session after retrieving it (one-time use)
      samlSessions.delete(responseId);
      
      return response;
      
    } catch (error) {
      console.error('Error retrieving SAML session:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
  
  // This is a SAML response storage request
  try {
    // Parse form data from the POST request
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse');
    const relayState = formData.get('RelayState');
    
    if (!samlResponse) {
      return new Response('SAMLResponse not found in request', { status: 400 });
    }
    
    // Generate UUID for this response
    const responseId = crypto.randomUUID();
    
    // Store SAML data in session (with 5 minute expiry)
    const sessionData = {
      samlResponse,
      relayState: relayState || null,
      spId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    
    samlSessions.set(responseId, sessionData);
    
    // Clean up expired sessions
    cleanupExpiredSessions();
    
    // Redirect to React app with response ID
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': `/sp/${spId}/acs?response=${responseId}`
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('Error processing SAML ACS request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function onRequestGet(context) {
  // Handle GET requests by serving the static site
  return context.next();
}

// Clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [responseId, sessionData] of samlSessions.entries()) {
    if (sessionData.expiresAt < now) {
      samlSessions.delete(responseId);
    }
  }
} 