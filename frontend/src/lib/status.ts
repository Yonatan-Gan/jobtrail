import {
  statusValues,
  type Status,
  type StatusTransitions,
} from "../api/types";

/**
 * The statuses with no way out (rejected, withdrawn, accepted, declined), worked out from
 * the backend's rules instead of a hard-coded list: a status is final when no move is allowed.
 */
export function finalStatuses(transitions: StatusTransitions): Set<Status> {
  return new Set(
    statusValues.filter((status) => transitions[status].length === 0),
  );
}

/** True when `value` is one of `values`, and tells TypeScript so (a type guard). */
export function isOneOf<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return (values as readonly string[]).includes(value);
}
