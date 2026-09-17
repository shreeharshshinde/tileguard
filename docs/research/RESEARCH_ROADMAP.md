# TileGuard → Japanese University Research Pathway
## Master Research Guidance Document

**Created:** September 2026  
**Purpose:** A documented strategy for converting TileGuard from an engineering project into a research profile strong enough to secure a professor-supervised graduate position at a Japanese university.

---

## The Core Premise

You are not applying for a job. You are not submitting a university form.  
You are trying to convince a specific professor that you are worth supervising.

That requires a completely different approach from standard graduate admissions.

The transformation we are working toward:

> **From:** "I am a B.Tech student from India who wants to do a master's in Japan."

> **To:** "During my work with MapLibre, I became interested in the gap between successful rendering and source-data quality. I developed TileGuard, an open-source vector-tile QA system, to investigate this problem. I am currently investigating whether automated structural and geometric diagnostics can identify and explain rendering anomalies in vector-tile-based mapping systems. I would like to investigate this further under your supervision."

Everything in this document is oriented toward building the evidence that makes the second version of that sentence credible.

---

## Research Principles

These five principles govern how we work. They prevent this from turning into a feature development project dressed up as research.

**1. Evidence before claims**
Existing observations are treated as preliminary evidence, not conclusions.

**2. Research question before implementation**
New TileGuard features should be justified by a research question or experimental need, not built first and justified later.

**3. Engineering artifact ≠ research contribution**
TileGuard is the experimental instrument. The research contribution must come from the knowledge produced through systematic investigation using that instrument.

**4. Negative results are valid**
If structural defects do not correlate strongly with rendering anomalies, that is still a meaningful empirical result. We are not here to prove TileGuard works — we are here to find out what is true.

**5. Novelty must be established through literature**
No claim of novelty will be made until relevant existing work has been systematically reviewed.

---

## The Implicit Mindset We Are Avoiding

There are two ways to approach this project:

**Wrong:**
```
TileGuard → declare research question → prove TileGuard's usefulness
```

**Right:**
```
TileGuard → observation → literature → competing hypotheses → experiment
         → evidence → research question refined → contribution
```

The first is an engineering project with academic dressing. The second is research.

---

## Engineering vs Research

This distinction matters when talking to professors and when deciding how to spend time.

### Engineering questions

- How should TileGuard detect self-intersections?
- How should rules be implemented and tested?
- How fast can validation run at scale?
- How should diagnostics be displayed in the inspector?
- How should CI integration work?

### Research questions

- How prevalent are structural and geometric defects in production vector-tile datasets?
- What defect categories are most common, and why?
- How reliable are automated detectors — what are the false positive/negative rates?
- Under what conditions do defects produce observable rendering anomalies?
- Can source-level diagnostics help explain visual regression failures?
- What relationships exist between tile defects and downstream processing behavior?

TileGuard development supports the research. Engineering improvements alone do not constitute the research contribution.

---

## Your Current Position

### What you already have (difficult to manufacture quickly)

- CSE background with strong engineering fundamentals
- Substantial open-source experience across the geospatial stack
- MapLibre ecosystem involvement and community credibility
- TileGuard — a serious technical artifact with real architecture and documentation
- FOSS4G Hiroshima 2026 — international presentation experience
- Direct interaction with practitioners in the geospatial ecosystem
- A real-world observation: a self-intersection defect detected in a production Tokyo tile that renders correctly in MapLibre
- Existing benchmark data across three production tile providers (294 tiles)
- Two completed analysis phases (coordinate range, self-intersection)
- A Python analysis environment with Jupyter notebooks

### What is missing (conversion problems)

These are not deep gaps. They are conversion problems — converting engineering credibility into academic credibility.

| Gap | What it looks like now | How we fix it |
|:----|:-----------------------|:--------------|
| No provisional research question | "I built a validator" | Formulate a hypothesis from existing evidence, then test it |
| No academic framing | Engineering docs only | Add a research layer above the engineering layer |
| No systematic experiments | Ad hoc analyses | Design and run structured experiments using TileGuard as the instrument |
| No professor relationship | Cold applications | Build preliminary evidence first, then approach with substance |
| No publication | Nothing peer-reviewed | Target workshop / preprint / FOSS4G proceedings as output of good research |
| Japanese language gap | No demonstrated commitment | N5 → N4 → N3 progression running in background |

---

## Research Area and Candidate Questions

### Research area

> **Reliable Geospatial Computing through Automated Quality Assurance of Vector Tiles**

This is the area. Not the question.

### Candidate research questions

These are provisional. Their viability depends on the literature review and preliminary experiments.

**RQ1 — Characterization**
> What structural and geometric defects occur in production vector-tile datasets, and how are they distributed across providers, zoom levels, and geographic contexts?

**RQ2 — Detection**
> How accurately and efficiently can automated validation methods detect these defects?

**RQ3 — Rendering relationship**
> Under what conditions do structural and geometric tile defects produce observable rendering anomalies?

**RQ4 — Explainability**
> Can source-level diagnostics help explain visual regression failures in vector-tile rendering systems?

**RQ4 is the long-term direction, not an assumption.**

RQ1 and RQ2 establish the empirical foundation. RQ3 tests whether the link between source defects and rendering behavior is real and measurable. Only if RQ3 produces meaningful results does RQ4 become viable as a master's-level research question.

### Master's thesis scope — be honest about ambition

Four research questions that build on each other is a **PhD structure, not a master's thesis**. A strong master's thesis answers one research question well — maybe two if they're tightly coupled.

**Realistic scope for a 2-year master's:**

| Scope | Questions | Role in thesis |
|:------|:----------|:---------------|
| **Primary thesis** | RQ1 + RQ2 | These are the core contribution — defect characterization and detection accuracy |
| **Exploratory chapter** | RQ3 (small-scale) | Run a limited rendering experiment, report what you find, positive or negative |
| **Future work section** | RQ4 | Goes in the final chapter of the thesis as "next steps" — do not promise this |

Do not try to answer all four. A thesis committee will respect a thorough answer to one question far more than a shallow answer to four.

If a professor asks "what about rendering correlation?" the honest answer is: "I plan to run a small-scale exploratory study during the master's. If the results justify it, that could become a PhD direction." That answer demonstrates maturity, not weakness.

---

## Competing Hypotheses

We do not assume a particular outcome. All of these could be true:

**H1:** Certain source-level geometric defects are associated with specific, reproducible rendering anomalies in MapLibre.

**H2:** Most source-level defects are successfully tolerated by rendering systems and do not produce observable visual anomalies, even when they violate geometry validity specifications.

**H3:** Rendering anomalies are often caused by interactions between source-data defects, rendering configuration, and renderer implementation — not by individual defects alone.

**H4:** Source-level diagnostics provide useful explanatory information for some, but not all, visual regression failures.

We design experiments to distinguish between these. We do not assume H1 is correct because it would make TileGuard look useful.

### What the Tokyo finding tells us

TileGuard detected a self-intersection in a production tile from OpenMapTiles (Tokyo, z14, `transportation` layer, feature 733). The tile renders correctly in MapLibre.

This is currently the strongest candidate for a research observation because it demonstrates a measurable source-level defect that was not apparent through visual inspection.

It is **not yet declared an academically interesting result.** That depends on:
- Whether the literature has already documented this phenomenon
- Whether the defect is reproducible and representative
- Whether it can be systematically studied across a larger dataset

Its status will be revised after the literature review and TileGuard audit are complete.

---

## Threats to Validity

Knowing these in advance shapes better experimental design.

- TileGuard may contain implementation-specific false positives that inflate defect counts
- Synthetic defects may not represent the distribution or character of defects occurring in production datasets
- A defect detected in source data may not produce a visible rendering anomaly in any configuration
- Rendering behavior may depend on MapLibre version, style specification, zoom level, viewport size, GPU driver, and rendering mode
- Results from three tile providers may not generalize to the broader vector-tile ecosystem
- Pixel-level differences between rendered outputs do not necessarily correspond to perceptually meaningful or practically significant errors
- The O(N²) self-intersection detection algorithm may introduce performance-related measurement artifacts

---

## Part 1 — Interrogating TileGuard (First Action)

**This is the first task. Nothing else starts before this.**

Before we formulate any research question, we need to understand what TileGuard already knows. The output of this step is `TILEGUARD_AUDIT.md`.

### What TileGuard currently detects

| Rule | Defect class | Research relevance |
|:-----|:-------------|:-------------------|
| `tile/self-intersection` | Geometric validity | HIGH — real production finding |
| `tile/winding-order` | Convention compliance | HIGH — affects polygon fill rendering |
| `tile/unclosed-ring` | Structural completeness | HIGH — causes triangulation failures |
| `tile/zero-area-ring` | Degenerate geometry | MEDIUM — invisible but computationally problematic |
| `tile/hole-containment` | Topological validity | HIGH — affects polygon punch-through |
| `tile/degenerate-geometry` | Structural completeness | MEDIUM |
| `tile/coordinate-range` | Spec compliance | MEDIUM — Phase 1 analysis already run |
| `tile/required-layers` | Schema compliance | LOW (for research purposes) |
| `tile/feature-count` | Statistical outliers | LOW |
| `tile/no-empty` | Completeness | LOW |

### What existing data is already in the repository

| Source | Location | Contains |
|:-------|:---------|:---------|
| Phase 1 — Coordinate Range | `analysis/phase1-coordinate-range/` | Offset distribution (68MB), classification, decoder crosscheck, histogram |
| Phase 2 — Self-Intersection | `analysis/phase2-self-intersection/` | Ring data (CSV, JSON), Jupyter notebook, benchmark comparisons |
| Benchmark results | `analysis/tileguard_benchmark_results.md` | 294 tiles across 3 providers, throughput, memory, diagnostic counts |
| Real-world finding | `docs/foss4g/REAL_WORLD_FINDING.md` | Tokyo self-intersection finding — production tile, renders correctly |
| Synthetic fixtures | `fixtures/synthetic/`, `fixtures/bad/`, `fixtures/good/` | Controlled test tiles |
| Real tiles | `fixtures/real-tiles/` | tokyo.pbf, manhattan.pbf, ocean.pbf |
| Benchmark cache | `fixtures/benchmark-cache/` | Cached production tiles from 3 providers |

The TileGuard audit will document each of these in detail — what was measured, what was found, what is still unknown, and what each piece of evidence can and cannot support.

---

## Part 2 — Literature Review

### Why this must come before experiments are finalized

You need to know what has already been answered. A research question is only valid if it addresses a genuine gap. A professor will ask: "How is this different from what X published in 20XX?" You need to be able to answer that.

You cannot claim novelty until you have read the relevant literature.

### Paper domains to cover

Search in: Google Scholar, Semantic Scholar, ACM Digital Library, IEEE Xplore, ISPRS Annals, ACM SIGSPATIAL proceedings, ICA proceedings.

**Domain 1 — Geospatial data quality**
Keywords: "geospatial data quality", "spatial data quality", "GIS data quality assessment", "spatial data quality dimensions"  
Focus on: quality frameworks, defect taxonomies, automated validation methods

**Domain 2 — Vector tile quality specifically**
Keywords: "vector tiles quality", "MVT validation", "Mapbox Vector Tiles defects", "tile server quality"  
This domain is likely sparse — that is where the gap may live.

**Domain 3 — Computational geometry / polygon validity**
Keywords: "simple polygon validation", "self-intersection detection", "winding order polygon", "polygon repair geometry"  
Focus on: algorithms, computational complexity, detection methods

**Domain 4 — Map rendering and visual regression**
Keywords: "map rendering quality", "visual regression testing maps", "rendering artifacts cartography", "rendering correctness"  
Key venues: IEEE VIS, ACM SIGGRAPH, ICA

**Domain 5 — Software testing for geospatial**
Keywords: "geospatial software testing", "GIS software quality assurance", "spatial data validation pipeline"

**Domain 6 — Tile generation pipelines**
Keywords: "vector tile generation", "tippecanoe algorithm", "tile server quality", "PostGIS MVT", "line simplification artifacts"  
Understanding where defects originate is as important as detecting them.

### What to record for each paper

Use `PAPER_MATRIX.md` to track every paper read:

| Paper | Problem studied | Dataset | Method | Finding | Limitation | Relevance to TileGuard |
|:------|:----------------|:--------|:-------|:--------|:-----------|:-----------------------|

The column that matters most: **Limitation** — what did they not study that you could?

### Expected output

After 4–6 weeks of systematic reading (2–3 papers per week), you should be able to write a single paragraph of the form:

> "Existing work on geospatial data quality [citations] focuses primarily on [X]. Automated quality validation specifically for the MVT binary format, and the relationship between structural tile defects and renderer behavior, has [not been studied / been partially studied with the following limitations: Y]. This work addresses that gap by [Z]."

If the literature shows someone has already done exactly what you planned — that is useful information, not a failure. Read their work carefully and identify what they did not measure.

---

## Part 3 — Experimental Design

### Philosophy

Do not commit to a large experiment before validating the methodology on a small one.

### Phase 0 — Feasibility (use existing data)

Before designing new experiments, extract maximum value from what already exists.

```
Existing 294 production tiles
         ↓
Existing TileGuard diagnostic results
         ↓
Validate methodology with current data
         ↓
Identify which defect classes are most interesting to study further
```

This prevents spending three months collecting data before discovering that the central hypothesis is not productive.

### Phase 1 — Controlled experiment (small scale)

```
Small controlled dataset (~50–100 tiles)
         ↓
Known defect types (synthetic + confirmed real-world)
         ↓
TileGuard → structured diagnostics
         ↓
Render through MapLibre (headless)
         ↓
Visual comparison (screenshot diff)
         ↓
Does the defect produce a visible anomaly?
```

Only if Phase 1 produces something interesting does it justify scaling up.

### Phase 2 — Scale (if Phase 1 justifies it)

```
500 → 1,000 → 10,000+ tiles
Multiple providers, zoom levels, regions
Expanded defect taxonomy
Systematic rendering comparisons
```

### Experiment 1 — Defect characterization

**Question:** What defects exist in production tiles, and how are they distributed?

**Method:** Collect tiles from multiple providers across zoom levels and geographic regions. Run TileGuard with all rules enabled. Record defect type, layer, frequency, location.

**Metrics:** Defect prevalence rate, defect density per tile, distribution by zoom level / provider / region type.

**Output:** A defect taxonomy with frequency data.

### Experiment 2 — Detection performance

**Question:** How accurately does TileGuard detect known defects?

**Method:** Use synthetic fixture generator (`scripts/generate-synthetic-fixtures.mts`) to create ground-truth defective tiles. Run TileGuard. Measure precision, recall, F1 per rule.

**Metrics:** True positives, false positives, false negatives per defect type. Identify rules where detection is imperfect and characterize why.

### Experiment 3 — Rendering consequence

**Question:** Do structural tile defects produce observable rendering anomalies in MapLibre?

**Method:** Select tiles with confirmed defects (from TileGuard). Render each tile through MapLibre GL JS headless (Puppeteer or Playwright). Compare against clean reference renders. Measure visual delta.

**Metrics:** Pixel difference, SSIM score, affected region size, zoom-level sensitivity.

**Note:** A negative result — defects do not visibly affect rendering — is still scientifically meaningful. It would suggest that MapLibre's renderer is more robust to geometric invalidity than specifications imply.

### Experiment 4 — Performance characterization

Extend existing benchmark data:
- Runtime per rule at scale (1,000+ tiles)
- Memory behavior under large tile loads
- Profile of O(N²) self-intersection algorithm
- Comparison with any existing validation tools

---

## Part 4 — The Research Matrix

As we work through experiments, we maintain `RESEARCH_MATRIX.md`:

| Research Question | Existing literature | Our evidence so far | Experiment | Result | Status |
|:------------------|:--------------------|:--------------------|:-----------|:-------|:-------|
| RQ1 — Defect characterization | To establish | Phase 1+2 data, benchmark | Experiment 1 | TBD | In progress |
| RQ2 — Detection accuracy | To establish | Synthetic fixtures | Experiment 2 | TBD | Not started |
| RQ3 — Rendering relationship | To establish | Tokyo finding | Experiment 3 | TBD | Not started |
| RQ4 — Explainability | To establish | — | Future | TBD | Provisional |

This is the central document for understanding where we are at any moment.

---

## Part 5 — The Research Package

Before you contact any professor, assemble this. You do not need everything before first contact — but you need items 1, 2, and 5 at minimum.

```
Research Package
│
├── 1. CV
│   ├── Education, projects, open-source
│   ├── FOSS4G Hiroshima 2026 (talk or poster)
│   └── TileGuard (GitHub link, brief description)
│
├── 2. Research Statement (1 page)
│   ├── Problem: what gap appears to exist
│   ├── Approach: how TileGuard investigates it
│   ├── Preliminary observations: Tokyo finding, benchmark data
│   └── Research direction: what you want to investigate
│
├── 3. Research Proposal (2–3 pages) — for later
│   ├── Background and motivation
│   ├── Related work (from literature review)
│   ├── Provisional research questions
│   ├── Methodology
│   ├── Preliminary results
│   └── Expected contributions
│
├── 4. Technical Report / Preprint — output of good research, not prerequisite
│
└── 5. TileGuard artifact
    ├── GitHub (polished, documented)
    ├── FOSS4G presentation materials
    └── Experimental data and notebooks
```

Publication is the output of good research, not the objective. The sequence is:

```
Research → Experiments → Results → Report → Potential paper
```

Not: "need a paper → do research."

---

## Part 5.5 — Department Targeting at Japanese Universities

This section prevents the single most common mistake: ending up in the wrong department.

### The principle

You are a **Computer Scientist** who applies CS methods to geospatial problems. You are not a geographer, not a cartographer, not a civil engineer. Your thesis advisor must be someone who evaluates your work as CS research — algorithms, systems, data engineering, software quality — not as geography or earth science.

### Japanese department types and where you fit

| Department type (Japanese / English) | Typical home for | Fit for you |
|:-------------------------------------|:-----------------|:------------|
| 情報理工学 (Information Science and Technology) | CS, algorithms, systems, data engineering | **Best fit** |
| 情報学 (Informatics) | Broader CS including data science, HCI | **Good fit** |
| 空間情報科学 (Spatial Information Science) | GIS research with computational methods | **Good fit if the lab is CS-oriented** |
| 学際情報学 (Interdisciplinary Information Studies) | Varies widely — can be strong CS or very applied | **Case-by-case — check the professor's publications** |
| 社会基盤学 (Civil Engineering / Infrastructure) | GIS labs sometimes sit here | **Avoid unless professor is clearly CS-focused** |
| 地球惑星科学 (Earth and Planetary Science) | Remote sensing, geology | **Wrong department** |
| 地理学 (Geography) | Human/physical geography, cartography | **Wrong department** |
| 都市工学 (Urban Engineering) | Planning, land use | **Wrong department for your profile** |

### How to verify

Before adding a professor to your shortlist, check:

1. **Their recent publications** — Are they publishing in CS venues (ACM SIGSPATIAL, IEEE, ISPRS Technical Commission IV) or geography venues (AAG, RGS)?
2. **Their lab's tools** — Do students use Python/TypeScript/C++, or GIS desktop software?
3. **Their students' theses** — Do thesis titles read like CS problems ("efficient spatial indexing", "automated validation") or geography problems ("land use change in Kanto region")?
4. **The degree you would receive** — Does the program grant 修士（情報理工学）(Master of Information Science) or 修士（理学）(Master of Science in Geography)?

The degree name on your certificate matters for your career after graduation.

### Specific programs to investigate

| University | Program | Why to look |
|:-----------|:--------|:------------|
| University of Tokyo | Graduate School of Information Science and Technology | Largest CS department; CSIS (spatial info) is affiliated |
| University of Tokyo | CSIS (Center for Spatial Information Science) | Directly relevant — but verify the lab is CS-flavored |
| Kyoto University | Graduate School of Informatics | Strong CS with some geospatial groups |
| Osaka University | Graduate School of Information Science and Technology | Strong systems and data engineering |
| Tokyo Institute of Technology | School of Computing | Pure CS; look for spatial data groups |
| NAIST | Division of Information Science | Small, research-focused, very CS |
| University of Tsukuba | Graduate School of Systems and Information Engineering | Historically strong in geospatial + CS |
| Tohoku University | Graduate School of Information Sciences | Active in spatial data infrastructure research |

Do not apply to a university. Find the professor → verify the department → then apply.

---

## Part 5.6 — Leveraging Your FOSS4G Network

You spoke with people at FOSS4G Hiroshima. Some suggested you come to Japan. Some were from startups, some were engineers, some may have academic connections.

**Do not treat professor outreach as starting from zero.** You potentially have warm introductions already.

### Action items

1. **List every person you had a substantive conversation with at FOSS4G Hiroshima.**
   Not just names — what they do, what organization they're from, what you discussed, whether they offered any specific suggestion.

2. **Identify who has academic connections.**
   Anyone affiliated with a Japanese university, anyone who mentioned a specific professor or lab, anyone who is themselves an academic.

3. **Identify who could introduce you.**
   A warm introduction from someone in the ecosystem is worth 10 cold emails. If someone at FOSS4G said "you should talk to Professor X" — that is the single most valuable lead you have.

4. **Maintain these relationships.**
   Follow up with a short email: "Thank you for the conversation at FOSS4G. I've been continuing work on TileGuard and am now investigating [research direction]. I'm beginning to explore master's programs in Japan — if you have any suggestions for labs or professors working in this area, I would be very grateful."

   This is not pushy. This is professional networking.

### Track this in `FOSS4G_NETWORK.md`

| Person | Organization | What they do | What you discussed | Suggestion given | Follow-up status |
|:-------|:-------------|:-------------|:-------------------|:-----------------|:-----------------|
| (fill) | | | | | |

A single warm introduction to the right professor changes the entire trajectory.

## Part 6 — Finding Professors

### The search process

Do not start from university rankings. Start from research papers.

```
Papers in your domain
        ↓
Authors of those papers
        ↓
Researchers whose work connects to your preliminary evidence
        ↓
Professors currently accepting students
        ↓
Labs at Japanese universities
        ↓
Universities (MEXT eligibility, English programs)
        ↓
Application route
```

### What to look for in a professor

- Research that intersects with yours (geospatial computing, GIS, computational geometry, rendering, software quality)
- Currently publishing (active lab — check recent papers, 2022–2026)
- English-language publications or English program affiliation
- Has supervised international students before
- Lab has funded research (KAKENHI, JST, CREST, etc.)
- Not retiring in the next 2–3 years

### Candidate university types

For your profile (CSE + geospatial + open-source), reasonable targets include:

- University of Tokyo (Spatial Information Science Research Center — CSIS)
- Kyoto University (GSAIS, Graduate School of Informatics)
- Tohoku University
- Osaka University (Graduate School of Information Science)
- Tokyo Institute of Technology
- Nagoya University
- University of Tsukuba (geospatial historically strong)
- Ritsumeikan University
- Keio University

Do not apply to a university. Find the professor first, then follow their admission route.

### Professor shortlist format

Build this table progressively as you read papers:

| Professor | University | Research focus | Connection to your work | English papers | MEXT eligible | Contact status |
|:----------|:-----------|:---------------|:------------------------|:---------------|:--------------|:---------------|
| (to fill) | | | | | | Not contacted |

Target 8–12 candidates before filtering. You will contact 3–5.

---

## Part 7 — Professor Outreach

### When to make first contact

You do not need to wait until the research is finished.

First contact is appropriate once you have:
- TileGuard as a demonstrable artifact
- FOSS4G experience
- Preliminary evidence (even from existing data)
- Some awareness of relevant literature
- A clear research direction (not a finished thesis)

Conversations with professors can help refine the research question. That is a legitimate reason to make contact early.

Target: **late October / November** for first outreach, depending on audit and literature progress.

### What not to send

> "Dear Professor, I am interested in your research and would like to pursue a master's degree under your supervision. I have attached my CV."

This email gets no response. Every professor receives dozens of these per month.

### What to send instead

The email must show three things:
1. You know their specific work — not just their general field
2. You have already started working on a related problem
3. You are asking a genuine research question, not a visa question

Template:

> I am writing because I came across your work on [specific paper or topic]. I found the connection to my own work particularly interesting.
>
> I have been working on [TileGuard] — an open-source automated validation framework for vector-tile-based mapping systems. While investigating [specific problem], I encountered [specific observation]. This led me to the question of [your provisional research question].
>
> I am currently investigating whether [hypothesis], and I have attached a brief research statement describing my preliminary work.
>
> I will be applying to graduate programs in [year] and am exploring whether your lab would be a good fit for this direction. I would welcome any thoughts you might have.

Short. Specific. Demonstrates that you have already started thinking about the problem.

### Three possible responses

- **No reply:** Wait 3–4 weeks, send one polite follow-up. If still no response, move on.
- **"Apply through normal channels":** Not a rejection — submit a formal application and reference your prior contact.
- **Genuine engagement:** They ask questions, suggest a call, or express interest. This is what you are working toward.

---

## Part 8 — MEXT and Funding Routes

You are primarily targeting the **University Recommendation route** (professor nominates you). But you should also prepare for the **Embassy Recommendation route** as a parallel option. They are not mutually exclusive — you can pursue both simultaneously.

### Route 1 — University Recommendation (大学推薦) — Primary Target

A professor agrees to supervise you, then nominates you through their university's internal MEXT allocation.

**How it works:**
1. You contact the professor and establish a research relationship
2. The professor agrees to supervise your research
3. The professor nominates you through their university's MEXT quota
4. You submit application materials through the university
5. The university ranks its nominees and submits to MEXT
6. MEXT makes final decision

**Timeline:**
- Varies by university — typically **October–January** of the year before enrollment
- Some universities have separate "research student" intake before formal master's admission
- Many programs have **April enrollment** (primary) and some offer **October enrollment**

**Advantages:**
- Higher acceptance rate if the professor actively supports you
- The professor's recommendation carries significant weight
- You already know who you'll work with

**Disadvantages:**
- Requires an established professor relationship first
- Each university has a limited MEXT quota — your nomination competes with other nominees from the same university
- Timeline varies and you must track each university's specific deadlines

**What you need:**
- Professor's agreement to supervise (informal, then formal)
- Research plan (2 pages) — overlaps heavily with your research proposal
- Academic transcripts with GPA
- Recommendation letters (typically 2)
- English proficiency proof (IELTS/TOEFL)
- CV
- Passport copy

### Route 2 — Embassy Recommendation (大使館推薦) — Parallel Option

Apply directly through the Japanese Embassy in India.

**How it works:**
1. Apply at the Japanese Embassy/Consulate General in India
2. Pass document screening
3. Pass written exams (English, Japanese, and field-specific)
4. Pass interview at the Embassy
5. Embassy recommends you to MEXT in Tokyo
6. MEXT places you at a university (you can state preferences)

**Timeline (for April 2028 enrollment — the 2027 cycle):**
- **April 2027:** Application opens at Embassy
- **May 2027:** Document submission deadline
- **June–July 2027:** Written exams and interviews
- **August–September 2027:** Embassy shortlist announced
- **October–December 2027:** MEXT confirmation and university placement
- **January–March 2028:** Visa and travel preparation
- **April 2028:** Arrival and enrollment

> **Important:** If you are targeting April 2028 enrollment via Embassy route, applications open around April 2027. That gives you ~7 months from now to be fully prepared.

**Advantages:**
- Full scholarship: tuition + monthly stipend (~¥143,000/month) + round-trip airfare
- Does not require prior professor relationship (though having one helps enormously)
- Prestigious — MEXT is the gold standard of Japanese government scholarships

**Disadvantages:**
- Highly competitive — India sends many applicants across all fields
- You may be placed at a university/professor you did not choose
- Written exam covers your academic field — requires preparation
- Long timeline

**What you need (same as above, plus):**
- Field of Study and Research Program Plan (MEXT-specific 2-page form)
- Health certificate
- JLPT certificate if available (not required, but helps)

### The MEXT Research Plan — A Specific Document

This is **not** your research proposal. It is a 2-page form with specific sections:

1. **Present field of study** — What you studied in your B.Tech
2. **Your research topic in Japan** — What you want to investigate
3. **Study program in Japan** — Your research plan, methodology, expected outcomes
4. **Relationship to your previous studies** — How your CSE background + TileGuard + MapLibre connects

The content overlaps ~80% with your research proposal, but the format is different and must follow MEXT's template. Start drafting this **in parallel** with your research proposal — do not wait until applications open.

### Pursuing Both Routes Simultaneously

```
October–December 2026:  Professor outreach (for University Route)
January–March 2027:     Deepen professor relationship + prepare Embassy materials
April–May 2027:         Submit Embassy application
June–July 2027:         Embassy exams (while continuing University Route work)
October–January:        University Route application (if professor nominates you)
```

If University Route succeeds first, you can withdraw from Embassy Route. If Embassy Route is your only acceptance, you take it. Having both active maximizes your options.

### Other Funding Sources

| Funding | Type | Notes |
|:--------|:-----|:------|
| University-specific scholarships | Varies | Check each target university's international student pages |
| JASSO (Japan Student Services Organization) | Supplemental scholarship | Less competitive; can supplement self-funding |
| JICA (Japan International Cooperation Agency) | Development-focused | Less relevant for CS research |
| JST (Japan Science and Technology Agency) | Research project funding | Professor-initiated; you don't apply directly |
| JSPS (Japan Society for Promotion of Science) | Research fellowships | Primarily for PhD students — note for later |
| Private foundations (Rotary, KDDI, etc.) | Varies | Smaller amounts; worth investigating as supplements |

### Financial Reality Without Scholarship

If neither MEXT route succeeds, self-funding is possible but expensive:
- Tuition: ~¥535,800/year at national universities
- Living expenses: ~¥100,000–150,000/month (varies by city — Tokyo is higher)
- Total: approximately ¥3.5–4.5 million for 2 years (~₹20–25 lakh)

Many students work part-time (up to 28 hours/week on student visa). This is legal and common, but it reduces research time.

MEXT is strongly preferable. Plan for it.

---

## Part 9 — Decision Points

These are the moments where you need to make a binary decision based on evidence. Making them explicit prevents continuing down a dead path out of momentum.

| Decision Point | Trigger | If Yes | If No |
|:---------------|:--------|:-------|:------|
| **After TileGuard audit** | Do production tiles contain enough real defects to study systematically? | Proceed to Phase 1 experiments with production data | Pivot to synthetic-defect-only study design |
| **After literature review** | Has someone already published a comprehensive MVT defect taxonomy? | Pivot primary question toward rendering correlation (RQ3) or detection accuracy (RQ2) | RQ1 is viable and novel — proceed |
| **After Phase 0 feasibility** | Does the existing 294-tile dataset produce statistically interesting defect distributions? | Use existing data as core dataset, expand incrementally | Redesign data collection — need different providers, zoom levels, or regions |
| **After Phase 1 rendering experiment** | Do confirmed defects produce observable rendering anomalies in MapLibre? | RQ3 is viable — expand rendering study | Report negative result (still publishable), focus thesis on RQ1+RQ2 only |
| **After first professor replies** | Does the professor's research actually connect to your direction? | Deepen relationship — schedule call, share results | Thank them, try next candidate on shortlist |
| **After FOSS4G network follow-up** | Does anyone offer a warm introduction to a professor? | Prioritize that introduction above cold outreach | Continue with cold outreach using research package |
| **By January 2027** | Do you have at least one professor expressing genuine interest? | Proceed with University Route as primary | Shift weight to Embassy Route — prepare for exams |
| **By March 2027** | Is your research proposal strong enough to submit? | Submit for both routes | Delay to October 2028 cycle — use extra time for stronger evidence |

These are not failures. They are navigation. The plan works only if you follow the evidence, not the momentum.

---

## Milestones

Rather than a rigid calendar, we use milestone-based progress. Approximate timing is given, but milestones drive the work — not months.

### Milestone 1 — TileGuard audited
*Target: end of September*
- `TILEGUARD_AUDIT.md` complete
- All existing data, experiments, and rules documented
- Clear picture of what evidence already exists and what is missing

### Milestone 2 — Research gap established
*Target: October–November*
- Literature review substantially complete
- `PAPER_MATRIX.md` populated with relevant papers
- Gap statement written: what has not been studied, and why it matters
- Research questions refined based on literature

### Milestone 3 — Preliminary evidence
*Target: October–November (can overlap with Milestone 2)*
- Phase 0 feasibility complete (reanalysis of existing 294 tiles)
- Phase 1 controlled experiment run
- At least partial results for RQ1 and RQ3
- Research Matrix updated

### Milestone 4 — Professor conversations
*Target: late November–December*
- FOSS4G network follow-ups sent (immediate — do not wait)
- Professor shortlist built (8–12 candidates)
- Research statement written (1 page)
- First outreach emails sent (3–5 professors)
- At least one substantive reply or conversation

> **Why November, not October:** The audit and literature review realistically take until mid-November. A premature professor email — sent before you have a defined research question and preliminary evidence — is worse than a late one. Professors remember bad first impressions. Do not rush this.

### Milestone 5 — Research proposal
*Target: December–January*
- Research proposal written (2–3 pages)
- Proposal reflects feedback from professor conversations
- MEXT research plan form drafted (parallel with proposal)
- IELTS preparation begun

### Milestone 6 — Applications
*Target: February–May (varies by route)*
- IELTS exam taken
- University Route: professor nomination process active (October–January, varies)
- Embassy Route: application submitted (April–May 2027)
- MEXT research plan finalized for whichever route proceeds first
- Professor relationships active and ongoing

---

## Japanese Language

This runs in the background throughout. It is not the main project, but it must not stop.

**Target progression:**

```
Now (Sep 2026)    Month 3 (Dec)    Month 6 (Mar)    Month 9 (Jun)    Month 12 (Sep)
N5 basics         N5 solid         N4 active study   N4 exam          N3 study begun
```

**Why it matters for professor outreach:**

Even when writing in English (which is appropriate and expected for international applicants), demonstrating active Japanese study signals: "I am not attracted to the idea of Japan — I am preparing to actually live and work there." This is a meaningful differentiator from the many applicants who express interest in Japan without any preparation.

---

## Documents in This Directory

As we work through the milestones, we build these files here:

| File | Contents | Status |
|:-----|:---------|:-------|
| `RESEARCH_ROADMAP.md` | This document — master strategy | ✓ Created |
| `TILEGUARD_AUDIT.md` | Complete inventory of what TileGuard's data, rules, and experiments contain | Next |
| `PAPER_MATRIX.md` | Paper-by-paper reading notes in structured table format | To do |
| `RESEARCH_QUESTION.md` | Finalized research questions with literature justification | To do |
| `RESEARCH_MATRIX.md` | Central control document: RQ → evidence → experiment → result | To do |
| `EXPERIMENT_LOG.md` | Experimental decisions, datasets, raw results | To do |
| `RESEARCH_STATEMENT.md` | 1-page research statement (draft → final) | To do |
| `RESEARCH_PROPOSAL.md` | 2–3 page research proposal | To do |
| `MEXT_RESEARCH_PLAN.md` | MEXT-specific 2-page research plan form (draft → final) | To do |
| `PROFESSOR_SHORTLIST.md` | Professor search, tracking, and contact log | To do |
| `FOSS4G_NETWORK.md` | FOSS4G Hiroshima contacts, follow-up tracking | To do |

---

## The First Action

Before anything else: **`TILEGUARD_AUDIT.md`**.

Open and systematically document:

1. `analysis/phase1-coordinate-range/` — what was measured, what was found, what remains unknown
2. `analysis/phase2-self-intersection/` — same
3. `analysis/tileguard_benchmark_results.md` — performance data and its limitations
4. `docs/foss4g/REAL_WORLD_FINDING.md` — the Tokyo observation and what it can and cannot claim
5. `packages/tile-rules/src/` — what each rule actually checks and its known limitations
6. `fixtures/` — what test data exists, how it was generated, what it covers

The output is a clear, honest picture of what evidence already exists, what gaps remain, and what each piece of data can legitimately support as a research observation.

Only after that do we go to the literature.
