import { TourStepProps } from 'antd';

export const sampleCode = `<?php declare(strict_types=1);

namespace PhpParser;

interface Builder {
    /**
     * Returns the built node.
     *
     * @return Node The built node
     */
    public function getNode(): Node;
}`;

export const fieldNames = [
  'attributes',
  'declares',
  'key',
  'value',
  'rawValue',
  'kind',
  'stmts',
  'type',
  'uses',
  'alias',
  'comments',
  'text',
  'line',
  'filePos',
  'tokenPos',
  'traits',
  'adaptations',
  'flags',
  'consts',
  'attrGroups',
  'items',
  'class',
  'byRef',
  'unpack',
  'params',
  'returnType',
  'expr',
  'cond',
  'left',
  'var',
  'right',
  'if',
  'args',
  'else',
  'parts',
  'elseifs',
  'variadic',
  'default',
  'static',
  'arms',
  'conds',
  'body',
  'extends',
  'implements',
];

export const themeColor = '#7a86b8';

export const tourSteps: { [key in string]: TourStepProps } = {
  editor: {
    title: 'PHP Code Editor',
    description: (
      <>
        <p>Type or modify your PHP code within the textbox.</p>
        <p>
          Any changes in the editor content automatically initiate analysis, updating the AST displayed on the right to
          reflect the new code structure.
        </p>
      </>
    ),
    placement: 'right',
  },
  viewer: {
    title: 'AST Viewer',
    description: (
      <>
        <p>View the AST corresponding to your PHP code to better understand its structure.</p>
        <p>Toggle between JSON view and tree structure view with a display mode button.</p>
        <p>
          Click on AST nodes to view their properties and simultaneously highlight the corresponding code snippet in the
          PHP Code Editor. This feature aids in visually locating and understanding code segments directly related to
          structural elements within the AST.
        </p>
      </>
    ),
    placement: 'left',
  },
  navigation: {
    title: 'Navigation',
    description: (
      <>
        <p>Use the display in the navigation bar to understand the namespace structure of the selected AST node.</p>
        <p>
          Click on any namespace within the breadcrumb to highlight the respective node both in the AST Viewer and the
          PHP Code Editor, providing a synchronized view of the code and its structure.
        </p>
        <p>
          Leverage the submenu in the breadcrumb for quick navigation to specific nodes within a chosen namespace,
          enhancing your ability to locate and analyze code components efficiently.
        </p>
      </>
    ),
  },
};
