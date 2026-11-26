import { useDemo } from "../../demo/state";
import { FilterList } from "../../ui/templates";
import { Status } from "../team/common";
import { talentHref } from "./common";
import { Survey } from "./Survey";
import { fill, T } from "./words";

const W = T.surveys;

/**
 * P65, Engagement surveys: the closed September survey and the
 * scheduled December one. A survey opens as its own page.
 */
export function Surveys(p: { rest: string[] }) {
  const { data } = useDemo();
  const rows = data.talent.surveys();
  if (p.rest[0] !== undefined) {
    return <Survey view={rows.find((x) => x.id === p.rest[0]) ?? null}
      minGroup={data.talent.minGroup} />;
  }
  return (
    <FilterList title={W.title} lede={W.lede} rows={rows}
      rowKey={(x) => x.id}
      rowHref={(x) => talentHref("surveys", x.id)}
      columns={[
        { key: "n", label: W.survey, render: (x) => (
          <span>
            <span>{x.name}</span>{" "}
            <span className="visually-hidden">
              {fill(W.window, { from: x.opensOn.display,
                to: x.closesOn.display })}</span>
          </span>) },
        { key: "w", label: W.window.split(" {")[0] ?? "", render: (x) =>
          fill(W.window, { from: x.opensOn.display,
            to: x.closesOn.display }) },
        { key: "s", label: W.status, render: (x) => (
          <Status tone={x.status === "closed" ? "ok" : "open"}>
            {x.status === "closed" ? W.closed : W.scheduled}</Status>) },
        { key: "r", label: W.response, render: (x) => x.display.response },
      ]}
      empty={W.empty} />
  );
}
