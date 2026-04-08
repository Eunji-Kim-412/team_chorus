# WHY TREE — Chorus (한국어)

Why Tree 방법론을 사용합니다. 제품에서 시작해 "Why?" 위로 물어 핵심 욕구를 찾고, "How?"를 아래로 물어 대안적인 수단들을 열거합니다.

---

## Why Tree란?

Why Tree는 Rasmussen이 개발한 Work Domain Analysis(WDA)에서 영감을 받아 만들어진 방법론입니다. 수단-목적 링크(means-ends link)의 힘을 활용해 시스템을 이해하고 설계하는 도구입니다. WDA의 축소판이지만, 수단-목적 관계를 더 세밀하게 다뤄 일상적인 문제 해결과 설계에도 적용할 수 있도록 만들어졌습니다.

**두 가지 핵심 움직임:**
* **Why Up** — 각 수단에 "왜?"를 재귀적으로 질문하며 트리 위로 올라간다. 행동의 본질과 핵심 가치를 발견한다.
* **How Down** — 각 목적에 "어떻게?"를 재귀적으로 질문한다. 같은 목표를 달성하는 대안적 수단을 열거해 집중된 브레인스토밍을 가능하게 한다.

---

## Why Up

**Chorus (제품)**

→ **왜?** 유저는 다양한 모델을 활용해 창의적인 초안을 얻고, 정보의 정확도를 교차 검증하기를 원함.
→ **왜?** 단순히 답변을 나열하는 것이 아니라, 여러 모델의 장점을 취합해 더 풍부하고 정확한 결과물을 만들기 위함.
→ **왜?** 고난도 업무에서 실수 리스크를 줄이고 높은 수준의 성과를 달성하기 위함.
→ **왜?** 궁극적으로 도구에 의존하는 것이 아니라 도구를 지배하여 더 나은 삶과 업무 환경을 누리기 위함.

> **수렴 지점:** "더 풍부하고 정확한 결과물 만들기"는 Chorus가 단순 비교 툴과 차별화되는 핵심 가치임.

---

## How Down

### Layer 1 — 창의적 초안 얻기 + 정보 교차 검증
**어떻게? (대안적 수단들)**
* 하나의 LLM에게 여러 번 다른 프롬프트로 요청
* 구글링, 논문, 유튜브 등 여러 소스 직접 검색
* 동료나 전문가에게 의견 요청
* **여러 LLM에게 동시에 질문해서 답변을 나란히 비교 ← Chorus는 여기**

### Layer 2 — 더 풍부하고 정확한 결과물 만들기
**어떻게? (대안적 수단들)**
* 전문가나 동료에게 직접 피드백 요청
* 리서치 논문이나 레퍼런스 자료 직접 수집
* 하나의 LLM에게 반복적으로 다듬어달라고 요청
* **여러 LLM의 답변을 비교·분석하고 통합 ← Chorus는 여기**

### Layer 3 — 더 나은 의사결정
**어떻게? (대안적 수단들)**
* 멘토나 전문가에게 조언 구하기
* 데이터와 리서치를 직접 수집해 분석
* 의사결정 프레임워크(장단점 분석 등) 활용
* **여러 LLM의 답변에서 불일치를 발견하고 판단의 재료로 삼기 ← Chorus는 여기**

### Layer 4 — 더 나은 삶과 업무
**어떻게? (대안적 수단들)**
* 건강, 관계, 재정 관리
* 생산성 도구 활용
* 학습과 역량 개발
* **더 나은 의사결정을 통해 ← Chorus는 이 가지에 있다**

---

## 핵심 인사이트

중간 단계의 "Why"인 "더 풍부하고 정확한 결과물 만들기"는 파워 유저가 자연스럽게 Chorus를 찾게 되는 구체적인 트리거 시나리오와 직결됨.

* **정보의 취합:** 각 모델의 강점(작문, 논리, 이미지 생성 등)을 파편화된 도구가 아닌 하나의 워크스페이스에서 융합하는 것이 핵심 수단임.
* **의사결정 지원:** Conductor 모드와 Compose 모드는 유저가 여러 답변 사이에서 길을 잃지 않고 자신만의 결론에 도달하도록 돕는 두 가지 접근법이다. Conductor 모드는 통합 초안을 자동 생성하고, Compose 모드는 유저가 직접 선택·조합해 나만의 캔버스를 구성한다.
* **리스크 관리:** API 추상화 레이어는 유저가 특정 모델의 장애나 정책 변경에 구애받지 않고 항상 최적의 정보를 얻을 수 있도록 보장함.

---

## 트리 시각화

```text
          더 나은 삶과 업무 환경
                  │
      실수 리스크 감소 + 높은 수준의 성과 달성
                  │
         더 풍부하고 정확한 결과물 만들기 
      (단순 비교를 넘어 여러 모델의 장점을 취합)
                  │
        창의적 초안 확보 + 정보의 정확도 교차 
           _________│__________________________
           │                                  │
    [How: 의사결정 지원]           [How: 정보의 취합 및 관리]
    _______│_______                   _______│_______
    │             │                   │             │
  Conductor      Compose            워크스페이스      API 추상화
    모드            모드                융합            레이어 
    │              │                  │             │
  (통합 초안      (직접 선택/          (작문/논리 등      (모델 장애/
   자동 생성)     조합형 캔버스)        모델 강점 결합)    정책 변경 대응)


---


# WHY TREE — Chorus

*Built using the Why Tree method: starting from our product, asking "Why?" upward to find the core desire, then asking "How?" downward to enumerate alternative means.*

---

## What is Why Tree?

Why Tree is a method inspired by Work Domain Analysis (WDA), originally developed by Rasmussen. At its core, it harnesses the power of means-ends links to understand and design systems. It is a scaled-down version of WDA, with more nuanced means-ends relationships — designed to help people apply the technique in everyday problem solving and design.

**The two core moves:**

- **Why Up** — Ask "why?" recursively on each means, going up the tree. This surfaces the deeper essence and core values of what you are doing.
- **How Down** — Ask "how?" recursively on each end. This enumerates alternative means to achieve the same goal, enabling focused brainstorming.

---

## Why Up

**Chorus (the product)**

→ Why? Users want to use various models to obtain creative drafts and cross-verify the accuracy of information.

→ Why? Instead of just listing answers, they want to combine the strengths of multiple models to create richer and more accurate outcomes.

→ Why? To reduce the risk of errors in high-stakes tasks and achieve a high level of performance.

→ Why? Ultimately, to master the tools rather than depend on them — leading to a better life and work environment.

> *Convergence point: "Creating richer and more accurate outcomes" is the core value that differentiates Chorus from simple comparison tools.*

---

## How Down

### Layer 1 — Obtaining creative drafts + cross-verifying information accuracy

**How? (Alternative means)**

- Ask a single LLM multiple times with different prompts
- Search multiple sources directly (Google, papers, YouTube, etc.)
- Ask colleagues or experts for their opinions
- **Ask multiple LLMs simultaneously and compare answers side by side ← Chorus is here**

### Layer 2 — Creating richer and more accurate outcomes

**How? (Alternative means)**

- Request direct feedback from experts or colleagues
- Collect research papers or reference materials directly
- Ask a single LLM to iteratively refine the answer
- **Compare and analyze responses from multiple LLMs and synthesize them ← Chorus is here**

### Layer 3 — Making better decisions

**How? (Alternative means)**

- Seek advice from a mentor or expert
- Collect and analyze data and research directly
- Use decision-making frameworks (pros/cons analysis, etc.)
- **Identify disagreements across LLM responses and use them as material for judgment ← Chorus is here**

### Layer 4 — A better life and work environment

**How? (Alternative means)**

- Better health, relationships, and financial management
- Leverage productivity tools
- Learning and skill development
- **Through better decision-making ← Chorus lives on this branch**

---

## Key Insight

*The intermediate "Why" — Creating richer and more accurate outcomes — is directly linked to the specific trigger scenarios where power users naturally reach for Chorus.*

**Information Consolidation:** The core means is fusing the strengths of each model (writing, logic, image generation) within a single workspace rather than using fragmented tools.

**Decision Support:** Conductor mode and Compose mode are two approaches that help users reach their own conclusions without getting lost among multiple outputs. Conductor mode automatically synthesizes responses into a draft; Compose mode lets users manually select and combine elements to build their own canvas.

**Risk Management:** The API abstraction layer ensures users always have access to optimal accurate information regardless of specific provider failures or policy changes.

---

## Tree Visualization

A Better Life and Work Environment
(Mastering tools rather than depending on them)
                │
Risk Management + High-Level Performance
                │
Creating Richer and More Accurate Outcomes
(Convergence point: Synthesizing strengths of models)
                │
Obtaining Creative Drafts + Cross-verifying Accuracy
(Functional trigger for power users)
                │
    ┌───────────┴──────────────────────────────┐
[How: Decision Support]          [How: Information Consolidation]
    │                                          │
    ├──────────────────┐               ┌───────┴──────────────┐
Conductor           Compose        Workspace            API Abstraction
  Mode                Mode         Integration               Layer
    │                  │               │                      │
(Automatic         (Manual selection  (Fusing logic/      (Ensuring access
 synthesis of      & building on      writing/image        regardless of
 drafts)           canvas)            strengths)           failures)
