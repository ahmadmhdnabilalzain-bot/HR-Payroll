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

# Cloudroom: only its four general-purpose skills (no app, no runtime).
install_set davidondrej/cloudroom d87487dc2a178b176cce2323a4e48b705d18dccf \
  skills/risky-changes skills/decisions skills/adr-verbatim skills/file-tree

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

# --- Batch 3 (2026-11-26): earshot, Magic UI, UI SFX, Hover.css ---
# earshot: its two skill files plus the CLI in an isolated venv from the
# pinned commit (core dependencies only; no listening models, no MCP).
install_set Leonxlnx/earshot 7a7f7c5c70d4a763a1eca4b3666af7c77e313f97 \
  skills/earshot skills/real-sound
python3 -m venv "$HOME/.earshot-venv"
"$HOME/.earshot-venv/bin/pip" install -q \
  "earshot @ git+https://github.com/Leonxlnx/earshot@7a7f7c5c70d4a763a1eca4b3666af7c77e313f97"
mkdir -p "$HOME/.local/bin"
ln -sf "$HOME/.earshot-venv/bin/earshot" "$HOME/.local/bin/earshot"
# Magic UI: its skill file only (components are not added to any product).
install_set magicuidesign/magicui a54d9edd7bd01dfb4fa72641df2b84da449a5e35 \
  skills/magic-ui
# Reference copies (no skill files; read-only, not product dependencies):
# ~/vendor/uisfx (MIT code, CC0 audio) and ~/vendor/Hover (see licence note).
vendor_ref() {
  local repo="$1" sha="$2" name="$3"
  git clone --quiet --filter=blob:limit=2m "https://github.com/$repo" "$WORK/v"
  git -C "$WORK/v" checkout --quiet "$sha"
  mkdir -p "$HOME/vendor"
  rm -rf "${HOME:?}/vendor/${name:?}"
  cp -R "$WORK/v" "$HOME/vendor/$name"
  rm -rf "${HOME:?}/vendor/${name:?}/.git" "$WORK/v"
  echo "vendored $name from $repo@${sha:0:7}"
}
vendor_ref romainsimon/uisfx 9950fe66f993a6660dab9c2651dcbcd899ffd83b uisfx
vendor_ref IanLunn/Hover eb8629df13850d78bbcccd4fed68d231aec0c535 Hover
