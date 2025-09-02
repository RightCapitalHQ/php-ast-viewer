import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Layout, Spin } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group';
import { TreeViewer } from './components/tree-viewer.component';
import { JsonViewer } from './components/json-viewer.component';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import {
  searchNodeWithMatchedPosition,
  findNodeNameSpace,
} from './utils/helpers';
import './app.css';

const { Content } = Layout;

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
        theme?: 'light' | 'dark';
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
    theme?: 'light' | 'dark';
  };
}

function App() {
  const vscode = window.initialData?.vscode;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const theme = window.initialData?.config?.theme || 'dark';
    return theme === 'dark';
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
      alwaysCollapseFields: window.initialData?.config
        ?.alwaysCollapseFields || ['attributes'],
      theme: window.initialData?.config?.theme || 'dark',
    },
  });

  const astRef = useRef(state.ast);

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
          setState((prev) => ({
            ...prev,
            code: message.payload.code,
            ast: message.payload.ast,
            config: message.payload.config || prev.config,
          }));
          break;

        case 'toggleView':
          setState((prev) => ({
            ...prev,
            viewMode: message.payload,
          }));
          break;

        case 'configUpdate':
          setState((prev) => ({
            ...prev,
            config: message.payload,
          }));
          // Update theme if changed
          if (message.payload.theme) {
            setIsDarkMode(message.payload.theme === 'dark');
          }
          break;

        case 'cursorPositionChanged':
          // Find the AST node at the cursor position
          if (astRef.current && Array.isArray(astRef.current)) {
            const position = message.payload;
            console.log('Cursor position changed:', position);
            const node = searchNodeWithMatchedPosition(
              astRef.current,
              position
            );

            if (node) {
              console.log('Found node at position:', node);
              setState((prev) => ({ ...prev, selectedNode: node }));

              // Update namespace
              const namespace = findNodeNameSpace(
                node,
                { data: astRef.current },
                ['data']
              );
              if (namespace) {
                setState((prev) => ({ ...prev, currentNamespace: namespace }));
              }
            } else {
              console.log('No node found at position');
              // Clear selection if no node found at position
              setState((prev) => ({
                ...prev,
                selectedNode: undefined,
                currentNamespace: [],
              }));
            }
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleNodeSelect = (node: INode) => {
    console.log('App: Node selected:', {
      nodeType: (node as any).nodeType || (node as any).kind,
      attributes: node.attributes,
      startLine: node.attributes?.startLine,
      endLine: node.attributes?.endLine,
      startFilePos: node.attributes?.startFilePos,
      endFilePos: node.attributes?.endFilePos
    });
    
    setState((prev) => ({ ...prev, selectedNode: node }));

    // Send message to extension to highlight in editor
    vscode?.postMessage({
      type: 'nodeSelected',
      payload: node,
    });
  };

  const handleNamespaceChange = (namespace: string[]) => {
    console.log('App: Namespace changed:', namespace);
    setState((prev) => ({ ...prev, currentNamespace: namespace }));
  };

  const handleCopyToClipboard = (text: string) => {
    vscode?.postMessage({
      type: 'copyToClipboard',
      payload: text,
    });
  };

  const handleThemeChange = (value: 'light' | 'dark') => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, theme: value },
    }));

    setIsDarkMode(value === 'dark');

    // Save theme preference
    vscode?.postMessage({
      type: 'updateTheme',
      payload: value,
    });
  };

  // Debug logging for view mode and selected node
  useEffect(() => {
    console.log(
      'Rendering view mode:',
      state.viewMode,
      'with selectedNode:',
      state.selectedNode
    );
  }, [state.viewMode, state.selectedNode]);

  if (!state.ast) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-primary transition-theme">
        <div className="text-center">
          <p className="text-foreground-primary text-lg">No AST data available</p>
          <p className="text-foreground-secondary text-sm mt-2">
            {'Open a PHP file and run "View PHP AST" command'}
          </p>
        </div>
      </div>
    );
  }

  if (state.ast.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-primary transition-theme">
        <div className="text-center">
          <p className="error-text text-lg font-semibold">Parse Error</p>
          <p className="text-foreground-secondary text-sm mt-2">
            {state.ast.message || 'Failed to parse PHP code'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout className="h-screen transition-theme">
      <div className="header-container">
        {/* First Row: View Controls and Theme */}
        <div className="header-row first">
          <div className="header-left">
            <Tabs
              value={state.viewMode}
              onValueChange={(value: string) => {
                const newMode = value as 'tree' | 'json';
                setState((prev) => ({ ...prev, viewMode: newMode }));
                vscode?.postMessage({
                  type: 'toggleView',
                  payload: newMode,
                });
              }}
            >
              <TabsList className="custom-tabs-list grid w-[160px] grid-cols-2">
                <TabsTrigger value="json" className="custom-tab-trigger">
                  JSON View
                </TabsTrigger>
                <TabsTrigger value="tree" className="custom-tab-trigger">
                  Tree View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="header-right">
            <ToggleGroup
              type="single"
              value={isDarkMode ? 'dark' : 'light'}
              onValueChange={(value: string) => {
                if (value) {
                  handleThemeChange(value as 'light' | 'dark');
                }
              }}
              className="theme-toggle-group"
            >
              <ToggleGroupItem value="light" className="theme-toggle-item">
                <SunOutlined className="theme-toggle-icon" />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="theme-toggle-item">
                <MoonOutlined className="theme-toggle-icon" />
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Second Row: Breadcrumb */}
        {state.currentNamespace.length > 0 && (
          <div className="header-row">
            <div className="namespace-breadcrumb">
              {state.currentNamespace.join(' > ')}
            </div>
          </div>
        )}
      </div>

        <Content className="overflow-auto p-4 bg-background-primary transition-theme">
          <Spin 
            spinning={state.isParsing}
            className="loading-spinner"
          >
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
  );
}

// Mount React app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
