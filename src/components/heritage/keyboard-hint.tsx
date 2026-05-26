type Props = {
  keyName: string;
  label: string;
  onClick?: () => void;
};

export function KeyboardHint({ keyName, label, onClick }: Props) {
  const className = "hz-mono border border-[var(--hz-border)] px-1 text-[12px]";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} cursor-pointer bg-transparent hover:bg-[var(--hz-accent)] hover:text-white`}
      >
        [{keyName} {label}]
      </button>
    );
  }

  return (
    <span className={className}>
      [{keyName} {label}]
    </span>
  );
}
