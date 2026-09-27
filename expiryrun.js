// expiryrun.js：按清理预算清理并留账
import { isExpired, dropToken } from "./tokenbag.js";

function freshState(state) {
  const src = state || {};
  return {
    live: Object.assign({}, src.live),
    revoked: (src.revoked || []).slice(),
    expired: (src.expired || []).slice(),
    ledger: (src.ledger || []).slice(),
    applied: (src.applied || []).slice()
  };
}

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function isString(value) {
  return typeof value === "string";
}

function isTime(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// 按剩余预算把账上的令牌真正清进已清理序列，返回本次清掉的个数。
function drain(state, budgetLeft) {
  let cleaned = 0;
  while (budgetLeft > 0 && state.ledger.length > 0) {
    state.expired.push(state.ledger.shift());
    cleaned += 1;
    budgetLeft -= 1;
  }
  return cleaned;
}

export function step(spec) {
  const state = freshState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  let budgetLeft = Math.max(0, Number(spec.budget) || 0);
  let cleaned = 0;
  const unknownCode = spec.unknown_error_code || "E_UNKNOWN_TOKEN";
  const duplicateCode = spec.duplicate_error_code || "E_DUPLICATE_TOKEN";
  const eventCode = spec.event_error_code || "E_BAD_EVENT";

  events.forEach(function (event, index) {
    if (!event || typeof event !== "object") {
      fail(eventCode, "事件不是对象");
    }
    const identity = event.id !== undefined ? event.id : index;
    if (state.applied.indexOf(identity) !== -1) {
      return;
    }

    if (event.kind === "issue") {
      if (!isString(event.token) || !isTime(event.expires_at)) {
        fail(eventCode, "issue 事件缺 token 或 expires_at");
      }
      if (Object.prototype.hasOwnProperty.call(state.live, event.token)) {
        fail(duplicateCode, "重复签发令牌 " + event.token);
      }
      state.live[event.token] = event.expires_at;
    } else if (event.kind === "revoke") {
      if (!isString(event.token)) {
        fail(eventCode, "revoke 事件缺 token");
      }
      if (!Object.prototype.hasOwnProperty.call(state.live, event.token)) {
        fail(unknownCode, "未知令牌 " + event.token);
      }
      dropToken(state.live, event.token);
      state.revoked.push(event.token);
    } else if (event.kind === "sweep") {
      if (!isTime(event.now)) {
        fail(eventCode, "sweep 事件缺 now");
      }
      Object.keys(state.live).forEach(function (token) {
        if (isExpired([token, state.live[token]], event.now)) {
          dropToken(state.live, token);
          state.ledger.push(token);
        }
      });
    } else {
      fail(eventCode, "不认识的事件类型 " + event.kind);
    }

    state.applied.push(identity);
    const took = drain(state, budgetLeft);
    budgetLeft -= took;
    cleaned += took;
  });

  return {
    state: state,
    cleaned: cleaned,
    ledger_before: state.ledger.length,
    ledger: state.ledger.slice(),
    judged: cleaned,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = freshState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    state.expired.push(state.ledger.shift());
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
