// Type declaration for axe-core Playwright integration
declare module 'axe-core' {
  export interface RunOptions {
    runOnly?: {
      type: string
      values: string[]
    }
  }

  export interface NodeResult {
    target: string[]
    html?: string
    failureSummary?: string
  }

  export interface Result {
    id: string
    impact?: 'minor' | 'moderate' | 'serious' | 'critical'
    tags: string[]
    description: string
    help: string
    helpUrl: string
    nodes: NodeResult[]
  }

  export interface AxeResults {
    violations: Result[]
    incomplete: Result[]
    passes: Result[]
  }

  export function run(options?: RunOptions): Promise<AxeResults>
}
