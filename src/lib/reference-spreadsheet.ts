import ExcelJS from "exceljs";
import fs from "fs/promises";
import path from "path";

export type ReferenceSpreadsheetSlug = "teminatlar" | "tarife";

export interface SpreadsheetSheet {
  name: string;
  rows: string[][];
}

export interface SpreadsheetData {
  slug: ReferenceSpreadsheetSlug;
  fileName: string;
  sheets: SpreadsheetSheet[];
  missing: boolean;
}

const REFERENCE_DIR = path.join(process.cwd(), "data", "reference");

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString("tr-TR");
  }
  if (typeof value === "object") {
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value && value.result != null) return String(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("formula" in value) return String(value.result ?? value.formula ?? "");
  }
  return String(value);
}

function worksheetToRows(worksheet: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values;
    if (!Array.isArray(values)) return;
    const cells = values.slice(1).map((value) => cellToString(value as ExcelJS.CellValue));
    if (cells.some((cell) => cell.trim())) {
      rows.push(cells);
    }
  });
  return rows;
}

export function referenceSpreadsheetPath(slug: ReferenceSpreadsheetSlug) {
  return path.join(REFERENCE_DIR, `${slug}.xlsx`);
}

export async function loadReferenceSpreadsheet(slug: ReferenceSpreadsheetSlug): Promise<SpreadsheetData> {
  const filePath = referenceSpreadsheetPath(slug);
  const fileName = `${slug}.xlsx`;

  try {
    await fs.access(filePath);
  } catch {
    return { slug, fileName, sheets: [], missing: true };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheets = workbook.worksheets
    .map((worksheet) => ({
      name: worksheet.name,
      rows: worksheetToRows(worksheet),
    }))
    .filter((sheet) => sheet.rows.length > 0);

  return {
    slug,
    fileName,
    sheets,
    missing: sheets.length === 0,
  };
}
