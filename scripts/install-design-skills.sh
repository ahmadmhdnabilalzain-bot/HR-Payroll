#!/usr/bin/env bash
# Installs third-party design and animation skills (skill files only:
# no hooks, no MCP servers) at pinned commits into ~/.claude/skills.
# Re-run in any new session. Review docs/third-party-skills.md first.
set -euo pipefail
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$DEST"

# name  repo  commit  paths-to-skill-dirs (space separated)
install_set() {
  local repo="$1" sha="$2"; shift 2
  git clone --quiet --filter=blob:limit=2m \
    "https://github.com/$repo" "$WORK/r"
  git -C "$WORK/r" checkout --quiet "$sha"
  for p in "$@"; do
    rm -rf "$DEST/$(basename "$p")"
    cp -R "$WORK/r/$p" "$DEST/$(basename "$p")"
    echo "installed $(basename "$p") from $repo@${sha:0:7}"
  done
  rm -rf "$WORK/r"
}

U=nextlevelbuilder/ui-ux-pro-max-skill
install_set "$U" b73ee96f8d4ff7bbc279c52dadcd907ffe23629c \
  .claude/skills/ui-ux-pro-max .claude/skills/design-system \
  .claude/skills/ui-styling
install_set pbakaus/impeccable 2fc5e1459efbbf06d92c7306517c286bf12490cf \
  .claude/skills/impeccable
G=greensock/gsap-skills
install_set "$G" aed9cfd3277740755f6bfc1155c7aa645403b760 \
  skills/gsap-core skills/gsap-timeline skills/gsap-scrolltrigger \
  skills/gsap-react skills/gsap-plugins skills/gsap-utils \
  skills/gsap-performance skills/gsap-frameworks
install_set cathrynlavery/diagram-design \
  b228c5d77794a84150fca41b22940bb316b1398d skills/diagram-design

# Agent Reach (read-only web/social reader): CLI in an isolated venv from
# the pinned source with its own constraints file, plus its skill file.
# No logins are configured; default no-login channels only.
AR="$WORK/agent-reach"
git clone --quiet --filter=blob:limit=2m \
  https://github.com/Panniantong/Agent-Reach "$AR"
git -C "$AR" checkout --quiet 8d9ecc1f5521fe7d223cde782aaa4005695e2671
python3 -m venv "$HOME/.agent-reach-venv"
"$HOME/.agent-reach-venv/bin/pip" install -q -c "$AR/constraints.txt" "$AR"
mkdir -p "$HOME/.local/bin" "$DEST/agent-reach"
ln -sf "$HOME/.agent-reach-venv/bin/agent-reach" "$HOME/.local/bin/agent-reach"
cp -R "$AR/agent_reach/skill/." "$DEST/agent-reach/"
echo "installed agent-reach (CLI + skill)"
