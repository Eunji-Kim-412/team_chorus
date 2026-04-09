# PREMORTEM — Chorus

A premortem imagines that the project has already failed — and asks why.
The goal is not to predict failure, but to surface risks early enough to act on them.

## How to read this document

For each risk, we identify:
- **What went wrong** — the failure scenario
- **Why it happened** — the root cause
- **How we prevent it** — the mitigation
- **Severity** — High / Medium / Low
- **Likelihood** — High / Medium / Low

Risks are ordered by priority (severity × likelihood).

---

## Risk 1 — The market already exists
**Severity: High | Likelihood: High**

**What went wrong**
Chorus launched into a space already occupied by Poe, TeamAI, TypingMind, and others. Users didn't switch because the alternatives were good enough.

**Why it happened**
We built a feature (multi-LLM comparison) that competitors already offer. We didn't clearly define what makes Chorus different, and couldn't answer "why not just use Poe?" in a convincing way.

**How we prevent it**
Chorus is not a comparison tool. It is a synthesis workspace.
Existing tools stop at "compare and pick one." Chorus goes further — users take answers from multiple models and actively combine, edit, and build from them. The core interaction is not selection, it's construction.

Additionally, the onboarding experience — where users articulate how they actually use each LLM — is a differentiator no competitor currently offers. It makes Chorus feel personal from the first minute.

The answer to "why not just use Poe?" is: Poe gives you four answers. Chorus helps you make one better one.

**Structural moat:** Even if competitors add a "synthesis mode," Chorus's advantage is the accumulated user workflow data — how each user combines models, which patterns they prefer, and what synthesis strategies work. This behavioral data compounds over time and cannot be replicated by copying a feature. The moat is not the feature; it's the personalization layer built on top of it.

---

## Risk 2 — The team couldn't agree on what Chorus is for
**Severity: High | Likelihood: High**

**What went wrong**
Five people agreed on the core features but had completely different visions for what Chorus should ultimately do — and for whom. The project stalled in endless debate and never found a clear direction.

**Why it happened**
The team was formed randomly. We never aligned on the "why" behind the product — only the "what." When difficult decisions came up (target user, scope, priorities), there was no shared foundation to fall back on.

**How we prevent it**
This document — MANIFEST, WHYTREE, PREMORTEM — is exactly the foundation. Before writing a single line of code, we establish:
- What Chorus believes (MANIFEST)
- Why Chorus exists, all the way up (WHYTREE)
- What could kill it, and how we respond (PREMORTEM)

When disagreements arise, we return to these documents. If a proposed feature or direction doesn't serve the person described in MANIFEST — a power user who already uses multiple LLMs and wants to synthesize, not just compare — we don't build it.

Alignment on principles before execution is the mitigation.

---

## Risk 3 — The technical load broke the team
**Severity: High | Likelihood: High**

**What went wrong**
With only one person with a technical background, that person became a bottleneck. They burned out, fell behind, or couldn't keep up with the team's ambitions. The project stalled.

**Why it happened**
We underestimated the gap between "Claude can help with coding" and "a non-technical team can build a product." The one technical member carried disproportionate responsibility, and the rest of the team couldn't contribute meaningfully to implementation.

**How we prevent it**
Three responses:

First, scope ruthlessly. Chorus MVP is three features: multi-send, side-by-side view, and basic mixing. Nothing else ships in v1.

Second, use Claude Code as a genuine equalizer — not just a helper for the technical member, but as a tool the whole team learns to use for specific, bounded tasks. Non-technical members own their parts of the product (copy, onboarding flow, UX decisions) and use Claude Code to implement them.

Third, the technical member's role shifts from "builder" to "architect and reviewer." They define the structure; the team builds within it with AI assistance.

**If Claude Code is not enough:** If non-technical members cannot deliver implementation-ready output within the first two sprints, we activate Plan B — engage a part-time freelance developer to handle implementation while the team focuses on product decisions, content, and UX. The budget for this contingency is defined before the project starts, not after the crisis hits.

---

## Risk 4 — A team member leaves
**Severity: High | Likelihood: Medium**

**What went wrong**
One of the five team members dropped out mid-project — due to personal reasons, loss of motivation, or conflict. The remaining four couldn't absorb the workload, and the project lost momentum.

**Why it happened**
The team was formed for a class or program context with no contractual commitment. There was no plan for what happens when someone leaves, and no documentation of individual responsibilities that others could pick up.

**How we prevent it**
Every team member documents their current work weekly in a shared log — not a report, just a running list of what they own and where it stands. If someone leaves, the team can see exactly what needs to be picked up.

Roles are defined with overlap. No single person is the sole owner of any critical path except the technical architect — and even that role has a documented fallback (Claude Code + freelancer contingency from Risk 3).

If the technical member specifically leaves, we immediately activate the freelancer plan. If a non-technical member leaves, we reduce scope rather than redistribute to already-loaded members.

---

## Risk 5 — The target user was too narrow
**Severity: Medium | Likelihood: Medium**

**What went wrong**
Almost no one needed Chorus. Most people use one or two LLMs casually and never feel the friction we were solving. The product was built for a niche that wasn't large enough to matter.

**Why it happened**
We built for ourselves — specifically, for users who already juggle multiple LLMs intentionally and feel the pain of doing so manually. That user exists, but is rare. We assumed the pain was universal when it was actually personal.

**How we prevent it**
We don't try to manufacture a need that isn't there.

Instead, we double down on the niche. The person who uses three or more LLMs regularly, pays for multiple subscriptions, and actively thinks about which model to use for which task — that person exists, is growing in number, and is completely underserved by current tools.

This is not a mass-market product. It is a power-user product. The risk is not that the niche is too small — it's that we lose confidence in the niche and try to broaden the product for people who don't need it. That path leads to a product that serves no one well.

Chorus should be exactly right for a small number of people, not roughly okay for everyone.

---

## Risk 6 — The use case was too vague
**Severity: Medium | Likelihood: Medium**

**What went wrong**
Chorus positioned itself as useful for "any question," but that breadth made it forgettable. Users couldn't identify a specific moment where Chorus was the obvious tool to reach for, so they didn't.

**Why it happened**
The team focused on what Chorus could do rather than when and why someone would open it. Without a concrete trigger — a specific task, context, or pain point — the product felt generic despite its differentiated mechanics.

**How we prevent it**
Define three concrete trigger scenarios: the moments where a power user would naturally think "this is exactly when I need Chorus."

Initial hypotheses (to be validated through user interviews before v1 launch):
1. **High-stakes drafting** — writing something important where getting it wrong has consequences (proposals, strategies, client-facing documents)
2. **Decision stress-testing** — asking multiple models to challenge an idea before committing to it
3. **Cross-domain synthesis** — combining research or perspectives from different fields into a single coherent output

These are hypotheses, not confirmed triggers. Before launch, we conduct at least 5 user interviews with target users to validate whether these scenarios match real behavior. If they don't, we revise the triggers — not the product.

Anchor all onboarding, copy, and UX flows to the validated scenarios. Every new user should be able to say, within two minutes, exactly when they'll use Chorus again.

If a proposed feature doesn't map to one of the three scenarios, it doesn't ship in v1.

---

## Risk 7 — A major platform launches a similar feature
**Severity: High | Likelihood: Medium**

**What went wrong**
OpenAI, Google, or Anthropic launched a built-in multi-model comparison or synthesis feature within their own platform. Overnight, the core value proposition of Chorus became a free add-on inside a tool users already pay for.

**Why it happened**
We built a product that sits on top of platforms controlled by potential competitors. We assumed they wouldn't move into our space quickly, but the LLM market moves faster than any product roadmap.

**How we prevent it**
Accept that this will likely happen — and plan for it.

Platform-native features will be generic. Chorus's advantage is depth: personalized routing, workflow memory, and synthesis patterns tuned to individual users. A platform can add "compare two models" but cannot easily replicate "this tool knows how I think and which combinations work for me."

Ship fast. The window of opportunity is finite. Every month before a platform launches a competing feature is a month to build user habits and workflow lock-in.

If a platform does launch a competing feature, our response is not panic — it's to go deeper into the power-user niche where platform defaults will never be sufficient.

---

## Risk 8 — API costs were higher than expected
**Severity: Medium | Likelihood: Medium**

**What went wrong**
Smart routing was supposed to keep costs manageable, but costs scaled faster than expected. Users selected all available models out of habit, query-intent analysis added its own token overhead, and multi-provider API fees accumulated quickly. At a certain point, the per-query cost exceeded what users would pay for a single model directly — and the value proposition collapsed for cost-sensitive users.

**Why it happened**
We assumed smart routing would naturally minimize cost. We didn't account for the gap between optimal routing and actual user behavior, or for the compounding overhead of running the routing layer itself.

**How we prevent it**
Default to the top-1 recommended model, not top-3. Users must actively choose to query more models — the default path is the cheapest path.

Display an estimated cost per query before submission. Transparency shifts the decision back to the user and reduces unconscious overuse.

Set soft caps per session with a visible indicator. Users who approach a cost threshold are prompted to review their selection, not hard-blocked.

Track cost-per-query metrics in analytics from day one. If average cost trends above a defined threshold, it becomes a product emergency, not a background concern.

---

## Risk 9 — API access and rate limits became a bottleneck
**Severity: Medium | Likelihood: Medium**

**What went wrong**
One of our core LLM providers changed its pricing, discontinued a model we relied on, or aggressively throttled usage as our volume grew. A key part of the user experience broke overnight — and we had no fallback.

**Why it happened**
We built directly against specific provider APIs without an abstraction layer. The product's architecture assumed stable, uninterrupted access to third-party services we don't control.

**How we prevent it**
Build a provider abstraction layer from the start. Every model call goes through an internal routing interface — not a direct API call. This makes swapping or degrading providers a configuration change, not a rewrite.

Maintain at least one fallback option for each core model capability. If GPT-4o becomes unavailable, Chorus degrades gracefully to Claude or Gemini for that task type.

Monitor provider status and rate limit headers in real time. Surface degradation to users transparently rather than silently failing.

Treat API dependency risk as an ongoing architecture concern, not a one-time setup. Review provider health quarterly.

---

## Risk 10 — The comparison UI caused decision fatigue
**Severity: Medium | Likelihood: High**

**What went wrong**
Users opened Chorus, saw three different outputs from three different models, and froze. Instead of feeling helped, they felt overwhelmed. The tool that was supposed to reduce cognitive load added to it. Users churned or reverted to single-model tools.

**Why it happened**
We optimized for showing the user more — more models, more outputs, more options. We assumed that more information equals more value. It doesn't. Without a clear signal for which output is better, users bear the full weight of evaluation.

**How we prevent it**
Separate modes, not just labels. "Quick compare" mode shows a clean, scannable diff between two outputs with a recommended starting point. "Think mode" is for users who want to engage deeply — it's opt-in, not default.

Reduce the default output count. Show one recommended output by default; let users reveal others with a single tap. Fewer choices at first glance, more control when wanted.

Add lightweight quality signals. Even a simple heuristic — "this model performs best for structured tasks" — gives users a foothold without requiring deep evaluation.

Test with first-time users specifically. Decision fatigue appears fastest on first use. If new users can't identify which output to use within 30 seconds, the UI needs revision.

---

## Risk 11 — Users try once but never come back
**Severity: High | Likelihood: Medium**

**What went wrong**
Chorus had decent initial sign-ups, but Day-7 retention was below 10%. Users understood the concept, tried it once out of curiosity, and never returned. The product became a demo, not a tool.

**Why it happened**
The first session didn't create a reason to return. Users saw the multi-model output, thought "that's cool," but didn't experience a moment where Chorus produced something they couldn't have gotten from a single model. Without that moment, there's no habit formation.

**How we prevent it**
Design the first session to guarantee one "aha moment" — a concrete instance where the synthesized output is visibly better than any single model's answer. This might mean curating the first query, pre-selecting an optimal model combination, or showing a before/after comparison.

Implement a lightweight re-engagement trigger. After the first session, send one follow-up (not a generic email — a specific prompt based on what the user tried) suggesting a scenario where Chorus would help.

Track Day-1, Day-7, and Day-30 retention from launch. If Day-7 drops below 15%, treat it as a product crisis and run user interviews immediately to understand why.

---

## Summary

| Priority | Risk | Severity | Likelihood | Root cause | Mitigation |
|----------|------|----------|------------|------------|------------|
| 1 | Competitors already exist | High | High | Feature overlap, no clear differentiation | Synthesis vs. comparison + structural moat via personalization data |
| 2 | Team misalignment | High | High | No shared "why," only shared "what" | MANIFEST + WHYTREE as decision foundation |
| 3 | Technical overload | High | High | 1 tech member, overloaded | Ruthless scope + Claude Code for whole team + freelancer Plan B |
| 4 | Team member leaves | High | Medium | No commitment structure, no handoff plan | Weekly work logs, role overlap, contingency plans per role |
| 5 | Platform launches similar feature | High | Medium | Building on top of potential competitors | Ship fast, go deep into niche, personalization as moat |
| 6 | Users don't come back | High | Medium | No "aha moment" in first session | Curated first experience, retention tracking from Day 1 |
| 7 | Target user too narrow | Medium | Medium | Built for ourselves, assumed universal pain | Own the niche, don't dilute for mass market |
| 8 | Use case too vague | Medium | Medium | No clear trigger scenario | 3 trigger hypotheses, validated via user interviews before launch |
| 9 | API costs too high | Medium | Medium | Routing overhead + user habit | Default to top-1 model; show cost per query; soft caps |
| 10 | API access & rate limits | Medium | Medium | Third-party dependency | Provider abstraction layer; fallback routing per model |
| 11 | Comparison UI causes decision fatigue | Medium | High | Too many outputs, no quality signal | Separate quick/think modes; reduce default output count |

---

## Changelog (v1 → v2)

| Change | Reason |
|--------|--------|
| Added severity/likelihood ratings | Enable prioritization of risks |
| Added structural moat to Risk 1 | Original lacked defense against competitors copying the feature |
| Added freelancer Plan B to Risk 3 | Original relied on unvalidated assumption that Claude Code is sufficient |
| Added Risk 4 (team member leaves) | Critical gap — original had no people-risk beyond alignment |
| Added Risk 7 (platform competition) | Original ignored the biggest existential threat |
| Added Risk 11 (retention) | Original covered acquisition but not retention |
| Clarified trigger scenarios in Risk 6 as hypotheses | Original presented assumptions as facts |
| Reordered risks by priority | Original listed risks without prioritization |

---
---

# 프리모템 — Chorus (v2)

프리모템은 프로젝트가 이미 실패했다고 가정하고 — 왜 실패했는지를 묻는다.
목표는 실패를 예측하는 것이 아니라, 충분히 일찍 리스크를 발견해서 대응하는 것이다.

## 이 문서를 읽는 방법

각 리스크에 대해 다음을 정리한다:
- **무엇이 잘못되었나** — 실패 시나리오
- **왜 그렇게 되었나** — 근본 원인
- **어떻게 막을 것인가** — 대응 방안
- **심각도** — 높음 / 중간 / 낮음
- **발생 가능성** — 높음 / 중간 / 낮음

리스크는 우선순위(심각도 × 발생 가능성) 순으로 정렬되어 있다.

---

## 리스크 1 — 시장이 이미 존재한다
**심각도: 높음 | 발생 가능성: 높음**

**무엇이 잘못되었나**
Chorus는 Poe, TeamAI, TypingMind 등이 이미 자리잡은 시장에 출시되었다. 유저들은 기존 대안으로 충분했기 때문에 갈아타지 않았다.

**왜 그렇게 되었나**
경쟁자들이 이미 제공하는 기능(멀티 LLM 비교)을 만들었다. Chorus가 무엇이 다른지 명확히 정의하지 못했고, "그냥 Poe 쓰면 되지 않나요?"라는 질문에 설득력 있게 답하지 못했다.

**어떻게 막을 것인가**
Chorus는 비교 도구가 아니다. 합성 워크스페이스다.
기존 도구는 "비교하고 하나를 고른다"에서 멈춘다. Chorus는 더 나아간다 — 여러 모델의 답변을 재료로 삼아 능동적으로 조합하고, 편집하고, 구축한다. 핵심 인터랙션은 선택이 아니라 구성이다.

또한, 유저가 각 LLM을 실제로 어떻게 사용하는지 스스로 인식하게 하는 온보딩 경험은 현재 어떤 경쟁자도 제공하지 않는 차별점이다.

"그냥 Poe 쓰면 되지 않나요?"에 대한 답: Poe는 네 개의 답을 준다. Chorus는 더 나은 하나를 만들도록 돕는다.

**구조적 해자:** 경쟁자가 "합성 모드"를 추가하더라도, Chorus의 우위는 축적된 유저 워크플로우 데이터에 있다 — 각 유저가 모델을 어떻게 조합하는지, 어떤 패턴을 선호하는지, 어떤 합성 전략이 효과적인지. 이 행동 데이터는 시간이 지날수록 복리로 쌓이며, 기능을 복사하는 것만으로는 재현할 수 없다. 해자는 기능이 아니라 그 위에 구축된 개인화 레이어다.

---

## 리스크 2 — 팀이 Chorus의 방향에 합의하지 못했다
**심각도: 높음 | 발생 가능성: 높음**

**무엇이 잘못되었나**
다섯 명이 핵심 기능에는 동의했지만, Chorus가 궁극적으로 무엇을 해야 하는지에 대해 완전히 다른 비전을 가지고 있었다. 프로젝트는 끝없는 논쟁 속에서 방향을 잡지 못하고 표류했다.

**왜 그렇게 되었나**
팀은 랜덤으로 구성되었다. 우리는 제품 뒤의 "왜"가 아니라 "무엇"에만 합의했다. 어려운 결정이 올 때 — 타겟 유저, 스코프, 우선순위 — 돌아갈 공통 기반이 없었다.

**어떻게 막을 것인가**
이 문서 — MANIFEST, WHYTREE, PREMORTEM — 가 바로 그 기반이다. 코드 한 줄 쓰기 전에 우리는 정립한다:
- Chorus가 믿는 것 (MANIFEST)
- Chorus가 존재하는 이유, 끝까지 (WHYTREE)
- Chorus를 죽일 수 있는 것, 그리고 대응 (PREMORTEM)

의견 충돌이 생기면 이 문서로 돌아온다. 제안된 기능이나 방향이 MANIFEST에서 정의한 사람 — 이미 여러 LLM을 쓰고 있고 비교가 아닌 합성을 원하는 파워유저 — 을 위한 것이 아니라면, 만들지 않는다.

실행 전 원칙에 대한 합의가 대응 방안이다.

---

## 리스크 3 — 기술적 부담이 팀을 무너뜨렸다
**심각도: 높음 | 발생 가능성: 높음**

**무엇이 잘못되었나**
기술 배경을 가진 사람이 한 명뿐이어서 그 사람이 병목이 되었다. 번아웃이 오거나, 팀의 야망을 따라가지 못했다. 프로젝트가 멈췄다.

**왜 그렇게 되었나**
"Claude가 코딩을 도와줄 수 있다"와 "비기술 팀이 제품을 만들 수 있다" 사이의 간극을 과소평가했다. 기술 멤버 한 명이 불균형한 책임을 졌고, 나머지는 구현에 의미 있게 기여하지 못했다.

**어떻게 막을 것인가**
세 가지 대응:

첫째, 스코프를 철저히 좁힌다. Chorus MVP는 세 가지 기능뿐이다: 멀티-send, 나란히 보기, 기본 믹싱. v1에서는 그 외 아무것도 출시하지 않는다.

둘째, Claude Code를 진정한 이퀄라이저로 사용한다 — 기술 멤버만의 도구가 아니라, 팀 전체가 각자의 영역에서 활용하는 도구로. 비기술 멤버도 카피, 온보딩 플로우, UX 결정을 소유하고 Claude Code로 구현한다.

셋째, 기술 멤버의 역할을 "만드는 사람"에서 "구조를 정의하고 리뷰하는 사람"으로 전환한다. 구조는 그가 잡고, 팀이 AI의 도움으로 그 안에서 만든다.

**Claude Code로 충분하지 않을 경우:** 비기술 멤버가 처음 두 스프린트 내에 구현 가능한 결과물을 내지 못하면, 플랜 B를 가동한다 — 파트타임 프리랜서 개발자를 투입하여 구현을 맡기고, 팀은 제품 결정, 콘텐츠, UX에 집중한다. 이 비상 예산은 위기가 터진 후가 아니라 프로젝트 시작 전에 확보해 둔다.

---

## 리스크 4 — 팀원이 이탈한다
**심각도: 높음 | 발생 가능성: 중간**

**무엇이 잘못되었나**
다섯 명 중 한 명이 프로젝트 중간에 빠졌다 — 개인 사정, 동기 상실, 또는 갈등으로. 남은 네 명이 업무를 흡수하지 못했고, 프로젝트는 추진력을 잃었다.

**왜 그렇게 되었나**
팀은 수업이나 프로그램 맥락에서 구성되었고 계약적 구속력이 없었다. 누군가 빠졌을 때 어떻게 할지에 대한 계획이 없었고, 다른 사람이 이어받을 수 있도록 개인 업무가 문서화되어 있지 않았다.

**어떻게 막을 것인가**
모든 팀원은 매주 공유 로그에 현재 작업을 기록한다 — 보고서가 아니라, 자신이 맡은 것과 진행 상태의 간단한 목록이다. 누군가 빠지면 팀이 정확히 무엇을 이어받아야 하는지 바로 파악할 수 있다.

역할은 중복되도록 정의한다. 기술 아키텍트를 제외하고는 어떤 핵심 경로도 한 사람만의 소유가 아니다 — 그리고 그 역할조차 문서화된 대안이 있다 (리스크 3의 Claude Code + 프리랜서 비상 계획).

기술 멤버가 빠지면 즉시 프리랜서 계획을 가동한다. 비기술 멤버가 빠지면 이미 부하가 걸린 멤버에게 재분배하지 않고 스코프를 줄인다.

---

## 리스크 5 — 타겟 유저가 너무 좁았다
**심각도: 중간 | 발생 가능성: 중간**

**무엇이 잘못되었나**
거의 아무도 Chorus를 필요로 하지 않았다. 대부분의 사람들은 LLM 한두 개를 가볍게 쓰고 우리가 해결하려는 마찰을 느끼지 않았다. 제품은 충분히 크지 않은 니치를 위해 만들어졌다.

**왜 그렇게 되었나**
우리 자신을 위해 만들었다 — 구체적으로, 이미 여러 LLM을 의도적으로 쓰고 수동으로 할 때의 불편함을 느끼는 유저를 위해. 그 유저는 존재하지만 드물다. 우리는 그 고통이 보편적이라고 가정했지만 사실은 개인적인 것이었다.

**어떻게 막을 것인가**
존재하지 않는 니즈를 만들려 하지 않는다.

대신, 니치에 더 깊이 집중한다. 세 개 이상의 LLM을 정기적으로 쓰고, 여러 구독료를 내고, 어떤 모델을 어떤 용도로 쓸지 능동적으로 생각하는 사람 — 그 사람은 존재하고, 그 수는 늘고 있고, 현재 도구로는 완전히 서비스받지 못하고 있다.

이것은 매스마켓 제품이 아니다. 파워유저 제품이다. 리스크는 니치가 너무 작다는 것이 아니라 — 우리가 니치에 대한 확신을 잃고 필요 없는 사람들을 위해 제품을 넓히려는 것이다. 그 길은 아무도 잘 서비스받지 못하는 제품으로 이어진다.

Chorus는 소수의 사람들에게 정확히 맞아야 한다. 모두에게 대충 괜찮으면 안 된다.

---

## 리스크 6 — 사용 시나리오가 너무 애매했다
**심각도: 중간 | 발생 가능성: 중간**

**무엇이 잘못되었나**
Chorus는 "어떤 질문에도 유용하다"고 포지셔닝했지만, 오히려 그 범용성이 존재감을 흐렸다. 유저들은 Chorus를 꺼내야 할 구체적인 순간을 떠올리지 못했고, 결국 쓰지 않았다.

**왜 그렇게 되었나**
팀은 Chorus가 무엇을 할 수 있는지에 집중했고, 언제 그리고 왜 누군가가 Chorus를 여는지는 정의하지 않았다. 구체적인 트리거 — 특정 작업, 맥락, 고통의 순간 — 없이 제품은 차별화된 메커니즘에도 불구하고 평범하게 느껴졌다.

**어떻게 막을 것인가**
구체적인 트리거 시나리오 세 가지를 정의한다. 파워유저가 자연스럽게 "지금이 바로 Chorus가 필요한 순간"이라고 생각하게 되는 상황들이다.

초기 가설 (v1 출시 전 유저 인터뷰를 통해 검증 필요):
1. **고위험 문서 작성** — 잘못되면 결과가 따르는 중요한 글쓰기 (제안서, 전략 문서, 고객 대면 문서)
2. **의사결정 스트레스 테스트** — 결정을 내리기 전에 여러 모델에게 아이디어를 검증받기
3. **교차 분야 합성** — 서로 다른 분야의 리서치나 관점을 하나의 일관된 결과물로 합치기

이것들은 가설이지 확인된 트리거가 아니다. 출시 전에 타겟 유저 최소 5명과 인터뷰를 진행하여 이 시나리오가 실제 행동과 일치하는지 검증한다. 일치하지 않으면 트리거를 수정한다 — 제품이 아니라.

모든 온보딩, 카피, UX 플로우를 검증된 시나리오에 맞춘다. 모든 신규 유저가 2분 안에 언제 다시 Chorus를 쓸지 말할 수 있어야 한다.

제안된 기능이 세 가지 시나리오 중 하나에 대응하지 않는다면 v1에는 들어가지 않는다.

---

## 리스크 7 — 주요 플랫폼이 유사 기능을 출시한다
**심각도: 높음 | 발생 가능성: 중간**

**무엇이 잘못되었나**
OpenAI, Google, 또는 Anthropic이 자체 플랫폼 내에 멀티 모델 비교 또는 합성 기능을 내장 출시했다. 하룻밤 사이에 Chorus의 핵심 가치 제안이 유저들이 이미 결제하고 있는 도구의 무료 부가 기능이 되었다.

**왜 그렇게 되었나**
잠재적 경쟁자가 통제하는 플랫폼 위에 제품을 만들었다. 그들이 우리 영역으로 빠르게 진입하지 않을 것이라 가정했지만, LLM 시장은 어떤 제품 로드맵보다 빠르게 움직인다.

**어떻게 막을 것인가**
이런 일이 일어날 가능성이 높다는 것을 받아들이고 — 대비한다.

플랫폼 네이티브 기능은 범용적일 수밖에 없다. Chorus의 우위는 깊이에 있다: 개인화된 라우팅, 워크플로우 기억, 개별 유저에 맞춰진 합성 패턴. 플랫폼은 "두 모델 비교"를 추가할 수 있지만, "이 도구는 내가 어떻게 생각하는지, 어떤 조합이 나에게 맞는지 안다"를 쉽게 재현할 수 없다.

빠르게 출시한다. 기회의 창은 유한하다. 플랫폼이 경쟁 기능을 출시하기 전의 매달이 유저 습관과 워크플로우 고착을 만들 수 있는 시간이다.

플랫폼이 경쟁 기능을 출시하면, 우리의 대응은 패닉이 아니라 — 플랫폼 기본값으로는 절대 충분하지 않을 파워유저 니치로 더 깊이 들어가는 것이다.

---

## 리스크 8 — API 비용이 예상보다 높았다
**심각도: 중간 | 발생 가능성: 중간**

**무엇이 잘못되었나**
스마트 라우팅이 비용을 낮게 유지할 것이라 기대했지만, 비용은 예상보다 빠르게 늘었다. 유저들은 습관적으로 전체 모델을 선택했고, 쿼리 의도 분석 자체도 토큰 비용을 만들었으며, 멀티 제공업체 API 비용이 빠르게 누적됐다. 쿼리당 비용이 단일 모델을 직접 쓰는 것보다 비싸지자, 비용에 민감한 유저들에게 가치 제안은 무너졌다.

**왜 그렇게 되었나**
스마트 라우팅이 자연스럽게 비용을 최소화할 것이라 가정했다. 최적 라우팅과 실제 유저 행동 사이의 간극, 그리고 라우팅 레이어 자체의 누적 오버헤드를 고려하지 않았다.

**어떻게 막을 것인가**
기본값은 상위 1개 추천 모델로 설정한다. 유저가 더 많은 모델을 쿼리하려면 능동적으로 선택해야 한다 — 기본 경로가 가장 저렴한 경로다.

쿼리 제출 전에 예상 비용을 표시한다. 투명성은 결정권을 유저에게 돌려주고 무의식적인 과사용을 줄인다.

세션당 소프트 상한을 설정하고 시각적 지표를 제공한다. 비용 임계점에 다가가는 유저에게는 선택을 재검토하도록 안내하되, 강제 차단은 하지 않는다.

쿼리당 비용 지표를 처음부터 애널리틱스에서 추적한다. 평균 비용이 정의된 기준을 초과하면 백그라운드 우려 사항이 아닌 제품 긴급 사안으로 다룬다.

---

## 리스크 9 — API 접근 및 속도 제한이 병목이 되었다
**심각도: 중간 | 발생 가능성: 중간**

**무엇이 잘못되었나**
핵심 LLM 제공업체 중 하나가 가격 정책을 바꾸거나, 우리가 의존하던 모델의 지원을 중단하거나, 사용량이 늘면서 공격적으로 속도 제한을 걸었다. 핵심 유저 경험이 하룻밤 사이에 깨졌고, 대안이 없었다.

**왜 그렇게 되었나**
추상화 레이어 없이 특정 제공업체 API에 직접 의존하는 구조로 만들었다. 우리가 통제할 수 없는 서드파티 서비스에 대한 안정적이고 중단 없는 접근을 당연시했다.

**어떻게 막을 것인가**
처음부터 제공업체 추상화 레이어를 만든다. 모든 모델 호출은 직접 API 호출이 아닌 내부 라우팅 인터페이스를 통한다. 이렇게 하면 제공업체 교체나 다운그레이드가 전면 재작성이 아닌 설정 변경으로 가능해진다.

핵심 모델 기능별로 최소 하나의 폴백 옵션을 유지한다. GPT-4o를 쓸 수 없게 되면, 해당 작업 유형에 대해 Claude나 Gemini로 점진적으로 다운그레이드된다.

제공업체 상태와 속도 제한 헤더를 실시간으로 모니터링한다. 성능 저하를 조용히 실패시키지 않고 유저에게 투명하게 알린다.

API 의존성 리스크를 일회성 설정이 아닌 지속적인 아키텍처 과제로 다룬다. 제공업체 상태를 분기별로 점검한다.

---

## 리스크 10 — 비교 UI가 결정 피로도를 만들었다
**심각도: 중간 | 발생 가능성: 높음**

**무엇이 잘못되었나**
유저들이 Chorus를 열고 세 모델의 서로 다른 출력을 마주하자 얼어붙었다. 도움을 받는다는 느낌 대신 압도감을 느꼈다. 인지 부하를 줄이려던 도구가 오히려 부하를 더했다. 유저들은 이탈하거나 단일 모델 도구로 돌아갔다.

**왜 그렇게 되었나**
더 많은 모델, 더 많은 출력, 더 많은 옵션을 보여주는 것을 최적화했다. 더 많은 정보가 더 많은 가치라고 가정했다. 그렇지 않다. 어느 출력이 더 나은지에 대한 명확한 신호 없이, 유저가 평가의 부담을 고스란히 떠안게 된다.

**어떻게 막을 것인가**
레이블이 아닌 모드 분리. "빠른 비교" 모드는 두 출력 사이의 깔끔하고 스캔하기 쉬운 diff와 추천 시작점을 보여준다. "사고 모드"는 깊이 있게 탐구하고 싶은 유저를 위한 것으로, 기본값이 아닌 선택지다.

기본 출력 수를 줄인다. 기본적으로 추천 출력 하나만 보여주고, 한 번의 탭으로 다른 것들을 볼 수 있게 한다. 첫눈에 보이는 선택지를 줄이고, 원할 때 더 많은 제어권을 제공한다.

가벼운 품질 신호를 추가한다. "이 모델은 구조화된 작업에 가장 적합합니다" 같은 단순한 휴리스틱이라도 유저에게 발판을 제공하고 깊은 평가를 요구하지 않는다.

신규 유저를 대상으로 특별히 테스트한다. 결정 피로도는 첫 사용에서 가장 빠르게 나타난다. 신규 유저가 30초 안에 어떤 출력을 사용할지 파악하지 못한다면, UI를 수정해야 한다.

---

## 리스크 11 — 유저가 한 번 써보고 다시 오지 않는다
**심각도: 높음 | 발생 가능성: 중간**

**무엇이 잘못되었나**
Chorus는 초기 가입 수는 괜찮았지만, 7일 리텐션이 10% 미만이었다. 유저들은 컨셉을 이해하고 호기심에 한 번 써봤지만, 다시 돌아오지 않았다. 제품은 도구가 아닌 데모가 되었다.

**왜 그렇게 되었나**
첫 세션이 돌아올 이유를 만들지 못했다. 유저들은 멀티 모델 출력을 보고 "신기하네"라고 생각했지만, 단일 모델로는 얻을 수 없는 결과를 Chorus가 만들어낸 순간을 경험하지 못했다. 그 순간이 없으면 습관이 형성되지 않는다.

**어떻게 막을 것인가**
첫 세션에서 반드시 하나의 "아하 모먼트"를 보장하도록 설계한다 — 합성된 결과물이 어떤 단일 모델의 답변보다 눈에 띄게 나은 구체적 사례. 이를 위해 첫 쿼리를 큐레이션하거나, 최적의 모델 조합을 미리 선택하거나, 전후 비교를 보여줄 수 있다.

가벼운 재참여 트리거를 구현한다. 첫 세션 후 하나의 후속 메시지를 보낸다 (일반적인 이메일이 아니라 — 유저가 시도한 내용을 기반으로 한 구체적인 프롬프트로 Chorus가 도움이 될 시나리오를 제안).

출시 시점부터 Day-1, Day-7, Day-30 리텐션을 추적한다. Day-7이 15% 아래로 떨어지면 제품 위기로 간주하고 즉시 유저 인터뷰를 진행하여 원인을 파악한다.

---

## 요약

| 우선순위 | 리스크 | 심각도 | 발생 가능성 | 근본 원인 | 대응 방안 |
|----------|--------|--------|-------------|-----------|-----------|
| 1 | 경쟁자 이미 존재 | 높음 | 높음 | 기능 중복, 차별화 불명확 | 합성 vs. 비교 + 개인화 데이터 기반 구조적 해자 |
| 2 | 팀 방향성 충돌 | 높음 | 높음 | 공통 "왜" 없이 "무엇"만 합의 | MANIFEST + WHYTREE를 의사결정 기반으로 |
| 3 | 기술 과부하 | 높음 | 높음 | 기술 멤버 1명, 과도한 책임 | 스코프 축소 + 팀 전체 Claude Code 활용 + 프리랜서 플랜 B |
| 4 | 팀원 이탈 | 높음 | 중간 | 구속력 없는 구조, 인수인계 계획 부재 | 주간 작업 로그, 역할 중복, 역할별 비상 계획 |
| 5 | 플랫폼 유사 기능 출시 | 높음 | 중간 | 잠재적 경쟁자 플랫폼 위에 구축 | 빠른 출시, 니치 심화, 개인화를 해자로 |
| 6 | 유저 재방문 없음 | 높음 | 중간 | 첫 세션에 "아하 모먼트" 부재 | 큐레이션된 첫 경험, Day 1부터 리텐션 추적 |
| 7 | 타겟 유저 너무 좁음 | 중간 | 중간 | 자신을 위해 만들고 보편적 고통이라 가정 | 니치를 희석하지 않고 더 깊이 집중 |
| 8 | 사용 시나리오 애매 | 중간 | 중간 | 언제/왜 쓰는지 구체적 상황 없음 | 트리거 가설 3가지, 출시 전 유저 인터뷰로 검증 |
| 9 | API 비용 초과 | 중간 | 중간 | 라우팅 오버헤드 + 습관적 전체 모델 선택 | 기본값 상위 1개 모델; 쿼리당 비용 표시; 소프트 상한 |
| 10 | API 접근 및 속도 제한 | 중간 | 중간 | 서드파티 제공업체 의존 | 제공업체 추상화 레이어; 모델별 폴백 라우팅 |
| 11 | 비교 UI 결정 피로도 | 중간 | 높음 | 출력물 과다, 품질 신호 부재 | "빠른 비교"와 "사고 모드" 분리; 기본 출력 수 축소 |

---

## 변경 이력 (v1 → v2)

| 변경 사항 | 이유 |
|-----------|------|
| 심각도/발생 가능성 등급 추가 | 리스크 우선순위 판단 가능하도록 |
| 리스크 1에 구조적 해자 추가 | 원본에 경쟁자가 기능을 복사할 경우의 방어 전략 부재 |
| 리스크 3에 프리랜서 플랜 B 추가 | 원본이 Claude Code 충분성이라는 미검증 가정에 의존 |
| 리스크 4 (팀원 이탈) 추가 | 핵심 공백 — 원본에 방향성 합의 외 인적 리스크 부재 |
| 리스크 7 (플랫폼 경쟁) 추가 | 원본이 가장 큰 존재적 위협을 무시 |
| 리스크 11 (리텐션) 추가 | 원본이 유저 획득만 다루고 유지는 미다룸 |
| 리스크 6의 트리거 시나리오를 가설로 명시 | 원본이 가정을 사실처럼 제시 |
| 우선순위 기준으로 리스크 재정렬 | 원본에 우선순위 없이 나열 |


<img width="468" height="614" alt="image" src="https://github.com/user-attachments/assets/936b7226-b376-4f01-8228-79b7eb05ebaa" />
