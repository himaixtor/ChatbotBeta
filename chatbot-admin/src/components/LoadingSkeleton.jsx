/** Table loading skeleton rows */
export default function LoadingSkeleton({ rows = 5, cols = 7 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j}>
              <div className="skeleton" style={{ width: j === 0 ? '80%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
