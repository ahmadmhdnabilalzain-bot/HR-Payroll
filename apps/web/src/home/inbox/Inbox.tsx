import { NoticeList } from "./NoticeList";
import { TaskList } from "./TaskList";
import s from "./inbox.module.css";

/** Tasks and notices side by side, as every Home ends. */
export function Inbox(p: { tasks?: number; notices?: number }) {
  return (
    <div className={s.grid}>
      <TaskList limit={p.tasks ?? 3} />
      <NoticeList limit={p.notices ?? 2} />
    </div>
  );
}
