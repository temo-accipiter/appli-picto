import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Tableau from './Tableau'

const mockUseChildProfile = vi.fn()
const mockUseDisplay = vi.fn()
const mockUseOffline = vi.fn()
const mockUseTimelines = vi.fn()
const mockUseSlots = vi.fn()
const mockUseBankCards = vi.fn()
const mockUsePersonalCards = vi.fn()
const mockUseSessions = vi.fn()
const mockUseSessionValidations = vi.fn()
const mockUseSequencesWithVisitor = vi.fn()
const mockUseSequenceStepsWithVisitor = vi.fn()

let prefersReducedMotion = false
let sessionState: 'active_started' | 'completed' = 'active_started'
let validatedSlotIds = new Set<string>()

vi.mock('@/contexts/ChildProfileContext', () => ({
  useChildProfile: () => mockUseChildProfile(),
}))

vi.mock('@/contexts', () => ({
  useDisplay: () => mockUseDisplay(),
}))

vi.mock('@/contexts/OfflineContext', () => ({
  useOffline: () => mockUseOffline(),
}))

vi.mock('@/hooks', () => ({
  useReducedMotion: () => prefersReducedMotion,
}))

vi.mock('@/hooks/useTimelines', () => ({
  default: () => mockUseTimelines(),
}))

vi.mock('@/hooks/useSlots', () => ({
  default: () => mockUseSlots(),
}))

vi.mock('@/hooks/useBankCards', () => ({
  default: () => mockUseBankCards(),
}))

vi.mock('@/hooks/usePersonalCards', () => ({
  default: () => mockUsePersonalCards(),
}))

vi.mock('@/hooks/useSessions', () => ({
  default: () => mockUseSessions(),
}))

vi.mock('@/hooks/useSessionValidations', () => ({
  default: () => mockUseSessionValidations(),
}))

vi.mock('@/hooks/useSequencesWithVisitor', () => ({
  default: () => mockUseSequencesWithVisitor(),
}))

vi.mock('@/hooks/useSequenceStepsWithVisitor', () => ({
  default: () => mockUseSequenceStepsWithVisitor(),
}))

vi.mock('@/components', () => ({
  TrainProgressBar: ({ done, total }: { done: number; total: number }) => (
    <div data-testid="train-progress">
      {done}/{total}
    </div>
  ),
  FloatingTimeTimer: () => <div data-testid="floating-timer" />,
  FloatingPencil: () => null,
}))

vi.mock('@/components/features/tableau', () => ({
  SlotCard: ({
    card,
    validated,
    sessionCompleted,
  }: {
    card: { id: string; name: string } | null
    validated: boolean
    sessionCompleted: boolean
  }) => (
    <div
      data-testid={`slot-card-${card?.id ?? 'missing'}`}
      data-validated={validated}
      data-session-completed={sessionCompleted}
    >
      {card?.name ?? 'Carte'}
    </div>
  ),
  TokensGrid: ({
    earnedTokens,
    totalTokens,
  }: {
    earnedTokens: number
    totalTokens: number
  }) => (
    <div data-testid="tokens-grid">
      {earnedTokens}/{totalTokens}
    </div>
  ),
  SessionComplete: ({
    rewardCard,
    variant,
  }: {
    rewardCard: { name: string } | null
    variant?: string
  }) => (
    <div data-testid="session-complete" data-variant={variant}>
      {rewardCard?.name ?? 'aucune'}
    </div>
  ),
}))

const timeline = { id: 'timeline-1' }

const slots = [
  {
    id: 'slot-1',
    kind: 'step',
    card_id: 'card-1',
    tokens: 1,
  },
  {
    id: 'slot-2',
    kind: 'step',
    card_id: 'card-2',
    tokens: 1,
  },
  {
    id: 'reward-slot',
    kind: 'reward',
    card_id: 'reward-card',
    tokens: 0,
  },
]

const bankCards = [
  {
    id: 'card-1',
    name: 'Carte 1',
    type: 'bank',
    image_url: null,
  },
  {
    id: 'card-2',
    name: 'Carte 2',
    type: 'bank',
    image_url: null,
  },
  {
    id: 'reward-card',
    name: 'Récompense',
    type: 'bank',
    image_url: null,
  },
]

describe('Tableau completion reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    prefersReducedMotion = false
    sessionState = 'active_started'
    validatedSlotIds = new Set(['slot-1'])

    mockUseChildProfile.mockReturnValue({ activeChildId: 'child-1' })
    mockUseDisplay.mockReturnValue({
      showTrain: true,
      showTimeTimer: false,
    })
    mockUseOffline.mockReturnValue({
      isOnline: true,
      enqueueValidation: vi.fn(),
    })
    mockUseTimelines.mockReturnValue({
      timeline,
      loading: false,
    })
    mockUseSlots.mockReturnValue({
      slots,
      loading: false,
      refresh: vi.fn(),
    })
    mockUseBankCards.mockReturnValue({
      cards: bankCards,
      loading: false,
    })
    mockUsePersonalCards.mockReturnValue({
      cards: [],
      loading: false,
    })
    mockUseSessions.mockImplementation(() => ({
      session: {
        id: 'session-1',
        state: sessionState,
        steps_total_snapshot: 2,
        epoch: 1,
      },
      loading: false,
      createSession: vi.fn(),
      refresh: vi.fn(),
    }))
    mockUseSessionValidations.mockImplementation(() => ({
      validatedSlotIds,
      validate: vi.fn(async () => ({ error: null })),
      refresh: vi.fn(),
    }))
    mockUseSequencesWithVisitor.mockReturnValue({
      sequences: [],
      refresh: vi.fn(),
    })
    mockUseSequenceStepsWithVisitor.mockReturnValue({
      steps: [],
      loading: false,
    })
  })

  it('retarde la révélation de la récompense après la complétion finale', () => {
    const { rerender } = render(<Tableau />)

    expect(screen.queryByTestId('session-complete')).not.toBeInTheDocument()
    expect(screen.getByTestId('train-progress')).toHaveTextContent('1/2')
    expect(screen.getByTestId('tokens-grid')).toHaveTextContent('1/2')

    validatedSlotIds = new Set(['slot-1', 'slot-2'])
    sessionState = 'completed'

    rerender(<Tableau />)

    expect(screen.queryByTestId('session-complete')).not.toBeInTheDocument()
    expect(screen.getByTestId('train-progress')).toHaveTextContent('2/2')
    expect(screen.getByTestId('tokens-grid')).toHaveTextContent('2/2')
    expect(screen.getByTestId('slot-card-card-1')).toHaveAttribute(
      'data-session-completed',
      'true'
    )

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByTestId('session-complete')).toHaveTextContent(
      'Récompense'
    )
    expect(screen.getByTestId('completion-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('session-complete')).toHaveAttribute(
      'data-variant',
      'overlay'
    )
    expect(screen.getByTestId('slot-card-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('train-progress')).toHaveTextContent('2/2')
  })

  it('affiche immédiatement la récompense dans le même Tableau si la session est déjà complétée au chargement', () => {
    validatedSlotIds = new Set(['slot-1', 'slot-2'])
    sessionState = 'completed'

    render(<Tableau />)

    expect(screen.getByTestId('session-complete')).toHaveTextContent(
      'Récompense'
    )
    expect(screen.getByTestId('completion-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('slot-card-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('train-progress')).toHaveTextContent('2/2')
  })
})
