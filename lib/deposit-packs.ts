export const DEPOSIT_PACKS = [
  {
    id: 'trials-10',
    label: '10 Trials',
    trials: 10,
    amount: '10000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: null,
  },
  {
    id: 'trials-25',
    label: '27 Trials',
    trials: 27,
    amount: '25000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: '+8% BONUS',
  },
  {
    id: 'trials-50',
    label: '60 Trials',
    trials: 60,
    amount: '50000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: '+20% BONUS',
  },
  {
    id: 'trials-100',
    label: '130 Trials',
    trials: 130,
    amount: '100000000000',
    token: 'ALIEN',
    network: 'alien',
    bonus: '+30% BONUS',
  },
] as const;

export type DepositPack = typeof DEPOSIT_PACKS[number];
