import { Breadcrumb, Button, Dropdown, MenuProps, Typography } from 'antd';
import { getNodeByNameSpace, isPhpParserASTNode as isPhpParserAstNode } from './helpers';
import { INode } from '@rightcapital/php-parser/dist/php-parser/types/node';
import set from 'lodash/set';
import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface SelectedNodeInfoProps {
  namespace: string[];
  jsonData: any;
  onSelectNamespace: (node: INode) => void;
}

export const SelectedNodeNamespace: React.FC<SelectedNodeInfoProps> = ({ jsonData, onSelectNamespace, namespace }) => {
  const disableScrollButton = namespace.length === 0;
  const scrollContainerRef = useRef<Element | undefined>(undefined);
  const breadcrumbListRef = useRef<Element | undefined>(undefined);

  useEffect(() => {
    const scrollContainer = document.querySelector('.namespace-breadcrumb');
    const breadcrumbList = document.querySelector('.namespace-breadcrumb ol');
    if (breadcrumbList) {
      breadcrumbListRef.current = breadcrumbList;
    }
    if (scrollContainer) {
      scrollContainerRef.current = scrollContainer;
    }
  }, []);

  const getBreadCrumbItemsRecursivelyWithDepth = (node: INode | INode[], depth = 2, keyName?: string) => {
    const items: MenuProps['items'] = [];

    if (depth === 0) {
      return items;
    }

    if (Array.isArray(node)) {
      items.push(
        ...node.map((v, i) => {
          const subItems = getBreadCrumbItemsRecursivelyWithDepth(v, depth - 1);

          const item = {
            key: `${v.attributes.startTokenPos}-${i}-${v.nodeType}`,
            label: (
              <Button
                type='link'
                className='p-[4px]'
                onClick={() => {
                  onSelectNamespace(v);
                }}
              >
                [{i}] - {v.nodeType}
              </Button>
            ),
          };

          if (subItems.length > 0) {
            set(item, 'children', subItems);
          }

          return item;
        })
      );
    } else {
      Object.entries(node).map(([k, v]) => {
        if (isPhpParserAstNode(v)) {
          const subItems = getBreadCrumbItemsRecursivelyWithDepth(v, depth - 1);

          const item = {
            key: `${v.attributes.startTokenPos}-${k}-${v.nodeType}`,
            label: (
              <Button
                type='link'
                className='p-[4px]'
                onClick={() => {
                  onSelectNamespace(v);
                }}
              >
                {k} - {v.nodeType}
              </Button>
            ),
          };

          if (subItems.length > 0) {
            set(item, 'children', subItems);
          }

          items.push(item);
        } else if (Array.isArray(v)) {
          const subItems = getBreadCrumbItemsRecursivelyWithDepth(v, depth - 1, k);

          if (subItems.length > 0) {
            const item = {
              key: `${depth}-${k}-${node.nodeType}-${keyName}`,
              label: <Typography.Text className='p-[4px]'>{k}</Typography.Text>,
            };

            set(item, 'children', subItems);

            items.push(item);
          }
        }
      });
    }

    return items;
  };

  return (
    <div className='flex items-center w-[100%] h-[100%] justify-evenly'>
      <Button
        type='text'
        className='p-[4px]'
        onClick={() => {
          scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
        }}
        disabled={disableScrollButton}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </Button>

      <Breadcrumb className='namespace-breadcrumb w-[calc(100%-80px)] leading-[32px] overflow-x-auto'>
        {namespace.map((value, index) => {
          const currentNamespace = namespace.slice(0, index + 1);
          const node = getNodeByNameSpace({ root: jsonData }, currentNamespace);
          const parentNode = getNodeByNameSpace({ root: jsonData }, namespace.slice(0, index));
          const isAstNode = isPhpParserAstNode(node);
          const items = getBreadCrumbItemsRecursivelyWithDepth(parentNode, 3);

          return (
            <Breadcrumb.Item key={index}>
              {items.length > 0 ? (
                <Dropdown menu={{ items }} rootClassName='max-h-[50vh] overflow-y-auto shadow-lg rounded-br-[8px]'>
                  {
                    <Button
                      type='link'
                      className='p-[4px]'
                      onClick={() => {
                        if (isPhpParserAstNode(node)) {
                          onSelectNamespace(node);
                        }
                      }}
                    >
                      {Array.isArray(node) ? value : `[${value}]`}
                    </Button>
                  }
                </Dropdown>
              ) : (
                value
              )}
            </Breadcrumb.Item>
          );
        })}
      </Breadcrumb>

      <Button
        type='text'
        className='p-[4px]'
        onClick={() => {
          scrollContainerRef.current?.scrollTo({ left: 1000, behavior: 'smooth' });
        }}
        disabled={disableScrollButton}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </Button>
    </div>
  );
};
