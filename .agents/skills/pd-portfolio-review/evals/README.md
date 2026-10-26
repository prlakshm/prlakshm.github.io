# Evals

27 invented review requests in [cases.json](cases.json), with what a good answer from this skill looks like. Three cases use the local sites in [fixtures](fixtures).

The cases and fixtures come from Karl Koch's [hiring-manager-bar](https://github.com/kemiljk/skills/tree/main/skills/hiring-manager-bar) skill ([karlkoch.me](https://karlkoch.me); MIT, see [LICENSE-hiring-manager-bar](LICENSE-hiring-manager-bar)). The expected outcomes are rewritten for this skill: score out of 100, verdict bands, locked site scores 0, the 8 UXfolio red flags, evidence tags, Open checks and Need from you.

## Run them by hand

Works with any agent that can load the skill.

1. Install the skill and open a fresh chat for each case.
2. Paste the case's `request` and `supplied_evidence`. For a case with a `fixture`, give the agent the path to that folder as the link.
3. When the skill asks for a URL, reply with the `follow_up` text at the top of the file.
4. Check the answer against the case's `expected` list and the `shared_criteria`. Mark each item pass, fail or unsure, and quote the line that shows it.
5. Don't show the agent the expected answers.

Rerun the cases after you change `SKILL.md` or the references. These evals check the skill's behaviour. They don't measure hiring results.
