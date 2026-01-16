const express = require("express")
const erl = require("express-rate-limit")
const app = express()
const Database = require("better-sqlite3")
const path = require("path")
const PORT = 8000

//Advanced Middleware

const limiter = erl.rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100, 
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

const logger = (req, res, next)=>{
    const userhostname = `User Hostname: ${req.hostname}`
    const userpath = `User Path: ${req.originalUrl}`
    console.log(userhostname)
    console.log(userpath)
    next()
}

//Middlewear
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(logger);
app.use(limiter);

//DATA BASE SETUP
const db = new Database("users.db")

db.prepare(`

    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE,
    password TEXT
    )
    
    
    `).run()
    console.log("Database is Ready")



//POST REQUEST
app.post("/dashboard", (req,res)=>{
    try{
        const { firstName, lastName, email, password} = req.body
        res.status(200)
        db.prepare("INSERT INTO users (firstName , lastName, email, password) VALUES (?,?,?,?)").run(firstName, lastName, email, password)
        console.log(`First name: ${firstName}, Last name: ${lastName}, email:${email}, password: ${password}`)
        res.redirect("/dashboard")
    } catch (err){
        console.log(`Error has been found ${err}`)
        res.status(500).send("There Has been a Server error ")
    }
})

app.get("/dashboard" , (req,res)=>{
    res.sendFile(path.join(__dirname, "public", "dashboard.html"))
})


//Start the server
app.listen(PORT, ()=>{
    console.log("Server is running at: http://localhost:8000")

})
