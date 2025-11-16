// Type declarations for Deno imports in Supabase Edge Functions
// This file suppresses TypeScript errors for Deno-specific imports

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void
}

declare module 'https://esm.sh/@supabase/supabase-js' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.1' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.2' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.3' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/stripe@14.25.0?target=deno' {
  export * from 'stripe'
}
