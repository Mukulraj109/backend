import express, { response } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary';
import {nanoid} from 'nanoid'
import jwt from 'jsonwebtoken';
import cors from 'cors'
import admin from "firebase-admin"
import {getAuth} from "firebase-admin/auth"
import serviceAccountKey from "./muiu-c84e4-firebase-adminsdk-ui04g-9009be1120.json" assert {type:"json"}
//schema below
import User from './Schema/User.js';
import Blog from './Schema/Blog.js';
import Notification from './Schema/Notification.js';
import Comment from './Schema/Comment.js';

const app = express();
let PORT = 3000;
admin.initializeApp({
    credential : admin.credential.cert(serviceAccountKey)
})
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

app.use(express.json());
app.use(cors())

mongoose.connect(process.env.DB_LOCATION,{
    autoIndex: true
})

//setting up s3 bucket

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    });


const verifyJWT = (req,res,next) =>{
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if(token==null){
        return res.status(401).json({message: "Access denied, no token provided"})
    }

    jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err,user)=>{
        if(err){
            return res.status(403).json({message: "Access denied, invalid token"})
        }
        req.user = user.id;
        next();
    })
}

const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);

    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    };
};


const generateUsername = async (email)=>{
    let username = email.split('@')[0];
    let isUsernameNotUnique = await User.exists({"personal_info.username" : username}).then((result)=>result)
    
    isUsernameNotUnique ? username += nanoid().substring(0,5) : "";

    return username;
}

app.get('/generate-upload-url', (req, res) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET; // Ensure you have this preset configured in Cloudinary

    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload?upload_preset=${uploadPreset}&timestamp=${timestamp}`;

    res.status(200).json({ uploadUrl });
    });

app.post('/upload-image', async (req, res) => {
    try {
    if (!req.files || !req.files.image) {
        return res.status(400).json({ error: 'No image file provided' });
        }

    const imageFile = req.files.image;

      // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(imageFile.tempFilePath, {
        folder: 'user_images', // Optional: Specify a folder in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png'], // Optional: Restrict file formats
    });

    res.status(200).json({ url: uploadResponse.secure_url });
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
    });

app.post("/signup",(req, res) => {

    let {fullname, email, password} = req.body;

    if(fullname.length < 3)
        return res.status(403).json({ "error" : 'Fullname must be at least 3 characters long'})
    
    if(!email.length)
        return res.status(403).json({ "error" : 'Email is required'})
    
    if(!emailRegex.test(email)){
        return res.status(403).json({ "error" : 'Invalid email format'})
    }
    if(!passwordRegex.test(password)){
        return res.status(403).json({ "error" : 'Password must be at least 6 characters long, contain at least one uppercase letter, one lowercase letter, and one number'})
    }

    bcrypt.hash(password, 10 , async (err, hashed_password)=>{
        let username = await generateUsername(email);

        let user = new User({
            personal_info:{fullname , email , password : hashed_password, username}
        })

        user.save().then((u)=>{
            return res.status(200).json(formatDatatoSend(u))
        }).catch((err)=>{
            if(err.code == 11000){
                return res.status(500).json({ "error" : 'Email already exists'})
            }
            return res.status(500).json({ "error" : err.message })
        })
    })
})


app.post("/signin",(req,res)=>{
    let {email, password} = req.body;

    User.findOne({ "personal_info.email" : email})
    .then((user)=>{
        if(!user){
            return res.status(403).json({ "error" : "Email not found" })
        }

        if(!user.google_auth){
            bcrypt.compare(password, user.personal_info.password,(err, result)=>{

                if(err){
                    return res.status(403).json({ "error" : "Erroe while login please try again"})
                }
    
                if(!result){
                return res.status(403).json({ "error" : "Invalid password" })
                }
                else{
                    return res.status(200).json(formatDatatoSend(user))
                }
            })
        }else{
            return res.status(403).json({ "error" : "Account was created using google. try log in with google."});
        }
    })

    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({ "error" : err.message });
    })
})

app.post("/google-auth", async (req, res) =>{
    let {access_token} = req.body;
    getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
        let {email , name, picture} = decodedUser;

        picture = picture.replace("s96-c","s384-c");

        let user = await User.findOne({ "personal_info.email" : email}).select("personal_info.full_name personal_info.username personal_info.profile_img google_auth")
        .then((u) =>{
            return u || null;
        }).catch(err =>{
            return res.status(500).json({"error": err.message});
        })
        
        if(user){ //login in
            if(!user.google_auth){
                return res.status(403).json({"error": "This email was signed up without google , please log in with password to access the account."});
            }
        }
        else{ 
            let username = await generateUsername(email);

            user = new User({
                personal_info:{fullname : name, email, username}, google_auth : true
            })
            await user.save().then((u)=>{
                user = u;
            }).catch(err=>{
                return res.status(500).json({"error": err.message});
            })
        }
        return res.status(200).json(formatDatatoSend(user));
    }).catch(err=>{
        return res.status(500).json({"error": "failed to authenticate you with google. try again with othe google account"});
})

})

app.post('/create-blog', verifyJWT , (req, res) =>{
        let authorId = req.user;

        let {title, des, banner, draft ,content,tags, id} = req.body;
        if(!title.length){
            return res.status(403).json({"error": "Title is required "});
        }
        if(!draft){
            if(!des.length || des.length > 200){
                return res.status(403).json({"error": "Description must be at under 200 character"});
            }
            if(!banner.length){
                return res.status(403).json({"error": "Banner image is required to publish a block"});
            }
            if(!content.blocks.length){
                return res.status(403).json({"error": "Content is required to publish a block"});
            }
            if(!tags.length || tags.length > 10){
                return res.status(403).json({"error": "Tags are required to publish a block and maximum length is 10"});
            }
        }
        tags = tags.map(tag => tag.toLowerCase())

        let blog_id = id || title.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g,"-").trim() + nanoid(); 

        if(id){
        Blog.findOneAndUpdate({blog_id},{title,tags,des,banner,content,draft: draft ? draft: false})
        .then( () => {
            return res.status(200).json({id: blog_id})
        })
        .catch(err=>{
            return res.status(500).json({"error": err.message});
        })
        }else{
            let blog =  new Blog({
                title,
                des,
                banner,
                content,
                tags,
                author : authorId,
                blog_id,
                draft : Boolean(draft)
            })
    
            blog.save().then( blog =>{
                let incrementVal = draft ? 0 : 1;
    
                User.findOneAndUpdate({_id : authorId}, { $inc: {"account_info.total_posts" : incrementVal}, $push : {
                    "blogs" : blog._id
                }})
                .then (user =>{
                    return res.status(200).json({id : blog.blog_id})
                })
                .catch(err=>{
                    return res.status(500).json({"error": "failed to update total post number"});
                })
            })
            .catch(err=>{
                return res.status(500).json({"error": err.message});
            })
        }

})
app.post('/latest-blogs', (req,res)=>{
    let {page} = req.body;
    let maxLimit = 5;

    Blog.find({draft: false})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname  -_id")
    .sort({"publishedAt": -1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page-1)*maxLimit)
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({blogs});
    })
    .catch(err=>{
        return res.status(500).json({"error": err.message});
    })
})

app.post("/all-latest-blogs-count", (req,res)=>{
    
    Blog.countDocuments({draft: false})
    .then(count=>{
        return res.status(200).json({totalDocs: count});
    })
    .catch(err=>{
        return res.status(500).json({"error": err.message});
    })
})

app.post("/search-blogs-count", (req,res)=>{
    let {tag , query, author} = req.body;

    let findQuery;
    if(tag){
        findQuery = { tags: tag, draft: false};
    }else if(query){
        findQuery = {draft: false, title: new RegExp(query,'i')};
    }else if(author){
        findQuery = {author,draft: false};
    }

    Blog.countDocuments(findQuery)
    .then(count=>{
        return res.status(200).json({totalDocs: count});
    })
    .catch(err=>{
        return res.status(500).json({"error": err.message});
    })
})

app.get("/trending-blogs", (req,res)=>{
    Blog.find({draft: false})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname  -_id")
    .sort({"activity.total_read": -1,"activity.total_likes":-1,"publishedAt":-1})
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then(blogs=>{
        return res.status(200).json({blogs});
    })
    .catch(err=>{
        return res.status(500).json({"error": err.message});
    })

})
app.post("/search-blogs", (req,res)=>{

    let {tag, query , page, author, limit,eliminate_blog } = req.body;
    let findQuery ;
    let maxLimit = limit ? limit : 2;
    if(tag){
        findQuery = { tags: tag, draft: false,blog_id: {$ne: eliminate_blog}};
    }else if(query){
        findQuery = {draft: false, title: new RegExp(query,'i')};
    } else if(author){
        findQuery = {author,draft: false};
    }

    Blog.find(findQuery)
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname  -_id")
    .sort({"publishedAt": -1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page-1)*maxLimit)
    .limit(maxLimit)
    .then(blogs=>{
        return res.status(200).json({blogs});
    })
    .catch(err=>{
        return res.status(500).json({"error": err.message});
    })
})

app.post("/search-users",(req, res)=>{

    let {query} = req.body;

    User.find({ "personal_info.username": new RegExp(query,'i')})
    .limit(50)
    .select("personal_info.username personal_info.profile_img personal_info.fullname -_id")
    .then(users=>{
        return res.status(200).json({users});
    })
    .catch(err=>{
        return res.status(500).json({"error": err.message});
    })
})
app.post("/get-profile",(req, res)=>{
    
    let { username } = req.body;

    User.findOne({ "personal_info.username": username})
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then(user=>{
        return res.status(200).json(user)
    })
    .catch(err=>{
        return res.status(500).json({error: err.message});
    })

})


app.post("/get-blog",(req, res)=>{
    
    let {blog_id, draft, mode} = req.body;

    let incrementalVal = mode!= 'edit' ? 1 : 0;

    Blog.findOneAndUpdate({ blog_id }, {$inc :{"activity.total_reads": incrementalVal}})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname")
    .select("blog_id title des banner activity tags publishedAt content")
    
    .then(blog=>{
        User.findOneAndUpdate({"personal_info.username": blog.author.personal_info.username},{
            $inc :{
                "account_info.total_reads": incrementalVal
            }
        })
        .catch((err)=>{
            return res.status(500).json({error: err.message})
        })

        if(blog.draft && !draft){
            return res.status(500).json({error: "you cannot access draft blog"})
        }

        return res.status(200).json({blog})
    })
    .catch(err=>{
        return res.status(500).json({error: err.message});
    })
})

app.post("/like-blog",verifyJWT,(req, res)=>{
    
    let user_id = req.user;
    let {_id, isLikedByUser} = req.body;

    let incrementalVal = !isLikedByUser ? 1 : -1;

    Blog.findOneAndUpdate({ _id },{$inc :{"activity.total_likes": incrementalVal}})
    .then(blog=>{
        if(!isLikedByUser){
            let like = new Notification({
                type:"like",
                blog: _id,
                notification_for: blog.author,
                user: user_id
            })
            like.save().then(notification =>{
                return res.status(200).json({liked_by_user: true})
            })
        }
        else{
            Notification.findOneAndDelete({user: user_id,blog: _id,type: "like"})
            .then(data =>{
                return res.status(200).json({liked_by_user: false})
            })
            .catch(err=>{
                return res.status(500).json({error: err.message})
            })
        }
    })
})

app.post("/isLiked-by-user",verifyJWT,(req, res)=>{
    let user_id = req.user;

    let{_id} = req.body;

    Notification.exists({user: user_id, type:"like", blog: _id})
    .then(result =>{
        return res.status(200).json({result})
    })
    .catch(err=>{
        return res.status(500).json({error: err.message})
    })
})
app.post("/add-comment",verifyJWT,(req, res)=>{
    let user_id = req.user;
    let { _id, comment,replying_to, blog_author } = req.body;
    if(!comment.length){
        return res.status(403).json({error: "comment can't be empty"})
    }
    //creating a comment object
    let commentObj = new Comment({
        blog_id: _id,
        blog_author,
        comment,
        commented_by: user_id,
    })
    commentObj.save().then(commentFile=>{
        let {comment, commentedAt,children} = commentFile;

        Blog.findOneAndUpdate({_id},{$push:{"comments": commentFile._id},$inc: {
            "activity.total_comments": 1},"activity.total_parent_comments": 1})
        .then(blog=>{
            console.log("new comment created");
        })
        let notificationObj = {
            type: "comment",
            blog: _id,
            notification_for: blog_author,
            user: user_id,
            comment: commentFile._id
        }
        new Notification(notificationObj).save()
        .then(notification => console.log("new notification created"))

        return res.status(200).json({
            comment,
            commentedAt,
            _id: commentFile._id,
            user_id,
            children
        })
    })

    })

    app.post("/get-blog-comments", (req, res) => {
        let {blog_id , skip} = req.body

        let maxLimit = 5;
        Comment.find({blog_id, isReply: false})
        .populate("commented_by", "personal_info.profile_img personal_info.username personal_info.fullname")
        .skip(skip)
        .limit(maxLimit)
        .sort({commentedAt: -1})
        .then(comment=>{
            return res.status(200).json(comment)
        })
        .catch(err=>{
            console.log(err.message);
            return res.status(500).json({error: err.message})
        })
    })

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})