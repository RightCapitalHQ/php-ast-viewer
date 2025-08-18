import React, { useLayoutEffect, useState } from 'react';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import ReactJson, { CollapsedFieldProps, OnSelectProps } from '@yilun-sun/react-json-view';
import { Spin } from 'antd';
import './json-viewer.css';

interface JsonViewerProps {
  data: any;
  selectedNode?: INode;
  onSelect: (node: INode) => void;
  onNamespaceChange?: (namespace: string[]) => void;
  onCopyToClipboard?: (text: string) => void;
  enableClipboard: boolean;
  alwaysCollapseFieldNames: string[];
  expandDepth: number;
}

export function JsonViewer(props: JsonViewerProps) {
  const {
    data,
    selectedNode,
    onSelect,
    onNamespaceChange,
    onCopyToClipboard,
    enableClipboard,
    alwaysCollapseFieldNames,
    expandDepth,
  } = props;

  const [currentHighlightNode, setCurrentHighlightNode] = useState<HTMLElement | null>(null);
  const [currentNamespace, setCurrentNamespace] = useState<string[]>([]);

  // Detect VSCode theme
  const isDarkMode = document.body.className.includes('vscode-dark') || 
                     document.body.className.includes('vscode-high-contrast');

  useLayoutEffect(() => {
    currentHighlightNode?.classList.remove('selected');
    const jsonViewer = document.getElementById('json-viewer');
    const selectedElement = document.getElementById(currentNamespace.join('-'));

    if (jsonViewer && selectedElement) {
      setCurrentHighlightNode(selectedElement);
      selectedElement?.classList.add('selected');
      selectedElement.scrollIntoView({ block: 'start', inline: 'start' });
    }
  }, [currentNamespace, currentHighlightNode]);

  const handleSelect = (props: OnSelectProps) => {
    const namespace = props.namespace as (string | number)[];
    setCurrentNamespace(namespace.map(String));
    
    if (onNamespaceChange) {
      onNamespaceChange(namespace.map(String));
    }

    // Extract the node from the selection
    let node = data;
    for (const key of namespace) {
      if (node && typeof node === 'object') {
        node = node[key];
      }
    }

    if (node && typeof node === 'object' && 'attributes' in node) {
      onSelect(node as INode);
    }
  };

  const handleCopy = enableClipboard && onCopyToClipboard ? (copy: any) => {
    const text = JSON.stringify(copy.src, null, 2);
    onCopyToClipboard(text);
  } : false;

  return (
    <div id="json-viewer" className="json-viewer">
      <ReactJson
        onSelect={handleSelect}
        quotesOnKeys={false}
        src={data}
        enableClipboard={handleCopy}
        displayDataTypes={false}
        theme={isDarkMode ? 'tomorrow' : 'rjv-default'}
        collapsed={expandDepth}
        shouldCollapse={(field: CollapsedFieldProps) => {
          // Keep expanded if it's part of the current selection path
          if (currentNamespace.join('-').startsWith(field.namespace.join('-'))) {
            return false;
          }

          // Always collapse specified fields
          if (field.name && alwaysCollapseFieldNames.includes(field.name)) {
            return true;
          }

          // Collapse based on depth
          return field.namespace.length > expandDepth;
        }}
      />
    </div>
  );
}