# Model card — CHIP prototype risk index

> **Status: prototype / preliminary.** This documents the interpretable
> stand-in that produces the 0–4 index in this repository today. It is **not**
> the Ridge regression climate-health model, which is fitted against
> epidemiological case data as a Q2 2027 workplan milestone. The index is
> preliminary until that fitting and back-testing are complete.

## Overview

- **Name:** CHIP child-weighted risk index (prototype)
- **Owner:** Teamplate Sole Co., Ltd.
- **Output:** a 0–4 risk level per district, with a calibrated uncertainty band
- **Where:** `chip-backend/src/domain/risk.ts`
- **Licence:** MIT (software); derived data CC-BY-SA 4.0

## Intended use

Decision support for schools, parents and district health/education authorities:
express *exposure of children* (not hazard alone) as a daily, interpretable
level tied to a preparedness posture. **Not** a clinical or diagnostic
instrument.

## How it works

A transparent linear combination, chosen so its coefficients read like the
Ridge coefficients that will replace them:

1. **Hazard** (0–1) = weighted PM2.5 (0.50) + heat exposure (0.35) + indoor CO₂
   proxy (0.15), each normalised against reference thresholds.
2. **Child weighting** (~0.6–1.4) from child density (0.65) + school proximity
   (0.35) — this is what makes the index child-*weighted*.
3. **Epidemiological nudge**: observed aggregate child respiratory/fever signal
   raises the score, scaled by reporting completeness.
4. **Exposure** = hazard × child weight + nudge → 0–100 score → bucketed to 0–4.
5. **Uncertainty band** widens as environmental completeness and epidemiological
   reporting fall.

Heat exposure uses Australian apparent temperature (heat + humidity).

## Inputs

Environmental measurements (AirGradient network — real or synthetic fallback),
aggregate epidemiological signal (synthetic in prototype; DHIS2/hospitals under
the workplan), and child-density/school weighting (Lao Statistics Bureau).
**No individually identifiable record enters the platform.**

## Limitations

- **Association, not causation.** The model relates exposure to case counts; it
  does not establish that exposure caused illness.
- **Prototype coefficients** are hand-set, not fitted. The Ridge model (Q2 2027)
  replaces them with coefficients fitted on ≥5 years of paired data, published
  with confidence intervals and back-tested per outcome and season.
- **Coverage bias:** districts with sparse monitoring or thin reporting carry
  wider uncertainty; a newly added district has no baseline, so anomaly
  detection is unreliable until one elapses.
- **Resolution:** ERA5 (~31 km) gives temporal context only; satellite thermal
  retrieval fails under monsoon cloud.

## Evaluation (planned)

Held-out districts, reported per outcome and season, disaggregated across ≥4
subgroups with the best–worst gap bounded at 20% of target; interval coverage
checked alongside accuracy; anomaly-detection false-positive rate bounded at
15%. Results published with each model release.
