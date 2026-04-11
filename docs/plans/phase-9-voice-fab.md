# Phase 9 — Prominent Voice Input (FAB)

## Context
Voice logging is a core feature but the mic is hidden in TopNav. Replace with a 56×56px FAB at bottom-right that opens a slide-up drawer.

## Files to Create
| File | Purpose |
|---|---|
| `components/voice/VoiceFab.tsx` | FAB button + drawer hosting VoiceRecorder |

## Files to Change
| File | Change |
|---|---|
| `app/(dashboard)/layout.tsx` | Render VoiceFab |
| `components/layout/TopNav.tsx` | Remove mic icon |
| `components/voice/VoiceRecorder.tsx` | Add optional `onDone` prop |

## Completion Criteria
- [ ] FAB visible bottom-right on all dashboard pages
- [ ] Clicking FAB opens slide-up drawer
- [ ] Backdrop click or X closes drawer
- [ ] Escape key closes drawer
- [ ] VoiceRecorder works identically inside drawer
- [ ] TopNav has no mic icon
- [ ] E2E test `tests/voice-fab.spec.ts`
