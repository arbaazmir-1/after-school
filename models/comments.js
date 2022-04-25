const mongoose = require("mongoose");
const Posts = require('./posts');
const Schema = mongoose.Schema;

const commentSchema = Schema({
    comment: {
        type: String,
        required: [true, 'Comment is needed']
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: "Posts"
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    time:{
        type: String
    }
})
const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;