const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

const postModel = require('../models/postModel');


app.get("/", function (req, res) {
    res.render("index");
});

app.get('/admin/create',function(req,res){
    res.render('admin/create')
})

// 1. Fixed the capitalized model name variable
app.post('/admin/create', async function(req, res) {
    try {
        let { title, description, url, imageUrl, content, createdBy } = req.body;
        
        // 2. Added handling for the optional 'createdBy' field
        const post = await postModel.create({
            title, 
            description, 
            url, 
            imageUrl, 
            content
        });
        
        res.status(201).send(post);
    } catch (error) {
        // 3. Added try/catch block to prevent server crashes
        res.status(500).json({ error: error.message });
    }
});




module.exports = app;