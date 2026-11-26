import { hrefOf } from "../../demo/route";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import type { AccessData, PermissionView } from "./data";
import { Status } from "./ui";
import s from "./access.module.css";

const AREAS = ["Self-service", "People", "Time", "Pay", "Reports", "Setup"];
const base = (...r: string[]): string => hrefOf("setup", "access", ...r);

const isAdmin = (d: AccessData, rolesText: string): boolean =>
  d.roles.some((r) => r.admin && rolesText.split(", ").includes(r.label));

/** The permissions a list of ids holds, grouped under their area. */
function ByArea(p: { d: AccessData; ids: string[] }) {
  return (
    <div className={s.group}>
      {AREAS.map((area) => {
        const rows = p.d.permissions.filter((x) => x.area === area &&
          p.ids.includes(x.id));
        return rows.length === 0 ? null : (
          <section key={area} aria-label={area}>
            <h2 className={s.blockTitle}>{area}</h2>
            <ul className={s.panel}>
              {rows.map((x) => (
                <li key={x.id} className={s.item}>{x.label}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** S20: the people who can sign in with more than the Employee role. */
export function UsersList(p: { d: AccessData }) {
  const { d } = p;
  return (
    <FilterList title="Users and roles"
      lede={`${d.users.length} people hold a role beyond Employee. ` +
        d.matrix.employeeOnlyText}
      rows={d.users} rowKey={(u) => u.id}
      searchText={(u) => `${u.name} ${u.jobText} ${u.rolesText} ${u.email}`}
      rowHref={(u) => base("users", u.id)}
      segments={[{ id: "all", label: "Everyone", match: () => true },
        { id: "admin", label: "Admin roles",
          match: (u) => isAdmin(d, u.rolesText) },
        { id: "nostep", label: "No second step",
          match: (u) => u.mfaText !== "On" }]}
      columns={[{ key: "n", label: "Person", render: (u) => u.name },
        { key: "r", label: "Role", render: (u) => u.rolesText },
        { key: "m", label: "Second step", render: (u) => (
          <Status tone={u.mfaText === "On" ? "ok"
            : isAdmin(d, u.rolesText) ? "danger" : "warn"}>
            {u.mfaText}
          </Status>) },
        { key: "l", label: "Last sign-in", end: true,
          render: (u) => u.lastSignInText }]}
      empty="No one matches. Clear the search to see everyone." />
  );
}

export function UserRecord(p: { d: AccessData; id: string; tab: string;
  onTab(t: string): void }) {
  const { d } = p;
  const u = d.users.find((x) => x.id === p.id);
  if (u === undefined) return <NotFound back={base("users")} />;
  return (
    <RecordTabs title={u.name} lede={`${u.jobText}, ${u.email}`}
      back={{ label: "Users and roles", href: base("users") }}
      stats={[{ label: "Role", value: u.rolesText },
        { label: "Second step", value: u.mfaText },
        { label: "Last sign-in", value: u.lastSignInText }]}
      tab={p.tab === "signin" ? "signin" : "can"} onTab={p.onTab}
      tabs={[{ id: "can", label: "What they can do", render: () => (
        <ByArea d={d} ids={d.userPermissions[u.id] ?? []} />) },
      { id: "signin", label: "Sign-in", render: () => (
        <KeyValues items={[{ label: "Work e-mail", value: u.email },
          { label: "Second sign-in step", value: u.mfaText },
          { label: "Added", value: u.createdText },
          { label: "Last sign-in", value: u.lastSignInText },
          { label: "Employee record", value: (
            <a href={hrefOf("people", u.employeeId)}>Open the record</a>)
          }]} />) }]} />
  );
}

export function RolesList(p: { d: AccessData }) {
  const { d } = p;
  return (
    <FilterList title="Roles"
      lede="What each role can do, and who holds it. A role is a set of
        actions; people can hold more than one."
      rows={d.roles} rowKey={(r) => r.id}
      searchText={(r) => `${r.label} ${r.description}`}
      rowHref={(r) => base("roles", r.id)}
      columns={[{ key: "n", label: "Role", render: (r) => r.label },
        { key: "d", label: "In short", render: (r) => r.description },
        { key: "m", label: "Second step", render: (r) => (
          r.admin ? "Required" : "Optional") },
        { key: "c", label: "People", end: true,
          render: (r) => r.userCount }]}
      empty="No roles match." />
  );
}

export function RoleRecord(p: { d: AccessData; id: string; tab: string;
  onTab(t: string): void }) {
  const { d } = p;
  const r = d.roles.find((x) => x.id === p.id);
  if (r === undefined) return <NotFound back={base("roles")} />;
  const everyone = r.id === "employee";
  return (
    <RecordTabs title={r.label} lede={r.description}
      back={{ label: "Roles", href: base("roles") }}
      stats={[{ label: "People", value: r.userCount },
        { label: "Actions", value: `${r.permissionIds.length} of ${
          d.permissions.length}` },
        { label: "Second step", value: r.admin ? "Required" : "Optional" }]}
      tab={p.tab === "people" ? "people" : "can"} onTab={p.onTab}
      tabs={[{ id: "can", label: "What it can do", render: () => (
        <ByArea d={d} ids={r.permissionIds} />) },
      { id: "people", label: "People", render: () => everyone ? (
        <p className={s.note}>Everyone who works here holds this role.</p>
      ) : r.holders.length === 0 ? (
        <p className={s.note}>No one holds this role now.</p>
      ) : (
        <ul className={s.panel}>
          {r.holders.map((u) => (
            <li key={u.id}>
              <a className={s.item} href={base("users", u.id)}>
                <span className={s.itemMain}>
                  <span>{u.name}</span><small>{u.jobText}</small>
                </span>
              </a>
            </li>
          ))}
        </ul>) }]} />
  );
}

/** Who can do what: answers "who can approve a pay run?". */
export function WhoList(p: { d: AccessData }) {
  const { d } = p;
  return (
    <FilterList title="Who can do what"
      lede="Pick an action to see the people who can do it today."
      rows={d.permissions} rowKey={(x) => x.id}
      searchText={(x) => `${x.label} ${x.area} ${x.roleLabels.join(" ")}`}
      rowHref={(x) => base("who", x.id)}
      segments={[{ id: "all", label: "All", match: () => true },
        ...["Pay", "People", "Setup"].map((a) => ({ id: a, label: a,
          match: (x: PermissionView) => x.area === a }))]}
      columns={[{ key: "n", label: "Action", render: (x) => x.label },
        { key: "a", label: "Area", render: (x) => x.area },
        { key: "r", label: "Roles", render: (x) => x.roleLabels.length > 2
          ? `${x.roleLabels.length} roles` : x.roleLabels.join(", ") },
        { key: "p", label: "People", end: true, render: (x) =>
          x.id === "self.view-own" ? "Everyone" : x.people.length }]}
      empty="No action matches." />
  );
}

export function PermissionRecord(p: { d: AccessData; id: string }) {
  const x = p.d.permissions.find((y) => y.id === p.id);
  if (x === undefined) return <NotFound back={base("who")} />;
  const all = x.id === "self.view-own";
  return (
    <RecordTabs title={x.label} lede={`Area: ${x.area}.`}
      back={{ label: "Who can do what", href: base("who") }}
      stats={[{ label: "People", value: all ? "Everyone" : x.people.length },
        { label: "Roles", value: x.roleLabels.length }]}
      tabs={[{ id: "people", label: "People", render: () => all ? (
        <p className={s.note}>Every employee can do this for themselves.</p>
      ) : (
        <ul className={s.panel}>
          {x.people.map((w) => (
            <li key={w.employeeId}>
              <a className={s.item} href={base("users", `usr-${
                w.employeeId.slice(4)}`)}>
                <span className={s.itemMain}>
                  <span>{w.name}</span><small>{w.rolesText}</small>
                </span>
              </a>
            </li>
          ))}
        </ul>) },
      { id: "roles", label: "Roles", render: () => (
        <ul className={s.panel}>
          {x.roleLabels.map((l) => <li key={l} className={s.item}>{l}</li>)}
        </ul>) }]} />
  );
}

export function NotFound(p: { back: string }) {
  return (
    <div className={s.loading}>
      <p>We could not find that. <a href={p.back}>Go back to the list</a>.</p>
    </div>
  );
}
