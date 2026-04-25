import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MdBody({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral max-w-none prose-headings:font-semibold prose-a:text-[var(--vrr-teal)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
