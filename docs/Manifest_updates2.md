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
"답변을 많이 보여주는 서비스"가 아니라  
여러 AI의 답변을 해석 가능한 판단 구조로 바꾸는 서비스를 만든다.


---


## WHY THIS MATTERS


오늘날 AI는 이미 충분히 강력한 답을 제공한다. 문제는 더 이상 "답을 얻을 수 있는가"가 아니다.

진짜 문제는 그 다음이다.

- 어떤 모델의 답을 믿어야 하는가  
- 서로 다른 답이 나오면 어떻게 해석해야 하는가  
- 여러 답을 보는 것이 실제로 더 나은 판단으로 이어지는가  

현재의 AI 사용 경험은 강력하지만 분절되어 있다. 사용자는 모델을 오가며 비교하고, 기억하고, 판단해야 한다.  
이 과정은 비효율적일 뿐 아니라, 오히려 정보 과부하와 판단 피로를 만든다.

Chorus는 이 지점을 해결한다.  
AI를 단순히 나열하는 것이 아니라, AI들 사이의 관계 — 공통점, 차이, 충돌 — 를 읽어주는 인터페이스를 만든다.


---


## WHY NOW


이 프로젝트가 지금 의미 있는 이유는 세 가지다.

1. 멀티 LLM 사용이 이미 현실이 되었다  
사용자들은 하나의 모델만 쓰지 않고, 상황에 따라 여러 모델을 병행 사용한다.

2. 모델 간 차이가 실제로 존재한다  
각 모델은 서로 다른 성향과 강점을 가진다. 하지만 그 차이를 해석하는 책임은 전적으로 사용자에게 있다.

3. 기존 멀티-LLM 서비스는 '접근성'에 머물러 있다  
여러 모델을 한 곳에서 쓸 수 있게 해주지만,  
정작 사용자가 원하는 것은 "그래서 나는 무엇을 판단해야 하는가"에 대한 도움이다.

Chorus는 바로 그 지점에서 가치를 만든다.


---


## WHAT MAKES US DIFFERENT


우리의 차별점은 "멀티-LLM 접근"이 아니라 "멀티-LLM 해석 계층"에 있다.

Chorus는 두 가지 사용 모드를 통해 이 해석을 실제 판단으로 연결한다.


**Conductor 모드** — 비교·분석에서 통합까지  
여러 LLM의 답변을 비교·분석한 뒤, 차이를 근거로 하나의 통합 초안을 생성한다.  
모델 간 불일치는 제거 대상이 아니라, 더 나은 판단을 만들기 위한 재료로 활용된다.  
오케스트라의 지휘자처럼, 서로 다른 소리를 하나의 흐름으로 엮는 모드다.

**Compose 모드** — 선택과 재구성  
각 답변에서 필요한 부분을 사용자가 직접 선택하고 조합하여 자신만의 결론을 구성한다.  
AI가 답을 주는 것이 아니라, 사용자가 여러 관점을 재료 삼아 자기 생각을 만드는 모드다.


---


## CORE LAYERS


이 두 모드를 지탱하는 기술 구조는 네 가지 레이어로 이루어진다.


### 1. Multi-Model Input

하나의 질문에 대해 여러 LLM의 응답을 동시에 수집한다.


### 2. Comparison Layer — 의미적 거리 기반 응답 유사도 분석

답변을 나열하는 것이 아니라 '코사인 유사도'를 통해 공통점, 차이점, 충돌 지점을 정량적으로 비교한다.


**1) Embedding**  
사람은 두 문장을 읽고 "비슷하다" 또는 "다르다"를 직관적으로 판단한다.  
기계가 이것을 하려면, 먼저 문장을 숫자로 바꿔야 한다.  
이 과정을 임베딩(embedding)이라고 한다.

**2) Vector**  
하나의 답변을 수백 개의 숫자 리스트 — 벡터(vector) — 로 변환하면,  
의미가 비슷한 문장은 비슷한 숫자 패턴을 갖게 된다.

**3) Cosine Similarity**  
벡터가 만들어지면, 두 답변이 얼마나 가까운지를 수치로 잴 수 있다.  
이때 Chorus는 코사인 유사도(Cosine Similarity)를 핵심 측정 방식으로 사용한다.

**4) 정규화 / Scoring**  
얼마나 차이나는지 숫자로 표현한다.

> **Q. 왜 유클리디안 거리가 아닌 코사인 유사도인가?**  
>  
> 벡터에는 두 가지 속성이 있다: 방향과 크기.  
> 임베딩에서 의미는 방향에 담긴다.  
> "고양이는 귀엽다"와 "고양이는 사랑스럽다"는 방향이 비슷하고,  
> "주식 시장이 폭락했다"는 방향이 전혀 다르다.  
> 그런데 모델마다 벡터의 크기(길이)는 들쭉날쭉할 수 있다.  
> 유클리디안 거리는 이 크기 차이에 민감해서,  
> 같은 의미의 답변도 "멀다"고 잘못 판단할 수 있다.  
> 코사인 유사도는 크기를 무시하고 방향만 비교하기 때문에,  
> "의미가 얼마나 가까운가"를 더 정확하게 측정한다.

결과값은 직관적이다: 1에 가까우면 거의 같은 말, 0에 가까우면 완전히 다른 말.

**5) 시각화**  
Chorus는 이 측정값을 숫자 하나로 끝내지 않고, 시각화한다.

- **응답 유사도 히트맵:**  
  모델 쌍별 유사도를 색상으로 표현하는 매트릭스.  
  GPT↔Claude 0.92(초록), GPT↔Gemini 0.45(빨강)처럼  
  누가 누구와 비슷한 답을 했는지 한눈에 보여준다.

이 과정을 통해 Comparison Layer는  
"모델 A와 B가 몇 퍼센트 유사하다"는 단순 수치가 아니라  
"어디서, 왜 다른가"를 해석 가능한 형태로 사용자에게 전달한다.


### 3. Consensus Layer

여러 응답을 바탕으로 합의안 또는 판단 가이드를 생성한다.  
모델들이 공통으로 동의하는 부분을 추출하고,  
의견이 갈리는 지점에서는 각 입장을 병기하여  
사용자가 균형 잡힌 시각에서 판단할 수 있도록 돕는다.


### 4. Uncertainty Layer

Comparison Layer에서 측정한 코사인 유사도가 낮아 응답 벡터가 넓게 분산되어 있다면,  
이는 해당 질문에 대해 모델 간 합의가 형성되지 않았음을 의미한다.

Chorus는 이 분산도를 불확실성 지표로 전환한다.  
"이 질문에 대해 AI 모델들의 판단이 갈리고 있습니다"라는 명시적 경고를 제공하여,  
사용자가 "여기는 내가 직접 판단해야 하는 지점"임을 인지하게 한다.

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


> *Not just a better answer, a better you. — Chorus*


---
---
---


# MANIFEST — Chorus (English)


A chorus creates a better sound not from a single voice, but from many voices together.

A service that lets you see multiple LLMs' thoughts at once, understand their differences and common ground, and arrive at a better conclusion.


---


## WHAT WE ARE TRYING TO BUILD


We are not simply building a service that aggregates multiple LLMs on a single screen.  
We are building a multi-LLM judgment interface that compares and analyzes each model's response, structurally reveals their differences, and ultimately supports better decision-making.

Today, users interact with ChatGPT, Claude, Gemini, and other LLMs through separate apps and websites.

They type the same question over and over, mentally compare answers that were never designed to sit side by side, and end up having to reach their own conclusions alone.

Chorus changes this process.

When a user enters a single question, Chorus collects responses from multiple LLMs simultaneously and restructures them — not as a simple list, but as follows:

- A summary of each model's core answer  
- Areas of common agreement  
- Points where models diverge  
- Areas of high uncertainty  
- A synthesized consensus or decision guide  

In other words, we are not building a service that "shows more answers."  
We are building a service that transforms multiple AI answers into an interpretable judgment structure.


---


## WHY THIS MATTERS


AI already provides sufficiently powerful answers. The problem is no longer "Can I get an answer?"

The real problem is what comes next.

- Which model's answer should I trust?  
- When answers differ, how should I interpret them?  
- Does seeing multiple answers actually lead to better judgment?  

The current AI experience is powerful but fragmented. Users must switch between models, compare, remember, and judge on their own.  
This process is not only inefficient — it actively creates information overload and decision fatigue.

Chorus addresses this.  
Rather than simply listing AIs, it builds an interface that reads the relationships between them — agreement, difference, and conflict.


---


## WHY NOW


There are three reasons this project matters right now.

1. Multi-LLM usage is already the norm  
Users no longer rely on a single model. They use multiple models depending on the situation.

2. Differences between models genuinely exist  
Each model has distinct tendencies and strengths. Yet the burden of interpreting those differences falls entirely on the user.

3. Existing multi-LLM services stop at accessibility  
They let you use multiple models in one place,  
but what users actually want is help with "So what should I decide?"

Chorus creates value at precisely that point.


---


## WHAT MAKES US DIFFERENT


Our differentiator is not "multi-LLM access" — it is the "multi-LLM interpretation layer."

Chorus connects this interpretation to real judgment through two modes of use.


**Conductor Mode** — From comparison to synthesis  
Chorus compares and analyzes answers from multiple LLMs, then generates a unified draft grounded in their differences.  
Disagreement between models is not something to eliminate — it is raw material for building better judgment.  
Like an orchestra conductor, this mode weaves different sounds into a single coherent flow.

**Compose Mode** — Selection and reconstruction  
Users directly select and combine the parts they need from each answer, constructing their own conclusion.  
AI does not hand you an answer. Instead, users treat multiple perspectives as ingredients and build their own thinking.


---


## CORE LAYERS


The technical architecture supporting both modes consists of four layers.


### 1. Multi-Model Input

Responses from multiple LLMs are collected simultaneously for a single question.


### 2. Comparison Layer — Semantic distance-based response similarity analysis

Rather than listing answers, this layer quantitatively compares areas of agreement, disagreement, and conflict through cosine similarity.


**1) Embedding**  
Humans read two sentences and intuitively judge whether they are "similar" or "different."  
For a machine to do this, it must first convert sentences into numbers.  
This process is called embedding.

**2) Vector**  
When a single response is transformed into a list of hundreds of numbers — a vector —  
sentences with similar meanings end up with similar number patterns.

**3) Cosine Similarity**  
Once vectors are created, we can numerically measure how close two answers are.  
Chorus uses cosine similarity as its primary measurement method.

**4) Normalization / Scoring**  
The degree of difference is expressed as a numerical score.

> **Q. Why cosine similarity instead of Euclidean distance?**  
>  
> A vector has two properties: direction and magnitude.  
> In embeddings, meaning is carried by direction.  
> "Cats are cute" and "Cats are adorable" point in a similar direction,  
> while "The stock market crashed" points in a completely different direction.  
> However, the magnitude (length) of vectors can vary from model to model.  
> Euclidean distance is sensitive to this magnitude difference,  
> meaning it can incorrectly judge two semantically identical answers as "far apart."  
> Cosine similarity ignores magnitude and compares only direction,  
> making it a more accurate measure of "how close in meaning are these two responses."

The result is intuitive: close to 1 means nearly the same thing; close to 0 means completely different.

**5) Visualization**  
Chorus does not stop at a single number. It visualizes the measurement.

- **Response similarity heatmap:**  
  A matrix expressing pairwise similarity as color.  
  GPT↔Claude 0.92 (green), GPT↔Gemini 0.45 (red) —  
  showing at a glance which models gave similar answers.

Through this process, the Comparison Layer delivers not a simple figure like  
"Model A and B are X% similar," but rather  
"where and why they differ" in an interpretable form.


### 3. Consensus Layer

A consensus or judgment guide is generated based on multiple responses.  
Common ground across models is extracted,  
and where opinions diverge, each position is presented side by side  
so users can make decisions from a balanced perspective.


### 4. Uncertainty Layer

When cosine similarity measured in the Comparison Layer is low and response vectors are widely dispersed,  
it means that no consensus has formed among models for that question.

Chorus converts this dispersion into an uncertainty indicator.  
It provides an explicit warning — "AI models' judgments are divided on this question" —  
so that users recognize "this is a point where I need to make my own judgment."

In other words, we do not make decisions on the user's behalf.  
We reveal how an answer is formed, and help the user refine their own judgment.


---


## WHAT WE BELIEVE


1. LLMs are not interchangeable tools — they are entities with distinct voices.  
The differences between models are not problems to eliminate, but characteristics to leverage.

2. Better answers come from dialogue, not monologue.  
Ideas become sharper when they collide and are compared.

3. The user is the synthesizer.  
We do not impose conclusions.  
We provide the ingredients; judgment belongs to the user.

4. Using AI well is a skill in itself.  
Chorus makes that process visible.


---


## WHAT CHORUS IS NOT


Chorus is none of the following:

- A model router that decides which AI to use on your behalf  
- A ranking system that scores answers  
- A single model that replaces individual LLMs  
- An abstraction layer that hides multiple models behind a curtain  


---


## WHO IT IS FOR


Chorus is for people who already use multiple LLMs  
and feel the friction and limitations of doing so.

Not for those who want a simple AI experience,  
but for those who want an AI experience designed for better judgment.


---


## VISION


Chorus aims to go beyond being a tool that lets you use multiple AIs simultaneously.  
It aspires to become a judgment interface that helps people think better together with AI.

We see AI not as an answer generator,  
but as thinking partners with different perspectives.

And our role is to turn those partners' opinions into a structure that can be understood at a glance.


> *Not just a better answer, a better you. — Chorus*
