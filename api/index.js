const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' }); 
const fs = require('fs');
const Post = require('./models/Post');
// require('dotenv').config;

const salt = bcrypt.genSaltSync(10); // Store hash in your password DB.
const secret = process.env.SECRET;
app.use(cors({
  credentials:true,
  methods: ["POST", "GET", "PUT"], 
  origin:'http://localhost:3000',
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// mongoose.connect('mongodb+srv://blog:mansi27m@user.9au1p.mongodb.net/?retryWrites=true&w=majority&appName=user')
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((err) => console.error('Failed to connect to MongoDB:', err));

mongoose.connect(process.env.MONGODB_URL, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

app.post('/register',async (req, res) => {
      const {username,password} = req.body;

      try{
        const userDoc = await User.create({
          username,
          password:bcrypt.hashSync(password,salt), 
        });
        res.json(userDoc);
      } catch(e){
        res.status(400).json(e);
      } 
    });

    
app.post('/login', async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  if (!userDoc) {
    return res.status(400).json({ message: 'User not found' });
  }
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) { // logged in
    jwt.sign(
      {username,id:userDoc._id},
      secret,
      {},
      (err,token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id:userDoc._id,
        username,
      });
    });
  } 
  else {
    res.status(400).json('Invalid credentials');
  }
});

app.get('/profile', (req,res) => {
  const {token} = req.cookies;
  if (!token) { // <-- Added check for missing token
    return res.status(401).json({ message: 'No token provided' }); // <-- Error response for missing token
  }
  jwt.verify(token, secret, {}, (err,info) => {
    if (err)  return res.status(401).json({ message: 'Invalid token' });
    res.json(info);
  });
});

app.post('/logout', (req,res) => {
  res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext  = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {token} = req.cookies;
  if (!token) { // <-- Added check for missing token in post creation
    return res.status(401).json({ message: 'No token provided' }); // <-- Error response for missing token
  }
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });
});

app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  if (!token) { // <-- Added check for missing token in post update
    return res.status(401).json({ message: 'No token provided' }); // <-- Error response for missing token
  }
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });
});

app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});





























// app.arguments(cors());
// app.use(cors({credentials:true,origin:'http://localhost:3000'}));
// app.use(express.json());
// app.use(cookieParser());

// mongoose.connect('mongodb+srv://blog:RD8paskYC8Ayj09u@cluster0.pflplid.mongodb.net/?retryWrites=true&w=majority');

// app.post('/register', async (req,res) => {
//   const {username,password} = req.body;
//   try{
//     const userDoc = await User.create({
//       username,
//       password:bcrypt.hashSync(password,salt),
//     });
//     res.json(userDoc);
//   } catch(e) {
//     console.log(e);
//     res.status(400).json(e);
//   }
// });

// app.post('/login', async (req,res) => {
//   const {username,password} = req.body;
//   const userDoc = await User.findOne({username});
//   const passOk = bcrypt.compareSync(password, userDoc.password);
//   if (passOk) {
//     // logged in
//     jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
//       if (err) throw err;
//       res.cookie('token', token).json({
//         id:userDoc._id,
//         username,
//       });
//     });
//   } else {
//     res.status(400).json('wrong credentials');
//   }
// });

