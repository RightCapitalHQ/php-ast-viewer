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
  isDarkMode?: boolean;
}

// Check if two nodes are the same based on attributes
function isSameNode(node1: any, node2: any): boolean {
  if (!node1 || !node2) return false;
  if (!node1.attributes || !node2.attributes) return false;
  
  return (
    node1.attributes.startFilePos === node2.attributes.startFilePos &&
    node1.attributes.endFilePos === node2.attributes.endFilePos &&
    node1.attributes.startLine === node2.attributes.startLine &&
    node1.attributes.endLine === node2.attributes.endLine
  );
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
    isDarkMode: isDarkModeProp,
  } = props;

  const [currentHighlightNode, setCurrentHighlightNode] = useState<HTMLElement | null>(null);
  const [currentNamespace, setCurrentNamespace] = useState<string[]>([]);

  // Use prop if provided, otherwise detect VSCode theme
  const isDarkMode = isDarkModeProp !== undefined 
    ? isDarkModeProp 
    : (document.body.className.includes('vscode-dark') || 
       document.body.className.includes('vscode-high-contrast'));

  // When selectedNode changes from external source (editor click), find and expand its path
  useLayoutEffect(() => {
    if (selectedNode && data) {
      // Find the namespace path to this node by traversing the data
      const findNamespace = (node: any, target: INode, path: (string | number)[] = []): (string | number)[] | null => {
        if (node === target || (node && target && isSameNode(node, target))) {
          return path;
        }
        
        if (node && typeof node === 'object') {
          for (const [key, value] of Object.entries(node)) {
            const result = findNamespace(value, target, [...path, key]);
            if (result) return result;
          }
        }
        
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const result = findNamespace(node[i], target, [...path, i]);
            if (result) return result;
          }
        }
        
        return null;
      };
      
      const namespace = findNamespace(data, selectedNode, ['root']);
      if (namespace) {
        setCurrentNamespace(namespace.map(String));
      }
    }
  }, [selectedNode, data]);

  // Highlight and scroll to the selected element
  useLayoutEffect(() => {
    currentHighlightNode?.classList.remove('selected');
    const jsonViewer = document.getElementById('json-viewer');
    const selectedNode = document.getElementById(currentNamespace.join('-'));

    if (jsonViewer && selectedNode) {
      setCurrentHighlightNode(selectedNode);
      selectedNode?.classList.add('selected');
      selectedNode.scrollIntoView({ 
        block: 'center', 
        inline: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [currentNamespace]);

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

    // Check if this is an AST node (has nodeType and attributes with position info)
    if (node && typeof node === 'object' && 
        ('nodeType' in node || 'kind' in node) && 
        'attributes' in node && 
        node.attributes && 
        typeof node.attributes === 'object' &&
        ('startFilePos' in node.attributes || 'startLine' in node.attributes)) {
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
        forceCalculateShouldCollapseOnNamespaceUpdate={currentNamespace}
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