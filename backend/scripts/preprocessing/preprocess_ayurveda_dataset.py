"""
preprocess_ayurveda_dataset.py

Preprocessing pipeline for the NATIONAL AYURVEDA MORBIDITY CODES (NAMC) dataset.

This script inspects the raw Excel workbook, cleans it, and produces a
machine-readable dataset suitable for future NLP / search / retrieval work
(TF-IDF, embeddings, similarity search, etc.). It performs ONLY inspection,
cleaning, validation and export -- no modelling, no embeddings, no app code.

Author: (generated for mini-project use)
"""

import argparse
import json
import logging
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Logging setup
# --------------------------------------------------------------------------

logger = logging.getLogger("ayurveda_preprocess")


def setup_logging(output_dir: Path) -> None:
    """Configure logging to both console and a log file inside output_dir."""
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter("%(asctime)s | %(levelname)-7s | %(message)s",
                             datefmt="%H:%M:%S")

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(fmt)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

    log_path = output_dir / "preprocessing_log.txt"
    file_handler = logging.FileHandler(log_path, mode="w", encoding="utf-8")
    file_handler.setFormatter(fmt)
    file_handler.setLevel(logging.INFO)
    logger.addHandler(file_handler)


# --------------------------------------------------------------------------
# Step 1: Load dataset
# --------------------------------------------------------------------------

def load_excel(input_path: Path, sheet: str | int | None, header_row: int | None):
    """
    Load the Excel workbook and return (dataframe, sheet_name_used, all_sheet_names).

    Handles missing engines / bad files with clear error messages.
    `header_row` is 0-indexed. If None, header detection is attempted.
    """
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    suffix = input_path.suffix.lower()
    if suffix not in (".xls", ".xlsx", ".xlsm"):
        raise ValueError(
            f"Unsupported file type '{suffix}'. Expected .xls, .xlsx, or .xlsm"
        )

    try:
        xls = pd.ExcelFile(input_path)
    except ImportError as e:
        # Missing engine (xlrd for .xls, openpyxl for .xlsx)
        needed = "xlrd" if suffix == ".xls" else "openpyxl"
        raise ImportError(
            f"Missing required Excel engine to read '{suffix}' files. "
            f"Install it with: pip install {needed}\nOriginal error: {e}"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to open workbook '{input_path}': {e}")

    all_sheets = xls.sheet_names
    if not all_sheets:
        raise ValueError("The workbook contains no sheets (empty workbook).")

    if sheet is None:
        sheet_to_use = all_sheets[0]
    else:
        # sheet may be given as an index (string digit) or a name
        if isinstance(sheet, str) and sheet.isdigit():
            sheet = int(sheet)
        if isinstance(sheet, int):
            if sheet < 0 or sheet >= len(all_sheets):
                raise ValueError(
                    f"Sheet index {sheet} out of range. "
                    f"Workbook has {len(all_sheets)} sheet(s): {all_sheets}"
                )
            sheet_to_use = all_sheets[sheet]
        else:
            if sheet not in all_sheets:
                raise ValueError(
                    f"Sheet '{sheet}' not found. Available sheets: {all_sheets}"
                )
            sheet_to_use = sheet

    detected_header = header_row
    if detected_header is None:
        detected_header = detect_header_row(xls, sheet_to_use)

    try:
        df = pd.read_excel(xls, sheet_name=sheet_to_use, header=detected_header)
    except Exception as e:
        raise RuntimeError(
            f"Failed to read sheet '{sheet_to_use}' with header row "
            f"{detected_header}: {e}"
        )

    return df, sheet_to_use, all_sheets, detected_header


def detect_header_row(xls: pd.ExcelFile, sheet_name: str, max_scan: int = 15) -> int:
    """
    Try to automatically find which row (0-indexed) is the real header row.

    Strategy: read the first `max_scan` rows with no header, then pick the
    first row where the majority of cells are non-empty strings and the
    following row(s) look like data (i.e. this row is not itself an all-empty
    or title-only row). Falls back to row 0 if detection is inconclusive.
    """
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None, nrows=max_scan)

    best_row = 0
    best_score = -1
    for i in range(len(raw)):
        row = raw.iloc[i]
        non_null = row.notna().sum()
        # Header rows tend to have many non-null, mostly-string, short values
        string_like = sum(
            isinstance(v, str) and 0 < len(v.strip()) < 60 for v in row if pd.notna(v)
        )
        score = string_like
        # Require a reasonable fraction of the row to be filled
        if non_null >= max(2, int(0.5 * raw.shape[1])) and score > best_score:
            best_score = score
            best_row = i

    return best_row


# --------------------------------------------------------------------------
# Step 2: Dataset inspection / reporting
# --------------------------------------------------------------------------

def print_dataset_report(df: pd.DataFrame, file_name: str, sheet_used: str,
                          all_sheets: list, header_row: int) -> None:
    logger.info("=" * 70)
    logger.info("DATASET INSPECTION REPORT")
    logger.info("=" * 70)
    logger.info(f"File name        : {file_name}")
    logger.info(f"All sheets found : {all_sheets}")
    logger.info(f"Sheet selected   : {sheet_used}")
    logger.info(f"Header row used  : {header_row} (0-indexed)")
    logger.info(f"Number of rows   : {df.shape[0]}")
    logger.info(f"Number of columns: {df.shape[1]}")
    logger.info(f"Column names     : {list(df.columns)}")
    logger.info("-" * 70)
    logger.info("Data types per column:")
    for col, dtype in df.dtypes.items():
        logger.info(f"  {col:35s} : {dtype}")
    logger.info("-" * 70)
    logger.info("Missing values per column:")
    missing = df.isna().sum()
    for col, cnt in missing.items():
        pct = (cnt / len(df) * 100) if len(df) else 0
        logger.info(f"  {col:35s} : {cnt} ({pct:.1f}%)")
    logger.info("-" * 70)
    dup_count = df.duplicated().sum()
    logger.info(f"Fully duplicated rows: {dup_count}")
    logger.info("-" * 70)
    logger.info("Sample records (first 3 rows):")
    with pd.option_context("display.max_colwidth", 80):
        logger.info("\n" + str(df.head(3)))
    logger.info("=" * 70)


# --------------------------------------------------------------------------
# Step 3: Column name cleaning
# --------------------------------------------------------------------------

def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names: strip spaces, collapse repeated spaces,
    remove stray special characters, lowercase, spaces -> underscores.
    Does not alter medical terminology inside the actual data.
    """
    new_cols = {}
    for col in df.columns:
        original = str(col)
        cleaned = original.strip()
        cleaned = re.sub(r"\s+", " ", cleaned)          # collapse whitespace
        cleaned = re.sub(r"[^\w\s./-]", "", cleaned)     # drop stray punctuation
        cleaned = cleaned.strip().lower()
        cleaned = re.sub(r"[\s./-]+", "_", cleaned)       # spaces/./- -> underscore
        cleaned = re.sub(r"_+", "_", cleaned).strip("_")
        new_cols[col] = cleaned

    df = df.rename(columns=new_cols)
    logger.info("Column name mapping (original -> cleaned):")
    for orig, new in new_cols.items():
        logger.info(f"  '{orig}' -> '{new}'")
    return df


# --------------------------------------------------------------------------
# Step 4: Missing value handling
# --------------------------------------------------------------------------

# Values that effectively mean "missing" in this dataset (e.g. placeholder '-')
MISSING_PLACEHOLDERS = {"-", "--", "n/a", "na", "none", "null", ""}


def standardize_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert empty strings, whitespace-only strings, and known placeholder
    tokens (e.g. '-') to real NaN so missingness can be measured/handled
    consistently. Only applied to object/string columns.
    """
    df = df.copy()
    for col in df.columns:
        # Covers legacy object dtype AND pandas' newer string dtypes
        # (which may report as 'string', 'str', or a pyarrow-backed string dtype)
        is_textlike = (
            pd.api.types.is_object_dtype(df[col])
            or pd.api.types.is_string_dtype(df[col])
        )
        if is_textlike:
            def _to_nan(v):
                if pd.isna(v):
                    return np.nan
                s = str(v).strip()
                if s.lower() in MISSING_PLACEHOLDERS:
                    return np.nan
                return v
            # Cast to plain object dtype first so NaN can be assigned freely
            # (pandas' newer StringDtype columns reject float NaN otherwise)
            df[col] = df[col].astype(object).apply(_to_nan)
    return df


def drop_empty_rows_and_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Remove rows/columns that are completely empty (all NaN)."""
    before_rows, before_cols = df.shape
    df = df.dropna(axis=0, how="all")
    df = df.dropna(axis=1, how="all")
    after_rows, after_cols = df.shape
    logger.info(
        f"Removed {before_rows - after_rows} fully empty row(s) and "
        f"{before_cols - after_cols} fully empty column(s)."
    )
    return df


# --------------------------------------------------------------------------
# Step 5: Duplicate handling
# --------------------------------------------------------------------------

def remove_duplicates(df: pd.DataFrame, id_col: str | None, code_col: str | None) -> pd.DataFrame:
    """
    Remove genuine duplicate rows. A row is considered a genuine duplicate
    only if ALL fields except a running serial-number-like column are
    identical (i.e. it is a true re-entry, not merely a similar term).
    """
    before = len(df)

    ignore_cols = []
    for candidate in ("sr_no", "s_no", "sl_no", "serial_no"):
        if candidate in df.columns:
            ignore_cols.append(candidate)

    compare_cols = [c for c in df.columns if c not in ignore_cols]
    dup_mask = df.duplicated(subset=compare_cols, keep="first")
    dup_count = dup_mask.sum()
    df = df[~dup_mask].copy()

    logger.info("Duplicates before cleaning: %d", before)
    logger.info("Duplicates removed: %d", dup_count)
    logger.info("Rows remaining: %d", len(df))

    if code_col and code_col in df.columns:
        dup_codes = df[code_col].dropna()
        dup_codes = dup_codes[dup_codes.duplicated(keep=False)]
        if len(dup_codes) > 0:
            logger.warning(
                "Found %d rows sharing a duplicate value in code column '%s' "
                "after row-level de-duplication (kept, flagged for review).",
                len(dup_codes), code_col
            )

    return df


# --------------------------------------------------------------------------
# Step 6: Text normalization
# --------------------------------------------------------------------------

def normalize_text(text):
    """
    Normalize a text value without destroying medical/Ayurvedic terminology.

    - Unicode NFC normalization (consistent representation of diacritics)
    - Replace non-breaking spaces and other unicode whitespace with normal spaces
    - Collapse repeated whitespace
    - Strip leading/trailing whitespace
    - Normalize a few punctuation variants (curly quotes, multiple dashes)
    - Does NOT lowercase, stem, or remove stop-words (would alter meaning
      of Sanskrit/Ayurveda/Siddha/Unani terms)
    """
    if pd.isna(text):
        return text
    s = str(text)

    # Unicode normalization (keeps diacritics like ā, ṣ, ṛ, ñ intact)
    s = unicodedata.normalize("NFC", s)

    # Replace various unicode space characters (incl. non-breaking space) with ' '
    s = re.sub(r"[\u00A0\u2000-\u200B\u202F\u205F\u3000]", " ", s)

    # Normalize punctuation variants
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\u201C", '"').replace("\u201D", '"')
    s = re.sub(r"-{2,}", "-", s)

    # Collapse repeated whitespace and strip
    s = re.sub(r"\s+", " ", s).strip()

    return s


def apply_text_normalization(df: pd.DataFrame, text_columns: list) -> pd.DataFrame:
    """
    For each textual column, keep the ORIGINAL values untouched and add a
    parallel '<col>_normalized' column with whitespace/unicode-cleaned text.
    """
    df = df.copy()
    for col in text_columns:
        if col in df.columns:
            df[f"{col}_normalized"] = df[col].apply(normalize_text)
            logger.info(f"Created normalized column: {col}_normalized")
    return df


# --------------------------------------------------------------------------
# Step 7: Code cleaning
# --------------------------------------------------------------------------

def clean_code_column(df: pd.DataFrame, code_col: str) -> pd.DataFrame:
    """
    Clean a morbidity/classification code column while preserving it as a
    string (never cast to numeric, to avoid losing leading zeros or
    alphanumeric structure).
    """
    df = df.copy()
    if code_col not in df.columns:
        return df

    def _clean_code(v):
        if pd.isna(v):
            return v
        s = str(v)
        s = unicodedata.normalize("NFC", s)
        s = re.sub(r"[\u00A0\u2000-\u200B\u202F\u205F\u3000]", " ", s)  # NBSP etc -> space
        s = re.sub(r"\s+", " ", s).strip()
        return s

    df[code_col] = df[code_col].astype("object").apply(_clean_code)
    df[code_col] = df[code_col].astype("string")  # force string dtype, never numeric

    missing_codes = df[code_col].isna().sum()
    dup_codes = df[code_col].dropna().duplicated().sum()
    logger.info(f"Code column '{code_col}': {missing_codes} missing, "
                f"{dup_codes} duplicate value(s) after cleaning.")
    return df


# --------------------------------------------------------------------------
# Step 8: Column role detection (dataset-specific but not hardcoded blindly)
# --------------------------------------------------------------------------

def detect_column_roles(columns: list) -> dict:
    """
    Heuristically classify cleaned column names into roles based on
    keyword matching. Only returns roles for columns that actually exist.
    """
    roles = {
        "id_columns": [],
        "code_columns": [],
        "term_columns": [],
        "description_columns": [],
        "category_columns": [],
        "other_columns": [],
    }

    for col in columns:
        c = col.lower()
        if "id" in c and "code" not in c:
            roles["id_columns"].append(col)
        elif "code" in c:
            roles["code_columns"].append(col)
        elif "term" in c or "name" in c:
            roles["term_columns"].append(col)
        elif "definition" in c or "description" in c or "desc" in c:
            roles["description_columns"].append(col)
        elif "category" in c or "branch" in c or "index" in c or "ontology" in c:
            roles["category_columns"].append(col)
        else:
            roles["other_columns"].append(col)

    return roles


# --------------------------------------------------------------------------
# Step 9: search_text construction
# --------------------------------------------------------------------------

def build_search_text(df: pd.DataFrame, term_cols: list, desc_cols: list,
                       category_cols: list) -> pd.DataFrame:
    """
    Build a combined 'search_text' field from existing normalized text
    columns (terms + descriptions + categories). Codes are intentionally
    excluded. Only columns that actually exist are used.
    """
    df = df.copy()

    candidate_cols = []
    for c in term_cols + desc_cols + category_cols:
        norm_col = f"{c}_normalized"
        if norm_col in df.columns:
            candidate_cols.append(norm_col)
        elif c in df.columns:
            candidate_cols.append(c)

    # de-duplicate while preserving order
    seen = set()
    ordered_cols = []
    for c in candidate_cols:
        if c not in seen:
            seen.add(c)
            ordered_cols.append(c)

    if not ordered_cols:
        logger.warning("No suitable columns found to build search_text; skipping.")
        return df

    def _combine(row):
        parts = []
        for c in ordered_cols:
            val = row.get(c)
            if pd.notna(val) and str(val).strip():
                parts.append(str(val).strip())
        return " | ".join(parts)

    df["search_text"] = df.apply(_combine, axis=1)
    logger.info(f"search_text built from columns: {ordered_cols}")
    return df


# --------------------------------------------------------------------------
# Step 10: Data quality checks
# --------------------------------------------------------------------------

def run_quality_checks(df: pd.DataFrame, roles: dict, important_cols: list) -> list:
    """
    Run non-fatal validation checks and return a list of warning/info strings
    describing findings (used for the data_quality_report.txt file).
    """
    findings = []

    # Check 1: important columns present
    missing_important = [c for c in important_cols if c not in df.columns]
    if missing_important:
        findings.append(f"WARNING: Expected important column(s) missing: {missing_important}")
    else:
        findings.append("OK: All expected important columns are present.")

    # Check 2: duplicated codes
    for code_col in roles.get("code_columns", []):
        if code_col in df.columns:
            dup = df[code_col].dropna().duplicated().sum()
            if dup > 0:
                findings.append(f"WARNING: Column '{code_col}' has {dup} duplicate value(s).")
            else:
                findings.append(f"OK: Column '{code_col}' has no duplicate values.")

    # Check 3: empty terminology fields
    for term_col in roles.get("term_columns", []):
        if term_col in df.columns:
            empty = df[term_col].isna().sum()
            if empty > 0:
                findings.append(f"WARNING: Column '{term_col}' has {empty} empty value(s).")

    # Check 4: duplicate normalized terms
    for term_col in roles.get("term_columns", []):
        norm_col = f"{term_col}_normalized"
        if norm_col in df.columns:
            dup = df[norm_col].dropna().duplicated().sum()
            if dup > 0:
                findings.append(
                    f"WARNING: Column '{norm_col}' has {dup} duplicate normalized value(s) "
                    f"(may be legitimate synonyms/sub-entries)."
                )

    # Check 5: unexpected data types (codes must be string, not numeric)
    for code_col in roles.get("code_columns", []):
        if code_col in df.columns and not pd.api.types.is_string_dtype(df[code_col]):
            findings.append(f"WARNING: Code column '{code_col}' is not string dtype "
                             f"(dtype={df[code_col].dtype}).")

    # Check 6: suspiciously long/short text values
    for term_col in roles.get("term_columns", []):
        if term_col in df.columns:
            lengths = df[term_col].dropna().astype(str).str.len()
            if len(lengths) > 0:
                too_short = (lengths < 2).sum()
                too_long = (lengths > 300).sum()
                if too_short:
                    findings.append(f"WARNING: '{term_col}' has {too_short} suspiciously short value(s) (<2 chars).")
                if too_long:
                    findings.append(f"WARNING: '{term_col}' has {too_long} suspiciously long value(s) (>300 chars).")

    # Check 7: invalid / inconsistent codes (contains unexpected control chars)
    for code_col in roles.get("code_columns", []):
        if code_col in df.columns:
            bad = df[code_col].dropna().astype(str).apply(
                lambda s: bool(re.search(r"[\x00-\x1f]", s))
            ).sum()
            if bad:
                findings.append(f"WARNING: '{code_col}' has {bad} value(s) with control characters.")

    for f in findings:
        level = logging.WARNING if f.startswith("WARNING") else logging.INFO
        logger.log(level, f)

    return findings


# --------------------------------------------------------------------------
# Step 11: Statistics
# --------------------------------------------------------------------------

def compute_statistics(original_shape, final_df, dup_removed, empty_removed,
                        roles: dict) -> dict:
    stats = {
        "original_rows": original_shape[0],
        "original_columns": original_shape[1],
        "rows_removed_empty": empty_removed,
        "duplicates_removed": dup_removed,
        "final_rows": final_df.shape[0],
        "final_columns": final_df.shape[1],
        "missing_values_per_column": final_df.isna().sum().to_dict(),
    }

    for code_col in roles.get("code_columns", []):
        if code_col in final_df.columns:
            stats[f"unique_{code_col}"] = int(final_df[code_col].nunique(dropna=True))

    for term_col in roles.get("term_columns", []):
        if term_col in final_df.columns:
            stats[f"unique_{term_col}"] = int(final_df[term_col].nunique(dropna=True))

    for cat_col in roles.get("category_columns", []):
        if cat_col in final_df.columns:
            vc = final_df[cat_col].value_counts(dropna=True).head(30)
            stats[f"category_counts_{cat_col}"] = vc.to_dict()

    return stats


# --------------------------------------------------------------------------
# Main pipeline
# --------------------------------------------------------------------------

def run_pipeline(input_path: Path, output_dir: Path, sheet, header_row):
    output_dir.mkdir(parents=True, exist_ok=True)
    setup_logging(output_dir)

    logger.info("Loading dataset...")
    df, sheet_used, all_sheets, header_used = load_excel(input_path, sheet, header_row)
    original_shape = df.shape

    logger.info("Inspecting workbook...")
    print_dataset_report(df, input_path.name, sheet_used, all_sheets, header_used)

    logger.info("Cleaning column names...")
    df = clean_column_names(df)

    logger.info("Standardizing missing-value placeholders...")
    df = standardize_missing_values(df)

    logger.info("Removing empty rows/columns...")
    before_rows = len(df)
    df = drop_empty_rows_and_columns(df)
    empty_removed = before_rows - len(df)

    roles = detect_column_roles(list(df.columns))
    logger.info(f"Detected column roles: {json.dumps(roles, indent=2)}")

    code_col = roles["code_columns"][0] if roles["code_columns"] else None
    id_col = roles["id_columns"][0] if roles["id_columns"] else None

    # Clean codes BEFORE duplicate detection: some rows are true duplicates
    # that differ only by invisible whitespace (e.g. a non-breaking space)
    # inside the code column. Cleaning first lets de-duplication catch them.
    logger.info("Cleaning code column(s)...")
    for c in roles["code_columns"]:
        df = clean_code_column(df, c)

    logger.info("Checking duplicate records...")
    df = remove_duplicates(df, id_col=id_col, code_col=code_col)
    dup_removed_total = original_shape[0] - empty_removed - len(df)

    logger.info("Normalizing terminology (text columns)...")
    text_cols_to_normalize = (
        roles["term_columns"] + roles["description_columns"] + roles["category_columns"]
    )
    df = apply_text_normalization(df, text_cols_to_normalize)

    logger.info("Creating search_text...")
    df = build_search_text(
        df,
        term_cols=roles["term_columns"],
        desc_cols=roles["description_columns"],
        category_cols=roles["category_columns"],
    )

    logger.info("Running data quality checks...")
    important_cols = roles["term_columns"][:1] + roles["code_columns"][:1]
    findings = run_quality_checks(df, roles, important_cols)

    logger.info("Computing dataset statistics...")
    stats = compute_statistics(original_shape, df, dup_removed_total, empty_removed, roles)

    logger.info("Saving processed dataset...")
    save_outputs(df, stats, findings, output_dir)

    logger.info("Preprocessing completed successfully.")
    return df, stats


def save_outputs(df: pd.DataFrame, stats: dict, findings: list, output_dir: Path):
    """Write all output files, with clear error messages on failure."""
    try:
        csv_path = output_dir / "cleaned_ayurveda_dataset.csv"
        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        logger.info(f"Saved: {csv_path}")
    except PermissionError as e:
        raise PermissionError(f"Could not write CSV output (permission denied): {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to save CSV output: {e}")

    try:
        xlsx_path = output_dir / "cleaned_ayurveda_dataset.xlsx"
        df.to_excel(xlsx_path, index=False, engine="openpyxl")
        logger.info(f"Saved: {xlsx_path}")
    except ImportError:
        logger.warning(
            "openpyxl not installed - skipping .xlsx export. "
            "Install with: pip install openpyxl"
        )
    except Exception as e:
        logger.warning(f"Failed to save Excel output: {e}")

    try:
        stats_path = output_dir / "dataset_statistics.json"
        with open(stats_path, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False, default=str)
        logger.info(f"Saved: {stats_path}")
    except Exception as e:
        raise RuntimeError(f"Failed to save statistics JSON: {e}")

    try:
        report_path = output_dir / "data_quality_report.txt"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("DATA QUALITY REPORT\n")
            f.write("=" * 50 + "\n\n")
            for line in findings:
                f.write(line + "\n")
        logger.info(f"Saved: {report_path}")
    except Exception as e:
        raise RuntimeError(f"Failed to save data quality report: {e}")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Preprocess the National Ayurveda Morbidity Codes (NAMC) dataset."
    )
    parser.add_argument("--input", required=True, help="Path to the input Excel (.xls/.xlsx) file.")
    parser.add_argument("--output", default="processed_data", help="Output directory (default: processed_data).")
    parser.add_argument("--sheet", default=None, help="Sheet name or index to use (default: first sheet).")
    parser.add_argument("--header-row", type=int, default=None,
                         help="0-indexed row number containing column headers "
                              "(default: auto-detect).")
    return parser.parse_args()


def main():
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output)

    try:
        run_pipeline(input_path, output_dir, args.sheet, args.header_row)
    except (FileNotFoundError, ValueError, ImportError, RuntimeError, PermissionError) as e:
        print(f"\nERROR: {e}\n", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nUNEXPECTED ERROR: {e}\n", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
