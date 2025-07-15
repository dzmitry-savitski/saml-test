import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { Button } from '../components/ui/button';
import { BackButtons } from '../components/ui/BackButtons';
import { ExternalLink, Github, Bug, Play, Container } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="About SAML Test">
        <BackButtons showBackToSP={false} />
      </PageHeader>

      {/* Project Description */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Project Purpose</h2>
          <p className="text-gray-700 leading-relaxed">
            SAML Test is a quick and easy tool designed to test SAML authentication flows. 
            It acts as a SAML Service Provider (SP) that you can configure to test your 
            Identity Provider (IdP) integration. This tool is particularly useful for 
            authentication engineers and developers who need to verify SAML configurations, 
            test authentication flows, or debug SAML-related issues during development.
          </p>
          <p className="text-gray-700 leading-relaxed">
            The application provides a custom SAML SP implementation with configurable 
            endpoints, certificate management, and detailed response analysis to help you 
            understand what's happening in your SAML authentication process.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Important:</strong> This is not a complete SAML implementation compliant 
              with all SAML 2.0 RFC specifications. It's a simplified testing tool that covers 
              the most common SAML authentication scenarios for development and debugging purposes.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Configuration Storage */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Configuration Storage</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Important:</strong> All configuration data, including Service Provider 
              settings, certificates, and SAML configurations, are stored locally in your 
              browser's localStorage. This means:
            </p>
            <ul className="list-disc list-inside mt-2 text-blue-800 space-y-1">
              <li>Your data stays on your device and is not sent to any server</li>
              <li>Clearing your browser data will remove all configurations</li>
              <li>Configurations are not shared between different browsers or devices</li>
              <li>No account or registration is required to use this tool</li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 text-sm">
              <strong>Technical Note:</strong> SAML cannot be completely implemented as a React SPA 
              due to browser limitations - React applications cannot directly accept POST requests 
              from external services. The only backend component is a Cloudflare function that acts 
              as a helper to provide the React app access to SAML response content.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* GitHub Repository */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Github className="h-5 w-5" />
            Source Code
          </h2>
          <p className="text-gray-700">
            This project is open source and available on GitHub. You can view the source code, 
            contribute to the project, or report issues.
          </p>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open('https://github.com/dzmitry-savitski/saml-test', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </Button>
        </div>
      </SectionCard>

      {/* Bug Reporting */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Issue/Suggestion
          </h2>
          <p className="text-gray-700">
            Found a bug or have a feature request? I'd love to hear from you! Please 
            report issues through our GitHub repository.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              When reporting a bug, please include:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
              <li>A clear description of the issue</li>
              <li>Steps to reproduce the problem</li>
              <li>Your browser and operating system</li>
              <li>Any error messages you see in the browser console</li>
              <li>Screenshots if applicable</li>
            </ul>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open('https://github.com/dzmitry-savitski/saml-test/issues', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Report Issue
          </Button>
        </div>
      </SectionCard>

      {/* Local Development */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Play className="h-5 w-5" />
            Run Locally
          </h2>
          <p className="text-gray-700">
            Want to run this project locally for development or testing? Here's how to get started:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Prerequisites</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Node.js (version 18 or higher)</li>
              <li>npm or yarn package manager</li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Installation Steps</h3>
            <div className="space-y-2 text-sm">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">git clone https://github.com/dzmitry-savitski/saml-test.git</code>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">cd saml-test</code>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">npm install</code>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">npm run dev</code>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              The application will be available at <code className="bg-gray-100 px-1 rounded">http://localhost:8788</code>
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Docker */}
      <SectionCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Container className="h-5 w-5" />
            Run with Docker
          </h2>
          <p className="text-gray-700">
            Prefer to run this application in a container? You can use the prebuilt Docker image for a quick start:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Quick Start</h3>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-2">docker run -p 80:80 dsavitski/saml-test</code>
            <p className="text-sm text-gray-700 mt-2">This will start the app on port 80. Open <code className='bg-gray-100 px-1 rounded'>http://localhost</code> in your browser.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Recommended:</strong> Using the Docker image is the fastest way to try SAML Test without installing Node.js or dependencies.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default About; 