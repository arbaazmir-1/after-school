const mongoose = require("mongoose");
const Comment = require('./comments')
const Report = require("./report");
const User = require("./user");
const Schema = mongoose.Schema;


const PostSchema = new Schema({
    title: {
        type: String,
        required: [true, "Title is Required"]
    },
    image: {
        type: String,

    },
    content: {
        type: String,
        required: [true, "Post cannot be empty!"]
    },
    tag: {
        type: Array,
        required: [true, "A Tag is required"]
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        }
    ],
    reports: [
        {
            type: Schema.Types.ObjectId,
            ref: "Report"
        }
    ],
    author: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    timeDate: {
        type: String,
        require: [true,"Time for the post is required"]
    }
})
PostSchema.post('findOneAndDelete', async function (post) {
    if (post.comments.length || post.reports.length) {
        const coms = await Comment.deleteMany({ _id: { $in: post.comments } });
        const rep = await Report.deleteMany({ _id: { $in: post.reports } });


    }
})

module.exports = mongoose.model('Posts', PostSchema);