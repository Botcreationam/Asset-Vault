const TRIAL_DAYS = 30;

export interface TrialInfo {
  isActive: boolean;
  daysRemaining: number;
  endsAt: Date;
}

export function getTrialInfo(createdAt: Date): TrialInfo {
  const endsAt = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const msRemaining = endsAt.getTime() - now;
  const isActive = msRemaining > 0;
  const daysRemaining = isActive ? Math.ceil(msRemaining / (24 * 60 * 60 * 1000)) : 0;
  return { isActive, daysRemaining, endsAt };
}
