import {
  CheckInCreate,
  Goal,
  GoalCreate,
  GoalList,
  GoalQuery,
  GoalUpdate,
} from "./goals";
import { IdParams } from "./primitives";
import { ALL_ROLES, ten, type RouteDef } from "./route-def";

const one = { params: IdParams };

/** Plan 8 Task 8: goals and check-ins (all roles, scoped). */
export const GOAL_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listGoals", method: "GET", path: "/v1/goals",
    query: GoalQuery, response: GoalList }),
  ten(ALL_ROLES, { id: "createGoal", method: "POST", path: "/v1/goals",
    body: GoalCreate, response: Goal, status: 201 }),
  ten(ALL_ROLES, { id: "getGoal", method: "GET", path: "/v1/goals/{id}",
    ...one, response: Goal }),
  ten(ALL_ROLES, { id: "updateGoal", method: "PATCH",
    path: "/v1/goals/{id}", ...one, body: GoalUpdate, response: Goal }),
  ten(ALL_ROLES, { id: "addGoalCheckIn", method: "POST",
    path: "/v1/goals/{id}/check-ins", ...one, body: CheckInCreate,
    response: Goal, status: 201 }),
];
