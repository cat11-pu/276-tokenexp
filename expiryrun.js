// expiryrun.js：按清理预算清理并留账
import { isExpired, dropToken } from "./tokenbag.js";

function codeOf(spec, key, fallback) {
  const code = spec && spec[key];
  return typeof code === "string" && code ? code : fallback;
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const src = state || {};
  return {
    live: Object.assign({}, src.live),
    revoked: (src.revoked || []).slice(),
    expired: (src.expired || []).slice(),
    ledger: (src.ledger || []).slice(),
    applied: (src.applied || []).slice()
  };
}

function drain(state, remaining) {
  let cleaned = 0;
  while (state.ledger.length > 0 && cleaned < remaining) {
    const token = state.ledger.shift();
    state.expired.push(token);
    cleaned += 1;
  }
  return cleaned;
}

export function step(spec) {
  const source = spec || {};
  const codes = {
    unknown: codeOf(source, "unknown_error_code", "E_UNKNOWN_TOKEN"),
    duplicate: codeOf(source, "duplicate_error_code", "E_DUPLICATE_TOKEN"),
    bad: codeOf(source, "event_error_code", "E_BAD_EVENT")
  };
  const state = cloneState(source.state);
  const events = Array.isArray(source.events) ? source.events : [];
  const budget = typeof source.budget === "number" ? source.budget : 0;
  let remaining = budget;
  let cleaned = 0;
  let judged = 0;

  events.forEach(function (event, index) {
    if (!event || typeof event !== "object" || typeof event.kind !== "string") {
      fail(codes.bad, "bad event");
    }
    const id = event.id !== undefined ? event.id : index;
    if (state.applied.indexOf(id) !== -1) return;
    if (event.kind === "issue") {
      if (typeof event.token !== "string" || typeof event.expires_at !== "number") {
        fail(codes.bad, "bad event");
      }
      if (Object.prototype.hasOwnProperty.call(state.live, event.token)) {
        fail(codes.duplicate, "duplicate token " + event.token);
      }
      state.live[event.token] = event.expires_at;
    } else if (event.kind === "revoke") {
      if (typeof event.token !== "string") fail(codes.bad, "bad event");
      if (!Object.prototype.hasOwnProperty.call(state.live, event.token)) {
        fail(codes.unknown, "unknown token " + event.token);
      }
      state.live = dropToken(state.live, event.token);
      state.revoked.push(event.token);
    } else if (event.kind === "sweep") {
      if (typeof event.now !== "number") fail(codes.bad, "bad event");
      Object.keys(state.live).forEach(function (token) {
        if (isExpired([token, state.live[token]], event.now)) {
          state.live = dropToken(state.live, token);
          state.ledger.push(token);
        }
      });
    } else {
      fail(codes.bad, "bad event");
    }
    state.applied.push(id);
    judged += 1;
    if (remaining > 0 && state.ledger.length > 0) {
      const done = drain(state, remaining);
      cleaned += done;
      remaining -= done;
    }
  });

  return {
    state: state,
    cleaned: cleaned,
    ledger_before: state.ledger.length,
    ledger: state.ledger.slice(),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const source = spec || {};
  const state = cloneState(source.state);
  const catchup = drain(state, state.ledger.length);
  return { state: state, catchup: catchup };
}
