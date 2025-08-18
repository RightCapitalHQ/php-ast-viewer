import React, { useLayoutEffect } from 'react';
import TreeView from 'react-treeview';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import _ from 'lodash';
import { Typography } from 'antd';
import './tree-viewer.css';

interface TreeViewerProps {
  data: any;
  selectedNode?: INode;
  onSelectNode: (node: INode) => void;
  onNamespaceChange?: (namespace: string[]) => void;
}

function forEachChild(node: INode) {
  const childrenNodes: INode[] = [];
  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      const newNodes = value.filter((v) => _.get(v, 'nodeType') !== undefined);
      childrenNodes.push(...newNodes);
    } else if (_.get(value, 'nodeType') !== undefined) {
      childrenNodes.push(value);
    }
    return undefined;
  });
  return childrenNodes;
}

export function TreeViewer(props: TreeViewerProps) {
  const { data, selectedNode, onSelectNode } = props;
  let i = 0;

  useLayoutEffect(() => {
    const treeViewer = document.getElementById('tree-viewer');
    const selectedElement = document.querySelector(`#tree-viewer .selected`);
    if (treeViewer && selectedElement) {
      selectedElement.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }, [selectedNode]);

  if (!data || !Array.isArray(data)) {
    return <div>No tree data available</div>;
  }

  return (
    <div id='tree-viewer'>
      {data.map((sourceFile) => renderNode(sourceFile, forEachChild))}
    </div>
  );

  function renderNode(node: INode, getChildren: (node: INode) => INode[]): JSX.Element {
    const children = getChildren(node);
    const className = 'node-text' + (node === selectedNode ? ' selected' : '');
    // Handle both nodeType (PHP parser) and kind (other parsers)
    const nodeTypeName = (node as any).nodeType || (node as any).kind || 'unknown';
    
    const hasValidPosition = node && node.attributes && 
                           (node.attributes.startFilePos !== undefined || 
                            node.attributes.startLine !== undefined);
    
    const label = (
      <div 
        onClick={() => hasValidPosition && onSelectNode(node)} 
        className={className + (hasValidPosition ? ' clickable' : '')}
        title={hasValidPosition ? 'Click to highlight in editor' : ''}
      >
        {nodeTypeName}
      </div>
    );

    if (children.length === 0) {
      return (
        <div key={i++} className='end-node' data-name={nodeTypeName}>
          {label}
        </div>
      );
    }

    return (
      <Typography.Text key={i++}>
        <div data-name={nodeTypeName}>
          <TreeView nodeLabel={label}>
            {children.map((n) => renderNode(n, getChildren))}
          </TreeView>
        </div>
      </Typography.Text>
    );
  }
}