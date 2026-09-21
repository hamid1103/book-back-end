import path from "node:path";
import {loadEnvFile} from "node:process";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import {Book, MaterialType} from "../Model/Book";

loadEnvFile();

const MONGOSTRING = process.env.MONGOSTRING;
if (!MONGOSTRING) throw new Error("MongoDB connection string required in .env");

const FILE_PATH = path.resolve(__dirname, "..", "..", "VrijLezenOpMaat Leescatalogus 1.0.xlsx");
const SHEET_NAME = "Leesmateriaal";

// Maps the spreadsheet's Dutch "Type materiaal" values onto MaterialType.
const TYPE_MAP: Record<string, MaterialType> = {
    "Boek": MaterialType.Book,
    "Tijdschrift": MaterialType.Magazine,
    "Krant": MaterialType.NewspaperArticle,
    "online artikel": MaterialType.OnlineArticle,
    "dichtbundel": MaterialType.PoetryBundle,
    "blogpost": MaterialType.BlogPost,
};

// Only these types use the "Themas_boek" column for theme tags; every other
// type uses it as a source URL instead.
const THEME_TYPES = new Set<MaterialType>([MaterialType.Book, MaterialType.PoetryBundle]);

interface Row {
    Titel?: string;
    Auteur?: string;
    "Korte omschrijving"?: string;
    "Type materiaal"?: string;
    Niveau?: string;
    Themas_boek?: string;
}

function clean(value: unknown): string | undefined {
    const trimmed = value?.toString().trim();
    return trimmed ? trimmed : undefined;
}

function parseReadingLevel(niveau: string | undefined): string[] {
    if (!niveau) return [];
    return niveau.split("-").map(level => level.trim()).filter(Boolean);
}

function parseTags(themas: string | undefined): string[] {
    if (!themas) return [];
    return themas
        .split(";")
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean);
}

function mapRow(row: Row) {
    const title = clean(row.Titel);
    if (!title) return null;

    const rawType = clean(row["Type materiaal"]);
    const materialType = rawType ? TYPE_MAP[rawType] : undefined;
    if (rawType && !materialType) {
        throw new Error(`Unknown "Type materiaal" value: ${rawType}`);
    }

    const themasColumn = clean(row.Themas_boek);
    const isThemeType = materialType !== undefined && THEME_TYPES.has(materialType);

    return {
        title,
        author: clean(row.Auteur),
        description: clean(row["Korte omschrijving"]),
        readingLevel: parseReadingLevel(clean(row.Niveau)),
        materialType,
        tags: isThemeType ? parseTags(themasColumn) : [],
        sourceUrl: isThemeType ? undefined : themasColumn,
    };
}

async function main() {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in ${FILE_PATH}`);

    const rows = XLSX.utils.sheet_to_json<Row>(sheet, {defval: undefined});
    const books = rows.map(mapRow).filter((book): book is NonNullable<typeof book> => book !== null);

    await mongoose.connect(MONGOSTRING!);

    // Re-runs must not duplicate entries: there's no unique natural key in
    // the spreadsheet (titles repeat), so wipe and reload every time.
    await Book.deleteMany({});
    await Book.insertMany(books);

    console.log(`Imported ${books.length} reading materials into Book.`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error("Failed to import reading materials:", err);
    process.exit(1);
});
