import React, { useLayoutEffect } from 'react';
import TreeView from 'react-treeview';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import get from 'lodash/get';
import './tree-viewer.css';
import { Typography } from 'antd';

interface TreeViewerProps {
  sourceFile: INode;
  selectedNode?: INode;
  onSelectNode: (node: INode) => void;
}

function forEachChild(node: INode) {
  const childrenNodes: INode[] = [];
  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      const newNodes = value.filter((v) => get(v, 'nodeType') !== undefined);
      childrenNodes.push(...newNodes);
    } else if (get(value, 'nodeType') !== undefined) {
      childrenNodes.push(value);
    }
    return undefined;
  });
  return childrenNodes;
}

export default function TreeViewer(props: TreeViewerProps) {
  const { sourceFile, selectedNode, onSelectNode } = props;
  let i = 0;

  useLayoutEffect(() => {
    const treeViewer = document.getElementById('tree-viewer');
    const selectedNode = document.querySelector(`#tree-viewer .selected`);
    if (treeViewer && selectedNode) {
      selectedNode.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }, [selectedNode]);

  if (sourceFile === undefined) {
    return <></>;
  }

  return <div id='tree-viewer'>{renderNode(sourceFile, forEachChild)}</div>;

  function renderNode(node: INode, getChildren: (node: INode) => INode[]): React.JSX.Element {
    const children = getChildren(node);
    const className = 'node-text' + (node === selectedNode ? ' selected' : '');
    const nodeTypeName = node.nodeType;
    const label = (
      <div onClick={() => onSelectNode(node)} className={className}>
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
          <TreeView nodeLabel={label}>{children.map((n) => renderNode(n, getChildren))}</TreeView>
        </div>
      </Typography.Text>
    );
  }
}
