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
  theme,
  Tooltip,
  Tour,
  TourProps,
  Typography,
} from 'antd';
import { Editor } from '@monaco-editor/react';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import _, { debounce, throttle } from 'lodash';
import { findNodeNameSpace, getNodeByNameSpace, isPhpParserASTNode, searchNodeWithMatchedPosition } from './helpers';
import { fieldNames, sampleCode, themeColor, tourSteps } from './constants';
import dynamic from 'next/dynamic';
import { SelectedNodeNamespace } from './selected-node-namespace';
import Link from 'antd/es/typography/Link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faMoon, faLocationDot, faRotate, faSun, faWarning } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { RCLogo } from './rc-logo';
import Image from 'next/image';
import '@fortawesome/fontawesome-svg-core/styles.css';
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

const basicHeaderStyle: React.CSSProperties = {
  display: 'flex',
  textAlign: 'center',
  color: '#fff',
  height: 60,
  lineHeight: '64px',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 20px 0 10px',
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

const dividerWidth = 12;
const boundaryWidth = 300;

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
  const [editorContainerSize, setEditorContainerSize] = useState<string | number>('50%');
  const [windowInnerWidth, setWindowInnerWidth] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const jsonDataRef = useRef(jsonData);
  const editorRef = useRef<any>();
  const deltaDecorationsRef = useRef<any>();

  const { token } = useToken();

  const headerStyle = { ...basicHeaderStyle, backgroundColor: token.colorBgLayout };

  useEffect(() => {
    setWindowInnerWidth(window.innerWidth);
    setEditorContainerSize((window.innerWidth - dividerWidth) / 2);
  }, []);

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
    const minSize = boundaryWidth;
    const maxSize = windowInnerWidth - boundaryWidth;
    const onMouseMove = (mouseMoveEvent: { pageX: number }) => {
      setEditorContainerSize(Math.min(maxSize, Math.max(minSize, mouseMoveEvent.pageX - dividerWidth / 2)));
    };
    const onMouseUp = () => {
      document.body.removeEventListener('mousemove', onMouseMove);
      document.body.removeEventListener('mouseup', onMouseUp);
    };

    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseup', onMouseUp);
  };

  const editorViewerDivider = (
    <div className='w-[12px] h-[100%] flex align-middle'>
      <div
        className='editor-viewer-divider'
        style={{ borderInlineColor: token.colorText }}
        onMouseDown={dividerMouseDownHandler}
      />
    </div>
  );

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

  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);

  const steps: TourProps['steps'] = [
    {
      ...tourSteps.editor,
      target: () => ref1.current,
    },
    {
      ...tourSteps.viewer,
      target: () => ref2.current,
    },
    {
      ...tourSteps.navigation,
      target: () => ref3.current,
    },
  ];

  const viewerWidth =
    typeof editorContainerSize === 'string'
      ? editorContainerSize
      : windowInnerWidth - editorContainerSize - dividerWidth;

  return (
    <div className='flex flex-col items-start h-[100vh]' style={{ backgroundColor: token.colorBgContainer }}>
      <Tour open={isTourOpen} onClose={() => setIsTourOpen(false)} steps={steps} />
      <Layout style={layoutStyle}>
        <Header style={headerStyle}>
          <div className='flex'>
            <div className='m-auto text-nowrap flex items-center'>
              <Typography.Title level={4} className='m-[0!important] flex items-center'>
                <Image src='./favicon.svg' className='ml-2 mr-3' alt='' width={28} height={28} />
                <span className='m-0 mr-3 leading-[20px] text-lg'>PHP AST Viewer</span>
              </Typography.Title>
            </div>
            <div className='flex items-center'>
              <Button
                className='mr-2'
                onClick={() => {
                  setTextareaData(sampleCode);
                }}
                type='primary'
              >
                Load sample code
              </Button>
              <Button
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

            <Button
              type='text'
              shape='circle'
              icon={<FontAwesomeIcon icon={faLocationDot} size='xl' />}
              onClick={() => setIsTourOpen(true)}
            />

            <Link href='https://github.com/RightCapitalHQ/php-ast-viewer'>
              <Button type='text' shape='circle' icon={<FontAwesomeIcon icon={faGithub} size='xl' />} />
            </Link>

            <Link href='https://opensource.rightcapital.com'>
              <Button type='text' shape='circle' icon={<RCLogo className='w-[21px] h-[21px]' token={token} />} />
            </Link>
          </div>
        </Header>
        <Content style={contentStyle}>
          <div className='flex flex-col w-[100%] h-[100%]'>
            <div className='flex w-[100%] h-[100%]'>
              <div
                className='h-[100%] overflow-y-auto relative'
                style={{ width: editorContainerSize, backgroundColor: token.colorBgBase }}
                ref={ref1}
              >
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

              {editorViewerDivider}

              <div
                className='h-[100%] relative'
                style={{
                  width: viewerWidth,
                  backgroundColor: token.colorBgBase,
                }}
              >
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

                <div className='w-[100%] h-[40px]' style={{ backgroundColor: token.colorBgContainer }} ref={ref3}>
                  <SelectedNodeNamespace
                    jsonData={jsonDataRef.current}
                    namespace={currentNamespace}
                    onSelectNamespace={setSelectedNode}
                  />
                </div>

                <div className='w-[100%] h-[8px]' style={{ backgroundColor: token.colorBgLayout }} />

                <div
                  className='h-[calc(100%-48px)] overflow-y-auto'
                  style={{ backgroundColor: token.colorBgContainer }}
                  ref={ref2}
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
                      isParsing={isParsing}
                      isDarkMode={isDarkMode}
                      jsonData={jsonData}
                      selectedNode={selectedNode}
                      alwaysCollapseFieldNames={alwaysCollapseFieldNames}
                      enableClipboard={enableClipboard}
                      currentNamespace={currentNamespace}
                      expandDepth={expandDepth}
                      onSelect={(props) => {
                        console.log(props.namespace);
                        const node = getNodeByNameSpace(jsonDataRef.current, props.namespace as (string | number)[]);

                        if (isPhpParserASTNode(node)) {
                          setSelectedNode(node);
                        }
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
          colorPrimary: themeColor,
          colorLink: themeColor,
        },
      }}
    >
      <BaseViewer isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </ConfigProvider>
  );
}
