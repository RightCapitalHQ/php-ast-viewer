'use client';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
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
import _, { debounce, throttle } from 'lodash';
import { findNodeNameSpace, getNodeByNameSpace, searchNodeWithMatchedPosition } from './helpers';
import { fieldNames, sampleCode } from './constants';
import dynamic from 'next/dynamic';
import { SelectedNodeNamespace } from './selected-node-namespace';
import Link from 'antd/es/typography/Link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faMoon, faRotate, faSun, faWarning } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import './viewer.css';

const { Header, Content } = Layout;

const contentStyle: React.CSSProperties = {
  color: '#fff',
};

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
  const [editorContainerSize, setEditorContainerSize] = useState((window.innerWidth - 12) / 2);

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

  useEffect(() => {
    jsonDataRef.current = jsonData;
  }, [jsonData]);

  const throttledGetData = useMemo(
    () =>
      throttle(async (data) => {
        try {
          const result = await getData(data);
          return result;
        } catch (error) {
          throw error;
        }
      }, 3000),
    []
  );

  const debouncedGetData = useMemo(
    () =>
      debounce(async (data) => {
        try {
          setIsParsing(true);
          const result = await getData(data);
          setJsonData({
            data: JSON.parse(result.result),
          });
          setIsParsing(false);
        } catch (error) {
          console.error(error);
        }
      }, 1000),
    []
  );

  useEffect(() => {
    async function parse() {
      try {
        setIsParsing(true);
        const data = await throttledGetData(textAreaData);
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
  }, [textAreaData, throttledGetData]);

  useEffect(() => {
    debouncedGetData(textAreaData);
  }, [textAreaData, debouncedGetData]);

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

  const dividerMouseDownHandler = () => {
    const boundaryWidth = 300;
    const minSize = boundaryWidth;
    const maxSize = window.innerWidth - boundaryWidth;
    const onMouseMove = (mouseMoveEvent: { pageX: number }) => {
      setEditorContainerSize(Math.min(maxSize, Math.max(minSize, mouseMoveEvent.pageX)));
    };
    const onMouseUp = () => {
      document.body.removeEventListener('mousemove', onMouseMove);
      document.body.removeEventListener('mouseup', onMouseUp);
    };

    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseup', onMouseUp);
  };

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

          <div className='flex gap-4'>
            <Button
              type='text'
              shape='circle'
              icon={
                isDarkMode ? <FontAwesomeIcon icon={faSun} size='xl' /> : <FontAwesomeIcon icon={faMoon} size='xl' />
              }
              onClick={() => setIsDarkMode(!isDarkMode)}
            />

            <Link href='https://github.com/RightCapitalHQ/php-ast-viewer'>
              <Button type='text' shape='circle' icon={<FontAwesomeIcon icon={faGithub} size='xl' />} />
            </Link>
          </div>
        </Header>
        <Content style={contentStyle}>
          <div className='flex flex-col w-[100%] h-[100%]'>
            <div className='flex w-[100%] h-[100%]'>
              <div className='h-[100%] overflow-y-auto relative' style={{ width: editorContainerSize - 6 }}>
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

              <div className='w-[12px] h-[100%] flex align-middle'>
                <div className='editor-viewer-divider' onMouseDown={dividerMouseDownHandler} />
              </div>

              <div className='h-[100%] relative' style={{ width: window.innerWidth - editorContainerSize - 12 }}>
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

                <div className='w-[100%] h-[40px] mb-[8px]' style={{ backgroundColor: token.colorBgContainer }}>
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
