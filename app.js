//requiring all the required packages and frameworks 
if(process.env.NODE_ENV!=="production"){
require('dotenv').config()
}
const express = require("express");
const app = express();
const path = require("path");
const ejsMate = require('ejs-mate')
const mongoose = require("mongoose");
const Posts = require('./models/posts');
const CatchAysnc = require("./utils/CatchAysnc");
const ExpressError = require('./utils/ExpressError')
const isLoggedIn = require('./utils/isLoggedIn')
const methodOverride = require("method-override");
const Comment = require('./models/comments');
const Report = require('./models/report');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const passportLocal = require('passport-local');
const User = require('./models/user')
const isAuthor = require('./utils/isAuthor')
const isAuthorComment = require('./utils/isAuthorComment');
const notification = require('./models/notifications');
const MongoStore = require('connect-mongo');

let dbUrl = process.env.MONGO_LINK;

// 'mongodb://localhost:27017/after-school'
//connecting to local mongodb shell database
mongoose.connect(dbUrl, {
    useNewUrlParser: true, useUnifiedTopology: true
})   //if connection is succesfull print this to console
    .then(() => {
        console.log('Database up and running');
    }).catch((e) => {
        //if error occurs console log the error
        console.log(`Something is wrong!! ${e}`);
    })


//setting the viewening to ejs to enable javascript in html
app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
//setting the views folder directory
app.set("views", path.join(__dirname, "views"));
//setting the public folder directory for static assests like pictures , css and other js files
app.use(express.static(path.join(__dirname, 'public')));
//setting urlencoded middleware for incoming post and put requests
app.use(express.urlencoded({ extended: true }))
//setting method override middleware for delete and put requests from client side
app.use(methodOverride('_method'));


const store = new MongoStore({
    mongoUrl:dbUrl,
    secret: process.env.SESSION_SECRET,
    touchAfter: 24*60*60
})
store.on("error",function(e){
    console.log("Session error",e)
})
//setting up session config using express-session
const sessionConfig = {
    
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + (1000 * 60 * 60 * 24 * 7),
        maxAge: 1000 * 60 * 60 * 24 * 7
    }

}
//using session with the session config 
app.use(session(sessionConfig))
//setting up flash middleware for flashing messages across the website
app.use(flash());

//passport middleware
app.use(passport.initialize());
//setting up passport session
app.use(passport.session());
//setting up passport for local auth
passport.use(new passportLocal(User.authenticate()));
// used for loggin in and loggin out the user
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser());

// setting up some local variables which will be avaiable accross the website
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error')
    res.locals.loggedinUser = req.user;
    next();
})
//landing page get request
app.get("/", (req, res) => {
    if(req.user){
        res.redirect('/home')
    }else{
    res.render("landingpage/landingpagehome");
    }
})
//login page get request 
app.get("/login", (req, res) => {
    if(req.user){
        res.redirect('/home')
    }
    else{
    res.render("routes/login")
    }
})
//loggin in user using the passport.authenticate function which takes arguements about what type of auth  strategy we are following
// if there is a failer the the page will redirect to the login page and flash a text to the user stating what went wrong.
app.post('/user/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    // if the login is successful we call request.flash to sent a message to the client in the home screen which says "welcome bacj"
    req.flash("success", "Welcome back!")
    res.redirect("/home")
})
//get request for signup page
app.get("/signup", (req, res) => {
    if(req.user){
        res.redirect('/home')
    }
    else{
    res.render("routes/signup");
    }
})
//post request for registering user.
app.post("/user/register", CatchAysnc(async (req, res, next) => {
    try {
        //using try catch to handle any error
        //getting the form content from request.body and destructuring it into indiviual variable.
        let { email, name, username, password,repassword } = req.body;
        //checking if the user provided an inti email or not
        if (email.includes("@student.newinti.edu.my")) {
            if (!email.includes(username)) {
                req.flash('error', "Student ID in the email doesn't match with the Student ID provided!!")
                res.redirect('/signup')
            }
            if (username.length > 9 || username.length < 9) {
                req.flash("error", "Invalid Student ID")
                res.redirect("/signup")
            } else {
                //checking if the passowrd length is greater than 6 or not for a stronger passoword
                if (password.length < 6) {
                    // if less than 6 we will send a message using flash saying need a bigger password! 
                    req.flash("error", "Need a bigger password")
                    res.redirect("/signup")
                }
                if (username.includes('admin') || username.includes('you')) {
                    req.flash("error", `You can't have ${username} as your username`)
                    res.redirect("/signup")
                }
                if(password!==repassword){
                    req.flash("error","Password Didn't Match")
                    res.redirect('/signup')
                }else{
                // if every requirement is met then create the new user object and set isAdmin to false as user is a normal user
                let isAdmin = false;
                const newUser = new User({ name, email, isAdmin, username });
                //registering the user with the passport function .register and passing in the object user with the password
                const registeredUser = await User.register(newUser, password);
                //once the user is registered print the registered user data to the console.
                console.log(registeredUser)
                //aftetr siging up we log the user using the .login function from passport and pass a message to the home screen
                req.login(registeredUser, error => {
                    if (error) return next(error);
                    req.flash('success', "Welcome to AfterSchool!")
                    res.redirect('/home')
                })
            }
            
            }

        } else {
            // if user has an inavlid email sent a message and redirect to sigup page
            req.flash("error", "Need a valid INTI Email")
            res.redirect("/signup")
        }
    }
    //this is to catch any error that might occur during the registering part
    catch (e) {
        // this error code means the user already have anccount so we sent a flash message and tell the user he has an account

        // if there is any other error we flash the message to the user and also console log it
        req.flash("error", e.message)
        console.log(e)
        res.redirect("/signup")

    }

}))
// this is the home page get request which have parameter for a opttion page query and it also checks if the user is loggedin
//using the custom isLoggedIn function and also to catch any error in the async function use the custom CatchAysnc function
app.get("/home/:page?", isLoggedIn, CatchAysnc(async (req, res) => {

    //checking if we have any search query in request.query 
    const { search } = req.query;

    //checking if we have any  request. tag in the query
    const { tag } = req.query;
    //setting the number of post per page
    const perPage = 10;
    //setting the number of pages from the parameters or setting a default value of one if not avaiable in params
    const page = req.params.page || 1;
    //checking if search query is full and have a search request
    if (search) {
        //getting the searched posted using mongodb regex method and option i for making so that case senstive data is found along with that the pagniation parameters are also passed and 
        //the author has been populated with data so that it can be displayed at the frontend
        const posts = await Posts.find({ title: { $regex: `${search}`, $options: "i" } }).sort({ _id: -1 }).skip((perPage * page) - perPage).limit(perPage).populate('author');
        //finding the number of post avaiable with the current search query
        const count = await Posts.count({ title: { $regex: `${search}`, $options: "i" } })
        //getting the latest annoucement to show at front end
        const announcement = await Posts.find({ tag: "announcement" }).sort({ _id: -1 })
        //checking if there is avaiable posts to show
        if (posts == "") {
            // if now post is found a flash will be shown and the user will be redirected at the home page
            req.flash("error", "No Post Found")
            res.redirect('/home')
        }
        // if the posts are found we will check for posts without images so that we can put a no image found image in the
        //image path
        for (let i = 0; i <= posts.length - 1; i++) {
            if (posts[i].image == "") {
                posts[i].image = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/1024px-No_image_available.svg.png"

            }
            else if (posts[i].image == undefined) {
                posts[i].image = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/1024px-No_image_available.svg.png"
            }
            
        }
        //afterwards rendering the route and passing the required data to frontend 
        res.render("insideroutes/home", {
                posts, current: page, announcement,
                pages: Math.ceil(count / perPage),
                tag
            })
    }

    //checking if there was a tag in the frontend
    if (tag) {
        //getting post from database with the tag and also using pagination to get 10 posts per page
        const posts = await Posts.find({ tag: tag }).sort({ _id: -1 }).skip((perPage * page) - perPage).limit(perPage).populate('author');
        //getting the number of total posts avaiable
        const count = await Posts.count({ tag: tag })
        //getting all the announcment
        const announcement = await Posts.find({ tag: "announcement" }).sort({ _id: -1 })
        //checking if post is empty
        if (posts == "") {
            req.flash("error", `No Post Found  for the tag: ${tag}`)
            res.redirect('/home')
        }
        //checking if any posts have no images
        for (let i = 0; i <= posts.length - 1; i++) {
            if (posts[i].image == "") {
                posts[i].image = "https://thumbs.dreamstime.com/b/no-image-available-icon-flat-vector-no-image-available-icon-flat-vector-illustration-132482953.jpg"

            }
            else if (posts[i].image == undefined) {
                posts[i].image = "https://thumbs.dreamstime.com/b/no-image-available-icon-flat-vector-no-image-available-icon-flat-vector-illustration-132482953.jpg"
            }
            
        }
        //rendering the route
        res.render("insideroutes/home", {
                posts, current: page, announcement,
                pages: Math.ceil(count / perPage),
                tag
            })
    } //if no tag or search query was found then we render this
    else {
        //get set amount of post from the database and sort out by the latest page by giving _id -1
        const posts = await Posts.find({}).sort({ _id: -1 }).skip((perPage * page) - perPage).limit(perPage).populate('author');
        //getting the number of total posts avaiable for pagination
        const count = await Posts.count();
        //getting the announcement to show at from end
        const announcement = await Posts.find({ tag: "announcement" }).sort({ _id: -1 })

        //checking if any post is without image 
        //if not found set the image url to the provided one

        for (let i = 0; i <= posts.length - 1; i++) {
            if (posts[i].image == "") {
                posts[i].image = "https://thumbs.dreamstime.com/b/no-image-available-icon-flat-vector-no-image-available-icon-flat-vector-illustration-132482953.jpg"

            }
            else if (posts[i].image == undefined) {
                posts[i].image = "https://thumbs.dreamstime.com/b/no-image-available-icon-flat-vector-no-image-available-icon-flat-vector-illustration-132482953.jpg"
            }
        }

        //render route
        res.render("insideroutes/home", {
            posts, current: page, announcement,
            pages: Math.ceil(count / perPage), tag
        })

    }



}))
//create post route which will take user to a form for creating route
app.get("/createpost", isLoggedIn, (req, res) => {
    
    //rendering the route
    res.render("insideroutes/createpost")
})
// this route is to post the post
app.post("/posts", isLoggedIn, async (req, res) => {
    //getting the user id and finding it from the database
    let userID = req.user._id;
    let user = await User.findById(userID)
    //creating new post
    const post = new Posts(req.body.posts);
    //getting the time and date
    let date = new Date().toLocaleString(); 
    post.timeDate = date;
    post.author = user;
    //adding the post to users collections
    user.posts.push(post);
    //saving the posts to user and post data colecion
    await user.save()
    await post.save();
    //redirecting the user on succesfull upload
    req.flash('success', 'Posted Succesfully')
    res.redirect(`/posts/${post._id}`);

})
//thsi route is to view an specific post
app.get("/posts/:id", isLoggedIn, CatchAysnc(async (req, res) => {
    //getting the id of the post from the params
    const { id } = req.params;
        //finding the id and populating it's data
    const post = await Posts.findById(id).populate("reports").populate('author').populate({
        path: 'comments', populate: {
            path: 'author',
            model: 'Users'
        }
    });
    //retreving all the anncounments from the database
    const announcement = await Posts.find({ tag: "announcement" }).sort({ _id: -1 })

    if (!post) {
        req.flash("error", "Post is not avaiable")
        return res.redirect('/home')
    }


    //seperating all the data collections
    const { comments } = post;
    const { reports } = post;
    const { author } = post;
    //getting the users info and populating the comments
    const user = await User.findById(req.user._id).populate('posts').populate('comments')




    //checking if image is empty or not if yes then set a default image
    if (post.image == "") {
        post.image = "https://thumbs.dreamstime.com/b/no-image-available-icon-flat-vector-no-image-available-icon-flat-vector-illustration-132482953.jpg"

    }
    //show the singlepost page and pass all the data 
    res.render("insideroutes/singlepost", { post, comments, reports, announcement, author });
}))
//this route is to get the settings page
app.get('/settings', isLoggedIn, (req, res) => {

    res.render("insideroutes/settings")
})
// this route is used to view the profile of the user
app.get('/profile/:id', isLoggedIn,CatchAysnc( async(req, res) => {
    //getting the id from the params
    const {id} = req.params;
    //finding the user from the database
    let foundUser = await User.findById(id).populate('posts');
    //seperating the data
    let {posts} = foundUser
    //getting all the notifications
    let notifications = await notification.find({'user':foundUser})
    
    
    //showing the profile page

    res.render("insideroutes/profilepage",{posts,foundUser,notifications})
}))

//this route is to change the password of the user
app.post('/changepassword/:id',isLoggedIn,CatchAysnc(async(req,res)=>{
    //getting both of the password from req.body
        let {passwordOld,passwordNew}= req.body;
        //getting the id of the user
        let {id}=req.params;
        
        //finding the user
        const user = await User.findById(id)
        //changing the password
        await user.changePassword(passwordOld,passwordNew);
        //updating the user info and saving it
        const updatedUser = await user.save();
        //re logining in the user with the upadted data
        req.login(updatedUser, error => {
                    if (error) return next(error);
                    
                    req.flash('success', "Password Changed Successfully")
                    res.redirect(`/profile/${id}`)
                    
                })
            
       

    
    
    


}))
//this route is to show all the notifications
app.get('/notification',isLoggedIn,CatchAysnc(async(req,res)=>{
    //getting the id of the user
     const id = req.user._id;
     //finding the user from the database
    let foundUser = await User.findById(id);
    //finding the notifications of the user from the database
    let notifications = await notification.find({'user':foundUser})
    //showing the results 
    res.render('insideroutes/notifications',{notifications})

}))

//this route is to delete the notifications
app.delete('/notification/:id',isLoggedIn,CatchAysnc(async(req,res)=>{
    //getting the id of the notifications from the params
    let {id} = req.params;
    //deleting the notification from the database
    let notify = await notification.findByIdAndDelete(id);

    //redirecting back
    res.redirect('back')

}))
//this route is to edit a post
app.get('/editpost/:id', isLoggedIn, isAuthor, CatchAysnc(async (req, res) => {
    //getting the id of the post from the params
    const { id } = req.params;
    //finding the post from the db
    const post = await Posts.findById(id);
    if (!post) {
        req.flash("error", "Post is not avaiable")
        return res.redirect('/home')
    }
    //vewiing the posts
    res.render("insideroutes/editpost", { post })
}))

//this route is to update a post
app.put('/posts/:id', isLoggedIn, isAuthor, CatchAysnc(async (req, res) => {
    //getting the id of the post from the params
    const { id } = req.params;
    // getting the updated data from the post
    const post = req.body.posts;
    //finding the old post
    const oldBlog = await Posts.findById(id);
    //updating the post with new data
    const foundBlog = await Posts.findByIdAndUpdate(id, post);
    req.flash('success', 'Updated Succesfully')
    //redirecting to the post page
    res.redirect(`/posts/${foundBlog._id}`);

}))
//this route is to delete a post
app.delete('/post/:id', isLoggedIn, isAuthor, CatchAysnc(async (req, res) => {
    //getting the id of the post from the route
    const { id } = req.params;
    //getting the date 
    let d = new Date().toLocaleString();
    //deleting the route while populating its author data
    const post = await Posts.findByIdAndDelete(id).populate("author");
    //sepearing the author data
    let {author} = post 
    //finding the author
    let authorPost = await User.findById(author._id);
    //deleting the post from the users collection
    let removeIndex = authorPost.posts.map(item => item.id).indexOf(post._id);
    authorPost.posts.slice(removeIndex, 1)
    //checking if the person deleting the post was an admin or not
    if(req.user.isAdmin){
        //if admin then send a notification tht the post was deleted by admin
        let notify = new notification({message:"Admin Deleted Your Post For Not Following Our Community Guidelines",
        postId: post,
        time:d,
        user:authorPost})
        await notify.save();
    }
    //save the author
    await authorPost.save();
    //redirect
    req.flash('success', 'Deleted Succesfully')
    res.redirect('/home')
}))
//this is to delete the comments
app.delete('/comments/:postid/:id', isLoggedIn, isAuthorComment, CatchAysnc(async (req, res) => {
    try{
    const { postid, id } = req.params;
    let d = new Date().toLocaleString();
    const comment = await Comment.findByIdAndDelete(id).populate("author");
    let {author} = comment;
    const post = await Posts.findById(postid)
    await post.comments.remove(id)
    if(req.user.isAdmin){
        let notify = new notification({message:"Admin Deleted Your Comment For Not Following Our Community Guidelines",
        postId: post,
        time:d,
        user:author})
        await notify.save();
    }
    req.flash('success', 'Deleted Succesfully')
    res.redirect(`/posts/${postid}`)}
    catch(e){
        throw new ExpressError(e,400)
    }
}))

//post route for posting the comment
app.post('/posts/:id/comments', isLoggedIn, CatchAysnc(async (req, res) => {
    //getting post id from params
    const { id } = req.params;
    //gettting comment from req.body
    const comment = req.body.comment;
    //getting the post from database
    const postFound = await Posts.findById(id);
    //getting author of post 
    const author = await User.findById(postFound.author)

    //getting the current time
    let d = new Date().toLocaleString();
    
    
    //saving the newcomment to the database
    const newComment = new Comment(comment);
    //find the current user from request.user.id
    const userId = req.user._id;
    //finding the user from the database
    let user = await User.findById(userId);
    //checking if the current user equals to the post author request
    if (author._id.toString() === req.user._id.toString()) {

    
    } else {
        //checking if the user is admin 
        if (req.user.isAdmin) {
            //if the user is admin push the notification with postid and message
           let notify = new notification({message:"Admin Commented on Your Post",
        postId: postFound,
        time:d,
        user:author
        })
        await notify.save();
        } else {
            //if the user is a normal user then push the notication with the username and post id
            let notify = new notification({message:`${req.user.name} Commented on Your Post`,
        postId: postFound,
        time:d,
        user:author
        })
        await notify.save();
        }
    }

    //setting the newcomment author to the user found from request.user
    newComment.author = user;
    //setting the time
    newComment.time = d;
    //pushing the comments in the comments of user in database
    user.comments.push(newComment)
    //pushing the comments in the comments of the posts 
    postFound.comments.push(newComment);
    //pushing the postfound to post of newcomment
    newComment.post = postFound;

    //saving the data to database
    await author.save()
    await user.save();
    await postFound.save();
    await newComment.save();
    //showing the flash and redirecting to the post page
    req.flash('success', 'Comment Posted Succesfully')
    res.redirect(`/posts/${postFound._id}`);

}))
//post route for reporting a post
app.post('/posts/:id/report', isLoggedIn, CatchAysnc(async (req, res) => {
    //getting the post id from the params
    const { id } = req.params;
    //getting the current user id from request.user.id
    const userId = req.user._id
    //findning the user from database
    const user = await User.findById(userId)
    //finding the post from the database
    const foundPost = await Posts.findById(id);
    //creating an new report with the values from request.body.report
    const newReport = new Report(req.body.report);
    //setting the reporter to in newreport to the user id
    newReport.reporter = user;
    //in the foundpost pushing the newreport to the reports array
    foundPost.reports.push(newReport);
    //setting the post to foundpost id
    newReport.post = foundPost;


    //saving the newreport to database
    await newReport.save();
    //saving the reported post to database
    await foundPost.save();
    //redirecting to the original post
    res.redirect(`/posts/${id}`);

}))



// this route is for admin to view all the reports
app.get('/admin/report/:page?', isLoggedIn, CatchAysnc(async (req, res) => {
    //getting the current user from request.user 
    const user = req.user;
    //checking if the user is admin or not if not sending them to home page
    if (!user.isAdmin) {
        req.flash("error", "You are not an admin");
        res.redirect("/home")
    }
    //else setting the per page results and default page numbers or assigning the values from params
    const perPage = 20;
    const page = req.params.page || 1;
    //finding the posts which have an array of reports meaning posts with empty reports array will not be saved to posts
    const posts = await Posts.find({ reports: { $exists: true, $type: 'array', $ne: [] } }).skip((perPage * page) - perPage).limit(perPage).populate('reports').populate('author');
    //getting the total number of posts
    const count = await Posts.find({ reports: { $exists: true, $type: 'array', $ne: [] } });
    //renderning the page
    res.render("insideroutes/report", {
        posts, current: page,
        pages: Math.ceil(count / perPage)
    })
}))
//this route is form admin to view all the users signed up to the system
//this route also allows mutliple pages 
app.get('/admin/users/:page?', isLoggedIn, CatchAysnc(async (req, res) => {
    //we check if there is an email query for searching a specific user
    let { email } = req.query;
    // setting the results of user to 20 per page
    const perPage = 20;
    // setting the default page number to 1 or getting it from the params
    const page = req.params.page || 1;
    //checking if the user is admin or not if not then sending a flash message to user and redirecting to home
    if (!req.user.isAdmin) {
        req.flash("error", "You are not an admin");
        res.redirect("/home")
    }
    //checking if there if an email query 
    if (email) {
        // if there is an email query then we search for the email in the db and also apply the filters so that we get 
        //accurate results, some filters are : boolean isAdmin false , so that we find all normal users.
        const users = await User.find({ isAdmin: { $exists: true, $type: 'bool', $ne: true }, email: { $regex: `${email}` } }).skip((perPage * page) - perPage).limit(perPage);
        //no of total users found 
        const count = await User.find({ isAdmin: { $exists: true, $type: 'bool', $ne: true }, email: { $regex: `${email}` } });
        //rendering all the users and sending all the data to the client side.
        res.render("insideroutes/users", {
            users, current: page,
            pages: Math.ceil(count / perPage)
        })

    }
    //if no email is found we find all the users that are not admin  with the page filter
    const users = await User.find({ isAdmin: { $exists: true, $type: 'bool', $ne: true } }).skip((perPage * page) - perPage).limit(perPage);
    //find the number of users
    const count = await User.find({ isAdmin: { $exists: true, $type: 'bool', $ne: true } });

    //rendering the page and sending all the values
    res.render("insideroutes/users", {
        users, current: page,
        pages: Math.ceil(count / perPage)
    })
}))

//this route was designed to vuew the total admins but later abandoned due to reasons stated below in the next route
// app.get('/admin/viewadmins', isLoggedIn, CatchAysnc(async (req, res) => {
//     if (!req.user.isAdmin) {
//         req.flash('error', ' You are not an admin');
//         res.redirect('/home')
//     }
//     const admins = await User.find({ isAdmin: { $exists: true, $type: 'bool', $ne: false } });
//     for (admin of admins) {
//         console.log(admin.name)
//     }

//     res.render('insideroutes/adminusers', { admins })
// }))


//this method is to add new admin which was intially used but later I opted not to use this as 
//a single admin can be logged in from mutilple browser at the same time and using different accounts means that the
//posts will be assocaited with the specific admin which will cause a problem when we delete the user as we will have to
//delete the posts too 
// app.post('/admin/newadmin', isLoggedIn, CatchAysnc(async (req, res) => {
//     if (!req.user.isAdmin) {
//         req.flash('error', 'Your are not an Admin')
//         req.redirect('/home')
//     }
//     try {
//         //using try catch to handle any error
//         //getting the form content from request.body and destructuring it into indiviual variable.
//         let { email, name, username, password, isAdmin } = req.body;
//         //checking if the user provided an inti email or not
//         if (email.includes("@student.newinti.edu.my")) {
//             if (!email.includes(username)) {
//                 req.flash('error', "Student ID in the email doesn't match with the Student ID provided!!")
//                 res.redirect('/admin/viewadmins')
//             }
//             //checking if the passowrd length is greater than 6 or not for a stronger passoword
//             if (password.length < 6) {
//                 // if less than 6 we will send a message using flash saying need a bigger password! 
//                 req.flash("error", "Need a bigger password")
//                 res.redirect("/admin/viewadmins")
//             }
//             if (username.includes('you')) {
//                 req.flash("error", "Invalid Username")
//                 res.redirect("/admin/viewadmins")
//             }


//             const newUser = new User({ name, email, isAdmin, username });
//             //registering the user with the passport function .register and passing in the object user with the password
//             const registeredUser = await User.register(newUser, password);
//             //once the user is registered print the registered user data to the console.
//             console.log(registeredUser)
//             //aftetr siging up we log the user using the .login function from passport and pass a message to the home screen
//             req.flash('success', 'Created Admin Succesfully')
//             res.redirect('/admin/viewadmins')

//         } else {
//             // if user has an inavlid email sent a message and redirect to sigup page
//             req.flash("error", "Need a valid INTI Email")
//             res.redirect("/admin/viewadmins")
//         }
//     }
//     //this is to catch any error that might occur during the registering part
//     catch (e) {
//         // this error code means the user already have anccount so we sent a flash message and tell the user he has an account

//         // if there is any other error we flash the message to the user and also console log it
//         req.flash("error", e.message)
//         console.log(e)
//         res.redirect("/admin/viewadmins")

//     }



// }))




app.delete('/users/:id', isLoggedIn, CatchAysnc(async (req, res) => {
    //taking the id from the params
    const { id } = req.params;
    // finding the user and populating the user with the posts and comments
    let user = await User.findById(id).populate('posts').populate('comments')
    //checking if the user who trying to delete the account is the account owner or the admin
    //otherwise redirect the user to the home page and showing and error flash
    if (!user._id.equals(req.user._id) && !req.user.isAdmin) {
        req.flash('error', 'Access denied!')
        res.redirect('/home')
    }
    else{
        //checking if the user has any posts assosciated wit the account. 
        //if yes then we loop over the collection and delete each posts
        if (!user.posts.length == 0) {
            for (post of user.posts) {
                let foundPost = await Posts.findByIdAndDelete(post._id)
                
            }
        }
        //the user comments will be handled in the comments user model using a middleware which is why this part is commented out
        //but this is fully functional if you want to delete the comments this way
        // if (!user.comments.length == 0) {
        //     for (comment of user.comments) {
        //         let foundPost = await Comment.findByIdAndDelete(comment._id)
        //         console.log(foundPost)
        //     }
        // }
        //finally we delete the user and go back to the previous screen
        let deletedUser = await User.findByIdAndDelete(id)
        req.flash('success', 'User Deleted!')
        res.redirect('back')
}
}))
//logging out the user from the system. Using the built in passport fuction .logout() to logout the user then redirecting
//to the home page
app.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    res.redirect('/')
})
// 404 page helper, if not route matches the clients input then an error will be thrown to Expresserror middleware which will then
//pass the error to the error handling route 
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

//this will be error handling route which will host and show all the errors on the error page
app.use((err, req, res, next) => {
    //checking for an serror status in err if not found set a default of 500
    const { status = 500 } = err;
    //check if error has any message or not if not assign a default message
    if (!err.message) err.message = 'Oh Shit, something went wrong'
    //setting respond status to the status value
    res.status(status);
    
    //rendering the page and passing status with the err
    res.render("insideroutes/errorpage", { status, err })

})
// starting up the server to port 3000 to run the app
const port = process.env.PORT || 4005
app.listen(port, () => {
    console.log("Server Running!! on ",port)
})
