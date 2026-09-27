// app.js：渲染结果
import { isExpired, dropToken } from "./tokenbag.js";
import { step, close } from "./expiryrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      live: state.live, revoked: state.revoked.slice().sort(), expired: state.expired,
      ledger: state.ledger, applied: state.applied.length
    });
  };
  const live = Object.keys(closed.state.live).sort().map(function (token) {
    return [token, closed.state.live[token]];
  });
  return { live: live, live_count: live.length, revoked: closed.state.revoked.slice(),
           expired: closed.state.expired.slice(),
           cleaned_first: first.cleaned, cleaned_wide: wide.cleaned,
           pair_differs: first.cleaned !== wide.cleaned,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.cleaned, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length, tail: isExpired([9, 1], 5) ? 1 : 0 + Object.keys(dropToken({}, "t")).length };
}
