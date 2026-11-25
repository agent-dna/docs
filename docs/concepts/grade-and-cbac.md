---
id: grade-and-cbac
title: Pillars of AgentDNA
sidebar_position: 2
---

# Pillars of AgentDNA

AgentDNA is built on the following pillars:

## 1. Graph of Delegation (GRADE)

Graph of Delegation (GRADE) captures every interaction between participants as a cryptographically signed [Envelope](./mental-model.md#envelope).

Rather than treating a workflow as a collection of independent events, every new Envelope wraps the previous one, forming a graph that preserves the complete journey of an intent.

Every participant signs only the action they performed, creating a verifiable graph of delegation from the original requester to the final outcome.

## 2. Context Based Access Control (CBAC)

CBAC evaluates the complete intent, verifies every signed participant in the graph and validates that the Agent's current policy permits the requested action. It does so by using a local Inference Engine that examines Agent's policy and with its intent, the initial user intent and calculates a Trust score for the Agent. Authorization changes from *are you allowed?* to *are you allowed, and what is the intent?*

## 3. Immutable Provenance

Every completed workflow can be committed to the Provenance Layer as an immutable provenance record.

This provides:

- Complete workflow history
- Cryptographic proof of every participant
- Auditability of every autonomous decision
- Tamper-evident workflow storage
