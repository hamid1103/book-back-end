import {MaterialType} from "../Model/Book";

//Proof of Concept matching. The catalogue data is thin (no genres, few tags, no length),
//so the score uses whatever signals exist and the motivation text is partly simulated.
//Everything here is pure so it can be unit tested without a database.

export interface AdviceBook {
    _id: unknown;
    title?: string | null;
    readingLevel?: string[] | null;
    tags?: string[] | null;
    materialType?: string | null;
}

export interface AdviceProfile {
    languageLevel: string;
    genre: string[];
    length: string;
    ReadingMotivation: string;
}

export type Advice<T extends AdviceBook> = T & {motivation: string};

//The profile uses CEFR levels, the catalogue uses the Dutch referentiekader (2F ≈ B1, 3F ≈ B2, 3F+ ≈ C1)
const LEVEL_MAP: Record<string, string[]> = {
    A2: ["2F"],
    B1: ["2F", "3F"],
    B2: ["3F", "3F+"],
    C1: ["3F+"],
};

//There is no length in the data, so the material type stands in for it
const LENGTH_MAP: Record<string, string[]> = {
    Short: [MaterialType.OnlineArticle, MaterialType.NewspaperArticle, MaterialType.BlogPost],
    Medium: [MaterialType.Magazine, MaterialType.PoetryBundle],
    Long: [MaterialType.Book],
};

const LENGTH_TEXT: Record<string, string> = {
    Short: "Het is kort, dus je hebt het zo uit.",
    Medium: "Niet te lang en niet te kort, precies zoals je wilde.",
    Long: "Een echt boek om lekker lang in te duiken.",
};

const MOTIVATION_TEXT: Record<string, string> = {
    ForSchool: "Goed te gebruiken voor je leesdossier op school.",
    ForPleasure: "Een fijne keuze om gewoon voor de lol te lezen.",
    LanguageDevelopment: "Helpt je om je Nederlands verder te ontwikkelen.",
};

//Used when nothing in the profile matches, so every suggestion still has a reason
const FALLBACK_TEXT = [
    "Iets buiten je gebruikelijke voorkeuren, goed om je horizon te verbreden.",
    "Andere studenten met een vergelijkbaar profiel lazen dit graag.",
    "Een verrassende keuze die vaak goed valt bij nieuwe lezers.",
];

const ANONYMOUS_TEXT = [
    "Populair bij andere studenten.",
    "Een goede eerste keuze als je nog niet weet wat je wilt lezen.",
    "Vaak gekozen door studenten die net beginnen met vrij lezen.",
];

const SCORE = {tag: 3, level: 2, length: 1};

export function scoreBook(book: AdviceBook, profile: AdviceProfile): {score: number, reasons: string[]} {
    const reasons: string[] = [];
    let score = 0;

    const wantedTags = new Set(profile.genre.map(tag => tag.toLowerCase()));
    const matchedTags = (book.tags ?? []).filter(tag => wantedTags.has(tag.toLowerCase()));
    if (matchedTags.length > 0) {
        score += SCORE.tag * matchedTags.length;
        reasons.push(`Het gaat over ${joinDutch(matchedTags)}, en dat vind jij interessant.`);
    }

    const levels = LEVEL_MAP[profile.languageLevel] ?? [];
    if ((book.readingLevel ?? []).some(level => levels.includes(level))) {
        score += SCORE.level;
        reasons.push(`Het past bij jouw leesniveau (${profile.languageLevel}).`);
    }

    const types = LENGTH_MAP[profile.length] ?? [];
    if (book.materialType && types.includes(book.materialType)) {
        score += SCORE.length;
        reasons.push(LENGTH_TEXT[profile.length]);
    }

    return {score, reasons};
}

export function buildMotivation(reasons: string[], profile: AdviceProfile, random: () => number = Math.random): string {
    //At most two concrete reasons keeps the text short enough for a card
    const parts = reasons.slice(0, 2);
    if (parts.length === 0) parts.push(pick(FALLBACK_TEXT, random));
    const motivation = MOTIVATION_TEXT[profile.ReadingMotivation];
    if (motivation) parts.push(motivation);
    return parts.join(" ");
}

export function pickAdvice<T extends AdviceBook>(
    books: T[],
    profile: AdviceProfile,
    amount: number,
    random: () => number = Math.random,
): Advice<T>[] {
    return books
        .map(book => {
            const {score, reasons} = scoreBook(book, profile);
            //The jitter shuffles books with the same score, so the advice changes a bit per visit
            return {book, reasons, rank: score + random()};
        })
        .sort((a, b) => b.rank - a.rank)
        .slice(0, Math.max(0, amount))
        .map(({book, reasons}) => ({...book, motivation: buildMotivation(reasons, profile, random)}));
}

//Users without a profile get random books with a generic (simulated) motivation
export function anonymousAdvice<T extends AdviceBook>(books: T[], random: () => number = Math.random): Advice<T>[] {
    return books.map(book => ({...book, motivation: pick(ANONYMOUS_TEXT, random)}));
}

function pick<T>(items: T[], random: () => number): T {
    return items[Math.floor(random() * items.length)];
}

//["a", "b", "c"] -> "a, b en c"
function joinDutch(items: string[]): string {
    if (items.length <= 1) return items.join("");
    return `${items.slice(0, -1).join(", ")} en ${items[items.length - 1]}`;
}
