declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  function pdfParse(
    data: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>;

  export = pdfParse;
}

