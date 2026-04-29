---
title: Input Buffering
description: A short design note on forgiving action timing.
date: 2026-04-28
tags: [combat, systems, game-feel]
draft: false
visibility: public
aliases: [input buffering]
---

Input buffering stores a valid player command for a short window, then executes it when the character can act.

In action games, this supports responsiveness without ignoring animation commitment. It is closely tied to [[combat-feel]].
