/**
 * Battle report export — renders an after-action report for an engagement.
 *
 * The report covers the scenario setup, each side's order of battle grouped by
 * theatre, the round-by-round log, and the standing of each theatre.
 */

import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { BattleRules, BattleState, Side, Theatre } from '../types/battle';
import { THEATRE_DOMAIN, THEATRE_TACTICS_SKILL } from '../types/battle';
import {
  computeForceStrength, computeStartingForceStrength, effectiveFactor,
  shouldWithdraw, stacksInTheatre, tacticsScoreFor,
} from './battleResolutionService';
import {
  CHECK_RESULT_LABELS, formatCombatStrength, formatStepModifier,
  getSpecializationLabel, getTheatreKindLabel,
} from './battleFormatters';

interface ReportContext {
  pdf: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
}

const LINE_HEIGHT = 4.6;

function ensureSpace(ctx: ReportContext, needed: number): void {
  if (ctx.y + needed > ctx.pageHeight - 14) {
    ctx.pdf.addPage();
    ctx.y = ctx.margin;
  }
}

function heading(ctx: ReportContext, text: string, size = 12): void {
  ensureSpace(ctx, 12);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(size);
  ctx.pdf.text(text, ctx.margin, ctx.y);
  ctx.y += size * 0.45;
  ctx.pdf.setDrawColor(180);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 4;
}

function body(ctx: ReportContext, text: string, size = 8.5): void {
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(size);
  const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth) as string[];
  for (const line of lines) {
    ensureSpace(ctx, LINE_HEIGHT);
    ctx.pdf.text(line, ctx.margin, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
}

function table(ctx: ReportContext, headers: string[], widths: number[], rows: string[][]): void {
  const drawRow = (cells: string[], bold: boolean) => {
    ensureSpace(ctx, LINE_HEIGHT + 1);
    ctx.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    ctx.pdf.setFontSize(8);
    let x = ctx.margin;
    cells.forEach((cell, i) => {
      const maxWidth = widths[i] - 2;
      const text = ctx.pdf.splitTextToSize(cell, maxWidth)[0] ?? '';
      ctx.pdf.text(text, x, ctx.y);
      x += widths[i];
    });
    ctx.y += LINE_HEIGHT + 1;
  };

  drawRow(headers, true);
  ctx.pdf.setDrawColor(200);
  ctx.pdf.line(ctx.margin, ctx.y - LINE_HEIGHT + 1, ctx.margin + ctx.contentWidth, ctx.y - LINE_HEIGHT + 1);
  for (const row of rows) drawRow(row, false);
  ctx.y += 2;
}

function renderOrderOfBattle(ctx: ReportContext, side: Side, theatre: Theatre, rules: BattleRules): void {
  const stacks = stacksInTheatre(side, theatre.id);
  if (stacks.length === 0) {
    body(ctx, `${side.name}: no units committed.`);
    return;
  }

  const domain = THEATRE_DOMAIN[theatre.kind];
  const rows = stacks.map((s) => {
    const factor = effectiveFactor(s, domain, rules);
    const startingNative = s.combatStrengthPerUnit * s.initialQuantity;
    return [
      s.specialization === 'none' ? s.name : `${s.name} (${getSpecializationLabel(s.specialization)})`,
      String(s.initialQuantity),
      formatCombatStrength(startingNative),
      factor === null ? 'cannot engage' : `${Math.round(factor * 100)}%`,
      factor === null ? '—' : formatCombatStrength(startingNative * factor),
      formatCombatStrength(Math.max(0, s.currentStrength)),
    ];
  });

  body(ctx, `${side.name} — Tactics ${tacticsScoreFor(side, theatre.kind)}, withdraws at ${Math.round(side.withdrawThreshold * 100)}% losses`);
  table(
    ctx,
    ['Unit', 'Qty', 'Starting CS', 'Effect.', 'Effective CS', 'Remaining CS'],
    [58, 14, 26, 18, 26, 26],
    rows,
  );
}

function renderTheatre(ctx: ReportContext, state: BattleState, theatre: Theatre, rules: BattleRules): void {
  heading(ctx, `${theatre.name} — ${getTheatreKindLabel(theatre.kind)}`, 11);

  const fsA = computeForceStrength(state.sideA, theatre, rules);
  const fsB = computeForceStrength(state.sideB, theatre, rules);
  const startA = computeStartingForceStrength(state.sideA, theatre, rules);
  const startB = computeStartingForceStrength(state.sideB, theatre, rules);

  body(
    ctx,
    `Resolved with Tactics-${THEATRE_TACTICS_SKILL[theatre.kind]} tactics. ` +
    `${state.sideA.name}: ${formatCombatStrength(startA)} to ${formatCombatStrength(fsA)}. ` +
    `${state.sideB.name}: ${formatCombatStrength(startB)} to ${formatCombatStrength(fsB)}.`,
  );

  let outcome: string;
  if (fsA <= 0 && fsB <= 0) {
    outcome = 'Both forces were destroyed.';
  } else if (fsA <= 0) {
    outcome = `${state.sideB.name} holds the field.`;
  } else if (fsB <= 0) {
    outcome = `${state.sideA.name} holds the field.`;
  } else {
    const withdrawing = [
      shouldWithdraw(state.sideA, theatre, rules) ? state.sideA.name : null,
      shouldWithdraw(state.sideB, theatre, rules) ? state.sideB.name : null,
    ].filter(Boolean);
    outcome = withdrawing.length > 0
      ? `Undecided. Past the withdrawal threshold: ${withdrawing.join(', ')}.`
      : 'Undecided — both forces are still in the fight.';
  }
  body(ctx, `Outcome: ${outcome}`);
  ctx.y += 2;

  renderOrderOfBattle(ctx, state.sideA, theatre, rules);
  renderOrderOfBattle(ctx, state.sideB, theatre, rules);

  if (theatre.rounds.length === 0) {
    body(ctx, 'No rounds have been resolved in this theatre.');
    ctx.y += 3;
    return;
  }

  const rows = theatre.rounds.map((r) => {
    const attacker = r.attackerSide === 'A' ? state.sideA.name : state.sideB.name;
    const defender = r.defenderSide === 'A' ? state.sideA.name : state.sideB.name;
    return [
      String(r.round),
      attacker,
      defender,
      formatStepModifier(r.stepModifier),
      CHECK_RESULT_LABELS[r.checkResult],
      `${formatCombatStrength(r.attackerStrengthBefore)} > ${formatCombatStrength(r.attackerStrengthAfter)}`,
      `${formatCombatStrength(r.defenderStrengthBefore)} > ${formatCombatStrength(r.defenderStrengthAfter)}`,
    ];
  });

  table(
    ctx,
    ['#', 'Attacker', 'Defender', 'Step', 'Result', 'Attacker CS', 'Defender CS'],
    [8, 34, 34, 12, 32, 26, 26],
    rows,
  );
  ctx.y += 2;
}

function renderFooter(ctx: ReportContext): void {
  const totalPages = ctx.pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.pdf.setPage(i);
    const footerY = ctx.pageHeight - 6;
    ctx.pdf.setFontSize(6);
    ctx.pdf.setFont('helvetica', 'italic');
    ctx.pdf.setTextColor(128);
    ctx.pdf.text(`${APP_NAME} v${APP_VERSION}`, ctx.margin, footerY);
    ctx.pdf.text(`Page ${i}/${totalPages}`, ctx.pageWidth / 2, footerY, { align: 'center' });
    ctx.pdf.text(new Date().toLocaleDateString(), ctx.pageWidth - ctx.margin, footerY, { align: 'right' });
  }
  ctx.pdf.setTextColor(0);
}

/** Safe file name for the exported report. */
export function getBattleReportFileName(scenarioName: string): string {
  const base = (scenarioName || 'Engagement').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `${base || 'Engagement'}_battle_report.pdf`;
}

/**
 * Build and save an after-action report. Saves next to the given directory in
 * the desktop app, or downloads it in a browser.
 */
export async function exportBattleReport(
  state: BattleState,
  rules: BattleRules,
  targetDirectory?: string,
): Promise<string> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;

  const ctx: ReportContext = {
    pdf,
    y: margin,
    margin,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - margin * 2,
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(state.scenarioName || 'Engagement', margin, ctx.y);
  ctx.y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`${state.sideA.name} versus ${state.sideB.name}`, margin, ctx.y);
  ctx.y += 8;

  heading(ctx, 'Engagement Summary');
  const totalRounds = state.theatres.reduce((sum, t) => sum + t.rounds.length, 0);
  body(
    ctx,
    `${state.theatres.length} theatre(s), ${totalRounds} round(s) resolved. ` +
    `Combat strengths are shown as effective values for each theatre; a unit that cannot ` +
    `engage in a theatre contributes nothing to that force's strength.`,
  );
  ctx.y += 2;

  for (const theatre of state.theatres) {
    renderTheatre(ctx, state, theatre, rules);
  }

  renderFooter(ctx);

  const filename = getBattleReportFileName(state.scenarioName);
  if (window.electronAPI && targetDirectory) {
    const separator = targetDirectory.includes('\\') ? '\\' : '/';
    const fullPath = `${targetDirectory}${separator}${filename}`;
    const base64Data = pdf.output('datauristring').split(',')[1];
    const result = await window.electronAPI.savePdfFile(fullPath, base64Data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save the battle report');
    }
    return fullPath;
  }

  pdf.save(filename);
  return filename;
}
