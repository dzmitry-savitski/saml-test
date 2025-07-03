import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SPConfig from './pages/SPConfig';
import Initiate from './pages/Initiate';
import ACS from './pages/ACS';

function App() {
  return (
    <Router>
      <div className="app-layout">
        <header>
          <h1>SAML Test App</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sp/:spId/config" element={<SPConfig />} />
            <Route path="/sp/:spId/initiate" element={<Initiate />} />
            <Route path="/sp/:spId/acs" element={<ACS />} />
          </Routes>
        </main>
        <footer>
          <small>&copy; {new Date().getFullYear()} SAML Test App</small>
        </footer>
      </div>
    </Router>
  );
}

export default App;
