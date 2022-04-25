const Posts = require('../models/posts')
const CatchAysnc = require('./CatchAysnc')
//this is to check if the author is the current user
//this will be used to check if the requesting user is the owner of certain post or comments
const isAuthor =CatchAysnc( async (req, res, next) => {
    const { id } = req.params;
    const post = await Posts.findById(id);
    if (!post.author._id.equals(req.user._id) &&  !req.user.isAdmin) {
        req.flash('error', 'Access Denied');
        return res.redirect(`/posts/${id}`);
    }
    next();
})
module.exports = isAuthor;