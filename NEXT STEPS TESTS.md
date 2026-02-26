# Next Steps — Testing

Source of truth for the testing strategy, priorities, and framework setup.

All items from the initial test plan have been resolved. This file will be populated again after the next testing review.

**Last reviewed:** February 2026
**Framework:** Vitest 4.0.18 + React Testing Library + jest-dom + user-event
**Current stats:** 1,146 tests across 26 files, all passing
**Service tests:** 20 services tested (T1-T19, T22-T23; T20 modService + T21 pdfExportService skipped - IPC/DOM-bound)
**Component tests:** 6 test files (EditableDataGrid, ArcRadarSelector, SharedComponents, SummaryComponents, PdfExportDialog, integration)
**Skipped:** T20 (modService - IPC wrappers), T21 (pdfExportService - DOM-dependent), CT14-CT18 (trivial components)
