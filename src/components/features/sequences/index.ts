// src/components/features/sequences/index.ts
// Barrel export — composants du système Séquençage (S7)
//
// ⚠️ SYSTÈME SÉQUENÇAGE — DISTINCT DU PLANNING ET DES JETONS
// Ces composants ne doivent pas être utilisés dans des contextes Planning ou Jetons.

export { SequenceEditor } from './sequence-editor/SequenceEditor'
export { SequenceMiniTimeline } from './sequence-mini-timeline/SequenceMiniTimeline'
