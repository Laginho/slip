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
 * Receives the screen's single clock and passes it to each Card. App owns that clock
 * because the Archive needs the same day boundary too: a Card due today and the
 * seven-day Archive window must turn over together after local midnight.
 *
 * Each section is a <ul>; Card renders the <li>.
 */

type Props = {
  tasks: Task[];
  now: Date;
  onComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task, text: string) => void;
};

const LIST: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export function TaskList({ tasks, now, onComplete, onDelete, onEdit }: Props) {
  const open = openTasks(tasks);
  if (open.length === 0) {
    return (
      <p style={{ color: TEXT_QUIET, textAlign: "center", margin: 0 }}>nada por aqui</p>
    );
  }

  // Order within each section stays exactly as openTasks returned it.
  const dated = open.filter((task) => task.deadline !== null);
  const dateless = open.filter((task) => task.deadline === null);

  const card = (task: Task) => (
    <Card
      key={task.id}
      task={task}
      now={now}
      onComplete={onComplete}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  );

  return (
    <>
      {dated.length > 0 && (
        <ul role="list" style={LIST}>
          {dated.map(card)}
        </ul>
      )}
      {dateless.length > 0 && (
        <ul role="list" style={dated.length > 0 ? { ...LIST, marginTop: 24 } : LIST}>
          {dateless.map(card)}
        </ul>
      )}
    </>
  );
}
