
import mongoose, { Schema } from "mongoose";

const community = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });



export const Community = mongoose.model("Community", community);