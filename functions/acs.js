// In-memory storage for SAML sessions
const samlSessions = new Map();

export async function onRequestPost(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Check if this is a response retrieval request (no sp parameter means it's a retrieval request)
  const spId = url.searchParams.get('sp');

  // Only support SAML response storage requests now
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
    const expiry = Date.now() + (1 * 60 * 1000); // 1 minute

    // Generate HTML/JS page to save in sessionStorage and redirect
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SAML Session Storage</title>
  <script>
    (function() {
      var data = {
        samlResponse: ${JSON.stringify(samlResponse)},
        relayState: ${JSON.stringify(relayState || null)},
        spId: ${JSON.stringify(spId)},
        expiresAt: ${expiry}
      };
      var key = 'saml-response-' + ${JSON.stringify(responseId)};
      sessionStorage.setItem(key, JSON.stringify(data));
      window.location.replace('/sp/' + ${JSON.stringify(spId)} + '/acs?response=' + ${JSON.stringify(responseId)});
    })();
  </script>
</head>
<body>
  <noscript>JavaScript is required to complete SAML login.</noscript>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
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