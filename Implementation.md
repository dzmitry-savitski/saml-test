1. Core App Framework (If not already done)
Set up the main app shell with React Router. - implemented
Create the basic pages: Home, SPConfig, Initiate, ACS (even as placeholders).  - implemented
Implement a layout with Header, Footer, and Main panel.  - implemented
Set up Jotai for global state management.  - implemented
Build a wrapper for localStorage-based persistent state.  - implemented

2. SP Management (Home Page)
Design the schema for SP config (including both SP and IDP settings). -implemented
Implement the useSPStore hook to manage SPs in localStorage. -implemented
Build the Home page UI:  -implemented
- List SPs. -implemented
- Add/Delete SPs. -implemented
Import (file upload) / Export (download JSON) for all SPs. -implemented

3. SP Configuration Page - COMPLETED
Create the SPConfig page at route /sp/:spId/config. - COMPLETED
Build a form to edit SP fields (Entity ID, nameid format, keys, certs, etc.). - COMPLETED
Add support for loading IDP metadata from a URL or manual entry. - COMPLETED
Implement toggles for sign-authn-request, allow-create, POST/GET binding. - COMPLETED
Add live validation for form fields. - COMPLETED
Save config to localStorage on save. - COMPLETED

4. Create metadata Page - COMPLETED
Create /sp/:spId/metadata page - COMPLETED
This page should generate metadata for the current SP and display it (xml) - COMPLETED
The /sp/:spId/metadata/download binding should initiate metadata download - COMPLETED
The SP page should have both: view metadata and download metadata pages - COMPLETED

5. SP-Initiated Auth Page - COMPLETED
Create the Initiate page at /sp/:spId/initiate. - COMPLETED
Load SP config and construct a SAMLRequest. - COMPLETED
Encode the request to base64. - COMPLETED
Redirect to the IDP SSO URL (GET or POST binding). - COMPLETED
Save the request ID in session storage/cookies (whaever is better, per SP) for ACS validation. - COMPLETED

6. ACS (Assertion Consumer Service) Page - COMPLETED
Create the ACS page at /sp/:spId/acs. - COMPLETED
Accept and parse SAML responses (from POST or GET). - COMPLETED
Verify the response matches the request (if SP-initiated). - COMPLETED
Display NameID, attributes, and raw SAML XML. - COMPLETED
Handle and display parsing errors gracefully. - COMPLETED

7. Helper Utilities and Components - COMPLETED
Implement XML parsing (DOMParser or xml2js). - COMPLETED
Add cert/key handling and validation. - COMPLETED
Build SAML encoding/decoding helpers (base64, deflate, etc.). - COMPLETED
Implement session tracking for RequestID. - COMPLETED

8. Implement changes to ACS page - COMPLETED
Add cloudflare function that will be served at /sp/:id/acs and will accep post requests. - COMPLETED
Function will extract the sp id, SAML response and relay state and put it in the short lived cookie - just for 1 second. - COMPLETED
Function will then redirect to /sp/:id/acs (GET request) which will be handled by react - COMPLETED
React acs page will always check cookie and extract saml response from it - COMPLETED

8. Bonus / Later Features
Pretty-print raw SAML XML.
Export individual SP config.
Load prefilled test data.
Support encryption for assertions.
Add inline validation errors.
Implement theme switching (dark/light).