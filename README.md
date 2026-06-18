# Rekord 🔴

> Never lose working code again.

Rekord is a VS Code extension that saves checkpoints of your entire project, lets you roll back instantly, and automatically pushes your code + AI-generated documentation to GitHub.

## The Problem
You're coding with an AI agent. It breaks something that was working. You scroll back through 50 messages trying to find the last good version. Sound familiar?

## The Solution
Hit `Ctrl+Shift+S` to save a checkpoint. If anything goes wrong, roll back to any previous state in one click. Every checkpoint is automatically pushed to GitHub with an AI-generated README.

## Features
- ⏺ **One-click checkpointing** — save your entire project state instantly
- ⏪ **Instant rollback** — restore any previous version in one click
- 📊 **Visual timeline** — see your entire project history inside VS Code
- 📤 **Auto GitHub push** — every checkpoint goes to GitHub automatically
- 🤖 **AI README generation** — Gemini reads your code and writes your docs

## Setup
1. Install the extension
2. `Ctrl+Shift+P` → `Rekord: Setup GitHub Token`
3. `Ctrl+Shift+P` → `Rekord: Setup AI (Gemini)`
4. Press `Ctrl+Shift+S` to save your first checkpoint

## Built With
- TypeScript
- VS Code Extension API
- GitHub API (Octokit)
- Google Gemini AI

## Author
Built by Hadiyah Saeed, age 14, Islamabad 🇵🇰

---
*Rekord — Because your code deserves a save point.*
