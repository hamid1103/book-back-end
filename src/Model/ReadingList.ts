import mongoose from "mongoose";

export enum ReadingStatus {
    NotRead = "NotRead",
    Reading = "Reading",
    Read = "Read",
}

export const readingListSchema = new mongoose.Schema({
    userID: Number,
    book: [{ type: mongoose.Types.ObjectId, ref: "Book" }],
    //Keyed by book id. Books in the list without an entry are NotRead, so older lists stay valid
    status: {type: Map, of: {type: String, enum: Object.values(ReadingStatus)}, default: {}},
});
export const readingList = mongoose.model("ReadingList", readingListSchema);
