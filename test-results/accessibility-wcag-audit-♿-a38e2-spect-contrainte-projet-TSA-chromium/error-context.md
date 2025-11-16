# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]: Tableau - Appli-Picto
  - generic [ref=e12]:
    - heading "tableau.title" [level=1] [ref=e13]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: "🔍 Debug Rôles:"
        - button "✕" [ref=e17] [cursor=pointer]
      - generic [ref=e18]: "Permissions: visitor"
      - generic [ref=e19]: "Simple: visitor"
      - generic [ref=e20]: "Final: visitor"
      - generic [ref=e21]: "ready: true — unknown: false"
      - button "Recharger rôles" [ref=e22] [cursor=pointer]
    - region "tableau.progress" [ref=e23]:
      - heading "tableau.progress" [level=2] [ref=e24]
      - generic [ref=e25]:
        - generic [ref=e26]:
          - img [ref=e27]
          - img "Métro" [ref=e31]
          - img "Ligne 1" [ref=e33]
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: tableau.selectLine
            - combobox "tableau.selectLine" [ref=e37]:
              - option "— actions.select —"
              - option "tableau.line1" [selected]
              - option "tableau.line6"
              - option "tableau.line12"
          - paragraph [ref=e38]: "tableau.progression : 0 / 0 tasks.title"
    - region "tasks.title" [ref=e39]:
      - heading "tasks.title" [level=2] [ref=e40]
      - status [ref=e41]
      - status [ref=e43]
```