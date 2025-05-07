import React from 'react';

export function ReactComponent(props) {
  return React.createElement('div', {
    ...props,
    dangerouslySetInnerHTML: { __html: props.src },
  });
} 