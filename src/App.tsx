import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SPConfig from './pages/SPConfig';
import Initiate from './pages/Initiate';
import ACS from './pages/ACS';
import Metadata from './pages/Metadata';
import About from './pages/About';
import Menu from './components/ui/Menu';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Menu />
        <Toaster />
        <main className="flex-1 container mx-auto px-4 py-8 w-full max-w-3xl">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/sp/:spId/config" element={<SPConfig />} />
            <Route path="/sp/:spId/initiate" element={<Initiate />} />
            <Route path="/sp/:spId/acs" element={<ACS />} />
            <Route path="/sp/:spId/metadata" element={<Metadata />} />
          </Routes>
        </main>
        <footer className="bg-gray-100 text-gray-500 py-4 text-center text-sm border-t">
          <small>&copy; {new Date().getFullYear()} SAML Test App</small>
        </footer>
      </div>
    </Router>
  );
}

export default App;
