const mongoose = require("mongoose");
const Posts = require('./posts');
const Users = require('./user')
const Schema = mongoose.Schema;

const notificationSchema = Schema({
    message: {
        type: String,
        required: [true, 'message is needed']
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: "Posts"
    },
    
    time:{
        type: String
    },
    user:{
        type: Schema.Types.ObjectId,
        ref: "Users"
    }
})
const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;