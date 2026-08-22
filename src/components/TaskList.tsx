import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Task } from "../store";
import { openTasks } from "../store";
import { TEXT_QUIET } from "../palette";
import { Card } from "./Card";

/**
 * Every Open Task, drawn, in the order the store selector gives -- this file never
 * re-sorts. Tasks with a Deadline come first; dateless ones sit in their own section
 * below, separated by whitespace only.
 *
 * Owns the list's single clock and passes it to each Card as `now`, refreshing on
 * window focus and on visibilitychange: a Card due today must read as due today after
 * local midnight without a reload.
 *
 * Each section is a <ul>; Card renders the <li>.
 */

type Props = {
  tasks: Task[];
};

const LIST: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export function TaskList({ tasks }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const open = openTasks(tasks);
  if (open.length === 0) {
    return (
      <p style={{ color: TEXT_QUIET, textAlign: "center", margin: 0 }}>nada por aqui</p>
    );
  }

  // Order within each section stays exactly as openTasks returned it.
  const dated = open.filter((task) => task.deadline !== null);
  const dateless = open.filter((task) => task.deadline === null);

  return (
    <>
      {dated.length > 0 && (
        <ul style={LIST}>
          {dated.map((task) => (
            <Card key={task.id} task={task} now={now} />
          ))}
        </ul>
      )}
      {dateless.length > 0 && (
        <ul style={dated.length > 0 ? { ...LIST, marginTop: 24 } : LIST}>
          {dateless.map((task) => (
            <Card key={task.id} task={task} now={now} />
          ))}
        </ul>
      )}
    </>
  );
}
