# TileGuard Research — Literature Search Log

**Task:** 1.0 — Literature Search & Academic Deadline Audit  
**Gap closed:** E1 (no systematic literature search), A2 (no prior work verification)  
**Date created:** 2026-09-29  
**Status:** 🟡 Structure created — queries logged, results pending manual execution  

> **Instructions:** Run each query verbatim on each target database. Record result count, date, and any directly relevant papers found. Flag any paper that directly addresses MVT-specific diagnostic classification or metamorphic geometry validation — these require immediate scope review in `docs/RESEARCH_BRIEF.md` Audit Entry 002.

---

## Scope Gate

**If any paper is found that directly addresses:**
1. MVT-specific diagnostic classification (artifact vs. genuine defect)
2. Metamorphic testing of geometry validators

→ Immediately update `docs/RESEARCH_BRIEF.md` Audit Entry 002 with a scope revision note before continuing experiments.

---

## Query Log

### Domain: Geospatial Direct

---

#### Query G1

| Field | Value |
|:------|:------|
| **Query string** | `"vector tile" quality` |
| **Target domain** | Web cartography |
| **Databases to run** | ACM DL, IEEE Xplore, ISPRS Archives, MDPI IJGI |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| ISPRS Archives | — | — | — | — |
| MDPI IJGI | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->

---

#### Query G2

| Field | Value |
|:------|:------|
| **Query string** | `"Mapbox Vector Tile" validation` |
| **Target domain** | Web cartography |
| **Databases to run** | ACM DL, IEEE Xplore, ISPRS Archives, MDPI IJGI, AGILE |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| ISPRS Archives | — | — | — | — |
| MDPI IJGI | — | — | — | — |
| AGILE | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->

---

#### Query G3

| Field | Value |
|:------|:------|
| **Query string** | `MVT geometry artifact` |
| **Target domain** | Web cartography |
| **Databases to run** | ACM DL, IEEE Xplore, ISPRS Archives |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| ISPRS Archives | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->

---

#### Query G4

| Field | Value |
|:------|:------|
| **Query string** | `geospatial data quality tiles` |
| **Target domain** | Spatial SDI |
| **Databases to run** | ACM DL, IEEE Xplore, ISPRS Archives, MDPI IJGI, AGILE |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| ISPRS Archives | — | — | — | — |
| MDPI IJGI | — | — | — | — |
| AGILE | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->

---

#### Query G5

| Field | Value |
|:------|:------|
| **Query string** | `tile generalization artifact` |
| **Target domain** | Simplification |
| **Databases to run** | ACM DL, IEEE Xplore, ISPRS Archives, MDPI IJGI |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| ISPRS Archives | — | — | — | — |
| MDPI IJGI | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->

---

### Domain: CS / Software Engineering

---

#### Query CS1

| Field | Value |
|:------|:------|
| **Query string** | `"static analysis" false positive suppression` |
| **Target domain** | Software engineering |
| **Databases to run** | ACM DL (ACM SIGSOFT FSE/ESEC), IEEE Xplore (ICSE), arXiv cs.SE |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| arXiv cs.SE | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->
<!-- Key paper to verify: Hu et al. 2025 — Empirical study of suppressed static analysis warnings -->

---

#### Query CS2

| Field | Value |
|:------|:------|
| **Query string** | `"metamorphic testing" geometry OR spatial` |
| **Target domain** | Software testing |
| **Databases to run** | ACM DL, IEEE Xplore (ICSE/ISSTA), arXiv cs.SE |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| arXiv cs.SE | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->
<!-- Key paper to verify: Spatter (ACM SIGSOFT FSE) — metamorphic testing of spatial database logic -->

---

#### Query CS3

| Field | Value |
|:------|:------|
| **Query string** | `"differential testing" geometry OR cad` |
| **Target domain** | Software testing |
| **Databases to run** | ACM DL, IEEE Xplore, arXiv cs.SE |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| IEEE Xplore | — | — | — | — |
| arXiv cs.SE | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->

---

#### Query CS4

| Field | Value |
|:------|:------|
| **Query string** | `"data validation" pipeline quality` |
| **Target domain** | Data systems |
| **Databases to run** | ACM DL (SIGMOD/VLDB), arXiv cs.DB |

| Database | Date Run | Result Count | Directly Relevant Papers | Notes |
|:---------|:---------|-------------:|:------------------------|:------|
| ACM DL | — | — | — | — |
| arXiv cs.DB | — | — | — | — |

**Relevant papers found:**

<!-- List any papers here after running -->
<!-- Key papers to verify: Shankar et al. 2023 (CIKM), Breck et al. 2019 (SEDE/SysML) -->

---

## Known Papers to Verify (From Reading List — Task 4.1)

These papers are already in the reading list. Use the literature search to locate exact citations and verify DOIs.

| Paper | Expected Venue | Query to Use | Verified |
|:------|:--------------|:-------------|:---------|
| MapLibre Tile (SIGSPATIAL '25) | ACM SIGSPATIAL 2025 | G1, G2 | ☐ |
| AGILE 2022 (`10.5194/agile-giss-3-67-2022`) | AGILE GISS 2022 | G1, G4 | ☐ |
| Ingensand et al. 2016 | Web mapping journal | G1, G4 | ☐ |
| OGC Testbed-13 ER | OGC Engineering Reports | G2 | ☐ |
| *Spatter* (ACM SIGSOFT FSE) | FSE/ESEC | CS2 | ☐ |
| Hu et al. 2025 | CS/SE venue | CS1 | ☐ |
| Shankar et al. 2023 (CIKM '23) | ACM CIKM | CS4 | ☐ |
| Breck et al. 2019 (SEDE / SysML) | SEDE/SysML | CS4 | ☐ |

---

## Search Summary (to be filled in after running all queries)

| Query | Databases Run | Total Results | Relevant Papers | Scope Gate Triggered |
|:------|:-------------|:-------------:|:---------------:|:--------------------:|
| G1 `"vector tile" quality` | — | — | — | ☐ |
| G2 `"Mapbox Vector Tile" validation` | — | — | — | ☐ |
| G3 `MVT geometry artifact` | — | — | — | ☐ |
| G4 `geospatial data quality tiles` | — | — | — | ☐ |
| G5 `tile generalization artifact` | — | — | — | ☐ |
| CS1 `"static analysis" false positive suppression` | — | — | — | ☐ |
| CS2 `"metamorphic testing" geometry OR spatial` | — | — | — | ☐ |
| CS3 `"differential testing" geometry OR cad` | — | — | — | ☐ |
| CS4 `"data validation" pipeline quality` | — | — | — | ☐ |

**Gap A2 status:** 🔴 Open — requires completing query runs above  
**Gap E1 status:** 🔴 Open — requires completing query runs above  

---

*Created: 2026-09-29 | Task 1.0 Phase 1*  
*Related: `docs/RESEARCH_BRIEF.md` · `docs/research/EXPERIMENT_LOG.md` · `docs/phase4-proposal/DEADLINE_CALENDAR.md`*
