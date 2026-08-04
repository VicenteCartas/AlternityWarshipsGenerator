/**
 * Battle report export — renders an after-action report for an engagement.
 *
 * The report covers the scenario setup, each side's order of battle grouped by
 * theatre, the round-by-round log, and the standing of each theatre.
 */

import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { BattleRules, BattleState, Side } from '../types/battle';
import { THEATRE_TACTICS_SKILL } from '../types/battle';
import {
  tacticsScoreFor,
} from './battleResolutionService';
import {
  CHECK_RESULT_LABELS, formatCombatStrength, formatStepModifier,
  getSpecializationLabel, getTheatreKindLabel, getUnitCategoryLabel,
} from './battleFormatters';
import {
  summarizeBattleResults,
  type ObjectiveResultStatus,
  type SideTheatreResult,
  type TheatreResultSummary,
} from './battleResultsService';

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

function objectiveStatusLabel(status: ObjectiveResultStatus): string {
  if (status === 'inProgress') return 'In progress';
  if (status === 'unavailable') return 'Not available';
  if (status === 'satisfied') return 'Currently satisfied';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function casualtyCount(value: number | null): string {
  return value === null ? 'n/a' : String(value);
}

function renderOrderOfBattle(
  ctx: ReportContext,
  side: Side,
  result: SideTheatreResult,
  casualtiesAllocated: boolean,
): void {
  if (result.stacks.length === 0) {
    body(ctx, `${side.name}: no units committed.`);
    return;
  }

  body(
    ctx,
    `${side.name}: effective force strength ${formatCombatStrength(result.startingForceStrength)} to ` +
    `${formatCombatStrength(result.remainingForceStrength)} (${(result.lossFraction * 100).toFixed(1)}% lost).`,
  );
  if (!casualtiesAllocated) {
    body(ctx, 'Specific casualties unallocated; surviving, damaged, and destroyed unit counts are not assigned.');
  }

  const stackRows = result.stacks.map((stack) => {
    const source = side.stacks.find((candidate) => candidate.id === stack.stackId);
    const name = source?.specialization && source.specialization !== 'none'
      ? `${stack.name} (${getSpecializationLabel(source.specialization)})`
      : stack.name;
    return [
      stack.priorityAsset ? `${name} [priority]` : name,
      getUnitCategoryLabel(stack.category),
      String(stack.initialQuantity),
      casualtyCount(stack.survivingQuantity),
      casualtyCount(stack.damagedQuantity),
      casualtyCount(stack.destroyedQuantity),
      formatCombatStrength(stack.startingStrength),
      formatCombatStrength(stack.remainingStrength),
    ];
  });
  table(
    ctx,
    ['Unit', 'Category', 'Start', 'Surv.', 'Dmg.', 'Lost', 'Start CS', 'Remain CS'],
    [42, 27, 14, 16, 16, 16, 24, 24],
    stackRows,
  );

  const categoryRows = result.categories.map((category) => [
    getUnitCategoryLabel(category.category),
    String(category.initialQuantity),
    casualtyCount(category.survivingQuantity),
    casualtyCount(category.damagedQuantity),
    casualtyCount(category.destroyedQuantity),
    formatCombatStrength(category.startingStrength),
    formatCombatStrength(category.remainingStrength),
  ]);
  table(
    ctx,
    ['Category', 'Start', 'Surv.', 'Dmg.', 'Lost', 'Start CS', 'Remain CS'],
    [52, 18, 20, 20, 20, 26, 26],
    categoryRows,
  );
}

function renderTheatre(
  ctx: ReportContext,
  state: BattleState,
  result: TheatreResultSummary,
  casualtiesAllocated: boolean,
): void {
  const { theatre } = result;
  heading(ctx, `${theatre.name} — ${getTheatreKindLabel(theatre.kind)}`, 11);

  body(
    ctx,
    `Resolved with Tactics-${THEATRE_TACTICS_SKILL[theatre.kind]} tactics. ` +
    `${state.sideA.name}: ${formatCombatStrength(result.sideA.startingForceStrength)} to ${formatCombatStrength(result.sideA.remainingForceStrength)}. ` +
    `${state.sideB.name}: ${formatCombatStrength(result.sideB.startingForceStrength)} to ${formatCombatStrength(result.sideB.remainingForceStrength)}.`,
  );

  const outcome = result.winnerSideId
    ? `${result.winnerSideId === 'A' ? state.sideA.name : state.sideB.name} won this theatre.`
    : result.status === 'concluded'
      ? 'The theatre concluded without a winner.'
      : result.status === 'forcesEliminated'
        ? 'Both forces were eliminated.'
        : 'The theatre remains unresolved.';
  body(ctx, `Outcome: ${outcome}`);
  const withdrawing = [
    result.sideA.shouldWithdraw ? state.sideA.name : null,
    result.sideB.shouldWithdraw ? state.sideB.name : null,
  ].filter((name): name is string => name !== null);
  if (withdrawing.length > 0) {
    body(ctx, `SHOULD WITHDRAW: ${withdrawing.join(', ')}.`);
  }
  if (result.casualtiesPending) {
    body(ctx, 'Casualty allocations are still pending; these results are provisional.');
  }
  if (result.objectives.length > 0) {
    table(
      ctx,
      ['Objective', 'Side', 'Status', 'Result'],
      [52, 34, 30, 70],
      result.objectives.map((objective) => [
        objective.condition.name,
        objective.condition.beneficiarySideId === 'A' ? state.sideA.name : state.sideB.name,
        objectiveStatusLabel(objective.status),
        objective.evaluation.detail,
      ]),
    );
  }
  ctx.y += 2;

  body(ctx, `${state.sideA.name} — Tactics ${tacticsScoreFor(state.sideA, theatre.kind)}, withdraws at ${Math.round(state.sideA.withdrawThreshold * 100)}% losses`);
  renderOrderOfBattle(ctx, state.sideA, result.sideA, casualtiesAllocated);
  body(ctx, `${state.sideB.name} — Tactics ${tacticsScoreFor(state.sideB, theatre.kind)}, withdraws at ${Math.round(state.sideB.withdrawThreshold * 100)}% losses`);
  renderOrderOfBattle(ctx, state.sideB, result.sideB, casualtiesAllocated);

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

/** Build the report document without saving it, for previews and tests. */
export function createBattleReportPdf(state: BattleState, rules: BattleRules): jsPDF {
  const summary = summarizeBattleResults(state, rules);
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
  const totalRounds = state.theatres.reduce((sum, theatre) => sum + theatre.rounds.length, 0);
  body(ctx, `${state.theatres.length} theatre(s), ${totalRounds} round(s) resolved.`);
  body(ctx, `Overall result: ${summary.overallLabel}`);
  body(
    ctx,
    summary.casualtiesAllocated
      ? 'Specific casualties allocated: survivor, damaged, and destroyed counts reflect approved stack losses.'
      : 'Specific casualties unallocated: this engagement used abstract proportional combat-strength losses.',
  );
  if (summary.casualtiesPending) {
    body(ctx, 'One or more casualty allocations remain pending; the report is provisional.');
  }

  if (summary.objectiveResults.length > 0) {
    heading(ctx, 'Victory Objectives');
    table(
      ctx,
      ['Objective', 'Side', 'Scope', 'Status', 'Result'],
      [44, 30, 32, 28, 52],
      summary.objectiveResults.map((objective) => [
        objective.condition.name,
        objective.condition.beneficiarySideId === 'A' ? state.sideA.name : state.sideB.name,
        objective.condition.theatreId === null
          ? 'Whole battle'
          : state.theatres.find((theatre) => theatre.id === objective.condition.theatreId)?.name ?? 'Missing theatre',
        objectiveStatusLabel(objective.status),
        objective.evaluation.detail,
      ]),
    );
  }

  for (const theatreResult of summary.theatres) {
    renderTheatre(ctx, state, theatreResult, summary.casualtiesAllocated);
  }

  renderFooter(ctx);
  return pdf;
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
  const pdf = createBattleReportPdf(state, rules);

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
