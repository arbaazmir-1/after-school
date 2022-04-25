//this is to check if the user is signed or not
const isUserLogged = (req, res, next) => {

    if (!req.isAuthenticated()) {
        req.flash('error', 'Please login in first!');
        return res.redirect('/login');
    }
    next();
}
module.exports = isUserLogged;