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

4. SP-Initiated Auth Page
Create the Initiate page at /sp/:spId/initiate.
Load SP config and construct a SAMLRequest.
Encode the request to base64.
Redirect to the IDP SSO URL (GET or POST binding).
Save the request ID in session/localStorage for ACS validation.

5. ACS (Assertion Consumer Service) Page
Create the ACS page at /sp/:spId/acs.
Accept and parse SAML responses (from POST or GET).
Verify the response matches the request (if SP-initiated).
Display NameID, attributes, and raw SAML XML.
Handle and display parsing errors gracefully.

6. Helper Utilities and Components
Implement XML parsing (DOMParser or xml2js).
Add cert/key handling and validation.
Build SAML encoding/decoding helpers (base64, deflate, etc.).
Implement session tracking for RequestID.

7. Bonus / Later Features
Pretty-print raw SAML XML.
Export individual SP config.
Load prefilled test data.
Support encryption for assertions.
Add inline validation errors.
Implement theme switching (dark/light).