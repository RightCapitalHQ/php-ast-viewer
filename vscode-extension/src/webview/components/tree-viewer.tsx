import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import TreeView from 'react-treeview';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import _ from 'lodash';
import './tree-viewer.css';

interface TreeViewerProps {
  data: any;
  selectedNode?: INode;
  onSelectNode: (node: INode) => void;
  onNamespaceChange?: (namespace: string[]) => void;
  isDarkMode?: boolean;
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

// Generate a unique key for a node based on its position
function getNodeKey(node: INode): string {
  const attrs = node.attributes;
  if (attrs) {
    return `${attrs.startFilePos}-${attrs.endFilePos}-${attrs.startLine}-${attrs.endLine}`;
  }
  return '';
}

// Check if two nodes are the same
function isSameNode(target: INode | undefined, current: INode | undefined): boolean {
  if (!target || !current) return false;
  if (!target.attributes || !current.attributes) return false;
  
  return (
    target.attributes.startFilePos === current.attributes.startFilePos &&
    target.attributes.endFilePos === current.attributes.endFilePos &&
    target.attributes.startLine === current.attributes.startLine &&
    target.attributes.endLine === current.attributes.endLine
  );
}

export function TreeViewer(props: TreeViewerProps) {
  const { data, selectedNode, onSelectNode, isDarkMode } = props;
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [forceUpdate, setForceUpdate] = useState(0);
  let i = 0;
  

  // Function to find all parent nodes of the selected node
  const findParentNodes = useCallback((targetNode: INode, currentNode: INode, parents: string[] = []): string[] | null => {
    if (isSameNode(targetNode, currentNode)) {
      return parents;
    }

    const currentKey = getNodeKey(currentNode);
    const children = forEachChild(currentNode);
    
    for (const child of children) {
      const result = findParentNodes(targetNode, child, [...parents, currentKey]);
      if (result) {
        return result;
      }
    }
    
    return null;
  }, []);

  // Auto-expand to selected node
  useEffect(() => {
    if (selectedNode && data && Array.isArray(data)) {
      const allParents = new Set<string>();
      
      // Find parent nodes in all root nodes
      for (const rootNode of data) {
        const parents = findParentNodes(selectedNode, rootNode);
        if (parents) {
          parents.forEach(parent => allParents.add(parent));
          // Also add the root node
          allParents.add(getNodeKey(rootNode));
        }
      }
      
      if (allParents.size > 0) {
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          allParents.forEach(key => newSet.add(key));
          return newSet;
        });
        // Force re-render to apply expansion
        setForceUpdate(prev => prev + 1);
      }
    }
  }, [selectedNode, data, findParentNodes]);

  // Scroll to selected node after expansion
  useLayoutEffect(() => {
    // Use setTimeout to ensure DOM has updated after expansion
    const timer = setTimeout(() => {
      const selectedElement = document.querySelector('#tree-viewer .node-text.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center', 
          inline: 'center' 
        });
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, [selectedNode, expandedNodes, forceUpdate]);

  if (!data || !Array.isArray(data)) {
    return <div>No tree data available</div>;
  }

  function handleNodeClick(node: INode) {
    const hasValidPosition = node && node.attributes && 
                           (node.attributes.startFilePos !== undefined || 
                            node.attributes.startLine !== undefined);
    if (hasValidPosition) {
      onSelectNode(node);
    }
  }

  function handleToggleExpand(node: INode) {
    const nodeKey = getNodeKey(node);
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeKey)) {
        newSet.delete(nodeKey);
      } else {
        newSet.add(nodeKey);
      }
      return newSet;
    });
  }

  function renderNode(node: INode, getChildren: (node: INode) => INode[], depth: number = 0): JSX.Element {
    const children = getChildren(node);
    const isSelected = selectedNode && isSameNode(node, selectedNode);
    const className = 'node-text' + (isSelected ? ' selected' : '');
    
    // Handle both nodeType (PHP parser) and kind (other parsers)
    const nodeTypeName = (node as any).nodeType || (node as any).kind || 'unknown';
    
    const hasValidPosition = node && node.attributes && 
                           (node.attributes.startFilePos !== undefined || 
                            node.attributes.startLine !== undefined);
    
    const nodeKey = getNodeKey(node);
    const isExpanded = expandedNodes.has(nodeKey);
    
    const label = (
      <div 
        onClick={() => handleNodeClick(node)} 
        className={className + (hasValidPosition ? ' clickable' : '')}
        title={hasValidPosition ? 'Click to highlight in editor' : ''}
        data-node-key={nodeKey}
      >
        {nodeTypeName}
      </div>
    );

    if (children.length === 0) {
      return (
        <div key={`${nodeKey}-${i++}`} className='end-node' data-name={nodeTypeName}>
          {label}
        </div>
      );
    }

    return (
      <div key={`${nodeKey}-${i++}`} data-name={nodeTypeName}>
        <TreeView 
          nodeLabel={label}
          collapsed={!isExpanded}
          onClick={() => handleToggleExpand(node)}
        >
          {children.map((n) => renderNode(n, getChildren, depth + 1))}
        </TreeView>
      </div>
    );
  }

  return (
    <div id='tree-viewer'>
      {data.map((sourceFile) => renderNode(sourceFile, forEachChild))}
    </div>
  );
}