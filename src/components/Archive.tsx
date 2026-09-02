import { useState } from "react";
import type { CSSProperties } from "react";
import type { Task } from "../store";
import { archive } from "../store";
import { TEXT_QUIET } from "../palette";

/**
 * The Archive: every Done Task, kept forever, shown on request at the bottom of the
 * list -- a section, never a route. The store's archive() selector already excludes
 * deleted Tasks and sorts newest first; this file only chooses how much to display.
 *
 * Default view is Done Tasks from the last 7 days (a display choice -- storage keeps
 * everything, there is no retention setting and nothing is ever purged), with a link
 * to reach older ones.
 *
 * Rows are deliberately not Card: an archived Task is a record, not something to act
 * on, so there are no gestures, no hue, no Urgency -- just quiet struck-through text,
 * quieter than anything in the Open list above.
 */

type Props = {
  tasks: Task[];
  now: Date;
  open: boolean;
  onToggle: () => void;
};

const LIST: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const LINK: CSSProperties = {
  border: "none",
  background: "none",
  padding: "4px 0",
  color: TEXT_QUIET,
  fontSize: 14,
  textDecoration: "underline",
  cursor: "pointer",
};

export function Archive({ tasks, now, open, onToggle }: Props) {
  const [allTime, setAllTime] = useState(false);

  const done = archive(tasks);
  // Nothing has ever been finished: even the link would be noise.
  if (done.length === 0) return null;

  if (!open) {
    return (
      <p style={{ textAlign: "center", margin: "4px 0" }}>
        <button type="button" style={LINK} onClick={onToggle}>
          ver concluídas
        </button>
      </p>
    );
  }

  // "Last 7 days" means seven local calendar dates: today and the six before it.
  // App refreshes `now` at local midnight, so an always-open Archive drops the old
  // seventh day at the boundary without waiting for an unrelated render. Constructing
  // the cutoff by calendar components also survives 23/25-hour DST days.
  const recentSince = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
  ).getTime();
  const recent = done.filter((task) => task.updatedAt >= recentSince);
  const visible = allTime ? done : recent;

  return (
    <>
      <p style={{ textAlign: "center", margin: "4px 0" }}>
        <button type="button" style={LINK} onClick={onToggle}>
          ocultar concluídas
        </button>
      </p>

      {visible.length > 0 ? (
        <ul role="list" style={LIST}>
          {visible.map((task) => (
            <li key={task.id} style={{ listStyle: "none", fontSize: 16 }}>
              <span style={{ color: TEXT_QUIET, textDecoration: "line-through" }}>
                {task.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: TEXT_QUIET, textAlign: "center", margin: 0, fontSize: 14 }}>
          nada concluída nesta semana
        </p>
      )}

      {!allTime && done.length > recent.length && (
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          <button type="button" style={LINK} onClick={() => setAllTime(true)}>
            ver mais antigas
          </button>
        </p>
      )}
    </>
  );
}
