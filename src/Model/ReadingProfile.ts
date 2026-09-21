import mongoose from "mongoose";

export enum LanguageLevel {
    A2,
    B1,
    B2,
    C1,
}

export enum ReadingLength {
    Short,
    Medium,
    Long,
}

export enum ReadingMotivation {
    ForSchool,
    ForPleasure,
    LanguageDevelopment,
}

export const readingProfileSchema = new mongoose.Schema({
    userID: Number,
    languageLevel: String,
    genre: {type: [String], index: true},
    length: String,
    ReadingMotivation: String,
})

export const ReadingProfile = mongoose.model("ReadingProfile", readingProfileSchema)