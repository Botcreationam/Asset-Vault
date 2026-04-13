const BANNED_PATTERNS: RegExp[] = [
  /\bfuck(ing|er|ed|s)?\b/i,
  /\bsh[i1]t(ty|ter|s)?\b/i,
  /\bb[i1]tch(es|y)?\b/i,
  /\ba[s$][s$](hole|holes)?\b/i,
  /\bbastard(s)?\b/i,
  /\bc[u*]nt(s)?\b/i,
  /\bd[i1]ck(s|head)?\b/i,
  /\bc[o0]ck(s|sucker)?\b/i,
  /\bpussy\b/i,
  /\bwh[o0]re(s)?\b/i,
  /\bsl[u*]t(s|ty)?\b/i,
  /\bfagg[o0]t(s)?\b/i,
  /\bret[a@]rd(s|ed)?\b/i,
  /\bn[i1]gg[ae](r|rs|s)?\b/i,
  /\bk[i1]ll\s+your\s*self\b/i,
  /\bkys\b/i,
  /\bgo\s+die\b/i,
  /\bkill\s+(him|her|them|you|u)\b/i,
];

export function moderateContent(text: string): { ok: boolean; reason?: string } {
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok: false,
        reason:
          "Your message contains inappropriate or offensive language. Please keep the AcadVault community respectful.",
      };
    }
  }
  return { ok: true };
}
