# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - heading "edition.title" [level=1] [ref=e13]
    - region "settings.title" [ref=e14]:
      - heading "settings.title" [level=2] [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17] [cursor=pointer]:
          - text: ✔️
          - generic [ref=e18]: edition.confettiEnabled
        - generic [ref=e19] [cursor=pointer]:
          - text: ✔️
          - generic [ref=e20]: edition.showReward
        - generic [ref=e21]:
          - checkbox "edition.hideTimeTimer" [ref=e22] [cursor=pointer]
          - generic [ref=e23] [cursor=pointer]: edition.hideTimeTimer
        - generic [ref=e24] [cursor=pointer]:
          - text: ✔️
          - generic [ref=e25]: edition.toastsEnabled
    - generic [ref=e26]:
      - button "tasks.title" [ref=e27] [cursor=pointer]:
        - generic [ref=e29]:
          - img [ref=e30]
          - text: tasks.title
          - img [ref=e33]
      - separator [ref=e35]
      - button "rewards.title" [ref=e36] [cursor=pointer]:
        - generic [ref=e38]:
          - img [ref=e39]
          - text: rewards.title
          - img [ref=e43]
```