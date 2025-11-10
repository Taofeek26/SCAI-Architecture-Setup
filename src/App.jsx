import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout';
import FlowBrain from './pages/FlowBrain';
import Diagram from './pages/Diagram';
import './App.css';

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/diagram" replace />} />
            <Route path="/flow-brain" element={<FlowBrain />} />
            <Route path="/diagram" element={<Diagram />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
