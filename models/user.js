const mongoose = require('mongoose');
const { Schema } = mongoose;
const passportLocalMongoose = require('passport-local-mongoose');
const Comment = require('./comments')
const Posts = require('./posts');

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, "Name is Required"]
    },
    email: {
        type: String,
        required: [true, "Need a email"],
        unique: true
    },
    posts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Posts'
        }
    ],
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    isAdmin: {
        type: Boolean,
        required: [true, "Need a boolean"]
    }

})
userSchema.plugin(passportLocalMongoose);
userSchema.post('findOneAndDelete', async function (user) {
    if (user.comments.length) {
        const coms = await Comment.deleteMany({ _id: { $in: user.comments } });



    }
})

module.exports = mongoose.model('Users', userSchema);