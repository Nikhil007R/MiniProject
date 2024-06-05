const express = require("express");
const app = express();
const userModel = require("./models/user")
const postModel = require("./models/post")
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const upload = require("./config/multerConfig");
const multer = require("multer");

// import upload from "./config/multerConfig";

// const multer = require("multer")
// const crypto = require("crypto")

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")))
app.use(cookieParser())

// *************** diskStorage from muter video 20 ***************
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './public/images/uploads')
//     },
//     filename: function (req, file, cb) {
//         crypto.randomBytes(12, (err, buff) => {

//             const fn = buff.toString("hex") + path.extname(file.originalname)
//             cb(null, fn)
//         })
//     }
// })

// const upload = multerConfig;


app.get("/", (req, res) => {
    res.render("index");
})

// *************** multer routes from video 20 ***************

app.get("/profile/uploadFile", (req, res) => {
    res.render("uploadFile")
})

app.post("/uploadFile", isLoggedIn ,upload.single("image"), async (req, res) => {
    // to see the details of the uploaded file 
    // console.log(req.file);

    let user = await userModel.findOne({email: req.user.email})
    user.profilePic = req.file.filename;

    // because humne apne haatho se save kiya mongodb mai 
    await user.save(); 

    res.redirect("/profile")
})

app.get("/login",  (req, res) => {
    res.render("login");
})

app.get("/profile", isLoggedIn, async (req, res) => {

    // user.populate("posts") fetches the posts related to the user and replaces the post IDs in the user document with the actual post objects.
    let user = await userModel.findOne({ email: req.user.email }).populate("posts")
    // user.populate("posts")

    // console.log(user);
    res.render("profile", { user })
    // console.log(user);
})

app.get("/like/:id", isLoggedIn, async (req, res) => {

    // post dhoond liya and jo post mai user ki jo id hai uski jgh data aa jaayega 

    let post = await postModel.findOne({ _id: req.params.id }).populate("user")

    // console.log(req.user);

    // like ko bdaane se phle (Unlike feature)
    if (post.likes.indexOf(req.user.userId) === -1) {
        // agr post ke likes wale mai jo iski user id hai vo nhi hai (means user ne phli baat like kra hai ) 
        post.likes.push(req.user.userId)

    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userId), 1);
    }

    await post.save()

    res.redirect("/profile")
    // console.log(user);
})

app.get("/edit/:id", isLoggedIn, async (req, res) => {

    // post dhoond liya and jo post mai user ki jo id hai uski jgh data aa jaayega 
    let post = await postModel.findOne({ _id: req.params.id }).populate("user")

    res.render("edit", { post })
})

app.post("/update/:id", isLoggedIn, async (req, res) => {

    // post dhoond liya and jo post mai user ki jo id hai uski jgh data aa jaayega 
    // let post = await postModel.findOne({_id: req.params.id}).populate("user")

    let updatedUser = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content }, { new: true })

    res.redirect("/profile")
})

app.post("/post", isLoggedIn, async (req, res) => {

    let user = await userModel.findOne({ email: req.user.email })

    let { content } = req.body;

    let post = await postModel.create({
        user: user._id,
        content: content,

    })

    // user ko apne post mai add krna hai ki konsi post id hai 
    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile")
    // console.log(user);
})

app.post("/register", async (req, res) => {
    let { name, username, email, password, age } = req.body;  // Destructuring 

    // if email is already in my database
    let user = await userModel.findOne({ email })

    if (user) return res.status(500).send("User Already Exists")

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let createdUser = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            })

            let token = jwt.sign({ email: email, userId: createdUser._id }, "secret")   // secret should be protected baad mai krenge ise achi trah
            // cookie set 
            res.cookie("Token", token);
            res.send("Registered Succesfully: ");
        })
    })

})

app.post("/login", async (req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email: email })    // findOne({email: req.body.email}) 

    if (!user) return res.status(404).send("Something went wrong");

    // compare(Form Password, database mai jo password save hai )
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: email, userId: user._id }, "secret")   // secret should be protected baad mai krenge ise achi trah
            // cookie set 
            res.cookie("Token", token);
            res.status(200).redirect("/profile")
        }
        else res.redirect("/login")
    })
})

app.get("/logout", (req, res) => {
    res.cookie("Token", "");
    res.redirect("/login")
})

// creating a middleware 

// isko login wale route mai mt lgaana 
function isLoggedIn(req, res, next) {
    // console.log(req.cookie);
    if (req.cookies.Token === ""){
        res.redirect("/login")
    }   // if there is no token then we just redirecting user to login page to login first

    else {
        let data = jwt.verify(req.cookies.Token, "secret")
        req.user = data;
        next();
    }
}

// function isLoggedIn(req, res, next) {
//     // Check if the Token cookie exists and is not empty
//     if (!req.cookies || !req.cookies.Token) {
//       // If no token, redirect to login page
//       return res.redirect('/login');
//     }
  
//     try {
//       // Verify the token
//       let data = jwt.verify(req.cookies.Token, 'secret');
//       // Set req.user with the decoded data
//       req.user = data;
//       // Continue to the next middleware/route handler
//       next();
//     } catch (error) {
//       console.error('Token verification failed:', error);
//       // If token verification fails, redirect to login page
//       res.redirect('/login');
//     }
// }

app.listen(3000, (req, res) => {
    console.log("Listening at port 3000")
})

