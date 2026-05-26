import * as React from "react";

export type DenseTableRow = { id: string; cells: readonly React.ReactNode[] };

type Props = {
  headers: readonly string[];
  rows: readonly DenseTableRow[];
  onActivate?: (row: DenseTableRow) => void;
};

export function DenseTable({ headers, rows, onActivate }: Props) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((c) => Math.min(c + 1, rows.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((c) => Math.max(c - 1, 0));
      } else if (event.key === "Enter" && onActivate) {
        event.preventDefault();
        onActivate(rows[index] as DenseTableRow);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows, index, onActivate]);

  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="bg-[var(--hz-bg-toolbar)]">
          {headers.map((header) => (
            <th
              key={header}
              className="hz-row border border-[var(--hz-border)] px-2 text-left font-normal"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id}
            className={i === index ? "bg-[var(--hz-accent)] text-white" : ""}
          >
            {row.cells.map((cell, j) => (
              <td
                key={j}
                className="hz-row hz-mono border border-[var(--hz-border)] px-2"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
