Here's a structured development plan for your React + TypeScript SAML testing app. We'll break it down by components and features, prioritized by logical dependency and development efficiency.

---

## App Architecture Overview

* **Frontend Only**: React + TypeScript SPA.
* **Frontend Technologies**: use tailwind CSS + DaisyUi
* **Storage**: Browser `localStorage`. Should be don through Jotai where is possible.
* **Routing**: `react-router-dom` for SPA-style navigation.
* **Crypto**: Use Web Crypto API for key usage (if needed).
* **SAML**: Use lightweight browser-side SAML parsing libraries (e.g., `saml`, `xml-crypto`, or custom XML parser).
* **SP Routing**: Each SP gets its own route prefix `/sp/:id`.

---

## DEVELOPMENT PLAN

---

### 1. **Core App Framework**

#### Features

* App shell
* React Router setup
* Layout (Header, Footer, Main panel)
* LocalStorage abstraction layer
* Global state - use Jotai

#### Plan

* Set up Vite + React + TS
* Create router and basic pages: `Home`, `SPConfig`, `Initiate`, `ACS`
* Build a wrapper for localStorage-based persistent state

---

### 2. **SP Management (Home Page)**

#### Features

* List SPs
* Create new SP
* Delete SP
* Import/Export all SPs

#### Plan

* Design schema for SP config (including both SP and IDP settings)
* Create `useSPStore` hook to manage SPs in localStorage
* Build UI with:

  * SP list view
  * Add/Delete buttons
  * Import (file upload) / Export (download JSON)
* Assign each SP a unique slug/id for routing

---

### 3. **SP Configuration Page**

#### Route

`/sp/:spId/config`

#### Features

* Edit SP fields:

  * Entity ID, nameid format, keys, certs, etc.
* Load IDP metadata from URL or fill in manually
* Toggle: sign-authn-request, allow-create, POST/GET binding
* Live validation of fields

#### Plan

* Use form library (React Hook Form or custom)
* Support both manual IDP config and metadata import (parse XML)
* Store result to localStorage on save
* Load SP config by ID

---

### 4. **SP-Initiated Auth Page**

#### Route

`/sp/:spId/initiate`

#### Features

* Button to start auth
* Checkbox to enforce re-auth (`ForceAuthn`)
* Redirect to IDP with SAMLRequest

#### Plan

* Load SP config
* Construct SAMLRequest
* Encode to base64
* Redirect to IDP SSO URL (GET or POST binding)
* Save request ID in session/localStorage for ACS validation

---

### 5. **ACS (Assertion Consumer Service) Page**

#### Route

`/sp/:spId/acs`

#### Features

* Parse SAML response (from POST or GET binding)
* Verify response matches request (if SP-initiated)
* Show:

  * NameID
  * Attributes
  * Raw SAML XML
* Gracefully handle and show parsing errors

#### Plan

* Accept form POST (via hidden form)
* Parse base64-encoded XML
* Extract fields
* Cross-reference Request ID if applicable
* Display result

---

### 6. **Helper Utilities and Components**

* XML parser (use DOMParser or `xml2js`)
* Cert/Key handling (string input, validate PEM)
* SAML encoding/decoding (base64, deflate, etc.)
* Session tracking (store `RequestID`)

---

### 7. **Bonus / Later**

* Pretty-print raw SAML XML
* Export individual SP config
* Load prefilled test data
* Support encryption for assertions
* Inline validation errors
* Switch theme (dark/light)

---

## 🗂 Pages Summary

| Route                | Purpose                        |
| -------------------- | ------------------------------ |
| `/`                  | List SPs, import/export config |
| `/sp/:spId/config`   | Configure SP + IDP             |
| `/sp/:spId/initiate` | Trigger SAMLRequest            |
| `/sp/:spId/acs`      | Receive + parse SAMLResponse   |


## Project structure:
* src/components/ — for reusable UI components
* src/pages/ — for route-level components (Home, SPConfig, Initiate, ACS)
* src/hooks/ — for custom React hooks (e.g., useSPStore)
* src/utils/ — for utility functions (SAML, XML, crypto, etc.)
* src/state/ — for Jotai atoms and state management
* src/types/ — for TypeScript types and interfaces