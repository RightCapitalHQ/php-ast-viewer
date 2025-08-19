import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme, Layout, Button, Spin, message, Select } from 'antd';
import { TreeViewer } from './components/tree-viewer';
import { JsonViewer } from './components/json-viewer';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import { searchNodeWithMatchedPosition, findNodeNameSpace } from './utils/helpers';
import './app.css';

const { Content } = Layout;
const { useToken } = theme;

declare global {
  interface Window {
    initialData: {
      code: string;
      ast: any;
      config: {
        defaultView: 'tree' | 'json';
        expandDepth: number;
        enableClipboard: boolean;
        alwaysCollapseFields: string[];
        theme?: 'auto' | 'light' | 'dark';
      };
      vscode: any;
    };
  }
}

interface AppState {
  code: string;
  ast: any;
  viewMode: 'tree' | 'json';
  selectedNode: INode | undefined;
  currentNamespace: string[];
  isParsing: boolean;
  config: {
    expandDepth: number;
    enableClipboard: boolean;
    alwaysCollapseFields: string[];
    theme?: 'auto' | 'light' | 'dark';
  };
}

function App() {
  const vscode = window.initialData?.vscode;
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>(
    window.initialData?.config?.theme || 'auto'
  );
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // If theme is not auto, use the specified theme
    const theme = window.initialData?.config?.theme || 'auto';
    if (theme !== 'auto') {
      return theme === 'dark';
    }
    // Otherwise detect VSCode theme
    const bodyClasses = document.body.className;
    return bodyClasses.includes('vscode-dark') || bodyClasses.includes('vscode-high-contrast');
  });

  const [state, setState] = useState<AppState>({
    code: window.initialData?.code || '',
    ast: window.initialData?.ast || null,
    viewMode: window.initialData?.config?.defaultView || 'json',
    selectedNode: undefined,
    currentNamespace: [],
    isParsing: false,
    config: {
      expandDepth: window.initialData?.config?.expandDepth || 3,
      enableClipboard: window.initialData?.config?.enableClipboard || false,
      alwaysCollapseFields: window.initialData?.config?.alwaysCollapseFields || ['attributes'],
      theme: window.initialData?.config?.theme || 'auto'
    }
  });

  const { token } = useToken();
  const astRef = useRef(state.ast);

  // Keep AST ref updated for efficient access
  useEffect(() => {
    astRef.current = state.ast;
  }, [state.ast]);

  useEffect(() => {
    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'update':
          setState(prev => ({
            ...prev,
            code: message.payload.code,
            ast: message.payload.ast,
            config: message.payload.config || prev.config
          }));
          break;
          
        case 'toggleView':
          setState(prev => ({
            ...prev,
            viewMode: message.payload
          }));
          break;
          
        case 'configUpdate':
          setState(prev => ({
            ...prev,
            config: message.payload
          }));
          // Update theme if changed
          if (message.payload.theme) {
            setThemeMode(message.payload.theme);
            if (message.payload.theme !== 'auto') {
              setIsDarkMode(message.payload.theme === 'dark');
            } else {
              // Re-detect VSCode theme
              const bodyClasses = document.body.className;
              const isDark = bodyClasses.includes('vscode-dark') || bodyClasses.includes('vscode-high-contrast');
              setIsDarkMode(isDark);
            }
          }
          break;
          
        case 'cursorPositionChanged':
          // Find the AST node at the cursor position
          if (astRef.current && Array.isArray(astRef.current)) {
            const position = message.payload;
            console.log('Cursor position changed:', position);
            const node = searchNodeWithMatchedPosition(astRef.current, position);
            
            if (node) {
              console.log('Found node at position:', node);
              setState(prev => ({ ...prev, selectedNode: node }));
              
              // Update namespace
              const namespace = findNodeNameSpace(node, { data: astRef.current }, ['data']);
              if (namespace) {
                setState(prev => ({ ...prev, currentNamespace: namespace }));
              }
            } else {
              console.log('No node found at position');
              // Clear selection if no node found at position
              setState(prev => ({ 
                ...prev, 
                selectedNode: undefined,
                currentNamespace: []
              }));
            }
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Observe VSCode theme changes only when in auto mode
    const observer = new MutationObserver(() => {
      if (themeMode === 'auto') {
        const bodyClasses = document.body.className;
        const isDark = bodyClasses.includes('vscode-dark') || bodyClasses.includes('vscode-high-contrast');
        setIsDarkMode(isDark);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [themeMode]);

  const handleNodeSelect = (node: INode) => {
    setState(prev => ({ ...prev, selectedNode: node }));
    
    // Send message to extension to highlight in editor
    vscode?.postMessage({
      type: 'nodeSelected',
      payload: node
    });
  };

  const handleNamespaceChange = (namespace: string[]) => {
    setState(prev => ({ ...prev, currentNamespace: namespace }));
  };

  const handleToggleView = () => {
    const newMode = state.viewMode === 'tree' ? 'json' : 'tree';
    console.log('Toggling view mode to:', newMode);
    setState(prev => ({ ...prev, viewMode: newMode }));
    
    vscode?.postMessage({
      type: 'toggleView',
      payload: newMode
    });
  };

  const handleCopyToClipboard = (text: string) => {
    vscode?.postMessage({
      type: 'copyToClipboard',
      payload: text
    });
  };

  const handleThemeChange = (value: 'auto' | 'light' | 'dark') => {
    setThemeMode(value);
    setState(prev => ({
      ...prev,
      config: { ...prev.config, theme: value }
    }));
    
    // Update isDarkMode based on theme selection
    if (value !== 'auto') {
      setIsDarkMode(value === 'dark');
    } else {
      // Re-detect VSCode theme
      const bodyClasses = document.body.className;
      const isDark = bodyClasses.includes('vscode-dark') || bodyClasses.includes('vscode-high-contrast');
      setIsDarkMode(isDark);
    }
    
    // Save theme preference
    vscode?.postMessage({
      type: 'updateTheme',
      payload: value
    });
  };
  
  // Debug logging for view mode and selected node
  useEffect(() => {
    console.log('Rendering view mode:', state.viewMode, 'with selectedNode:', state.selectedNode);
  }, [state.viewMode, state.selectedNode]);

  if (!state.ast) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p>No AST data available</p>
          <p className="text-sm opacity-60 mt-2">
            Open a PHP file and run "View PHP AST" command
          </p>
        </div>
      </div>
    );
  }

  if (state.ast.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500">Parse Error</p>
          <p className="text-sm opacity-60 mt-2">
            {state.ast.message || 'Failed to parse PHP code'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#007ACC',
        }
      }}
    >
      <Layout className="h-screen">
        <div className="flex items-center justify-between p-2 border-b" style={{ borderColor: token.colorBorder }}>
          <div className="flex items-center gap-2">
            <Button size="small" onClick={handleToggleView}>
              {state.viewMode === 'json' ? 'Tree View' : 'JSON View'}
            </Button>
            <Select
              size="small"
              value={themeMode}
              onChange={handleThemeChange}
              style={{ width: 120 }}
              options={[
                { value: 'auto', label: 'Auto (System)' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ]}
            />
          </div>
          {state.currentNamespace.length > 0 && (
            <div className="text-sm opacity-60">
              {state.currentNamespace.join(' > ')}
            </div>
          )}
        </div>
        
        <Content className="overflow-auto p-4" style={{ backgroundColor: token.colorBgContainer }}>
          <Spin spinning={state.isParsing}>
            {state.viewMode === 'json' ? (
              <JsonViewer
                data={state.ast}
                selectedNode={state.selectedNode}
                expandDepth={state.config.expandDepth}
                alwaysCollapseFieldNames={state.config.alwaysCollapseFields}
                enableClipboard={state.config.enableClipboard}
                isDarkMode={isDarkMode}
                onSelect={handleNodeSelect}
                onNamespaceChange={handleNamespaceChange}
                onCopyToClipboard={handleCopyToClipboard}
              />
            ) : (
              <TreeViewer
                data={state.ast}
                selectedNode={state.selectedNode}
                isDarkMode={isDarkMode}
                onSelectNode={handleNodeSelect}
                onNamespaceChange={handleNamespaceChange}
              />
            )}
          </Spin>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

// Mount React app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}