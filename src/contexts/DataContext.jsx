import { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [architectureData, setArchitectureData] = useState(null);
  const [processData, setProcessData] = useState(null);
  const [cloudformationData, setCloudformationData] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadFiles = async (archFile, procFile, cfFile = null) => {
    try {
      // Read required files
      const archText = await archFile.text();
      const procText = await procFile.text();

      const arch = JSON.parse(archText);
      const proc = JSON.parse(procText);

      setArchitectureData(arch);
      setProcessData(proc);

      // Read optional CloudFormation file
      if (cfFile) {
        const cfText = await cfFile.text();
        const cf = JSON.parse(cfText);
        setCloudformationData(cf);
        console.log('✅ CloudFormation template loaded');
      } else {
        setCloudformationData(null);
        console.log('⚠️ CloudFormation template not loaded (optional)');
      }

      setIsDataLoaded(true);
      return { success: true };
    } catch (error) {
      console.error('Error loading files:', error);
      return { success: false, error: error.message };
    }
  };

  const resetData = () => {
    setArchitectureData(null);
    setProcessData(null);
    setCloudformationData(null);
    setIsDataLoaded(false);
  };

  // Auto-load files from public folder on mount
  useEffect(() => {
    const autoLoadFiles = async () => {
      try {
        console.log('🔄 Auto-loading data files from public folder...');

        // Fetch files from public folder
        const [archResponse, procResponse, cfResponse] = await Promise.all([
          fetch('/architecture.json'),
          fetch('/process.json'),
          fetch('/cloudformation.json')
        ]);

        if (!archResponse.ok || !procResponse.ok) {
          throw new Error('Failed to load required data files');
        }

        const arch = await archResponse.json();
        const proc = await procResponse.json();

        setArchitectureData(arch);
        setProcessData(proc);
        console.log('✅ Architecture and Process data loaded');

        // Load CloudFormation if available
        if (cfResponse.ok) {
          const cf = await cfResponse.json();
          setCloudformationData(cf);
          console.log('✅ CloudFormation template loaded');
        } else {
          console.log('⚠️ CloudFormation template not found (optional)');
        }

        setIsDataLoaded(true);
        setIsLoading(false);
        console.log('✅ All data loaded successfully');
      } catch (error) {
        console.error('❌ Error auto-loading files:', error);
        setIsLoading(false);
        // Don't set error state - just show the import dialog
      }
    };

    autoLoadFiles();
  }, []);

  const value = {
    architectureData,
    processData,
    cloudformationData,
    isDataLoaded,
    isLoading,
    loadFiles,
    resetData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
