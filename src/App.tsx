import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Layout from './components/Layout';
import Home from './components/Home';
import Settings from './components/Settings';
import PCIRequirements from './components/PCIRequirements';
import Controls from './components/Controls';
import Assets from './components/Assets';
import Diagnostics from './components/Diagnostics';
import Admin from './components/Admin';
import ContinuousAudit from './components/ContinuousAudit';
import CurrentAudit from './components/CurrentAudit';
import PastAudits from './components/PastAudits';
import ContinuousMonitoringHome from './components/ContinuousMonitoringHome';
import ContinuousMonitoringSetRules from './components/ContinuousMonitoringSetRules';
import ContinuousMonitoringReports from './components/ContinuousMonitoringReports';
import ContinuousMonitoringRuleEditor from './components/ContinuousMonitoringRuleEditor';
import ContinuousMonitoringTestRule from './components/ContinuousMonitoringTestRule';

function App() {
  return (
    <Authenticator hideSignUp>
      {() => (
        <Router>
          <Layout>
            <Routes>
              <Route path="/home" element={<Home />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pci-requirements" element={<PCIRequirements />} />
              <Route path="/controls" element={<Controls />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/diagnostics" element={<Diagnostics />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/continuous-monitoring" element={<ContinuousAudit />} />
              <Route path="/continuous-monitoring/home" element={<ContinuousMonitoringHome />} />
              <Route path="/continuous-monitoring/set-rules" element={<ContinuousMonitoringSetRules />} />
              <Route path="/continuous-monitoring/reports" element={<ContinuousMonitoringReports />} />
              <Route path="/continuous-monitoring/new-modify-rule" element={<ContinuousMonitoringRuleEditor />} />
              <Route path="/continuous-monitoring/test-rule" element={<ContinuousMonitoringTestRule />} />
              <Route path="/current-audit" element={<CurrentAudit />} />
              <Route path="/past-audits" element={<PastAudits />} />
              <Route path="/" element={<Home />} />
            </Routes>
          </Layout>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
