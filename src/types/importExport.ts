export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  importedDocCount?: number;
  importedTagCount?: number;
  skippedDocs?: string[];
  error?: string;
}
