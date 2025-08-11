// Déclare le global Deno minimal utilisé dans tes Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Mappe l'import Deno `npm:stripe` vers les types Stripe Node pour l'éditeur
declare module 'npm:stripe' {
  import Stripe from 'stripe'
  export default Stripe
  export * from 'stripe'
}
