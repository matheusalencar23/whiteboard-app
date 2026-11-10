import { useRef, useState } from "react";

interface InlineEditProps {
  value: string;
  label: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onCommit: (value: string) => void;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  title?: string;
  as?: "h1" | "h2" | "span";
}

type EditorProps = Pick<InlineEditProps, "value" | "label" | "maxLength" | "onCommit"> & {
  className?: string;
  onCancel: () => void;
};

function Editor({ value, label, maxLength, className, onCommit, onCancel }: EditorProps) {
  const [draft, setDraft] = useState(value);
  const finished = useRef(false);

  function finish(action: () => void) {
    if (finished.current) return;
    finished.current = true;
    action();
  }

  return (
    <input
      className={className}
      value={draft}
      maxLength={maxLength}
      aria-label={label}
      autoFocus
      size={Math.max(draft.length, 8)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(() => onCommit(draft))}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(() => onCommit(draft));
        else if (e.key === "Escape") finish(onCancel);
      }}
    />
  );
}

export function InlineEdit({
  value,
  label,
  editing,
  onEditingChange,
  onCommit,
  maxLength,
  className,
  inputClassName,
  title = "Duplo clique para renomear",
  as: Tag = "span",
}: InlineEditProps) {
  if (editing) {
    return (
      <Editor
        value={value}
        label={label}
        maxLength={maxLength}
        className={inputClassName}
        onCommit={(draft) => {
          onEditingChange(false);
          onCommit(draft);
        }}
        onCancel={() => onEditingChange(false)}
      />
    );
  }

  return (
    <Tag className={className} title={title} onDoubleClick={() => onEditingChange(true)}>
      {value}
    </Tag>
  );
}
