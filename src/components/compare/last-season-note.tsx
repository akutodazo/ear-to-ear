/** 昨年の同じ頃（11-05）。年・作物・判断の日を分けて言う。昨年の写真は無い（今年の様子と見せない）。props だけで受け取る */
interface Props {
  lines: string[];
}

export function LastSeasonNote({ lines }: Props) {
  const [head, ...rest] = lines;
  return (
    <section className="season" aria-label="昨年の同じ頃">
      <h2 className="season-title">昨年の同じ頃</h2>
      <p className="season-head">{head}</p>
      {rest.map((line) => (
        <p key={line} className="season-line">
          {line}
        </p>
      ))}
    </section>
  );
}
