/**
 * React Code → Craft.js JSON Parser
 *
 * React TSX 코드를 파싱하여 Craft.js가 이해할 수 있는 JSON 구조로 변환
 */

import * as babel from '@babel/standalone';

type CraftNode = {
  type: { resolvedName: string };
  props: Record<string, any>;
  nodes: string[];
  parent?: string;
  displayName?: string;
  isCanvas?: boolean;
  hidden?: boolean;
  linkedNodes?: Record<string, string>;
};

type CraftNodeMap = {
  [nodeId: string]: CraftNode;
};

/**
 * React 코드를 AST로 파싱
 */
function parseReactCode(code: string): any {
  try {
    const result = babel.transform(code, {
      presets: ['react', 'typescript'],
      filename: 'component.tsx',
    });

    // AST 추출
    const ast = babel.parse(result.code || '', {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    return ast;
  } catch (error) {
    console.error('AST 파싱 실패:', error);
    throw new Error(`React 코드 파싱 실패: ${error}`);
  }
}

/**
 * JSX Element를 Craft Node로 변환
 */
function jsxElementToCraftNode(
  element: any,
  nodeMap: CraftNodeMap,
  parentId: string | null,
  nodeCounter: { value: number }
): string {
  const nodeId = parentId ? `node-${nodeCounter.value++}` : 'ROOT';

  // Element 타입에 따른 처리
  let componentName = 'div';
  let props: Record<string, any> = {};
  let children: string[] = [];

  // JSXElement인 경우
  if (element.type === 'JSXElement') {
    const openingElement = element.openingElement;

    // 컴포넌트 이름 추출
    if (openingElement.name.type === 'JSXIdentifier') {
      componentName = openingElement.name.name;
    }

    // Props 추출
    openingElement.attributes?.forEach((attr: any) => {
      if (attr.type === 'JSXAttribute') {
        const propName = attr.name.name;
        const propValue = extractPropValue(attr.value);
        props[propName] = propValue;
      }
    });

    // Children 처리
    element.children?.forEach((child: any) => {
      if (child.type === 'JSXElement') {
        const childId = jsxElementToCraftNode(child, nodeMap, nodeId, nodeCounter);
        children.push(childId);
      } else if (child.type === 'JSXText') {
        const text = child.value.trim();
        if (text) {
          // 텍스트 노드 생성
          const textNodeId = `node-${nodeCounter.value++}`;
          nodeMap[textNodeId] = {
            type: { resolvedName: 'Text' },
            props: { text },
            nodes: [],
            parent: nodeId,
          };
          children.push(textNodeId);
        }
      } else if (child.type === 'JSXExpressionContainer') {
        // {variable} 형태의 표현식 처리
        const expressionValue = extractExpressionValue(child.expression);
        if (expressionValue !== null) {
          const textNodeId = `node-${nodeCounter.value++}`;
          nodeMap[textNodeId] = {
            type: { resolvedName: 'Text' },
            props: { text: String(expressionValue) },
            nodes: [],
            parent: nodeId,
          };
          children.push(textNodeId);
        }
      }
    });
  }

  // Craft Node 생성
  nodeMap[nodeId] = {
    type: { resolvedName: componentName },
    props,
    nodes: children,
    parent: parentId || undefined,
    displayName: componentName,
    isCanvas: true,
  };

  return nodeId;
}

/**
 * JSX Attribute Value 추출
 */
function extractPropValue(value: any): any {
  if (!value) return true; // 값 없는 prop은 true

  switch (value.type) {
    case 'StringLiteral':
      return value.value;

    case 'JSXExpressionContainer':
      return extractExpressionValue(value.expression);

    default:
      return null;
  }
}

/**
 * Expression Value 추출
 */
function extractExpressionValue(expression: any): any {
  if (!expression) return null;

  switch (expression.type) {
    case 'NumericLiteral':
      return expression.value;

    case 'BooleanLiteral':
      return expression.value;

    case 'StringLiteral':
      return expression.value;

    case 'ObjectExpression':
      const obj: Record<string, any> = {};
      expression.properties?.forEach((prop: any) => {
        if (prop.type === 'ObjectProperty') {
          const key = prop.key.name || prop.key.value;
          obj[key] = extractExpressionValue(prop.value);
        }
      });
      return obj;

    case 'ArrayExpression':
      return expression.elements?.map((el: any) => extractExpressionValue(el)) || [];

    case 'Identifier':
      // 변수는 문자열로 변환
      return `{${expression.name}}`;

    default:
      return null;
  }
}

/**
 * AST에서 컴포넌트의 return 문 찾기
 */
function findReturnStatement(ast: any): any {
  let returnStatement: any = null;

  // AST 순회
  const traverse = (node: any) => {
    if (!node) return;

    // FunctionDeclaration이나 ArrowFunctionExpression 찾기
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression'
    ) {
      // body에서 return 문 찾기
      const body = node.body;
      if (body.type === 'BlockStatement') {
        body.body?.forEach((statement: any) => {
          if (statement.type === 'ReturnStatement' && statement.argument) {
            returnStatement = statement.argument;
          }
        });
      } else {
        // Arrow function의 expression body
        returnStatement = body;
      }
    }

    // 재귀적으로 자식 노드 순회
    Object.keys(node).forEach((key) => {
      const child = node[key];
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else {
          traverse(child);
        }
      }
    });
  };

  traverse(ast);
  return returnStatement;
}

/**
 * React 코드를 Craft.js JSON으로 변환 (메인 함수)
 */
export function reactCodeToCraft(reactCode: string): CraftNodeMap {
  try {
    console.log('🔍 React 코드 파싱 시작...');

    // AST 파싱
    const ast = parseReactCode(reactCode);

    // Return statement 찾기
    const returnStatement = findReturnStatement(ast);

    if (!returnStatement) {
      throw new Error('컴포넌트의 return 문을 찾을 수 없습니다');
    }

    console.log('✅ Return statement 발견:', returnStatement.type);

    // Craft.js 노드 맵 생성
    const nodeMap: CraftNodeMap = {};
    const nodeCounter = { value: 1 };

    // JSX를 Craft Node로 변환
    jsxElementToCraftNode(returnStatement, nodeMap, null, nodeCounter);

    console.log('✅ Craft.js JSON 생성 완료:', Object.keys(nodeMap).length, '개의 노드');
    console.log('📊 생성된 노드 맵:', nodeMap);

    return nodeMap;
  } catch (error) {
    console.error('❌ React → Craft 변환 실패:', error);
    throw error;
  }
}

/**
 * Craft.js 상태를 직렬화 문자열로 변환
 */
export function craftNodeMapToString(nodeMap: CraftNodeMap): string {
  return JSON.stringify(nodeMap, null, 2);
}
