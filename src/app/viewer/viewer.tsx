'use client';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import './viewer.css';
import {
  Button,
  Checkbox,
  ConfigProvider,
  Layout,
  Popover,
  Select,
  Slider,
  Spin,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { Editor } from '@monaco-editor/react';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import _ from 'lodash';
import { findNodeNameSpace, getNodeByNameSpace, searchNodeWithMatchedPosition } from './helpers';
import { fieldNames, sampleCode } from './constants';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faMoon, faRotate, faSun, faWarning } from '@fortawesome/free-solid-svg-icons';
import { SelectedNodeNamespace } from './selected-node-namespace';
import Link from 'antd/es/typography/Link';
import Image from 'next/image';

const { Header, Footer, Content } = Layout;

const contentStyle: React.CSSProperties = {
  // textAlign: 'center',
  // minHeight: 120,
  // lineHeight: '120px',
  color: '#fff',
  // backgroundColor: '#0958d9',
};

// const siderStyle: React.CSSProperties = {
//   textAlign: 'center',
//   lineHeight: '120px',
//   color: '#fff',
//   backgroundColor: '#1677ff',
// };

const layoutStyle = {
  borderRadius: 8,
  overflow: 'hidden',
  width: '100%',
};

async function getData(code: string) {
  const res = await fetch(`parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': process.env.DATA_API_KEY!,
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}

const JsonViewer = dynamic(() => import('./json-viewer'), {
  ssr: false,
});

const TreeViewer = dynamic(() => import('./tree-viewer'), {
  ssr: false,
});

const { useToken } = theme;

type BaseViewerProps = {
  isDarkMode: boolean;
  setIsDarkMode: Dispatch<SetStateAction<boolean>>;
};

function BaseViewer({ isDarkMode, setIsDarkMode }: BaseViewerProps) {
  const [jsonData, setJsonData] = useState<{ data: INode[] }>({ data: [] });
  const [textAreaData, setTextareaData] = useState('');
  const [alwaysCollapseFieldNames, setAlwaysCollapseFieldNames] = useState<string[]>(['attributes']);
  const [enableClipboard, setEnableClipboard] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [currentNamespace, setCurrentNamespace] = useState<string[]>([]);
  const [isDisplayRawJson, setIsDisplayRawJson] = useState(true);
  const [selectedNode, setSelectedNode] = useState<INode | undefined>(undefined);
  const [expandDepth, setExpandDepth] = useState(3);

  const jsonDataRef = useRef(jsonData);
  const editorRef = useRef<any>();
  const deltaDecorationsRef = useRef<any>();

  const { token } = useToken();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    textAlign: 'center',
    color: '#fff',
    height: 60,
    lineHeight: '64px',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: token.colorBgLayout,
  };

  const footerStyle: React.CSSProperties = {
    height: '36px',
    padding: '12px 50px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  useEffect(() => {
    jsonDataRef.current = jsonData;
  }, [jsonData]);

  useEffect(() => {
    async function parse() {
      try {
        setIsParsing(true);
        const data = await getData(textAreaData);
        setJsonData({
          data: JSON.parse(data.result),
        });
        setIsParsing(false);

        clearRangeAndSelectedNode();
      } catch (error) {
        console.error(error);
      }
    }
    parse();
  }, [textAreaData]);

  useEffect(() => {
    const editorModel = editorRef.current?.getModel();

    if (editorModel && selectedNode) {
      const startPosition = editorModel.getPositionAt(selectedNode.attributes.startFilePos);
      const endPosition = editorModel.getPositionAt(selectedNode.attributes.endFilePos);

      const range = {
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column + 1,
      };

      updateRangeAndNamespace(range, selectedNode);
    }
  }, [selectedNode]);

  const clearRangeAndSelectedNode = () => {
    setCurrentNamespace([]);
    setSelectedNode(undefined);
    deltaDecorationsRef.current?.clear();
  };

  const updateRangeAndNamespace = (
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    },
    node: INode
  ) => {
    deltaDecorationsRef.current?.clear();
    deltaDecorationsRef.current = editorRef.current.createDecorationsCollection([
      {
        range,
        options: { className: 'editor-range-highlight' },
      },
    ]);

    editorRef.current.revealRangeInCenterIfOutsideViewport(range);

    const namespace = findNodeNameSpace(node, jsonDataRef.current);
    if (namespace) {
      setCurrentNamespace(namespace);
    }
  };

  return (
    <div className='flex flex-col items-start h-[100vh]' style={{ backgroundColor: token.colorBgContainer }}>
      <Layout style={layoutStyle}>
        <Header style={headerStyle}>
          <div className='flex'>
            {/* <Image src='./rc-logo.svg' alt='' className='absolute z-10 opacity-10' priority width={1500} height={700} /> */}
            <Typography.Title className='m-4 text-nowrap' level={3}>
              🔎 PHP AST Viewer
            </Typography.Title>
            <div className='flex'>
              <Button
                className='m-4 mr-2'
                onClick={() => {
                  setTextareaData(sampleCode);
                }}
                type='primary'
              >
                Load sample code
              </Button>
              <Button
                className='m-4 ml-2'
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setTextareaData(text);
                  } catch (error) {
                    console.error(error);
                  }
                }}
                type='primary'
              >
                Paste from clipboard
              </Button>
            </div>
          </div>

          <Button
            shape='circle'
            icon={isDarkMode ? <FontAwesomeIcon icon={faSun} /> : <FontAwesomeIcon icon={faMoon} />}
            onClick={() => setIsDarkMode(!isDarkMode)}
          />
        </Header>
        <Content style={contentStyle}>
          <div className='flex flex-col w-[100%] h-[100%]'>
            <div className='flex w-[100%] h-[100%]'>
              <div className='w-[calc(50%)] mr-2 h-[100%] overflow-y-auto relative'>
                <Editor
                  className='codeEditor'
                  theme={isDarkMode ? 'vs-dark' : 'light'}
                  value={textAreaData}
                  defaultLanguage='php'
                  onChange={(value) => setTextareaData(value ?? '')}
                  onMount={(editor) => {
                    editorRef.current = editor;

                    editor.updateOptions({
                      minimap: { enabled: false },
                      quickSuggestions: false,
                      occurrencesHighlight: 'off',
                      selectionHighlight: false,
                      codeLens: false,
                      suggestOnTriggerCharacters: false,
                      cursorStyle: 'block',
                    });

                    editor.onDidChangeCursorPosition((e) => {
                      const editorModel = editor.getModel();
                      if (editorModel == null) {
                        return;
                      }

                      const position = {
                        position: editorModel.getOffsetAt(e.position),
                        lineNumber: e.position.lineNumber,
                        column: e.position.column,
                      };

                      const node = searchNodeWithMatchedPosition(jsonDataRef.current.data, position);

                      setSelectedNode(node);
                    });
                  }}
                />
              </div>

              <div className='w-[calc(50%)] h-[100%] relative'>
                {isParsing && <Spin className='absolute left-1/2 top-1/2' />}

                <div className='fixed flex flex-col z-10 top-[110px] right-[10px]'>
                  <Button
                    className='m-2'
                    icon={<FontAwesomeIcon icon={faRotate} />}
                    onClick={() => {
                      setIsDisplayRawJson(!isDisplayRawJson);
                    }}
                  >
                    {isDisplayRawJson ? 'View AST tree' : 'View raw JSON'}
                  </Button>

                  {isDisplayRawJson && (
                    <Popover
                      title='JSON settings'
                      trigger='click'
                      placement='leftTop'
                      arrow={false}
                      content={
                        <div>
                          <div className='flex flex-col mb-4'>
                            <div>
                              Collapse after depth: {expandDepth}{' '}
                              <Tooltip title={'Greater depth might cause some lag due to the large amount of data.'}>
                                <FontAwesomeIcon icon={faWarning} />
                              </Tooltip>
                            </div>

                            <Slider min={0} max={10} value={expandDepth} onChange={(value) => setExpandDepth(value)} />
                          </div>

                          <div className='flex flex-col mb-6'>
                            <div>Collapse field</div>
                            <Select
                              allowClear
                              mode='multiple'
                              value={alwaysCollapseFieldNames}
                              onChange={(value: string[]) => setAlwaysCollapseFieldNames(value)}
                              placeholder='Please select'
                              options={fieldNames.map((name) => ({
                                value: name,
                              }))}
                            />
                          </div>

                          <div className='mb-4'>
                            <Checkbox checked={enableClipboard} onChange={(e) => setEnableClipboard(e.target.checked)}>
                              Enable clipboard for JSON
                            </Checkbox>
                          </div>
                        </div>
                      }
                    >
                      <Button className='ml-2 mr-2' icon={<FontAwesomeIcon icon={faGear} />}>
                        JSON settings
                      </Button>
                    </Popover>
                  )}
                </div>

                <div className='w-[100%] h-[40px] mb-[8px]' style={{ backgroundColor: token.colorBgBase }}>
                  <SelectedNodeNamespace
                    jsonData={jsonDataRef.current}
                    namespace={currentNamespace}
                    onSelectNamespace={setSelectedNode}
                  />
                </div>

                <div
                  className='h-[calc(100%-48px)] overflow-y-auto'
                  style={{ backgroundColor: token.colorBgContainer }}
                >
                  {!isDisplayRawJson &&
                    jsonData?.data?.map((node) => (
                      <TreeViewer
                        key={node.attributes.startLine}
                        sourceFile={node}
                        selectedNode={selectedNode}
                        onSelectNode={setSelectedNode}
                      />
                    ))}

                  {isDisplayRawJson && (
                    <JsonViewer
                      isDarkMode={isDarkMode}
                      jsonData={jsonData}
                      selectedNode={selectedNode}
                      alwaysCollapseFieldNames={alwaysCollapseFieldNames}
                      enableClipboard={enableClipboard}
                      currentNamespace={currentNamespace}
                      expandDepth={expandDepth}
                      onSelect={(props) => {
                        const node = getNodeByNameSpace(jsonDataRef.current, props.namespace as (string | number)[]);

                        setSelectedNode(node);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </Content>
        <Footer style={footerStyle}>
          <Link href='https://github.com/RightCapitalHQ'>GitHub</Link>
        </Footer>
      </Layout>
    </div>
  );
}

export default function Viewer() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#5070e6',
          colorLink: '#5070e6',
        },
      }}
    >
      <BaseViewer isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </ConfigProvider>
  );
}
