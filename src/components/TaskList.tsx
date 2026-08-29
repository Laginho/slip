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
  /**
   * The screen's layout breakpoint, owned by App (inline styles cannot carry a media
   * query). False is the phone: a single bottom-anchored column, byte-for-byte as it
   * has always been. True turns each section into the post-it wall: a responsive
   * grid across the full width, Cards at natural height so bottoms stay uneven.
   * Reading order is unchanged -- grid auto-placement fills left-to-right,
   * top-to-bottom, and the dateless section still follows the dated one.
   */
  wide: boolean;
  /** All three report whether the change persisted; false means storage refused it. */
  onComplete: (task: Task) => boolean;
  onDelete: (task: Task) => boolean;
  onEdit: (task: Task, text: string) => boolean;
};

const LIST: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

/**
 * The wall. auto-fill with a 280px floor buys more columns as the viewport grows.
 * alignItems:start keeps every Card at its natural height instead of stretching to
 * its row -- uneven bottoms are the accepted aesthetic, not a bug to pack away.
 */
const WALL: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 16,
  alignItems: "start",
};

export function TaskList({ tasks, now, wide, onComplete, onDelete, onEdit }: Props) {
  const open = openTasks(tasks);
  if (open.length === 0) {
    return (
      <p style={{ color: TEXT_QUIET, textAlign: "center", margin: 0 }}>nada por aqui</p>
    );
  }

  // Order within each section stays exactly as openTasks returned it.
  const dated = open.filter((task) => task.deadline !== null);
  const dateless = open.filter((task) => task.deadline === null);
  const section = wide ? WALL : LIST;

  const card = (task: Task) => (
    <Card
      key={task.id}
      task={task}
      now={now}
      wide={wide}
      onComplete={onComplete}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  );

  return (
    <>
      {dated.length > 0 && (
        <ul role="list" style={section}>
          {dated.map(card)}
        </ul>
      )}
      {dateless.length > 0 && (
        <ul role="list" style={dated.length > 0 ? { ...section, marginTop: 24 } : section}>
          {dateless.map(card)}
        </ul>
      )}
    </>
  );
}
