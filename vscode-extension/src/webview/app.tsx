import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme, Layout, Button, Spin, message } from 'antd';
import { TreeViewer } from './components/tree-viewer';
import { JsonViewer } from './components/json-viewer';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
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
  };
}

function App() {
  const vscode = window.initialData?.vscode;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Detect VSCode theme
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
      alwaysCollapseFields: window.initialData?.config?.alwaysCollapseFields || ['attributes']
    }
  });

  const { token } = useToken();

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
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Observe VSCode theme changes
    const observer = new MutationObserver(() => {
      const bodyClasses = document.body.className;
      const isDark = bodyClasses.includes('vscode-dark') || bodyClasses.includes('vscode-high-contrast');
      setIsDarkMode(isDark);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

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
                onSelect={handleNodeSelect}
                onNamespaceChange={handleNamespaceChange}
                onCopyToClipboard={handleCopyToClipboard}
              />
            ) : (
              <TreeViewer
                data={state.ast}
                selectedNode={state.selectedNode}
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