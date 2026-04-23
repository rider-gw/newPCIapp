import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Layout from './components/Layout';
import Home from './components/Home';
import Settings from './components/Settings';
import PCIRequirements from './components/PCIRequirements';

function App() {
  return (
    <Authenticator>
      {() => (
        <Router>
          <Layout>
            <Routes>
              <Route path="/home" element={<Home />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pci-requirements" element={<PCIRequirements />} />
              <Route path="/" element={<Home />} />
            </Routes>
          </Layout>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
