import { useEffect, useState } from "react";

function formatNow(date: Date): string {
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })} ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export function SystemClock() {
  const [now, setNow] = useState(() => formatNow(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(formatNow(new Date()));
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="hidden rounded-lg border border-text-secondary/20 bg-background px-3 py-2 text-xs font-medium text-text-secondary md:block">
      {now}
    </div>
  );
}
