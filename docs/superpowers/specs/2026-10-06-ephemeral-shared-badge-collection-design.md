# Ephemeral Shared Badge Collection

## Goal

Make the five-star card a collection for one active portfolio visit. Progress
survives reloads, same-tab navigation, Back, and Forward; all concurrently open
portfolio tabs share it; and a new visit after every portfolio tab has closed
starts empty.

Two journey badges receive explicit meanings:

- **Reimagine** is earned only after a concept page opens and attention returns
  to a landing-page tab.
- **Read a case study** is earned and stamped when a case-study page opens, not
  when its poster is clicked and not after returning home.

## Collection Lifetime

Each document keeps its collection snapshot in `sessionStorage`. Open portfolio
documents synchronize live badge events through `BroadcastChannel`.

This gives the collection the desired lifetime:

- reload, Back, and Forward retain the tab's snapshot;
- a duplicated or separately opened portfolio tab requests the active snapshot
  and then receives live updates;
- closing one tab does not affect the remaining tabs;
- after the final portfolio tab closes, no channel peer or session snapshot
  remains, so the next ordinary visit begins empty;
- if cross-tab messaging is unavailable, the safe fallback is a per-tab session
  rather than permanent storage.

The previous `localStorage` key is no longer read and is removed during the
migration. Undo-close or full browser session restoration may restore a browser
page session; that browser-controlled restoration is treated as continuing the
restored tab rather than a new ordinary visit.

## Shared State Protocol

The badge store retains its public subscription API so `BadgeCard` and existing
hidden interactions do not need to know about transport details.

Internally it will:

1. load the current tab's snapshot from `sessionStorage`;
2. announce the tab on a badge-specific `BroadcastChannel`;
3. merge snapshots returned by live peers without duplicating badges;
4. publish each new badge to peer tabs; and
5. publish resets to every live tab.

Snapshot synchronization fills existing stars without replaying old
animations. A badge earned live in another tab is treated as a new earn event,
so visible cards update and identify the newly found star. A hidden landing tab
may delay its celebration until it becomes visible so the visitor does not miss
the feedback.

Badge order remains the order in which badges were found. The protocol merges
events by stable event identity and timestamp so concurrent tabs converge on
the same order.

## Reimagine Journey

Hovering or dwelling on a concept never awards Reimagine.

Activating a Figma Sound or Codex Bookmarks link creates a tab-scoped pending
journey containing the landing-page origin and concept destination.

A small shared concept-page bridge runs on both standalone concept documents.
When the destination actually loads, it marks the matching same-tab journey as
opened and broadcasts the opened destination to other live tabs.

The journey completes only when both conditions are true:

1. the requested concept page confirmed that it opened; and
2. the visitor returned attention to a landing page.

For normal navigation, `pageshow` after Back completes the journey. For a
foreground or background concept tab, returning focus or visibility to the
originating landing tab completes it. The journey is then consumed so later
focus changes cannot award it again.

All gallery alternatives use the same journey helper; their old linger/dwell
award paths are removed. The hint changes from lingering to visiting a concept
and returning.

## Read Journey

Landing-page clicks never earn Read. Surprise Rail, Mixr, and Reasons to Watch
explicitly mark their shared static navigation mount as a case-study arrival.
After `BadgeCard` has mounted on the destination, the shared static chrome
awards Read through a deliberate arrival API that is not blocked by the
landing-page interaction arming delay.

The destination card plays the stamp animation immediately. Other live
portfolio tabs receive the same live badge event and synchronize their card.
Returning Home shows Read as already collected and does not replay it.

Pinnables does not award Read because its current card opens an in-progress
external tool rather than a readable portfolio case study.

## Navigation Fixes

The previously approved navigation design remains part of this implementation:

- normalize trailing slashes before determining whether a route owns chrome;
- canonicalize redundant empty query punctuation without discarding meaningful
  query parameters;
- prevent the static case-study fallback navigation from painting its default
  large blue SVG before shared chrome hydrates; and
- apply both fixes to every affected route and static case-study document
  without duplicating the full navigation stylesheet.

## Testing

Automated tests cover:

- session snapshots replacing permanent local storage;
- peer joining, snapshot merge, live earn propagation, deduplication, ordering,
  and reset propagation;
- same-tab concept open plus Back;
- new-tab concept open plus focus return;
- no Reimagine award from hover/dwell or an unconfirmed concept click;
- Read awarded by each marked case-study arrival and never by landing clicks;
- Pinnables not awarding Read;
- canonical and trailing-slash chrome ownership;
- all static fallbacks reserving nav height without a default-size SVG; and
- removal of only the obsolete tests previously approved for deletion.

Browser verification covers reload, Back/Forward, two synchronized tabs,
closing/reopening an ordinary tab session, destination stamp timing, focus
return timing, malformed About URLs, legacy routes, and visual navigation into
every linked static case study.

## Scope

No account, database, analytics event, server storage, push, or deployment is
part of this work. Existing unrelated Home, About, footer, and mobile-navigation
changes remain untouched.
