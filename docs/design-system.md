# Product design system

Pocket Proof uses the MIT licensed [AI Design Skills](https://github.com/elayadesign/ai-design-skills) repository as a design reference. The implementation applies its visual and interaction rules selectively to a judge facing measurement tool: technical credibility and fast evidence inspection take priority over generic landing page conversion patterns.

## Product intent

- **Audience:** challenge judges and Arm developers evaluating a local AI optimization.
- **Primary action:** run the full local benchmark.
- **Proof signal:** native Arm64 status, exact device context, and report backed measurements sit beside the claim.
- **Objection handled first:** the interface distinguishes recorded evidence from live process telemetry and scopes transcript quality to one clip.

## Applied system

- Geist is bundled locally for the interface; Geist Mono is restricted to measurements, commands, architecture proof, and hashes.
- Type, spacing, and radius values resolve through a small token scale rather than ad hoc component values.
- Backgrounds are flat near black and charcoal surfaces. The only gradient is on the hero text.
- The benchmark button is the only prominent action above the fold. Export remains a secondary text action.
- Hover, active, focus, disabled, loading, empty, and error states are designed explicitly.
- Loading uses lane shaped skeletons, and failures are announced as alerts.
- A skip link, semantic landmarks, responsive tables, and reduced motion handling support keyboard and assistive technology use.
- A compact mobile proof strip keeps architecture evidence readable without a clipped horizontal rail.
- The two profile quality view is a direct comparison table, not a misleading two point Pareto chart.

## Intentional deviations

Pocket Proof is an application and reproducibility surface, not a sales page. It does not add testimonials, pricing, guarantees, an FAQ, or invented social proof. Technical hyphenation remains where it is part of a standard artifact name or command. The word by word statement appears after the evidence sections so it never delays the primary result.
