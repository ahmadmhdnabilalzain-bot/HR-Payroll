# Third-party skills and libraries

Requested by the owner on 2026-11-26. Everything here is pinned to the
commit that was inspected. Re-install in a new session with
`scripts/install-design-skills.sh` (skill files go to `~/.claude/skills`).

Vetting done before install: cloned, read the skill text, scanned the
skill files for prompt-injection phrases and the shipped scripts for
network and process calls. Targeted scan, not a full code audit. Skills
only; no hooks and no MCP servers were installed.

## Installed (skills)

| Skill | Source | Pinned commit |
|---|---|---|
| ui-ux-pro-max, design-system, ui-styling | nextlevelbuilder/ui-ux-pro-max-skill | b73ee96 |
| impeccable | pbakaus/impeccable | 2fc5e14 |
| gsap-core, -timeline, -scrolltrigger, -react, -plugins, -utils, -performance, -frameworks | greensock/gsap-skills | aed9cfd |
| diagram-design | cathrynlavery/diagram-design | b228c5d |
| risky-changes, decisions, adr-verbatim, file-tree | davidondrej/cloudroom | d87487d |
| agent-reach (CLI in `~/.agent-reach-venv` + skill) | Panniantong/Agent-Reach | 8d9ecc1 |

Agent Reach: read-only, default no-login channels, no accounts
configured. Never give it passwords or cookies. Social media insights in
the product use the official platform APIs, not this tool.

## Libraries: not installed yet (added when web screens start)

GSAP (greensock/GSAP), Motion (motiondivision/motion), react-motion,
Ant Design, Material UI, Remotion, Motion Canvas, HyperFrames. These are
npm dependencies for `apps/web`; adding them now would only cause
lockfile conflicts with the parallel builds. They go in once the design
concept is chosen (concepts use GSAP and Motion via CDN meanwhile).

## Reference only (cloned, not installed)

awesome-design-md, system-design-101, design-resources-for-developers,
open-design (562 skills; too large and overlapping to install blindly),
OpenMontage (video pipeline), video-shotcraft (already enabled as a
plugin).

## Not installed, with reasons

- headroomlabs-ai/headroom: a proxy that sits between the agent and the
  model and rewrites (compresses) every prompt. It would route all
  project data through third-party software and can drop detail that
  payroll rules depend on. Owner decision, on the owner's own machine.
- 21st-dev/magic-mcp: an MCP server that sends prompts to the 21st.dev
  service and needs their API key. Not installed without the owner
  choosing to create that account and key.
- Hooks shipped by impeccable (design checks on every edit): skipped to
  keep behaviour predictable.

## Cloudroom (davidondrej/cloudroom), partly installed

It is a desktop app plus a Rust service that runs coding agents in cloud
sandboxes. The app and service were not installed: they run on a desktop
or a server the owner controls and would host project code at a third
party. Only four of its generic skills were installed (risky-changes,
decisions, adr-verbatim, file-tree). Its other skills need the Cloudroom
runtime, a third-party search service key (deepapi), or scan the host
machine (malware-scan), so they were skipped.
