import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ul: ({ ...props }) => (
            <ul className="mb-2 ml-4 list-disc" {...props} />
          ),

          ol: ({ ...props }) => (
            <ol className="mb-2 ml-4 list-decimal" {...props} />
          ),

          li: ({ ...props }) => (
            <li className="mb-1" {...props} />
          ),

          code: ({ ...props }) => (
            <code
              className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs dark:bg-white/10"
              {...props}
            />
          ),

          a: ({ ...props }) => (
            <a
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),

          table: ({ ...props }) => (
            <div className="my-4 w-full max-w-full overflow-x-auto">
              <table
                className="w-max min-w-full border-collapse"
                {...props}
              />
            </div>
          ),

          th: ({ ...props }) => (
            <th
              className="whitespace-nowrap border border-border px-3 py-2 text-left font-semibold"
              {...props}
            />
          ),

          td: ({ ...props }) => (
            <td
              className="border border-border px-3 py-2 align-top"
              {...props}
            />
          ),

          pre: ({ ...props }) => (
            <pre
              className="max-w-full overflow-x-auto rounded-md"
              {...props}
            />
          ),

          // Prevent long URLs / words from expanding the bubble
          p: ({ ...props }) => (
            <p className="break-words" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}