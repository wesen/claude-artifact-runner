# Topic‑Storyboard Transcript Studio — **Self‑Contained UI Specification v0.2**

## 0. Executive Overview
### What the Application Does
Topic‑Storyboard Transcript Studio is a web application that transforms long‑form **spoken content** (podcasts, webinars, coaching calls, YouTube videos) into **structured, publish‑ready material**.

1. **Analyse** – It automatically detects the distinct **topics** discussed in a transcript and tags every passage with those topics.
2. **Organise** – It projects each passage onto a **Storyboard Canvas** where creators can visually cluster, reorder, or prune ideas the same way they arrange slides in Figma or sticky notes in Miro.
3. **Produce** – Selected passages plus a user prompt feed an LLM that generates derivative assets: social posts, articles, scripts, slide decks, etc.

### Why a Storyboard Metaphor?
Traditional timeline editors force linear thinking and make it hard to compare distant sections.  A free‑form canvas lets users discover hidden relationships, group recurring themes, and build non‑linear narratives (e.g., conference talks, marketing funnels) before committing to text generation.

---

## 1. UI Component Map & How They Work Together
| # | Component | Role in Workflow | Key Interactions |
|---|-----------|------------------|------------------|
| 1 | **Topic Column** | Presents both **auto‑detected** and **user‑defined** topics; acts as palette of organising labels | Click to filter; drag to create **Topic Bucket** frames; right‑click to rename/delete |
| 2 | **Infinite Card Canvas** | Spatial workspace where each **Passage Card** (≈1–3 sentences) can be moved, grouped, or linked | Drag to reorder, Shift+Click to multi‑select, draw arrows for narrative flow |
| 3 | **Topic Buckets** (frames) | Visual containers signifying “this set of cards belongs to Topic X” | Drop cards in/out to (re)assign topics; frames can be resized, stacked, or collapsed |
| 4 | **Mini‑Map** | Birds‑eye navigation for large canvases | Click to pan viewport; shows density of cards & frames |
| 5 | **Generate Drawer** | Gathers **selected passages** + **user instructions**; executes LLM call; returns draft asset | Supports regenerate, copy, or insert result back as an **Asset Card** |
| 6 | **Top Navbar** | Global commands (add topic, switch view, undo/redo, share) | Provides alternate view modes (*Compact List*, *Timeline*) while preserving canvas state |

These components form a tight loop:
> *Detect* ➜ *Drag/Group* ➜ *Preview Structure* ➜ *Generate Draft* ➜ *Iterate*.

---

## 2. Surface Layout Recap
```
┌───────────────────────────────────────────┐
│ Top Navbar                                │
├──────────────┬────────────────────────────┤
│ Topic Column │     Infinite Card Canvas   │
│   (240 px)   │     (zoom & pan)           │
└──────────────┴────────────────────────────┘
Floating widgets: ① Mini‑Map (bottom‑right) ② Generate Drawer (slides up)
```

### 2.1 Top Navbar (Global Context)
* **Project Title** – clarifies which transcript you’re working on.
* **Add Topic** – lets users refine the machine tags, ensuring personal taxonomy.
* **View Mode Switcher** – offers *Storyboard*, *Compact List* (for checklist triage), and *Timeline* (for chronological sanity check).
* **Undo/Redo** – non‑destructive experimentation.

### 2.2 Topic Column (Discovery & Filtering)
* **Colour‑coded Chips** – quick visual anchor when cards are on canvas.
* **Drag‑to‑Frame Gesture** – immediate physical mapping: topic → workspace area.

### 2.3 Infinite Card Canvas (Organisation)
* **Passage Cards** – atomic knowledge units; carry timestamp for provenance.
* **Topic Buckets** – flexible groupings that double as visual filters.
* **Connection Arrows** – optional explicit narrative order for downstream generation.

### 2.4 Mini‑Map (Navigation)
Helps maintain orientation on large canvases—critical for 1000+ card projects.

### 2.5 Generate Drawer (Production)
Bridges organisation and creation: the drawer materialises only when there’s a coherent selection, nudging users to curate before they create.

---

## 3. End‑to‑End Interaction Example
1. **Import & Auto‑Label** – Upload a 60‑minute webinar transcript → app detects 10 topics and spawns 250 cards in *New Imports* stack.
2. **Refine Topics** – Creator adds custom topic “Pricing Objections” → 20 cards auto‑tag; drags chip to create bucket.
3. **Storyboard** – User arranges cards into three buckets: *Problem*, *Solution*, *Pricing Objections*; draws arrows: Problem → Solution → Pricing.
4. **Select Excerpts** – Lasso‑selects arrows path; hits **Add to Generation**.
5. **Generate** – Types: “Write a LinkedIn carousel script (8 slides) addressing objections.” → *Generate*.
6. **Review & Iterate** – Output appears; tweaks prompt, regenerates; inserts approved draft back to canvas as blue‑border **Asset Card** for future export.

---

## 4. Component States & Visual Language
| Component | Normal | Hover/Active | Muted (Filtered) |
|-----------|--------|--------------|------------------|
| Passage Card | White bg + topic bar | Lift shadow | 30 % opacity |
| Topic Bucket | Dashed frame | Solid frame, title bold | — |
| Selected Card | Indigo outline + toolbar | — | — |
| Generate Drawer | Hidden | Slide‑up, shadow | — |

---

## 5. Accessibility & Power‑User Notes
* **Keyboard Navigation** – Arrow keys move cards; `Space + Drag` pans canvas.
* **Context Menu** – All card actions (merge/split/delete) available via `Shift+F10`.
* **Command Palette** – (`/`) quick adds topics, toggles views, or jumps to card by timestamp.

---

## 6. Technical Highlights (v0.2)
* Canvas built with **react‑konva**; cards rendered to separate layer for fast panning.
* Card positions persisted in Postgres (`x, y, z`) so layout survives reloads.
* Topic detection via MiniLM embeddings + HDBSCAN; custom topic search uses cosine‑sim threshold.
* LLM prompt: cards ordered by current x‑axis, joined with `====`; timestamps kept for provenance footnote in output.
