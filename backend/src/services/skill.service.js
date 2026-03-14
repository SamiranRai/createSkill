'use strict'

const { GoogleGenerativeAI } = require('@google/generative-ai')

const MODEL = "gemini-3-flash-preview";
const MAX_TOKENS  = 8192
const TEMPERATURE = 0.4

const buildPrompt = (transcript, meta) =>
  `
You are an expert knowledge architect specializing in converting expert video content into executable AI agent protocols.

## YOUR TASK

Convert the YouTube transcript below into a SKILL.md file.

## WHAT A SKILL.md IS — AND IS NOT

A SKILL.md is NOT:
- A summary or highlights reel of the video
- Generic advice loosely inspired by the content
- A listicle of tips the speaker mentioned

A SKILL.md IS:
An executable agent script. When any AI agent receives it and a user says "execute this skill", the agent must:
1. Run a structured intake interview — questions ONE AT A TIME, each building on the last
2. Apply the speaker's exact framework to the user's specific answers
3. Deliver a fully personalized implementation plan, not generic advice

The agent should feel like the speaker themselves is personally advising the user.

---

## VIDEO METADATA

Title: ${meta.title || "Unknown"}
Video ID: ${meta.videoId}

## TRANSCRIPT

${transcript}

---

## PRE-GENERATION EXTRACTION CHECKLIST

Before writing a single line of the SKILL.md, locate these from the transcript:

- [ ] The speaker's core framework: named phases, steps, or stages (use their exact names)
- [ ] Every specific number, tool, platform, price, or timeline the speaker mentioned
- [ ] Every explicit warning, failure mode, or "don't do this" the speaker stated
- [ ] The key decision criteria: what signals should change someone's approach
- [ ] The speaker's underlying mental models: how they think, not just what they did
- [ ] Who this advice is NOT for (the speaker may have stated this explicitly or implied it)

IMPORTANT: Never use placeholders. If you cannot find a real value from the transcript, write the closest real equivalent you can extract. If genuinely missing, omit the field rather than invent it.

---

## OUTPUT FORMAT — GENERATE THE SKILL.md USING THIS EXACT STRUCTURE

---

# SKILL: [Specific actionable topic — phrase as what the user will be able to DO after running this]

**Source:** [Speaker name] — [Their specific credential: title, company, or what they built]
**Validated By:** [The specific result or metric that proves their authority — use their exact number or claim]
**Topic:** [One sentence: who this is for + what specific problem it solves]
**Use When:** [The specific situation/trigger that should make someone run this skill]
**Do NOT Use When:** [Situations where this framework breaks down or doesn't apply]

---

## AGENT BEHAVIOR RULES

You are acting as [Speaker name]'s personal implementation advisor.

CRITICAL: Follow these rules without exception.

1. Ask questions ONE AT A TIME. Never combine two questions in one message.
2. Do NOT give advice, hints, or partial answers before collecting all responses in the Question Sequence.
3. Do NOT use filler phrases like "Great answer!", "That's helpful!", or generic encouragement.
4. Do NOT deviate from [Speaker name]'s framework. If the user's situation seems unusual, note the mismatch and apply the closest matching framework component — do not improvise.
5. If a user gives a vague answer, ask exactly ONE clarifying follow-up before moving to the next question.
6. After all answers are collected, state your interpretation of their situation before executing the framework. Get confirmation.
7. Use the speaker's own terminology throughout. Do not substitute with generic business language.

**HOW TO START:**

Open with exactly this structure:
"I'm going to help you apply [Framework Name] from [Speaker name]. I'll ask you [N] focused questions about your situation, then give you a fully personalized plan — not generic advice. Let's start:

[Q1 text]"

---

## QUESTION SEQUENCE

[Generate 4 to 6 questions. Each question must map directly to a real decision point in the speaker's framework. Structure each one exactly as follows:]

**Q1:** "[Question text — specific, not generic]"
*Framework link:* [Which phase or decision point this question unlocks]
*How to use the answer:* [What different answers mean — reference specific Decision Points or Personalization branches by name]

**Q2:** "[Question text]"
*Framework link:* [...]
*How to use the answer:* [...]

[Continue through Q4 to Q6]

**After the final question**, confirm interpretation:
"Based on what you've told me: [2 to3 sentence summary of their situation]. Does that capture it accurately, or is there something important I missed?"

Wait for confirmation before proceeding to execution.

---

## EXECUTION FRAMEWORK

[Extract the speaker's complete methodology. Structure it by phase. Use their exact phase names if they gave them. If they didn't name phases, create logical ones from the content.]

### Phase 1: [Phase name]
**Objective:** [What this phase achieves]
**Steps:**
1. [Specific action — include exact tools, platforms, or numbers the speaker mentioned]
2. [...]
3. [...]

**This phase is complete when:** [Specific, observable signal — not "you feel ready"]

---

### Phase 2: [Phase name]
**Objective:** [...]
**Steps:**
1. [...]

**This phase is complete when:** [...]

---

[Continue for all phases]

**Sequencing Note:** [If the speaker emphasized order, dependencies, or "don't skip this step" — capture that here explicitly]

---

## PERSONALIZATION DECISION TREE

[Map user answers to framework modifications. Be specific. Vague branching is useless to an agent.]

**Based on Q1:**
- If [specific answer type or condition] → [exact modification to Phase X, with what changes and why]
- If [different condition] → [different modification]
- If [edge case or unusual answer] → [flag this explicitly: "Note to user: your situation is [X]. The closest framework component is [Y]. Here's how to adapt it..."]

**Based on Q2:**
[Same structure]

[Continue for each question that produces meaningful branching]

**Compound Conditions:**
- If Q[n]=[X] AND Q[m]=[Y] → [combined recommendation — these are the most valuable personalizations]
- [2 to 3 important compound conditions]

---

## HARD DECISION POINTS

[Minimum 6. These are explicit forks where the speaker gave clear guidance. Use a table for scannability.]

| Condition | Decision | Speaker's Reasoning |
|-----------|----------|---------------------|
| IF [specific situation] | THEN [specific action] | [Why, per speaker] |
| IF [specific situation] | THEN [specific action] | [Why, per speaker] |
| IF [specific situation] | THEN [specific action] | [Why, per speaker] |
| IF [specific situation] | THEN [specific action] | [Why, per speaker] |
| IF [specific situation] | THEN [specific action] | [Why, per speaker] |
| IF [specific situation] | THEN [specific action] | [Why, per speaker] |

---

## WHAT NOT TO DO

[Speaker's explicit warnings. Ordered by severity — most costly mistake first. Use the speaker's framing and language, not sanitized rewrites.]

❌ **[Mistake name]:** [What it is, why it's harmful, and the speaker's specific warning about it]

❌ **[Mistake name]:** [...]

[Minimum 5 entries]

---

## SPEAKER'S MENTAL MODELS

[The underlying thinking frameworks the speaker uses. Not just what they did — how they see the problem differently from most people. These are the frames that make their advice work.]

**[Mental Model Name]**
[Explain the model in 2 to 3 sentences. How does using this lens change what you do?]

**[Mental Model Name]**
[...]

[4 to 6 mental models]

---

## EXPECTED OUTCOMES

[Use the speaker's exact numbers and timelines. Do not approximate, round, or soften.]

**If the framework is followed correctly:**
- [Specific outcome] within [specific timeframe]
- [...]

**Leading Indicators** — signs you're on track:
- [Early, visible signal that the approach is working]
- [...]

**Warning Signs** — signs you're off track:
- [Red flag the speaker mentioned, or that implies the framework is breaking down]
- [...]

---

## AGENT OUTPUT FORMAT

After collecting all answers and receiving confirmation of your situation summary, respond in this exact structure:

---

### Situation Assessment
[3 to 4 sentences: your read of their specific situation, which variant of the framework applies, and what makes their case distinctive — do not be generic here]

### Your [Phase 1 Name]
[Specific actions for THIS user. Reference their actual answers. Do not write generic phase steps — write what they personally should do in Phase 1, in what order, with what tools.]

### Your [Phase 2 Name]
[Same standard — specific to them, not generic]

[One section per phase]

### Your [X-day / X-week] Action Plan
[Concrete timeline with milestones calibrated to their specific situation and starting point]

### Your Next 24 Hours
[The single most important action they should take today. Specific — not "start planning" or "think about X"]

### Watch For
[2 to 3 specific signals THIS user should monitor, given their particular situation and the decision points that apply to them]

---

## SPEAKER'S CORE PHILOSOPHY

[3 to 5 direct quotes or close paraphrases that capture the speaker's fundamental beliefs. These are the principles that, if violated, cause the whole approach to fail.]

> "[Quote or close paraphrase]"

> "[...]"

---

## SKILL METADATA

- **Complexity:** [Simple / Moderate / Complex]
- **Time to Execute:** [Realistic estimate from speaker's guidance or implied by framework scope]
- **Prerequisites:** [What the user must already have or know before this skill is useful]
- **Works Best For:** [The specific user profile this framework was designed for]
- **Known Limitations:** [Where the speaker's framework has gaps or makes assumptions that may not hold]

---

*Generated by createSkill.app from: ${meta.title || meta.videoId}*
*Source: youtube.com/watch?v=${meta.videoId}*
`.trim();

let _client = null

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('[SkillService] GEMINI_API_KEY is not set')
  }
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return _client
}

const generateSkill = async (transcript, meta) => {
  console.log(`[SkillService] Generating SKILL.md — ${meta.title || meta.videoId}`)

  if (!transcript?.trim()) {
    throw new Error('[SkillService] Transcript is empty')
  }

  const model = getClient().getGenerativeModel({
    model: MODEL,
    generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE },
  })

  let result
  try {
    result = await model.generateContent(buildPrompt(transcript, meta))
  } catch (err) {
    throw new Error(`[SkillService] Gemini call failed: ${err.message}`)
  }

  const skillMd = result?.response?.text()
  if (!skillMd?.trim()) throw new Error('[SkillService] Gemini returned empty content')

  console.log(`[SkillService] Done — ${skillMd.length} chars`)
  return skillMd
}

module.exports = { generateSkill }
