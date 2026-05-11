## New color scheme: "Warm Slate + Sage"

The current navy + gold + bright white is heavy and reads "corporate banking". Here's a softer, more editorial palette that keeps the recruiter/client CRM serious but gives the dashboard breathing room and lets metrics carry meaning through color.

### Direction

- **Surfaces:** warm off-white parchment instead of sterile white, with a faint cream tint. Sidebar shifts from dark navy to a deep **slate teal** — still grounded, less "tech bro".
- **Accent:** muted **sage green** as primary action color (instead of saturated gold). Gold becomes a secondary highlight reserved for shortlist stars and "watch" states.
- **Text:** slightly warmer near-black (graphite), not pure black.
- **Hairlines:** soft taupe borders rather than cool grey.

```text
Background    parchment       oklch(0.985 0.006 85)
Foreground    graphite        oklch(0.24 0.015 250)
Card          warm white      oklch(0.995 0.004 85)
Sidebar       slate teal      oklch(0.30 0.025 200)
Primary       sage            oklch(0.58 0.075 155)
Accent        soft amber      oklch(0.80 0.105 75)
Border        warm taupe      oklch(0.90 0.008 80)
```

### Metric color coding (semantic, not decorative)

Each dashboard tile gets its own tinted background + matching number color. Same hue family across the app so the meaning stays consistent.

| Metric | Hue | Background | Number |
|---|---|---|---|
| Added today | sage | `oklch(0.96 0.025 155)` | `oklch(0.45 0.10 155)` |
| Added this week | sky | `oklch(0.96 0.025 230)` | `oklch(0.45 0.10 230)` |
| Rejected by Transformari | clay | `oklch(0.95 0.03 35)` | `oklch(0.50 0.13 35)` |
| % rejected | mauve | `oklch(0.96 0.02 320)` | `oklch(0.45 0.10 320)` |
| Top firms / engagement | indigo | `oklch(0.96 0.025 270)` | `oklch(0.45 0.10 270)` |

Charts use the same five hues so a bar's color matches its stat tile — no rainbow palettes, no random pastels.

### Stage badge palette (funnel-aware)

Stages already have a `StageBadge` component. New mapping:

| Group | Color |
|---|---|
| `Sourced`, `For Sean…` | neutral taupe |
| `Reached Out`, `Reached Out-Referral` | sky |
| `Responded/Scheduled…`, `Profile Screened…` | sage |
| `Initial Screening`, `Final Screening` | indigo |
| `Client Interviews`, `Offer`, `Placed` | amber → deepening |
| `Rejected by …` (4 variants) | 4 different clay/dusty-rose tints so the "who" reads at a glance |

### Implementation surface

Single file edit: `src/styles.css` — replace the `:root` token block with the new oklch values plus 5 new chart tokens (`--metric-sage`, `--metric-sky`, `--metric-clay`, `--metric-mauve`, `--metric-indigo`) and matching `-bg` variants. Components that already use semantic tokens (`bg-card`, `text-primary`, `bg-accent`, etc.) auto-update. Only `StageBadge` and the new dashboard stat cards need new className branches to pick the per-stage / per-metric hue.

No component-level color hardcoding — everything stays in tokens so we can tweak the palette in one place.

### Alternatives if this isn't to your taste

I'll go with the above unless you'd rather I try one of these:

- **Editorial cream + ink** — paper background, near-black ink, single muted oxblood accent. Very magazine-like.
- **Cool graphite + teal** — light grey surfaces, charcoal text, single teal accent. Apple-ish neutrality.
- **Warm beige + forest** — beige surfaces, deep forest green sidebar, terracotta accent. Most "human", least corporate.

Say "go" to apply Warm Slate + Sage as part of the previously-approved build, or pick one of the alternatives.
