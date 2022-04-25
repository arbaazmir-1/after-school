const mongoose = require("mongoose");
const Posts = require('./posts');
const Schema = mongoose.Schema;

const reportSchema = Schema({
    reason: {
        type: String,
        required: [true, 'Comment is needed']
    },
    tags: {
        type: Array
    },

    post: {
        type: Schema.Types.ObjectId,
        ref: "Posts",
        required: [true, 'Post is Required']
    },
    reporter: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, "Need a reporter"]
    }

})
const Report = mongoose.model('Report', reportSchema);
module.exports = Report;