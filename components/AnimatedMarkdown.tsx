import React, { useRef, Children, isValidElement, cloneElement, Fragment, useEffect, ComponentPropsWithoutRef, ElementType, memo } from "react"; // Import memo
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw'; // Import rehype-raw
import { Pluggable } from "unified"; // Use Pluggable type

interface AnimatedMarkdownProps {
  content: string;
}

// Helper function to process children and apply word animations
const AnimatedText = ({ children, wordIndexOffset }: { children: React.ReactNode, wordIndexOffset: React.MutableRefObject<number> }) => {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      const words = child.split(/(\s+)/); // Split by space, keeping spaces
      return words.map((word, index) => {
        if (word.trim() === '') {
          // Preserve whitespace without animation
          return <Fragment key={index}>{word}</Fragment>;
        }
        // Use the faster 12ms delay factor for words
        const delay = wordIndexOffset.current * 12; // Stagger delay (faster)
        wordIndexOffset.current += 1;
        return (
          <span
            key={index}
            className="animate-word"
            style={{ animationDelay: `${delay}ms` }}
          >
            {word}
          </span>
        );
      });
    }
    // Recursively process nested elements if needed, passing the ref
    if (isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
      return cloneElement(child, {
         children: <AnimatedText wordIndexOffset={wordIndexOffset}>{child.props.children}</AnimatedText>
       });
    }
    return child; // Return non-string children as is
  });
};

// Define the component logic
const AnimatedMarkdownComponent: React.FC<AnimatedMarkdownProps> = ({ content }) => {
  const wordIndexCounter = useRef(0); // Use ref to persist counter across renders/elements

  // Reset counter when content changes
  useEffect(() => {
    wordIndexCounter.current = 0;
  }, [content]);

  // Factory function to create animated components for standard HTML tags
  const createAnimatedComponent = <T extends ElementType>(
    elementType: T
  ): React.FC<ComponentPropsWithoutRef<T>> => {
    const AnimatedComponent: React.FC<ComponentPropsWithoutRef<T>> = (props) => {
      const { children, ...restProps } = props as { children?: React.ReactNode } & Omit<ComponentPropsWithoutRef<T>, 'children'>;
      const Element = elementType;

      // Calculate delay for the element itself based on the *current* counter value
      // This makes the element fade-in start concurrently with its first word's potential start time
      const elementDelay = wordIndexCounter.current * 12; // Use the same delay factor as words

      return (
        // Apply element animation class and delay
        <Element
          {...restProps as any}
          className="animate-element" // Add class for element fade-in
          style={{ animationDelay: `${elementDelay}ms` }} // Apply calculated delay
        >
          {/* AnimatedText uses the same counter ref, words will animate sequentially after element starts */}
          <AnimatedText wordIndexOffset={wordIndexCounter}>{children}</AnimatedText>
        </Element>
      );
    };
    // Ensure elementType is a string before using string methods
    const displayName = typeof elementType === 'string' ? `Animated${elementType.charAt(0).toUpperCase() + elementType.slice(1)}` : 'AnimatedComponent';
    AnimatedComponent.displayName = displayName;
    return AnimatedComponent;
  };

  // Custom renderers for text-containing elements using the factory
  const components: Partial<Components> = {
    p: createAnimatedComponent('p'),
    li: createAnimatedComponent('li'), // Apply to list items as well
    h1: createAnimatedComponent('h1'),
    h2: createAnimatedComponent('h2'),
    h3: createAnimatedComponent('h3'),
    h4: createAnimatedComponent('h4'),
    h5: createAnimatedComponent('h5'),
    h6: createAnimatedComponent('h6'),
    // Handle inline code with animation - use specific props type
    code: ({ node, inline, className, children, style, ...props }: any) => {
      if (inline) {
        // Inline code is treated like a word within its parent element
        return (
          <code className={className} style={style} {...props}>
            <AnimatedText wordIndexOffset={wordIndexCounter}>{children}</AnimatedText>
          </code>
        );
      }
      // Block code - render without word animation, but apply element animation
      // We need to wrap the <pre> element using the factory if we want it to fade in
      return (
        <code className={className} style={style} {...props}>
          {children}
        </code>
      );
    },
    // Apply element animation to <pre> blocks
    pre: createAnimatedComponent('pre'),
    blockquote: createAnimatedComponent('blockquote'),
    // Apply element animation to table cells
    td: createAnimatedComponent('td'),
    th: createAnimatedComponent('th'),
    // Note: Applying to table rows (tr) or the table itself might be better visually
    // tr: createAnimatedComponent('tr'),
    // table: createAnimatedComponent('table'), // Could animate whole table at once
  };

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw] as Pluggable[]}
        components={components as Components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Export the memoized component
export const AnimatedMarkdown = memo(AnimatedMarkdownComponent);
