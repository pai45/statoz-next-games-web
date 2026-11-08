# Third-party skills

## UI UX Pro Max

- Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Commit: `dd9a1b4cf9f67ca2e326f646d93e101b2778db30` (skill version 2.15.0)
- Copied from the upstream `.claude/skills/` tree: `ui-ux-pro-max`, `design`,
  `design-system`, `ui-styling`, `brand`, `banner-design`, `slides`.

Local changes:

- `ui-ux-pro-max/SKILL.md`: script paths changed from
  `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/` to
  `.codex/skills/ui-ux-pro-max/`, run from this repository's root.
- Removed the generated `ui-styling/scripts/.coverage` artifact.

The fonts in `ui-styling/canvas-fonts/` are licensed under the SIL Open Font
License; each family's license is kept beside its files.

To update, copy the same folders from a newer upstream commit, reapply the
changes above and record the new commit here.

### License

MIT License

Copyright (c) 2024 Next Level Builder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
