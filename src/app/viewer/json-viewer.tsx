import React, { useLayoutEffect, useState } from 'react';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node.js';
import _ from 'lodash';
import ReactJson, { CollapsedFieldProps, OnSelectProps } from '@yilun-sun/react-json-view';
import './json-viewer.css';
import { theme } from 'antd';

interface JsonViewerProps {
  jsonData: { data: INode[] };
  selectedNode?: INode;
  onSelect: (props: OnSelectProps) => void;
  enableClipboard: boolean;
  alwaysCollapseFieldNames: string[];
  currentNamespace: string[];
  expandDepth: number;
  isDarkMode: boolean;
}

const { useToken } = theme;

export default function JsonViewer(props: JsonViewerProps) {
  const { onSelect, enableClipboard, jsonData, alwaysCollapseFieldNames, currentNamespace, expandDepth, isDarkMode } =
    props;

  const [currentHighlightNode, setCurrentHighlightNode] = useState<HTMLElement | null>(null);

  const { token } = useToken();

  useLayoutEffect(() => {
    currentHighlightNode?.classList.remove('selected');
    const treeViewer = document.getElementById('jsonViewer');
    const selectedNode = document.getElementById(currentNamespace.join('-'));

    if (treeViewer && selectedNode) {
      setCurrentHighlightNode(selectedNode);
      selectedNode?.classList.add('selected');

      selectedNode.scrollIntoView({ block: 'start', inline: 'start' }); // Sometimes, the height of an expanded subtree exceeds the window height, and setting it to 'center' would make the top part invisible.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNamespace]);

  return (
    <div id='jsonViewer'>
      <ReactJson
        onSelect={onSelect}
        quotesOnKeys={false}
        src={jsonData}
        enableClipboard={enableClipboard}
        displayDataTypes={false}
        theme={isDarkMode ? 'railscasts' : 'rjv-default'}
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
