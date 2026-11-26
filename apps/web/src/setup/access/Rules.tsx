import { SettingsPage } from "../../ui/templates";
import type { AccessData } from "./data";

/** S21: who decides each kind of request (read only in the demo). */
export function ApprovalRules(p: { d: AccessData }) {
  return (
    <SettingsPage title="Sign-off rules and limits"
      lede="Who decides each kind of request. The person who prepares
        something never decides it too."
      groups={[{ title: "Who decides", items: p.d.rules.map((r) => ({
        key: r.id, label: r.label, value: r.roleLabel,
        help: r.text })) }]}
      log={[]} />
  );
}

const permLabel = (d: AccessData, id: string): string =>
  d.permissions.find((x) => x.id === id)?.label ?? id;

/** S22: pairs of actions no one should hold together, checked today. */
export function Separation(p: { d: AccessData }) {
  const { d } = p;
  return (
    <SettingsPage title="Duties kept apart"
      lede={`Checked on today's ${d.users.length} users and their roles.
        Each line names two actions that one person should not hold.`}
      groups={[{ title: "Checks", items: d.checks.map((c) => ({
        key: c.id, label: c.label,
        value: c.breaches.length === 0 ? "Holds"
          : `${c.breaches.length} to fix`,
        help: `${permLabel(d, c.permissions[0])} and ${
          permLabel(d, c.permissions[1]).toLowerCase()}. ${
          c.breaches.length === 0 ? "No user holds both."
            : `Held together by ${c.breaches.map((b) =>
              d.names[b]).join(", ")}.`}` })) }]}
      log={[]} />
  );
}

/** S23: the second sign-in step and single sign-on. */
export function SignIn(p: { d: AccessData }) {
  const { d } = p;
  const without = d.users.filter((u) => u.mfaText !== "On");
  return (
    <SettingsPage title="Sign-in and second step"
      lede="How people prove who they are."
      groups={[{ title: "Second sign-in step", items: [
        { key: "mfa", label: "Admin roles", value: "Required",
          help: d.settings.mfaText },
        { key: "without", label: "Users without it",
          value: without.length === 0 ? "None"
            : String(without.length),
          help: without.length === 0 ? "Every user has it on."
            : `${without.map((u) => u.name).join(", ")}. None of them holds
              an admin role.` }] },
      { title: "Single sign-on", items: [{ key: "sso",
        label: "Company sign-in", value: "Not set up",
        help: d.settings.ssoText }] }]}
      log={[]} />
  );
}
