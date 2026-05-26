import { Typography } from "@/components/nowts/typography";

type Props = {
  message: string;
};

export function EmptyRow({ message }: Props) {
  return (
    <div className="py-3">
      <Typography variant="muted" className="text-[13px]">
        {message}
      </Typography>
    </div>
  );
}
