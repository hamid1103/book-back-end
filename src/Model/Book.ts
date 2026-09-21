import mongoose, {Schema} from "mongoose";

export enum MaterialType {
    Book= "Book",
    NewspaperArticle= "NewspaperArticle",
    Magazine= "Magazine",
    OnlineArticle= "OnlineArticle",
    PoetryBundle= "PoetryBundle",
    BlogPost= "BlogPost",
}

export enum ReadingLevel {
    "2F",
    "3F",
    "3F+"
}

export const bookSchema = new Schema({
    title: String,
    author: String,
    genre: [String],
    description: String,
    imageUrl: String,
    readingLevel: [String],
    tags: {type: [String], index: true},
    materialType: {type: String, enum: Object.values(MaterialType)},
    sourceUrl: String,
})

export const Book = mongoose.model("Book", bookSchema);
