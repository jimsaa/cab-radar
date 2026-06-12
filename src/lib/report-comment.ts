export const REPORT_COMMENT_PREVIEW_MAX = 120;

export interface ReportCommentPreviewData {
  text: string;
  truncated: boolean;
  full: string;
}

export function getReportCommentPreview(
  comment: string | null | undefined,
  max = REPORT_COMMENT_PREVIEW_MAX
): ReportCommentPreviewData | null {
  const trimmed = comment?.trim();
  if (!trimmed) return null;

  if (trimmed.length <= max) {
    return { text: trimmed, truncated: false, full: trimmed };
  }

  return {
    text: `${trimmed.slice(0, max).trimEnd()}...`,
    truncated: true,
    full: trimmed,
  };
}
