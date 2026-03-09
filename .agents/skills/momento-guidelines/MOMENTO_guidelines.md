# MOMENTO — Product Philosophy & Development Guidelines

This document defines what MOMENTO is, what it is not, and how every feature and line of code should reflect that.
Read this before making any product or implementation decision.

---

## What MOMENTO does

MOMENTO shows creators **context they cannot see on their own.**

YouTube Studio shows a creator their own numbers.
MOMENTO shows how those numbers — and the decisions behind them — relate to what is actually working **right now** in their category.

The creator sees three things at once:
- What the currently trending videos look like
- What their video looks like
- What the gap between the two means in practical terms

MOMENTO shows the gap **and** helps explain what it means. The decision about what to do with that information belongs entirely to the creator.

---

## What MOMENTO never does

**MOMENTO does not tell users what to do.**

No recommendations. No "you should." No "try this instead."
No scores that imply one approach is correct.
No language that positions MOMENTO as the authority on what makes a video succeed.

If a feature, a UI element, a button label, or a line of copy is telling the user what decision to make — it does not belong in this product.

---

## Why this matters in code

Every output this service generates falls into one of two categories:

| Belongs | Does not belong |
|---|---|
| "Trending titles in this category average 18–22 characters." | "Your title is too long. Shorten it." |
| "Your title is 31 characters. 74% of trending titles fall within 18–22." | "Add a number to improve performance." |
| "Long titles tend to get cut off in mobile feeds." | "Upload on Tuesday for best results." |
| "Title A matches the trending structure more closely. Title B uses a less common pattern in this category." | "Title A will perform better." |

The left column is data plus interpretation. The right column is a decision made on behalf of the user.
MOMENTO generates the left column. The creator generates the right column.

---

## How to apply this when building features

**When writing AI prompts (Claude API calls):**
- Instruct the model to describe patterns, gaps, and what those gaps mean in practical terms
- Interpretation is allowed — prediction and prescription are not
- The model can explain *why* a pattern exists or *what it tends to mean* — but never *what the user should do*
- If the model output contains "you should," "try," or "this will" — the prompt needs to be revised

**When designing UI:**
- Comparison layouts (two columns, side by side) are the core UI pattern
- Avoid any visual hierarchy that implies one side is "winning"
- Avoid red/green color coding that implies good/bad
- Labels, tooltips, and empty states should describe what the user is seeing — not what they should do next

**When writing copy:**
- Observation is always allowed: "trending videos show," "your video has," "the pattern is"
- Interpretation is allowed: "long titles tend to get cut off in mobile feeds," "this pattern is less common in this category"
- Prescription is never allowed: "you should," "change this," "fix this"
- Evaluation is never allowed: "good," "bad," "optimized," "underperforming"
- When a gap is large, describe what the gap is and what it typically means — not whether the user has made a mistake

**When adding new features:**
Ask this before building: *"Does this feature show the user something they couldn't see before, or does it make a decision for them?"*
If it makes a decision — redesign it until it only shows context.

---

## The user's role

The creator using MOMENTO is not looking for instructions.
They are looking for the information — and the context around it — that they need to make their own decision well.

MOMENTO's job stops at "here is what the data shows, and here is what it means."
What to do about it is the creator's job.

MOMENTO respects that the creator knows their audience, their voice, and their goals better than any algorithm does.
The service provides data and interpretation. The creator provides judgment and decision.

This is not a disclaimer. It is the product.

---

## Uncertainty is honest

MOMENTO does not know what will make a video succeed.
No service does.

When the data is limited, say so.
When a pattern has exceptions, show that.
When a comparison is based on a small sample, label it.

Overstating confidence in the data breaks the trust this product is built on.
Understating it is not a weakness — it is accurate.

---

## One test for every output

Before any feature ships, apply this test to every piece of information the user sees:

> *"Is this showing or explaining something real — or is this making a decision for the user?"*

Showing and explaining — ship it.
Making the decision — revise it.
