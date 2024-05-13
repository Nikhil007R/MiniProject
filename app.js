const express = require("express");
const app = express();
const userModel = require("./models/user")
const postModel = require("./models/post")
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, "public")))
app.use(cookieParser())



app.get("/", (req, res)=>{
    res.render("index");
})

app.get("/login",(req, res)=>{
    res.render("login");
})

app.get("/profile", isLoggedIn, async (req, res)=>{
    
    // user.populate("posts") fetches the posts related to the user and replaces the post IDs in the user document with the actual post objects.
    let user = await userModel.findOne({email: req.user.email}).populate("posts")
    // user.populate("posts")
    
    // console.log(user);
    res.render("profile", {user})
    // console.log(user);
})

app.get("/like/:id", isLoggedIn, async (req, res)=>{
    
    // post dhoond liya and jo post mai user ki jo id hai uski jgh data aa jaayega 

    let post = await postModel.findOne({_id: req.params.id}).populate("user")
    
    // console.log(req.user);

    // like ko bdaane se phle (Unlike feature)
    if(post.likes.indexOf(req.user.userId) === -1){   
        // agr post ke likes wale mai jo iski user id hai vo nhi hai (means user ne phli baat like kra hai ) 
        post.likes.push(req.user.userId)
        
    } 
    else{
        post.likes.splice(post.likes.indexOf(req.user.userId), 1);
    }
    
    await post.save()

    res.redirect("/profile")
    // console.log(user);
})

app.get("/edit/:id", isLoggedIn, async (req, res)=>{
    
    // post dhoond liya and jo post mai user ki jo id hai uski jgh data aa jaayega 
    let post = await postModel.findOne({_id: req.params.id}).populate("user")
    
    res.render("edit", {post})
})

app.post("/update/:id", isLoggedIn, async (req, res)=>{
    
    // post dhoond liya and jo post mai user ki jo id hai uski jgh data aa jaayega 
    // let post = await postModel.findOne({_id: req.params.id}).populate("user")

    let updatedUser = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content}, {new: true})
    
    res.redirect("/profile")
})

app.post("/post", isLoggedIn, async (req, res)=>{

    let user = await userModel.findOne({email: req.user.email})
    
    let {content} = req.body;

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

app.post("/register", async (req, res)=>{ 
    let {name, username, email, password, age} = req.body;  // Destructuring 

    // if email is already in my database
    let user = await userModel.findOne({email})

    if(user) return res.status(500).send("User Already Exists")
    
    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(password, salt, async (err, hash)=>{
            let createdUser = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            })

            let token = jwt.sign({email: email, userId: createdUser._id}, "secret")   // secret should be protected baad mai krenge ise achi trah
            // cookie set 
            res.cookie("Token", token);
            res.send("Registered Succesfully: ");
        })
    })
    
})

app.post("/login", async (req, res)=>{
    let {email, password} = req.body;

    let user = await userModel.findOne({email: email})    // findOne({email: req.body.email}) 

    if(!user) return res.status(404).send("Something went wrong");
    
    // compare(Form Password, database mai jo password save hai )
    bcrypt.compare(password, user.password, (err, result)=>{
        if(result){
            let token = jwt.sign({email: email, userId: user._id}, "secret")   // secret should be protected baad mai krenge ise achi trah
            // cookie set 
            res.cookie("Token", token);
            res.status(200).redirect("/profile")
        }
        else res.redirect("/login")
    })
})

app.get("/logout", (req, res)=>{
    res.cookie("Token", "");
    res.redirect("/login")
})

// creating a middleware 

// isko login wale route mai mt lgaana 
function isLoggedIn(req, res, next){
    // console.log(req.cookie);
    if(req.cookies.Token === "") res.redirect("/login")  // if there is no token then we just redirecting user to login page to login first

    else{
        let data = jwt.verify(req.cookies.Token, "secret")
        req.user = data;
    }
    next();
}

app.listen(3000)

