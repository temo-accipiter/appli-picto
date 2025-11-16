// Type declaration for axe-core Playwright integration
declare module 'axe-core' {
  export interface RunOptions {
    runOnly?: {
      type: string
      values: string[]
    }
  }

  export interface AxeResults {
    violations: unknown[]
    incomplete: unknown[]
    passes: unknown[]
  }

  export function run(options?: RunOptions): Promise<AxeResults | undefined>
}
