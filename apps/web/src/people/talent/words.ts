/** The words of the Talent screens (English only, like Team). */
export const T = {
  area: "Talent",
  skills: { title: "Skills", basisTitle: "How these levels are worked out",
    people: "People covered", gaps: "People with a gap",
    tracked: "Skills tracked", byPerson: "By person", bySkill: "By skill",
    find: "Find a person", gapsOnly: "Gaps only", shown: "{n} of {total}",
    person: "Person", skill: "Skill", family: "Area", who: "People",
    gapCol: "Below the level needed", none: "No gaps",
    below: "below the level needed", met: "at or above the level needed",
    notTracked: "Not tracked for this person", of: "{held} of {need}",
    levelLine: "Level {held}, level {need} needed",
    matrix: "Skills matrix", empty: "Nobody matches.",
    legend: "Each cell is the level held out of the level needed.",
    keyTitle: "Key", keyMet: "At or above the level needed",
    keyBelow: "Below the level needed", notTrackedShort: "Not tracked" },
  training: { title: "Training and learning",
    lede: "Courses, who has completed them and the sessions booked.",
    all: "All", required: "Required", optional: "Optional",
    course: "Course", progress: "Progress", session: "Next session",
    overdue: "{n} overdue", noneOverdue: "None overdue",
    noSession: "None booked", reqWord: "Required", optWord: "Optional",
    empty: "No courses to show.", teamLede: "Training for your team.",
    back: "Training and learning", completed: "Completed",
    booked: "Booked", todo: "To do", people: "People", about: "About",
    provider: "Provider", audience: "Who it is for", status: "Status",
    repeats: "Repeats", every: "Every {n} days after completion",
    once: "Once", kind: "Kind", person: "Person", nextDue: "Next due",
    noOne: "Nobody on this course yet.", fictional: "Sample course" },
  surveys: { title: "Engagement surveys",
    lede: "Staff pulse surveys: results for the closed one and the date " +
      "of the next.",
    survey: "Survey", status: "Status", response: "Answers",
    closed: "Closed", scheduled: "Scheduled",
    window: "Open {from} to {to}", empty: "No surveys yet.",
    back: "Engagement surveys", score: "Engagement score",
    answered: "Answered", rate: "Response rate", opens: "Opens",
    closes: "Closes", invited: "People invited",
    results: "Results", groups: "By group", details: "Details",
    scoreNote: "The share of answers that were favourable.",
    group: "Group", answers: "Answers",
    why: "Groups with fewer than {n} answers are not shown on their " +
      "own, so nobody's answer can be picked out.",
    hiddenNote: "{n} groups are not shown for that reason.",
    hiddenOne: "1 group is not shown for that reason.",
    notYet: "Results appear after the survey closes on {date}.",
    anon: "Answers are anonymous." },
};

/** "{n}" style fill, as in team/words.ts. */
export function fill(text: string, v: Record<string, string | number>)
  : string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
}
