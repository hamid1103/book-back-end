import mongoose from "mongoose";

export const readingListSchema = new mongoose.Schema({
    userID: Number,
    book: [{ type: mongoose.Types.ObjectId, ref: "Book" }],
});
export const readingList = mongoose.model("ReadingList", readingListSchema);