import React, {
  useRef,
  Children,
  isValidElement,
  cloneElement,
  Fragment,
  useEffect,
  ComponentPropsWithoutRef,
  ElementType,
  memo,
  useState,
  useCallback,
} from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Pluggable } from "unified";

interface AnimatedMarkdownProps {
  content: string;
  messageId?: string;
  isComplete?: boolean;
  onAnimationComplete?: (duration: number) => void;
}

// Constants for performance optimization
const CONTENT_LENGTH_THRESHOLD = 5000; // Skip animation for content longer than this
const VIRTUALIZATION_THRESHOLD = 15000; // Use virtualization for very long documents
const ANIMATION_WORD_DELAY_MS = 8; // Reduced from 12ms to 8ms for faster animation
const CHUNK_SIZE = 2000; // Characters per chunk for very large documents

// Helper function to process children and apply word animations - optimized 
const AnimatedText = ({
  children,
  wordIndexOffset,
  disableAnimation,
}: {
  children: React.ReactNode;
  wordIndexOffset: React.MutableRefObject<number>;
  disableAnimation: boolean;
}) => {
  // If animations are disabled, return the content without animation spans
  if (disableAnimation) {
    return <>{children}</>;
  }
  
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      // Optimization: Instead of splitting every space, process multiple words at once
      const words = child.split(/(\s+)/); // Split by space, keeping spaces
      return words.map((word, index) => {
        if (word.trim() === "") {
          return <Fragment key={index}>{word}</Fragment>;
        }
        
        const currentWordIndex = wordIndexOffset.current;
        // Use a faster animation delay
        const delay = currentWordIndex * ANIMATION_WORD_DELAY_MS;
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
    
    if (
      isValidElement<{ children?: React.ReactNode }>(child) &&
      child.props.children
    ) {
      return cloneElement(child, {
        children: (
          <AnimatedText 
            wordIndexOffset={wordIndexOffset}
            disableAnimation={disableAnimation}
          >
            {child.props.children}
          </AnimatedText>
        ),
      });
    }
    
    return child;
  });
};

// The main component with performance optimizations
const AnimatedMarkdownComponent: React.FC<AnimatedMarkdownProps> = ({
  content,
  messageId,
  onAnimationComplete,
}) => {
  const hasAnimated = useRef(false);
  const wordIndexCounter = useRef(0);
  const [visibleContent, setVisibleContent] = useState<string>("");
  const [isFullyRendered, setIsFullyRendered] = useState(false);
  
  // Determine if the content is very large and should skip animation/use virtualization
  const contentLength = content?.length || 0;
  const disableAnimation = contentLength > CONTENT_LENGTH_THRESHOLD;
  const useVirtualization = contentLength > VIRTUALIZATION_THRESHOLD;
  
  // Use a callback ref to monitor the visible area
  const observerRef = useCallback((node: HTMLElement | null) => {
    if (node && useVirtualization && !isFullyRendered) {
      const observer = new IntersectionObserver(
        (entries) => {
          // Load more content as the user scrolls
          if (entries[0].isIntersecting) {
            if (visibleContent.length < content.length) {
              // Load the next chunk
              const nextChunkEnd = Math.min(visibleContent.length + CHUNK_SIZE, content.length);
              setVisibleContent(content.substring(0, nextChunkEnd));
            } else {
              // All content is loaded
              setIsFullyRendered(true);
              observer.disconnect();
            }
          }
        },
        { threshold: 0.1 }
      );
      
      observer.observe(node);
      
      return () => observer.disconnect();
    }
  }, [visibleContent, content, useVirtualization, isFullyRendered]);
  
  // Initialize visible content
  useEffect(() => {
    wordIndexCounter.current = 0;
    
    if (useVirtualization) {
      // Only render the first chunk initially
      setVisibleContent(content.substring(0, CHUNK_SIZE));
      setIsFullyRendered(false);
    } else {
      // Render the entire content
      setVisibleContent(content);
      setIsFullyRendered(true);
    }
  }, [content, useVirtualization, messageId]);
  
  // Calculate animation time and notify completion
  useEffect(() => {
    // Skip animation calculation if this component was already animated or if animations are disabled
    if (hasAnimated.current || disableAnimation) {
      if (onAnimationComplete) {
        onAnimationComplete(0); // Immediately notify completion
      }
      hasAnimated.current = true;
      return;
    }

    // Mark as animated to prevent future re-animations
    hasAnimated.current = true;
    
    // Use shorter animation durations for better performance
    const wordCount = Math.min(200, content.split(/\s+/).filter(Boolean).length); // Cap word count
    const lastWordDelay = wordCount > 0 ? (wordCount - 1) * ANIMATION_WORD_DELAY_MS : 0;
    const animationDuration = Math.min(lastWordDelay + 300, 2000); // Cap total animation time
    
    // Notify completion after animation
    if (onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete(animationDuration);
      }, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [content, onAnimationComplete, messageId, disableAnimation]);
  
  // Factory function to create either animated or non-animated components based on content size
  const createComponent = <T extends ElementType>(elementType: T): React.FC<ComponentPropsWithoutRef<T>> => {
    return (props) => {
      const { children, ...restProps } = props as {
        children?: React.ReactNode;
      } & Omit<ComponentPropsWithoutRef<T>, "children">;
      const Element = elementType;
      
      // Skip animation for large content
      if (disableAnimation) {
        return <Element {...(restProps as any)}>{children}</Element>;
      }
      
      const elementDelay = wordIndexCounter.current * ANIMATION_WORD_DELAY_MS;
      
      return (
        <Element
          {...(restProps as any)}
          className="animate-element"
          style={{ animationDelay: `${elementDelay}ms` }}
        >
          <AnimatedText 
            wordIndexOffset={wordIndexCounter}
            disableAnimation={disableAnimation}
          >
            {children}
          </AnimatedText>
        </Element>
      );
    };
  };

  // Custom renderers with optimizations
  const components: Partial<Components> = {
    p: createComponent("p"),
    li: createComponent("li"),
    h1: createComponent("h1"),
    h2: createComponent("h2"),
    h3: createComponent("h3"),
    h4: createComponent("h4"),
    h5: createComponent("h5"),
    h6: createComponent("h6"),
    pre: createComponent("pre"),
    blockquote: createComponent("blockquote"),
    td: createComponent("td"),
    th: createComponent("th"),
    code: ({ node, inline, className, children, style, ...props }: any) => {
      if (inline) {
        return (
          <code className={className} style={style} {...props}>
            <AnimatedText 
              wordIndexOffset={wordIndexCounter}
              disableAnimation={disableAnimation}
            >
              {children}
            </AnimatedText>
          </code>
        );
      }
      return (
        <code className={className} style={style} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw] as Pluggable[]}
        components={components as Components}
      >
        {visibleContent}
      </ReactMarkdown>
      
      {useVirtualization && !isFullyRendered && (
        <div 
          ref={observerRef} 
          className="h-12 flex items-center justify-center text-gray-500 text-sm"
        >
          Loading more content...
        </div>
      )}
    </div>
  );
};

// Use React.memo with custom comparison function to prevent unnecessary re-renders
export const AnimatedMarkdown = memo(
  AnimatedMarkdownComponent,
  (prevProps, nextProps) => {
    // Only re-render if content or messageId changes
    return (
      prevProps.content === nextProps.content &&
      prevProps.messageId === nextProps.messageId
    );
  }
);