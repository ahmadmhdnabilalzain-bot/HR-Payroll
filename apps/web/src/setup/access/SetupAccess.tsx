import { navigate } from "../../demo/route";
import type { ViewProps } from "../../views";
import { Hooks, HookRecord, Keys } from "./Connections";
import { Import, Location } from "./Data";
import { Review } from "./Review";
import { ApprovalRules, Separation, SignIn } from "./Rules";
import { Loading } from "./ui";
import { useAccess } from "./useAccess";
import { PermissionRecord, RoleRecord, RolesList, UserRecord, UsersList,
  WhoList, NotFound } from "./Users";
import { hrefOf } from "../../demo/route";

/**
 * The Setup screens for access, connections and data (WP9). Routes:
 * `#/setup/access/...`, `#/setup/connections/...`, `#/setup/data/...`.
 */
export function SetupAccess(p: ViewProps) {
  const d = useAccess();
  const [group = "", page = "", id, tab = ""] = p.rest;
  if (d === null) return <Loading />;
  const onTab = (t: string): void => navigate("setup", group, page,
    id ?? "", t);
  switch (`${group}/${page}`) {
    case "access/users":
      return id === undefined ? <UsersList d={d} />
        : <UserRecord d={d} id={id} tab={tab} onTab={onTab} />;
    case "access/roles":
      return id === undefined ? <RolesList d={d} />
        : <RoleRecord d={d} id={id} tab={tab} onTab={onTab} />;
    case "access/who":
      return id === undefined ? <WhoList d={d} />
        : <PermissionRecord d={d} id={id} />;
    case "access/rules": return <ApprovalRules d={d} />;
    case "access/separation": return <Separation d={d} />;
    case "access/sign-in": return <SignIn d={d} />;
    case "access/review": return <Review d={d} />;
    case "connections/keys": return <Keys d={d} />;
    case "connections/hooks":
      return id === undefined ? <Hooks d={d} />
        : <HookRecord d={d} id={id} tab={tab} onTab={onTab} />;
    case "data/import": return <Import d={d} />;
    case "data/location": return <Location d={d} />;
    default: return <NotFound back={hrefOf("s", "setup")} />;
  }
}
