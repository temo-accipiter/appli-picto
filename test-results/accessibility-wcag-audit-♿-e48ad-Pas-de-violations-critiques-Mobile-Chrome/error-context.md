# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - heading "Log in" [level=1] [ref=e13]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Email
        - textbox "Champ" [ref=e18]:
          - /placeholder: ""
        - paragraph [ref=e19]
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - generic [ref=e22]:
          - textbox "Champ" [ref=e23]:
            - /placeholder: ""
          - button "Afficher le mot de passe" [ref=e24] [cursor=pointer]:
            - img [ref=e25]
        - paragraph [ref=e28]
      - paragraph [ref=e29]:
        - link "Forgot password?" [ref=e30] [cursor=pointer]:
          - /url: /forgot-password
      - button "Log in" [disabled]:
        - generic: Log in
    - separator [ref=e31]
    - paragraph [ref=e32]:
      - text: Create account
      - link "Sign up" [ref=e33] [cursor=pointer]:
        - /url: /signup
```