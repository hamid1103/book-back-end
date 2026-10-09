import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {MaterialType} from "../Model/Book";
import {AdviceBook, AdviceProfile, anonymousAdvice, buildMotivation, pickAdvice, scoreBook} from "./AdviceService";

const profile: AdviceProfile = {
    languageLevel: "B1",
    genre: ["sport", "liefde"],
    length: "Long",
    ReadingMotivation: "ForPleasure",
};

function book(overrides: Partial<AdviceBook> = {}): AdviceBook {
    return {_id: "1", title: "Boek", readingLevel: [], tags: [], materialType: null, ...overrides};
}

//Returns the given values in order, so tests don't depend on Math.random
function sequence(...values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length];
}

describe("scoreBook", () => {
    it("gives the full score when tag, level and length all match", () => {
        const result = scoreBook(book({tags: ["sport"], readingLevel: ["2F"], materialType: MaterialType.Book}), profile);

        assert.equal(result.score, 3 + 2 + 1);
        assert.equal(result.reasons.length, 3);
    });

    it("scores every matching tag and ignores casing", () => {
        const result = scoreBook(book({tags: ["Sport", "LIEFDE", "oorlog"]}), profile);

        assert.equal(result.score, 6);
        assert.deepEqual(result.reasons, ["Het gaat over Sport en LIEFDE, en dat vind jij interessant."]);
    });

    it("joins three or more tags the Dutch way", () => {
        const result = scoreBook(book({tags: ["a", "b", "c"]}), {...profile, genre: ["a", "b", "c"]});

        assert.equal(result.reasons[0], "Het gaat over a, b en c, en dat vind jij interessant.");
    });

    it("maps the CEFR level of the profile to the catalogue level", () => {
        assert.equal(scoreBook(book({readingLevel: ["3F+"]}), {...profile, languageLevel: "C1"}).score, 2);
        assert.equal(scoreBook(book({readingLevel: ["3F+"]}), {...profile, languageLevel: "A2"}).score, 0);
    });

    it("uses the material type as stand-in for the length", () => {
        const short = {...profile, length: "Short"};

        assert.equal(scoreBook(book({materialType: MaterialType.BlogPost}), short).score, 1);
        assert.equal(scoreBook(book({materialType: MaterialType.Book}), short).score, 0);
    });

    //Edge cases
    it("returns score 0 and no reasons when nothing matches", () => {
        const result = scoreBook(book({tags: ["oorlog"], readingLevel: ["3F+"], materialType: MaterialType.Magazine}), profile);

        assert.deepEqual(result, {score: 0, reasons: []});
    });

    it("handles a book with missing (null/undefined) fields without crashing", () => {
        const result = scoreBook({_id: "x", tags: null, readingLevel: null, materialType: null}, profile);

        assert.deepEqual(result, {score: 0, reasons: []});
        assert.deepEqual(scoreBook({_id: "y"}, profile), {score: 0, reasons: []});
    });

    it("ignores unknown language levels and lengths in the profile", () => {
        const invalid = {...profile, languageLevel: "Z9", length: "Huge", genre: []};
        const result = scoreBook(book({readingLevel: ["2F"], materialType: MaterialType.Book}), invalid);

        assert.deepEqual(result, {score: 0, reasons: []});
    });
});

describe("buildMotivation", () => {
    it("uses at most two reasons and adds the reading motivation", () => {
        const text = buildMotivation(["Een.", "Twee.", "Drie."], profile);

        assert.equal(text, "Een. Twee. Een fijne keuze om gewoon voor de lol te lezen.");
    });

    it("falls back to a generic text when there are no reasons", () => {
        const text = buildMotivation([], profile, () => 0);

        assert.equal(text, "Iets buiten je gebruikelijke voorkeuren, goed om je horizon te verbreden. " +
            "Een fijne keuze om gewoon voor de lol te lezen.");
    });

    it("leaves out the motivation sentence for an unknown reading motivation", () => {
        assert.equal(buildMotivation(["Een."], {...profile, ReadingMotivation: "Onbekend"}), "Een.");
    });
});

describe("pickAdvice", () => {
    const perfect = book({_id: "perfect", tags: ["sport"], readingLevel: ["2F"], materialType: MaterialType.Book});
    const levelOnly = book({_id: "level", readingLevel: ["3F"]});
    const nothing = book({_id: "nothing", tags: ["oorlog"]});

    it("orders books from best to worst match", () => {
        const result = pickAdvice([nothing, levelOnly, perfect], profile, 3, () => 0);

        assert.deepEqual(result.map(b => b._id), ["perfect", "level", "nothing"]);
    });

    it("returns only the requested amount", () => {
        const result = pickAdvice([nothing, levelOnly, perfect], profile, 1, () => 0);

        assert.deepEqual(result.map(b => b._id), ["perfect"]);
    });

    it("adds a motivation and keeps the original book fields", () => {
        const [result] = pickAdvice([perfect], profile, 1, () => 0);

        assert.equal(result.title, "Boek");
        assert.equal(typeof result.motivation, "string");
        assert.ok(result.motivation.length > 0);
        assert.equal("motivation" in perfect, false, "input book must not be mutated");
    });

    it("lets the random jitter only reorder books with the same score", () => {
        const a = book({_id: "a", readingLevel: ["2F"]});
        const b = book({_id: "b", readingLevel: ["2F"]});

        //Highest jitter (0.99) for the lower scored book still can't beat a full point difference
        const ranked = pickAdvice([nothing, perfect], profile, 2, sequence(0.99, 0));
        assert.deepEqual(ranked.map(x => x._id), ["perfect", "nothing"]);

        //With equal scores the jitter decides
        assert.deepEqual(pickAdvice([a, b], profile, 2, sequence(0.1, 0.9)).map(x => x._id), ["b", "a"]);
        assert.deepEqual(pickAdvice([a, b], profile, 2, sequence(0.9, 0.1)).map(x => x._id), ["a", "b"]);
    });

    //Edge cases
    it("returns an empty list when there are no books", () => {
        assert.deepEqual(pickAdvice([], profile, 5), []);
    });

    it("returns an empty list for amount 0 or a negative amount", () => {
        assert.deepEqual(pickAdvice([perfect], profile, 0), []);
        assert.deepEqual(pickAdvice([perfect], profile, -3), []);
    });

    it("returns all books when the amount is larger than the catalogue", () => {
        assert.equal(pickAdvice([perfect, nothing], profile, 20).length, 2);
    });
});

describe("anonymousAdvice", () => {
    it("gives every book a generic motivation", () => {
        const result = anonymousAdvice([book({_id: "a"}), book({_id: "b"})], () => 0);

        assert.equal(result.length, 2);
        for (const advice of result) {
            assert.equal(advice.motivation, "Populair bij andere studenten.");
        }
    });

    it("returns an empty list when there are no books", () => {
        assert.deepEqual(anonymousAdvice([]), []);
    });
});
