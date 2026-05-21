export type ImportRowAction = "create" | "update" | "skip" | "error";

export type ImportRowPreview = {
  row: number;
  action: ImportRowAction;
  label: string;
  message?: string;
};

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export type ImportPreview = {
  totalRows: number;
  validRows: number;
  wouldCreate: number;
  wouldUpdate: number;
  wouldSkip: number;
  errorCount: number;
  detectedColumns: string[];
  samples: ImportRowPreview[];
  errors: { row: number; message: string }[];
};
