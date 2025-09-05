import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Switch } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import './app.css';

declare global {
  interface Window {
    initialData: {
      code: string;
      ast: any;
      config: {
        defaultView: 'tree' | 'json';
        theme?: 'light' | 'dark';
      };
      vscode: any;
    };
  }
}

function App() {
  const vscode = window.initialData?.vscode;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const theme = window.initialData?.config?.theme || 'dark';
    return theme === 'dark';
  });

  const [viewMode, setViewMode] = useState<'tree' | 'json'>(
    window.initialData?.config?.defaultView || 'json'
  );

  // Control document theme class
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.add('light');
      htmlElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleThemeChange = (checked: boolean) => {
    setIsDarkMode(checked);

    // Save theme preference
    vscode?.postMessage({
      type: 'updateTheme',
      payload: checked ? 'dark' : 'light',
    });
  };

  const handleViewModeChange = (value: string) => {
    const newMode = value as 'tree' | 'json';
    setViewMode(newMode);
    vscode?.postMessage({
      type: 'toggleView',
      payload: newMode,
    });
  };

  return (
    <div className="h-screen bg-background-primary transition-theme p-4 pt-8">
      <div className="flex items-center justify-between mb-4 mt-4">
        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <TabsList className="custom-tabs-list grid w-[160px] grid-cols-2">
            <TabsTrigger value="json" className="custom-tab-trigger">
              JSON View
            </TabsTrigger>
            <TabsTrigger value="tree" className="custom-tab-trigger">
              Tree View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Theme Toggle Switch */}
        <div className="flex items-center gap-2">
          <SunOutlined
            className={`text-lg ${!isDarkMode ? 'text-yellow-500' : 'text-gray-400'}`}
          />
          <Switch
            checked={isDarkMode}
            onChange={handleThemeChange}
            className="bg-gray-400"
          />
          <MoonOutlined
            className={`text-lg ${isDarkMode ? 'text-blue-400' : 'text-gray-400'}`}
          />
        </div>
      </div>

      {/* Main content area - empty for now */}
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <p className="text-foreground-secondary">
          {viewMode === 'json' ? 'JSON View Selected' : 'Tree View Selected'}
        </p>
      </div>
    </div>
  );
}

// Mount React app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
