# MANIFEST — Chorus

코러스는 하나의 목소리가 아닌, 여러 목소리로 더 나은 소리를 만든다.
여러 LLM의 생각을 한 번에 보고, 차이와 공통점을 이해하고, 최종 결론까지 도와주는 서비스

---

## WHAT WE ARE TRYING TO BUILD

우리는 여러 개의 LLM을 한 화면에서 사용할 수 있도록 모아놓는 데서 끝나지 않는다.  
각 모델의 답변을 비교·분석하고, 그 차이를 구조적으로 보여주며,  
최종적으로 더 나은 판단을 돕는 멀티-LLM 판단 인터페이스를 만들고자 한다.

현재 사용자는 ChatGPT, Claude, Gemini 등 다양한 LLM을 각기 다른 앱과 웹페이지에서 따로 사용한다.  

같은 질문을 반복해서 입력하고, 나란히 놓고 보도록 설계되지 않은 답변을 머릿속에서 비교하며, 
결국 어떤 판단을 내려야 하는지를 스스로 정리해야 한다.

Chorus는 이 과정을 바꾼다.

하나의 질문을 입력하면, 여러 LLM의 응답을 동시에 수집하고 이를 단순 나열이 아니라 다음과 같이 재구성한다.

- 각 모델의 핵심 답변 요약  
- 공통적으로 동의하는 부분  
- 모델 간 의견이 갈리는 지점  
- 불확실성이 높은 영역  
- 최종적으로 참고 가능한 합의안 또는 판단 가이드  

즉, 우리는  
“답변을 많이 보여주는 서비스”가 아니라  
여러 AI의 답변을 해석 가능한 판단 구조로 바꾸는 서비스를 만든다.

---

## WHY THIS MATTERS

오늘날 AI는 이미 충분히 강력한 답을 제공한다. 문제는 더 이상 “답을 얻을 수 있는가”가 아니다.
진짜 문제는 그 다음이다.

- 어떤 모델의 답을 믿어야 하는가  
- 서로 다른 답이 나오면 어떻게 해석해야 하는가  
- 여러 답을 보는 것이 실제로 더 나은 판단으로 이어지는가  

현재의 AI 사용 경험은 강력하지만 분절되어 있다. 사용자는 모델을 오가며 비교하고, 기억하고, 판단해야 한다.  
이 과정은 비효율적일 뿐 아니라,오히려 정보 과부하와 판단 피로를 만든다.
Chorus는 이 지점을 해결한다.  
AI를 단순히 나열하는 것이 아니라, AI들 사이의 관계 — 공통점, 차이, 충돌 — 를 읽어주는 인터페이스를 만든다.

---

## WHY NOW

이 프로젝트가 지금 의미 있는 이유는 세 가지다.

1. 멀티 LLM 사용이 이미 현실이 되었다
사용자들은 하나의 모델만 쓰지 않고, 상황에 따라 여러 모델을 병행 사용한다.

2. 모델 간 차이가 실제로 존재한다
각 모델은 서로 다른 성향과 강점을 가진다.하지만 그 차이를 해석하는 책임은 전적으로 사용자에게 있다.

3. 기존 멀티-LLM 서비스는 ‘접근성’에 머물러 있다
여러 모델을 한 곳에서 쓸 수 있게 해주지만,  
정작 사용자가 원하는 것은 “그래서 나는 무엇을 판단해야 하는가”에 대한 도움이다.
Chorus는 바로 그 지점에서 가치를 만든다.

---

## WHAT MAKES US DIFFERENT

우리의 차별점은 “멀티-LLM 접근”이 아니라 “멀티-LLM 해석 계층”에 있다.

우리는 다음 네 가지 레이어를 제공한다.

1. Multi-Model Input
여러 LLM의 응답을 동시에 수집한다.

2. Comparison Layer
답변을 나열하는 것이 아니라 공통점, 차이점, 충돌 지점을 구조화한다.

3. Consensus Layer
여러 응답을 바탕으로 합의안 또는 판단 가이드를 생성한다.

4. Uncertainty Layer
모델 간 불일치가 클 경우 오히려 “이 사안은 불확실하다”는 점을 드러낸다.

즉, 우리는 답을 대신 내려주는 것이 아니라  
답이 형성되는 과정을 드러내고, 사용자의 판단을 정교하게 돕는다.

---

## WHAT WE BELIEVE

1. LLM은 교체 가능한 도구가 아니라, 서로 다른 목소리를 가진 존재다.
각 모델의 차이는 제거해야 할 문제가 아니라 활용해야 할 특성이다.

2. 더 나은 답은 독백이 아니라 대화에서 나온다.
아이디어는 충돌하고 비교될 때 더 정교해진다.

3. 사용자가 합성자다.
우리는 결론을 강요하지 않는다.  
재료를 제공하고, 판단은 사용자에게 맡긴다.

4. AI를 잘 사용하는 것은 하나의 능력이다.
Chorus는 그 과정을 가시화한다.

---

## WHAT CHORUS IS NOT

Chorus는 다음과 같은 서비스가 아니다.

- 어떤 AI를 쓸지 대신 결정해주는 모델 라우터  
- 답변에 점수를 매기는 랭킹 시스템  
- 개별 LLM을 대체하는 단일 모델  
- 여러 모델을 뒤에 숨기는 추상화 레이어  

---

## WHO IT IS FOR

Chorus는 이미 여러 LLM을 사용하고 있고,  
그 과정에서 불편함과 한계를 느끼는 사람들을 위한 서비스다.

단순한 AI 경험이 아니라,  
더 나은 판단을 위한 AI 경험을 원하는 사람들을 위해.

---

## VISION

Chorus의 목표는  
여러 AI를 동시에 사용하는 도구를 넘어서  
사람이 여러 AI와 함께 더 잘 생각할 수 있도록 돕는 판단 인터페이스가 되는 것이다.

우리는 AI를 단순한 답변 생성기가 아니라 서로 다른 관점을 가진 사고 파트너로 본다.

그리고 우리의 역할은 그 파트너들의 의견을 한눈에 이해 가능한 구조로 바꾸는 것이다.




























# MANIFEST — Chorus

A chorus creates a richer sound not from one voice, but from many.

---

## WHAT WE ARE TRYING TO BUILD

We are not building a tool that simply aggregates multiple LLMs into one screen.  
Instead, we aim to create a multi-LLM decision interface that compares, analyzes, and structures their responses to help users make better judgments.

Today, users rely on multiple LLMs such as ChatGPT, Claude, and Gemini across different apps and web pages.  
They repeatedly input the same question, switch between tabs, and mentally compare responses that were never designed to be viewed side by side.  
In the end, they must synthesize everything themselves and decide what to believe.

Chorus changes this experience.

When a user inputs a single question, we collect responses from multiple LLMs simultaneously and restructure them into:

- A concise summary of each model’s core answer  
- Points of agreement across models  
- Areas where opinions diverge  
- Regions of high uncertainty  
- A synthesized consensus or decision guide  

In other words, we are not building a service that “shows more answers,”  
but one that transforms multiple AI responses into an interpretable decision structure.

---

## WHY THIS MATTERS

Today’s AI systems are already powerful enough to generate useful answers.  
The real problem is no longer whether we can get answers.

The real problem comes after.

- Which model should we trust?  
- How should we interpret conflicting answers?  
- Does seeing more answers actually lead to better decisions?  

The current AI experience is powerful, but fragmented.  
Users must switch between models, compare outputs, remember details, and make judgments on their own.

This process is inefficient and often leads to information overload and decision fatigue.

Chorus addresses this gap.

Rather than simply presenting multiple AI outputs,  
we build an interface that helps users understand the relationships between them —  agreement, disagreement, and conflict.

---

## WHY NOW

This project is timely for three reasons.

1. Multi-LLM usage is already a reality
Users no longer rely on a single model, but switch between multiple models depending on context.

2. Models have distinct characteristics
Each model has different strengths, tones, and behaviors.  
Yet the burden of interpreting these differences falls entirely on the user.

3. Existing multi-LLM tools focus on access, not interpretation
Most services stop at enabling users to use multiple models in one place.  
But what users actually need is help answering the question:  
“So what should I do?”

Chorus creates value exactly at that point.

---

## WHAT MAKES US DIFFERENT

Our differentiation lies not in multi-LLM access,  
but in a multi-LLM interpretation layer.

We provide four core layers:

1. Multi-Model Input
Collect responses from multiple LLMs simultaneously.

2. Comparison Layer
Structure responses into agreements, differences, and conflicts.

3. Consensus Layer
Generate a synthesized conclusion or decision guide.

4. Uncertainty Layer  
When disagreement is high, explicitly highlight uncertainty instead of hiding it.

We do not replace the user’s judgment.  
We make the reasoning process visible and help users think more precisely.

---

## WHAT WE BELIEVE

1. LLMs are not interchangeable tools — they are distinct voices.
Differences between models are not problems to eliminate, but signals to leverage.

2. Better answers emerge from dialogue, not monologue.
Insight comes from comparing and confronting multiple perspectives.

3. The user is the synthesizer.
We do not dictate the final answer.  
We provide structured inputs — the thinking remains with the user.

4. Using AI well is a skill worth developing.
Understanding how to interpret and combine AI outputs is a form of intelligence in itself.  
Chorus is designed to make that process visible.

---

## WHAT CHORUS IS NOT

Chorus is not:

- A model router that decides which AI to use  
- A ranking system that scores answers  
- A single model that replaces others  
- A hidden abstraction layer that conceals model differences  

---

## WHO IT IS FOR

Chorus is for people who already use multiple LLMs  
and feel the friction in that process.

Not for those who want a simpler AI experience,  
but for those who want a better one —  one that leads to more confident and informed decisions.

---

## VISION

Chorus is not just a tool for using multiple AIs at once.

Our long-term vision is to become  
a decision interface that helps humans think better with multiple AI perspectives.

We see AI not as a single answer generator,  
but as a collection of thinking partners with different viewpoints.

Our role is to make those viewpoints  
clear, structured, and understandable at a glance.

