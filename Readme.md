# SAML Test

## Project Purpose

SAML Test is a quick and easy tool designed to test SAML authentication flows. It acts as a SAML Service Provider (SP) that you can configure to test your Identity Provider (IdP) integration. This tool is particularly useful for authentication engineers and developers who need to verify SAML configurations, test authentication flows, or debug SAML-related issues during development.

The application provides a custom SAML SP implementation with configurable endpoints, certificate management, and detailed response analysis to help you understand what's happening in your SAML authentication process.

> **Important:** This is not a complete SAML implementation compliant with all SAML 2.0 RFC specifications. It's a simplified testing tool that covers the most common SAML authentication scenarios for development and debugging purposes.

## Configuration Storage

- **All configuration data**, including Service Provider settings, certificates, and SAML configurations, are stored locally in your browser's localStorage. This means:
  - Your data stays on your device and is not sent to any server
  - Clearing your browser data will remove all configurations
  - Configurations are not shared between different browsers or devices
  - No account or registration is required to use this tool

> **Technical Note:** SAML cannot be completely implemented as a React SPA due to browser limitations - React applications cannot directly accept POST requests from external services. The only backend component is a Cloudflare function that acts as a helper to provide the React app access to SAML response content.

## Source Code

This project is open source and available on GitHub. You can view the source code, contribute to the project, or report issues.

[View on GitHub](https://github.com/dzmitry-savitski/saml-test)

## Issue/Suggestion

Found a bug or have a feature request? I'd love to hear from you! Please report issues through our GitHub repository.

When reporting a bug, please include:
- A clear description of the issue
- Steps to reproduce the problem
- Your browser and operating system
- Any error messages you see in the browser console
- Screenshots if applicable

[Report Issue](https://github.com/dzmitry-savitski/saml-test/issues)

## Run Locally

Want to run this project locally for development or testing? Here's how to get started:

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation Steps
```sh
git clone https://github.com/dzmitry-savitski/saml-test.git
cd saml-test
npm install
npm run dev
```
The application will be available at [http://localhost:8788](http://localhost:8788)

## Run with Docker

Prefer to run this application in a container? You can use the prebuilt Docker image for a quick start:

### Quick Start
```sh
docker run -p 80:80 dsavitski/saml-test
```
This will start the app on port 80. Open [http://localhost](http://localhost) in your browser.

> **Recommended:** Using the Docker image is the fastest way to try SAML Test without installing Node.js or dependencies.
