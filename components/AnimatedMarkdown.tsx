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

// Helper function to process children and apply word animations
const AnimatedText = ({
  children,
  wordIndexOffset,
}: {
  children: React.ReactNode;
  wordIndexOffset: React.MutableRefObject<number>;
}) => {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      const words = child.split(/(\s+)/); // Split by space, keeping spaces
      return words.map((word, index) => {
        if (word.trim() === "") {
          return <Fragment key={index}>{word}</Fragment>;
        }
        const currentWordIndex = wordIndexOffset.current;
        const delay = currentWordIndex * 12;
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
          <AnimatedText wordIndexOffset={wordIndexOffset}>
            {child.props.children}
          </AnimatedText>
        ),
      });
    }
    return child;
  });
};

// Define the component logic - focusing ONLY on markdown animation
const AnimatedMarkdownComponent: React.FC<AnimatedMarkdownProps> = ({
  content,
  messageId,
  onAnimationComplete,
}) => {
  // Use a ref to track if initial render animation has completed
  const hasAnimated = useRef(false);
  const wordIndexCounter = useRef(0);

  // Calculate total animation time on first render only
  useEffect(() => {
    // Skip animation if this component was already animated
    if (hasAnimated.current) {
      if (onAnimationComplete) {
        onAnimationComplete(0); // Immediately notify completion for re-renders
      }
      return;
    }

    // Mark as animated to prevent future re-animations
    hasAnimated.current = true;

    // Count all words in the content
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    // Calculate total animation time
    const wordDelay = 12;
    const wordAnimationDuration = 250; // Approximate duration of word fade in animation
    const elementAnimationDuration = 300; // Approximate duration of element fade in

    // Animation time is the delay of the last word + the animation duration
    const lastWordDelay = wordCount > 0 ? (wordCount - 1) * wordDelay : 0;
    const calculatedTime = lastWordDelay + wordAnimationDuration;

    // Add a bit more time for complex markdown elements
    const hasMdElements =
      content.includes("#") ||
      content.includes("```") ||
      content.includes("- ") ||
      content.includes("* ") ||
      (content.includes("[") && content.includes("]("));

    const complexityBuffer = hasMdElements ? elementAnimationDuration : 0;

    // Set the total animation time
    const totalTime = calculatedTime + complexityBuffer + 300; // Added buffer

    // Set a timer to call onAnimationComplete when animation finishes
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete(totalTime);
      }
    }, totalTime);

    return () => clearTimeout(timer);
  }, [content, onAnimationComplete, messageId]); // Add messageId to dependencies to ensure unique animations per message

  // Reset word counter whenever content changes
  useEffect(() => {
    wordIndexCounter.current = 0;
  }, [content, messageId]); // Also reset on messageId change

  // Factory function to create animated components for standard HTML tags
  const createAnimatedComponent = <T extends ElementType>(
    elementType: T
  ): React.FC<ComponentPropsWithoutRef<T>> => {
    const AnimatedComponent: React.FC<ComponentPropsWithoutRef<T>> = (
      props
    ) => {
      const { children, ...restProps } = props as {
        children?: React.ReactNode;
      } & Omit<ComponentPropsWithoutRef<T>, "children">;
      const Element = elementType;
      const elementDelay = wordIndexCounter.current * 12;

      return (
        <Element
          {...(restProps as any)}
          className="animate-element"
          style={{ animationDelay: `${elementDelay}ms` }}
        >
          <AnimatedText wordIndexOffset={wordIndexCounter}>
            {children}
          </AnimatedText>
        </Element>
      );
    };
    AnimatedComponent.displayName = `Animated${
      typeof elementType === "string"
        ? elementType.charAt(0).toUpperCase() + elementType.slice(1)
        : "Component"
    }`;
    return AnimatedComponent;
  };

  // Custom renderers for text-containing elements using the factory
  const components: Partial<Components> = {
    p: createAnimatedComponent("p"),
    li: createAnimatedComponent("li"),
    h1: createAnimatedComponent("h1"),
    h2: createAnimatedComponent("h2"),
    h3: createAnimatedComponent("h3"),
    h4: createAnimatedComponent("h4"),
    h5: createAnimatedComponent("h5"),
    h6: createAnimatedComponent("h6"),
    pre: createAnimatedComponent("pre"),
    blockquote: createAnimatedComponent("blockquote"),
    td: createAnimatedComponent("td"),
    th: createAnimatedComponent("th"),
    code: ({ node, inline, className, children, style, ...props }: any) => {
      if (inline) {
        return (
          <code className={className} style={style} {...props}>
            <AnimatedText wordIndexOffset={wordIndexCounter}>
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
        {content}
      </ReactMarkdown>
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