import mongoose from "mongoose";

export const readingListSchema = new mongoose.Schema({
    userID: Number,
    book: [mongoose.Types.ObjectId]
});
export const readingList = mongoose.model("ReadingList", readingListSchema);