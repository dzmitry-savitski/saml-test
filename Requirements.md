I want to create a saml testing app with the features described below. What I want you to do first, is to come up with the plan of how we'll develop the app. Describe each component and create an implementation plan for each distinct feature/page/subsystem. Prioritize based on the order that makes sense.

Here's the features:
1. This will be only an app for testing, not a real app. While real SAML apps usually need a backend for storing private keys, this testing app will store them in the browser only.
2. It will be pure react + ts, no backend components.
3. Developers should be able to create multiple SPs.
4. Configuration for SP should be stored in local storage.
5. There should be a way to save and upload configuration (json).
6. Each SP should have unique path.
7. Each SP should be pre-configured to work with the certain IPD.
8. The purpose of the application - is to test SAML transaction. 
9. Each sp should have 3 pages: one for configuration, another one to initiate sp-initiated saml transaction, and the last one - acs, where IDP will send after authentication.
10. The authentication initiating page should have a button to sign in , and a checkbox if the auth should be enforced.
11. The setting page should just have a fields for all sp/id settings described below. 
12. The acs (authenticated page) - the page where IDP sends the saml response should show:
- if it was sp initiated - verify the request id
- nameid value
- attributes sent in the response
- there should be a field to show raw saml response.
13. A user might have several SPs configured. On the main page, a user should be a list of configured SPs, a way to create a new one and delete the existing ones.
14. Configuration for all SPs should be stored in the browser localstorage and there should be a way to download it in a json format and upload it back to the web app.

15. For the SP configuration, this is what I want to be incorporated:
- entity-id
- nameid-format
- signing key + cert 
- encryption key + cert
- sign-authn-request true/false
- allow-create true/false
- sp-acs-binding POST/GET

# IDP configuration (metadata):
- saml-idp-metadata-url - it should be able to fetch IDP metadata from the url or configure manually (later)

# IDP configuration (manual):
- saml-idp-entityid
- saml-idp-singlesignon-url
- saml-idp-singlesignon-binding
- saml-idp-singlesignon-want-request-signed ture/false
- saml-idp-verification-certificate
