import type { ViewProps } from "../../views";
import { Outside } from "../team/common";
import { useMayTrain, useSeesAll } from "./common";
import { Skills } from "./Skills";
import { Surveys } from "./Surveys";
import { Training } from "./Training";

/**
 * `#/people/talent/<screen>`: skills, training and surveys (People,
 * Growth). Skills and surveys are for HR and the General manager;
 * training also opens for a manager, for their own team.
 */
export function Talent(p: ViewProps) {
  const all = useSeesAll();
  const train = useMayTrain();
  const [screen, ...rest] = p.rest;
  if (screen === "training") {
    return train ? <Training rest={rest} /> : <Outside />;
  }
  if (!all) return <Outside />;
  return screen === "surveys" ? <Surveys rest={rest} /> : <Skills />;
}
