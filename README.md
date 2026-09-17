# SwarmAlpha

Research on controlled information exposure and collective decisions in LLM multi-agent systems.

**Start with [the short handoff page](docs/ACTIVE_RESEARCH_SURFACE.md).** It contains the current result boundaries, setup and the new offline semantic probe. Other documents are reference material.

Active research remains stopped. The current handoff work adds an offline Jev interface and installation checks; it does not run providers or validate a governance policy.

```sh
npm ci
npm run check:handoff
npm run probe:semantic -- --help
```

Use Node 22 LTS (22.13+) or Node 24. No API key or local inference model is needed for these checks.

- [中文](README_CN.md) · [handoff](docs/ACTIVE_RESEARCH_SURFACE.md)
- [Preserved ideas](docs/research/SWARMALPHA_RESEARCH_IDENTITY_AND_DESIGN_PHILOSOPHY.md#14-2026-09-17-交接前方向审查与jev候选边界)
- [Reference documents](docs/README.md) · [MIT license](LICENSE)

The current submission package and full local handoff bundle remain excluded from public Git; historical paper material is already tracked. See the handoff page for this boundary. Legacy code remains in `legacy/` for existing compatibility dependencies.
