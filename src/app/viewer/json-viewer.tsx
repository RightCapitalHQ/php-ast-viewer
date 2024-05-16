import React, { useLayoutEffect, useState } from 'react';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import _ from 'lodash';
import ReactJson, { CollapsedFieldProps, OnSelectProps } from '@yilun-sun/react-json-view';
import './json-viewer.css';
import { Spin } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

interface JsonViewerProps {
  jsonData: { data: INode[] };
  selectedNode?: INode;
  onSelect: (props: OnSelectProps) => void;
  enableClipboard: boolean;
  alwaysCollapseFieldNames: string[];
  currentNamespace: string[];
  expandDepth: number;
  isDarkMode: boolean;
  isParsing: boolean;
}

export default function JsonViewer(props: JsonViewerProps) {
  const {
    onSelect,
    isParsing,
    enableClipboard,
    jsonData,
    alwaysCollapseFieldNames,
    currentNamespace,
    expandDepth,
    isDarkMode,
  } = props;

  const [currentHighlightNode, setCurrentHighlightNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    currentHighlightNode?.classList.remove('selected');
    const jsonViewer = document.getElementById('json-viewer');

    const selectedNode = document.getElementById(currentNamespace.join('-'));

    if (jsonViewer && selectedNode) {
      setCurrentHighlightNode(selectedNode);
      selectedNode?.classList.add('selected');

      selectedNode.scrollIntoView({ block: 'start', inline: 'start' }); // Sometimes, the height of an expanded subtree exceeds the window height, and setting it to 'center' would make the top part invisible.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNamespace]);

  return (
    <div id={'json-viewer'} className={'json-viewer'}>
      {document !== undefined && isParsing && (
        <Spin size='large' indicator={<FontAwesomeIcon icon={faCircleNotch} spin />} />
      )}
      <ReactJson
        onSelect={onSelect}
        quotesOnKeys={false}
        src={jsonData}
        enableClipboard={enableClipboard}
        displayDataTypes={false}
        theme={isDarkMode ? 'tomorrow' : 'rjv-default'}
        forceCalculateShouldCollapseOnNamespaceUpdate={currentNamespace}
        shouldCollapse={(field: CollapsedFieldProps) => {
          if (currentNamespace.join('-').startsWith(field.namespace.join('-'))) {
            return false;
          }

          if (field.name && alwaysCollapseFieldNames.includes(field.name)) {
            return true;
          }

          return field.namespace.length > expandDepth;
        }}
      />
    </div>
  );
}
